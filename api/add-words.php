<?php
/*
 * API:  add-words.php
 * Chức năng: Xử lý Lưu danh sách từ vựng.
 * - Logic: Upsert (Nếu có ID thì Update, chưa có thì Insert).
 * - Bảo mật: Output Buffering, Transaction, Prepared Statements.
 */

// [QUAN TRỌNG] Bắt đầu bộ đệm.
ob_start();

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    ob_end_clean(); 
    http_response_code(200);
    exit();
}

// Tắt hiển thị lỗi ra màn hình để bảo vệ JSON
ini_set('display_errors', 0);
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');
require_once '../config/config.php';
require_once '../includes/rate_limiter.php';
checkApiRateLimit();

$response = [];

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Method Not Allowed');
    }

    // 1. User phải login
    $user_id = api_require_login(); 
    
    // 2. Nhận dữ liệu
    $raw_input = file_get_contents('php://input');
    $input = json_decode($raw_input, true);
    
    if (json_last_error() !== JSON_ERROR_NONE || is_null($input)) {
        throw new Exception('Dữ liệu gửi lên không đúng định dạng JSON.');
    }

    $course_id = isset($input['course_id']) ? intval($input['course_id']) : 0;
    $words = isset($input['words']) ? $input['words'] : [];

    if ($course_id <= 0) throw new Exception('ID khóa học không hợp lệ.');
    
    // Validate số lượng từ (tùy nhu cầu, ở đây giữ nguyên logic cũ của bạn)
    if (!is_array($words) || count($words) < 1) { // Sửa thành < 1 để cho phép sửa lẻ tẻ, hoặc giữ < 3 tùy bạn
         // throw new Exception('Cần tối thiểu 3 từ.'); 
    }

    // 3. Check Ownership & Permission (Quyền chỉnh sửa từ vựng)
    $checkOwnerSql = "SELECT create_by, visibility FROM course WHERE course_id = ?";
    $stmtOwner = $conn->prepare($checkOwnerSql);
    $stmtOwner->bind_param("i", $course_id); 
    $stmtOwner->execute();
    $result = $stmtOwner->get_result();
    
    if ($result->num_rows === 0) {
        $stmtOwner->close();
        throw new Exception("Khóa học không tồn tại.");
    }
    
    $course = $result->fetch_assoc();
    $stmtOwner->close();
    
    // Kiểm tra quyền chỉnh sửa từ vựng
    $is_owner = ($course['create_by'] == $user_id);
    $is_public = ($course['visibility'] === 'public');
    
    // Nếu user là admin
    if (isset($_SESSION['role']) && $_SESSION['role'] === 'admin') {
        // Admin chỉ được chỉnh sửa nếu: (1) Admin tạo khóa học, HOẶC (2) Khóa học công khai của user
        $is_admin_owner = ($course['create_by'] == $user_id);
        if (!$is_admin_owner && !$is_public) {
            throw new Exception("Admin không thể chỉnh sửa từ vựng trong khóa học riêng tư của người dùng.");
        }
    } else {
        // User thường chỉ được sửa khóa học của mình
        if (!$is_owner) {
            throw new Exception("Bạn không có quyền chỉnh sửa khóa học này.");
        }
    }

    // 4. Transaction & Prepare Statements
    $conn->begin_transaction();

    // --- A. Lệnh INSERT (Cho từ mới) ---
    $sqlInsert = "INSERT INTO word (course_id, word_en, word_vi, pronunciation, part_of_speech, definition, audio_file) VALUES (?, ?, ?, ?, ?, ?, ?)";
    $stmtInsert = $conn->prepare($sqlInsert);

    // --- B. Lệnh UPDATE (Cho từ cũ - Đã có ID) ---
    // Lưu ý: Thêm điều kiện AND course_id = ? để bảo mật, tránh sửa nhầm sang khóa học khác
    $sqlUpdate = "UPDATE word SET word_en=?, word_vi=?, pronunciation=?, part_of_speech=?, definition=?, audio_file=? WHERE word_id=? AND course_id=?";
    $stmtUpdate = $conn->prepare($sqlUpdate);

    if (!$stmtInsert || !$stmtUpdate) {
        throw new Exception("Lỗi hệ thống (Prepare SQL Failed).");
    }

    // Khai báo biến bind param
    $b_course_id = $course_id;
    $b_word_en = ""; $b_word_vi = ""; $b_pronunciation = "";
    $b_part_of_speech = ""; $b_definition = ""; $b_audio_file = "";
    $b_word_id = 0;

    // Bind cho Insert
    $stmtInsert->bind_param("issssss", 
        $b_course_id, $b_word_en, $b_word_vi, $b_pronunciation, 
        $b_part_of_speech, $b_definition, $b_audio_file
    );

    // Bind cho Update (Thứ tự: en, vi, pro, pos, def, aud, word_id, course_id)
    $stmtUpdate->bind_param("ssssssii", 
        $b_word_en, $b_word_vi, $b_pronunciation, 
        $b_part_of_speech, $b_definition, $b_audio_file, 
        $b_word_id, $b_course_id
    );

    $insertCount = 0;
    $updateCount = 0;

    foreach ($words as $index => $w) {
        // Map dữ liệu từ JS sang biến PHP
        // Lưu ý: Key ở đây phải khớp với key mà JS gửi lên (tiengAnh, nghia...)
        $b_word_en = isset($w['tiengAnh']) ? trim($w['tiengAnh']) : (isset($w['word_en']) ? trim($w['word_en']) : '');
        $b_word_vi = isset($w['nghia']) ? trim($w['nghia']) : (isset($w['word_vi']) ? trim($w['word_vi']) : '');
        
        if (empty($b_word_en) || empty($b_word_vi)) continue;

        // Validation độ dài
        if (mb_strlen($b_word_en, 'UTF-8') > 100 || mb_strlen($b_word_vi, 'UTF-8') > 255) {
             throw new Exception("Từ vựng '$b_word_en' quá dài.");
        }

        // Loại từ
        $raw_pos = isset($w['tuLoai']) ? trim($w['tuLoai']) : (isset($w['part_of_speech']) ? trim($w['part_of_speech']) : '');
        if (mb_strlen($raw_pos, 'UTF-8') > 50) $raw_pos = mb_substr($raw_pos, 0, 50, 'UTF-8');
        $b_part_of_speech = $raw_pos;

        // Audio Link
        $raw_audio = isset($w['linkAm']) ? trim($w['linkAm']) : (isset($w['audio_file']) ? trim($w['audio_file']) : '');
        if (!empty($raw_audio) && strpos($raw_audio, 'http') === 0 && !filter_var($raw_audio, FILTER_VALIDATE_URL)) {
            $raw_audio = ''; 
        }
        $b_audio_file = $raw_audio;

        $b_pronunciation = isset($w['phienAm']) ? trim($w['phienAm']) : (isset($w['pronunciation']) ? trim($w['pronunciation']) : '');
        $b_definition    = isset($w['moTa']) ? trim($w['moTa']) : (isset($w['definition']) ? trim($w['definition']) : '');

        // --- QUAN TRỌNG: Kiểm tra ID để quyết định Update hay Insert ---
        // JS có thể gửi 'id' hoặc 'word_id'
        $id_from_input = isset($w['id']) ? intval($w['id']) : (isset($w['word_id']) ? intval($w['word_id']) : 0);
        
        if ($id_from_input > 0) {
            // ==> XỬ LÝ UPDATE
            $b_word_id = $id_from_input;
            if (!$stmtUpdate->execute()) {
                throw new Exception("Lỗi cập nhật từ: '$b_word_en'");
            }
            // Kiểm tra xem có dòng nào thực sự được cập nhật không (optional)
            // if ($stmtUpdate->affected_rows > 0) $updateCount++;
            $updateCount++; 
        } else {
            // ==> XỬ LÝ INSERT (Thêm mới)
            if (!$stmtInsert->execute()) {
                throw new Exception("Lỗi thêm mới từ: '$b_word_en'");
            }
            $insertCount++;
        }
    }

    $conn->commit();
    $stmtInsert->close();
    $stmtUpdate->close();

    $response = [
        'success' => true,
        'message' => "Hoàn tất! Thêm mới: $insertCount, Cập nhật: $updateCount.",
        'inserted' => $insertCount,
        'updated' => $updateCount
    ];

} catch (Exception $e) {
    if (isset($conn)) $conn->rollback();
    $response = ['success' => false, 'error' => $e->getMessage()];
} finally {
    if (isset($conn)) $conn->close();

    // [QUAN TRỌNG] Xóa sạch bộ đệm
    ob_end_clean(); 
    
    // Trả về JSON
    echo json_encode($response);
}
?>