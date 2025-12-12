<?php
/**
 * TRANG ĐĂNG KÝ
 * Form đăng ký tài khoản mới
 */
require_once __DIR__ . '/../config/config.php';

// Nếu đã đăng nhập, redirect
if (is_logged_in()) {
    if (is_admin()) {
        redirect('/VOCAB/pages/admin/trangchu_admin.html');
    } else {
        redirect('/VOCAB/pages/user/user_Dashboard.html');
    }
}

// Lấy lỗi và dữ liệu cũ nếu có
$errors = $_SESSION['register_errors'] ?? [];
$old_data = $_SESSION['register_data'] ?? [];
$name = $old_data['name'] ?? '';
$email = $old_data['email'] ?? '';

// Xóa session sau khi hiển thị
unset($_SESSION['register_errors']);
unset($_SESSION['register_data']);
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
    <title>Đăng ký - VOCAB</title>
    <style>
        .alert { padding: 12px; margin-bottom: 15px; border-radius: 5px; }
        .alert-danger { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
    </style>
</head>
<body>
    <div id="header_index"></div>
    <div id="content">
        <div class="login-container">
            <h2>Đăng ký</h2>
            <p>Hãy tạo tài khoản của bạn để bắt đầu hành trình học tập.</p>

            <?php if (!empty($errors)): ?>
                <div class="alert alert-danger">
                    <?php foreach ($errors as $error): ?>
                        <div>⚠️ <?php echo htmlspecialchars($error); ?></div>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>

            <form method="POST" action="/VOCAB/process/register-process.php">
                <div class="input-group">
                    <div class="name">
                        <label for="name">Tên đầy đủ</label>
                        <input type="text" id="name" name="name" placeholder="Nhập tên của bạn" value="<?php echo htmlspecialchars($name); ?>" required>
                    </div>
                    <div class="email">
                        <label for="email">Email</label>
                        <input type="email" id="email" name="email" placeholder="Nhập email của bạn" value="<?php echo htmlspecialchars($email); ?>" required>
                    </div>
                    <div class="password">
                        <label for="password">Mật khẩu</label>
                        <input type="password" id="password" name="password" placeholder="Nhập mật khẩu của bạn" required>
                    </div>
                    <div class="confirm-password">
                        <label for="confirm-password">Xác nhận mật khẩu</label>
                        <input type="password" id="confirm-password" name="confirm_password" placeholder="Xác nhận mật khẩu của bạn" required>
                    </div>
                </div>
                <div class="terms">
                    <input type="checkbox" id="terms-checkbox" name="terms_accepted" required>
                    <label for="terms-checkbox">Tôi đồng ý với <a href="#">Điều khoản dịch vụ</a> và <a href="#">Chính sách bảo mật</a></label>
                </div>
                <button type="submit" class="login-button">Đăng ký</button>
            </form>

            <p class="signup-link">Đã có tài khoản? <a href="login.php">Đăng nhập ngay</a></p>
        </div>
    </div>
    <div id="footer"></div>
    <script src="../assets/js/defaut/include-layout.js" defer></script>
</body>
</html>
