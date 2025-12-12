<?php
/**
 * TRANG XÁC THỰC EMAIL
 * Người dùng nhập mã 6 số nhận được qua email
 */
require_once __DIR__ . '/../config/config.php';

// Kiểm tra đã có thông tin pending verification chưa
if (!isset($_SESSION['pending_verification'])) {
    set_message('Không tìm thấy thông tin xác thực. Vui lòng đăng ký lại.', MSG_ERROR);
    redirect('/VOCAB/pages/dangki.html');
}

$pending = $_SESSION['pending_verification'];
$message = get_message();
$debug_code = $_SESSION['verification_code_debug'] ?? null;
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="../assets/css/defaut/index.css">
    <link rel="stylesheet" href="../assets/css/defaut/body.css">
    <link rel="stylesheet" href="../assets/css/defaut/dangnhap.css">
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
    <title>Xác thực Email - VOCAB</title>
    <style>
        .verification-container {
            max-width: 500px;
            margin: 0 auto;
        }
        .alert {
            padding: 12px 15px;
            margin: 15px 0;
            border-radius: 5px;
            text-align: left;
            font-size: 14px;
        }
        .alert-success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .alert-danger {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .alert-info {
            background: #d1ecf1;
            color: #0c5460;
            border: 1px solid #bee5eb;
        }
        .code-input {
            text-align: center;
            font-size: 24px;
            font-weight: 600;
            letter-spacing: 8px;
            padding: 15px;
        }
        .resend-link {
            display: inline-block;
            margin-top: 15px;
            color: #007bff;
            text-decoration: none;
            font-size: 14px;
        }
        .resend-link:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div id="header_index"></div>
    
    <div id="content">
        <div class="login-container verification-container">
            <h2>Xác thực Email</h2>
            <p>Mã xác thực đã được gửi đến email: <strong><?php echo htmlspecialchars($pending['email']); ?></strong></p>
            <p style="font-size: 14px; color: #666;">Vui lòng nhập mã 6 số để xác thực tài khoản của bạn.</p>

            <?php if ($message): ?>
                <div class="alert alert-<?php echo $message['type'] === MSG_SUCCESS ? 'success' : ($message['type'] === MSG_ERROR ? 'danger' : 'info'); ?>">
                    <?php echo htmlspecialchars($message['message']); ?>
                </div>
            <?php endif; ?>

            <?php /* DEBUG: Ẩn mã xác thực 
            if ($debug_code): ?>
                <div class="alert alert-info">
                    <strong>Mã xác thực (chỉ hiển thị khi testing):</strong> <?php echo $debug_code; ?>
                    <br><small>XÓA DÒNG NÀY KHI PRODUCTION</small>
                </div>
            <?php endif;
            */ ?>

            <form method="POST" action="../process/verify-email-process.php">
                <div class="input-group">
                    <label for="verification_code">Mã xác thực</label>
                    <input type="text" 
                           id="verification_code" 
                           name="verification_code" 
                           class="code-input"
                           placeholder="000000" 
                           maxlength="6" 
                           pattern="[0-9]{6}"
                           required 
                           autofocus>
                    <small style="display: block; text-align: center; color: #666; margin-top: 8px;">
                        Mã xác thực có hiệu lực trong 30 phút
                    </small>
                </div>
                
                <button type="submit" class="login-button">Xác thực</button>
            </form>

            <div style="text-align: center;">
                <a href="/VOCAB/process/resend-verification-code.php" class="resend-link">Gửi lại mã xác thực</a>
                <br>
                <a href="/VOCAB/pages/dangki.html" class="resend-link">← Quay lại đăng ký</a>
            </div>
        </div>
    </div>

    <div id="footer"></div>
    <script src="../assets/js/defaut/include-layout.js" defer></script>
    <script>
        // Chỉ cho phép nhập số
        document.getElementById('verification_code').addEventListener('input', function(e) {
            this.value = this.value.replace(/\D/g, '');
        });
    </script>
</body>
</html>
