<?php
/**
 * API CẬP NHẬT HỒ SƠ USER (Có Upload Ảnh)
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

require_once '../config/config.php';

$response = [];

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Phương thức không hợp lệ.');
    }

    // 1. Lấy dữ liệu Text
    $user_id = isset($_POST['user_id']) ? (int)$_POST['user_id'] : 0;
    $fullname = isset($_POST['fullname']) ? trim($_POST['fullname']) : '';
    $bio = isset($_POST['bio']) ? trim($_POST['bio']) : '';

    if ($user_id <= 0 || empty($fullname)) {
        throw new Exception('Dữ liệu không hợp lệ. Vui lòng nhập tên.');
    }

    // 2. Xử lý Upload Avatar
    $avatarSqlFragment = "";
    $params = [$fullname, $bio];
    $types = "ss";
    $avatar_name = null;

    if (isset($_FILES['avatar']) && $_FILES['avatar']['error'] === UPLOAD_ERR_OK) {
        $fileTmpPath = $_FILES['avatar']['tmp_name'];
        $fileName = $_FILES['avatar']['name'];
        $fileSize = $_FILES['avatar']['size'];
        $fileNameCmps = explode(".", $fileName);
        $fileExtension = strtolower(end($fileNameCmps));

        $allowedfileExtensions = array('jpg', 'gif', 'png', 'jpeg', 'webp');
        if (!in_array($fileExtension, $allowedfileExtensions)) {
            throw new Exception('Chỉ chấp nhận file ảnh (jpg, png, gif, webp).');
        }

        if ($fileSize > 2 * 1024 * 1024) {
             throw new Exception('File ảnh quá lớn (Tối đa 2MB).');
        }

        $newFileName = 'avatar_' . $user_id . '_' . time() . '.' . $fileExtension;
        
        // ĐƯỜNG DẪN LƯU ẢNH (Từ api/ lùi ra root, vào assets/images/avatar/)
        $uploadFileDir = '../assets/images/avatar/';
        
        if (!file_exists($uploadFileDir)) {
            mkdir($uploadFileDir, 0777, true);
        }

        $dest_path = $uploadFileDir . $newFileName;

        if(move_uploaded_file($fileTmpPath, $dest_path)) {
            $avatarSqlFragment = ", avatar = ?";
            $params[] = $newFileName;
            $types .= "s";
            $avatar_name = $newFileName;
        } else {
            throw new Exception('Lỗi lưu file ảnh.');
        }
    }

    // 3. Update DB
    $params[] = $user_id;
    $types .= "i";

    $sql = "UPDATE user SET name = ?, bio = ? $avatarSqlFragment WHERE user_id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);

    if ($stmt->execute()) {
        $response = [
            'success' => true,
            'message' => 'Cập nhật thành công',
            'avatar_url' => $avatar_name 
        ];
    } else {
        throw new Exception('Lỗi cơ sở dữ liệu.');
    }

} catch (Exception $e) {
    http_response_code(400);
    $response = ['success' => false, 'error' => $e->getMessage()];
}

echo json_encode($response);
?>