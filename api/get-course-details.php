<?php
/**
 * API LẤY CHI TIẾT KHÓA HỌC (ĐÃ FIX LỖI #42, #13)
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { http_response_code(200); exit(); }

ob_start();
error_reporting(0);
ini_set('display_errors', 0);
header('Content-Type: application/json; charset=utf-8');
require_once '../config/config.php';
require_once '../includes/rate_limiter.php';
checkApiRateLimit();

$response = [];

try {
    if (!isset($conn)) throw new Exception("Lỗi kết nối Database");

    $course_id = isset($_GET['course_id']) ? intval($_GET['course_id']) : 0;
    $user_id = api_verify_user_id($_GET['user_id'] ?? null);

    // --- FIX LỖI #42: Thêm tham số phân trang ---
    $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
    $limit = isset($_GET['limit']) ? max(1, intval($_GET['limit'])) : 20; // Mặc định 20 từ/trang
    $offset = ($page - 1) * $limit;

    if ($course_id <= 0) throw new Exception('ID khóa học không hợp lệ');

    // --- PHẦN 1: LẤY THÔNG TIN KHÓA HỌC ---
    $sqlCourse = "SELECT 
                    c.course_id, c.course_name, c.description, c.create_by, c.created_at,
                    u.name as creator_name,
                    uc.status as enroll_status,
                    (SELECT COUNT(*) FROM word w WHERE w.course_id = c.course_id) as total_words,
                    (SELECT COUNT(DISTINCT lw.word_id) 
                     FROM learned_word lw 
                     JOIN word w ON lw.word_id = w.word_id 
                     WHERE lw.user_id = ? AND w.course_id = c.course_id 
                     AND lw.status IN ('learning', 'reviewing', 'mastered')) as learned_count
                  FROM course c
                  LEFT JOIN user u ON c.create_by = u.user_id
                  LEFT JOIN user_course uc ON c.course_id = uc.course_id AND uc.user_id = ?
                  WHERE c.course_id = ?";

    $stmt = $conn->prepare($sqlCourse);
    $stmt->bind_param("iii", $user_id, $user_id, $course_id);
    $stmt->execute();
    $courseInfo = $stmt->get_result()->fetch_assoc();

    if (!$courseInfo) throw new Exception('Khóa học không tồn tại');

    $isOwner = ($courseInfo['create_by'] == $user_id);
    $isJoined = !empty($courseInfo['enroll_status']);
    
    // Fix #22/#25: Tính toán lại progress chuẩn xác
    $totalWords = (int)$courseInfo['total_words'];
    $learnedCount = (int)$courseInfo['learned_count'];
    $progress = $totalWords > 0 ? round(($learnedCount / $totalWords) * 100) : 0;

    // --- PHẦN 2: LẤY DANH SÁCH TỪ VỰNG (CÓ PHÂN TRANG) ---
    // Fix #42: Thêm LIMIT và OFFSET
    $sqlWords = "SELECT word_id, word_en, word_vi, definition, pronunciation, audio_file, part_of_speech 
                 FROM word 
                 WHERE course_id = ? 
                 ORDER BY word_id ASC
                 LIMIT ? OFFSET ?";
    
    $stmtWord = $conn->prepare($sqlWords);
    $stmtWord->bind_param("iii", $course_id, $limit, $offset);
    $stmtWord->execute();
    $resWords = $stmtWord->get_result();

    $words = [];
    while ($row = $resWords->fetch_assoc()) {
        $words[] = [
            'word_id' => $row['word_id'],
            'word_en' => $row['word_en'],
            'word_vi' => $row['word_vi'],
            'definition' => $row['definition'] ?? '',
            'pronunciation' => $row['pronunciation'] ?? '',
            'audio_file' => $row['audio_file'] ?? '',
            'part_of_speech' => $row['part_of_speech'] ?? ''
        ];
    }

    // Tính tổng số trang
    $totalPages = ceil($totalWords / $limit);

    $response = [
        'success' => true,
        'data' => [
            'info' => [
                'id' => $courseInfo['course_id'],
                'tieuDe' => $courseInfo['course_name'],
                'mota' => $courseInfo['description'] ?? 'Không có mô tả',
                'nguoiTao' => $isOwner ? 'Bạn' : ($courseInfo['creator_name'] ?? 'Unknown'),
                'soTu' => $totalWords,
                'daHoc' => $learnedCount,
                'tienDo' => $progress,
                'trangThai' => $courseInfo['enroll_status'] ?? 'not_joined',
                'isOwner' => $isOwner,
                'isJoined' => $isJoined
            ],
            'words' => $words,
            'pagination' => [
                'current_page' => $page,
                'total_pages' => $totalPages,
                'limit' => $limit
            ]
        ]
    ];

} catch (Exception $e) {
    http_response_code(400);
    $response = ['success' => false, 'error' => $e->getMessage()];
}

ob_clean();
echo json_encode($response);
exit();
?>