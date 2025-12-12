<?php
/**
 * KẾT NỐI CSDL
 * ⭐ BẮT BUỘC
 * Cấu hình và khởi tạo kết nối đến MySQL/MariaDB
 */

// Thông tin kết nối database
define('DB_HOST', 'localhost');        // Máy chủ database
define('DB_USER', 'root');             // Username MySQL (mặc định XAMPP là 'root')
define('DB_PASS', '');                 // Password (mặc định XAMPP để trống)
define('DB_NAME', 'english_learning'); // Tên database
define('DB_CHARSET', 'utf8mb4');       // Bộ mã ký tự

// Tạo kết nối MySQLi
$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

// Kiểm tra kết nối
if ($conn->connect_error) {
    die("Kết nối thất bại: " . $conn->connect_error);
}

// Set charset
$conn->set_charset(DB_CHARSET);

// Hàm lấy kết nối PDO (dùng cho prepared statements)
function getPDO() {
    try {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        return new PDO($dsn, DB_USER, DB_PASS, $options);
    } catch (PDOException $e) {
        die("Lỗi kết nối PDO: " . $e->getMessage());
    }
}

?>
