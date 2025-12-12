<?php
/**
 * API LẤY TỪ VỰNG CHO BÀI KIỂM TRA
 * Endpoint: api/get-quiz-words.php?course_id=1
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

require_once '../config/config.php';

try {
    // Lấy parameters
    $course_id = isset($_GET['course_id']) ? intval($_GET['course_id']) : 1;
    
    if ($course_id <= 0) {
        throw new Exception('Invalid course_id');
    }
    
    // Lấy thông tin khóa học
    $stmtCourse = $conn->prepare("SELECT course_name FROM course WHERE course_id = ?");
    $stmtCourse->bind_param("i", $course_id);
    $stmtCourse->execute();
    $courseResult = $stmtCourse->get_result();
    $courseInfo = $courseResult->fetch_assoc();
    
    if (!$courseInfo) {
        throw new Exception('Course not found');
    }
    
    // Lấy TẤT CẢ từ vựng trong khóa học
    $sql = "SELECT 
                word_id,
                word_en,
                word_vi,
                pronunciation,
                part_of_speech
            FROM word 
            WHERE course_id = ?
            ORDER BY word_id ASC";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $course_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $words = [];
    while ($row = $result->fetch_assoc()) {
        $words[] = [
            'word_id' => (int)$row['word_id'],
            'word_en' => $row['word_en'],
            'word_vi' => $row['word_vi'], // Tất cả nghĩa tiếng Việt
            'ipa' => $row['pronunciation'],
            'part_of_speech' => $row['part_of_speech']
        ];
    }
    
    $totalWords = count($words);
    
    if ($totalWords === 0) {
        throw new Exception('No words found in this course');
    }
    
    // Trả về JSON
    echo json_encode([
        'success' => true,
        'data' => [
            'course_id' => $course_id,
            'course_name' => $courseInfo['course_name'],
            'words' => $words,
            'total_words' => $totalWords
        ]
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
} finally {
    if (isset($stmt)) $stmt->close();
    if (isset($stmtCourse)) $stmtCourse->close();
    if (isset($conn)) $conn->close();
}
?>