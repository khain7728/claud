<?php
/**
 * GOOGLE CALLBACK - XỬ LÝ SAU KHI ĐĂNG NHẬP
 * Nhận code từ Google, đổi lấy access token, lấy thông tin user
 */
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/oauth.php';

// Kiểm tra state để chống CSRF
if (!isset($_GET['state']) || $_GET['state'] !== $_SESSION['google_state']) {
    unset($_SESSION['google_state']);
    set_message('Lỗi bảo mật. Vui lòng thử lại.', MSG_ERROR);
    redirect('/pages/dangnhap.html');
}

unset($_SESSION['google_state']);

// Kiểm tra có code không
if (!isset($_GET['code'])) {
    set_message('Đăng nhập Google thất bại.', MSG_ERROR);
    redirect('/pages/dangnhap.html');
}

$code = $_GET['code'];

try {
    // ========================================
    // BƯỚC 1: ĐỔI CODE LẤY ACCESS TOKEN
    // ========================================
    $token_url = 'https://oauth2.googleapis.com/token';
    
    $post_data = [
        'code' => $code,
        'client_id' => GOOGLE_CLIENT_ID,
        'client_secret' => GOOGLE_CLIENT_SECRET,
        'redirect_uri' => GOOGLE_REDIRECT_URI,
        'grant_type' => 'authorization_code'
    ];

    $ch = curl_init($token_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($post_data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded']);
    
    $response = curl_exec($ch);
    curl_close($ch);

    $token_data = json_decode($response, true);

    if (!isset($token_data['access_token'])) {
        throw new Exception('Không lấy được access token từ Google.');
    }

    $access_token = $token_data['access_token'];

    // ========================================
    // BƯỚC 2: LẤY THÔNG TIN USER TỪ GOOGLE
    // ========================================
    $user_info_url = 'https://www.googleapis.com/oauth2/v2/userinfo?access_token=' . $access_token;

    // Dùng CURL thay vì file_get_contents để tránh lỗi timeout
    $ch = curl_init($user_info_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    
    $user_response = curl_exec($ch);
    $curl_errno = curl_errno($ch);
    $curl_error = curl_error($ch);
    curl_close($ch);
    
    if ($curl_errno) {
        throw new Exception('Lỗi kết nối Google API: ' . $curl_error);
    }
    
    $google_user = json_decode($user_response, true);

    if (!isset($google_user['id'])) {
        throw new Exception('Không lấy được thông tin user từ Google.');
    }

    // ========================================
    // BƯỚC 3: KIỂM TRA USER ĐÃ TỒN TẠI CHƯA
    // ========================================
    global $conn;

    // Kiểm tra theo oauth_uid (Google ID)
    $stmt = $conn->prepare("SELECT * FROM user WHERE oauth_provider = 'google' AND oauth_uid = ?");
    $stmt->bind_param("s", $google_user['id']);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        // User đã tồn tại - Đăng nhập
        $user = $result->fetch_assoc();
        
        // Cập nhật access token
        $update_stmt = $conn->prepare("UPDATE user SET oauth_access_token = ? WHERE user_id = ?");
        $update_stmt->bind_param("si", $access_token, $user['user_id']);
        $update_stmt->execute();
        
    } else {
        // User mới - Tạo tài khoản
        $email = $google_user['email'];
        $name = $google_user['name'];
        $avatar = $google_user['picture'] ?? null;
        
        // Kiểm tra email đã tồn tại chưa (từ đăng ký thường)
        $email_check = $conn->prepare("SELECT user_id FROM user WHERE email = ?");
        $email_check->bind_param("s", $email);
        $email_check->execute();
        $email_result = $email_check->get_result();
        
        if ($email_result->num_rows > 0) {
            // Email đã tồn tại - Link với tài khoản hiện tại
            $existing_user = $email_result->fetch_assoc();
            $update_stmt = $conn->prepare("UPDATE user SET oauth_provider = 'google', oauth_uid = ?, oauth_access_token = ?, avatar = ? WHERE user_id = ?");
            $update_stmt->bind_param("sssi", $google_user['id'], $access_token, $avatar, $existing_user['user_id']);
            $update_stmt->execute();
            
            $user_id = $existing_user['user_id'];
        } else {
            // Tạo user mới
            $insert_stmt = $conn->prepare("INSERT INTO user (name, email, password, avatar, oauth_provider, oauth_uid, oauth_access_token, role, status, email_verified, created_at) VALUES (?, ?, NULL, ?, 'google', ?, ?, 'user', 1, 1, NOW())");
            $insert_stmt->bind_param("sssss", $name, $email, $avatar, $google_user['id'], $access_token);
            $insert_stmt->execute();
            
            $user_id = $conn->insert_id;
        }
        
        // Lấy thông tin user vừa tạo
        $stmt = $conn->prepare("SELECT * FROM user WHERE user_id = ?");
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $user = $result->fetch_assoc();
    }

    // ========================================
    // BƯỚC 4: TẠO SESSION (sử dụng tên session chuẩn giống login-process.php)
    // ========================================
    $_SESSION['user_id'] = $user['user_id'];
    $_SESSION['name'] = $user['name'];
    $_SESSION['email'] = $user['email'];
    $_SESSION['role'] = $user['role'];
    $_SESSION['avatar'] = $user['avatar'];
    $_SESSION['logged_in'] = true;

    // ========================================
    // BƯỚC 5: REDIRECT THEO ROLE
    // ========================================
    if ($user['role'] === 'admin') {
        redirect('/pages/admin/trangchu_admin.html');
    } else {
        redirect('/pages/user/user_Dashboard.html');
    }

} catch (Exception $e) {
    error_log("Google login error: " . $e->getMessage());
    set_message('Đăng nhập Google thất bại: ' . $e->getMessage(), MSG_ERROR);
    redirect('/pages/dangnhap.html');
}
