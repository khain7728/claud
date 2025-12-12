<?php
/**
 * GATEWAY CHO TRANG ADMIN
 * File này bảo vệ tất cả các trang admin bằng PHP
 * Tất cả request đến pages/admin/*.html sẽ đi qua đây
 */

// Đánh dấu đã qua gateway (chặn direct access)
define('GATEWAY_PASSED', true);

// Bắt đầu session và load config
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../includes/auth_check.php';

// BƯỚC 1: Kiểm tra quyền ADMIN (PHP - không thể bypass)
check_admin_auth();

// BƯỚC 2: Lấy tên file được request
$requested_file = $_GET['page'] ?? 'trangchu_admin.html';

// BƯỚC 3: Validate filename (bảo mật - chống path traversal)
$requested_file = basename($requested_file);
if (!preg_match('/^[a-zA-Z0-9_\-]+\.html$/', $requested_file)) {
    http_response_code(400);
    die('Invalid page name');
}

// BƯỚC 4: Kiểm tra file tồn tại
$file_path = __DIR__ . '/' . $requested_file;
if (!file_exists($file_path)) {
    http_response_code(404);
    die('Page not found: ' . htmlspecialchars($requested_file));
}

// BƯỚC 5: Đọc và xuất nội dung HTML
$html_content = file_get_contents($file_path);

// BƯỚC 6: Inject admin info vào HTML
$admin_name = htmlspecialchars($_SESSION['name'] ?? 'Admin');
$admin_id = intval($_SESSION['user_id'] ?? 0);

// Thêm meta tag để JavaScript biết đã qua auth
$auth_meta = '
    <meta name="auth-verified" content="true">
    <meta name="user-id" content="' . $admin_id . '">
    <meta name="user-role" content="admin">
    <meta name="user-name" content="' . $admin_name . '">
';

// Inject vào <head>
$html_content = str_replace('</head>', $auth_meta . '</head>', $html_content);

// BƯỚC 7: Output HTML
echo $html_content;
?>
