<?php
/**
 * XỬ LÝ ĐĂNG KÝ
 * Backend xử lý form đăng ký tài khoản mới
 */

// Load config
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../includes/rate_limiter.php';
require_once __DIR__ . '/../includes/notification_helper.php';

// TẠM TẮT rate limiting để test
// checkRegisterRateLimit();

// Chỉ chấp nhận POST request
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    set_message('Phương thức không hợp lệ!', MSG_ERROR);
    redirect('/VOCAB/pages/dangki.html');
}

// Lấy dữ liệu từ form
$name = clean_input($_POST['name'] ?? '');
$email = clean_input($_POST['email'] ?? '');
$password = $_POST['password'] ?? '';
$confirm_password = $_POST['confirm_password'] ?? '';
$terms_accepted = isset($_POST['terms_accepted']) ? true : false;

// Biến lưu lỗi
$errors = [];

// Validate dữ liệu
if (empty($name)) {
    $errors[] = 'Vui lòng nhập tên đầy đủ!';
} elseif (strlen($name) < 2) {
    $errors[] = 'Tên phải có ít nhất 2 ký tự!';
}

if (empty($email)) {
    $errors[] = 'Vui lòng nhập email!';
} elseif (!validate_email($email)) {
    $errors[] = 'Email không hợp lệ!';
} else {
    // Kiểm tra email đã tồn tại và trạng thái verify
    $stmt = $conn->prepare("SELECT user_id, email_verified FROM user WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    $existing_user = $result->fetch_assoc();
    
    if ($existing_user) {
        if ($existing_user['email_verified'] == 0) {
            // Email tồn tại nhưng chưa verify -> Xóa user cũ để cho phép đăng ký lại
            $deleteStmt = $conn->prepare("DELETE FROM user WHERE email = ? AND email_verified = 0");
            $deleteStmt->bind_param("s", $email);
            $deleteStmt->execute();
            $deleteStmt->close();
        } else {
            // Email đã verify -> Báo lỗi và chuyển đến đăng nhập
            $_SESSION['login_email'] = $email;
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'error_type' => 'email_exists',
                'message' => 'Email "' . $email . '" đã được đăng ký.',
                'email' => $email
            ]);
            exit;
        }
    }
    $stmt->close();
}

if (empty($password)) {
    $errors[] = 'Vui lòng nhập mật khẩu!';
} elseif (!validate_password($password)) {
    $errors[] = 'Mật khẩu phải có ít nhất ' . MIN_PASSWORD_LENGTH . ' ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt (!@#$%^&*...)!';
}

if ($password !== $confirm_password) {
    $errors[] = 'Mật khẩu xác nhận không khớp!';
}

if (!$terms_accepted) {
    $errors[] = 'Vui lòng đồng ý với Điều khoản dịch vụ và Chính sách bảo mật!';
}

// Nếu có lỗi, quay lại form
if (!empty($errors)) {
    $_SESSION['register_errors'] = $errors;
    $_SESSION['register_data'] = ['name' => $name, 'email' => $email];
    redirect('/VOCAB/pages/dangki.html');
}

// Hash password
$password_hash = hash_password($password);

// Tạo mã xác thực email (6 số) - dùng chung reset_code
$verification_code = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
$verification_expire = date('Y-m-d H:i:s', strtotime('+30 minutes')); // Hết hạn sau 30 phút

// Thêm user vào database (chưa xác thực email)
try {
    $stmt = $conn->prepare("INSERT INTO user (name, email, password, role, status, email_verified, reset_code, reset_code_expire) VALUES (?, ?, ?, ?, ?, 0, ?, ?)");
    $role = ROLE_USER;
    $status = STATUS_ACTIVE;
    $stmt->bind_param("sssssss", $name, $email, $password_hash, $role, $status, $verification_code, $verification_expire);
    
    if ($stmt->execute()) {
        $user_id = $conn->insert_id;
        
        // Lưu thông tin vào session để verify
        $_SESSION['pending_verification'] = [
            'user_id' => $user_id,
            'email' => $email,
            'name' => $name
        ];
        
        // Gửi email xác thực
        require_once __DIR__ . '/../includes/email_helper.php';
        $emailResult = sendVerificationEmail($email, $name, $verification_code);
        
        // Ghi log
        $log_message = sprintf(
            "[%s] Email verification to %s (%s). Code: %s, Status: %s\n",
            date('Y-m-d H:i:s'),
            $name,
            $email,
            $verification_code,
            $emailResult['success'] ? 'SUCCESS' : 'FAILED'
        );
        file_put_contents(__DIR__ . '/../logs/email_verification.log', $log_message, FILE_APPEND);
        
        // Debug mode: Hiển thị code trong session (development only)
        if (defined('APP_ENV') && APP_ENV === 'development') {
            $_SESSION['verification_code_debug'] = $verification_code;
        }
        
        // Tạo thông báo chào mừng user mới
        notifyWelcomeNewUser($conn, $conn->insert_id, $name);
        
        // Xóa session data cũ
        unset($_SESSION['register_errors']);
        unset($_SESSION['register_data']);
        
        // Redirect đến trang xác thực email
        redirect('/VOCAB/auth/verify-email.php');
    } else {
        throw new Exception('Lỗi khi tạo tài khoản: ' . $stmt->error);
    }
} catch (Exception $e) {
    log_error($e->getMessage());
    set_message('Có lỗi xảy ra khi đăng ký. Vui lòng thử lại!', MSG_ERROR);
    redirect('/VOCAB/pages/dangki.html');
}

?>
