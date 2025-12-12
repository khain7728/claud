<?php
// FILE: api/admin/log_get_list.php
ini_set('display_errors', 0);
error_reporting(E_ALL);

function fatalErrorHandler() {
    $error = error_get_last();
    if ($error !== NULL && $error['type'] === E_ERROR) {
        header('Content-Type: application/json');
        echo json_encode(['status' => 'error', 'message' => 'Lỗi PHP: ' . $error['message']]);
        exit;
    }
}
register_shutdown_function('fatalErrorHandler');
header('Content-Type: application/json; charset=utf-8');

try {
    require_once dirname(__DIR__, 2) . '/config/database.php';
    $conn->set_charset("utf8mb4");

    // --- CẤU HÌNH TÊN CỘT USER TẠI ĐÂY ---
    $colName = 'name'; // Sửa thành 'full_name' hoặc 'fullname' nếu DB của bạn dùng thế
    // -------------------------------------

    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
    $offset = ($page - 1) * $limit;
    $search = isset($_GET['search']) ? trim($_GET['search']) : '';
    
    // Sort parameters
    $sort_by = isset($_GET['sort_by']) ? $_GET['sort_by'] : 'created_at';
    $order = isset($_GET['order']) && strtoupper($_GET['order']) === 'ASC' ? 'ASC' : 'DESC';
    
    // Validate sort column to prevent SQL injection
    $allowed_sort_columns = ['created_at', 'action', 'target_id', 'admin_id'];
    if (!in_array($sort_by, $allowed_sort_columns)) {
        $sort_by = 'created_at';
    }

    $where = " WHERE 1=1 ";
    if (!empty($search)) {
        $s = $conn->real_escape_string($search);
        $where .= " AND (l.action LIKE '%$s%' OR l.admin_id LIKE '%$s%' OR u.$colName LIKE '%$s%') ";
    }
    
    if (!empty($_GET['start_date'])) $where .= " AND DATE(l.created_at) >= '" . $conn->real_escape_string($_GET['start_date']) . "' ";
    if (!empty($_GET['end_date'])) $where .= " AND DATE(l.created_at) <= '" . $conn->real_escape_string($_GET['end_date']) . "' ";

    // Đếm tổng
    $count_res = $conn->query("SELECT COUNT(*) as total FROM admin_log l LEFT JOIN user u ON l.admin_id = u.user_id $where");
    $total_records = $count_res->fetch_assoc()['total'];
    $total_pages = ceil($total_records / $limit);

    // Lấy dữ liệu
    // QUAN TRỌNG: u.$colName as admin_name
    $sql = "SELECT 
                l.log_id as id, 
                l.admin_id, 
                l.action, 
                l.target_id, 
                l.created_at, 
                l.ip_address, 
                l.user_agent,
                IFNULL(u.$colName, CONCAT('ID ', l.admin_id)) as admin_name
            FROM admin_log l
            LEFT JOIN user u ON l.admin_id = u.user_id
            $where 
            ORDER BY l.$sort_by $order 
            LIMIT $offset, $limit";

    $result = $conn->query($sql);
    if (!$result) throw new Exception("Lỗi SQL: " . $conn->error);
    
    $data = [];
    while ($row = $result->fetch_assoc()) {
        $data[] = $row; // Các cột đã được alias đúng tên (admin_name) để JS hiểu
    }

    echo json_encode([
        'status' => 'success',
        'data' => $data,
        'pagination' => [
            'current_page' => $page,
            'total_pages' => $total_pages,
            'total_records' => $total_records
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>