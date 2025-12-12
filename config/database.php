<?php
/**
 * Database Configuration
 * Tự động chuyển đổi giữa môi trường Development và Production
 */

// Kiểm tra môi trường
$isProduction = (!empty($_SERVER['HTTP_HOST']) && 
                 strpos($_SERVER['HTTP_HOST'], 'infinityfreeapp.com') !== false);

if ($isProduction) {
    // ===== PRODUCTION (InfinityFree) =====
    define('DB_HOST', 'sql211.infinityfree.com'); // Thay bằng host thực tế
    define('DB_USER', 'if0_40652540');        // Thay bằng username của bạn
    define('DB_PASS', 'Quockhain49');            // Thay bằng password của bạn
    define('DB_NAME', 'if0_40652540');  // Thay bằng tên database
    if (!defined('BASE_URL')) define('BASE_URL', 'https://vocab.infinityfreeapp.com/');
} else {
    // ===== DEVELOPMENT (XAMPP) =====
    define('DB_HOST', 'localhost');
    define('DB_USER', 'root');
    define('DB_PASS', '');
    define('DB_NAME', 'if0_40652540_english_learning');
    if (!defined('BASE_URL')) define('BASE_URL', 'http://localhost/VOCAB/');
}

// Charset
define('DB_CHARSET', 'utf8mb4');

/**
 * Kết nối MySQLi
 */
try {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    
    if ($conn->connect_error) {
        throw new Exception("Connection failed: " . $conn->connect_error);
    }
    
    $conn->set_charset(DB_CHARSET);
    
} catch (Exception $e) {
    error_log("Database connection error: " . $e->getMessage());
    die("Không thể kết nối database. Vui lòng thử lại sau.");
}

/**
 * Kết nối PDO (cho prepared statements)
 */
try {
    $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
} catch (PDOException $e) {
    error_log("PDO connection error: " . $e->getMessage());
    die("Không thể kết nối database. Vui lòng thử lại sau.");
}

/**
 * Helper function: Kiểm tra kết nối
 */
function checkDatabaseConnection() {
    global $conn;
    return $conn->ping();
}

/**
 * Helper function: Close connections
 */
function closeDatabaseConnections() {
    global $conn, $pdo;
    if (isset($conn)) {
        $conn->close();
    }
    $pdo = null;
}
?>