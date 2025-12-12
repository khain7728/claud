<?php
// FILE: api/admin/user_get_list.php
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
    if (!isset($conn)) throw new Exception("Lỗi kết nối CSDL.");
    $conn->set_charset("utf8mb4");

    // --- CẤU HÌNH TÊN CỘT TẠI ĐÂY (SỬA DÒNG NÀY) ---
    // Hãy nhìn vào database và thay chữ 'name' bằng 'full_name' hoặc 'fullname' nếu cần
    $colName = 'name'; // Ví dụ: $colName = 'full_name';
    // -----------------------------------------------

    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = 10;
    $offset = ($page - 1) * $limit;
    $search = isset($_GET['search']) ? trim($_GET['search']) : '';
    
    $sort_by = isset($_GET['sort_by']) ? $_GET['sort_by'] : 'created_at';
    $order = isset($_GET['order']) && strtoupper($_GET['order']) === 'ASC' ? 'ASC' : 'DESC';

    // Map sort column
    if ($sort_by === 'name' && $colName !== 'name') $sort_by = $colName;

    $where = "WHERE 1=1";
    
    if (!empty($search)) {
        $s = $conn->real_escape_string($search);
        // Tìm kiếm theo tên cột động
        $where .= " AND ($colName LIKE '%$s%' OR email LIKE '%$s%')"; 
    }

    // A. Đếm tổng
    $stmtCount = $conn->query("SELECT COUNT(*) as total FROM user $where");
    $total_records = $stmtCount->fetch_assoc()['total'];
    $total_pages = ceil($total_records / $limit);

    // B. Lấy dữ liệu
    // QUAN TRỌNG: Dùng "as name" để JS không phải sửa đổi gì cả
    $sql = "SELECT user_id, $colName as name, email, avatar, status, created_at
            FROM user $where 
            ORDER BY $sort_by $order 
            LIMIT $offset, $limit";
            
    $result = $conn->query($sql);
    if (!$result) throw new Exception("Lỗi SQL (Kiểm tra lại tên cột '$colName'): " . $conn->error);
    
    $data = [];
    while ($row = $result->fetch_assoc()) {
        $data[] = $row;
    }

    echo json_encode([
        'status' => 'success',
        'data' => $data,
        'pagination' => [
            'current_page' => $page,
            'total_pages' => $total_pages
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => "Lỗi: " . $e->getMessage()]);
}
?>