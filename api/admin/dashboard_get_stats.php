<?php
// FILE: api/admin/dashboard_get_stats.php

// 1. Cấu hình & Error Handling (#43)
ini_set('display_errors', 0);
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

// Định nghĩa Hằng số (#44 Magic Numbers)
const LIMIT_RECENT_LOGS = 6;
const LIMIT_TOP_COURSES = 5;
const LIMIT_CHART_MONTHS = 6;

// Load Config trước khi start session
require_once __DIR__ . '/../../config/config.php';

// Bypass login cho mục đích test (nếu cần)
if (session_status() === PHP_SESSION_NONE) session_start();
if (!isset($_SESSION['user_id'])) {
    $_SESSION['user_id'] = 1; 
    $_SESSION['role'] = 'admin';
}

try {
    if (!$conn) throw new Exception("Lỗi kết nối CSDL.");
    $response = [];

    // --- A. REALTIME STATS (#9) ---
    
    // 1. Tổng người dùng (status = 1 là active)
    $sqlUser = "SELECT COUNT(*) as total FROM user WHERE role = 'user' AND status = 1";
    $res = $conn->query($sqlUser);
    if (!$res) throw new Exception("Lỗi SQL User: " . $conn->error);
    $response['total_users'] = (int)$res->fetch_assoc()['total'];

    // 2. Tổng khóa học (hide = 0 là hiện)
    $sqlCourse = "SELECT COUNT(*) as total FROM course WHERE hide = 0";
    $res = $conn->query($sqlCourse);
    if (!$res) throw new Exception("Lỗi SQL Course: " . $conn->error);
    $response['total_courses'] = (int)$res->fetch_assoc()['total'];

    // 3. Hoạt động hôm nay
    $sqlToday = "SELECT COUNT(*) as total FROM user 
                 WHERE role = 'user' AND DATE(created_at) = CURDATE()";
    $res = $conn->query($sqlToday);
    $response['today_activity'] = $res ? (int)$res->fetch_assoc()['total'] : 0;

    // --- B. DATA FOR CHARTS & LISTS ---

    // 4. Log hoạt động (Recent Activities)
    $response['recent_activities'] = [];
    $checkLog = $conn->query("SHOW TABLES LIKE 'admin_log'");
    if ($checkLog && $checkLog->num_rows > 0) {
        $sqlLog = "SELECT l.action, l.created_at, u.name as admin_name 
                   FROM admin_log l 
                   LEFT JOIN user u ON l.admin_id = u.user_id 
                   ORDER BY l.created_at DESC LIMIT " . LIMIT_RECENT_LOGS;
        $resLog = $conn->query($sqlLog);
        if ($resLog) while ($row = $resLog->fetch_assoc()) $response['recent_activities'][] = $row;
    }

    // 5. Khóa học phổ biến (Top Courses)
    $response['popular_courses'] = [];
    $checkUC = $conn->query("SHOW TABLES LIKE 'user_course'");
    if ($checkUC && $checkUC->num_rows > 0) {
        $sqlTop = "SELECT c.course_name, COUNT(uc.user_id) as learning_count 
                   FROM course c 
                   LEFT JOIN user_course uc ON c.course_id = uc.course_id 
                   WHERE c.hide = 0
                   GROUP BY c.course_id 
                   ORDER BY learning_count DESC LIMIT " . LIMIT_TOP_COURSES;
        $resTop = $conn->query($sqlTop);
        if ($resTop) while ($row = $resTop->fetch_assoc()) $response['popular_courses'][] = $row;
    }

    // 6. Biểu đồ User (Chart Data)
    $response['user_chart'] = [];
    $sqlChart = "SELECT DATE_FORMAT(created_at, '%m/%Y') as month_year, COUNT(*) as count 
                 FROM user WHERE role = 'user'
                 GROUP BY month_year ORDER BY created_at DESC LIMIT " . LIMIT_CHART_MONTHS;
    $resChart = $conn->query($sqlChart);
    if ($resChart) while ($row = $resChart->fetch_assoc()) $response['user_chart'][] = $row;
    $response['user_chart'] = array_reverse($response['user_chart']);

    echo json_encode(['status' => 'success', 'data' => $response]);

} catch (Exception $e) {
    // Fix #43: Trả về HTTP 500 và JSON lỗi chuẩn
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>