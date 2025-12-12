<?php
/**
 * API LẤY MỤC TIÊU HỌC HÀNG NGÀY
 * Endpoint: api/get-daily-goal.php
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
require_once '../config/streak_helper.php';
// Enable error logging for debugging
error_log("[get-daily-goal] Request from user_id: " . ($_GET['user_id'] ?? 'none'));

try {
    // Lấy user_id từ request
    $user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;
    
    if ($user_id <= 0) {
        throw new Exception('Invalid user_id');
    }
    // Logic: Khi Dashboard load -> Gọi API này -> API này gọi updateStreak -> DB cập nhật -> Sau đó mới lấy dữ liệu hiển thị
    updateStreak($conn, $user_id);

    // 1. Lấy thông tin mục tiêu của user
    // Kiểm tra bảng tồn tại trước khi query
    $hasGoal = false;
    $dailyTarget = 0;
    $isRecurring = false;
    $goalData = null;
    $wordsLearnedToday = 0;
    
    try {
        $checkTable = $conn->query("SHOW TABLES LIKE 'user_daily_goal'");
        
        if ($checkTable && $checkTable->num_rows > 0) {
            // Bảng tồn tại, query dữ liệu
            $sqlGoal = "SELECT daily_words_target, is_recurring, created_at, updated_at
                        FROM user_daily_goal
                        WHERE user_id = ?";
            
            $stmtGoal = $conn->prepare($sqlGoal);
            if ($stmtGoal) {
                $stmtGoal->bind_param("i", $user_id);
                $stmtGoal->execute();
                $resultGoal = $stmtGoal->get_result();
                
                if ($resultGoal->num_rows > 0) {
                    $goalData = $resultGoal->fetch_assoc();
                    $hasGoal = true;
                    $dailyTarget = (int)$goalData['daily_words_target'];
                    $isRecurring = (bool)$goalData['is_recurring'];
                }
                $stmtGoal->close();
            }
        } else {
            error_log("[get-daily-goal] Table user_daily_goal does not exist");
        }
    } catch (Exception $tableError) {
        error_log("[get-daily-goal] Error checking table: " . $tableError->getMessage());
        // Không throw, chỉ log và tiếp tục với default values
    }
    
    // 2. Tính số từ đã học hôm nay 
    // Strategy: Đếm từ learned_word có updated_at là hôm nay VÀ status thay đổi từ not_learned
    try {
        // Đếm từ learned_word được đánh dấu đã học hôm nay (last_reviewed_at = hôm nay)
        // Đây là từ user vừa đánh dấu đã học trong ngày
        $sqlWordsToday = "SELECT COUNT(DISTINCT word_id) as words_learned_today
                          FROM learned_word
                          WHERE user_id = ? 
                          AND DATE(last_reviewed_at) = CURDATE()
                          AND status IN ('learning', 'reviewing', 'mastered')";
        
        $stmtWordsToday = $conn->prepare($sqlWordsToday);
        if ($stmtWordsToday) {
            $stmtWordsToday->bind_param("i", $user_id);
            $stmtWordsToday->execute();
            $resultWordsToday = $stmtWordsToday->get_result();
            $row = $resultWordsToday->fetch_assoc();
            $wordsLearnedToday = (int)($row['words_learned_today'] ?? 0);
            $stmtWordsToday->close();
            
            error_log("[get-daily-goal] Words learned today (last_reviewed_at): " . $wordsLearnedToday);
        }
        
        // HOẶC đếm từ review_session hôm nay (nếu user làm quiz)
        $sqlQuizToday = "SELECT COUNT(DISTINCT rsd.word_id) as quiz_words
                         FROM review_session rs
                         INNER JOIN review_session_detail rsd ON rs.session_id = rsd.session_id
                         WHERE rs.user_id = ? 
                         AND DATE(rs.completed_at) = CURDATE()";
        
        $stmtQuizToday = $conn->prepare($sqlQuizToday);
        if ($stmtQuizToday) {
            $stmtQuizToday->bind_param("i", $user_id);
            $stmtQuizToday->execute();
            $resultQuizToday = $stmtQuizToday->get_result();
            $row = $resultQuizToday->fetch_assoc();
            $quizWords = (int)($row['quiz_words'] ?? 0);
            $stmtQuizToday->close();
            
            // Lấy số lớn hơn giữa learned_word và quiz
            $wordsLearnedToday = max($wordsLearnedToday, $quizWords);
            
            error_log("[get-daily-goal] Quiz words today: " . $quizWords . ", Final: " . $wordsLearnedToday);
        }
        
    } catch (Exception $wordsError) {
        error_log("[get-daily-goal] Error counting words: " . $wordsError->getMessage());
        // Giữ wordsLearnedToday = 0
    }

    // 3. Tính phần trăm hoàn thành
    $progressPercent = 0;
    if ($hasGoal && $dailyTarget > 0) {
        $progressPercent = min(100, round(($wordsLearnedToday / $dailyTarget) * 100));
    }
    
    // 4. Lấy streak_days từ bảng statistic
    $streakDays = 0;
    try {
        $sqlStreak = "SELECT streak_days FROM statistic WHERE user_id = ?";
        $stmtStreak = $conn->prepare($sqlStreak);
        if ($stmtStreak) {
            $stmtStreak->bind_param("i", $user_id);
            $stmtStreak->execute();
            $resultStreak = $stmtStreak->get_result();
            if ($resultStreak->num_rows > 0) {
                $row = $resultStreak->fetch_assoc();
                $streakDays = (int)($row['streak_days'] ?? 0);
            }
            $stmtStreak->close();
        }
    } catch (Exception $e) {
        error_log("[get-daily-goal] Error getting streak: " . $e->getMessage());
    }

    // Trả về kết quả
    $response = [
        'success' => true,
        'data' => [
            'has_goal' => $hasGoal,
            'daily_target' => $dailyTarget,
            'words_learned_today' => $wordsLearnedToday,
            'progress_percent' => $progressPercent,
            'is_recurring' => $isRecurring,
            'streak_days' => $streakDays,
            'created_at' => $goalData['created_at'] ?? null,
            'updated_at' => $goalData['updated_at'] ?? null
        ]
    ];
    
    error_log("[get-daily-goal] Success response: " . json_encode($response));
    
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
    error_log("[get-daily-goal] Error: " . $e->getMessage());
    
    // Xóa buffer và chỉ trả về JSON
    ob_clean();
    echo json_encode($errorResponse);
}

// Đảm bảo không có output thêm
ob_end_flush();
?>
