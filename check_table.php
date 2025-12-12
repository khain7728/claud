<?php
require_once __DIR__ . '/config/config.php';

echo "<h2>Kiểm tra cấu trúc bảng user</h2>";

$result = $conn->query("DESCRIBE user");
echo "<table border='1'>";
echo "<tr><th>Field</th><th>Type</th><th>Null</th><th>Key</th><th>Default</th><th>Extra</th></tr>";

while ($row = $result->fetch_assoc()) {
    echo "<tr>";
    echo "<td>" . $row['Field'] . "</td>";
    echo "<td>" . $row['Type'] . "</td>";
    echo "<td>" . $row['Null'] . "</td>";
    echo "<td>" . $row['Key'] . "</td>";
    echo "<td>" . $row['Default'] . "</td>";
    echo "<td>" . $row['Extra'] . "</td>";
    echo "</tr>";
}
echo "</table>";

// Kiểm tra AUTO_INCREMENT
$result2 = $conn->query("SHOW CREATE TABLE user");
$createTable = $result2->fetch_assoc();
echo "<h3>CREATE TABLE:</h3>";
echo "<pre>" . $createTable['Create Table'] . "</pre>";
?>