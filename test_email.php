<?php
require_once __DIR__ . '/includes/email_helper.php';

$result = sendVerificationEmail('khain7728@gmail.com', 'Test User', '123456');

if ($result['success']) {
    echo "✅ Email sent successfully!";
} else {
    echo "❌ Email failed: " . $result['message'];
}
?>