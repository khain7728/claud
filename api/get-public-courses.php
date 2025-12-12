<?php
// api/get-public-courses.php
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
    // BẢO MẬT: Lấy user_id từ session
    $user_id = api_verify_user_id($_GET['user_id'] ?? null);

    // CẬP NHẬT: Dùng bảng user_course cho student_count và is_joined
    $sql = "SELECT 
                c.course_id, 
                c.course_name, 
                c.description, 
                c.create_by, 
                c.created_at,
                u.name as creator_name,
                (SELECT COUNT(*) FROM word w WHERE w.course_id = c.course_id) as word_count,
                (SELECT COUNT(*) FROM user_course uc WHERE uc.course_id = c.course_id) as student_count,
                (SELECT COUNT(*) FROM user_course uc2 WHERE uc2.course_id = c.course_id AND uc2.user_id = ?) as is_joined
            FROM course c
            LEFT JOIN user u ON c.create_by = u.user_id
            WHERE c.visibility = 'public' 
              AND c.hide = 0 
              AND c.create_by != ? 
            ORDER BY c.created_at DESC";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ii", $user_id, $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $courses = [];
    while ($row = $result->fetch_assoc()) {
        // Lấy Tags (giữ nguyên)
        $tags = [];
        try {
            $stmtTag = $conn->prepare("SELECT t.tag_name FROM tag t JOIN course_tag ct ON t.tag_id = ct.tag_id WHERE ct.course_id = ?");
            $stmtTag->bind_param("i", $row['course_id']);
            $stmtTag->execute();
            $resTags = $stmtTag->get_result();
            while ($t = $resTags->fetch_assoc()) $tags[] = $t['tag_name'];
        } catch (Exception $ex) {}

        $courses[] = [
            'id' => $row['course_id'],
            'tieuDe' => $row['course_name'],
            'mota' => $row['description'] ?? 'Chưa có mô tả',
            'nguoiTao' => $row['creator_name'] ?? 'Unknown',
            'soTu' => (int)$row['word_count'],
            'hocVien' => (int)$row['student_count'],
            'daThamGia' => ($row['is_joined'] > 0),
            'tags' => $tags
        ];
    }
    echo json_encode(['success' => true, 'data' => $courses]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>