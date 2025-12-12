<?php
/**
 * TRANG ĐĂNG NHẬP
 * Form đăng nhập cho người dùng
 */
require_once __DIR__ . '/../config/config.php';

// Nếu đã đăng nhập, redirect theo role
if (is_logged_in()) {
    if (is_admin()) {
        redirect('/VOCAB/pages/admin/trangchu_admin.html');
    } else {
        redirect('/VOCAB/pages/user/user_Dashboard.html');
    }
}

// Lấy lỗi nếu có
$errors = $_SESSION['login_errors'] ?? [];
$email = $_SESSION['login_email'] ?? '';

// Xóa session lỗi sau khi hiển thị
unset($_SESSION['login_errors']);
unset($_SESSION['login_email']);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="../assets/css/defaut/index.css">
    <link rel="stylesheet" href="../assets/css/defaut/body.css">
    <link rel="stylesheet" href="../assets/css/defaut/dangnhap.css">
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
    <title>Đăng nhập - VOCAB</title>
    <style>
        .alert { padding: 12px; margin-bottom: 15px; border-radius: 5px; }
        .alert-danger { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .alert-success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .alert-warning { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
        .btn-primary:hover { background: #0056b3 !important; }
    </style>
</head>
<body>
    <div id="header_index"></div>
    <div id="content">
        <div class="login-container">
            <h2>Đăng nhập</h2>
            <p>Chào mừng quay lại! Hãy đăng nhập vào tài khoản của bạn.</p>
            
            <?php if (get_message()): $msg = get_message(); ?>
                <?php 
                $alertClass = 'alert-danger';
                if ($msg['type'] === MSG_SUCCESS) {
                    $alertClass = 'alert-success';
                } elseif ($msg['type'] === MSG_WARNING) {
                    $alertClass = 'alert-warning';
                }
                
                // Kiểm tra nếu là thông báo email chưa đăng ký
                $isRegisterWarning = $msg['type'] === MSG_WARNING && strpos($msg['message'], 'chưa được đăng ký') !== false;
                ?>
                <div class="alert <?php echo $alertClass; ?>">
                    <?php echo htmlspecialchars($msg['message']); ?>
                    <?php if ($isRegisterWarning): ?>
                        <br><br>
                        <a href="register.php" class="btn btn-primary" style="display: inline-block; padding: 8px 16px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; font-size: 14px;">
                            Đăng ký ngay
                        </a>
                    <?php endif; ?>
                </div>
            <?php endif; ?>
            
            <?php if (!empty($errors)): ?>
                <div class="alert alert-danger">
                    <?php foreach ($errors as $error): ?>
                        <div>⚠️ <?php echo htmlspecialchars($error); ?></div>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>

            <form method="POST" action="/VOCAB/process/login-process.php">
                <div class="input-group">
                    <div class="email">
                        <label for="email">Email</label>
                        <input type="email" id="email" name="email" placeholder="Nhập email của bạn" value="<?php echo htmlspecialchars($email); ?>" required>
                    </div>
                    <div class="password">
                        <label for="password">Mật khẩu</label>
                        <input type="password" id="password" name="password" placeholder="Nhập mật khẩu của bạn" required>
                    </div>
                </div>
                <a href="forgot-password.php" style="color: black">Quên mật khẩu?</a>
                <button type="submit" class="login-button">Đăng nhập</button>
            </form>

            <p class="signup-link">Chưa có tài khoản? <a href="register.php">Đăng ký ngay</a></p>
        </div>
    </div>
    <div id="footer"></div>
    <script src="../assets/js/defaut/include-layout.js" defer></script>
</body>
</html>
