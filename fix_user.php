<?php
require_once __DIR__ . '/config/config.php';

echo "<h2>Kiểm tra và sửa user_id = 0</h2>";

// Tìm user có ID = 0
$stmt = $conn->prepare("SELECT * FROM user WHERE user_id = 0");
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    $user = $result->fetch_assoc();
    echo "<p>Tìm thấy user với ID = 0:</p>";
    echo "<p>Email: " . $user['email'] . "</p>";
    echo "<p>Name: " . $user['name'] . "</p>";
    
    // Tìm ID cao nhất
    $maxStmt = $conn->prepare("SELECT MAX(user_id) as max_id FROM user WHERE user_id > 0");
    $maxStmt->execute();
    $maxResult = $maxStmt->get_result();
    $maxRow = $maxResult->fetch_assoc();
    $newId = ($maxRow['max_id'] ?? 0) + 1;
    
    echo "<p>ID mới sẽ là: " . $newId . "</p>";
    
    // Xóa user cũ và tạo lại với ID đúng
    $deleteStmt = $conn->prepare("DELETE FROM user WHERE user_id = 0");
    $deleteStmt->execute();
    
    $insertStmt = $conn->prepare("INSERT INTO user (user_id, name, email, password, role, status, email_verified) VALUES (?, ?, ?, ?, ?, ?, ?)");
    $insertStmt->bind_param("issssii", $newId, $user['name'], $user['email'], $user['password'], $user['role'], $user['status'], $user['email_verified']);
    
    if ($insertStmt->execute()) {
        echo "<p>✅ Đã sửa thành công! User ID mới: " . $newId . "</p>";
        echo "<p>Bây giờ có thể đăng nhập bình thường.</p>";
    } else {
        echo "<p>❌ Lỗi khi sửa: " . $insertStmt->error . "</p>";
    }
} else {
    echo "<p>Không tìm thấy user với ID = 0</p>";
}

// Kiểm tra lại
echo "<h3>Kiểm tra lại tài khoản:</h3>";
$checkStmt = $conn->prepare("SELECT user_id, name, email, email_verified FROM user WHERE email = 'khain7728@gmail.com'");
$checkStmt->execute();
$checkResult = $checkStmt->get_result();

if ($checkResult->num_rows > 0) {
    $checkUser = $checkResult->fetch_assoc();
    echo "<p>ID: " . $checkUser['user_id'] . "</p>";
    echo "<p>Name: " . $checkUser['name'] . "</p>";
    echo "<p>Email: " . $checkUser['email'] . "</p>";
    echo "<p>Verified: " . ($checkUser['email_verified'] ? 'YES' : 'NO') . "</p>";
}
?>