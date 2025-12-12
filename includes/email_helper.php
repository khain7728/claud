<?php
/**
 * EMAIL HELPER
 * Hàm gửi email qua Gmail SMTP
 */

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../config/email.php';

/**
 * Gửi email qua Gmail SMTP
 * 
 * @param string $to Email người nhận
 * @param string $subject Tiêu đề email
 * @param string $body Nội dung email (plain text hoặc HTML)
 * @param string $toName Tên người nhận (optional)
 * @param bool $isHTML Email có phải HTML không (default: false)
 * @return array ['success' => bool, 'message' => string]
 */
function sendEmail($to, $subject, $body, $toName = '', $isHTML = false) {
    $mail = new PHPMailer(true);
    
    try {
        // SMTP Configuration
        $mail->isSMTP();
        $mail->Host = SMTP_HOST;
        $mail->SMTPAuth = true;
        $mail->Username = SMTP_USERNAME;
        $mail->Password = SMTP_PASSWORD;
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = SMTP_PORT;
        $mail->CharSet = 'UTF-8';
        
        // Sender & Recipient
        $mail->setFrom(SMTP_FROM_EMAIL, SMTP_FROM_NAME);
        $mail->addAddress($to, $toName);
        
        // Content
        $mail->isHTML($isHTML);
        $mail->Subject = $subject;
        $mail->Body = $body;
        
        // Send
        $mail->send();
        
        // Log success (development only)
        if (APP_ENV === 'development') {
            $log = sprintf("[%s] Email sent to %s - Subject: %s\n", date('Y-m-d H:i:s'), $to, $subject);
            file_put_contents(__DIR__ . '/../logs/email_sent.log', $log, FILE_APPEND);
        }
        
        return ['success' => true, 'message' => 'Email đã được gửi thành công'];
        
    } catch (Exception $e) {
        // Log error
        $error = sprintf("[%s] Email failed to %s - Error: %s\n", date('Y-m-d H:i:s'), $to, $mail->ErrorInfo);
        file_put_contents(__DIR__ . '/../logs/email_error.log', $error, FILE_APPEND);
        
        return ['success' => false, 'message' => 'Không thể gửi email: ' . $mail->ErrorInfo];
    }
}

/**
 * Gửi email xác thực đăng ký
 */
function sendVerificationEmail($email, $name, $code) {
    $subject = 'Xác thực tài khoản VOCAB';
    $body = "Xin chào $name,\n\n";
    $body .= "Cảm ơn bạn đã đăng ký tài khoản VOCAB!\n\n";
    $body .= "Mã xác thực email của bạn là: $code\n\n";
    $body .= "Mã này sẽ hết hạn sau 30 phút.\n\n";
    $body .= "Trân trọng,\nVOCAB Team";
    
    return sendEmail($email, $subject, $body, $name);
}

/**
 * Gửi email reset password
 */
function sendResetPasswordEmail($email, $name, $code) {
    $subject = 'Mã đặt lại mật khẩu VOCAB';
    $body = "Xin chào $name,\n\n";
    $body .= "Bạn đã yêu cầu đặt lại mật khẩu.\n\n";
    $body .= "Mã xác thực của bạn là: $code\n\n";
    $body .= "Mã này sẽ hết hạn sau 15 phút.\n\n";
    $body .= "Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.\n\n";
    $body .= "Trân trọng,\nVOCAB Team";
    
    return sendEmail($email, $subject, $body, $name);
}

?>
