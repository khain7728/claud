<?php
/**
 * API XÓA TỪ VỰNG (OPTIMIZED & CLEAN)
 * Endpoint: api/delete-word.php
 * Method: POST
 */

// --- 1. CẤU HÌNH CORS ---
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// --- 2. CẤU HÌNH SYSTEM ---
ob_start();
error_reporting(0);
ini_set('display_errors', 0);
header('Content-Type: application/json; charset=utf-8');

require_once '../config/config.php';
require_once '../includes/rate_limiter.php';
checkApiRateLimit();

// Class lỗi hiển thị cho User
class ClientException extends Exception {}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        throw new Exception('Method Not Allowed');
    }

    // Lấy user_id từ hàm auth của bạn (hoặc từ input nếu test dev)
    // Giả sử hàm này trả về ID user hiện tại
    $user_id = api_require_login(); 
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Validate Input
    if (!isset($input['word_id'])) {
        throw new ClientException('Thiếu tham số word_id');
    }
    
    $word_id = intval($input['word_id']);

    if ($word_id <= 0) {
        throw new ClientException('ID từ vựng không hợp lệ');
    }

    // --- 3. KIỂM TRA QUYỀN SỞ HỮU & PERMISSION ---
    // Join bảng course để xem ai tạo ra khóa học chứa từ này và trạng thái khóa học
    $sqlCheck = "SELECT c.create_by, c.visibility 
                 FROM word w 
                 JOIN course c ON w.course_id = c.course_id 
                 WHERE w.word_id = ?";
                 
    $stmtCheck = $conn->prepare($sqlCheck);
    if (!$stmtCheck) throw new Exception("DB Error: Prepare check failed");
    
    $stmtCheck->bind_param("i", $word_id);
    $stmtCheck->execute();
    $resCheck = $stmtCheck->get_result();

    if ($resCheck->num_rows === 0) {
        throw new ClientException('Từ vựng không tồn tại hoặc đã bị xóa');
    }
    
    $row = $resCheck->fetch_assoc();
    $course_owner_id = $row['create_by'];
    $course_visibility = $row['visibility'];
    
    // Validate quyền
    $is_owner = ($course_owner_id == $user_id);
    
    // Nếu user là admin
    if (isset($_SESSION['role']) && $_SESSION['role'] === 'admin') {
        // Admin chỉ được xóa từ vựng nếu: (1) Admin tạo khóa học, HOẶC (2) Khóa học công khai của user
        $is_admin_owner = ($course_owner_id == $user_id);
        $is_public = ($course_visibility === 'public');
        
        if (!$is_admin_owner && !$is_public) {
            throw new ClientException('Admin không thể xóa từ vựng trong khóa học riêng tư của người dùng.');
        }
    } else {
        // User thường chỉ được xóa từ khóa học của mình
        if (!$is_owner) {
            throw new ClientException('Bạn không có quyền xóa từ này (chỉ chủ khóa học mới được xóa)');
        }
    }
    $stmtCheck->close();

    // --- 4. THỰC HIỆN XÓA (CLEAN DATA) ---
    $conn->begin_transaction();

    // A. Xóa lịch sử ôn tập (review_log) -> FIX LỖI DỮ LIỆU RÁC QUAN TRỌNG
    $delLog = $conn->prepare("DELETE FROM review_log WHERE word_id = ?");
    $delLog->bind_param("i", $word_id);
    if (!$delLog->execute()) throw new Exception("DB Error: Delete review_log failed");
    $delLog->close();

    // B. Xóa trạng thái học (learned_word)
    $delLearn = $conn->prepare("DELETE FROM learned_word WHERE word_id = ?");
    $delLearn->bind_param("i", $word_id);
    if (!$delLearn->execute()) throw new Exception("DB Error: Delete learned_word failed");
    $delLearn->close();

    // C. Xóa từ vựng (word)
    $delWord = $conn->prepare("DELETE FROM word WHERE word_id = ?");
    $delWord->bind_param("i", $word_id);
    if (!$delWord->execute()) throw new Exception("DB Error: Delete word failed");
    $delWord->close();

    $conn->commit();
    
    // Dọn buffer và trả về success
    ob_clean();
    echo json_encode(['success' => true, 'message' => 'Đã xóa từ vựng thành công']);
    exit();

} catch (ClientException $e) {
    // Lỗi do người dùng -> Trả về message chi tiết (400)
    if (isset($conn)) $conn->rollback();
    ob_clean();
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    exit();

} catch (Exception $e) {
    // Lỗi hệ thống -> Log lại và báo lỗi chung chung (500)
    if (isset($conn)) $conn->rollback();
    error_log("[delete-word.php] ERROR: " . $e->getMessage());
    
    ob_clean();
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Lỗi hệ thống khi xóa từ. Vui lòng thử lại sau.']);
    exit();
}
?>