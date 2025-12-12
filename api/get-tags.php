<?php
/**
 * API LẤY DANH SÁCH TAG
 * Endpoint: api/get-tags.php
 */

error_reporting(0);
ini_set('display_errors', 0);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

require_once '../config/config.php';

try {
    if (!isset($conn)) throw new Exception("Lỗi kết nối Database");

    // Lấy tất cả tag, sắp xếp theo tên
    $sql = "SELECT tag_name FROM tag ORDER BY tag_name ASC";
    $result = $conn->query($sql);

    $tags = [];
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $tags[] = $row['tag_name'];
        }
    }

    echo json_encode(['success' => true, 'data' => $tags]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
} finally {
    if (isset($conn)) $conn->close();
}
?>