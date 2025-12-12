<?php
// FILE: api/admin/course_finalize.php
error_reporting(E_ALL);
ini_set('display_errors', 0);
header('Content-Type: application/json; charset=utf-8');
require_once '../../config/config.php';

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $course_id = isset($input['course_id']) ? (int)$input['course_id'] : 0;

    if ($course_id <= 0) throw new Exception("ID không hợp lệ");

    // 1. Đếm số từ vựng hiện có của khóa học
    $stmt = $conn->prepare("SELECT COUNT(*) as total FROM word WHERE course_id = ?");
    $stmt->bind_param("i", $course_id);
    $stmt->execute();
    $count = $stmt->get_result()->fetch_assoc()['total'];

    // 2. Kiểm tra điều kiện
    if ($count < 3) {
        throw new Exception("Bạn mới thêm $count từ. Cần tối thiểu 3 từ vựng để hoàn tất khóa học!");
    }

    // 3. Nếu đủ -> Kích hoạt (hide = 0)
    $stmtUpd = $conn->prepare("UPDATE course SET hide = 0 WHERE course_id = ?");
    $stmtUpd->bind_param("i", $course_id);
    $stmtUpd->execute();

    echo json_encode(['status' => 'success', 'message' => 'Khóa học đã được tạo thành công!']);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>