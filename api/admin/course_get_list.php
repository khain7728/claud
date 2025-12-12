<?php
// FILE: api/admin/course_get_list.php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ob_start();

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=utf-8');

require_once '../../config/config.php';
require_once '../../includes/auth_check.php'; 

try {
    if (session_status() === PHP_SESSION_NONE) session_start();
    if (!check_session_timeout() || !validate_session_security()) throw new Exception("Phiên hết hạn.");
    if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') throw new Exception("Không quyền.");

    $admin_id = $_SESSION['user_id'];
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = 10;
    $offset = ($page - 1) * $limit;
    $search = isset($_GET['search']) ? trim($_GET['search']) : '';
    $status = isset($_GET['status']) ? trim($_GET['status']) : '';
    $sort_by = isset($_GET['sort_by']) ? $_GET['sort_by'] : 'created_at';
    $order = isset($_GET['order']) && strtoupper($_GET['order']) === 'ASC' ? 'ASC' : 'DESC';

    // CHỈ LẤY KHÓA HỌC ĐÃ HOÀN TẤT (HIDE = 0)
    $where = "WHERE c.hide = 0"; 
    $params = [];
    $types = "";

    if (!empty($search)) {
        $where .= " AND (c.course_name LIKE ? OR c.course_code LIKE ?)";
        $term = "%$search%";
        $params[] = $term; $params[] = $term;
        $types .= "ss";
    }

    if (!empty($status)) {
        $dbStatus = ($status === 'active') ? 'public' : 'private';
        $where .= " AND c.visibility = ?";
        $params[] = $dbStatus;
        $types .= "s";
    }

    $sqlCount = "SELECT COUNT(*) as total FROM course c $where";
    $stmtCount = $conn->prepare($sqlCount);
    if (!empty($params)) $stmtCount->bind_param($types, ...$params);
    $stmtCount->execute();
    $totalRecords = $stmtCount->get_result()->fetch_assoc()['total'];
    $totalPages = ceil($totalRecords / $limit);

    $sqlData = "SELECT c.course_id, c.course_code, c.course_name, c.visibility, c.created_at, c.description, c.create_by,
                       IFNULL(u.name, 'Admin') as author_name,
                       GROUP_CONCAT(t.tag_name SEPARATOR ', ') as tags
                FROM course c
                LEFT JOIN user u ON c.create_by = u.user_id
                LEFT JOIN course_tag ct ON c.course_id = ct.course_id
                LEFT JOIN tag t ON ct.tag_id = t.tag_id
                $where
                GROUP BY c.course_id
                ORDER BY c.$sort_by $order
                LIMIT ?, ?";
    
    $params[] = $offset; $params[] = $limit;
    $types .= "ii";

    $stmt = $conn->prepare($sqlData);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $data = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

    // Thêm thông tin quyền chỉnh sửa từ vựng
    foreach ($data as &$course) {
        $is_admin_course = ($course['create_by'] == $admin_id);
        $is_public = ($course['visibility'] === 'public');
        // Có thể chỉnh sửa nếu: (1) Admin tạo, hoặc (2) Khóa học công khai của user
        $course['can_edit_vocab'] = $is_admin_course || $is_public;
    }

    ob_clean();
    echo json_encode([
        'status' => 'success',
        'data' => $data,
        'pagination' => ['current_page' => $page, 'total_pages' => $totalPages, 'total_records' => $totalRecords]
    ]);

} catch (Exception $e) {
    ob_clean();
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>