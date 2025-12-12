<?php
/**
 * API LƯU MỤC TIÊU HỌC HÀNG NGÀY
 * Endpoint: api/save-daily-goal.php
 * Method: POST
 * Body: {
 *   user_id: number,
 *   daily_words_target: number,
 *   is_recurring: boolean (0: chỉ hôm nay, 1: lặp lại hàng ngày)
 * }
 */

// CORS Headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../config/config.php';

try {
    // Lấy dữ liệu JSON từ request body
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);
    
    // Validate input
    if (!isset($data['user_id']) || !isset($data['daily_words_target'])) {
        throw new Exception('Missing required fields: user_id, daily_words_target');
    }
    
    $user_id = intval($data['user_id']);
    $daily_words_target = intval($data['daily_words_target']);
    $is_recurring = isset($data['is_recurring']) ? intval($data['is_recurring']) : 0;
    
    // Validate values
    if ($user_id <= 0) {
        throw new Exception('Invalid user_id');
    }
    
    if ($daily_words_target <= 0 || $daily_words_target > 1000) {
        throw new Exception('daily_words_target must be between 1 and 1000');
    }
    
    // Kiểm tra user có tồn tại không
    $checkUser = $conn->prepare("SELECT user_id FROM user WHERE user_id = ?");
    $checkUser->bind_param("i", $user_id);
    $checkUser->execute();
    if ($checkUser->get_result()->num_rows == 0) {
        throw new Exception('User not found');
    }
    
    // Insert hoặc Update mục tiêu (dùng ON DUPLICATE KEY UPDATE)
    $sql = "INSERT INTO user_daily_goal (user_id, daily_words_target, is_recurring)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                daily_words_target = VALUES(daily_words_target),
                is_recurring = VALUES(is_recurring),
                updated_at = CURRENT_TIMESTAMP";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("iii", $user_id, $daily_words_target, $is_recurring);
    
    if ($stmt->execute()) {
        echo json_encode([
            'success' => true,
            'message' => 'Đã lưu mục tiêu học hàng ngày thành công',
            'data' => [
                'user_id' => $user_id,
                'daily_words_target' => $daily_words_target,
                'is_recurring' => (bool)$is_recurring
            ]
        ]);
    } else {
        throw new Exception('Failed to save daily goal');
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
