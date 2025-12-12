<?php
/**
 * API UPLOAD FILE MP3
 * File: api/upload_audio.php
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    if (!isset($_FILES['audio_file']) || $_FILES['audio_file']['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('Chưa chọn file hoặc lỗi upload.');
    }

    $file = $_FILES['audio_file'];
    
    // Validate định dạng
    $allowedMimeTypes = ['audio/mpeg', 'audio/mp3'];
    $fileMimeType = mime_content_type($file['tmp_name']);
    $fileExt = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

    if (!in_array($fileMimeType, $allowedMimeTypes) || $fileExt !== 'mp3') {
        throw new Exception('Chỉ chấp nhận file định dạng .mp3');
    }

    if ($file['size'] > 10 * 1024 * 1024) {
        throw new Exception('File quá lớn (Tối đa 10MB).');
    }

    // Tạo thư mục uploads/documents/ nếu chưa có
    $targetDir = "../uploads/documents/"; 
    if (!file_exists($targetDir)) {
        if (!mkdir($targetDir, 0777, true)) {
            throw new Exception('Không thể tạo thư mục lưu trữ.');
        }
    }

    $newFileName = uniqid('audio_', true) . '.' . $fileExt;
    $targetFilePath = $targetDir . $newFileName;

    if (move_uploaded_file($file['tmp_name'], $targetFilePath)) {
        // === FIX: TRẢ VỀ FULL URL THAY VÌ RELATIVE PATH ===
        // Load config để lấy BASE_URL
        require_once '../config/config.php';
        $publicPath = BASE_URL . "/uploads/documents/" . $newFileName;

        echo json_encode([
            'success' => true,
            'message' => 'Upload thành công!',
            'url' => $publicPath
        ]);
    } else {
        throw new Exception('Lỗi khi di chuyển file.');
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>