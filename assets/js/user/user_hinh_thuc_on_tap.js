// =====================================================
// TRANG CHỌN HÌNH THỨC ÔN TẬP
// =====================================================

/**
 * Lấy tham số từ URL
 */
const urlParams = new URLSearchParams(window.location.search);
const COURSE_ID = urlParams.get('course_id') || 1;
const USER_ID = localStorage.getItem('user_id'); // Lấy từ session đã được lưu bởi auth_check.js

/**
 * Cập nhật các link với course_id và user_id
 */
function updateLinks() {
    // Link trắc nghiệm
    const tracNghiemLink = document.querySelector('.batdau_tracnghiem');
    if (tracNghiemLink) {
        tracNghiemLink.href = `user_ontap_tracnghiem.html?course_id=${COURSE_ID}&user_id=${USER_ID}`;
    }
    
    // Link điền từ
    const dienTuLink = document.querySelector('.batdau_dientu');
    if (dienTuLink) {
        dienTuLink.href = `user_ontap_dien_tu.html?course_id=${COURSE_ID}&user_id=${USER_ID}`;
    }
    
    // Link flashcard
    const flashcardLink = document.querySelector('.batdau_flashcard');
    if (flashcardLink) {
        flashcardLink.href = `user_ontap_flashcard.html?course_id=${COURSE_ID}&user_id=${USER_ID}`;
    }
}

/**
 * Kiểm tra xem người dùng đã học từ nào chưa
 */
async function checkLearnedWords() {
    try {
        const response = await fetch(
            `../../api/get-words.php?course_id=${COURSE_ID}&user_id=${USER_ID}`
        );
        
        const result = await response.json();
        
        if (result.success) {
            const learnedCount = result.data.statistics.learned;
            
            if (learnedCount === 0) {
                // Hiển thị thông báo nếu chưa học từ nào
                showNoWordsWarning();
            }
        }
    } catch (error) {
        console.error('Error checking learned words:', error);
    }
}

/**
 * Hiển thị cảnh báo chưa có từ đã học
 */
function showNoWordsWarning() {
    const warningHTML = `
        <div style="background: #FFF3CD; border: 1px solid #FFB703; border-radius: 0.5rem; padding: 1rem; margin-bottom: 1rem;">
            <p style="margin: 0; color: #856404;">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <strong>Lưu ý:</strong> Bạn chưa học từ nào trong khóa học này. 
                Vui lòng học từ trước khi ôn tập!
            </p>
            <a href="user_hoc_tu_vung.html?course_id=${COURSE_ID}&user_id=${USER_ID}" 
               style="display: inline-block; margin-top: 0.5rem; color: #856404; text-decoration: underline;">
                Bắt đầu học từ →
            </a>
        </div>
    `;
    
    const mainDiv = document.getElementById('main');
    if (mainDiv) {
        mainDiv.insertAdjacentHTML('afterbegin', warningHTML);
    }
}

// =====================================================
// INITIALIZATION
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
    updateLinks();
    checkLearnedWords();
});