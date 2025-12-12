// =====================================================
// FLASHCARD VOCABULARY LEARNING - DATABASE VERSION
// =====================================================

// Khởi tạo các phần tử DOM
const soluonghientai = document.getElementById('soluonghientai');
const soluongtuvung = document.getElementById('soluongtuvung');
const frame = document.getElementById('frame_flashcard');
const btnPrev = document.querySelector('.fa-chevron-left');
const btnNext = document.querySelector('.fa-chevron-right');
const btnPhatAm = document.getElementById('phatam');
const btnDanhDauDaHoc = document.getElementById('btn_danhdaudahoc');
const btnLuyenTap = document.getElementById('btn_luyentap');

// Thống kê
const daHocElement = document.getElementById('dahoc');
const conLaiElement = document.getElementById('conlai');
const tienDoElement = document.getElementById('tiendo');

// =====================================================
// CONFIGURATION
// =====================================================
const API_BASE_URL = '../../api'; // Đường dẫn đến thư mục API

// FIX #14: Validate course_id từ URL
const urlParams = new URLSearchParams(window.location.search);
const COURSE_ID = urlParams.get('course_id');
const USER_ID = localStorage.getItem('user_id');

// Kiểm tra course_id hợp lệ
if (!COURSE_ID || isNaN(COURSE_ID) || parseInt(COURSE_ID) <= 0) {
    alert('Mã khóa học không hợp lệ!');
    window.location.href = 'khoa_hoc_cua_toi.html?user_id=' + USER_ID;
}

// =====================================================
// STATE MANAGEMENT
// =====================================================
let vocabularyData = []; // Dữ liệu từ vựng từ database
let current = 0;
let total = 0;
let learnedCount = 0;
let isLoading = false;
let currentAudio = null; // FIX #40: Track audio hiện tại để tránh conflict

// =====================================================
// API FUNCTIONS
// =====================================================

/**
 * Lấy danh sách từ vựng từ API
 */
async function fetchVocabulary() {
    try {
        isLoading = true;
        showLoading();

        const response = await fetch(
            `${API_BASE_URL}/get-words.php?course_id=${COURSE_ID}&user_id=${USER_ID}`
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
            // FIX #14: Xử lý lỗi khóa học không tồn tại hoặc không có quyền
            if (result.error === 'COURSE_NOT_FOUND') {
                alert('Khóa học không tồn tại!');
                window.location.href = 'khoa_hoc_cua_toi.html?user_id=' + USER_ID;
                return;
            }
            if (result.error === 'ACCESS_DENIED') {
                alert('Bạn chưa tham gia khóa học này!');
                window.location.href = 'khoa_hoc_cong_dong.html?user_id=' + USER_ID;
                return;
            }
            throw new Error(result.error || 'Failed to fetch vocabulary');
        }

        // Lưu dữ liệu
        vocabularyData = result.data.words;
        
        // Sắp xếp: Từ chưa học (learned = false) lên đầu, từ đã học (learned = true) xuống cuối
        vocabularyData.sort((a, b) => {
            if (a.learned === b.learned) return 0;
            return a.learned ? 1 : -1; // false lên trước, true xuống sau
        });
        
        total = vocabularyData.length;
        learnedCount = result.data.statistics.learned;

        // Cập nhật tiêu đề trang với tên khóa học
        document.getElementById('tieu_de_trang').textContent = 
            `Học từ vựng - ${result.data.course_name}`;

        hideLoading();
        
        if (total === 0) {
            showError('Khóa học này chưa có từ vựng nào!');
            isLoading = false; // Reset isLoading trước khi return
            return;
        }

        // FIX: Set isLoading = false TRƯỚC khi updateUI để button không bị disable
        isLoading = false;
        updateUI();

    } catch (error) {
        console.error('Error fetching vocabulary:', error);
        hideLoading();
        showError('Không thể tải dữ liệu từ vựng. Vui lòng thử lại!');
        isLoading = false;
    }
}

/**
 * Cập nhật trạng thái đã học lên server
 */
async function updateLearnedStatus(wordId, learned) {
    try {
        const response = await fetch(`${API_BASE_URL}/update-learned-word.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                word_id: wordId,
                learned: learned
            })
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Failed to update status');
        }

        return result;

    } catch (error) {
        console.error('Error updating learned status:', error);
        showError('Không thể cập nhật trạng thái. Vui lòng thử lại!');
        return null;
    }
}

// =====================================================
// UI UPDATE FUNCTIONS
// =====================================================

/**
 * Cập nhật giao diện
 */
function updateUI() {
    if (vocabularyData.length === 0) return;

    const currentVocab = vocabularyData[current];

    // Cập nhật nội dung flashcard
    document.getElementById('noidung_tuvung').textContent = currentVocab.word;
    document.getElementById('ipa').textContent = currentVocab.ipa || '';
    document.getElementById('dinhnghia').textContent = currentVocab.definition || '';
    document.getElementById('ynghia').textContent = currentVocab.meaning;

    // Ẩn IPA nếu không có
    const ipaElement = document.getElementById('ipa');
    ipaElement.style.display = currentVocab.ipa ? 'block' : 'none';

    // Cập nhật thanh tiến độ
    soluongtuvung.textContent = `${current + 1}/${total}`;
    soluonghientai.style.width = `${((current + 1) / total) * 100}%`;

    // Cập nhật thống kê
    daHocElement.textContent = learnedCount;
    conLaiElement.textContent = total - learnedCount;
    tienDoElement.textContent = `${Math.round((learnedCount / total) * 100)}%`;

    // Cập nhật nút đánh dấu đã học
    if (currentVocab.learned) {
        btnDanhDauDaHoc.textContent = "Đã học ✓";
        btnDanhDauDaHoc.style.backgroundColor = "#7BB7EE";
        btnDanhDauDaHoc.style.color = "white";
    } else {
        btnDanhDauDaHoc.textContent = "Đánh dấu đã học";
        btnDanhDauDaHoc.style.backgroundColor = "white";
        btnDanhDauDaHoc.style.color = "black";
    }

    // FIX #34: Enable/Disable button dựa trên isLoading
    btnDanhDauDaHoc.disabled = isLoading;
    btnDanhDauDaHoc.style.opacity = isLoading ? '0.5' : '1';
    btnDanhDauDaHoc.style.cursor = isLoading ? 'not-allowed' : 'pointer';

    // Đảm bảo flashcard ở mặt trước
    frame.classList.remove('flipped');

    // Disable/Enable navigation buttons
    btnPrev.style.opacity = current > 0 ? '1' : '0.3';
    btnPrev.style.cursor = current > 0 ? 'pointer' : 'not-allowed';
    btnNext.style.opacity = current < total - 1 ? '1' : '0.3';
    btnNext.style.cursor = current < total - 1 ? 'pointer' : 'not-allowed';
}

/**
 * Hiển thị loading
 */
function showLoading() {
    document.getElementById('main').style.opacity = '0.5';
    document.getElementById('main').style.pointerEvents = 'none';
}

/**
 * Ẩn loading
 */
function hideLoading() {
    document.getElementById('main').style.opacity = '1';
    document.getElementById('main').style.pointerEvents = 'auto';
}

/**
 * Hiển thị thông báo lỗi
 */
function showError(message) {
    alert(message); // Có thể thay bằng modal đẹp hơn
}

/**
 * Hiển thị thông báo thành công
 */
function showSuccess(message) {
    // Tạo toast notification
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 2000);
}

// =====================================================
// NAVIGATION FUNCTIONS
// =====================================================

/**
 * Chuyển đến từ tiếp theo
 */
function nextCard() {
    if (current < total - 1) {
        current++;
        updateUI();
    }
}

/**
 * Quay lại từ trước đó
 */
function prevCard() {
    if (current > 0) {
        current--;
        updateUI();
    }
}

/**
 * Đánh dấu đã học
 * FIX #6 + #34: Thêm lock để tránh race condition và disable button
 */
async function toggleLearned() {
    if (isLoading) return;

    // FIX #6: Khóa ngay để tránh race condition
    isLoading = true;
    const currentVocab = vocabularyData[current];
    const newLearnedState = !currentVocab.learned;

    // Cập nhật UI ngay lập tức (optimistic update)
    currentVocab.learned = newLearnedState;
    if (newLearnedState) {
        learnedCount++;
    } else {
        learnedCount--;
    }
    updateUI();

    // Gửi request lên server
    const result = await updateLearnedStatus(currentVocab.word_id, newLearnedState);

    if (!result) {
        // Rollback nếu lỗi
        currentVocab.learned = !newLearnedState;
        if (newLearnedState) {
            learnedCount--;
        } else {
            learnedCount++;
        }
    }
    
    // FIX #6: Mở khóa sau khi hoàn thành
    isLoading = false;
    updateUI();
}

/**
 * Phát âm từ (Text-to-Speech hoặc Audio file)
 * FIX #40: Tránh conflict khi phát nhiều audio cùng lúc
 */
async function speakWord() {
    const currentVocab = vocabularyData[current];

    // FIX #40: Cancel audio/TTS cũ trước khi phát mới
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }
    
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }

    // Nếu có audio file, phát từ file
    if (currentVocab.audio) {
        try {
            currentAudio = new Audio(currentVocab.audio);
            
            // Cleanup khi phát xong
            currentAudio.addEventListener('ended', () => {
                currentAudio = null;
            });
            
            // Cleanup nếu có lỗi
            currentAudio.addEventListener('error', () => {
                currentAudio = null;
            });
            
            await currentAudio.play();
            return;
        } catch (error) {
            // console.log('Audio file failed, fallback to TTS:', error);
            currentAudio = null;
        }
    }

    // Fallback: Dùng Text-to-Speech của browser
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(currentVocab.word);
        utterance.lang = 'en-US';
        utterance.rate = 0.8;
        window.speechSynthesis.speak(utterance);
    } else {
        showError('Trình duyệt của bạn không hỗ trợ phát âm!');
    }
}

// =====================================================
// EVENT LISTENERS
// =====================================================

// Lật thẻ khi click vào flashcard
frame.addEventListener('click', () => {
    frame.classList.toggle('flipped');
});

// Nút điều khiển
btnPrev.addEventListener('click', (e) => {
    e.stopPropagation();
    prevCard();
});

btnNext.addEventListener('click', (e) => {
    e.stopPropagation();
    nextCard();
});

// Nút phát âm
btnPhatAm.addEventListener('click', (e) => {
    e.stopPropagation();
    speakWord();
});

// Nút đánh dấu đã học
btnDanhDauDaHoc.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleLearned();
});

// Nút luyện tập
btnLuyenTap.addEventListener('click', (e) => {
    e.stopPropagation();
    
    // Kiểm tra điều kiện: phải học ít nhất 2 từ
    if (learnedCount < 2) {
        alert('Bạn cần học ít nhất 2 từ vựng trước khi có thể ôn tập!\n\nHãy đánh dấu thêm từ là "Đã học" để mở khóa tính năng này.');
        return;
    }
    
    window.location.href = `user_hinh_thuc_on_tap.html?course_id=${COURSE_ID}&user_id=${USER_ID}`;
});

// Hỗ trợ phím tắt
document.addEventListener('keydown', (e) => {
    switch (e.key) {
        case 'ArrowLeft':
            prevCard();
            break;
        case 'ArrowRight':
            nextCard();
            break;
        case ' ':
            e.preventDefault();
            frame.classList.toggle('flipped');
            break;
        case 's':
        case 'S':
            speakWord();
            break;
        case 'm':
        case 'M':
            toggleLearned();
            break;
    }
});

// =====================================================
// INITIALIZATION
// =====================================================

// Tải dữ liệu khi trang được load
document.addEventListener('DOMContentLoaded', () => {
    fetchVocabulary();
});

// CSS cho toast animation (thêm vào head)
const style = document.createElement('style');
style.textContent = `
@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}
`;
document.head.appendChild(style);