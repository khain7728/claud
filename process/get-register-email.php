<?php
/**
 * API lấy email từ session để điền vào form đăng ký
 */

// Load config
require_once __DIR__ . '/../config/config.php';

// Lấy email từ session
$email = '';
if (isset($_SESSION['register_email'])) {
    $email = $_SESSION['register_email'];
    // Xóa sau khi lấy
    unset($_SESSION['register_email']);
}

// Trả về JSON
header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'success' => true,
    'email' => $email
], JSON_UNESCAPED_UNICODE);
?>
