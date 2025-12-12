<?php
/**
 * API LƯU KẾT QUẢ KIỂM TRA
 * Endpoint: api/save-quiz-result.php
 * Method: POST
 * Body: {
 *   user_id, course_id, total_questions, correct_count, 
 *   incorrect_count, score, duration_seconds, details[]
 * }
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/config.php';
require_once '../includes/log_helper.php';
require_once '../includes/rate_limiter.php';
checkApiRateLimit();
require_once '../includes/notification_helper.php';

try {
    // BẢO MẬT: Lấy user_id từ session
    $user_id = api_require_login();
    
    // Lấy dữ liệu JSON
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);
    
    // Validate input (KHÔNG cần user_id trong body nữa)
    if (!isset($data['course_id'])) {
        throw new Exception('Missing required field: course_id');
    }
    
    $course_id = intval($data['course_id']);
    $total_questions = intval($data['total_questions']);
    $correct_count = intval($data['correct_count']);
    $incorrect_count = intval($data['incorrect_count']);
    $score = floatval($data['score']);
    $duration_seconds = isset($data['duration_seconds']) ? intval($data['duration_seconds']) : null;
    $details = isset($data['details']) ? $data['details'] : [];
    
    // Bắt đầu transaction
    $conn->begin_transaction();
    
    // 1. Lưu session với review_type = 'multiple-choice' (vì có cả trắc nghiệm và điền từ)
    $insertSession = $conn->prepare(
        "INSERT INTO review_session 
        (user_id, course_id, review_type, total_words, correct_count, incorrect_count, score, duration_seconds, completed_at) 
        VALUES (?, ?, 'multiple-choice', ?, ?, ?, ?, ?, NOW())"
    );
    $insertSession->bind_param(
        "iiiiddi", 
        $user_id, $course_id, 
        $total_questions, $correct_count, $incorrect_count, 
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
            
            // 3. Cập nhật trạng thái từ (gọi stored procedure)
            $updateWord = $conn->prepare("CALL sp_update_word_after_review(?, ?, ?)");
            $updateWord->bind_param("iii", $user_id, $word_id, $is_correct);
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
    
    // KHÔNG CẦN cập nhật user_course.progress vì get-my-courses.php sẽ tính real-time từ learned_word
    
    // Commit transaction
    $conn->commit();
    
    // Tạo thông báo cho user
    $courseStmt = $conn->prepare("SELECT course_name FROM course WHERE course_id = ?");
    $courseStmt->bind_param("i", $course_id);
    $courseStmt->execute();
    $courseResult = $courseStmt->get_result();
    if ($courseRow = $courseResult->fetch_assoc()) {
        notifyQuizCompleted($conn, $user_id, $courseRow['course_name'], $score, $total_questions);
    }
    $courseStmt->close();
    
    echo json_encode([
        'success' => true,
        'message' => 'Quiz result saved successfully',
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