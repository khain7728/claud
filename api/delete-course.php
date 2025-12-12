<?php
/**
 * API XÓA KHÓA HỌC (BEST PRACTICE — GIỮ NGUYÊN LOGIC)
 * Endpoint: api/delete-course.php
 * Method: POST
 *
 * - Dùng prepared statements để tránh SQL injection
 * - Validate input kỹ
 * - Kiểm tra ownership trước khi delete
 * - Không cho owner "leave" (bảo toàn logic)
 * - Dùng JOIN delete để nhanh hơn (thay IN(subquery))
 * - Ghi log lỗi bằng error_log() nhưng trả về message thân thiện
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

ob_start();
error_reporting(0);
ini_set('display_errors', 0);
header('Content-Type: application/json; charset=utf-8');

require_once '../config/config.php'; // cần cung cấp $conn (mysqli)
require_once '../includes/rate_limiter.php';
checkApiRateLimit();

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        throw new Exception('Method Not Allowed');
    }

    // ✅ BẢO MẬT: Lấy user_id từ session
    $user_id = api_require_login();

    // Đọc và validate input JSON
    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true);

    if (!is_array($input)) {
        throw new Exception('Dữ liệu gửi lên không đúng định dạng JSON.');
    }

    if (!isset($input['course_id']) || !isset($input['action'])) {
        throw new Exception('Thiếu tham số bắt buộc (course_id, action).');
    }

    $course_id = intval($input['course_id']);
    $action    = trim($input['action']);
    
    // ⚠️ SECURITY: user_id không còn nhận từ client nữa

    if ($course_id <= 0 || $user_id <= 0) {
        throw new Exception('course_id hoặc user_id không hợp lệ.');
    }

    if (!in_array($action, ['delete', 'leave'], true)) {
        throw new Exception('Action không hợp lệ (phải là delete hoặc leave).');
    }

    if (!isset($conn) || !($conn instanceof mysqli)) {
        throw new Exception('Kết nối cơ sở dữ liệu không khả dụng.');
    }

    // Bắt transaction
    $conn->begin_transaction();
    // đảm bảo autocommit tắt
    $conn->autocommit(false);

    // --- 1. Kiểm tra course tồn tại và lấy create_by (owner)
    $stmt = $conn->prepare("SELECT create_by FROM course WHERE course_id = ?");
    if (!$stmt) throw new Exception('Lỗi hệ thống (prepare).');
    $stmt->bind_param('i', $course_id);
    if (!$stmt->execute()) throw new Exception('Lỗi hệ thống (execute).');
    $res = $stmt->get_result();
    if ($res->num_rows === 0) {
        $stmt->close();
        throw new Exception('Khóa học không tồn tại.');
    }
    $row = $res->fetch_assoc();
    $owner_id = intval($row['create_by']);
    $stmt->close();

    // Nếu action = leave, không cho owner rời (giữ nguyên logic an toàn)
    if ($action === 'leave' && $owner_id === $user_id) {
        throw new Exception('Chủ sở hữu không thể rời khỏi khóa học. Nếu muốn xóa khóa học, dùng action=delete.');
    }

    // Nếu action = delete, chỉ owner mới được xóa
    if ($action === 'delete' && $owner_id !== $user_id) {
        throw new Exception('Bạn không có quyền xóa khóa học này (không phải chủ sở hữu).');
    }

    // ============================================================
    // THỰC HIỆN XÓA DỮ LIỆU (GIỮ NGUYÊN LOGIC HIỆN TẠI)
    // SỬ DỤNG prepared statements / JOIN DELETE để an toàn & nhanh
    // ============================================================

    if ($action === 'delete') {
        // 1) XÓA review_log liên quan tới các word của course (JOIN)
        $sql = "DELETE rl FROM review_log rl
                JOIN word w ON rl.word_id = w.word_id
                WHERE w.course_id = ?";
        $stmt = $conn->prepare($sql);
        if (!$stmt) throw new Exception('Lỗi hệ thống (prepare review_log).');
        $stmt->bind_param('i', $course_id);
        if (!$stmt->execute()) {
            $err = $stmt->error;
            $stmt->close();
            throw new Exception('Lỗi khi xóa review_log: ' . $err);
        }
        $stmt->close();

        // 2) XÓA learned_word liên quan tới các word của course (JOIN)
        $sql = "DELETE lw FROM learned_word lw
                JOIN word w ON lw.word_id = w.word_id
                WHERE w.course_id = ?";
        $stmt = $conn->prepare($sql);
        if (!$stmt) throw new Exception('Lỗi hệ thống (prepare learned_word).');
        $stmt->bind_param('i', $course_id);
        if (!$stmt->execute()) {
            $err = $stmt->error; $stmt->close();
            throw new Exception('Lỗi khi xóa learned_word: ' . $err);
        }
        $stmt->close();

        // 3) XÓA review_session_detail dựa vào review_session.course_id (JOIN)
        $sql = "DELETE rsd FROM review_session_detail rsd
                JOIN review_session rs ON rsd.session_id = rs.session_id
                WHERE rs.course_id = ?";
        $stmt = $conn->prepare($sql);
        if (!$stmt) throw new Exception('Lỗi hệ thống (prepare review_session_detail).');
        $stmt->bind_param('i', $course_id);
        if (!$stmt->execute()) {
            $err = $stmt->error; $stmt->close();
            throw new Exception('Lỗi khi xóa review_session_detail: ' . $err);
        }
        $stmt->close();

        // 4) XÓA review_session (table trực tiếp theo course_id)
        $sql = "DELETE FROM review_session WHERE course_id = ?";
        $stmt = $conn->prepare($sql);
        if (!$stmt) throw new Exception('Lỗi hệ thống (prepare review_session).');
        $stmt->bind_param('i', $course_id);
        if (!$stmt->execute()) {
            $err = $stmt->error; $stmt->close();
            throw new Exception('Lỗi khi xóa review_session: ' . $err);
        }
        $stmt->close();

        // 5) XÓA course_tag
        $sql = "DELETE FROM course_tag WHERE course_id = ?";
        $stmt = $conn->prepare($sql);
        if (!$stmt) throw new Exception('Lỗi hệ thống (prepare course_tag).');
        $stmt->bind_param('i', $course_id);
        if (!$stmt->execute()) {
            $err = $stmt->error; $stmt->close();
            throw new Exception('Lỗi khi xóa course_tag: ' . $err);
        }
        $stmt->close();

        // 6) XÓA user_course (tất cả học viên)
        $sql = "DELETE FROM user_course WHERE course_id = ?";
        $stmt = $conn->prepare($sql);
        if (!$stmt) throw new Exception('Lỗi hệ thống (prepare user_course).');
        $stmt->bind_param('i', $course_id);
        if (!$stmt->execute()) {
            $err = $stmt->error; $stmt->close();
            throw new Exception('Lỗi khi xóa user_course: ' . $err);
        }
        $stmt->close();

        // 7) XÓA word (từ thuộc course)
        $sql = "DELETE FROM word WHERE course_id = ?";
        $stmt = $conn->prepare($sql);
        if (!$stmt) throw new Exception('Lỗi hệ thống (prepare word).');
        $stmt->bind_param('i', $course_id);
        if (!$stmt->execute()) {
            $err = $stmt->error; $stmt->close();
            throw new Exception('Lỗi khi xóa word: ' . $err);
        }
        $stmt->close();

        // 8) Cuối cùng xóa course
        $sql = "DELETE FROM course WHERE course_id = ?";
        $stmt = $conn->prepare($sql);
        if (!$stmt) throw new Exception('Lỗi hệ thống (prepare course).');
        $stmt->bind_param('i', $course_id);
        if (!$stmt->execute()) {
            $err = $stmt->error; $stmt->close();
            throw new Exception('Lỗi khi xóa course: ' . $err);
        }
        $stmt->close();

        $msg = "Khóa học đã được xóa";
    } else { // action === 'leave'
        // Xóa user_course cho user này và course này
        $sql = "DELETE FROM user_course WHERE user_id = ? AND course_id = ?";
        $stmt = $conn->prepare($sql);
        if (!$stmt) throw new Exception('Lỗi hệ thống (prepare leave).');
        $stmt->bind_param('ii', $user_id, $course_id);
        if (!$stmt->execute()) {
            $err = $stmt->error; $stmt->close();
            throw new Exception('Lỗi khi rời khỏi khóa học: ' . $err);
        }
        $affected = $stmt->affected_rows;
        $stmt->close();

        if ($affected > 0) {
            // Cập nhật statistic nếu cần
            $sql = "UPDATE statistic SET total_courses = GREATEST(0, total_courses - 1) WHERE user_id = ?";
            $stmt = $conn->prepare($sql);
            if (!$stmt) throw new Exception('Lỗi hệ thống (prepare statistic).');
            $stmt->bind_param('i', $user_id);
            if (!$stmt->execute()) {
                $err = $stmt->error; $stmt->close();
                throw new Exception('Lỗi khi cập nhật statistic: ' . $err);
            }
            $stmt->close();

            $msg = "Đã rời khỏi khóa học.";
        } else {
            $msg = "Bạn chưa tham gia hoặc đã rời khóa học này rồi.";
        }
    }

    // Commit và trả về success
    $conn->commit();
    $conn->autocommit(true);
    ob_clean();
    echo json_encode(['success' => true, 'message' => $msg]);
    exit();

} catch (Exception $e) {
    // rollback nếu có lỗi
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->rollback();
        $conn->autocommit(true);
    }

    // Log server-side để debug (không trả raw SQL error cho client)
    error_log("[delete-course.php] ERROR: " . $e->getMessage());

    // Trả về message thân thiện
    ob_clean();
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Có lỗi khi xử lý yêu cầu. Vui lòng thử lại hoặc liên hệ admin.']);
    exit();
}
?>
