<?php
// FILE: api/admin/course_update.php
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

    if (!isset($input['csrf_token']) || $input['csrf_token'] !== $_SESSION['csrf_token']) throw new Exception("Lỗi CSRF.");

    $id = (int)$input['id'];
    $newName = trim($input['name']);
    $newDesc = trim($input['description']);
    $newStatus = ($input['status'] === 'active') ? 'public' : 'private';
    
    // Xử lý Tags mới
    $rawTags = $input['tags'] ?? '';
    $newTagsArray = array_filter(array_map('trim', explode(',', $rawTags)));
    sort($newTagsArray);

    // 1. LẤY DỮ LIỆU CŨ
    $sqlOld = "SELECT c.course_name, c.description, c.visibility, GROUP_CONCAT(t.tag_name) as current_tags
               FROM course c 
               LEFT JOIN course_tag ct ON c.course_id = ct.course_id 
               LEFT JOIN tag t ON ct.tag_id = t.tag_id
               WHERE c.course_id = ? GROUP BY c.course_id";
    $stmtOld = $conn->prepare($sqlOld);
    $stmtOld->bind_param("i", $id);
    $stmtOld->execute();
    $oldData = $stmtOld->get_result()->fetch_assoc();

    if (!$oldData) throw new Exception("Khóa học không tồn tại.");

    $oldTagsArray = $oldData['current_tags'] ? array_map('trim', explode(',', $oldData['current_tags'])) : [];
    sort($oldTagsArray);

    // 2. SO SÁNH
    $isInfoChanged = ($oldData['course_name'] !== $newName || $oldData['description'] !== $newDesc || $oldData['visibility'] !== $newStatus);
    $isTagsChanged = ($oldTagsArray !== $newTagsArray);

    // --- [MẤU CHỐT] NẾU KHÔNG ĐỔI -> TRẢ VỀ WARNING ---
    if (!$isInfoChanged && !$isTagsChanged) {
        ob_clean();
        echo json_encode([
            'status' => 'warning',  // Đổi từ success sang warning
            'message' => 'Không có dữ liệu nào thay đổi.' // Tin nhắn chính xác
        ]);
        exit();
    }

    // 3. CẬP NHẬT
    $conn->begin_transaction();

    if ($isInfoChanged) {
        $stmt = $conn->prepare("UPDATE course SET course_name=?, description=?, visibility=? WHERE course_id=?");
        $stmt->bind_param("sssi", $newName, $newDesc, $newStatus, $id);
        $stmt->execute();
    }

    if ($isTagsChanged) {
        $conn->query("DELETE FROM course_tag WHERE course_id = $id");
        if (!empty($newTagsArray)) {
            $stmtChk = $conn->prepare("SELECT tag_id FROM tag WHERE tag_name = ?");
            $stmtIns = $conn->prepare("INSERT INTO tag (tag_name) VALUES (?)");
            $stmtLnk = $conn->prepare("INSERT IGNORE INTO course_tag (course_id, tag_id) VALUES (?, ?)");
            foreach ($newTagsArray as $t) {
                $tid = 0;
                $stmtChk->bind_param("s", $t); $stmtChk->execute();
                $res = $stmtChk->get_result();
                if ($row = $res->fetch_assoc()) $tid = $row['tag_id'];
                else { $stmtIns->bind_param("s", $t); if ($stmtIns->execute()) $tid = $stmtIns->insert_id; }
                if ($tid) { $stmtLnk->bind_param("ii", $id, $tid); $stmtLnk->execute(); }
            }
        }
    }

    // Ghi log
    $logMsg = "Cập nhật khóa học: $newName";
    if ($isInfoChanged && $isTagsChanged) $logMsg .= " (Info & Tags)";
    elseif ($isTagsChanged) $logMsg .= " (Tags)";
    
    if (function_exists('writeAdminLog')) writeAdminLog($conn, $admin_id, $logMsg, $id);

    $conn->commit();
    ob_clean();
    echo json_encode(['status' => 'success', 'message' => 'Cập nhật thành công!']);

} catch (Exception $e) {
    if(isset($conn)) $conn->rollback();
    ob_clean();
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>