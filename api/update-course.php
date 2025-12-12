<?php
/**
 * API CẬP NHẬT KHÓA HỌC
 * Endpoint: api/update-course.php
 * Method: POST
 */
// --- BẮT ĐẦU: CẤU HÌNH CORS CHUẨN ---
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}
// --- KẾT THÚC: CẤU HÌNH CORS CHUẨN ---

error_reporting(0);
ini_set('display_errors', 0);
header('Content-Type: application/json; charset=utf-8');
require_once '../config/config.php';
require_once '../includes/rate_limiter.php';
checkApiRateLimit();

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new Exception('Method Not Allowed');
    
    // ✅ BẢO MẬT: Lấy user_id từ session
    $user_id = api_require_login();
    
    $input = json_decode(file_get_contents('php://input'), true);

    $course_id = isset($input['course_id']) ? intval($input['course_id']) : 0;
    // ⚠️ SECURITY: Không nhận user_id từ client nữa
    $course_name = isset($input['course_name']) ? trim($input['course_name']) : '';
    $description = isset($input['description']) ? trim($input['description']) : '';
    $visibility = isset($input['visibility']) ? $input['visibility'] : 'public';
    $tags = isset($input['tags']) ? $input['tags'] : [];

    if ($course_id <= 0 || $user_id <= 0 || empty($course_name)) {
        throw new Exception('Dữ liệu không hợp lệ');
    }

    // 1. Kiểm tra quyền sở hữu
    $checkOwner = $conn->prepare("SELECT create_by FROM course WHERE course_id = ?");
    $checkOwner->bind_param("i", $course_id);
    $checkOwner->execute();
    $res = $checkOwner->get_result();
    if ($res->num_rows === 0) throw new Exception('Khóa học không tồn tại');
    if ($res->fetch_assoc()['create_by'] != $user_id) throw new Exception('Bạn không có quyền sửa khóa học này');

    $conn->begin_transaction();

    // 2. Cập nhật thông tin cơ bản
    $sql = "UPDATE course SET course_name = ?, description = ?, visibility = ? WHERE course_id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("sssi", $course_name, $description, $visibility, $course_id);
    if (!$stmt->execute()) throw new Exception("Lỗi cập nhật: " . $stmt->error);

    // 3. Cập nhật Tags (Xóa hết cũ -> Thêm mới)
    $conn->query("DELETE FROM course_tag WHERE course_id = $course_id");

    if (!empty($tags)) {
        foreach ($tags as $tagName) {
            $tagName = trim($tagName);
            if (empty($tagName)) continue;

            // Tìm hoặc tạo tag mới
            $stmtTag = $conn->prepare("SELECT tag_id FROM tag WHERE tag_name = ?");
            $stmtTag->bind_param("s", $tagName);
            $stmtTag->execute();
            $resTag = $stmtTag->get_result();
            
            if ($resTag->num_rows > 0) {
                $tagId = $resTag->fetch_assoc()['tag_id'];
            } else {
                $stmtInsert = $conn->prepare("INSERT INTO tag (tag_name) VALUES (?)");
                $stmtInsert->bind_param("s", $tagName);
                $stmtInsert->execute();
                $tagId = $stmtInsert->insert_id;
            }

            // Link tag
            $conn->query("INSERT INTO course_tag (course_id, tag_id) VALUES ($course_id, $tagId)");
        }
    }

    $conn->commit();
    echo json_encode(['success' => true, 'message' => 'Cập nhật thành công!']);

} catch (Exception $e) {
    if (isset($conn)) $conn->rollback();
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
} finally {
    if (isset($conn)) $conn->close();
}
?>