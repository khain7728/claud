// =====================================================
// ÔN TẬP TRẮC NGHIỆM - DATABASE VERSION
// =====================================================

// =====================================================
// CONFIGURATION & DOM ELEMENTS
// =====================================================
const API_BASE_URL = '../../api';

// Lấy tham số từ URL
const urlParams = new URLSearchParams(window.location.search);
const COURSE_ID = urlParams.get('course_id') || 1;
const USER_ID = localStorage.getItem('user_id'); // Lấy từ session đã được lưu bởi auth_check.js

// DOM elements
const progressBar = document.querySelector('.socauhoihientai');
const questionEl = document.getElementById('cauhoi');
const answerEls = Array.from(document.querySelectorAll('.cautraloi'));
const actionBar = document.getElementById('thaotac');
const btnKnown = document.getElementById('dathuoctunay');
const btnForgot = document.getElementById('quentunay');
const btnNext = document.getElementById('tieptheo');
const btnNextAnchor = btnNext.querySelector('a');

// =====================================================
// STATE MANAGEMENT
// =====================================================
let allWords = [];
let learnedWords = [];
let questions = [];
let currentIndex = 0;
let totalQuestions = 0;
let answered = false;
let userAnswers = [];
let startTime = Date.now();
let questionStartTime = Date.now();

// Trạng thái "Đã thuộc" hoặc "Quên" của từ hiện tại
let currentWordMarked = null; // null = chưa đánh dấu, true = đã thuộc, false = quên

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Trộn mảng ngẫu nhiên (Fisher-Yates shuffle)
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
 * Lấy n phần tử ngẫu nhiên từ mảng
 */
function getRandomElements(array, n) {
    const shuffled = shuffleArray(array);
    return shuffled.slice(0, n);
}

/**
 * Tạo 3 đáp án sai ngẫu nhiên (không trùng với đáp án đúng)
 */
function generateWrongAnswers(correctAnswer, allAnswers) {
    const wrongAnswers = allAnswers.filter(ans => ans !== correctAnswer);
    return getRandomElements(wrongAnswers, 3);
}

/**
 * Tạo câu hỏi trắc nghiệm từ danh sách từ đã học
 * MỖI TỪ XUẤT HIỆN 2 LẦN VỚI ĐÁP ÁN SAI KHÁC NHAU
 */
function generateQuestions() {
    if (learnedWords.length === 0) {
        alert('Bạn chưa học từ nào! Vui lòng học từ trước khi ôn tập.');
        window.location.href = `user_hoc_tu_vung.html?course_id=${COURSE_ID}&user_id=${USER_ID}`;
        return;
    }

    const allAnswers = allWords.map(w => w.word);
    const questionList = [];
    
    learnedWords.forEach(word => {
        // Lần 1: Tạo 3 đáp án sai set 1
        const wrongAnswers1 = generateWrongAnswers(word.word, allAnswers);
        const answers1 = shuffleArray([word.word, ...wrongAnswers1]);
        
        questionList.push({
            word_id: word.word_id,
            question: word.meaning,
            answers: answers1,
            correctIndex: answers1.indexOf(word.word),
            correctAnswer: word.word,
            attempt: 1
        });
        
        // Lần 2: Tạo 3 đáp án sai set 2 (KHÁC với set 1)
        const availableWrongAnswers = allAnswers.filter(ans => 
            ans !== word.word && !wrongAnswers1.includes(ans)
        );
        
        let wrongAnswers2;
        if (availableWrongAnswers.length >= 3) {
            wrongAnswers2 = getRandomElements(availableWrongAnswers, 3);
        } else {
            // Nếu không đủ đáp án khác, lấy lại 1 số đáp án từ set 1
            wrongAnswers2 = [
                ...availableWrongAnswers,
                ...getRandomElements(wrongAnswers1, 3 - availableWrongAnswers.length)
            ];
        }
        
        const answers2 = shuffleArray([word.word, ...wrongAnswers2]);
        
        questionList.push({
            word_id: word.word_id,
            question: word.meaning,
            answers: answers2,
            correctIndex: answers2.indexOf(word.word),
            correctAnswer: word.word,
            attempt: 2
        });
    });

    // Random thứ tự câu hỏi
    questions = shuffleArray(questionList);
    totalQuestions = questions.length;
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
            renderQuestion();
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
        const score = Math.round((correctCount / totalQuestions) * 100);
        
        const response = await fetch(`${API_BASE_URL}/save-review-session.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                course_id: COURSE_ID,
                review_type: 'multiple-choice',
                total_words: totalQuestions,
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
 * Render câu hỏi hiện tại
 */
function renderQuestion() {
    const q = questions[currentIndex];
    
    questionStartTime = Date.now();
    questionEl.textContent = q.question;
    
    q.answers.forEach((ans, i) => {
        if (answerEls[i]) {
            answerEls[i].textContent = ans;
            answerEls[i].classList.remove('correct', 'incorrect', 'disabled');
            answerEls[i].setAttribute('data-index', i);
        }
    });
    
    answered = false;
    currentWordMarked = null; // Reset trạng thái đánh dấu
    actionBar.classList.remove('show');
    
    // Reset style nút "Đã thuộc" và "Quên"
    resetMarkButtons();
    
    btnNextAnchor.innerHTML = currentIndex === totalQuestions - 1 
        ? 'Kết thúc <i class="fa-solid fa-flag-checkered"></i>' 
        : 'Tiếp theo <i class="fa-solid fa-arrow-right"></i>';
    
    updateProgress();
}

/**
 * Reset style các nút đánh dấu
 */
function resetMarkButtons() {
    btnKnown.classList.remove('marked');
    btnForgot.classList.remove('marked');
}

/**
 * Cập nhật thanh tiến độ
 */
function updateProgress() {
    const percent = (currentIndex / totalQuestions) * 100;
    progressBar.style.width = percent + '%';
}

/**
 * Khóa các đáp án sau khi đã trả lời
 */
function lockAnswers() {
    answerEls.forEach(el => el.classList.add('disabled'));
}

/**
 * Xử lý khi người dùng chọn đáp án
 */
function handleAnswerClick(e) {
    if (answered) return;
    
    const clicked = e.currentTarget;
    const selectedIndex = parseInt(clicked.getAttribute('data-index'), 10);
    const q = questions[currentIndex];
    const isCorrect = selectedIndex === q.correctIndex;
    
    const responseTime = Math.floor((Date.now() - questionStartTime) / 1000);
    
    if (isCorrect) {
        clicked.classList.add('correct');
    } else {
        clicked.classList.add('incorrect');
        const correctEl = answerEls[q.correctIndex];
        correctEl.classList.add('correct');
    }
    
    lockAnswers();
    answered = true;
    actionBar.classList.add('show');
    
    // Lưu kết quả
    userAnswers.push({
        word_id: q.word_id,
        user_answer: q.answers[selectedIndex],
        correct_answer: q.correctAnswer,
        is_correct: isCorrect,
        response_time: responseTime,
        marked_as_known: currentWordMarked // Lưu trạng thái đánh dấu
    });
    
    progressBar.style.width = ((currentIndex + 1) / totalQuestions) * 100 + '%';
}

/**
 * Xử lý nút "Đã thuộc từ này"
 * Logic: Đánh dấu user đã nhớ từ này
 */
function handleMarkAsKnown() {
    if (!answered) return;
    
    // Toggle trạng thái
    if (currentWordMarked === true) {
        // Nếu đã đánh dấu "Đã thuộc", bỏ đánh dấu
        currentWordMarked = null;
        resetMarkButtons();
    } else {
        // Đánh dấu "Đã thuộc"
        currentWordMarked = true;
        btnKnown.classList.add('marked');
        // Reset nút "Quên" nếu đang active
        btnForgot.classList.remove('marked');
    }
    
    // Cập nhật vào userAnswers (câu cuối cùng)
    if (userAnswers.length > 0) {
        userAnswers[userAnswers.length - 1].marked_as_known = currentWordMarked;
    }
}

/**
 * Xử lý nút "Quên từ này"
 * Logic: Đánh dấu user chưa nhớ từ này
 */
function handleMarkAsForgotten() {
    if (!answered) return;
    
    // Toggle trạng thái
    if (currentWordMarked === false) {
        // Nếu đã đánh dấu "Quên", bỏ đánh dấu
        currentWordMarked = null;
        resetMarkButtons();
    } else {
        // Đánh dấu "Quên"
        currentWordMarked = false;
        btnForgot.classList.add('marked');
        // Reset nút "Đã thuộc" nếu đang active
        btnKnown.classList.remove('marked');
    }
    
    // Cập nhật vào userAnswers
    if (userAnswers.length > 0) {
        userAnswers[userAnswers.length - 1].marked_as_known = currentWordMarked;
    }
}

/**
 * Chuyển sang câu tiếp theo
 */
function goToNextQuestion() {
    if (!answered) return;
    
    if (currentIndex < totalQuestions - 1) {
        currentIndex++;
        renderQuestion();
    } else {
        saveResultsAndRedirect();
    }
}

/**
 * Lưu kết quả và chuyển đến trang kết quả
 */
async function saveResultsAndRedirect() {
    btnNext.disabled = true;
    btnNext.style.opacity = '0.6';
    btnNextAnchor.innerHTML = 'Đang lưu... <i class="fa-solid fa-spinner fa-spin"></i>';
    
    const saved = await saveReviewSession();
    
    if (!saved) {
        alert('Có lỗi khi lưu kết quả. Vui lòng thử lại!');
        btnNext.disabled = false;
        btnNext.style.opacity = '1';
        return;
    }
    
    const correctCount = userAnswers.filter(a => a.is_correct).length;
    const score = Math.round((correctCount / totalQuestions) * 100);
    
    sessionStorage.setItem('review_results', JSON.stringify({
        course_id: COURSE_ID,
        type: 'multiple-choice',
        total: totalQuestions,
        correct: correctCount,
        score: score,
        details: userAnswers
    }));
    
    window.location.href = `user_ontap_ketqua.html?course_id=${COURSE_ID}&user_id=${USER_ID}`;
}

// =====================================================
// EVENT LISTENERS
// =====================================================

answerEls.forEach(el => {
    el.addEventListener('click', handleAnswerClick);
});

btnNext.addEventListener('click', (e) => {
    e.preventDefault();
    goToNextQuestion();
});

// Nút "Đã thuộc từ này" - CÓ LOGIC
btnKnown.addEventListener('click', handleMarkAsKnown);

// Nút "Quên từ này" - CÓ LOGIC
btnForgot.addEventListener('click', handleMarkAsForgotten);

// Phím tắt
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && answered) {
        goToNextQuestion();
    } else if (e.key >= '1' && e.key <= '4' && !answered) {
        const index = parseInt(e.key) - 1;
        if (answerEls[index]) {
            answerEls[index].click();
        }
    } else if (e.key.toLowerCase() === 'k' && answered) {
        // Phím K = Đã thuộc (Known)
        handleMarkAsKnown();
    } else if (e.key.toLowerCase() === 'f' && answered) {
        // Phím F = Quên (Forgotten)
        handleMarkAsForgotten();
    }
});

// =====================================================
// INITIALIZATION
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
    fetchVocabulary();
});