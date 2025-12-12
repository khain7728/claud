<?php
/**
 * API LƯU KẾT QUẢ ÔN TẬP
 * Endpoint: api/save-review-session.php
 * Method: POST
 * Body: {
 *   course_id, review_type, total_words, 
 *   correct_count, score, duration_seconds, details[]
 * }
 * Note: user_id được lấy từ session (không cần gửi trong body)
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/config.php';
require_once '../includes/notification_helper.php';

try {
    // BẢO MẬT: Lấy user_id từ session
    $user_id = api_require_login();
    
    // Lấy dữ liệu JSON
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);
    
    // Validate input (KHÔNG cần user_id trong body nữa)
    if (!isset($data['course_id']) || !isset($data['review_type'])) {
        throw new Exception('Missing required fields: course_id or review_type');
    }
    
    $course_id = intval($data['course_id']);
    $review_type = $data['review_type'];
    $total_words = intval($data['total_words']);
    $correct_count = intval($data['correct_count']);
    $incorrect_count = $total_words - $correct_count;
    $score = floatval($data['score']);
    $duration_seconds = isset($data['duration_seconds']) ? intval($data['duration_seconds']) : null;
    $details = isset($data['details']) ? $data['details'] : [];
    
    // Bắt đầu transaction
    $conn->begin_transaction();
    
    // 1. Lưu session
    $insertSession = $conn->prepare(
        "INSERT INTO review_session 
        (user_id, course_id, review_type, total_words, correct_count, incorrect_count, score, duration_seconds) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    );
    $insertSession->bind_param(
        "iisiiddi", 
        $user_id, $course_id, $review_type, 
        $total_words, $correct_count, $incorrect_count, 
        $score, $duration_seconds
    );
    $insertSession->execute();
    $session_id = $conn->insert_id;
    
    // 2. Lưu chi tiết từng câu
    if (!empty($details)) {
        $insertDetail = $conn->prepare(
            "INSERT INTO review_session_detail 
            (session_id, word_id, user_answer, correct_answer, is_correct, response_time) 
            VALUES (?, ?, ?, ?, ?, ?)"
        );
        
        foreach ($details as $detail) {
            $word_id = intval($detail['word_id']);
            $user_answer = isset($detail['user_answer']) ? $detail['user_answer'] : null;
            $correct_answer = isset($detail['correct_answer']) ? $detail['correct_answer'] : null;
            $is_correct = isset($detail['is_correct']) ? ($detail['is_correct'] ? 1 : 0) : 0;
            $response_time = isset($detail['response_time']) ? intval($detail['response_time']) : null;
            
            $insertDetail->bind_param(
                "iissii", 
                $session_id, $word_id, 
                $user_answer, $correct_answer, 
                $is_correct, $response_time
            );
            $insertDetail->execute();
            
            // 3. Cập nhật trạng thái từ trong bảng learned_word
            $updateWord = $conn->prepare(
                "INSERT INTO learned_word 
                 (user_id, word_id, status, learning_progress, review_count, mastery_level, 
                  consecutive_correct, consecutive_incorrect, last_reviewed_at, current_position)
                 VALUES (?, ?, 'reviewing', 10, 1, 0, ?, 0, NOW(), 0)
                 ON DUPLICATE KEY UPDATE
                    status = CASE 
                        WHEN learning_progress + ? >= 100 THEN 'mastered'
                        WHEN learning_progress + ? > 0 THEN 'reviewing'
                        ELSE 'learning'
                    END,
                    learning_progress = LEAST(100, GREATEST(0, learning_progress + ?)),
                    review_count = review_count + 1,
                    consecutive_correct = IF(? = 1, consecutive_correct + 1, 0),
                    consecutive_incorrect = IF(? = 0, consecutive_incorrect + 1, 0),
                    mastery_level = CASE
                        WHEN ? = 1 AND consecutive_correct >= 3 THEN LEAST(5, mastery_level + 1)
                        WHEN ? = 0 THEN GREATEST(0, mastery_level - 1)
                        ELSE mastery_level
                    END,
                    last_reviewed_at = NOW()"
            );
            
            $progress_increment = $is_correct ? 10 : -5;
            $correct_int = $is_correct ? 1 : 0;
            
            // Bind: user_id, word_id, consecutive_correct_init, +5 lần progress_increment, +4 lần is_correct
            $updateWord->bind_param(
                "iiiiiiiiii", 
                $user_id, 
                $word_id, 
                $correct_int,                    // consecutive_correct cho INSERT
                $progress_increment,             // CASE 1
                $progress_increment,             // CASE 2  
                $progress_increment,             // learning_progress update
                $correct_int,                    // consecutive_correct IF
                $correct_int,                    // consecutive_incorrect IF
                $correct_int,                    // mastery_level CASE 1
                $correct_int                     // mastery_level CASE 2
            );
            $updateWord->execute();
            $updateWord->close();
        }
        
        $insertDetail->close();
    }
    
    // 4. Cập nhật thống kê user
    $updateStats = $conn->prepare(
        "UPDATE statistic 
         SET total_quizzes_done = total_quizzes_done + 1,
             accuracy_rate = (
                 SELECT ROUND(AVG(score), 2) 
                 FROM review_session 
                 WHERE user_id = ?
             ),
             updated_at = NOW()
         WHERE user_id = ?"
    );
    $updateStats->bind_param("ii", $user_id, $user_id);
    $updateStats->execute();
    
    // Commit transaction
    $conn->commit();
    
    // Tạo thông báo cho user
    $courseStmt = $conn->prepare("SELECT course_name FROM course WHERE course_id = ?");
    $courseStmt->bind_param("i", $course_id);
    $courseStmt->execute();
    $courseResult = $courseStmt->get_result();
    if ($courseRow = $courseResult->fetch_assoc()) {
        notifyReviewCompleted($conn, $user_id, $courseRow['course_name'], $review_type, $score);
    }
    $courseStmt->close();
    
    echo json_encode([
        'success' => true,
        'message' => 'Review session saved successfully',
        'session_id' => $session_id
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    // Rollback nếu có lỗi
    if (isset($conn)) {
        $conn->rollback();
    }
    
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
    
} finally {
    if (isset($insertSession)) $insertSession->close();
    if (isset($updateStats)) $updateStats->close();
    if (isset($conn)) $conn->close();
}
?>