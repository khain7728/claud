<?php
/**
 * GỬI LẠI MÃ XÁC THỰC EMAIL
 * Tạo mã mới và gửi lại cho user
 */

require_once __DIR__ . '/../config/config.php';

// Kiểm tra có pending verification không
if (!isset($_SESSION['pending_verification'])) {
    set_message('Không tìm thấy thông tin xác thực. Vui lòng đăng ký lại.', MSG_ERROR);
    redirect('/VOCAB/pages/dangki.html');
}

$pending = $_SESSION['pending_verification'];

try {
    // Kiểm tra user có tồn tại và chưa verify không
    $stmt = $conn->prepare("SELECT user_id FROM user WHERE user_id = ? AND email_verified = 0");
    $stmt->bind_param("i", $pending['user_id']);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        set_message('Không tìm thấy tài khoản hoặc đã được xác thực.', MSG_ERROR);
        redirect('/VOCAB/pages/dangki.html');
    }
    $stmt->close();
    
    // Tạo mã mới
    $new_code = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $new_expire = date('Y-m-d H:i:s', strtotime('+30 minutes'));
    
    // Cập nhật mã mới vào database
    $stmt = $conn->prepare("UPDATE user SET reset_code = ?, reset_code_expire = ? WHERE user_id = ?");
    $stmt->bind_param("ssi", $new_code, $new_expire, $pending['user_id']);
    $stmt->execute();
    $stmt->close();
    
    // Gửi email xác thực
    require_once __DIR__ . '/../includes/email_helper.php';
    $emailResult = sendVerificationEmail($pending['email'], $pending['name'], $new_code);
    
    // Ghi log
    $log_message = sprintf(
        "[%s] Resend verification to %s (%s). Code: %s, Status: %s\n",
        date('Y-m-d H:i:s'),
        $pending['name'],
        $pending['email'],
        $new_code,
        $emailResult['success'] ? 'SUCCESS' : 'FAILED'
    );
    file_put_contents(__DIR__ . '/../logs/email_verification.log', $log_message, FILE_APPEND);
    
    // Debug mode
    if (defined('APP_ENV') && APP_ENV === 'development') {
        $_SESSION['verification_code_debug'] = $new_code;
    }
    
    set_message('Mã xác thực mới đã được gửi đến email của bạn!', MSG_SUCCESS);
    redirect('/VOCAB/auth/verify-email.php');
    
} catch (Exception $e) {
    log_error($e->getMessage());
    set_message('Có lỗi xảy ra khi gửi lại mã. Vui lòng thử lại!', MSG_ERROR);
    redirect('/VOCAB/auth/verify-email.php');
}
?>
