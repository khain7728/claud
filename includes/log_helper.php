<?php
// FILE: includes/log_helper.php

if (!function_exists('writeAdminLog')) {

    /**
     * Hàm hỗ trợ lấy IP thật của người dùng (Xử lý cả Proxy/Cloudflare)
     */
    function getRealUserIp() {
        if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
            $ip = $_SERVER['HTTP_CLIENT_IP'];
        } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            // Nếu qua nhiều proxy, IP thật là cái đầu tiên trong chuỗi
            $ip = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0];
        } else {
            $ip = $_SERVER['REMOTE_ADDR'] ?? 'Unknown';
        }
        // Cắt bớt nếu IP quá dài (đề phòng giả mạo) để vừa với cột VARCHAR(45)
        return substr(trim($ip), 0, 45);
    }

    /**
     * Hàm ghi lịch sử hoạt động Admin
     * * @param mysqli $conn      Biến kết nối CSDL
     * @param int    $admin_id  ID của admin thực hiện
     * @param string $action    Nội dung hành động
     * @param int    $target_id ID đối tượng bị tác động (Ví dụ: ID user bị khóa)
     * @return bool             True nếu thành công, False nếu thất bại
     */
    function writeAdminLog($conn, $admin_id, $action, $target_id = null) {
        try {
            // Kiểm tra kết nối DB trước khi thực hiện
            if (!isset($conn) || $conn->connect_error) {
                return false;
            }

            // 1. Lấy thông tin môi trường (Dùng hàm helper ở trên)
            $ip = getRealUserIp();
            
            // Lấy User Agent (Thiết bị/Trình duyệt)
            $ua = $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown Device';

            // 2. Chuẩn bị câu lệnh SQL
            // Lưu ý: Đảm bảo bảng admin_log đã có cột ip_address và user_agent
            $sql = "INSERT INTO admin_log (admin_id, action, target_id, ip_address, user_agent, created_at) 
                    VALUES (?, ?, ?, ?, ?, NOW())";
            
            $stmt = $conn->prepare($sql);
            
            if ($stmt) {
                // Bind tham số: 
                // i (int), s (string), i (int), s (string), s (string)
                $stmt->bind_param("isiss", $admin_id, $action, $target_id, $ip, $ua);
                
                if ($stmt->execute()) {
                    $stmt->close();
                    return true;
                } else {
                    $stmt->close();
                    return false;
                }
            }
        } catch (Exception $e) {
            // Ghi lỗi vào error log của server nếu cần debug (Bỏ comment dòng dưới)
            // error_log("WriteAdminLog Error: " . $e->getMessage());
            return false;
        }
        return false;
    }
}
?>

<?php
/**
 * database_helpers.php
 * Các hàm PHP thay thế cho Stored Procedures và Triggers
 * (InfinityFree không hỗ trợ procedures/triggers)
 */

require_once __DIR__ . '/../config/database.php';

/**
 * Cập nhật tiến độ sau khi học từ
 * Thay thế trigger: auto_update_progress_after_learn
 */
function updateCourseProgress($user_id, $word_id) {
    global $pdo;
    
    try {
        // 1. Tìm khóa học của từ vựng
        $stmt = $pdo->prepare("SELECT course_id FROM word WHERE word_id = ?");
        $stmt->execute([$word_id]);
        $course = $stmt->fetch();
        
        if (!$course) return false;
        
        $course_id = $course['course_id'];
        
        // 2. Đếm tổng số từ trong khóa học
        $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM word WHERE course_id = ?");
        $stmt->execute([$course_id]);
        $total_words = $stmt->fetch()['total'];
        
        // 3. Đếm số từ đã mastered
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as mastered
            FROM learned_word lw
            JOIN word w ON lw.word_id = w.word_id
            WHERE lw.user_id = ? AND w.course_id = ? AND lw.status = 'mastered'
        ");
        $stmt->execute([$user_id, $course_id]);
        $mastered_words = $stmt->fetch()['mastered'];
        
        // 4. Tính phần trăm
        $progress = $total_words > 0 ? round(($mastered_words / $total_words) * 100) : 0;
        
        // 5. Cập nhật progress
        $status = ($progress == 100) ? 'completed' : 'active';
        
        $stmt = $pdo->prepare("
            UPDATE user_course 
            SET progress = ?, status = ?
            WHERE user_id = ? AND course_id = ?
        ");
        $stmt->execute([$progress, $status, $user_id, $course_id]);
        
        return true;
        
    } catch (PDOException $e) {
        error_log("updateCourseProgress error: " . $e->getMessage());
        return false;
    }
}

/**
 * Cập nhật từ vựng sau khi ôn tập
 * Thay thế procedure: sp_update_word_after_review
 */
function updateWordAfterReview($user_id, $word_id, $is_correct) {
    global $pdo;
    
    try {
        // 1. Lấy thông tin hiện tại
        $stmt = $pdo->prepare("
            SELECT 
                COALESCE(consecutive_correct, 0) as consecutive_correct,
                COALESCE(consecutive_incorrect, 0) as consecutive_incorrect,
                COALESCE(mastery_level, 0) as mastery_level,
                learning_progress
            FROM learned_word
            WHERE user_id = ? AND word_id = ?
        ");
        $stmt->execute([$user_id, $word_id]);
        $current = $stmt->fetch();
        
        if (!$current) {
            // Tạo record mới nếu chưa có
            $stmt = $pdo->prepare("
                INSERT INTO learned_word (user_id, word_id, learning_progress, current_position)
                VALUES (?, ?, 0, 0)
            ");
            $stmt->execute([$user_id, $word_id]);
            $current = [
                'consecutive_correct' => 0,
                'consecutive_incorrect' => 0,
                'mastery_level' => 0,
                'learning_progress' => 0
            ];
        }
        
        // 2. Tính toán giá trị mới
        $new_correct = $current['consecutive_correct'];
        $new_incorrect = $current['consecutive_incorrect'];
        $new_mastery = $current['mastery_level'];
        $new_progress = $current['learning_progress'];
        
        if ($is_correct) {
            // Trả lời đúng
            $new_correct++;
            $new_incorrect = 0; // Reset sai về 0
            $new_progress = min($new_progress + 10, 100);
            
            // Tăng mastery level
            if ($new_correct >= 3) {
                $new_mastery = min($new_mastery + 1, 5);
            }
        } else {
            // Trả lời sai
            $new_incorrect++;
            $new_correct = 0; // Reset đúng về 0
            $new_progress = max($new_progress - 15, 0);
            
            // Giảm mastery level
            if ($new_incorrect >= 2) {
                $new_mastery = max($new_mastery - 1, 0);
            }
        }
        
        // 3. Xác định status mới
        if ($new_progress >= 100 && $new_mastery >= 4) {
            $new_status = 'mastered';
        } elseif ($new_progress >= 50) {
            $new_status = 'reviewing';
        } elseif ($new_progress > 0) {
            $new_status = 'learning';
        } else {
            $new_status = 'not_learned';
        }
        
        // 4. Cập nhật database
        $stmt = $pdo->prepare("
            UPDATE learned_word
            SET 
                status = ?,
                learning_progress = ?,
                consecutive_correct = ?,
                consecutive_incorrect = ?,
                mastery_level = ?,
                review_count = review_count + 1,
                last_reviewed_at = NOW()
            WHERE user_id = ? AND word_id = ?
        ");
        
        $stmt->execute([
            $new_status,
            $new_progress,
            $new_correct,
            $new_incorrect,
            $new_mastery,
            $user_id,
            $word_id
        ]);
        
        // 5. Ghi log
        $stmt = $pdo->prepare("
            INSERT INTO review_log (user_id, word_id, is_correct)
            VALUES (?, ?, ?)
        ");
        $stmt->execute([$user_id, $word_id, $is_correct ? 1 : 0]);
        
        // 6. Cập nhật progress khóa học
        updateCourseProgress($user_id, $word_id);
        
        return true;
        
    } catch (PDOException $e) {
        error_log("updateWordAfterReview error: " . $e->getMessage());
        return false;
    }
}

/**
 * Thêm khóa học cho user
 * Thay thế trigger: after_user_course_insert
 */
function enrollUserToCourse($user_id, $course_id) {
    global $pdo;
    
    try {
        $pdo->beginTransaction();
        
        // 1. Thêm vào user_course
        $stmt = $pdo->prepare("
            INSERT INTO user_course (user_id, course_id, status, progress, enrolled_at)
            VALUES (?, ?, 'active', 0, NOW())
            ON DUPLICATE KEY UPDATE status = 'active'
        ");
        $stmt->execute([$user_id, $course_id]);
        
        // 2. Thêm tất cả từ vào learned_word
        $stmt = $pdo->prepare("
            INSERT IGNORE INTO learned_word 
            (user_id, word_id, status, learning_progress, current_position, created_at)
            SELECT 
                ?,
                word_id,
                'not_learned',
                0,
                0,
                NOW()
            FROM word 
            WHERE course_id = ?
        ");
        $stmt->execute([$user_id, $course_id]);
        
        // 3. Cập nhật statistic
        $stmt = $pdo->prepare("
            INSERT INTO statistic (user_id, total_courses, updated_at)
            VALUES (?, 1, NOW())
            ON DUPLICATE KEY UPDATE
                total_courses = total_courses + 1,
                updated_at = NOW()
        ");
        $stmt->execute([$user_id]);
        
        $pdo->commit();
        return true;
        
    } catch (PDOException $e) {
        $pdo->rollBack();
        error_log("enrollUserToCourse error: " . $e->getMessage());
        return false;
    }
}

/**
 * Xóa khóa học khỏi user
 * Thay thế trigger: after_user_course_delete
 */
function unenrollUserFromCourse($user_id, $course_id) {
    global $pdo;
    
    try {
        $pdo->beginTransaction();
        
        // 1. Xóa các từ vựng tương ứng
        $stmt = $pdo->prepare("
            DELETE FROM learned_word 
            WHERE user_id = ? 
              AND word_id IN (
                  SELECT word_id 
                  FROM word 
                  WHERE course_id = ?
              )
        ");
        $stmt->execute([$user_id, $course_id]);
        
        // 2. Xóa khóa học
        $stmt = $pdo->prepare("
            DELETE FROM user_course 
            WHERE user_id = ? AND course_id = ?
        ");
        $stmt->execute([$user_id, $course_id]);
        
        // 3. Cập nhật statistic
        $stmt = $pdo->prepare("
            UPDATE statistic 
            SET total_courses = GREATEST(0, total_courses - 1),
                updated_at = NOW()
            WHERE user_id = ?
        ");
        $stmt->execute([$user_id]);
        
        $pdo->commit();
        return true;
        
    } catch (PDOException $e) {
        $pdo->rollBack();
        error_log("unenrollUserFromCourse error: " . $e->getMessage());
        return false;
    }
}

/**
 * Cập nhật streak days
 */
function updateStreakDays($user_id) {
    global $pdo;
    
    try {
        $stmt = $pdo->prepare("
            SELECT last_activity_date, streak_days
            FROM statistic
            WHERE user_id = ?
        ");
        $stmt->execute([$user_id]);
        $stat = $stmt->fetch();
        
        if (!$stat) {
            // Tạo mới
            $stmt = $pdo->prepare("
                INSERT INTO statistic (user_id, streak_days, last_activity_date, updated_at)
                VALUES (?, 1, CURDATE(), NOW())
            ");
            $stmt->execute([$user_id]);
            return 1;
        }
        
        $today = date('Y-m-d');
        $last_date = $stat['last_activity_date'];
        $current_streak = $stat['streak_days'];
        
        if ($last_date == $today) {
            // Đã học hôm nay rồi
            return $current_streak;
        }
        
        $yesterday = date('Y-m-d', strtotime('-1 day'));
        
        if ($last_date == $yesterday) {
            // Học liên tiếp -> tăng streak
            $new_streak = $current_streak + 1;
        } else {
            // Bỏ lỡ -> reset streak
            $new_streak = 1;
        }
        
        $stmt = $pdo->prepare("
            UPDATE statistic
            SET streak_days = ?,
                last_activity_date = CURDATE(),
                updated_at = NOW()
            WHERE user_id = ?
        ");
        $stmt->execute([$new_streak, $user_id]);
        
        return $new_streak;
        
    } catch (PDOException $e) {
        error_log("updateStreakDays error: " . $e->getMessage());
        return 0;
    }
}

/**
 * Lưu kết quả quiz
 */
function saveQuizResult($user_id, $course_id, $review_type, $total_words, $correct_count, $duration_seconds, $details) {
    global $pdo;
    
    try {
        $pdo->beginTransaction();
        
        $incorrect_count = $total_words - $correct_count;
        $score = $total_words > 0 ? ($correct_count / $total_words) * 100 : 0;
        
        // 1. Lưu session
        $stmt = $pdo->prepare("
            INSERT INTO review_session 
            (user_id, course_id, review_type, total_words, correct_count, incorrect_count, score, duration_seconds, completed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([
            $user_id,
            $course_id,
            $review_type,
            $total_words,
            $correct_count,
            $incorrect_count,
            $score,
            $duration_seconds
        ]);
        
        $session_id = $pdo->lastInsertId();
        
        // 2. Lưu chi tiết từng câu trả lời
        foreach ($details as $detail) {
            $stmt = $pdo->prepare("
                INSERT INTO review_session_detail 
                (session_id, word_id, user_answer, correct_answer, is_correct, response_time)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $session_id,
                $detail['word_id'],
                $detail['user_answer'],
                $detail['correct_answer'],
                $detail['is_correct'],
                $detail['response_time']
            ]);
            
            // 3. Cập nhật từng từ vựng
            updateWordAfterReview($user_id, $detail['word_id'], $detail['is_correct']);
        }
        
        // 4. Cập nhật statistic
        $stmt = $pdo->prepare("
            UPDATE statistic
            SET total_quizzes_done = total_quizzes_done + 1,
                updated_at = NOW()
            WHERE user_id = ?
        ");
        $stmt->execute([$user_id]);
        
        // 5. Cập nhật streak
        updateStreakDays($user_id);
        
        $pdo->commit();
        return $session_id;
        
    } catch (PDOException $e) {
        $pdo->rollBack();
        error_log("saveQuizResult error: " . $e->getMessage());
        return false;
    }
}

/**
 * Lấy thống kê user review
 * Thay thế view: vw_user_review_stats
 */
function getUserReviewStats($user_id, $course_id = null) {
    global $pdo;
    
    try {
        $sql = "
            SELECT 
                u.user_id,
                u.name,
                c.course_id,
                c.course_name,
                COUNT(DISTINCT rs.session_id) as total_sessions,
                SUM(rs.total_words) as total_words_reviewed,
                SUM(rs.correct_count) as total_correct,
                SUM(rs.incorrect_count) as total_incorrect,
                ROUND(AVG(rs.score), 2) as avg_score,
                MAX(rs.completed_at) as last_review_date
            FROM user u
            LEFT JOIN review_session rs ON u.user_id = rs.user_id
            LEFT JOIN course c ON rs.course_id = c.course_id
            WHERE u.user_id = ?
        ";
        
        $params = [$user_id];
        
        if ($course_id) {
            $sql .= " AND c.course_id = ?";
            $params[] = $course_id;
        }
        
        $sql .= " GROUP BY u.user_id, u.name, c.course_id, c.course_name";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
        
    } catch (PDOException $e) {
        error_log("getUserReviewStats error: " . $e->getMessage());
        return [];
    }
}
?>