<?php
/**
 * CÁC HẰNG SỐ
 * Define các hằng số sử dụng trong toàn bộ project
 * ⭐ FILE CẤU HÌNH MẶC ĐỊNH - KHÔNG CHỈNH SỬA
 * 
 * Dựa trên cấu trúc database: english_learning
 * Tạo ngày: 08/11/2025
 */

// ========================================
// VAI TRÒ NGƯỜI DÙNG (user.role)
// ========================================
define('ROLE_USER', 'user');        // Người dùng thường
define('ROLE_ADMIN', 'admin');      // Quản trị viên

// ========================================
// TRẠNG THÁI TÀI KHOẢN (user.status)
// ========================================
define('STATUS_ACTIVE', 1);         // Đang hoạt động
define('STATUS_INACTIVE', 0);       // Tạm ngưng

// ========================================
// CHẾ ĐỘ HIỂN THỊ KHÓA HỌC (course.visibility)
// ========================================
define('VISIBILITY_PUBLIC', 'public');      // Công khai
define('VISIBILITY_PRIVATE', 'private');    // Riêng tư

// ========================================
// TRẠNG THÁI ẨN/HIỆN KHÓA HỌC (course.hide)
// ========================================
define('COURSE_VISIBLE', 0);        // Hiển thị khóa học
define('COURSE_HIDDEN', 1);         // Ẩn khóa học

// ========================================
// TRẠNG THÁI HỌC TỪ (learned_word.status)
// ========================================
define('WORD_NOT_LEARNED', 'not_learned');  // Chưa học
define('WORD_LEARNING', 'learning');        // Đang học
define('WORD_REVIEWING', 'reviewing');      // Đang ôn tập
define('WORD_MASTERED', 'mastered');        // Đã thành thạo

// ========================================
// CHẾ ĐỘ ÔN TẬP (learned_word.review_mode)
// ========================================
define('REVIEW_FLASHCARD', 'flashcard');            // Flashcard
define('REVIEW_MULTIPLE_CHOICE', 'multiple-choice'); // Trắc nghiệm
define('REVIEW_FILL_IN', 'fill-in');                // Điền từ

// ========================================
// LOẠI THÔNG BÁO (notification.type)
// ========================================
define('NOTIFY_SYSTEM', 'system');      // Thông báo hệ thống
define('NOTIFY_REVIEW', 'review');      // Nhắc nhở ôn tập
define('NOTIFY_QUIZ', 'quiz');          // Thông báo quiz
define('NOTIFY_CUSTOM', 'custom');      // Tùy chỉnh

// ========================================
// TRẠNG THÁI ĐỌC THÔNG BÁO (notification.is_read)
// ========================================
define('NOTIFICATION_UNREAD', 0);       // Chưa đọc
define('NOTIFICATION_READ', 1);         // Đã đọc

// ========================================
// LOẠI QUIZ (quiz.type)
// ========================================
define('QUIZ_MULTIPLE_CHOICE', 'multiple-choice');  // Trắc nghiệm
define('QUIZ_FILL_IN', 'fill-in');                 // Điền từ

// ========================================
// ĐÁP ÁN TRẮC NGHIỆM (question.correct_answer)
// ========================================
define('ANSWER_A', 'A');
define('ANSWER_B', 'B');
define('ANSWER_C', 'C');
define('ANSWER_D', 'D');

// ========================================
// TRẠNG THÁI CÂU TRẢ LỜI (result_detail.is_correct)
// ========================================
define('ANSWER_CORRECT', 1);        // Đúng
define('ANSWER_INCORRECT', 0);      // Sai

// ========================================
// CẤU HÌNH PHÂN TRANG
// ========================================
define('ITEMS_PER_PAGE', 20);           // Số item mặc định
define('COURSES_PER_PAGE', 12);         // Số khóa học mỗi trang
define('WORDS_PER_PAGE', 30);           // Số từ vựng mỗi trang
define('QUIZZES_PER_PAGE', 10);         // Số quiz mỗi trang
define('USERS_PER_PAGE', 25);           // Số users mỗi trang (admin)
define('NOTIFICATIONS_PER_PAGE', 15);   // Số thông báo mỗi trang
define('LOGS_PER_PAGE', 50);            // Số log mỗi trang (admin)

// ========================================
// CẤU HÌNH UPLOAD FILE
// ========================================
// Kích thước file
define('MAX_FILE_SIZE', 5 * 1024 * 1024);       // 5MB
define('MAX_IMAGE_SIZE', 2 * 1024 * 1024);      // 2MB (avatar)
define('MAX_AUDIO_SIZE', 10 * 1024 * 1024);     // 10MB (word.audio_file)

// Loại file được phép
define('ALLOWED_IMAGE_TYPES', ['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
define('ALLOWED_AUDIO_TYPES', ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg']);

// ========================================
// THỜI GIAN HẾT HẠN
// ========================================
define('SESSION_LIFETIME', 3600);               // 1 giờ
define('REMEMBER_ME_LIFETIME', 30 * 24 * 3600); // 30 ngày
define('RESET_PASSWORD_EXPIRE', 3600);          // 1 giờ

// ========================================
// ĐIỂM SỐ & KẾT QUẢ (result.score)
// ========================================
define('SCORE_EXCELLENT', 90);      // Điểm xuất sắc (%)
define('SCORE_GOOD', 80);           // Điểm tốt (%)
define('SCORE_PASS', 70);           // Điểm đạt (%)
define('SCORE_AVERAGE', 60);        // Điểm trung bình (%)

// ========================================
// CẤU HÌNH ÔN TẬP (review_schedule)
// ========================================
define('REVIEW_INTERVAL_MIN', 1);       // Khoảng cách tối thiểu: 1 ngày
define('REVIEW_INTERVAL_MAX', 30);      // Khoảng cách tối đa: 30 ngày
define('SUCCESS_COUNT_FOR_MASTERY', 5); // Số lần đúng liên tiếp để thành thạo

// ========================================
// THỐNG KÊ (statistic)
// ========================================
define('STREAK_BONUS_DAYS', 7);     // Số ngày học liên tiếp để được thưởng
define('MIN_ACCURACY_GOOD', 80);    // Độ chính xác tốt (%)

// ========================================
// LOẠI TỪ LOẠI (word.part_of_speech)
// ========================================
define('POS_NOUN', 'noun');             // Danh từ
define('POS_VERB', 'verb');             // Động từ
define('POS_ADJECTIVE', 'adjective');   // Tính từ
define('POS_ADVERB', 'adverb');         // Trạng từ
define('POS_PRONOUN', 'pronoun');       // Đại từ
define('POS_PREPOSITION', 'preposition'); // Giới từ
define('POS_CONJUNCTION', 'conjunction'); // Liên từ

// ========================================
// VALIDATION
// ========================================
define('MIN_PASSWORD_LENGTH', 8);       // Độ dài password tối thiểu
define('MAX_PASSWORD_LENGTH', 255);     // Độ dài password tối đa
define('MIN_USERNAME_LENGTH', 3);       // Độ dài username tối thiểu
define('MAX_USERNAME_LENGTH', 50);      // Độ dài username tối đa
define('MAX_WORD_LENGTH', 100);         // Độ dài từ vựng
define('MAX_DEFINITION_LENGTH', 1000);  // Độ dài định nghĩa

// ========================================
// LOẠI HÀNH ĐỘNG ADMIN (admin_log.action)
// ========================================
define('ACTION_ADD_COURSE', 'Thêm khóa học');
define('ACTION_ADD_WORD', 'Thêm từ vựng');
define('ACTION_UPDATE_QUIZ', 'Cập nhật quiz');
define('ACTION_CREATE_COURSE', 'Tạo khóa học');
define('ACTION_DELETE_USER', 'Xóa người dùng');
define('ACTION_BAN_USER', 'Cấm người dùng');

// ========================================
// FORMAT HIỂN THỊ
// ========================================
define('DATE_FORMAT', 'd/m/Y');                 // 08/11/2025
define('DATETIME_FORMAT', 'd/m/Y H:i:s');       // 08/11/2025 14:30:00
define('TIME_FORMAT', 'H:i');                   // 14:30

// ========================================
// CẤU HÌNH HỌC TẬP
// ========================================
define('WORDS_PER_LESSON', 10);         // Số từ mỗi bài học
define('DAILY_GOAL_DEFAULT', 20);       // Mục tiêu mỗi ngày (từ)
define('MAX_QUIZ_ATTEMPTS', 3);         // Số lần làm quiz tối đa/ngày

// ========================================
// THÔNG BÁO MESSAGE
// ========================================
define('MSG_SUCCESS', 'success');   // Thành công
define('MSG_ERROR', 'error');       // Lỗi
define('MSG_WARNING', 'warning');   // Cảnh báo
define('MSG_INFO', 'info');         // Thông tin

// ========================================
// MÃ LỖI
// ========================================
define('ERR_DB_CONNECTION', 'E001');        // Lỗi kết nối DB
define('ERR_LOGIN_FAILED', 'E002');         // Đăng nhập thất bại
define('ERR_PERMISSION_DENIED', 'E003');    // Không có quyền
define('ERR_INVALID_INPUT', 'E004');        // Dữ liệu không hợp lệ
define('ERR_FILE_UPLOAD', 'E005');          // Lỗi upload
define('ERR_NOT_FOUND', 'E006');            // Không tìm thấy

?>
