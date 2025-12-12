<?php
/**
 * API TẠO KHÓA HỌC MỚI (Full CORS Support)
 * Endpoint: api/create-course.php
 * Method: POST
 */

// --- BẮT ĐẦU: CẤU HÌNH CORS CHUẨN ---
// Cho phép tất cả nguồn truy cập
header('Access-Control-Allow-Origin: *');

// Cho phép các method được sử dụng
header('Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE');

// Cho phép các headers tùy chỉnh (như Content-Type gửi JSON)
header('Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With');

// Xử lý Preflight Request (Trình duyệt hỏi đường trước khi gửi dữ liệu thật)
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit(); // Dừng ngay, không chạy tiếp code bên dưới
}
// --- KẾT THÚC: CẤU HÌNH CORS CHUẨN ---


// Tắt lỗi rác HTML (Giữ nguyên theo yêu cầu)
error_reporting(0);
ini_set('display_errors', 0);

// Set header JSON cho response
header('Content-Type: application/json; charset=utf-8');

require_once '../config/config.php';
require_once '../includes/notification_helper.php';

try {
    // Chỉ nhận POST
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Method Not Allowed');
    }

    // ✅ BẢO MẬT: CHỈ lấy user_id từ session - KHÔNG cho phép client gửi
    $user_id = api_require_login();

    $input = json_decode(file_get_contents('php://input'), true);
    
    // // Validate dữ liệu
    // // Logic cũ: Ưu tiên lấy user_id từ input client gửi lên (nếu có)
    // if (isset($input['user_id'])) {
    //     $user_id = intval($input['user_id']);
    // }

    // SECURITY: Không chấp nhận user_id từ client (đã bỏ)
    // Client KHÔNG được phép gửi user_id để tránh privilege escalation
    
    $course_name = isset($input['course_name']) ? trim($input['course_name']) : '';
    $description = isset($input['description']) ? trim($input['description']) : '';
    $visibility = isset($input['visibility']) ? $input['visibility'] : 'public';
    $tags = isset($input['tags']) ? $input['tags'] : []; 

    if (empty($user_id) || $user_id <= 0 || empty($course_name)) {
        throw new Exception('Tên khóa học không được để trống và User ID phải hợp lệ.');
    }

    // Bắt đầu Transaction
    $conn->begin_transaction();

    // 1. Insert vào bảng course
    $sql = "INSERT INTO course (course_name, description, visibility, create_by, created_at, hide) VALUES (?, ?, ?, ?, NOW(), 0)";
    $stmt = $conn->prepare($sql);
    
    if (!$stmt) throw new Exception("Lỗi SQL: " . $conn->error);
    
    $stmt->bind_param("sssi", $course_name, $description, $visibility, $user_id);
    
    if (!$stmt->execute()) throw new Exception("Lỗi thực thi: " . $stmt->error);
    
    $new_course_id = $stmt->insert_id;

    if ($new_course_id == 0) {
        throw new Exception("Tạo thành công nhưng ID trả về bằng 0. Hãy kiểm tra AUTO_INCREMENT trong Database.");
    }

    // 2. Xử lý Tags
    if (!empty($tags)) {
        $tags = array_unique(array_filter($tags));
        
        $stmtCheck = $conn->prepare("SELECT tag_id FROM tag WHERE tag_name = ?");
        $stmtInsTag = $conn->prepare("INSERT INTO tag (tag_name) VALUES (?)");
        $stmtLink = $conn->prepare("INSERT IGNORE INTO course_tag (course_id, tag_id) VALUES (?, ?)");

        foreach ($tags as $tagName) {
            $tagName = trim($tagName);
            if (empty($tagName)) continue;

            $tagId = 0;
            // Kiểm tra tag
            $stmtCheck->bind_param("s", $tagName);
            $stmtCheck->execute();
            $resTag = $stmtCheck->get_result();
            
            if ($row = $resTag->fetch_assoc()) {
                $tagId = $row['tag_id'];
            } else {
                // Tạo mới
                $stmtInsTag->bind_param("s", $tagName);
                if ($stmtInsTag->execute()) {
                    $tagId = $stmtInsTag->insert_id;
                }
            }

            // Link vào khóa học
            if ($tagId > 0) {
                $stmtLink->bind_param("ii", $new_course_id, $tagId);
                $stmtLink->execute();
            }
        }
    }

    $conn->commit();
    
    // Tạo thông báo cho user
    notifyCourseCreated($conn, $user_id, $course_name);

    // 3. Trả về kết quả JSON
    echo json_encode([
        'success' => true, 
        'message' => 'Tạo khóa học thành công!',
        'course_id' => $new_course_id 
    ]);

} catch (Exception $e) {
    if (isset($conn)) $conn->rollback();
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
} finally {
    if (isset($conn)) $conn->close();
}
?>