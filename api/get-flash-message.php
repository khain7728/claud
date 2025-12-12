<?php
/**
 * API LẤY FLASH MESSAGE
 * Trả về thông báo từ session và xóa nó
 */
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/config.php';

$message = get_message();

if ($message) {
    echo json_encode([
        'success' => true,
        'message' => $message['message'],
        'type' => $message['type']
    ]);
} else {
    echo json_encode([
        'success' => false
    ]);
}
?>
