<?php
/**
 * XỬ LÝ ĐĂNG NHẬP
 * Backend xử lý form đăng nhập
 */

// Load config
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../includes/rate_limiter.php';

// Rate limiting - Chống brute force
checkLoginRateLimit();

// Chỉ chấp nhận POST request
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    set_message('Phương thức không hợp lệ!', MSG_ERROR);
    redirect('/VOCAB/pages/dangnhap.html');
}

// Lấy dữ liệu từ form
$email = clean_input($_POST['email'] ?? '');
$password = $_POST['password'] ?? '';
$remember_me = isset($_POST['remember_me']) ? true : false;

// Biến lưu lỗi
$errors = [];

// Validate dữ liệu
if (empty($email)) {
    $errors[] = 'Vui lòng nhập email!';
} elseif (!validate_email($email)) {
    $errors[] = 'Email không hợp lệ!';
}

if (empty($password)) {
    $errors[] = 'Vui lòng nhập mật khẩu!';
}

// Nếu có lỗi, quay lại form
if (!empty($errors)) {
    $_SESSION['login_errors'] = $errors;
    $_SESSION['login_email'] = $email;
    redirect('/VOCAB/pages/dangnhap.html');
}

// Kiểm tra thông tin đăng nhập
try {
    // Lấy thêm cột email_verified
    $stmt = $conn->prepare("SELECT user_id, name, email, password, role, status, email_verified FROM user WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    $stmt->close();
    
    // Nếu email không tồn tại trong hệ thống
    if (!$user) {
        // Lưu email để điền vào form đăng ký
        $_SESSION['register_email'] = $email;
        
        // Trả về JSON thay vì redirect
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'error_type' => 'email_not_found',
            'message' => 'Email "' . $email . '" chưa có trong hệ thống.',
            'email' => $email
        ]);
        exit;
    }
    
    // Kiểm tra password
    if (!verify_password($password, $user['password'])) {
        set_message('Mật khẩu không chính xác! Vui lòng thử lại.', MSG_ERROR);
        $_SESSION['login_email'] = $email;
        redirect('/VOCAB/pages/dangnhap.html');
    }
    
    // Kiểm tra trạng thái tài khoản
    if ($user['status'] != STATUS_ACTIVE) {
        set_message('Tài khoản của bạn đã bị vô hiệu hóa!', MSG_ERROR);
        redirect('/VOCAB/pages/dangnhap.html');
    }
    
    // Kiểm tra email đã được xác thực chưa
    if ($user['email_verified'] == 0) {
        // Lưu thông tin vào session để gửi lại mã
        $_SESSION['pending_verification'] = [
            'user_id' => $user['user_id'],
            'email' => $user['email'],
            'name' => $user['name']
        ];
        set_message('Email của bạn chưa được xác thực. Vui lòng kiểm tra email để lấy mã xác thực.', MSG_WARNING);
        redirect('/VOCAB/auth/verify-email.php');
    }
    
    // Đăng nhập thành công - Lưu thông tin vào session
    $_SESSION['user_id'] = $user['user_id'];
    $_SESSION['name'] = $user['name'];
    $_SESSION['email'] = $user['email'];
    $_SESSION['role'] = $user['role'];
    $_SESSION['avatar'] = $user['avatar'];
    
    // Xóa session lỗi cũ
    unset($_SESSION['login_errors']);
    unset($_SESSION['login_email']);
    
    // Set cookie nếu chọn "Remember me"
    if ($remember_me) {
        setcookie('user_id', $user['user_id'], time() + REMEMBER_ME_LIFETIME, '/');
        setcookie('user_token', generate_token(), time() + REMEMBER_ME_LIFETIME, '/');
    }
    
    // Redirect theo role
    if ($user['role'] === ROLE_ADMIN) {
        set_message('Chào mừng Admin ' . $user['name'] . '!', MSG_SUCCESS);
        redirect('/VOCAB/pages/admin/trangchu_admin.html');
    } else {
        set_message('Đăng nhập thành công! Chào mừng ' . $user['name'] . '!', MSG_SUCCESS);
        redirect('/VOCAB/pages/user/user_Dashboard.html');
    }
    
} catch (Exception $e) {
    log_error($e->getMessage());
    set_message('Có lỗi xảy ra khi đăng nhập. Vui lòng thử lại!', MSG_ERROR);
    redirect('/VOCAB/pages/dangnhap.html');
}

?>
