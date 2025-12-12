<?php
// FILE: api/admin/course_delete.php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ob_start();

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=utf-8');

require_once '../../config/config.php';
require_once '../../includes/auth_check.php';
require_once '../../includes/log_helper.php';

try {
    // 1. KIỂM TRA SESSION & QUYỀN HẠN
    if (session_status() === PHP_SESSION_NONE) session_start();
    if (!check_session_timeout() || !validate_session_security()) throw new Exception("Phiên hết hạn, vui lòng đăng nhập lại.");
    if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') throw new Exception("Không đủ quyền truy cập.");

    $admin_id = $_SESSION['user_id'];
    $input = json_decode(file_get_contents('php://input'), true);

    // 2. CHECK CSRF
    if (!isset($input['csrf_token']) || $input['csrf_token'] !== $_SESSION['csrf_token']) {
        throw new Exception("Lỗi bảo mật CSRF.");
    }

    if (empty($input['id'])) throw new Exception("Thiếu ID khóa học.");
    $id = (int)$input['id'];

    // 3. LẤY THÔNG TIN KHÓA HỌC TRƯỚC KHI XÓA
    // Mục đích: Kiểm tra trạng thái, owner và lấy tên để ghi log
    $stmtCheck = $conn->prepare("SELECT course_name, visibility, create_by FROM course WHERE course_id = ?");
    $stmtCheck->bind_param("i", $id);
    $stmtCheck->execute();
    $resultCheck = $stmtCheck->get_result();
    $course = $resultCheck->fetch_assoc();

    if (!$course) {
        throw new Exception("Khóa học không tồn tại hoặc đã bị xóa.");
    }

    $course_owner_id = (int)$course['create_by'];
    $is_admin_owner = ($course_owner_id === $admin_id);

    // --- LOGIC MỚI: PHÂN QUYỀN XÓA KHÓA HỌC ---
    // 1. Nếu khóa học do admin tạo → Admin tự do xóa (public hoặc private đều được)
    // 2. Nếu khóa học do user tạo:
    //    - Public → Admin có quyền xóa
    //    - Private → Admin KHÔNG được xóa (bảo vệ quyền riêng tư của user)
    
    if (!$is_admin_owner && $course['visibility'] === 'private') {
        throw new Exception("Không thể xóa khóa học riêng tư của người dùng. Chỉ có thể xóa khóa học công khai hoặc khóa học của chính bạn.");
    }

    // 4. THỰC HIỆN XÓA
    // Do DB có ràng buộc ON DELETE CASCADE (như giả định) thì chỉ cần xóa bảng cha.
    // Nếu không có CASCADE, cần xóa bảng con (lessons, course_tag) trước.
    $stmtDelete = $conn->prepare("DELETE FROM course WHERE course_id = ?");
    $stmtDelete->bind_param("i", $id);

    if ($stmtDelete->execute()) {
        // 5. GHI LOG HỆ THỐNG
        if (function_exists('writeAdminLog')) {
            writeAdminLog($conn, $admin_id, "Xóa khóa học công khai: " . $course['course_name'], $id);
        }

        ob_clean();
        echo json_encode([
            'status' => 'success', 
            'message' => 'Đã xóa khóa học thành công!'
        ]);
    } else {
        throw new Exception("Lỗi Database: " . $stmtDelete->error);
    }

} catch (Exception $e) {
    ob_clean();
    http_response_code(400); // Bad Request
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>