<?php
/**
 * XỬ LÝ XÁC THỰC EMAIL
 * Verify mã 6 số và kích hoạt tài khoản
 */

require_once __DIR__ . '/../config/config.php';

// Chỉ chấp nhận POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    set_message('Phương thức không hợp lệ!', MSG_ERROR);
    redirect('/VOCAB/auth/verify-email.php');
}

// Kiểm tra có pending verification không
if (!isset($_SESSION['pending_verification'])) {
    set_message('Không tìm thấy thông tin xác thực. Vui lòng đăng ký lại.', MSG_ERROR);
    redirect('/VOCAB/pages/dangki.html');
}

$pending = $_SESSION['pending_verification'];
$verification_code = trim($_POST['verification_code'] ?? '');

// Validate
if (empty($verification_code)) {
    set_message('Vui lòng nhập mã xác thực!', MSG_ERROR);
    redirect('/VOCAB/auth/verify-email.php');
}

if (strlen($verification_code) !== 6 || !ctype_digit($verification_code)) {
    set_message('Mã xác thực phải là 6 chữ số!', MSG_ERROR);
    redirect('/VOCAB/auth/verify-email.php');
}

try {
    // Kiểm tra mã xác thực
    $stmt = $conn->prepare("SELECT user_id, name, reset_code_expire FROM user WHERE user_id = ? AND reset_code = ? AND email_verified = 0");
    $stmt->bind_param("is", $pending['user_id'], $verification_code);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        set_message('Mã xác thực không chính xác!', MSG_ERROR);
        redirect('/VOCAB/auth/verify-email.php');
    }
    
    $user = $result->fetch_assoc();
    $stmt->close();
    
    // Kiểm tra mã đã hết hạn chưa
    if (strtotime($user['reset_code_expire']) < time()) {
        set_message('Mã xác thực đã hết hạn! Vui lòng yêu cầu gửi lại.', MSG_ERROR);
        redirect('/VOCAB/auth/verify-email.php');
    }
    
    // Xác thực thành công - cập nhật database
    $stmt = $conn->prepare("UPDATE user SET email_verified = 1, reset_code = NULL, reset_code_expire = NULL WHERE user_id = ?");
    $stmt->bind_param("i", $pending['user_id']);
    $stmt->execute();
    $stmt->close();
    
    // Ghi log
    $log_message = sprintf(
        "[%s] Email verified successfully for user_id=%d, name=%s, email=%s\n",
        date('Y-m-d H:i:s'),
        $pending['user_id'],
        $user['name'],
        $pending['email']
    );
    file_put_contents(__DIR__ . '/../logs/email_verification.log', $log_message, FILE_APPEND);
    
    // Xóa session pending và debug code
    unset($_SESSION['pending_verification']);
    unset($_SESSION['verification_code_debug']);
    
    // Lưu email để tự động điền vào form đăng nhập
    $_SESSION['login_email'] = $pending['email'];
    
    // Thông báo thành công và yêu cầu đăng nhập
    set_message('Xác thực email thành công! Vui lòng đăng nhập để tiếp tục.', MSG_SUCCESS);
    redirect('/VOCAB/pages/dangnhap.html');
    
} catch (Exception $e) {
    log_error($e->getMessage());
    set_message('Có lỗi xảy ra. Vui lòng thử lại!', MSG_ERROR);
    redirect('/VOCAB/auth/verify-email.php');
}
?>
