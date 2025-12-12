<?php
// FILE: api/admin/course_update_status.php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ob_start();

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=utf-8');

require_once '../../config/config.php';
require_once '../../includes/auth_check.php';
require_once '../../includes/log_helper.php';

try {
    // 1. KIỂM TRA BẢO MẬT (AUTH)
    if (session_status() === PHP_SESSION_NONE) session_start();
    
    // Kiểm tra session timeout & security
    if (!check_session_timeout() || !validate_session_security()) {
        throw new Exception("Phiên đăng nhập hết hạn.");
    }
    
    // Kiểm tra quyền Admin
    if (!isset($_SESSION['user_id']) || (isset($_SESSION['role']) && $_SESSION['role'] !== 'admin')) {
        throw new Exception("Không đủ quyền truy cập.");
    }

    $admin_id = $_SESSION['user_id'];
    $input = json_decode(file_get_contents('php://input'), true);

    // 2. KIỂM TRA CSRF
    if (!isset($input['csrf_token']) || $input['csrf_token'] !== $_SESSION['csrf_token']) {
        throw new Exception("Lỗi bảo mật CSRF (Token không hợp lệ).");
    }

    // 3. KIỂM TRA DỮ LIỆU ĐẦU VÀO
    if (!isset($input['id']) || !isset($input['status'])) {
        throw new Exception("Thiếu dữ liệu ID hoặc Status.");
    }

    $id = (int)$input['id'];
    $statusRaw = $input['status']; // Mong đợi: 'active' hoặc 'hidden' từ JS
    
    // Map trạng thái sang DB (public/private)
    $visibility = ($statusRaw === 'active' || $statusRaw === 'public') ? 'public' : 'private';

    // 4. CẬP NHẬT DATABASE
    $stmt = $conn->prepare("UPDATE course SET visibility = ? WHERE course_id = ?");
    $stmt->bind_param("si", $visibility, $id);

    if ($stmt->execute()) {
        // Ghi log
        if (function_exists('writeAdminLog')) {
            $actionName = ($visibility === 'public') ? "Mở khóa học (Public)" : "Ẩn khóa học (Private)";
            writeAdminLog($conn, $admin_id, "$actionName", $id);
        }

        ob_clean();
        echo json_encode([
            'status' => 'success', 
            'message' => 'Cập nhật trạng thái thành công!',
            'data' => ['visibility' => $visibility]
        ]);
    } else {
        throw new Exception("Lỗi Database: " . $stmt->error);
    }

} catch (Exception $e) {
    ob_clean();
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>