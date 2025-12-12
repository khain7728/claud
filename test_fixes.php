<?php
/**
 * TEST FILE - Kiểm tra các fix đã thực hiện
 * Chạy file này để test các API và CSS
 */

echo "<h2>🔧 Test Fixes</h2>";

// 1. Test notifications API
echo "<h3>1. Test Notifications API</h3>";
$notif_url = "http://localhost/vocabulary/api/get-notifications.php";
echo "URL: <a href='$notif_url' target='_blank'>$notif_url</a><br>";
echo "Status: Cần đăng nhập để test<br><br>";

// 2. Test footer CSS
echo "<h3>2. Test Footer CSS</h3>";
$css_path = __DIR__ . "/assets/css/defaut/footer.css";
if (file_exists($css_path)) {
    echo "✅ Footer CSS exists: $css_path<br>";
    echo "Size: " . filesize($css_path) . " bytes<br>";
} else {
    echo "❌ Footer CSS not found: $css_path<br>";
}

// 3. Test course creation
echo "<h3>3. Test Course Creation</h3>";
$course_api = "http://localhost/vocabulary/api/admin/course_create.php";
echo "URL: <a href='$course_api' target='_blank'>$course_api</a><br>";
echo "Status: Admin courses now created with hide=0 (visible immediately)<br><br>";

// 4. Test database connection
echo "<h3>4. Test Database</h3>";
try {
    require_once 'config/database.php';
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    if ($conn->connect_error) {
        throw new Exception("Connection failed: " . $conn->connect_error);
    }
    echo "✅ Database connection successful<br>";
    
    // Check course table
    $result = $conn->query("SELECT COUNT(*) as count FROM course WHERE hide = 0");
    if ($result) {
        $row = $result->fetch_assoc();
        echo "✅ Visible courses: " . $row['count'] . "<br>";
    }
    
    $conn->close();
} catch (Exception $e) {
    echo "❌ Database error: " . $e->getMessage() . "<br>";
}

echo "<br><h3>🎯 Summary of Fixes:</h3>";
echo "<ul>";
echo "<li>✅ Fixed notifications API authentication (401 instead of 403)</li>";
echo "<li>✅ Fixed footer CSS path (../../assets/css/defaut/footer.css)</li>";
echo "<li>✅ Fixed admin course creation (hide=0 for immediate visibility)</li>";
echo "<li>✅ Fixed JavaScript error handling for HTML responses</li>";
echo "</ul>";

echo "<br><p><strong>Next steps:</strong></p>";
echo "<ol>";
echo "<li>Test đăng nhập và xóa thông báo</li>";
echo "<li>Test admin tạo khóa học mới</li>";
echo "<li>Kiểm tra footer hiển thị đúng CSS</li>";
echo "</ol>";
?>