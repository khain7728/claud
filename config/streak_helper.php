<?php
//streak_helper.php

function updateStreak($conn, $user_id) {
    // 1. Lấy thông tin streak hiện tại từ bảng statistic
    $sql = "SELECT streak_days, last_activity_date FROM statistic WHERE user_id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $stats = $result->fetch_assoc();

    $today = date('Y-m-d');
    $yesterday = date('Y-m-d', strtotime('-1 day'));

    if ($stats) {
        $currentStreak = $stats['streak_days'];
        $lastDate = $stats['last_activity_date'];
        $newStreak = $currentStreak;

        if ($lastDate === $today) {
            // Đã học hôm nay -> Không tăng, giữ nguyên
            return; 
        } elseif ($lastDate === $yesterday) {
            // Học hôm qua -> Tăng 1
            $newStreak = $currentStreak + 1;
        } else {
            // Bỏ lỡ 1 ngày trở lên -> Reset về 1
            $newStreak = 1;
        }

        // Cập nhật lại
        $updateSql = "UPDATE statistic SET streak_days = ?, last_activity_date = ? WHERE user_id = ?";
        $updateStmt = $conn->prepare($updateSql);
        $updateStmt->bind_param("isi", $newStreak, $today, $user_id);
        $updateStmt->execute();
    } else {
        // Nếu chưa có record trong statistic -> Tạo mới
        $insertSql = "INSERT INTO statistic (user_id, streak_days, last_activity_date) VALUES (?, 1, ?)";
        $insertStmt = $conn->prepare($insertSql);
        $insertStmt->bind_param("is", $user_id, $today);
        $insertStmt->execute();
    }
}
?>  