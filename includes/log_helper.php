<?php
// FILE: includes/log_helper.php

if (!function_exists('writeAdminLog')) {

    /**
     * Hàm hỗ trợ lấy IP thật của người dùng (Xử lý cả Proxy/Cloudflare)
     */
    function getRealUserIp() {
        if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
            $ip = $_SERVER['HTTP_CLIENT_IP'];
        } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            // Nếu qua nhiều proxy, IP thật là cái đầu tiên trong chuỗi
            $ip = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0];
        } else {
            $ip = $_SERVER['REMOTE_ADDR'] ?? 'Unknown';
        }
        // Cắt bớt nếu IP quá dài (đề phòng giả mạo) để vừa với cột VARCHAR(45)
        return substr(trim($ip), 0, 45);
    }

    /**
     * Hàm ghi lịch sử hoạt động Admin
     * * @param mysqli $conn      Biến kết nối CSDL
     * @param int    $admin_id  ID của admin thực hiện
     * @param string $action    Nội dung hành động
     * @param int    $target_id ID đối tượng bị tác động (Ví dụ: ID user bị khóa)
     * @return bool             True nếu thành công, False nếu thất bại
     */
    function writeAdminLog($conn, $admin_id, $action, $target_id = null) {
        try {
            // Kiểm tra kết nối DB trước khi thực hiện
            if (!isset($conn) || $conn->connect_error) {
                return false;
            }

            // 1. Lấy thông tin môi trường (Dùng hàm helper ở trên)
            $ip = getRealUserIp();
            
            // Lấy User Agent (Thiết bị/Trình duyệt)
            $ua = $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown Device';

            // 2. Chuẩn bị câu lệnh SQL
            // Lưu ý: Đảm bảo bảng admin_log đã có cột ip_address và user_agent
            $sql = "INSERT INTO admin_log (admin_id, action, target_id, ip_address, user_agent, created_at) 
                    VALUES (?, ?, ?, ?, ?, NOW())";
            
            $stmt = $conn->prepare($sql);
            
            if ($stmt) {
                // Bind tham số: 
                // i (int), s (string), i (int), s (string), s (string)
                $stmt->bind_param("isiss", $admin_id, $action, $target_id, $ip, $ua);
                
                if ($stmt->execute()) {
                    $stmt->close();
                    return true;
                } else {
                    $stmt->close();
                    return false;
                }
            }
        } catch (Exception $e) {
            // Ghi lỗi vào error log của server nếu cần debug (Bỏ comment dòng dưới)
            // error_log("WriteAdminLog Error: " . $e->getMessage());
            return false;
        }
        return false;
    }
}
?>