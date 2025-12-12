<?php
// api/join-course.php
// --- CẤU HÌNH CORS ---
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}
// ---------------------

error_reporting(0);
ini_set('display_errors', 0);
header('Content-Type: application/json; charset=utf-8');
require_once '../config/config.php';
require_once '../includes/notification_helper.php';

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new Exception('Method Not Allowed');
    
    // ✅ BẢO MẬT: Lấy user_id từ session
    $user_id = api_require_login();
    
    // 1. Lấy dữ liệu từ Client (JSON)
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Lấy course_id từ input (KHÔNG nhận user_id từ client)
    $course_id = isset($input['course_id']) ? intval($input['course_id']) : 0;

    // Validate dữ liệu đầu vào
    if ($user_id <= 0 || $course_id <= 0) {
        throw new Exception('Dữ liệu không hợp lệ (Missing ID)');
    }

    // --- BƯỚC MỚI: KIỂM TRA KHÓA HỌC HỢP LỆ KHÔNG ---
    // Chỉ cho phép tham gia nếu khóa học Tồn tại + Public + Không bị ẩn
    $checkCourseSql = "SELECT create_by FROM course WHERE course_id = ? AND visibility = 'public' AND hide = 0";
    $stmtCourse = $conn->prepare($checkCourseSql);
    $stmtCourse->bind_param("i", $course_id);
    $stmtCourse->execute();
    $resCourse = $stmtCourse->get_result();

    if ($resCourse->num_rows === 0) {
        throw new Exception('Khóa học không tồn tại hoặc không công khai.');
    }
    
    // (Tùy chọn) Kiểm tra xem người tham gia có phải là người tạo khóa học không?
    // Nếu muốn chặn người tạo tự tham gia khóa học của mình thì bỏ comment dòng dưới:
    // $rowCourse = $resCourse->fetch_assoc();
    // if ($rowCourse['create_by'] == $user_id) throw new Exception('Bạn là người tạo khóa học này.');

    // --- BƯỚC 2: KIỂM TRA ĐÃ THAM GIA CHƯA ---
    $checkJoinedSql = "SELECT 1 FROM user_course WHERE user_id = ? AND course_id = ?";
    $stmtCheck = $conn->prepare($checkJoinedSql);
    $stmtCheck->bind_param("ii", $user_id, $course_id);
    $stmtCheck->execute();
    
    if ($stmtCheck->get_result()->num_rows > 0) {
        // Trả về success = true để JS không báo lỗi, chỉ thông báo nhẹ
        echo json_encode(['success' => true, 'message' => 'Bạn đã tham gia khóa học này rồi']);
        exit;
    }

    // --- BƯỚC 3: THỰC HIỆN GHI DANH (INSERT) ---
    // Lưu ý: Cột thời gian là 'enrolled_at' hay 'created_at' tùy vào Database của bạn.
    // Ở đây mình để enrolled_at theo code cũ của bạn.
    $sql = "INSERT INTO user_course (user_id, course_id, status, progress, enrolled_at) VALUES (?, ?, 'active', 0, NOW())";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ii", $user_id, $course_id);

    if ($stmt->execute()) {
        // Lấy tên khóa học để tạo thông báo
        $courseNameStmt = $conn->prepare("SELECT course_name FROM course WHERE course_id = ?");
        $courseNameStmt->bind_param("i", $course_id);
        $courseNameStmt->execute();
        $courseNameResult = $courseNameStmt->get_result();
        if ($courseNameRow = $courseNameResult->fetch_assoc()) {
            notifyCourseJoined($conn, $user_id, $courseNameRow['course_name']);
        }
        $courseNameStmt->close();
        
        echo json_encode(['success' => true, 'message' => 'Tham gia khóa học thành công!']);
    } else {
        throw new Exception('Lỗi Database: ' . $stmt->error);
    }

} catch (Exception $e) {
    http_response_code(400); // Bad Request
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>