<?php
require_once __DIR__ . '/config/config.php';

$email = $_GET['email'] ?? '';
if (empty($email)) {
    die('Usage: check_user.php?email=your@email.com');
}

$stmt = $conn->prepare("SELECT user_id, name, email, email_verified, status, role FROM user WHERE email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    $user = $result->fetch_assoc();
    echo "<h2>Thông tin tài khoản:</h2>";
    echo "<p>ID: " . $user['user_id'] . "</p>";
    echo "<p>Tên: " . $user['name'] . "</p>";
    echo "<p>Email: " . $user['email'] . "</p>";
    echo "<p>Email verified: " . ($user['email_verified'] ? 'YES' : 'NO') . "</p>";
    echo "<p>Status: " . $user['status'] . "</p>";
    echo "<p>Role: " . $user['role'] . "</p>";
} else {
    echo "Không tìm thấy tài khoản với email: " . htmlspecialchars($email);
}
?>