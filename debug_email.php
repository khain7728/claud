<?php
// DEBUG EMAIL - Xem mã xác thực khi không nhận được email
session_start();

if (isset($_SESSION['verification_code_debug'])) {
    echo "<h2>DEBUG MODE - Mã xác thực của bạn:</h2>";
    echo "<h1 style='color: red;'>" . $_SESSION['verification_code_debug'] . "</h1>";
    echo "<p>Copy mã này và paste vào form xác thực email.</p>";
    echo "<a href='/auth/verify-email.php'>Đi đến trang xác thực</a>";
} else {
    echo "Không có mã xác thực nào.";
}
?>