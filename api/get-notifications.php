<?php
/**
 * API QUẢN LÝ THÔNG BÁO
 * File: api/get-notifications.php
 * 
 * Xử lý tất cả các thao tác liên quan đến thông báo:
 * - GET: Lấy danh sách thông báo (có phân trang)
 * - POST: Đánh dấu đã đọc
 * - DELETE: Xóa thông báo (xóa thật khỏi DB)
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE');

// Import config (bao gồm database và session)
require_once '../config/config.php';

// Session đã được khởi động trong config.php

// Lấy user_id từ session (tạm thời dùng default nếu chưa login)
$user_id = $_SESSION['user_id'] ?? 1; // Mặc định user 1 để test

// Xác định phương thức HTTP
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            handleGetNotifications($conn, $user_id);
            break;
        
        case 'POST':
            handleMarkAsRead($conn, $user_id);
            break;
        
        case 'DELETE':
            handleDeleteNotification($conn, $user_id);
            break;
        
        default:
            throw new Exception('Phương thức không được hỗ trợ');
    }
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}

/**
 * XỬ LÝ LẤY DANH SÁCH THÔNG BÁO
 * GET /api/get-notifications.php?page=1
 */
function handleGetNotifications($conn, $user_id) {
    // Lấy số trang từ query string (mặc định là 1)
    $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
    $per_page = 10; // Số thông báo mỗi trang
    $offset = ($page - 1) * $per_page;
    
    // Đếm tổng số thông báo chưa xóa
    $sql_count = "SELECT COUNT(*) as total FROM notification WHERE user_id = ? AND deleted_at IS NULL";
    $stmt_count = $conn->prepare($sql_count);
    $stmt_count->bind_param("i", $user_id);
    $stmt_count->execute();
    $total = $stmt_count->get_result()->fetch_assoc()['total'];
    $total_pages = ceil($total / $per_page);
    
    // Đếm số thông báo chưa đọc
    $sql_unread = "SELECT COUNT(*) as unread FROM notification WHERE user_id = ? AND is_read = 0 AND deleted_at IS NULL";
    $stmt_unread = $conn->prepare($sql_unread);
    $stmt_unread->bind_param("i", $user_id);
    $stmt_unread->execute();
    $unread_count = $stmt_unread->get_result()->fetch_assoc()['unread'];
    
    // Lấy danh sách thông báo (mới nhất trước)
    $sql = "SELECT 
                notification_id,
                title,
                content,
                type,
                is_read,
                created_at,
                read_at
            FROM notification 
            WHERE user_id = ? AND deleted_at IS NULL
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("iii", $user_id, $per_page, $offset);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $notifications = [];
    while ($row = $result->fetch_assoc()) {
        $notifications[] = [
            'id' => (int)$row['notification_id'],
            'title' => $row['title'],
            'content' => $row['content'],
            'type' => $row['type'],
            'is_read' => (bool)$row['is_read'],
            'created_at' => $row['created_at'],
            'read_at' => $row['read_at'],
            'time_ago' => formatTimeAgo($row['created_at'])
        ];
    }
    
    // Trả về JSON
    echo json_encode([
        'success' => true,
        'data' => [
            'notifications' => $notifications,
            'pagination' => [
                'current_page' => $page,
                'total_pages' => $total_pages,
                'total_items' => (int)$total,
                'per_page' => $per_page,
                'has_more' => $page < $total_pages
            ],
            'unread_count' => (int)$unread_count
        ]
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
    $stmt->close();
    $stmt_count->close();
    $stmt_unread->close();
}

/**
 * XỬ LÝ ĐÁNH DẤU ĐÃ ĐỌC
 * POST /api/get-notifications.php
 * Body: { "notification_id": 5 } hoặc { "mark_all": true }
 */
function handleMarkAsRead($conn, $user_id) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Kiểm tra xem có đánh dấu tất cả không
    if (isset($input['mark_all']) && $input['mark_all'] === true) {
        // Đánh dấu tất cả đã đọc
        $sql = "UPDATE notification 
                SET is_read = 1, read_at = NOW() 
                WHERE user_id = ? AND is_read = 0 AND deleted_at IS NULL";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        $affected = $stmt->affected_rows;
        
        echo json_encode([
            'success' => true,
            'message' => "Đã đánh dấu {$affected} thông báo là đã đọc"
        ], JSON_UNESCAPED_UNICODE);
        
    } else {
        // Đánh dấu 1 thông báo cụ thể
        $notification_id = $input['notification_id'] ?? null;
        
        if (!$notification_id) {
            throw new Exception('Thiếu notification_id');
        }
        
        $sql = "UPDATE notification 
                SET is_read = 1, read_at = NOW() 
                WHERE notification_id = ? AND user_id = ? AND deleted_at IS NULL";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ii", $notification_id, $user_id);
        $stmt->execute();
        
        if ($stmt->affected_rows === 0) {
            throw new Exception('Không tìm thấy thông báo hoặc đã được đánh dấu');
        }
        
        echo json_encode([
            'success' => true,
            'message' => 'Đã đánh dấu thông báo là đã đọc'
        ], JSON_UNESCAPED_UNICODE);
    }
    
    $stmt->close();
}

/**
 * XỬ LÝ XÓA THÔNG BÁO
 * DELETE /api/get-notifications.php
 * Body: { "notification_id": 5 } hoặc { "delete_all": true }
 */
function handleDeleteNotification($conn, $user_id) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Kiểm tra xem có xóa tất cả không
    if (isset($input['delete_all']) && $input['delete_all'] === true) {
        // Xóa tất cả thông báo (XÓA THẬT khỏi database)
        $sql = "DELETE FROM notification WHERE user_id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        $affected = $stmt->affected_rows;
        
        echo json_encode([
            'success' => true,
            'message' => "Đã xóa {$affected} thông báo"
        ], JSON_UNESCAPED_UNICODE);
        
    } else {
        // Xóa 1 thông báo cụ thể
        $notification_id = $input['notification_id'] ?? null;
        
        if (!$notification_id) {
            throw new Exception('Thiếu notification_id');
        }
        
        // Xóa thật khỏi database
        $sql = "DELETE FROM notification WHERE notification_id = ? AND user_id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ii", $notification_id, $user_id);
        $stmt->execute();
        
        if ($stmt->affected_rows === 0) {
            throw new Exception('Không tìm thấy thông báo');
        }
        
        echo json_encode([
            'success' => true,
            'message' => 'Đã xóa thông báo'
        ], JSON_UNESCAPED_UNICODE);
    }
    
    $stmt->close();
}

/**
 * HÀM FORMAT THỜI GIAN TƯƠNG ĐỐI
 * Ví dụ: "2 phút trước", "3 giờ trước", "5 ngày trước"
 */
function formatTimeAgo($datetime) {
    $now = new DateTime();
    $ago = new DateTime($datetime);
    $diff = $now->diff($ago);
    
    // Dưới 1 phút
    if ($diff->y == 0 && $diff->m == 0 && $diff->d == 0 && $diff->h == 0 && $diff->i == 0) {
        return 'Vừa xong';
    }
    
    // Dưới 1 giờ
    if ($diff->y == 0 && $diff->m == 0 && $diff->d == 0 && $diff->h == 0) {
        return $diff->i . ' phút trước';
    }
    
    // Dưới 24 giờ
    if ($diff->y == 0 && $diff->m == 0 && $diff->d == 0) {
        return $diff->h . ' giờ trước';
    }
    
    // Dưới 7 ngày
    if ($diff->y == 0 && $diff->m == 0 && $diff->d < 7) {
        return $diff->d . ' ngày trước';
    }
    
    // Từ 7 ngày trở lên: hiển thị ngày/tháng/năm
    return $ago->format('d/m/Y H:i');
}

// Đóng kết nối
$conn->close();
?>