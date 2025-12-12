<?php
/**
 * GOOGLE LOGIN - REDIRECT
 * Chuyển hướng người dùng đến Google để đăng nhập
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
$_SESSION['google_state'] = bin2hex(random_bytes(16));

// Các quyền cần xin từ Google
$scopes = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
];

// Tạo URL redirect đến Google
$google_login_url = 'https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query([
    'client_id' => GOOGLE_CLIENT_ID,
    'redirect_uri' => GOOGLE_REDIRECT_URI,
    'response_type' => 'code',
    'scope' => implode(' ', $scopes),
    'state' => $_SESSION['google_state'],
    'access_type' => 'offline',
    'prompt' => 'consent'
]);

// Redirect đến Google
header('Location: ' . $google_login_url);
exit;
