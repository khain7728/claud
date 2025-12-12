<?php
/**
 * API: VERIFY MÃ CODE ĐẶT LẠI MẬT KHẨU
 * Kiểm tra code có đúng và chưa hết hạn không
 */
header('Content-Type: application/json');
require_once __DIR__ . '/../config/config.php';

// Chỉ cho phép POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request method']);
    exit;
}

// Lấy dữ liệu từ request
$input = json_decode(file_get_contents('php://input'), true);
$email = trim($input['email'] ?? '');
$code = trim($input['code'] ?? '');

// Validate
if (empty($email) || empty($code)) {
    echo json_encode(['success' => false, 'message' => 'Vui lòng nhập đầy đủ thông tin.']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['success' => false, 'message' => 'Email không hợp lệ.']);
    exit;
}

if (strlen($code) !== 6 || !ctype_digit($code)) {
    echo json_encode(['success' => false, 'message' => 'Mã code phải là 6 chữ số.']);
    exit;
}

try {
    global $conn;
    
    // Kiểm tra email và code
    $stmt = $conn->prepare("SELECT user_id, name, reset_code_expire FROM user WHERE email = ? AND reset_code = ?");
    $stmt->bind_param("ss", $email, $code);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        echo json_encode([
            'success' => false,
            'message' => 'Mã code không chính xác.'
        ]);
        exit;
    }
    
    $user = $result->fetch_assoc();
    $stmt->close();
    
    // Kiểm tra code có hết hạn không
    if (strtotime($user['reset_code_expire']) < time()) {
        echo json_encode([
            'success' => false,
            'message' => 'Mã code đã hết hạn. Vui lòng yêu cầu lại.'
        ]);
        exit;
    }
    
    // Code hợp lệ - lưu thông tin vào session để dùng cho bước đổi password
    $_SESSION['verified_reset'] = [
        'email' => $email,
        'user_id' => $user['user_id'],
        'code' => $code,
        'verified_at' => time()
    ];
    
    // Ghi log
    $log_message = sprintf(
        "[%s] Code verified successfully for %s (%s)\n",
        date('Y-m-d H:i:s'),
        $user['name'],
        $email
    );
    file_put_contents(__DIR__ . '/../logs/password_reset.log', $log_message, FILE_APPEND);
    
    echo json_encode([
        'success' => true,
        'message' => 'Xác thực thành công. Bạn có thể đặt lại mật khẩu.'
    ]);
    
} catch (Exception $e) {
    error_log("Verify code error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Có lỗi xảy ra. Vui lòng thử lại sau.'
    ]);
}
