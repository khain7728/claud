<?php
/**
 * API LẤY DANH SÁCH TỪ VỰNG
 * Endpoint: api/get-words.php?course_id=1&user_id=1
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

// Import config (includes session & functions)
require_once '../config/config.php';
require_once '../includes/rate_limiter.php';
checkApiRateLimit();

try {
    // BẢO MẬT: Lấy user_id từ session
    $user_id = api_verify_user_id($_GET['user_id'] ?? null);
    
    // Lấy course_id từ URL
    $course_id = isset($_GET['course_id']) ? intval($_GET['course_id']) : 0;
    
    // Validate input
    if ($course_id <= 0 || $user_id <= 0) {
        throw new Exception('Invalid course_id or user_id');
    }
    
    // Lấy thông tin khóa học
    $statementGetWords = $conn->prepare("SELECT course_name, description FROM course WHERE course_id = ?");
    $statementGetWords->bind_param("i", $course_id);
    $statementGetWords->execute();
    $courseResult = $statementGetWords->get_result();
    $courseInfo = $courseResult->fetch_assoc();
    
    if (!$courseInfo) {
        throw new Exception('Course not found');
    }
    
    // Lấy danh sách từ vựng của khóa học
    $sql = "SELECT 
                w.word_id,
                w.word_en,
                w.word_vi,
                w.definition,
                w.pronunciation,
                w.audio_file,
                w.part_of_speech,
                COALESCE(lw.status, 'not_learned') as learned_status,
                COALESCE(lw.learning_progress, 0) as learning_progress,
                COALESCE(lw.current_position, 0) as current_position
            FROM word w
            LEFT JOIN learned_word lw ON w.word_id = lw.word_id AND lw.user_id = ?
            WHERE w.course_id = ?
            ORDER BY w.word_id ASC";
    
    $statementGetWords = $conn->prepare($sql);
    $statementGetWords->bind_param("ii", $user_id, $course_id);
    $statementGetWords->execute();
    $vocabularyResult = $statementGetWords->get_result();
    
    $words = [];
    while ($row = $vocabularyResult->fetch_assoc()) {
        // FIX BUG: Tính learned khi status là learning, reviewing hoặc mastered
        $isLearned = in_array($row['learned_status'], ['learning', 'reviewing', 'mastered']);
        
        $words[] = [
            'word_id' => (int)$row['word_id'],
            'word' => $row['word_en'],
            'meaning' => $row['word_vi'],
            'definition' => $row['definition'],
            'ipa' => $row['pronunciation'],
            'audio' => $row['audio_file'],
            'part_of_speech' => $row['part_of_speech'],
            'learned' => $isLearned,
            'status' => $row['learned_status'],
            'progress' => (int)$row['learning_progress'],
            'position' => (int)$row['current_position']
        ];
    }
    
    // Tính thống kê
    $learnedCount = count(array_filter($words, function($w) { 
        return $w['learned']; 
    }));
    $totalWords = count($words);
    $progressPercent = $totalWords > 0 ? round(($learnedCount / $totalWords) * 100) : 0;
    
    // Trả về JSON
    echo json_encode([
        'success' => true,
        'data' => [
            'course_id' => $course_id,
            'course_name' => $courseInfo['course_name'],
            'course_description' => $courseInfo['description'],
            'user_id' => $user_id,
            'words' => $words,
            'statistics' => [
                'total' => $totalWords,
                'learned' => $learnedCount,
                'remaining' => $totalWords - $learnedCount,
                'progress' => $progressPercent
            ]
        ]
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
} finally {
    if (isset($statementGetWords)) $statementGetWords->close();
    if (isset($conn)) $conn->close();
}
?>