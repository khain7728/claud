<?php
/**
 * API: Lấy thông tin user từ session
 */
session_start();

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

if (isset($_SESSION['user_id'])) {
    echo json_encode([
        'success' => true,
        'user_id' => $_SESSION['user_id'],
        'name' => $_SESSION['name'] ?? '',
        'role' => $_SESSION['role'] ?? 'user'
    ]);
} else {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => 'Not logged in'
    ]);
}
?>
