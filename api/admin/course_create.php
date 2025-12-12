<?php
// FILE: api/admin/course_create.php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ob_start();

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=utf-8');

require_once '../../config/config.php';
require_once '../../includes/auth_check.php';
require_once '../../includes/log_helper.php';

try {
    if (session_status() === PHP_SESSION_NONE) session_start();
    if (!check_session_timeout() || !validate_session_security()) throw new Exception("Phiên hết hạn.");
    if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') throw new Exception("Không đủ quyền.");
    
    $admin_id = $_SESSION['user_id'];
    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['csrf_token']) || $input['csrf_token'] !== $_SESSION['csrf_token']) throw new Exception("Lỗi bảo mật CSRF.");

    $name = trim($input['name'] ?? '');
    $desc = trim($input['description'] ?? '');
    $status = ($input['status'] === 'active') ? 'public' : 'private';
    $tagsRaw = $input['tags'] ?? '';
    
    if (empty($name)) throw new Exception("Tên không được trống.");

    $conn->begin_transaction();

    // 1. Tạo khóa học (MẶC ĐỊNH HIDE = 1 ĐỂ TẠO DRAFT)
    $stmt = $conn->prepare("INSERT INTO course (course_name, description, visibility, create_by, created_at, hide) VALUES (?, ?, ?, ?, NOW(), 1)");
    $stmt->bind_param("sssi", $name, $desc, $status, $admin_id);
    
    if (!$stmt->execute()) throw new Exception("Lỗi DB: " . $stmt->error);
    $new_id = $conn->insert_id;

    $code = str_pad($new_id, 3, '0', STR_PAD_LEFT);
    $conn->query("UPDATE course SET course_code = '$code' WHERE course_id = $new_id");

    // 2. Add Tags
    if (!empty($tagsRaw)) {
        $tags = array_unique(array_filter(array_map('trim', explode(',', $tagsRaw))));
        $stmtChk = $conn->prepare("SELECT tag_id FROM tag WHERE tag_name = ?");
        $stmtIns = $conn->prepare("INSERT INTO tag (tag_name) VALUES (?)");
        $stmtLnk = $conn->prepare("INSERT IGNORE INTO course_tag (course_id, tag_id) VALUES (?, ?)");

        foreach ($tags as $t) {
            $tid = 0;
            $stmtChk->bind_param("s", $t); $stmtChk->execute();
            $res = $stmtChk->get_result();
            if ($row = $res->fetch_assoc()) $tid = $row['tag_id'];
            else {
                $stmtIns->bind_param("s", $t); 
                if ($stmtIns->execute()) $tid = $stmtIns->insert_id;
            }
            if ($tid) {
                $stmtLnk->bind_param("ii", $new_id, $tid);
                $stmtLnk->execute();
            }
        }
    }

    if (function_exists('writeAdminLog')) writeAdminLog($conn, $admin_id, "Tạo nháp khóa học: $name", $new_id);

    $conn->commit();
    ob_clean();
    echo json_encode(['status' => 'success', 'message' => "Đã tạo bản nháp. Đang chuyển hướng...", 'data' => ['id' => $new_id]]);

} catch (Exception $e) {
    if(isset($conn)) $conn->rollback();
    ob_clean();
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>