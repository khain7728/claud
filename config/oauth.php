<?php
/**
 * CẤU HÌNH OAUTH - FACEBOOK & GOOGLE
 * Lấy thông tin từ biến môi trường (.env)
 */

// Load environment variables từ .env nếu chưa load
if (!function_exists('loadEnv')) {
    /**
     * Đọc file .env và load vào $_ENV
     */
    function loadEnv($filePath) {
        if (!file_exists($filePath)) {
            die('ERROR: File .env không tồn tại. Vui lòng tạo file .env từ .env.example');
        }
        
        $lines = file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            // Skip comments
            if (strpos(trim($line), '#') === 0) {
                continue;
            }
            
            // Parse KEY=VALUE
            if (strpos($line, '=') !== false) {
                list($key, $value) = explode('=', $line, 2);
                $key = trim($key);
                $value = trim($value);
                
                // Remove quotes if present
                $value = trim($value, '"\"');
                
                // Set to environment
                if (!array_key_exists($key, $_ENV)) {
                    $_ENV[$key] = $value;
                    putenv("$key=$value");
                }
            }
        }
    }
}

// Load .env file
loadEnv(__DIR__ . '/../.env');

// Helper function to get env variable
if (!function_exists('env')) {
    function env($key, $default = null) {
        return $_ENV[$key] ?? getenv($key) ?? $default;
    }
}

// ========================================
// FACEBOOK LOGIN
// ========================================
define('FACEBOOK_APP_ID', env('FACEBOOK_APP_ID', 'YOUR_FACEBOOK_APP_ID'));
define('FACEBOOK_APP_SECRET', env('FACEBOOK_APP_SECRET', 'YOUR_FACEBOOK_APP_SECRET'));
define('FACEBOOK_REDIRECT_URI', env('FACEBOOK_REDIRECT_URI', 'http://localhost/VOCAB/auth/facebook-callback.php'));
define('FACEBOOK_API_VERSION', env('FACEBOOK_API_VERSION', 'v18.0'));

// ========================================
// GOOGLE LOGIN
// ========================================
define('GOOGLE_CLIENT_ID', env('GOOGLE_CLIENT_ID', ''));
define('GOOGLE_CLIENT_SECRET', env('GOOGLE_CLIENT_SECRET', ''));
define('GOOGLE_REDIRECT_URI', env('GOOGLE_REDIRECT_URI', 'http://localhost/VOCAB/auth/google-callback.php'));

