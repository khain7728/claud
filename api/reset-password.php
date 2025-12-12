<?php
/**
 * API: ĐẶT LẠI MẬT KHẨU MỚI
 * Cập nhật password sau khi verify code thành công
 */
header('Content-Type: application/json');
require_once __DIR__ . '/../config/config.php';

// Chỉ cho phép POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request method']);
    exit;
}

// Kiểm tra đã verify code chưa
if (!isset($_SESSION['verified_reset'])) {
    echo json_encode([
        'success' => false,
        'message' => 'Phiên làm việc đã hết hạn. Vui lòng thực hiện lại từ đầu.'
    ]);
    exit;
}

// Kiểm tra session không quá 10 phút (bảo mật)
if (time() - $_SESSION['verified_reset']['verified_at'] > 600) {
    unset($_SESSION['verified_reset']);
    echo json_encode([
        'success' => false,
        'message' => 'Phiên làm việc đã hết hạn. Vui lòng thực hiện lại từ đầu.'
    ]);
    exit;
}

// Lấy dữ liệu từ request
$input = json_decode(file_get_contents('php://input'), true);
$password = $input['password'] ?? '';
$confirm_password = $input['confirm_password'] ?? '';

// Validate password
if (empty($password)) {
    echo json_encode(['success' => false, 'message' => 'Vui lòng nhập mật khẩu mới.']);
    exit;
}

if (strlen($password) < 8) {
    echo json_encode(['success' => false, 'message' => 'Mật khẩu phải có ít nhất 8 ký tự.']);
    exit;
}

// Kiểm tra password có chữ hoa, chữ thường, số
if (!preg_match('/[A-Z]/', $password) || !preg_match('/[a-z]/', $password) || !preg_match('/[0-9]/', $password)) {
    echo json_encode([
        'success' => false,
        'message' => 'Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số.'
    ]);
    exit;
}

// Validate confirm password
if ($password !== $confirm_password) {
    echo json_encode(['success' => false, 'message' => 'Mật khẩu xác nhận không khớp.']);
    exit;
}

try {
    global $conn;
    
    $verified = $_SESSION['verified_reset'];
    
    // Kiểm tra code vẫn còn hợp lệ trong database
    $stmt = $conn->prepare("SELECT email, name FROM user WHERE user_id = ? AND reset_code = ? AND reset_code_expire > NOW()");
    $stmt->bind_param("is", $verified['user_id'], $verified['code']);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        unset($_SESSION['verified_reset']);
        echo json_encode([
            'success' => false,
            'message' => 'Mã code đã hết hạn hoặc không hợp lệ. Vui lòng thực hiện lại.'
        ]);
        exit;
    }
    
    $user = $result->fetch_assoc();
    $stmt->close();
    
    // Hash mật khẩu mới
    $hashed_password = password_hash($password, PASSWORD_BCRYPT);
    
    // Cập nhật mật khẩu và xóa code
    $stmt = $conn->prepare("UPDATE user SET password = ?, reset_code = NULL, reset_code_expire = NULL WHERE user_id = ?");
    $stmt->bind_param("si", $hashed_password, $verified['user_id']);
    $stmt->execute();
    $stmt->close();
    
    // Ghi log
    $log_message = sprintf(
        "[%s] Password reset successfully for user_id: %d, email: %s\n",
        date('Y-m-d H:i:s'),
        $verified['user_id'],
        $user['email']
    );
    file_put_contents(__DIR__ . '/../logs/password_reset.log', $log_message, FILE_APPEND);
    
    // Xóa session verify
    unset($_SESSION['verified_reset']);
    
    // TODO: Gửi email thông báo đã đổi mật khẩu thành công
    /*
    $mail = new PHPMailer\PHPMailer\PHPMailer();
    $mail->setFrom('noreply@vocab.com', 'VOCAB System');
    $mail->addAddress($user['email'], $user['name']);
    $mail->Subject = 'Mật khẩu đã được thay đổi';
    $mail->Body = "Xin chào " . $user['name'] . ",\n\n";
    $mail->Body .= "Mật khẩu tài khoản của bạn đã được thay đổi thành công.\n\n";
    $mail->Body .= "Nếu bạn không thực hiện thay đổi này, vui lòng liên hệ ngay với chúng tôi.\n\n";
    $mail->Body .= "Trân trọng,\nVOCAB Team";
    $mail->send();
    */
    
    echo json_encode([
        'success' => true,
        'message' => 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập với mật khẩu mới.'
    ]);
    
} catch (Exception $e) {
    error_log("Reset password error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Có lỗi xảy ra. Vui lòng thử lại sau.'
    ]);
}
