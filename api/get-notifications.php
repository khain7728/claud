<?php
ob_start();
error_reporting(0);
ini_set('display_errors', 0);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE');

try {
    require_once '../config/config.php';
    
    if (!isset($_SESSION['user_id'])) {
        throw new Exception('Chưa đăng nhập', 401);
    }
    
    $user_id = $_SESSION['user_id'];
    $method = $_SERVER['REQUEST_METHOD'];

    switch ($method) {
        case 'GET':
            handleGetNotifications($conn, $user_id);
            break;
        
        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            if (isset($input['action']) && $input['action'] === 'delete') {
                handleDeleteNotification($conn, $user_id);
            } else {
                handleMarkAsRead($conn, $user_id);
            }
            break;
        
        case 'DELETE':
            handleDeleteNotification($conn, $user_id);
            break;
        
        default:
            throw new Exception('Phương thức không được hỗ trợ');
    }
    
} catch (Exception $e) {
    ob_clean();
    $code = $e->getCode() ?: 400;
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}

function handleGetNotifications($conn, $user_id) {
    $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
    $per_page = 10;
    $offset = ($page - 1) * $per_page;
    
    $sql_count = "SELECT COUNT(*) as total FROM notification WHERE user_id = ? AND deleted_at IS NULL";
    $stmt_count = $conn->prepare($sql_count);
    $stmt_count->bind_param("i", $user_id);
    $stmt_count->execute();
    $total = $stmt_count->get_result()->fetch_assoc()['total'];
    $total_pages = ceil($total / $per_page);
    
    $sql_unread = "SELECT COUNT(*) as unread FROM notification WHERE user_id = ? AND is_read = 0 AND deleted_at IS NULL";
    $stmt_unread = $conn->prepare($sql_unread);
    $stmt_unread->bind_param("i", $user_id);
    $stmt_unread->execute();
    $unread_count = $stmt_unread->get_result()->fetch_assoc()['unread'];
    
    $sql = "SELECT notification_id, title, content, type, is_read, created_at, read_at
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
    
    ob_clean();
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
    ], JSON_UNESCAPED_UNICODE);
    
    $stmt->close();
    $stmt_count->close();
    $stmt_unread->close();
}

function handleMarkAsRead($conn, $user_id) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (isset($input['mark_all']) && $input['mark_all'] === true) {
        $sql = "UPDATE notification SET is_read = 1, read_at = NOW() WHERE user_id = ? AND is_read = 0 AND deleted_at IS NULL";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        $affected = $stmt->affected_rows;
        
        ob_clean();
        echo json_encode([
            'success' => true,
            'message' => "Đã đánh dấu {$affected} thông báo là đã đọc"
        ], JSON_UNESCAPED_UNICODE);
        
    } else {
        $notification_id = $input['notification_id'] ?? null;
        
        if (!$notification_id) {
            throw new Exception('Thiếu notification_id');
        }
        
        $sql = "UPDATE notification SET is_read = 1, read_at = NOW() WHERE notification_id = ? AND user_id = ? AND deleted_at IS NULL";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ii", $notification_id, $user_id);
        $stmt->execute();
        
        if ($stmt->affected_rows === 0) {
            throw new Exception('Không tìm thấy thông báo hoặc đã được đánh dấu');
        }
        
        ob_clean();
        echo json_encode([
            'success' => true,
            'message' => 'Đã đánh dấu thông báo là đã đọc'
        ], JSON_UNESCAPED_UNICODE);
    }
    
    $stmt->close();
}

function handleDeleteNotification($conn, $user_id) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (isset($input['delete_all']) && $input['delete_all'] === true) {
        $sql = "DELETE FROM notification WHERE user_id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        $affected = $stmt->affected_rows;
        
        ob_clean();
        echo json_encode([
            'success' => true,
            'message' => "Đã xóa {$affected} thông báo"
        ], JSON_UNESCAPED_UNICODE);
        
    } else {
        $notification_id = $input['notification_id'] ?? null;
        
        if (!$notification_id) {
            throw new Exception('Thiếu notification_id');
        }
        
        $sql = "DELETE FROM notification WHERE notification_id = ? AND user_id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ii", $notification_id, $user_id);
        $stmt->execute();
        
        if ($stmt->affected_rows === 0) {
            throw new Exception('Không tìm thấy thông báo');
        }
        
        ob_clean();
        echo json_encode([
            'success' => true,
            'message' => 'Đã xóa thông báo'
        ], JSON_UNESCAPED_UNICODE);
    }
    
    $stmt->close();
}

function formatTimeAgo($datetime) {
    $now = new DateTime();
    $ago = new DateTime($datetime);
    $diff = $now->diff($ago);
    
    if ($diff->y == 0 && $diff->m == 0 && $diff->d == 0 && $diff->h == 0 && $diff->i == 0) {
        return 'Vừa xong';
    }
    
    if ($diff->y == 0 && $diff->m == 0 && $diff->d == 0 && $diff->h == 0) {
        return $diff->i . ' phút trước';
    }
    
    if ($diff->y == 0 && $diff->m == 0 && $diff->d == 0) {
        return $diff->h . ' giờ trước';
    }
    
    if ($diff->y == 0 && $diff->m == 0 && $diff->d < 7) {
        return $diff->d . ' ngày trước';
    }
    
    return $ago->format('d/m/Y H:i');
}

if (isset($conn)) {
    $conn->close();
}
?>