<?php
/**
 * RATE LIMIT MIDDLEWARE CHO API
 * Include file này vào đầu mỗi API endpoint
 */

// Load rate limiter
if (!function_exists('checkApiRateLimit')) {
    require_once __DIR__ . '/../../includes/rate_limiter.php';
}

// Tự động apply rate limit
checkApiRateLimit();

// Thêm rate limit info vào response headers
$rateLimitInfo = getRateLimitInfo('api');
header('X-RateLimit-Limit: 30');
header('X-RateLimit-Remaining: ' . $rateLimitInfo['remaining']);
header('X-RateLimit-Reset: ' . $rateLimitInfo['reset_time']);

?>
