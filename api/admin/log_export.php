<?php
/**
 * API: api/admin/log_export.php
 */

// 1. Khởi động Session (Để lấy ID Admin)
session_start();

// 2. Xóa sạch bộ nhớ đệm
while (ob_get_level()) ob_end_clean();

// 3. Cài đặt múi giờ
date_default_timezone_set('Asia/Ho_Chi_Minh');

// 4. Kết nối Database
$base_path = dirname(__DIR__, 2); // Thư mục gốc dự án
$config_path = $base_path . '/config/database.php';

// Fallback nếu chạy trên server khác cấu trúc
if (!file_exists($config_path)) {
    $config_path = $_SERVER['DOCUMENT_ROOT'] . '/VOCAB/config/database.php';
    $base_path = $_SERVER['DOCUMENT_ROOT'] . '/VOCAB'; // Cập nhật lại đường dẫn gốc
}

if (file_exists($config_path)) {
    require_once $config_path;
} else {
    die("Lỗi config.");
}

// --- [MỚI] INCLUDE FILE LOG HELPER ---
$log_helper_path = $base_path . '/includes/log_helper.php';
if (file_exists($log_helper_path)) {
    require_once $log_helper_path;
}
// -------------------------------------

if (!isset($conn)) die("Lỗi kết nối.");
$conn->set_charset("utf8mb4");

// Ghi log ngay khi kết nối DB thành công
if (isset($_SESSION['user_id']) && function_exists('writeAdminLog')) {
    $current_admin_id = $_SESSION['user_id'];
    
    // Tạo nội dung log chi tiết (VD: Xuất báo cáo từ ngày A đến ngày B)
    $log_action = "Xuất báo cáo lịch sử (Excel)";
    if (!empty($_GET['start_date']) || !empty($_GET['end_date'])) {
        $log_action .= " [Lọc thời gian]";
    }
    
    // Gọi hàm ghi log (Target ID để 0 hoặc null vì không tác động cụ thể lên ai)
    writeAdminLog($conn, $current_admin_id, $log_action, 0);
}
// ----------------------------------

// 5. Thiết lập Header để tải file
$filename = "Lich_su_" . date('Y-m-d_H-i-s') . ".csv";
header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="' . $filename . '"');
header('Pragma: no-cache');
header('Expires: 0');

// Mở luồng ghi
$output = fopen('php://output', 'w');

// Thêm BOM để Excel hiển thị Tiếng Việt không bị lỗi font
fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));

// Tiêu đề cột (Đầy đủ các cột)
fputcsv($output, ['ID Log', 'Admin', 'Hành động', 'Đối tượng ID', 'Thời gian', 'IP', 'Thiết bị']);

// 6. Xử lý lọc (Giống hệt file get_list)
$where = " WHERE 1=1 ";
if (!empty($_GET['search'])) {
    $s = $conn->real_escape_string(trim($_GET['search']));
    // Join bảng user để tìm theo tên Admin
    $where .= " AND (l.action LIKE '%$s%' OR l.admin_id LIKE '%$s%' OR l.target_id LIKE '%$s%' OR u.name LIKE '%$s%') ";
}
if (!empty($_GET['start_date'])) {
    $where .= " AND DATE(l.created_at) >= '" . $conn->real_escape_string($_GET['start_date']) . "' ";
}
if (!empty($_GET['end_date'])) {
    $where .= " AND DATE(l.created_at) <= '" . $conn->real_escape_string($_GET['end_date']) . "' ";
}

// 7. Query lấy dữ liệu
$sql = "SELECT 
            l.log_id, 
            IFNULL(u.name, CONCAT('ID ', l.admin_id)) as admin_name, 
            l.action, 
            l.target_id, 
            l.created_at,
            l.ip_address,
            l.user_agent
        FROM admin_log l
        LEFT JOIN user u ON l.admin_id = u.user_id
        $where 
        ORDER BY l.created_at DESC";

$result = $conn->query($sql);

if ($result) {
    while ($row = $result->fetch_assoc()) {
        

        $cleanDate = "\t" . date('d/m/Y H:i:s', strtotime($row['created_at']));
        $row['created_at'] = $cleanDate;
        
        // Xử lý IP (nếu null thì hiện dấu -)
        if (empty($row['ip_address'])) $row['ip_address'] = '-';

        // Xử lý User Agent (nếu null thì hiện -)
        if (empty($row['user_agent'])) $row['user_agent'] = '-';
        
        fputcsv($output, $row);
    }
}

fclose($output);
exit();
?>