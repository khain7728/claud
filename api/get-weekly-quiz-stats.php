<?php
/**
 * API: Lấy thống kê điểm kiểm tra theo tuần
 * Endpoint: api/get-weekly-quiz-stats.php
 * Method: GET
 * Params: user_id
 */

error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

ob_start();

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../config/config.php';

try {
    $user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;
    
    if ($user_id <= 0) {
        throw new Exception('Invalid user_id');
    }

    // Lấy điểm trung bình theo từng ngày trong tuần (7 ngày gần nhất)
    $sql = "SELECT 
                DATE(completed_at) as quiz_date,
                AVG(score) as avg_score,
                COUNT(*) as quiz_count
            FROM review_session
            WHERE user_id = ?
            AND DATE(completed_at) >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
            AND DATE(completed_at) <= CURDATE()
            GROUP BY DATE(completed_at)
            ORDER BY quiz_date ASC";
    
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception('Database error: ' . $conn->error);
    }
    
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    // Tạo mảng 7 ngày với giá trị mặc định
    $weekData = [];
    for ($i = 6; $i >= 0; $i--) {
        $date = date('Y-m-d', strtotime("-$i days"));
        $dayOfWeek = date('N', strtotime($date)); // 1=Thứ 2, 7=Chủ nhật
        $weekData[$date] = [
            'date' => $date,
            'day_of_week' => $dayOfWeek,
            'day_name' => getDayName($dayOfWeek),
            'avg_score' => 0,
            'quiz_count' => 0
        ];
    }
    
    // Điền dữ liệu thực tế
    while ($row = $result->fetch_assoc()) {
        $date = $row['quiz_date'];
        if (isset($weekData[$date])) {
            $weekData[$date]['avg_score'] = round($row['avg_score'], 1);
            $weekData[$date]['quiz_count'] = (int)$row['quiz_count'];
        }
    }
    
    $stmt->close();
    $conn->close();
    
    $response = [
        'success' => true,
        'data' => array_values($weekData)
    ];
    
    ob_clean();
    echo json_encode($response);

} catch (Exception $e) {
    http_response_code(500);
    $errorResponse = [
        'success' => false,
        'error' => $e->getMessage()
    ];
    error_log("[get-weekly-quiz-stats] Error: " . $e->getMessage());
    ob_clean();
    echo json_encode($errorResponse);
}

ob_end_flush();

/**
 * Chuyển số ngày thành tên ngày tiếng Việt
 */
function getDayName($dayOfWeek) {
    $days = [
        1 => 'Thứ 2',
        2 => 'Thứ 3',
        3 => 'Thứ 4',
        4 => 'Thứ 5',
        5 => 'Thứ 6',
        6 => 'Thứ 7',
        7 => 'Chủ nhật'
    ];
    return $days[$dayOfWeek] ?? '';
}
?>
