<?php
/**
 * CÁC HÀM TIỆN ÍCH
 * Các hàm PHP dùng chung trong toàn bộ project
 */

// ========================================
// HÀM XỬ LÝ CHUỖI & VALIDATION
// ========================================

/**
 * Làm sạch dữ liệu input từ user
 */
function clean_input($data) {
    if (is_array($data)) {
        return array_map('clean_input', $data);
    }
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
    return $data;
}

/**
 * Validate email
 */
function validate_email($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL);
}

/**
 * Validate password (tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt)
 */
function validate_password($password) {
    // Kiểm tra độ dài
    if (strlen($password) < MIN_PASSWORD_LENGTH || strlen($password) > MAX_PASSWORD_LENGTH) {
        return false;
    }
    
    // Kiểm tra có chữ hoa
    if (!preg_match('/[A-Z]/', $password)) {
        return false;
    }
    
    // Kiểm tra có chữ thường
    if (!preg_match('/[a-z]/', $password)) {
        return false;
    }
    
    // Kiểm tra có số
    if (!preg_match('/[0-9]/', $password)) {
        return false;
    }
    
    // Kiểm tra có ký tự đặc biệt
    if (!preg_match('/[!@#$%^&*(),.?":{}|<>]/', $password)) {
        return false;
    }
    
    return true;
}

/**
 * Validate username (3-50 ký tự)
 */
function validate_username($username) {
    return strlen($username) >= MIN_USERNAME_LENGTH && strlen($username) <= MAX_USERNAME_LENGTH;
}

// ========================================
// HÀM MÃ HÓA & BẢO MẬT
// ========================================

/**
 * Hash password sử dụng bcrypt
 */
function hash_password($password) {
    return password_hash($password, PASSWORD_BCRYPT);
}

/**
 * Verify password
 */
function verify_password($password, $hash) {
    return password_verify($password, $hash);
}

/**
 * Tạo token ngẫu nhiên
 */
function generate_token($length = 32) {
    return bin2hex(random_bytes($length));
}

// ========================================
// HÀM KIỂM TRA ĐĂNG NHẬP & QUYỀN
// ========================================

/**
 * Kiểm tra user đã đăng nhập chưa
 */
function is_logged_in() {
    return isset($_SESSION['user_id']) && !empty($_SESSION['user_id']);
}

/**
 * Kiểm tra user có phải admin không
 */
function is_admin() {
    return is_logged_in() && isset($_SESSION['role']) && $_SESSION['role'] === ROLE_ADMIN;
}

/**
 * Kiểm tra user có phải user thường không
 */
function is_user() {
    return is_logged_in() && isset($_SESSION['role']) && $_SESSION['role'] === ROLE_USER;
}

/**
 * Yêu cầu đăng nhập (redirect nếu chưa login)
 */
function require_login() {
    if (!is_logged_in()) {
        set_message('Vui lòng đăng nhập để tiếp tục!', MSG_WARNING);
        redirect('/VOCAB/pages/dangnhap.html');
    }
}

/**
 * Yêu cầu quyền admin
 */
function require_admin() {
    require_login();
    if (!is_admin()) {
        set_message('Bạn không có quyền truy cập trang này!', MSG_ERROR);
        redirect('/VOCAB/pages/user/user_Dashboard.html');
    }
}

/**
 * Yêu cầu quyền user
 */
function require_user() {
    require_login();
    if (!is_user()) {
        set_message('Bạn không có quyền truy cập trang này!', MSG_ERROR);
        redirect('/VOCAB/index.html');
    }
}

/**
 * API Authentication - Kiểm tra session và trả về user_id
 * Dùng cho API endpoints để đảm bảo user đã đăng nhập
 * @return int User ID nếu đăng nhập thành công
 * @throws Exception nếu chưa đăng nhập
 */
function api_require_login() {
    // Khởi động session nếu chưa có
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    // Kiểm tra session
    if (!is_logged_in()) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'Unauthorized',
            'message' => 'Vui lòng đăng nhập để tiếp tục'
        ]);
        exit();
    }
    
    return intval($_SESSION['user_id']);
}

/**
 * API Authentication cho Admin - Kiểm tra quyền admin
 * @return int Admin User ID nếu có quyền
 * @throws Exception nếu không phải admin
 */
function api_require_admin() {
    $user_id = api_require_login();
    
    if (!is_admin()) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => 'Forbidden',
            'message' => 'Bạn không có quyền truy cập API này'
        ]);
        exit();
    }
    
    return $user_id;
}

/**
 * API Verify User ID - Đảm bảo user chỉ truy cập dữ liệu của chính mình
 * @param int $requested_user_id User ID được yêu cầu từ request
 * @return int User ID đã được verify
 */
function api_verify_user_id($requested_user_id = null) {
    $session_user_id = api_require_login();
    
    // Nếu là admin, cho phép truy cập dữ liệu của bất kỳ user nào
    if (is_admin()) {
        return $requested_user_id ? intval($requested_user_id) : $session_user_id;
    }
    
    // Nếu là user thường, chỉ cho phép truy cập dữ liệu của chính mình
    // Bỏ qua tham số user_id từ request, luôn dùng session
    return $session_user_id;
}

// ========================================
// HÀM XỬ LÝ SESSION & MESSAGE
// ========================================

/**
 * Set thông báo flash message
 */
function set_message($message, $type = MSG_INFO) {
    $_SESSION['flash_message'] = [
        'message' => $message,
        'type' => $type
    ];
}

/**
 * Get và xóa flash message
 */
function get_message() {
    if (isset($_SESSION['flash_message'])) {
        $message = $_SESSION['flash_message'];
        unset($_SESSION['flash_message']);
        return $message;
    }
    return null;
}

/**
 * Hiển thị flash message dưới dạng HTML
 */
function display_message() {
    $message = get_message();
    if ($message) {
        $type = $message['type'];
        $text = $message['message'];
        
        $class_map = [
            MSG_SUCCESS => 'alert-success',
            MSG_ERROR => 'alert-danger',
            MSG_WARNING => 'alert-warning',
            MSG_INFO => 'alert-info'
        ];
        
        $class = $class_map[$type] ?? 'alert-info';
        
        echo '<div class="alert ' . $class . ' alert-dismissible fade show" role="alert">';
        echo htmlspecialchars($text);
        echo '<button type="button" class="btn-close" data-bs-dismiss="alert"></button>';
        echo '</div>';
    }
}

// ========================================
// HÀM CHUYỂN HƯỚNG
// ========================================

/**
 * Redirect đến URL
 */
function redirect($url) {
    if (!headers_sent()) {
        header("Location: " . $url);
        exit;
    } else {
        echo '<script>window.location.href="' . $url . '";</script>';
        exit;
    }
}

/**
 * Redirect về trang trước
 */
function redirect_back() {
    $referer = $_SERVER['HTTP_REFERER'] ?? '/VOCAB/index.html';
    redirect($referer);
}

// ========================================
// HÀM XỬ LÝ DATABASE
// ========================================

/**
 * Escape string cho MySQL
 */
function db_escape($conn, $string) {
    return $conn->real_escape_string($string);
}

/**
 * Kiểm tra email đã tồn tại chưa
 */
function email_exists($conn, $email) {
    $stmt = $conn->prepare("SELECT user_id FROM user WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    return $result->num_rows > 0;
}

/**
 * Lấy thông tin user theo ID
 */
function get_user_by_id($conn, $user_id) {
    $stmt = $conn->prepare("SELECT * FROM user WHERE user_id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    return $result->fetch_assoc();
}

/**
 * Lấy thông tin user theo email
 */
function get_user_by_email($conn, $email) {
    $stmt = $conn->prepare("SELECT * FROM user WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    return $result->fetch_assoc();
}

// ========================================
// HÀM XỬ LÝ NGÀY THÁNG
// ========================================

/**
 * Format ngày tháng
 */
function format_date($date, $format = DATE_FORMAT) {
    return date($format, strtotime($date));
}

/**
 * Format datetime
 */
function format_datetime($datetime, $format = DATETIME_FORMAT) {
    return date($format, strtotime($datetime));
}

/**
 * Tính khoảng cách thời gian (time ago)
 */
function time_ago($datetime) {
    $timestamp = strtotime($datetime);
    $diff = time() - $timestamp;
    
    if ($diff < 60) return 'vừa xong';
    if ($diff < 3600) return floor($diff / 60) . ' phút trước';
    if ($diff < 86400) return floor($diff / 3600) . ' giờ trước';
    if ($diff < 604800) return floor($diff / 86400) . ' ngày trước';
    if ($diff < 2592000) return floor($diff / 604800) . ' tuần trước';
    if ($diff < 31536000) return floor($diff / 2592000) . ' tháng trước';
    return floor($diff / 31536000) . ' năm trước';
}

// ========================================
// HÀM XỬ LÝ FILE UPLOAD
// ========================================

/**
 * Upload file hình ảnh
 */
function upload_image($file, $target_dir = 'uploads/images/') {
    if (!isset($file) || $file['error'] !== UPLOAD_ERR_OK) {
        return ['success' => false, 'message' => 'Lỗi upload file'];
    }
    
    // Kiểm tra loại file
    $allowed_types = ALLOWED_IMAGE_TYPES;
    if (!in_array($file['type'], $allowed_types)) {
        return ['success' => false, 'message' => 'Chỉ chấp nhận file ảnh (JPEG, PNG, GIF, WEBP)'];
    }
    
    // Kiểm tra kích thước
    if ($file['size'] > MAX_IMAGE_SIZE) {
        return ['success' => false, 'message' => 'File quá lớn (tối đa 2MB)'];
    }
    
    // Tạo tên file unique
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = uniqid() . '_' . time() . '.' . $extension;
    $target_path = ROOT_PATH . '/' . $target_dir . $filename;
    
    // Tạo thư mục nếu chưa có
    if (!file_exists(dirname($target_path))) {
        mkdir(dirname($target_path), 0777, true);
    }
    
    // Move file
    if (move_uploaded_file($file['tmp_name'], $target_path)) {
        return ['success' => true, 'filename' => $filename, 'path' => $target_dir . $filename];
    }
    
    return ['success' => false, 'message' => 'Lỗi khi lưu file'];
}

// ========================================
// HÀM JSON RESPONSE (cho API)
// ========================================

/**
 * Trả về JSON response
 */
function json_response($data, $status_code = 200) {
    http_response_code($status_code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Trả về success response
 */
function json_success($message, $data = null) {
    $response = ['success' => true, 'message' => $message];
    if ($data !== null) {
        $response['data'] = $data;
    }
    json_response($response);
}

/**
 * Trả về error response
 */
function json_error($message, $code = 400) {
    json_response(['success' => false, 'message' => $message], $code);
}

// ========================================
// HÀM GHI LOG
// ========================================

/**
 * Ghi log lỗi vào file
 */
function log_error($message, $file = null) {
    if ($file === null) {
        $file = LOG_PATH . '/error_' . date('Y-m-d') . '.log';
    }
    
    $timestamp = date('Y-m-d H:i:s');
    $log_message = "[{$timestamp}] {$message}\n";
    
    if (!file_exists(LOG_PATH)) {
        mkdir(LOG_PATH, 0777, true);
    }
    
    file_put_contents($file, $log_message, FILE_APPEND);
}

/**
 * Ghi log hoạt động admin
 */
function log_admin_action($conn, $admin_id, $action, $details = '') {
    $stmt = $conn->prepare("INSERT INTO admin_log (admin_id, action, details) VALUES (?, ?, ?)");
    $stmt->bind_param("iss", $admin_id, $action, $details);
    return $stmt->execute();
}

// ========================================
// HÀM PHÂN TRANG
// ========================================

/**
 * Tính tổng số trang
 */
function get_total_pages($total_items, $items_per_page = ITEMS_PER_PAGE) {
    return ceil($total_items / $items_per_page);
}

/**
 * Lấy offset cho query
 */
function get_offset($page, $items_per_page = ITEMS_PER_PAGE) {
    return ($page - 1) * $items_per_page;
}

/**
 * Hiển thị pagination HTML
 */
function display_pagination($current_page, $total_pages, $url) {
    if ($total_pages <= 1) return;
    
    echo '<nav><ul class="pagination">';
    
    // Previous
    if ($current_page > 1) {
        echo '<li class="page-item"><a class="page-link" href="' . $url . '?page=' . ($current_page - 1) . '">«</a></li>';
    }
    
    // Pages
    for ($i = 1; $i <= $total_pages; $i++) {
        $active = ($i == $current_page) ? 'active' : '';
        echo '<li class="page-item ' . $active . '"><a class="page-link" href="' . $url . '?page=' . $i . '">' . $i . '</a></li>';
    }
    
    // Next
    if ($current_page < $total_pages) {
        echo '<li class="page-item"><a class="page-link" href="' . $url . '?page=' . ($current_page + 1) . '">»</a></li>';
    }
    
    echo '</ul></nav>';
}

?>
