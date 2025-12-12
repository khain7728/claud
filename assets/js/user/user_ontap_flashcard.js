// =====================================================
// ÔN TẬP FLASHCARD - DATABASE VERSION
// =====================================================

// =====================================================
// CONFIGURATION & DOM ELEMENTS
// =====================================================
const API_BASE_URL = '../../api';

const urlParams = new URLSearchParams(window.location.search);
const COURSE_ID = urlParams.get('course_id') || 1;
const USER_ID = localStorage.getItem('user_id'); // Lấy từ session đã được lưu bởi auth_check.js

// DOM elements
const fcFrame = document.getElementById('frame_flashcard');
const fcWord = document.getElementById('noidung_tuvung');
const fcIPA = document.getElementById('ipa');
const fcDef = document.getElementById('dinhnghia');
const fcMean = document.getElementById('ynghia');
const fcProgressBar = document.querySelector('.socauhoihientai');

const btnSpeak = document.getElementById('frame_phatam');
const btnKnown = document.getElementById('dathuoctunay');
const btnForgot = document.getElementById('quentunay');
const btnPrev = document.getElementById('quaylai');
const btnNext = document.getElementById('tieptheo');

// =====================================================
// STATE MANAGEMENT
// =====================================================
let allWords = [];
let learnedWords = [];
let flashcards = [];
let fcIndex = 0;
let fcTotal = 0;
let userProgress = []; // Lưu trạng thái của từng thẻ
let startTime = Date.now();

// Audio management - singleton pattern để tránh conflict
let currentAudio = null;
let isSpeaking = false;

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
 * Chuẩn bị dữ liệu flashcard
 */
function prepareFlashcards() {
    if (learnedWords.length === 0) {
        alert('Bạn chưa học từ nào! Vui lòng học từ trước khi ôn tập.');
        window.location.href = `user_hoc_tu_vung.html?course_id=${COURSE_ID}&user_id=${USER_ID}`;
        return;
    }

    flashcards = learnedWords.map(word => ({
        word_id: word.word_id,
        word: word.word,
        ipa: word.ipa || '',
        definition: word.definition || '',
        meaning: word.meaning,
        audio: word.audio || null
    }));

    flashcards = shuffleArray(flashcards);
    fcTotal = flashcards.length;

    // Khởi tạo mảng theo dõi progress
    userProgress = flashcards.map(fc => ({
        word_id: fc.word_id,
        user_answer: null,
        correct_answer: fc.word,
        is_correct: null, // null = chưa đánh giá
        marked_as_known: null // true = nhớ, false = quên, null = chưa đánh dấu
    }));
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

        prepareFlashcards();

        if (flashcards.length > 0) {
            renderFlashcard();
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
        
        // Tính số thẻ đã đánh dấu "nhớ"
        const rememberedCount = userProgress.filter(p => p.marked_as_known === true).length;
        const score = Math.round((rememberedCount / fcTotal) * 100);
        
        // Chuyển đổi userProgress thành format phù hợp
        const details = userProgress.map(p => ({
            word_id: p.word_id,
            user_answer: p.user_answer,
            correct_answer: p.correct_answer,
            is_correct: p.marked_as_known === true, // Đã thuộc = đúng
            marked_as_known: p.marked_as_known
        }));
        
        const response = await fetch(`${API_BASE_URL}/save-review-session.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                course_id: COURSE_ID,
                review_type: 'flashcard',
                total_words: fcTotal,
                correct_count: rememberedCount,
                score: score,
                duration_seconds: durationSeconds,
                details: details
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
function updateProgress() {
    const percent = (fcIndex / fcTotal) * 100;
    fcProgressBar.style.width = percent + '%';
}

/**
 * Reset style các nút đánh dấu
 */
function resetMarkButtons() {
    btnKnown.style.backgroundColor = '';
    btnKnown.style.color = '';
    btnForgot.style.backgroundColor = '';
    btnForgot.style.color = '';
}

/**
 * Cập nhật style nút dựa vào trạng thái đã lưu
 */
function updateMarkButtonsState() {
    const currentProgress = userProgress[fcIndex];
    
    if (currentProgress.marked_as_known === true) {
        btnKnown.style.backgroundColor = '#27AE60';
        btnKnown.style.color = 'white';
        btnForgot.style.backgroundColor = '';
        btnForgot.style.color = '';
    } else if (currentProgress.marked_as_known === false) {
        btnForgot.style.backgroundColor = '#FF0404';
        btnForgot.style.color = 'white';
        btnKnown.style.backgroundColor = '';
        btnKnown.style.color = '';
    } else {
        resetMarkButtons();
    }
}

/**
 * Render flashcard hiện tại
 */
function renderFlashcard() {
    // Stop any playing audio when changing flashcard
    stopAllAudio();
    
    const c = flashcards[fcIndex];
    
    fcWord.textContent = c.word;
    fcIPA.textContent = c.ipa;
    fcDef.textContent = c.definition;
    fcMean.textContent = c.meaning;
    
    fcIPA.style.display = c.ipa ? 'block' : 'none';
    
    btnNext.innerHTML = fcIndex === fcTotal - 1 
        ? 'Kết thúc <i class="fa-solid fa-flag-checkered"></i>' 
        : 'Tiếp theo <i class="fa-solid fa-arrow-right"></i>';
    
    updateProgress();
    fcFrame.classList.remove('flipped');
    
    btnPrev.disabled = fcIndex === 0;
    btnPrev.style.opacity = fcIndex === 0 ? '0.5' : '1';
    
    // Cập nhật trạng thái nút đánh dấu
    updateMarkButtonsState();
}

/**
 * Lật flashcard
 */
function flipCard() {
    fcFrame.classList.toggle('flipped');
}

/**
 * Dừng tất cả audio đang phát
 */
function stopAllAudio() {
    // Stop HTML5 Audio
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }
    
    // Stop Speech Synthesis
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
    }
    
    isSpeaking = false;
}

/**
 * Phát âm từ - với audio management để tránh conflict
 */
async function speakWord() {
    // Prevent spam click
    if (isSpeaking) {
        stopAllAudio();
        return;
    }
    
    const c = flashcards[fcIndex];
    
    // Stop previous audio before playing new one
    stopAllAudio();
    isSpeaking = true;

    // Try to play audio file first
    if (c.audio) {
        try {
            currentAudio = new Audio(c.audio);
            
            currentAudio.addEventListener('ended', () => {
                currentAudio = null;
                isSpeaking = false;
            });
            
            currentAudio.addEventListener('error', () => {
                currentAudio = null;
                useTTS(c.word);
            });
            
            await currentAudio.play();
            return;
        } catch (error) {
            currentAudio = null;
        }
    }

    // Fallback to Text-to-Speech
    useTTS(c.word);
}

/**
 * Sử dụng Text-to-Speech
 */
function useTTS(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        
        utterance.onend = () => {
            isSpeaking = false;
        };
        
        utterance.onerror = () => {
            isSpeaking = false;
        };
        
        window.speechSynthesis.speak(utterance);
    } else {
        alert('Trình duyệt không hỗ trợ phát âm!');
        isSpeaking = false;
    }
}

/**
 * Đánh dấu "Đã thuộc từ này"
 * Logic: Toggle - Nhấn lần 1 = Đã thuộc, nhấn lần 2 = Bỏ đánh dấu
 */
function markAsKnown() {
    const currentProgress = userProgress[fcIndex];
    
    if (currentProgress.marked_as_known === true) {
        // Bỏ đánh dấu
        currentProgress.marked_as_known = null;
        currentProgress.is_correct = null;
        resetMarkButtons();
    } else {
        // Đánh dấu "Đã thuộc"
        currentProgress.marked_as_known = true;
        currentProgress.is_correct = true;
        btnKnown.style.backgroundColor = '#27AE60';
        btnKnown.style.color = 'white';
        btnForgot.style.backgroundColor = '';
        btnForgot.style.color = '';
    }
    
    // Hiệu ứng
    btnKnown.style.transform = 'scale(0.95)';
    setTimeout(() => btnKnown.style.transform = 'scale(1)', 120);
}

/**
 * Đánh dấu "Quên từ này"
 * Logic: Toggle - Nhấn lần 1 = Quên, nhấn lần 2 = Bỏ đánh dấu
 */
function markAsForgotten() {
    const currentProgress = userProgress[fcIndex];
    
    if (currentProgress.marked_as_known === false) {
        // Bỏ đánh dấu
        currentProgress.marked_as_known = null;
        currentProgress.is_correct = null;
        resetMarkButtons();
    } else {
        // Đánh dấu "Quên"
        currentProgress.marked_as_known = false;
        currentProgress.is_correct = false;
        btnForgot.style.backgroundColor = '#FF0404';
        btnForgot.style.color = 'white';
        btnKnown.style.backgroundColor = '';
        btnKnown.style.color = '';
    }
    
    // Hiệu ứng
    btnForgot.style.transform = 'scale(0.95)';
    setTimeout(() => btnForgot.style.transform = 'scale(1)', 120);
}

/**
 * Chuyển sang thẻ tiếp theo
 */
function goToNext() {
    if (fcIndex < fcTotal - 1) {
        fcIndex++;
        renderFlashcard();
        fcProgressBar.style.width = (fcIndex / fcTotal) * 100 + '%';
    } else {
        saveResultsAndRedirect();
    }
}

/**
 * Quay lại thẻ trước
 */
function goToPrev() {
    if (fcIndex > 0) {
        fcIndex--;
        renderFlashcard();
    }
}

/**
 * Lưu kết quả và chuyển đến trang kết quả
 */
async function saveResultsAndRedirect() {
    btnNext.disabled = true;
    btnNext.style.opacity = '0.6';
    btnNext.innerHTML = 'Đang lưu... <i class="fa-solid fa-spinner fa-spin"></i>';
    
    const saved = await saveReviewSession();
    
    if (!saved) {
        alert('Có lỗi khi lưu kết quả. Vui lòng thử lại!');
        btnNext.disabled = false;
        btnNext.style.opacity = '1';
        return;
    }
    
    const rememberedCount = userProgress.filter(p => p.marked_as_known === true).length;
    const score = Math.round((rememberedCount / fcTotal) * 100);
    
    sessionStorage.setItem('review_results', JSON.stringify({
        course_id: COURSE_ID,
        type: 'flashcard',
        total: fcTotal,
        correct: rememberedCount,
        score: score,
        details: userProgress
    }));
    
    window.location.href = `user_ontap_ketqua.html?course_id=${COURSE_ID}&user_id=${USER_ID}`;
}

// =====================================================
// EVENT LISTENERS
// =====================================================

fcFrame.addEventListener('click', flipCard);

btnSpeak.addEventListener('click', (e) => {
    e.stopPropagation();
    speakWord();
});

// Nút "Đã thuộc từ này" - CÓ LOGIC
btnKnown.addEventListener('click', (e) => {
    e.stopPropagation();
    markAsKnown();
});

// Nút "Quên từ này" - CÓ LOGIC
btnForgot.addEventListener('click', (e) => {
    e.stopPropagation();
    markAsForgotten();
});

btnPrev.addEventListener('click', (e) => {
    e.preventDefault();
    goToPrev();
});

btnNext.addEventListener('click', (e) => {
    e.preventDefault();
    goToNext();
});

// Phím tắt
document.addEventListener('keydown', (e) => {
    if (e.key === ' ') {
        e.preventDefault();
        flipCard();
    } else if (e.key === 'ArrowRight') {
        goToNext();
    } else if (e.key === 'ArrowLeft') {
        goToPrev();
    } else if (e.key.toLowerCase() === 's') {
        speakWord();
    } else if (e.key.toLowerCase() === 'k') {
        markAsKnown();
    } else if (e.key.toLowerCase() === 'f') {
        markAsForgotten();
    }
});

// =====================================================
// INITIALIZATION
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
    fetchVocabulary();
});