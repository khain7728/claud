// ===========================
// CONFIG & GLOBALS
// ===========================
const THEME = '#7BB7EE';
let COURSE_ID = 1; // Mặc định
let USER_ID = localStorage.getItem('user_id'); // Lấy từ session đã được lưu bởi auth_check.js
let TOTAL_QUESTIONS = 0;
let currentIndex = 0;
let quizData = [];
let userAnswers = [];
let startTime = Date.now();

// ===========================
// DOM ELEMENTS
// ===========================
const progressCount = document.querySelector('.kt-progress .kt-count');
const progressInner = document.querySelector('.kt-progress .kt-bar-inner');

const mcqFrame = document.getElementById('frame_tracnghiem');
const mcqQuestionEl = document.getElementById('kt-mcq-question');
const mcqAnswerEls = [
    document.getElementById('kt-mcq-a1'),
    document.getElementById('kt-mcq-a2'),
    document.getElementById('kt-mcq-a3'),
    document.getElementById('kt-mcq-a4'),
];
const mcqNextBtn = document.getElementById('kt-mcq-next');

const fillFrame = document.getElementById('frame_dientu');
const fillQuestionEl = document.getElementById('kt-fill-question');
const fillInput = document.getElementById('kt-input');
const fillHint = document.getElementById('kt-fill-hint');
const fillCheckBtn = document.getElementById('kt-fill-check');
const fillNextBtn = document.getElementById('kt-fill-next');

// ===========================
// UTILITY FUNCTIONS
// ===========================
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

function normalize(str) {
    return (str || '').toString().trim().toLowerCase();
}

function getUrlParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// ===========================
// BUILD QUIZ DECK
// ===========================
function buildQuizDeck(words) {
    const totalWords = words.length;
    const mcqCount = Math.floor(totalWords / 2);
    const fillCount = totalWords - mcqCount;
    
    // Clone và shuffle
    const wordsCopy = [...words];
    shuffle(wordsCopy);
    
    const deck = [];
    
    // Tạo câu trắc nghiệm (50% VI→EN, 50% EN→VI)
    for (let i = 0; i < mcqCount; i++) {
        const word = wordsCopy[i];
        const isViToEn = Math.random() < 0.5;
        
        // Lấy 3 từ sai ngẫu nhiên
        const wrongWords = words
            .filter(w => w.word_id !== word.word_id)
            .sort(() => Math.random() - 0.5)
            .slice(0, 3);
        
        let question, correctAnswer, choices;
        
        if (isViToEn) {
            // Hỏi tiếng Việt → chọn tiếng Anh
            question = word.word_vi;
            correctAnswer = word.word_en;
            choices = [
                word.word_en,
                ...wrongWords.map(w => w.word_en)
            ];
        } else {
            // Hỏi tiếng Anh → chọn tiếng Việt
            question = word.word_en;
            correctAnswer = word.word_vi;
            choices = [
                word.word_vi,
                ...wrongWords.map(w => w.word_vi)
            ];
        }
        
        // Trộn đáp án
        shuffle(choices);
        const correctIndex = choices.indexOf(correctAnswer);
        
        deck.push({
            type: 'mcq',
            word_id: word.word_id,
            question: question,
            choices: choices,
            correctIndex: correctIndex,
            correctAnswer: correctAnswer,
            word: word
        });
    }
    
    // Tạo câu điền từ (VI → EN)
    for (let i = mcqCount; i < totalWords; i++) {
        const word = wordsCopy[i];
        
        deck.push({
            type: 'fill',
            word_id: word.word_id,
            question: word.word_vi, // Hiển thị TẤT CẢ nghĩa tiếng Việt
            correctAnswer: word.word_en,
            word: word
        });
    }
    
    // Trộn toàn bộ deck
    shuffle(deck);
    
    return deck;
}

// ===========================
// LOAD QUIZ DATA
// ===========================
async function loadQuizData() {
    // Bug #26: Show loading spinner
    const loadingEl = document.getElementById('kt-loading');
    if (loadingEl) loadingEl.style.display = 'block';
    
    try {
        // Lấy course_id từ URL hoặc dùng mặc định
        const urlCourseId = getUrlParam('course_id');
        if (urlCourseId) {
            COURSE_ID = parseInt(urlCourseId);
            // Lưu vào sessionStorage để fallback
            sessionStorage.setItem('current_course_id', COURSE_ID);
        }
        
        const response = await fetch(`../../api/get-quiz-words.php?course_id=${COURSE_ID}`);
        const data = await response.json();
        
        // Bug #26: Hide loading spinner
        if (loadingEl) loadingEl.style.display = 'none';
        
        // Bug #14 & #28: Specific error handling
        if (!data.success) {
            const errorMsg = data.error || '';
            
            if (errorMsg.includes('not found') || errorMsg.includes('không tồn tại')) {
                alert('❌ Không tìm thấy khóa học này.\n\nVui lòng kiểm tra lại hoặc quay về trang chủ.');
                window.location.href = 'khoa_hoc_cua_toi.html';
                return;
            } else if (errorMsg.includes('no words') || errorMsg.includes('không có từ')) {
                alert('📚 Khóa học này chưa có từ vựng nào.\n\nVui lòng thêm từ vựng trước khi làm bài kiểm tra.');
                window.location.href = 'chi_tiet_khoa_hoc.html?id=' + COURSE_ID;
                return;
            } else {
                alert('⚠️ Không thể tải bài kiểm tra.\n\n' + errorMsg);
                window.location.href = 'khoa_hoc_cua_toi.html';
                return;
            }
        }
        
        const words = data.data.words;
        
        if (words.length === 0) {
            alert('📚 Khóa học này chưa có từ vựng nào.\n\nVui lòng thêm từ vựng trước khi làm bài kiểm tra.');
            window.location.href = 'chi_tiet_khoa_hoc.html?id=' + COURSE_ID;
            return;
        }
        
        TOTAL_QUESTIONS = words.length;
        quizData = buildQuizDeck(words);
        
        // Bắt đầu quiz
        renderQuestion();
        
    } catch (error) {
        console.error('Error loading quiz:', error);
        
        // Bug #26: Hide loading spinner on error
        if (loadingEl) loadingEl.style.display = 'none';
        
        // Bug #28: User-friendly error message
        alert('⚠️ Không thể kết nối đến server.\n\nVui lòng kiểm tra kết nối internet và thử lại.');
        window.location.href = 'khoa_hoc_cua_toi.html';
    }
}

// ===========================
// RENDER FUNCTIONS
// ===========================
function updateProgress() {
    progressCount.textContent = `${currentIndex}/${TOTAL_QUESTIONS}`;
    progressInner.style.width = `${(currentIndex / TOTAL_QUESTIONS) * 100}%`;
}

function renderQuestion() {
    if (currentIndex >= TOTAL_QUESTIONS) {
        finishQuiz();
        return;
    }
    
    // Bug #37: Scroll to top when rendering new question
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    updateProgress();
    const item = quizData[currentIndex];
    
    if (item.type === 'mcq') {
        renderMCQ(item);
    } else {
        renderFill(item);
    }
}

function hideAllFrames() {
    mcqFrame.classList.add('kt-hidden');
    fillFrame.classList.add('kt-hidden');
}

function renderMCQ(item) {
    hideAllFrames();
    
    mcqQuestionEl.textContent = item.question;
    
    mcqAnswerEls.forEach((el, i) => {
        el.textContent = item.choices[i] || '';
        el.dataset.index = i;
        el.classList.remove('correct', 'incorrect', 'disabled');
    });
    
    mcqNextBtn.classList.add('kt-hidden');
    mcqFrame.classList.remove('kt-hidden');
    
    let answered = false;
    let selectedIndex = null;
    const questionStartTime = Date.now();
    
    function onPick(e) {
        const target = e.target.closest('.kt-answer');
        if (!target || answered) return;
        
        answered = true;
        selectedIndex = parseInt(target.dataset.index, 10);
        const isCorrect = selectedIndex === item.correctIndex;
        
        // Hiển thị đáp án
        mcqAnswerEls.forEach((el, i) => {
            el.classList.add('disabled');
            if (i === item.correctIndex) {
                el.classList.add('correct');
            }
        });
        
        if (!isCorrect) {
            target.classList.add('incorrect');
        }
        
        // Lưu câu trả lời
        const responseTime = Math.floor((Date.now() - questionStartTime) / 1000);
        userAnswers.push({
            word_id: item.word_id,
            type: 'mcq',
            user_answer: item.choices[selectedIndex],
            correct_answer: item.correctAnswer,
            is_correct: isCorrect,
            response_time: responseTime,
            word: item.word
        });
        
        mcqNextBtn.classList.remove('kt-hidden');
    }
    
    mcqFrame.querySelector('.kt-answers').onclick = onPick;
    mcqNextBtn.onclick = nextQuestion;
}

function renderFill(item) {
    hideAllFrames();
    
    fillQuestionEl.textContent = item.question;
    fillInput.value = '';
    fillInput.classList.remove('correct', 'incorrect');
    fillInput.disabled = false;
    fillHint.textContent = 'Vui lòng nhập đáp án';
    fillHint.style.color = '#888';
    fillCheckBtn.classList.remove('kt-hidden');
    fillNextBtn.classList.add('kt-hidden');
    fillFrame.classList.remove('kt-hidden');
    fillInput.focus();
    
    let checked = false;
    const questionStartTime = Date.now();
    
    function doCheck() {
        if (checked) return;
        
        const userInput = fillInput.value.trim();
        const normalized = normalize(userInput);
        const correctNormalized = normalize(item.correctAnswer);
        
        if (!userInput) {
            fillHint.textContent = 'Bạn chưa nhập đáp án';
            fillHint.style.color = '#FF0404';
            return;
        }
        
        const isCorrect = normalized === correctNormalized;
        
        if (isCorrect) {
            fillInput.classList.add('correct');
            fillHint.textContent = 'Chính xác!';
            fillHint.style.color = '#2F80ED';
        } else {
            fillInput.classList.add('incorrect');
            fillHint.textContent = `Đáp án đúng: ${item.correctAnswer}`;
            fillHint.style.color = '#FF0404';
        }
        
        fillInput.disabled = true;
        checked = true;
        
        // Lưu câu trả lời
        const responseTime = Math.floor((Date.now() - questionStartTime) / 1000);
        userAnswers.push({
            word_id: item.word_id,
            type: 'fill',
            user_answer: userInput,
            correct_answer: item.correctAnswer,
            is_correct: isCorrect,
            response_time: responseTime,
            word: item.word
        });
        
        fillCheckBtn.classList.add('kt-hidden');
        fillNextBtn.classList.remove('kt-hidden');
    }
    
    fillCheckBtn.onclick = doCheck;
    fillInput.onkeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            doCheck();
        }
    };
    fillNextBtn.onclick = nextQuestion;
}

function renderQuestion() {
    updateProgress();
    
    if (currentIndex >= TOTAL_QUESTIONS) {
        finishQuiz();
        return;
    }
    
    const item = quizData[currentIndex];
    
    if (item.type === 'mcq') {
        renderMCQ(item);
    } else {
        renderFill(item);
    }
}

function nextQuestion() {
    currentIndex++;
    renderQuestion();
}

// ===========================
// FINISH QUIZ & SAVE RESULT
// ===========================
async function finishQuiz() {
    const endTime = Date.now();
    const durationSeconds = Math.floor((endTime - startTime) / 1000);
    
    const correctCount = userAnswers.filter(a => a.is_correct).length;
    const incorrectCount = TOTAL_QUESTIONS - correctCount;
    const score = (correctCount / TOTAL_QUESTIONS) * 100;
    
    // Chuẩn bị dữ liệu gửi API
    const resultData = {
        course_id: COURSE_ID,
        total_questions: TOTAL_QUESTIONS,
        correct_count: correctCount,
        incorrect_count: incorrectCount,
        score: score,
        duration_seconds: durationSeconds,
        details: userAnswers.map(a => ({
            word_id: a.word_id,
            user_answer: a.user_answer,
            correct_answer: a.correct_answer,
            is_correct: a.is_correct,
            response_time: a.response_time
        }))
    };
    
    try {
        const response = await fetch('../../api/save-quiz-result.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(resultData)
        });
        
        const data = await response.json();
        
        if (!data.success) {
            console.error('Failed to save result:', data.error);
        }
        
        // Lưu kết quả vào sessionStorage để hiển thị trang kết quả
        sessionStorage.setItem('quizResult', JSON.stringify({
            course_id: COURSE_ID,
            total_questions: TOTAL_QUESTIONS,
            correct_count: correctCount,
            incorrect_count: incorrectCount,
            score: score.toFixed(1),
            userAnswers: userAnswers,
            session_id: data.session_id || null
        }));
        
        // Chuyển đến trang kết quả (dùng replace để không lưu vào history)
        window.location.replace('user_kiemtra_ketqua.html');
        
    } catch (error) {
        console.error('Error saving quiz result:', error);
        alert('⚠️ Không thể lưu kết quả bài kiểm tra.\n\nVui lòng kiểm tra kết nối internet và thử làm lại.');
    }
}

// ===========================
// INIT
// ===========================
loadQuizData();