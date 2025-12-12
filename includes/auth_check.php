<?php
/**
 * AUTHENTICATION CHECK MIDDLEWARE (Enhanced Security)
 * Include file này ở đầu mỗi trang user/admin để bảo vệ
 * ✅ PHP-based protection (không thể bypass bằng JavaScript)
 */

// Load config nếu chưa load
if (!defined('ROOT_PATH')) {
    require_once __DIR__ . '/../config/config.php';
}

/**
 * Kiểm tra và làm mới session để chống session fixation
 */
function regenerate_session_if_needed() {
    // Regenerate session ID mỗi 30 phút
    if (!isset($_SESSION['last_regeneration'])) {
        $_SESSION['last_regeneration'] = time();
        session_regenerate_id(true);
    } elseif (time() - $_SESSION['last_regeneration'] > 1800) { // 30 phút
        $_SESSION['last_regeneration'] = time();
        session_regenerate_id(true);
    }
}

/**
 * Kiểm tra session timeout (tự động logout sau 1 giờ không hoạt động)
 */
function check_session_timeout() {
    $timeout = 3600; // 1 giờ
    
    if (isset($_SESSION['last_activity'])) {
        if (time() - $_SESSION['last_activity'] > $timeout) {
            // Session timeout - Logout
            session_unset();
            session_destroy();
            return false;
        }
    }
    
    $_SESSION['last_activity'] = time();
    return true;
}

/**
 * Validate User Agent và IP (chống session hijacking)
 */
function validate_session_security() {
    $current_user_agent = $_SERVER['HTTP_USER_AGENT'] ?? '';
    $current_ip = $_SERVER['REMOTE_ADDR'] ?? '';
    
    // Lưu fingerprint lần đầu login
    if (!isset($_SESSION['user_agent'])) {
        $_SESSION['user_agent'] = $current_user_agent;
        $_SESSION['user_ip'] = $current_ip;
        return true;
    }
    
    // Kiểm tra User Agent (phải giống lúc login)
    if ($_SESSION['user_agent'] !== $current_user_agent) {
        // Session hijacking detected
        session_unset();
        session_destroy();
        return false;
    }
    
    // Note: IP có thể thay đổi với mobile/proxy, nên chỉ cảnh báo
    // Trong production có thể log event này
    
    return true;
}

/**
 * Log failed authentication attempts (cho security monitoring)
 */
function log_auth_failure($reason, $user_id = null) {
    $log_file = ROOT_PATH . '/logs/auth_failures_' . date('Y-m-d') . '.log';
    $timestamp = date('Y-m-d H:i:s');
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
    $user_info = $user_id ? "User ID: $user_id" : "No user";
    
    $log_message = "[$timestamp] $reason | IP: $ip | $user_info | UA: $user_agent\n";
    
    // Tạo thư mục logs nếu chưa có
    if (!file_exists(dirname($log_file))) {
        mkdir(dirname($log_file), 0755, true);
    }
    
    error_log($log_message, 3, $log_file);
}

/**
 * Kiểm tra đăng nhập cho trang User (Enhanced)
 */
function check_user_auth() {
    // Kiểm tra session timeout
    if (!check_session_timeout()) {
        log_auth_failure('Session timeout');
        header('Location: /VOCAB/pages/dangnhap.html?timeout=1');
        exit();
    }
    
    // Kiểm tra session security
    if (!validate_session_security()) {
        log_auth_failure('Session hijacking detected', $_SESSION['user_id'] ?? null);
        header('Location: /VOCAB/pages/dangnhap.html?error=security');
        exit();
    }
    
    // Kiểm tra đăng nhập
    if (!is_logged_in()) {
        log_auth_failure('Not logged in');
        header('Location: /VOCAB/pages/dangnhap.html');
        exit();
    }
    
    // Regenerate session để bảo mật
    regenerate_session_if_needed();
    
    // Nếu là admin nhưng truy cập trang user, cho phép
    // Nếu không phải user hoặc admin, từ chối
    if (!is_user() && !is_admin()) {
        log_auth_failure('Invalid role', $_SESSION['user_id'] ?? null);
        header('Location: /VOCAB/pages/dangnhap.html');
        exit();
    }
}

/**
 * Kiểm tra quyền Admin (Enhanced)
 */
function check_admin_auth() {
    // Kiểm tra session timeout
    if (!check_session_timeout()) {
        log_auth_failure('Admin session timeout');
        header('Location: /VOCAB/pages/dangnhap.html?timeout=1');
        exit();
    }
    
    // Kiểm tra session security
    if (!validate_session_security()) {
        log_auth_failure('Admin session hijacking detected', $_SESSION['user_id'] ?? null);
        header('Location: /VOCAB/pages/dangnhap.html?error=security');
        exit();
    }
    
    // Kiểm tra đăng nhập
    if (!is_logged_in()) {
        log_auth_failure('Admin not logged in');
        header('Location: /VOCAB/pages/dangnhap.html');
        exit();
    }
    
    // Regenerate session
    regenerate_session_if_needed();
    
    // Kiểm tra quyền admin
    if (!is_admin()) {
        log_auth_failure('Unauthorized admin access attempt', $_SESSION['user_id'] ?? null);
        // Nếu là user thường, chuyển về dashboard user
        header('Location: /VOCAB/pages/user/user_Dashboard.html');
        exit();
    }
}
?>
