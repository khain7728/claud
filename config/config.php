<?php
/**
 * CONFIGURATION CHUNG
 * Các cấu hình chung của hệ thống
 * ⭐ FILE CẤU HÌNH MẶC ĐỊNH - KHÔNG CHỈNH SỬA
 */

// ========================================
// CẤU HÌNH LỖI (Development Mode)
// ========================================
// Bật hiển thị lỗi (chỉ dùng trong môi trường development)
// Khi deploy lên production, đổi thành 0
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// ========================================
// TIMEZONE
// ========================================
date_default_timezone_set('Asia/Ho_Chi_Minh');

// ========================================
// THÔNG TIN WEBSITE
// ========================================
define('SITE_NAME', 'VOCAB - English Learning');
define('SITE_URL', 'https://vocab.infinityfreeapp.com');
if (!defined('BASE_URL')) define('BASE_URL', 'https://vocab.infinityfreeapp.com'); // Alias for SITE_URL
define('SITE_EMAIL', 'admin@vocab.com');

// ========================================
// ĐƯỜNG DẪN THƯ MỤC
// ========================================
define('ROOT_PATH', dirname(__DIR__));
define('UPLOAD_PATH', ROOT_PATH . '/uploads');
define('LOG_PATH', ROOT_PATH . '/logs');
define('ASSETS_PATH', ROOT_PATH . '/assets');

// ========================================
// CẤU HÌNH SESSION
// ========================================
ini_set('session.cookie_httponly', 1);  // Bảo vệ khỏi XSS
ini_set('session.use_only_cookies', 1);  // Chỉ dùng cookies, không dùng URL
ini_set('session.cookie_secure', 0);     // Đổi thành 1 nếu dùng HTTPS
ini_set('session.gc_maxlifetime', 3600); // Session hết hạn sau 1 giờ

// ========================================
// KHỞI ĐỘNG SESSION
// ========================================
// Bắt đầu session nếu chưa có
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (strpos($_SERVER['REQUEST_URI'], '/api/') !== false) {
    require_once __DIR__ . '/../includes/rate_limiter.php';
    checkApiRateLimit();
}

// ========================================
// INCLUDE CÁC FILE CẤU HÌNH & HÀM
// ========================================

// 1. Kết nối database (BẮT BUỘC)
require_once __DIR__ . '/database.php';

// 2. Các hằng số (BẮT BUỘC)
if (file_exists(__DIR__ . '/constants.php')) {
    require_once __DIR__ . '/constants.php';
}

// 3. Các hàm tiện ích (BẮT BUỘC)
if (file_exists(ROOT_PATH . '/includes/functions.php')) {
    require_once ROOT_PATH . '/includes/functions.php';
}

// ========================================
// THIẾT LẬP HEADER BẢO MẬT
// ========================================
// Chống clickjacking
header('X-Frame-Options: SAMEORIGIN');
// Chống XSS
header('X-XSS-Protection: 1; mode=block');
// Chống MIME sniffing
header('X-Content-Type-Options: nosniff');

// ========================================
// HÀM KIỂM TRA KẾT NỐI DATABASE
// ========================================
// Kiểm tra kết nối database có hoạt động không
if (isset($conn) && !$conn->ping()) {
    die('
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 100px auto; padding: 20px; border: 2px solid #dc3545; border-radius: 10px; background: #fff;">
            <h2 style="color: #dc3545;">❌ Lỗi kết nối Database</h2>
            <p><strong>Không thể kết nối đến database "english_learning"</strong></p>
            <p>Vui lòng kiểm tra:</p>
            <ol>
                <li>✅ XAMPP đã khởi động Apache và MySQL chưa?</li>
                <li>✅ Database "english_learning" đã được tạo trong phpMyAdmin chưa?</li>
                <li>✅ Thông tin kết nối trong file <code>config/database.php</code> đã đúng chưa?</li>
            </ol>
            <p style="color: #666; font-size: 14px; margin-top: 20px;">
                💡 Mở phpMyAdmin: <a href="http://localhost/phpmyadmin" target="_blank">http://localhost/phpmyadmin</a>
            </p>
        </div>
    ');
}

?>
