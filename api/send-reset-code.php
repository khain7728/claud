<?php
/**
 * API: GỬI MÃ CODE ĐẶT LẠI MẬT KHẨU
 * Tạo mã 6 số và gửi về email
 */
header('Content-Type: application/json');
require_once __DIR__ . '/../config/config.php';

// Chỉ cho phép POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request method']);
    exit;
}

// Lấy email từ request
$input = json_decode(file_get_contents('php://input'), true);
$email = trim($input['email'] ?? '');

// Validate email
if (empty($email)) {
    echo json_encode(['success' => false, 'message' => 'Vui lòng nhập email.']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['success' => false, 'message' => 'Email không hợp lệ.']);
    exit;
}

try {
    global $conn;
    
    // Kiểm tra email có tồn tại không
    $stmt = $conn->prepare("SELECT user_id, name FROM user WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        // Email không tồn tại - vẫn trả về success (bảo mật)
        echo json_encode([
            'success' => true, 
            'message' => 'Nếu email này tồn tại trong hệ thống, bạn sẽ nhận được mã xác thực.'
        ]);
        exit;
    }
    
    $user = $result->fetch_assoc();
    $stmt->close();
    
    // Tạo mã code 6 số ngẫu nhiên
    $reset_code = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $expire = date('Y-m-d H:i:s', strtotime('+15 minutes')); // Code hết hạn sau 15 phút
    
    // Lưu code vào database
    $stmt = $conn->prepare("UPDATE user SET reset_code = ?, reset_code_expire = ? WHERE user_id = ?");
    $stmt->bind_param("ssi", $reset_code, $expire, $user['user_id']);
    $stmt->execute();
    $stmt->close();
    
    // ==================================================
    // GỬI CODE CHO NGƯỜI DÙNG
    // ==================================================
    
    // Gửi email reset password
    require_once __DIR__ . '/../includes/email_helper.php';
    $emailResult = sendResetPasswordEmail($email, $user['name'], $reset_code);
    
    // Ghi log
    $log_message = sprintf(
        "[%s] Reset code to %s (%s). Code: %s, Status: %s\n",
        date('Y-m-d H:i:s'),
        $user['name'],
        $email,
        $reset_code,
        $emailResult['success'] ? 'SUCCESS' : 'FAILED'
    );
    file_put_contents(__DIR__ . '/../logs/password_reset.log', $log_message, FILE_APPEND);
    
    // Debug mode
    if (defined('APP_ENV') && APP_ENV === 'development') {
        $_SESSION['reset_code_info'] = [
            'email' => $email,
            'name' => $user['name'],
            'code' => $reset_code,
            'expire' => $expire
        ];
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Mã xác thực đã được gửi đến email của bạn.'
        // DEBUG: Xóa dòng dưới khi production
        // 'debug_code' => $reset_code
    ]);
    
} catch (Exception $e) {
    error_log("Send reset code error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Có lỗi xảy ra. Vui lòng thử lại sau.'
    ]);
}
