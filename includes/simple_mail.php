<?php
/**
 * SIMPLE MAIL FOR INFINITYFREE
 * Sử dụng mail() function thay vì SMTP
 */

function sendSimpleEmail($to, $subject, $body, $toName = '') {
    // Headers
    $headers = "From: noreply@vocab.infinityfreeapp.com\r\n";
    $headers .= "Reply-To: noreply@vocab.infinityfreeapp.com\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
    
    // Send email
    $success = mail($to, $subject, $body, $headers);
    
    if ($success) {
        return ['success' => true, 'message' => 'Email sent successfully'];
    } else {
        return ['success' => false, 'message' => 'Failed to send email'];
    }
}

function sendVerificationEmail($email, $name, $code) {
    $subject = 'Xác thực tài khoản VOCAB';
    $body = "Xin chào $name,\n\n";
    $body .= "Cảm ơn bạn đã đăng ký tài khoản VOCAB!\n\n";
    $body .= "Mã xác thực email của bạn là: $code\n\n";
    $body .= "Mã này sẽ hết hạn sau 30 phút.\n\n";
    $body .= "Trân trọng,\nVOCAB Team";
    
    return sendSimpleEmail($email, $subject, $body, $name);
}

function sendResetPasswordEmail($email, $name, $code) {
    $subject = 'Mã đặt lại mật khẩu VOCAB';
    $body = "Xin chào $name,\n\n";
    $body .= "Bạn đã yêu cầu đặt lại mật khẩu.\n\n";
    $body .= "Mã xác thực của bạn là: $code\n\n";
    $body .= "Mã này sẽ hết hạn sau 15 phút.\n\n";
    $body .= "Trân trọng,\nVOCAB Team";
    
    return sendSimpleEmail($email, $subject, $body, $name);
}
?>