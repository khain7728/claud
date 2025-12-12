// =====================================================
// ÔN TẬP ĐIỀN TỪ - DATABASE VERSION
// =====================================================

// =====================================================
// CONFIGURATION & DOM ELEMENTS
// =====================================================
const API_BASE_URL = '../../api';

const urlParams = new URLSearchParams(window.location.search);
const COURSE_ID = urlParams.get('course_id') || 1;
const USER_ID = localStorage.getItem('user_id'); // Lấy từ session đã được lưu bởi auth_check.js

// DOM elements
const dtProgressBar = document.querySelector('.socauhoihientai');
const dtQuestionEl = document.getElementById('cauhoi');
const dtInput = document.getElementById('dapan');
const dtHint = document.querySelector('#frame_dapan p');
const dtCheckBtn = document.getElementById('kiemtra');
const dtActionBar = document.getElementById('thaotac');
const dtBtnKnown = document.getElementById('dathuoctunay');
const dtBtnForgot = document.getElementById('quentunay');
const dtBtnNext = document.getElementById('tieptheo');
const dtBtnNextAnchor = dtBtnNext.querySelector('a');

// =====================================================
// STATE MANAGEMENT
// =====================================================
let allWords = [];
let learnedWords = [];
let questions = [];
let dtIndex = 0;
let dtTotal = 0;
let dtChecked = false;
let userAnswers = [];
let startTime = Date.now();
let questionStartTime = Date.now();

// Trạng thái đánh dấu của từ hiện tại
let currentWordMarked = null;

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Trộn mảng ngẫu nhiên
 */
function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/**
 * Chuẩn hóa chuỗi để so sánh
 * - Không phân biệt hoa/thường
 * - Chuẩn hóa khoảng trắng (1 space)
 * - Trim đầu cuối
 */
function normalizeString(str) {
    return str
        .toString()
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
}

/**
 * So sánh 2 chuỗi
 */
function compareAnswers(userAnswer, correctAnswer) {
    return normalizeString(userAnswer) === normalizeString(correctAnswer);
}

/**
 * Tạo danh sách câu hỏi từ từ đã học
 * MỖI TỪ XUẤT HIỆN 2 LẦN
 */
function generateQuestions() {
    if (learnedWords.length === 0) {
        alert('Bạn chưa học từ nào! Vui lòng học từ trước khi ôn tập.');
        window.location.href = `user_hoc_tu_vung.html?course_id=${COURSE_ID}&user_id=${USER_ID}`;
        return;
    }

    // Tạo câu hỏi: mỗi từ xuất hiện 2 lần
    const questionList = [];
    learnedWords.forEach(word => {
        // Lần 1
        questionList.push({
            word_id: word.word_id,
            question: word.meaning,
            answer: word.word,
            attempt: 1
        });
        // Lần 2
        questionList.push({
            word_id: word.word_id,
            question: word.meaning,
            answer: word.word,
            attempt: 2
        });
    });

    // Random thứ tự câu hỏi
    questions = shuffleArray(questionList);
    dtTotal = questions.length;
}

// =====================================================
// API FUNCTIONS
// =====================================================

/**
 * Lấy danh sách từ vựng từ API
 */
async function fetchVocabulary() {
    try {
        const response = await fetch(
            `${API_BASE_URL}/get-words.php?course_id=${COURSE_ID}&user_id=${USER_ID}`
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Failed to fetch vocabulary');
        }

        allWords = result.data.words;
        learnedWords = allWords.filter(w => w.learned);

        generateQuestions();

        if (questions.length > 0) {
            dtRender();
        }

    } catch (error) {
        console.error('Error fetching vocabulary:', error);
        alert('Không thể tải dữ liệu. Vui lòng thử lại!');
        window.location.href = `user_hoc_tu_vung.html?course_id=${COURSE_ID}&user_id=${USER_ID}`;
    }
}

/**
 * Lưu kết quả ôn tập lên server
 */
async function saveReviewSession() {
    try {
        const durationSeconds = Math.floor((Date.now() - startTime) / 1000);
        const correctCount = userAnswers.filter(a => a.is_correct).length;
        const score = Math.round((correctCount / dtTotal) * 100);
        
        const response = await fetch(`${API_BASE_URL}/save-review-session.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                course_id: COURSE_ID,
                review_type: 'fill-in',
                total_words: dtTotal,
                correct_count: correctCount,
                score: score,
                duration_seconds: durationSeconds,
                details: userAnswers
            })
        });

        const result = await response.json();
        return result.success;

    } catch (error) {
        console.error('Error saving review session:', error);
        return false;
    }
}

// =====================================================
// UI FUNCTIONS
// =====================================================

/**
 * Cập nhật thanh tiến độ
 */
function dtUpdateProgress() {
    const percent = (dtIndex / dtTotal) * 100;
    dtProgressBar.style.width = percent + '%';
}

/**
 * Reset style các nút đánh dấu
 */
function resetMarkButtons() {
    dtBtnKnown.style.backgroundColor = '';
    dtBtnKnown.style.color = '';
    dtBtnForgot.style.backgroundColor = '';
    dtBtnForgot.style.color = '';
}

/**
 * Render câu hỏi hiện tại
 */
function dtRender() {
    const q = questions[dtIndex];
    
    questionStartTime = Date.now();
    dtQuestionEl.textContent = q.question;
    
    dtInput.value = '';
    dtInput.classList.remove('correct', 'incorrect');
    dtInput.disabled = false;
    dtInput.focus();
    
    dtHint.textContent = 'Vui lòng nhập đáp án';
    dtHint.style.color = '#666';
    
    dtChecked = false;
    currentWordMarked = null;
    dtActionBar.classList.remove('show');
    resetMarkButtons();
    
    dtBtnNextAnchor.innerHTML = dtIndex === dtTotal - 1 
        ? 'Kết thúc <i class="fa-solid fa-flag-checkered"></i>' 
        : 'Tiếp theo <i class="fa-solid fa-arrow-right"></i>';
    
    dtUpdateProgress();
}

/**
 * Kiểm tra đáp án người dùng
 */
function dtCheckAnswer() {
    if (dtChecked) return;
    
    const q = questions[dtIndex];
    const userAnswer = dtInput.value.trim();
    
    if (!userAnswer) {
        dtHint.textContent = 'Bạn chưa nhập đáp án';
        dtHint.style.color = '#FF0404';
        return;
    }
    
    const responseTime = Math.floor((Date.now() - questionStartTime) / 1000);
    const isCorrect = compareAnswers(userAnswer, q.answer);
    
    if (isCorrect) {
        dtInput.classList.add('correct');
        dtHint.textContent = 'Chính xác! 🎉';
        dtHint.style.color = '#2F80ED';
    } else {
        dtInput.classList.add('incorrect');
        dtHint.textContent = `Đáp án đúng: ${q.answer}`;
        dtHint.style.color = '#FF0404';
    }
    
    dtInput.disabled = true;
    dtChecked = true;
    dtActionBar.classList.add('show');
    
    userAnswers.push({
        word_id: q.word_id,
        user_answer: userAnswer,
        correct_answer: q.answer,
        is_correct: isCorrect,
        response_time: responseTime,
        marked_as_known: currentWordMarked
    });
    
    dtProgressBar.style.width = ((dtIndex + 1) / dtTotal) * 100 + '%';
}

/**
 * Xử lý nút "Đã thuộc từ này"
 */
function handleMarkAsKnown() {
    if (!dtChecked) return;
    
    if (currentWordMarked === true) {
        currentWordMarked = null;
        resetMarkButtons();
    } else {
        currentWordMarked = true;
        dtBtnKnown.style.backgroundColor = '#27AE60';
        dtBtnKnown.style.color = 'white';
        dtBtnForgot.style.backgroundColor = '';
        dtBtnForgot.style.color = '';
    }
    
    if (userAnswers.length > 0) {
        userAnswers[userAnswers.length - 1].marked_as_known = currentWordMarked;
    }
    
    dtBtnKnown.style.transform = 'scale(0.95)';
    setTimeout(() => dtBtnKnown.style.transform = 'scale(1)', 120);
}

/**
 * Xử lý nút "Quên từ này"
 */
function handleMarkAsForgotten() {
    if (!dtChecked) return;
    
    if (currentWordMarked === false) {
        currentWordMarked = null;
        resetMarkButtons();
    } else {
        currentWordMarked = false;
        dtBtnForgot.style.backgroundColor = '#FF0404';
        dtBtnForgot.style.color = 'white';
        dtBtnKnown.style.backgroundColor = '';
        dtBtnKnown.style.color = '';
    }
    
    if (userAnswers.length > 0) {
        userAnswers[userAnswers.length - 1].marked_as_known = currentWordMarked;
    }
    
    dtBtnForgot.style.transform = 'scale(0.95)';
    setTimeout(() => dtBtnForgot.style.transform = 'scale(1)', 120);
}

/**
 * Chuyển sang câu tiếp theo
 */
function dtGoNext(e) {
    e.preventDefault();
    
    if (!dtChecked) {
        dtCheckAnswer();
        return;
    }
    
    if (dtIndex < dtTotal - 1) {
        dtIndex++;
        dtRender();
    } else {
        saveResultsAndRedirect();
    }
}

/**
 * Lưu kết quả và chuyển đến trang kết quả
 */
async function saveResultsAndRedirect() {
    dtBtnNext.disabled = true;
    dtBtnNext.style.opacity = '0.6';
    dtBtnNextAnchor.innerHTML = 'Đang lưu... <i class="fa-solid fa-spinner fa-spin"></i>';
    
    const saved = await saveReviewSession();
    
    if (!saved) {
        alert('Có lỗi khi lưu kết quả. Vui lòng thử lại!');
        dtBtnNext.disabled = false;
        dtBtnNext.style.opacity = '1';
        return;
    }
    
    const correctCount = userAnswers.filter(a => a.is_correct).length;
    const score = Math.round((correctCount / dtTotal) * 100);
    
    sessionStorage.setItem('review_results', JSON.stringify({
        course_id: COURSE_ID,
        type: 'fill-in',
        total: dtTotal,
        correct: correctCount,
        score: score,
        details: userAnswers
    }));
    
    window.location.href = `user_ontap_ketqua.html?course_id=${COURSE_ID}&user_id=${USER_ID}`;
}

// =====================================================
// EVENT LISTENERS
// =====================================================

dtCheckBtn.addEventListener('click', dtCheckAnswer);

dtInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        if (!dtChecked) {
            dtCheckAnswer();
        } else {
            dtGoNext(e);
        }
    }
});

dtBtnNext.addEventListener('click', dtGoNext);

// Nút "Đã thuộc từ này" - CÓ LOGIC
dtBtnKnown.addEventListener('click', handleMarkAsKnown);

// Nút "Quên từ này" - CÓ LOGIC
dtBtnForgot.addEventListener('click', handleMarkAsForgotten);

// Phím tắt
document.addEventListener('keydown', (e) => {
    if (dtChecked) {
        if (e.key.toLowerCase() === 'k') {
            handleMarkAsKnown();
        } else if (e.key.toLowerCase() === 'f') {
            handleMarkAsForgotten();
        }
    }
});

// =====================================================
// INITIALIZATION
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
    fetchVocabulary();
});