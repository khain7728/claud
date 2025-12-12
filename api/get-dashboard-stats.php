<?php
/**
 * API LẤY THỐNG KÊ DASHBOARD USER
 * Endpoint: api/get-dashboard-stats.php
 * Method: GET
 * Params: user_id
 */

// Tắt hiển thị lỗi, chỉ log
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Buffer output để tránh HTML/whitespace rò rỉ
ob_start();

// CORS Headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../config/config.php';

// Enable error logging for debugging
error_log("[get-dashboard-stats] Authenticated request");

try {
    // BẢO MẬT: Lấy user_id từ session, không tin tưởng URL
    $user_id = api_verify_user_id($_GET['user_id'] ?? null);
    
    if ($user_id <= 0) {
        throw new Exception('Invalid user_id');
    }

    // Default values
    $totalCourses = 0;
    $totalWordsLearned = 0;
    $avgScore = 0;
    $totalQuizzes = 0;
    $userName = 'Người dùng';

    // 1. Tính tổng số khóa học (public + private của user)
    try {
        $sqlCourses = "SELECT COUNT(DISTINCT c.course_id) as total_courses
                       FROM course c
                       LEFT JOIN user_course uc ON c.course_id = uc.course_id AND uc.user_id = ?
                       WHERE c.create_by = ? OR uc.user_id = ?";
        
        $stmtCourses = $conn->prepare($sqlCourses);
        if ($stmtCourses) {
            $stmtCourses->bind_param("iii", $user_id, $user_id, $user_id);
            $stmtCourses->execute();
            $resultCourses = $stmtCourses->get_result();
            $row = $resultCourses->fetch_assoc();
            $totalCourses = (int)($row['total_courses'] ?? 0);
            $stmtCourses->close();
        }
    } catch (Exception $e) {
        error_log("[get-dashboard-stats] Error counting courses: " . $e->getMessage());
    }

    // 2. Tính tổng số từ đã học (learned_word với status khác 'not_learned')
    try {
        $sqlWords = "SELECT COUNT(DISTINCT word_id) as total_words_learned
                     FROM learned_word
                     WHERE user_id = ? AND status != 'not_learned'";
        
        $stmtWords = $conn->prepare($sqlWords);
        if ($stmtWords) {
            $stmtWords->bind_param("i", $user_id);
            $stmtWords->execute();
            $resultWords = $stmtWords->get_result();
            $row = $resultWords->fetch_assoc();
            $totalWordsLearned = (int)($row['total_words_learned'] ?? 0);
            $stmtWords->close();
        }
    } catch (Exception $e) {
        error_log("[get-dashboard-stats] Error counting words: " . $e->getMessage());
    }

    // 3. Tính điểm trung bình từ kết quả kiểm tra (review_session)
    try {
        $sqlAvgScore = "SELECT 
                            COALESCE(ROUND(AVG(score), 1), 0) as avg_score,
                            COUNT(*) as total_quizzes
                        FROM review_session
                        WHERE user_id = ?";
        
        $stmtAvgScore = $conn->prepare($sqlAvgScore);
        if ($stmtAvgScore) {
            $stmtAvgScore->bind_param("i", $user_id);
            $stmtAvgScore->execute();
            $resultAvgScore = $stmtAvgScore->get_result();
            $scoreData = $resultAvgScore->fetch_assoc();
            $avgScore = (float)($scoreData['avg_score'] ?? 0);
            $totalQuizzes = (int)($scoreData['total_quizzes'] ?? 0);
            $stmtAvgScore->close();
        }
    } catch (Exception $e) {
        error_log("[get-dashboard-stats] Error calculating avg score: " . $e->getMessage());
    }

    // 4. Lấy thông tin user và streak_days từ bảng statistic
    $streakDays = 0;
    try {
        $sqlUser = "SELECT u.name, COALESCE(s.streak_days, 0) as streak_days
                    FROM user u
                    LEFT JOIN statistic s ON u.user_id = s.user_id
                    WHERE u.user_id = ?";
        $stmtUser = $conn->prepare($sqlUser);
        if ($stmtUser) {
            $stmtUser->bind_param("i", $user_id);
            $stmtUser->execute();
            $resultUser = $stmtUser->get_result();
            $userData = $resultUser->fetch_assoc();
            $userName = $userData['name'] ?? 'Người dùng';
            $streakDays = (int)($userData['streak_days'] ?? 0);
            $stmtUser->close();
        }
    } catch (Exception $e) {
        error_log("[get-dashboard-stats] Error getting user: " . $e->getMessage());
    }

    // Trả về kết quả
    $response = [
        'success' => true,
        'data' => [
            'user_name' => $userName,
            'total_courses' => (int)$totalCourses,
            'total_words_learned' => (int)$totalWordsLearned,
            'average_score' => (float)$avgScore,
            'total_quizzes' => (int)$totalQuizzes,
            'streak_days' => (int)$streakDays
        ]
    ];
    
    error_log("[get-dashboard-stats] Success response: " . json_encode($response));
    
    // Xóa buffer và chỉ trả về JSON
    ob_clean();
    echo json_encode($response);

} catch (Exception $e) {
    http_response_code(500);
    $errorResponse = [
        'success' => false,
        'error' => $e->getMessage(),
        'file' => basename(__FILE__)
    ];
    error_log("[get-dashboard-stats] Error: " . $e->getMessage());
    
    // Xóa buffer và chỉ trả về JSON
    ob_clean();
    echo json_encode($errorResponse);
}

// Đảm bảo không có output thêm
ob_end_flush();
?>
