<?php
/**
 * FACEBOOK LOGIN - REDIRECT
 * Chuyển hướng người dùng đến Facebook để đăng nhập
 */
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/oauth.php';

// Nếu đã đăng nhập rồi thì không cần login nữa
if (is_logged_in()) {
    if (is_admin()) {
        redirect('/VOCAB/pages/admin/trangchu_admin.html');
    } else {
        redirect('/VOCAB/pages/user/user_Dashboard.html');
    }
}

// Tạo state để chống CSRF
$_SESSION['facebook_state'] = bin2hex(random_bytes(16));

// Các quyền cần xin từ Facebook
$permissions = ['email', 'public_profile'];

// Tạo URL redirect đến Facebook
$facebook_login_url = 'https://www.facebook.com/' . FACEBOOK_API_VERSION . '/dialog/oauth?' . http_build_query([
    'client_id' => FACEBOOK_APP_ID,
    'redirect_uri' => FACEBOOK_REDIRECT_URI,
    'state' => $_SESSION['facebook_state'],
    'scope' => implode(',', $permissions),
    'response_type' => 'code'
]);

// Redirect đến Facebook
header('Location: ' . $facebook_login_url);
exit;
