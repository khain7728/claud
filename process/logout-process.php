<?php
/**
 * XỬ LÝ ĐĂNG XUẤT
 * Backend xử lý đăng xuất
 */

// Load config
require_once __DIR__ . '/../config/config.php';

// Xóa toàn bộ session
session_unset();
session_destroy();

// Xóa cookies nếu có
if (isset($_COOKIE['user_id'])) {
    setcookie('user_id', '', time() - 3600, '/');
}
if (isset($_COOKIE['user_token'])) {
    setcookie('user_token', '', time() - 3600, '/');
}

// Start session mới để hiển thị message
session_start();
set_message('Đăng xuất thành công!', MSG_SUCCESS);

// Redirect về trang đăng nhập
redirect('/VOCAB/pages/dangnhap.html');

?>
