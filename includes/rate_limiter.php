<?php
/**
 * RATE LIMITER - Bảo vệ API khỏi spam & abuse
 * Sử dụng: require_once 'includes/rate_limiter.php'; checkRateLimit();
 */

/**
 * Kiểm tra rate limit cho IP address
 * 
 * @param int $maxRequests Số request tối đa trong khoảng thời gian
 * @param int $timeWindow Khoảng thời gian (giây)
 * @param string $action Tên action để track riêng (login, register, api, etc)
 * @return bool True nếu được phép, False nếu vượt giới hạn
 */
function checkRateLimit($maxRequests = 60, $timeWindow = 60, $action = 'general') {
    // Lấy IP của user
    $ip = getRealIpAddress();
    
    // Tạo key duy nhất cho mỗi IP + action
    $key = 'rate_limit_' . $action . '_' . md5($ip);
    
    // Kiểm tra session có tồn tại không
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    $now = time();
    
    // Lấy dữ liệu rate limit từ session
    if (!isset($_SESSION[$key])) {
        $_SESSION[$key] = [
            'count' => 0,
            'start_time' => $now
        ];
    }
    
    $rateData = $_SESSION[$key];
    
    // Kiểm tra nếu đã hết time window -> reset
    if (($now - $rateData['start_time']) > $timeWindow) {
        $_SESSION[$key] = [
            'count' => 1,
            'start_time' => $now
        ];
        return true;
    }
    
    // Kiểm tra nếu vượt giới hạn
    if ($rateData['count'] >= $maxRequests) {
        $remainingTime = $timeWindow - ($now - $rateData['start_time']);
        
        // Log warning
        error_log("[Rate Limit] IP: $ip | Action: $action | Blocked for $remainingTime seconds");
        
        // Trả về HTTP 429 Too Many Requests
        http_response_code(429);
        header('Retry-After: ' . $remainingTime);
        
        // Trả về JSON error
        if (isJsonRequest()) {
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'error' => 'Too many requests. Please try again in ' . $remainingTime . ' seconds.',
                'retry_after' => $remainingTime
            ]);
        } else {
            echo "<h1>429 - Too Many Requests</h1>";
            echo "<p>You have exceeded the rate limit. Please try again in $remainingTime seconds.</p>";
        }
        
        exit;
    }
    
    // Tăng counter
    $_SESSION[$key]['count']++;
    
    return true;
}

/**
 * Rate limit cho API endpoints (strict hơn)
 */
function checkApiRateLimit() {
    return checkRateLimit(100, 60, 'api'); // 100 requests/minute
}

/**
 * Rate limit cho đăng nhập (chống brute force)
 */
function checkLoginRateLimit() {
    return checkRateLimit(5, 300, 'login'); // 5 lần thử/5 phút
}

/**
 * Rate limit cho đăng ký
 */
function checkRegisterRateLimit() {
    return checkRateLimit(3, 3600, 'register'); // 3 lần đăng ký/giờ
}

/**
 * Rate limit cho reset password
 */
function checkResetPasswordRateLimit() {
    return checkRateLimit(3, 3600, 'reset_password'); // 3 lần reset/giờ
}

/**
 * Rate limit cho upload file
 */
function checkUploadRateLimit() {
    return checkRateLimit(10, 300, 'upload'); // 10 uploads/5 phút
}

/**
 * Lấy địa chỉ IP thật của user (xử lý proxy/cloudflare)
 */
function getRealIpAddress() {
    $ipKeys = [
        'HTTP_CF_CONNECTING_IP', // Cloudflare
        'HTTP_X_FORWARDED_FOR',  // Proxy
        'HTTP_X_REAL_IP',        // Nginx proxy
        'REMOTE_ADDR'            // Direct connection
    ];
    
    foreach ($ipKeys as $key) {
        if (!empty($_SERVER[$key])) {
            $ip = $_SERVER[$key];
            
            // Nếu có nhiều IP (proxy chain), lấy IP đầu tiên
            if (strpos($ip, ',') !== false) {
                $ips = explode(',', $ip);
                $ip = trim($ips[0]);
            }
            
            // Validate IP
            if (filter_var($ip, FILTER_VALIDATE_IP)) {
                return $ip;
            }
        }
    }
    
    return '0.0.0.0';
}

/**
 * Kiểm tra request có phải JSON không
 */
function isJsonRequest() {
    return (
        (isset($_SERVER['CONTENT_TYPE']) && strpos($_SERVER['CONTENT_TYPE'], 'application/json') !== false) ||
        (isset($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false)
    );
}

/**
 * Reset rate limit cho một IP cụ thể (dùng cho admin)
 */
function resetRateLimit($ip = null, $action = 'general') {
    if ($ip === null) {
        $ip = getRealIpAddress();
    }
    
    $key = 'rate_limit_' . $action . '_' . md5($ip);
    
    if (isset($_SESSION[$key])) {
        unset($_SESSION[$key]);
        return true;
    }
    
    return false;
}

/**
 * Lấy thông tin rate limit hiện tại
 */
function getRateLimitInfo($action = 'general') {
    $ip = getRealIpAddress();
    $key = 'rate_limit_' . $action . '_' . md5($ip);
    
    if (!isset($_SESSION[$key])) {
        return [
            'count' => 0,
            'remaining' => 60,
            'reset_time' => time()
        ];
    }
    
    $rateData = $_SESSION[$key];
    $maxRequests = 60; // Default
    
    // Custom limits per action
    switch ($action) {
        case 'api':
            $maxRequests = 100;
            break;
        case 'login':
            $maxRequests = 5;
            break;
        case 'register':
        case 'reset_password':
            $maxRequests = 3;
            break;
        case 'upload':
            $maxRequests = 10;
            break;
    }
    
    return [
        'count' => $rateData['count'],
        'remaining' => max(0, $maxRequests - $rateData['count']),
        'reset_time' => $rateData['start_time'] + 60
    ];
}

?>
