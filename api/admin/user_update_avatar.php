<?php
// FILE: api/admin/user_update_avatar.php
header('Content-Type: application/json');
require_once '../../config/config.php'; 

// Cần include log_helper nếu muốn ghi lịch sử
require_once '../../includes/log_helper.php';

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new Exception("Method not allowed");

    session_start();
    // Check quyền admin (nếu cần bảo mật chặt hơn)
    if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') throw new Exception("Không có quyền.");

    $user_id = isset($_POST['user_id']) ? (int)$_POST['user_id'] : 0;
    if ($user_id <= 0) throw new Exception("ID User không hợp lệ");

    if (!isset($_FILES['avatar']) || $_FILES['avatar']['error'] !== UPLOAD_ERR_OK) {
        throw new Exception("Lỗi file: " . $_FILES['avatar']['error']);
    }

    // 1. Cấu hình thư mục lưu (Tạo folder nếu chưa có)
    // Đường dẫn vật lý trên server
    $uploadDir = $_SERVER['DOCUMENT_ROOT'] . '/VOCAB/uploads/avatars/'; 
    if (!file_exists($uploadDir)) mkdir($uploadDir, 0777, true);

    $fileInfo = pathinfo($_FILES['avatar']['name']);
    $ext = strtolower($fileInfo['extension']);
    
    // 2. Validate File
    $allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    if (!in_array($ext, $allowed)) throw new Exception("Chỉ chấp nhận file ảnh (jpg, png, gif...)");
    if ($_FILES['avatar']['size'] > 5 * 1024 * 1024) throw new Exception("File quá lớn (Max 5MB)");

    // 3. Tạo tên file mới
    $newFileName = "avatar_" . $user_id . "_" . time() . "." . $ext;
    $targetFile = $uploadDir . $newFileName;

    // 4. Di chuyển file
    if (move_uploaded_file($_FILES['avatar']['tmp_name'], $targetFile)) {
        // Đường dẫn tương đối lưu trong DB
        $dbPath = "uploads/avatars/" . $newFileName; 
        
        // 5. Update DB
        $stmt = $conn->prepare("UPDATE user SET avatar = ? WHERE user_id = ?");
        $stmt->bind_param("si", $dbPath, $user_id);
        
        if ($stmt->execute()) {
            // Ghi log admin
            if (function_exists('writeAdminLog')) {
                writeAdminLog($conn, $_SESSION['user_id'], "Đổi avatar cho user ID $user_id", $user_id);
            }

            echo json_encode([
                'status' => 'success', 
                'message' => 'Cập nhật avatar thành công!',
                'data' => ['avatar_url' => "../../" . $dbPath] 
            ]);
        } else {
            throw new Exception("Lỗi DB: " . $stmt->error);
        }
    } else {
        throw new Exception("Không thể lưu file vào thư mục uploads.");
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>