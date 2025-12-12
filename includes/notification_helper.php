<?php
/**
 * NOTIFICATION HELPER
 * Tạo và quản lý thông báo tự động cho người dùng
 * File: includes/notification_helper.php
 */

/**
 * TẠO THÔNG BÁO MỚI
 * @param mysqli $conn - Database connection
 * @param int $user_id - ID người dùng nhận thông báo
 * @param string $title - Tiêu đề thông báo
 * @param string $content - Nội dung thông báo
 * @param string $type - Loại thông báo: system, review, quiz, custom
 * @return bool - True nếu thành công
 */
function createNotification($conn, $user_id, $title, $content, $type = 'system') {
    try {
        $sql = "INSERT INTO notification (user_id, title, content, type, is_read, created_at) 
                VALUES (?, ?, ?, ?, 0, NOW())";
        
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            error_log("[Notification] Prepare failed: " . $conn->error);
            return false;
        }
        
        $stmt->bind_param("isss", $user_id, $title, $content, $type);
        $result = $stmt->execute();
        
        if (!$result) {
            error_log("[Notification] Execute failed: " . $stmt->error);
        }
        
        $stmt->close();
        return $result;
        
    } catch (Exception $e) {
        error_log("[Notification] Error: " . $e->getMessage());
        return false;
    }
}

/**
 * THÔNG BÁO HOÀN THÀNH QUIZ
 */
function notifyQuizCompleted($conn, $user_id, $course_name, $score, $total_questions) {
    $title = "Hoàn thành bài kiểm tra! 🎉";
    $correct = round(($score / 100) * $total_questions);
    $content = "Bạn đã hoàn thành bài kiểm tra \"{$course_name}\" với {$correct}/{$total_questions} câu đúng (Điểm: {$score}/100)";
    
    return createNotification($conn, $user_id, $title, $content, 'quiz');
}

/**
 * THÔNG BÁO HOÀN THÀNH ÔN TẬP
 */
function notifyReviewCompleted($conn, $user_id, $course_name, $review_type, $score) {
    $title = "Hoàn thành ôn tập! 📚";
    
    $type_text = [
        'flashcard' => 'Flashcard',
        'multiple-choice' => 'Trắc nghiệm',
        'fill-in' => 'Điền từ'
    ];
    $review_name = $type_text[$review_type] ?? 'ôn tập';
    
    $content = "Bạn đã hoàn thành ôn tập {$review_name} cho khóa học \"{$course_name}\" với điểm số {$score}/100";
    
    return createNotification($conn, $user_id, $title, $content, 'review');
}

/**
 * THÔNG BÁO ĐẠT STREAK MỚI
 */
function notifyStreakAchieved($conn, $user_id, $streak_days) {
    $title = "Streak mới! 🔥";
    $content = "Chúc mừng! Bạn đã học {$streak_days} ngày liên tiếp. Hãy tiếp tục duy trì!";
    
    return createNotification($conn, $user_id, $title, $content, 'system');
}

/**
 * NHẮC NHỞ ÔN TẬP
 */
function notifyReviewReminder($conn, $user_id, $words_count) {
    $title = "Đã đến giờ ôn tập! ⏰";
    $content = "Bạn có {$words_count} từ vựng cần ôn tập hôm nay. Hãy dành chút thời gian để ghi nhớ nhé!";
    
    return createNotification($conn, $user_id, $title, $content, 'review');
}

/**
 * THÔNG BÁO ĐẠT MỤC TIÊU HẰNG NGÀY
 */
function notifyDailyGoalAchieved($conn, $user_id, $goal) {
    $title = "Hoàn thành mục tiêu! 🎯";
    $content = "Xuất sắc! Bạn đã học đủ {$goal} từ vựng hôm nay. Hẹn gặp lại vào ngày mai!";
    
    return createNotification($conn, $user_id, $title, $content, 'system');
}

/**
 * THÔNG BÁO THAM GIA KHÓA HỌC MỚI
 */
function notifyCourseJoined($conn, $user_id, $course_name) {
    $title = "Tham gia khóa học mới! 📖";
    $content = "Bạn đã tham gia khóa học \"{$course_name}\". Chúc bạn học tập vui vẻ!";
    
    return createNotification($conn, $user_id, $title, $content, 'system');
}

/**
 * THÔNG BÁO TẠO KHÓA HỌC MỚI
 */
function notifyCourseCreated($conn, $user_id, $course_name) {
    $title = "Khóa học mới được tạo! ✨";
    $content = "Khóa học \"{$course_name}\" của bạn đã được tạo thành công. Hãy bắt đầu thêm từ vựng!";
    
    return createNotification($conn, $user_id, $title, $content, 'system');
}

/**
 * THÔNG BÁO CHÀO MỪNG USER MỚI
 */
function notifyWelcomeNewUser($conn, $user_id, $user_name) {
    $title = "Chào mừng đến với VOCAB! 👋";
    $content = "Xin chào {$user_name}! Chào mừng bạn đến với VOCAB. Hãy bắt đầu hành trình học tiếng Anh của bạn ngay hôm nay!";
    
    return createNotification($conn, $user_id, $title, $content, 'system');
}

/**
 * THÔNG BÁO MẤT STREAK
 */
function notifyStreakLost($conn, $user_id, $lost_streak) {
    $title = "Streak đã bị mất! 😢";
    $content = "Rất tiếc! Bạn đã mất chuỗi {$lost_streak} ngày học liên tiếp. Đừng lo, hãy bắt đầu lại từ hôm nay!";
    
    return createNotification($conn, $user_id, $title, $content, 'system');
}

/**
 * XÓA THÔNG BÁO CŨ (Chạy định kỳ - cleanup)
 * Xóa thông báo đã đọc và quá 30 ngày
 */
function cleanupOldNotifications($conn) {
    try {
        $sql = "DELETE FROM notification 
                WHERE is_read = 1 
                AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)";
        
        $result = $conn->query($sql);
        
        if ($result) {
            $deleted = $conn->affected_rows;
            error_log("[Notification] Cleaned up {$deleted} old notifications");
            return $deleted;
        }
        
        return 0;
        
    } catch (Exception $e) {
        error_log("[Notification] Cleanup error: " . $e->getMessage());
        return 0;
    }
}

?>
