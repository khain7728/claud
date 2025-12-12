<?php
require_once __DIR__ . '/config/config.php';

echo "<h2>Sửa bảng user - Thêm AUTO_INCREMENT</h2>";

try {
    // Bước 1: Xóa user có ID = 0 (nếu có)
    $conn->query("DELETE FROM user WHERE user_id = 0");
    echo "<p>✅ Đã xóa user có ID = 0</p>";
    
    // Bước 2: Thêm AUTO_INCREMENT cho user_id
    $conn->query("ALTER TABLE user MODIFY user_id INT(11) NOT NULL AUTO_INCREMENT");
    echo "<p>✅ Đã thêm AUTO_INCREMENT cho user_id</p>";
    
    // Bước 3: Kiểm tra lại
    $result = $conn->query("DESCRIBE user");
    while ($row = $result->fetch_assoc()) {
        if ($row['Field'] == 'user_id') {
            echo "<p>user_id Extra: " . $row['Extra'] . "</p>";
            break;
        }
    }
    
    echo "<p>🎉 Hoàn thành! Bây giờ có thể đăng ký tài khoản mới bình thường.</p>";
    
} catch (Exception $e) {
    echo "<p>❌ Lỗi: " . $e->getMessage() . "</p>";
}
?>