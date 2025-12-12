<?php
/**
 * API LẤY THÔNG TIN HỒ SƠ USER & THỐNG KÊ CHI TIẾT
 */
ob_start();
error_reporting(0);
ini_set('display_errors', 0);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

require_once '../config/config.php';

$response = [];

try {
    if (!isset($conn)) throw new Exception("Lỗi kết nối Database");

    $user_id = isset($_GET['user_id']) ? (int)$_GET['user_id'] : 0;
    if ($user_id <= 0) throw new Exception("User ID không hợp lệ");

    // --- A. LẤY THÔNG TIN USER (Bảng user) ---
    $sqlUser = "SELECT user_id, name, email, bio, avatar, created_at, role 
                FROM user WHERE user_id = ?";
    $stmtUser = $conn->prepare($sqlUser);
    $stmtUser->bind_param("i", $user_id);
    $stmtUser->execute();
    $userInfo = $stmtUser->get_result()->fetch_assoc();

    if (!$userInfo) throw new Exception('User không tồn tại');

    // --- B. TÍNH TOÁN THỐNG KÊ (Real-time) ---

    // 1. Tổng số khóa học (Yêu cầu: Lấy từ bảng course, cột create_by)
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

    // 2. Thống kê Quiz & Độ chính xác (Yêu cầu: Lấy từ bảng review_session)
    // - total_quizzes: Đếm số dòng
    // - accuracy: Trung bình cộng cột score
    $sqlQuiz = "SELECT COUNT(*) as total_quiz, AVG(score) as avg_score 
                FROM review_session WHERE user_id = ?";
    $stmtQuiz = $conn->prepare($sqlQuiz);
    $stmtQuiz->bind_param("i", $user_id);
    $stmtQuiz->execute();
    $quizData = $stmtQuiz->get_result()->fetch_assoc();

    $totalQuizzes = (int)$quizData['total_quiz'];
    // Làm tròn độ chính xác 1 chữ số thập phân (VD: 85.5)
    $accuracy = $totalQuizzes > 0 ? round((float)$quizData['avg_score'], 1) : 0;

    // 3. Tổng số từ đã học 
    // (Logic cũ của bạn dùng bảng learned_word, nếu bảng này không tồn tại trong DB mới cung cấp
    // thì bạn có thể dùng cột total_words_learned trong bảng statistic)
    $totalWords = 0;
    // Kiểm tra xem bảng learned_word có tồn tại không để chạy query, nếu không lấy từ statistic
    $checkTable = $conn->query("SHOW TABLES LIKE 'learned_word'");
    if ($checkTable && $checkTable->num_rows > 0) {
        $sqlWord = "SELECT COUNT(*) as cnt FROM learned_word WHERE user_id = ? AND status != 'not_learned'";
        $stmtWord = $conn->prepare($sqlWord);
        $stmtWord->bind_param("i", $user_id);
        $stmtWord->execute();
        $totalWords = $stmtWord->get_result()->fetch_assoc()['cnt'];
    } else {
        // Fallback: Lấy từ bảng statistic nếu chưa có bảng learned_word
        $sqlStatWord = "SELECT total_words_learned FROM statistic WHERE user_id = ?";
        $stmtStatWord = $conn->prepare($sqlStatWord);
        $stmtStatWord->bind_param("i", $user_id);
        $stmtStatWord->execute();
        $resStat = $stmtStatWord->get_result()->fetch_assoc();
        $totalWords = $resStat ? (int)$resStat['total_words_learned'] : 0;
    }

    // 4. Chuỗi ngày học (Streak) - Lấy từ bảng statistic
    $sqlStreak = "SELECT streak_days FROM statistic WHERE user_id = ?";
    $stmtStreak = $conn->prepare($sqlStreak);
    $stmtStreak->bind_param("i", $user_id);
    $stmtStreak->execute();
    $streakData = $stmtStreak->get_result()->fetch_assoc();
    $streakDays = $streakData ? (int)$streakData['streak_days'] : 0;

    // --- C. TRẢ VỀ KẾT QUẢ ---
    $response = [
        'success' => true,
        'data' => [
            'user' => [
                'id' => $userInfo['user_id'],
                'fullname' => $userInfo['name'],
                'email' => $userInfo['email'],
                'bio' => $userInfo['bio'] ?? 'Chưa cập nhật tiểu sử',
                'avatar' => $userInfo['avatar'], 
                'joined_date' => date('d/m/Y', strtotime($userInfo['created_at'])),
                'role' => $userInfo['role'],
                'language' => 'Tiếng Anh', // Hardcode hoặc lấy từ setting
                'level' => 'Sơ cấp'       // Hardcode hoặc tính toán logic level
            ],
            'statistics' => [
                'courses_joined' => $totalCourses, // Đã sửa: Lấy từ course where create_by
                'words_learned' => $totalWords,
                'quizzes_done' => $totalQuizzes,   // Đã sửa: Lấy từ review_session count
                'accuracy' => $accuracy,           // Đã sửa: Lấy từ review_session avg(score)
                'streak_days' => $streakDays
            ]
        ]
    ];

} catch (Exception $e) {
    http_response_code(400); 
    $response = ['success' => false, 'error' => $e->getMessage()];
}

ob_clean();
echo json_encode($response);
exit();
?>