// ===========================
// LOAD & DISPLAY DETAILED RESULT WITH PAGINATION
// ===========================

// Ngăn người dùng bấm nút Back của trình duyệt
history.pushState(null, null, location.href);
window.addEventListener('popstate', function() {
    history.pushState(null, null, location.href);
    alert('⚠️ Bạn không thể quay lại trang kiểm tra.\n\nVui lòng sử dụng các nút điều hướng trên trang.');
});

// Pagination settings
const ITEMS_PER_PAGE = 10;
let currentPage = 1;
let allAnswers = [];

// Lấy dữ liệu từ sessionStorage
const resultData = JSON.parse(sessionStorage.getItem('quizResult'));

if (!resultData) {
    alert('Không tìm thấy kết quả kiểm tra!');
    window.location.href = 'chi_tiet_khoa_hoc.html';
} else {
    allAnswers = resultData.userAnswers;
    displayDetailedResult(resultData);
}

function displayDetailedResult(data) {
    // Lấy course_id từ data hoặc từ URL nếu không có
    const urlParams = new URLSearchParams(window.location.search);
    const course_id = data.course_id || urlParams.get('course_id') || sessionStorage.getItem('current_course_id');
    const { userAnswers, score } = data;
    
    // Cập nhật tỷ lệ đúng ở header
    document.getElementById('tyledung').textContent = score + '%';
    
    // Render trang đầu tiên
    renderPage(1, course_id);
}

function renderPage(page, course_id) {
    currentPage = page;
    
    // Lấy container main
    const mainContainer = document.getElementById('main');
    
    // Xóa nội dung cũ (giữ lại phần thaotac)
    const thaotacDiv = document.getElementById('thaotac');
    mainContainer.innerHTML = '';
    
    // Tính toán phân trang
    const totalPages = Math.ceil(allAnswers.length / ITEMS_PER_PAGE);
    const startIdx = (page - 1) * ITEMS_PER_PAGE;
    const endIdx = Math.min(startIdx + ITEMS_PER_PAGE, allAnswers.length);
    const pageAnswers = allAnswers.slice(startIdx, endIdx);
    
    // Render từng câu hỏi của trang hiện tại
    pageAnswers.forEach(answer => {
        const div = document.createElement('div');
        div.className = `frame_chitiet ${answer.is_correct ? 'correct' : 'false'}`;
        
        const word = answer.word;
        
        let html = `
            <div class="frame_tuvung">
                <span class="tuvung">${word.word_en}</span>
                <div class="frame_ipa">
                    <i class="fa-solid fa-volume-high"></i>
                    <span class="ipa">${word.ipa || ''}</span>
                </div>
            </div>
            <p class="tieude_ynghia">Ý nghĩa</p>
            <span class="ynghia">${word.word_vi}</span>
        `;
        
        // Nếu sai, hiển thị đáp án của user
        if (!answer.is_correct) {
            html += `
                <div class="dapancuaban">
                    <p class="tieude_dapan">Đáp án của bạn:</p>
                    <span class="dapan">${answer.user_answer}</span>
                </div>
            `;
        }
        
        div.innerHTML = html;
        mainContainer.appendChild(div);
    });
    
    // Render pagination controls
    if (totalPages > 1) {
        renderPagination(totalPages, course_id);
    }
    
    // Thêm lại phần thaotac
    if (thaotacDiv) {
        mainContainer.appendChild(thaotacDiv);
        
        // Cập nhật link
        const quayLaiLink = document.getElementById('quaylaikhoahoc');
        if (quayLaiLink) {
            quayLaiLink.href = `chi_tiet_khoa_hoc.html?id=${course_id}`;
        }
        
        const hocLaiLink = document.getElementById('hoclai');
        if (hocLaiLink) {
            hocLaiLink.href = `user_hoc_tu_vung.html?course_id=${course_id}`;
        }
    } else {
        // Tạo mới phần thaotac nếu không có
        const thaotacHTML = `
            <div id="thaotac">
                <a href="chi_tiet_khoa_hoc.html?id=${course_id}" id="quaylaikhoahoc">Quay lại khóa học</a>
                <a href="user_hoc_tu_vung.html?course_id=${course_id}" id="hoclai">Học lại với flashcard</a>
            </div>
        `;
        mainContainer.insertAdjacentHTML('beforeend', thaotacHTML);
    }
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderPagination(totalPages, course_id) {
    const paginationDiv = document.createElement('div');
    paginationDiv.className = 'pagination-container';
    paginationDiv.id = 'pagination';
    
    let html = '<div class="pagination-controls">';
    
    // Previous button
    html += `
        <button class="pagination-btn ${currentPage === 1 ? 'disabled' : ''}" 
                onclick="changePage(${currentPage - 1}, '${course_id}')"
                ${currentPage === 1 ? 'disabled' : ''}>
            <i class="fa-solid fa-chevron-left"></i> Trước
        </button>
    `;
    
    // Page info
    html += `
        <div class="pagination-info">
            <span class="current-page">${currentPage}</span>
            <span class="separator">/</span>
            <span class="total-pages">${totalPages}</span>
        </div>
    `;
    
    // Next button
    html += `
        <button class="pagination-btn ${currentPage === totalPages ? 'disabled' : ''}" 
                onclick="changePage(${currentPage + 1}, '${course_id}')"
                ${currentPage === totalPages ? 'disabled' : ''}>
            Sau <i class="fa-solid fa-chevron-right"></i>
        </button>
    `;
    
    html += '</div>';
    
    // Page numbers (show max 7 pages)
    html += '<div class="pagination-numbers">';
    
    const showPageNumbers = Math.min(7, totalPages);
    let startPage = Math.max(1, currentPage - Math.floor(showPageNumbers / 2));
    let endPage = Math.min(totalPages, startPage + showPageNumbers - 1);
    
    if (endPage - startPage + 1 < showPageNumbers) {
        startPage = Math.max(1, endPage - showPageNumbers + 1);
    }
    
    if (startPage > 1) {
        html += `<button class="page-number" onclick="changePage(1, '${course_id}')">1</button>`;
        if (startPage > 2) {
            html += '<span class="page-ellipsis">...</span>';
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `
            <button class="page-number ${i === currentPage ? 'active' : ''}" 
                    onclick="changePage(${i}, '${course_id}')">
                ${i}
            </button>
        `;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += '<span class="page-ellipsis">...</span>';
        }
        html += `<button class="page-number" onclick="changePage(${totalPages}, '${course_id}')">${totalPages}</button>`;
    }
    
    html += '</div>';
    
    paginationDiv.innerHTML = html;
    document.getElementById('main').appendChild(paginationDiv);
}

// Global function for page change
window.changePage = function(page, course_id) {
    if (page < 1 || page > Math.ceil(allAnswers.length / ITEMS_PER_PAGE)) return;
    renderPage(page, course_id);
}

// Thêm event listener cho icon speaker (phát âm thanh)
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('fa-volume-high')) {
        const word = e.target.closest('.frame_tuvung').querySelector('.tuvung').textContent;
        speakWord(word);
    }
});

function speakWord(word) {
    // Sử dụng Web Speech API để phát âm
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'en-US';
        utterance.rate = 0.8; // Tốc độ chậm hơn một chút
        window.speechSynthesis.speak(utterance);
    }
}