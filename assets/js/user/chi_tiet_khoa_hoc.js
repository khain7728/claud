document.addEventListener('DOMContentLoaded', function() {

    // ============================================================
    // 1. CẤU HÌNH & KHỞI TẠO
    // ============================================================
    
    const API_BASE_URL = 'http://localhost/VOCAB/api'; 
    
    const urlParams = new URLSearchParams(window.location.search);
    const COURSE_ID = urlParams.get('id');
    const USER_ID = urlParams.get('user_id') || 1;

    // Biến quản lý phân trang
    let currentPage = 1;
    const ITEMS_PER_PAGE = 20;

    if (!COURSE_ID) {
        alert("Không tìm thấy ID khóa học!");
        window.location.href = 'khoa_hoc_cua_toi.html';
        return;
    }

    // --- DOM ELEMENTS ---
    const btnTroVe = document.getElementById('btn-tro-ve');
    const tieuDeChinh = document.getElementById('tieu-de-khoa-hoc-chinh');
    
    // Thông số
    const giatriTacGia = document.getElementById('giatri-tac-gia');
    const giatriTienBo = document.getElementById('giatri-tien-do'); 
    const giatriTongTu = document.getElementById('giatri-so-lan-on'); 
    
    // Nút hành động
    const btnThemTuVung = document.getElementById('btn-them-tu-vung');
    const btnThemKhoaHoc = document.getElementById('btn-them-khoa-hoc');
    const btnXoaKhoaHoc = document.getElementById('btn-xoa-khoa-hoc'); 

    // Container
    const danhSachContainer = document.getElementById('danh-sach-tu-vung-container');
    const khungNutHoc = document.getElementById('khung-nut-hoc');
    
    const btnHoc = document.getElementById('btn-hoc');
    const btnOnTap = document.getElementById('btn-on-tap');
    const btnKiemTra = document.getElementById('btn-kiem-tra');

    const audioPlayer = document.getElementById('audio-player-an');

    // Tạo container phân trang
    const paginationContainer = document.createElement('div');
    paginationContainer.id = 'pagination-controls';
    paginationContainer.className = 'pagination-container';
    paginationContainer.style.textAlign = 'center';
    paginationContainer.style.marginTop = '20px';
    // Chèn container phân trang vào sau danh sách từ
    if (danhSachContainer && danhSachContainer.parentNode) {
        danhSachContainer.parentNode.insertBefore(paginationContainer, danhSachContainer.nextSibling);
    }

    let courseData = null;

    // ============================================================
    // 2. GỌI API LẤY DỮ LIỆU
    // ============================================================

    async function fetchCourseDetails(page = 1) {
        try {
            const response = await fetch(`${API_BASE_URL}/get-course-details.php?course_id=${COURSE_ID}&user_id=${USER_ID}&page=${page}&limit=${ITEMS_PER_PAGE}`);
            const text = await response.text();
            
            try {
                const result = JSON.parse(text);
                if (result.success) {
                    courseData = result.data;
                    renderPage(courseData);
                    renderPagination(result.data.pagination);
                } else {
                    alert("Lỗi API: " + result.error);
                    danhSachContainer.innerHTML = `<p class="thong-bao-rong">Lỗi: ${result.error}</p>`;
                }
            } catch (e) {
                console.error("Lỗi JSON:", e);
            }
        } catch (error) {
            console.error("Lỗi mạng:", error);
            danhSachContainer.innerHTML = '<p class="thong-bao-rong">Lỗi kết nối server.</p>';
        }
    }

    // ============================================================
    // 3. HÀM HIỂN THỊ (RENDER)
    // ============================================================

    function renderPage(data) {
        const info = data.info;
        const words = data.words;

        // A. Hiển thị thông tin chung
        if(tieuDeChinh) tieuDeChinh.textContent = info.tieuDe;
        if(giatriTacGia) giatriTacGia.textContent = info.nguoiTao;
        
        if(giatriTienBo) {
            giatriTienBo.textContent = info.tienDo + '%';
            giatriTienBo.style.color = info.tienDo > 0 ? '#28a745' : '#666'; 
        }
        
        if(giatriTongTu) giatriTongTu.textContent = info.soTu;

        // B. Xử lý ẩn/hiện nút bấm
        if(btnThemTuVung) btnThemTuVung.classList.add('an');
        if(btnThemKhoaHoc) btnThemKhoaHoc.classList.add('an');
        if(btnXoaKhoaHoc) btnXoaKhoaHoc.classList.add('an');
        if(khungNutHoc) khungNutHoc.classList.add('an'); 

        if (info.isOwner) {
            if(btnThemTuVung) btnThemTuVung.classList.remove('an');
            if(btnXoaKhoaHoc) {
                btnXoaKhoaHoc.classList.remove('an');
                btnXoaKhoaHoc.innerHTML = '<i class="fa-solid fa-trash-can"></i> Xóa khóa học';
            }
            if(khungNutHoc) khungNutHoc.classList.remove('an'); 
        } else {
            if (info.isJoined) {
                if(btnXoaKhoaHoc) {
                    btnXoaKhoaHoc.classList.remove('an');
                    btnXoaKhoaHoc.innerHTML = '<i class="fa-solid fa-sign-out-alt"></i> Rời khóa học';
                }
                if(khungNutHoc) khungNutHoc.classList.remove('an'); 
            } else {
                if(btnThemKhoaHoc) btnThemKhoaHoc.classList.remove('an');
            }
        }

        // C. Logic hiển thị nút Ôn tập / Kiểm tra
        if (info.daHoc > 0) {
             if(btnOnTap) btnOnTap.style.display = 'inline-block';
             if(btnKiemTra) btnKiemTra.style.display = 'inline-block';
        } else {
             if(btnOnTap) btnOnTap.style.display = 'none';
             if(btnKiemTra) btnKiemTra.style.display = 'none';
        }

        // D. Hiển thị danh sách từ vựng
        renderWordList(words, info.isOwner);
    }

    function renderPagination(pagination) {
        paginationContainer.innerHTML = '';
        if (pagination.total_pages <= 1) return;

        const { current_page, total_pages } = pagination;
        currentPage = current_page; 

        // Nút Previous
        const btnPrev = document.createElement('button');
        btnPrev.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
        btnPrev.className = 'btn-pagination';
        btnPrev.disabled = current_page === 1;
        btnPrev.onclick = () => fetchCourseDetails(current_page - 1);
        paginationContainer.appendChild(btnPrev);

        // Hiển thị trang hiện tại
        const infoSpan = document.createElement('span');
        infoSpan.textContent = ` Trang ${current_page} / ${total_pages} `;
        infoSpan.style.margin = '0 10px';
        paginationContainer.appendChild(infoSpan);

        // Nút Next
        const btnNext = document.createElement('button');
        btnNext.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
        btnNext.className = 'btn-pagination';
        btnNext.disabled = current_page === total_pages;
        btnNext.onclick = () => fetchCourseDetails(current_page + 1);
        paginationContainer.appendChild(btnNext);
    }

    function renderWordList(words, canEdit) {
        if(!danhSachContainer) return;
        danhSachContainer.innerHTML = '';
        
        if (words.length === 0) {
            danhSachContainer.innerHTML = '<p class="thong-bao-rong" style="text-align:center; padding:20px; color:#666">Chưa có từ vựng nào.</p>';
            return;
        }

        words.forEach((word, index) => {
            const div = document.createElement('div');
            div.className = 'the-tu-vung-chi-tiet';
            div.setAttribute('data-index', index + 1); // Thêm số thứ tự
            
            const audioSrc = word.audio_file ? word.audio_file : '';
            
            // Nút Edit / Delete
            const btnEditHtml = canEdit 
                ? `<button class="nut-icon nut-sua-tu" title="Sửa từ" onclick="editWord(${word.word_id})"><i class="fa-solid fa-pen"></i></button>`
                : '';

            const btnXoaHtml = canEdit 
                ? `<button class="nut-icon nut-xoa-tu" title="Xóa từ" onclick="deleteWord(${word.word_id})"><i class="fa-solid fa-times"></i></button>` 
                : '';

            // --- [SỬA ĐỔI 1] Xử lý hiển thị Loại từ (Part of Speech) ---
            // Chỉ hiển thị nếu có dữ liệu
            const hienThiTuLoai = word.part_of_speech 
                ? `<span style="font-size:0.8em; font-weight:normal; color:#666">(${word.part_of_speech})</span>` 
                : '';

            // --- [SỬA ĐỔI 2] Xử lý hiển thị Định nghĩa (Definition) ---
            // Chỉ hiển thị nếu có dữ liệu
            const hienThiDinhNghia = word.definition 
                ? `<p class="mota-tu" style="font-style:italic; margin-top:5px; color:#555">${word.definition}</p>` 
                : '';

            div.innerHTML = `
                <div class="thong-tin-tu-chi-tiet">
                    <p class="tu-vung-chinh">
                        ${word.word_en} 
                        ${hienThiTuLoai}
                    </p>
                    <p class="phien-am-tu" style="font-size:0.9em; color:#888">${word.pronunciation || ''}</p>
                    <p class="nghia-tu">${word.word_vi}</p>
                    ${hienThiDinhNghia}
                </div>
                <div class="hanh-dong-tu-chi-tiet">
                    <button class="nut-icon nut-phat-am" onclick="playAudio('${word.word_en}', '${audioSrc}')" title="Phát âm">
                        <i class="fa-solid fa-volume-high"></i>
                    </button>
                    ${btnEditHtml}
                    ${btnXoaHtml}
                </div>
            `;
            danhSachContainer.appendChild(div);
        });
    }

    // ============================================================
    // 4. CÁC HÀM XỬ LÝ (Global)
    // ============================================================
    
    window.playAudio = function(text, fileSrc) {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }

        if (fileSrc && fileSrc.trim() !== '') {
            audioPlayer.src = fileSrc;
            audioPlayer.load(); 
            audioPlayer.play().catch(e => {
                console.warn("File lỗi, dùng TTS thay thế");
                speakTTS(text);
            });
        } else {
            speakTTS(text);
        }
    };

    function speakTTS(text) {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel(); 
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            window.speechSynthesis.speak(utterance);
        } else {
            alert("Trình duyệt không hỗ trợ phát âm.");
        }
    }

    window.editWord = function(wordId) {
        window.location.href = `them_tu_vung.html?word_id=${wordId}&course_id=${COURSE_ID}`;
    };

    window.deleteWord = async function(wordId) {
        if (!confirm("Bạn có chắc chắn muốn xóa từ này?")) return;
        
        try {
            const response = await fetch(`${API_BASE_URL}/delete-word.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ word_id: wordId })
            });

            const result = await response.json();

            if (result.success) {
                alert("Đã xóa từ vựng!");
                fetchCourseDetails(currentPage); 
            } else {
                alert("Lỗi: " + result.error);
            }
        } catch (e) {
            console.error(e);
            alert("Lỗi kết nối server.");
        }
    };

    // ============================================================
    // 5. SỰ KIỆN NÚT BẤM
    // ============================================================

    if (btnTroVe) btnTroVe.addEventListener('click', () => window.location.href = 'khoa_hoc_cua_toi.html');

    if (btnThemTuVung) {
        btnThemTuVung.addEventListener('click', () => {
            window.location.href = `them_tu_vung.html?id=${COURSE_ID}&user_id=${USER_ID}`;
        });
    }
    

    const gotoStudy = (page) => {
        window.location.href = `${page}?course_id=${COURSE_ID}&user_id=${USER_ID}`;
    };
    
    async function checkAndNavigate(page) {
        try {
             if (courseData && courseData.info.daHoc < 2) {
                 alert('Bạn cần học ít nhất 2 từ vựng trước khi có thể ôn tập hoặc kiểm tra!');
                 return;
             }
             gotoStudy(page);
        } catch (error) {
             console.error(error);
        }
    }
    
    if (btnHoc) btnHoc.addEventListener('click', () => gotoStudy('user_hoc_tu_vung.html'));
    if (btnOnTap) btnOnTap.addEventListener('click', () => checkAndNavigate('user_hinh_thuc_on_tap.html'));
    if (btnKiemTra) btnKiemTra.addEventListener('click', () => checkAndNavigate('user_kiem_tra.html'));

    // --- SỰ KIỆN NÚT THAM GIA ---
    if (btnThemKhoaHoc) {
        btnThemKhoaHoc.addEventListener('click', async () => {
            if (!confirm('Bạn có muốn tham gia khóa học này?')) return;
            
            try {
                const response = await fetch(`${API_BASE_URL}/join-course.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ course_id: COURSE_ID })
                });

                const result = await response.json();

                if (result.success) {
                    alert(result.message || "Đã tham gia khóa học thành công!");
                    fetchCourseDetails(currentPage); // Reload lại trang để cập nhật UI
                } else {
                    alert("Lỗi: " + result.error);
                }
            } catch (e) {
                console.error(e);
                alert("Lỗi kết nối server khi tham gia khóa học.");
            }
        });
    }

    // --- SỰ KIỆN NÚT XÓA/RỜI KHÓA HỌC ---
    if (btnXoaKhoaHoc) {
        btnXoaKhoaHoc.addEventListener('click', async () => {
            const isOwner = courseData && courseData.info.isOwner;
            const action = isOwner ? 'delete' : 'leave';
            const confirmText = isOwner ? 'Bạn có chắc chắn muốn xóa vĩnh viễn khóa học này?' : 'Bạn có chắc chắn muốn rời khóa học này?';
            
            if (!confirm(confirmText)) return;
            
            try {
                const response = await fetch(`${API_BASE_URL}/delete-course.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        course_id: COURSE_ID, 
                        action: action 
                    })
                });

                const result = await response.json();

                if (result.success) {
                    alert(result.message);
                    window.location.href = 'khoa_hoc_cua_toi.html'; // Quay về danh sách khóa học
                } else {
                    alert("Lỗi: " + result.error);
                }
            } catch (e) {
                console.error(e);
                alert("Lỗi kết nối server.");
            }
        });
    }

    // --- INIT ---
    fetchCourseDetails(1);
});