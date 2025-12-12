document.addEventListener('DOMContentLoaded', function() {

    const API_BASE_URL = 'http://localhost/VOCAB/api';
    const urlParams = new URLSearchParams(window.location.search);
    const COURSE_ID = urlParams.get('id');
    const VIEW_ONLY = urlParams.get('view_only') === '1';

    let editingIndex = -1; 

    // Toast Notification Container
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        document.body.appendChild(toastContainer);
    }

    function showToast(message, duration = 2000) {
        const toast = document.createElement('div');
        toast.className = 'toast-msg';
        toast.innerHTML = `<i class="fa-solid fa-check-circle"></i> ${message}`;
        toastContainer.appendChild(toast);
        requestAnimationFrame(() => { toast.classList.add('show'); });
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
        }, duration);
    }

    if (!COURSE_ID) {
        alert("Không tìm thấy ID khóa học.");
        window.location.href = 'quanlykhoahoc.html';
        return;
    }

    // Nếu chế độ chỉ xem, hiển thị thông báo và vô hiệu hóa form
    if (VIEW_ONLY) {
        const pageTitle = document.querySelector('.tieu-de-chinh');
        if (pageTitle) pageTitle.textContent = 'Xem từ vựng (Chỉ đọc)';
        
        const subTitle = document.querySelector('.tieu-de-phu');
        if (subTitle) subTitle.innerHTML = '<span style="color:#DC2626;"><i class="fa-solid fa-lock"></i> Khóa học riêng tư của người dùng - Chỉ được xem, không chỉnh sửa</span>';
    }

    let danhSachTu = [];

    // DOM ELEMENTS
    const formThemTu = document.getElementById('form-them-tu');
    const btnThemTu = formThemTu.querySelector('button[type="submit"]'); 
    const originalBtnContent = btnThemTu.innerHTML; 

    const danhSachContainer = document.getElementById('danh-sach-tu-vung-container');
    const soLuongTuSpan = document.getElementById('so-luong-tu');
    const btnTroVe = document.getElementById('btn-tro-ve');
    const btnHuyBo = document.getElementById('btn-huy-bo');
    const btnLuuVaThoat = document.getElementById('btn-luu-va-thoat');

    const inputTuTiengAnh = document.getElementById('input-tu-tieng-anh');
    const inputPhienAm = document.getElementById('input-phien-am');
    const inputNghiaTiengViet = document.getElementById('input-nghia-tieng-viet');
    const inputTuLoai = document.getElementById('input-tu-loai');
    const inputLinkPhatAm = document.getElementById('input-link-phat-am');
    const inputMoTa = document.getElementById('input-mo-ta');
    const audioPlayer = document.getElementById('audio-player-an');
    
    const linkTaiFileAm = document.getElementById('link-tai-file-am');
    
    // === TẠO INPUT FILE NẾU KHÔNG CÓ TRONG HTML ===
    let inputFileAn = document.getElementById('input-file-an');
    if (!inputFileAn) {
        inputFileAn = document.createElement('input');
        inputFileAn.type = 'file';
        inputFileAn.id = 'input-file-an';
        inputFileAn.accept = '.mp3';
        inputFileAn.style.display = 'none';
        document.body.appendChild(inputFileAn);
    }

    // --- VALIDATION FUNCTIONS ---
    function isEnglishOnly(text) {
        return /^[a-zA-Z0-9\s]+$/.test(text);
    }

    function isVietnameseValid(text) {
        return /^[a-zA-Z0-9\s\u00C0-\u024F\u1E00-\u1EFF]+$/.test(text);
    }
    // ----------------------------

    // --- SECURITY: Escape HTML để chống XSS ---
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // --- LOAD EXISTING WORDS ---
    async function loadExistingWords() {
        try {
            const response = await fetch(`${API_BASE_URL}/get-words.php?course_id=${COURSE_ID}`);
            const result = await response.json();

            if (result.success && result.data && result.data.words) {
                const wordsFromDB = result.data.words;
                
                const mappedWords = wordsFromDB.map(w => ({
                    id: w.word_id, 
                    tiengAnh: w.word,
                    nghia: w.meaning,
                    phienAm: w.ipa || '', 
                    tuLoai: w.part_of_speech || '',
                    linkAm: w.audio || '',
                    moTa: w.definition || '',
                    isExisting: true
                }));

                danhSachTu = [...danhSachTu, ...mappedWords];
                renderDanhSach();
            }
        } catch (error) {
            console.error("Lỗi tải từ vựng cũ:", error);
        }
    }

    // --- RENDER ---
    function renderDanhSach() {
        danhSachContainer.innerHTML = '';

        if (danhSachTu.length === 0) {
            danhSachContainer.innerHTML = '<p class="thong-bao-rong">Chưa có từ vựng nào.</p>';
        } else {
            danhSachTu.forEach((tu, index) => {
                const theTuVung = document.createElement('div');
                theTuVung.className = 'the-tu-vung';
                if (tu.isExisting) theTuVung.classList.add('tu-cu');
                
                if (index === editingIndex) {
                    theTuVung.style.border = '2px solid #007bff';
                    theTuVung.style.backgroundColor = '#f0f8ff';
                }

                theTuVung.setAttribute('data-index', index);

                const hienThiTuLoai = tu.tuLoai ? `<span style="font-weight:normal; font-size:0.9em">(${escapeHtml(tu.tuLoai)})</span>` : '';
                const hienThiDaCo = tu.isExisting ? `<span style="font-size:0.7em; color:green; margin-left:5px">✔ Đã có</span>` : '';
                const hienThiLink = tu.linkAm ? `<i class="fa-solid fa-link" style="font-size:0.8em; color:#888" title="Có link audio"></i>` : '';
                const hienThiMoTa = tu.moTa ? `<p class="mo-ta-tu" style="font-size:0.9em; color:#555; font-style:italic; margin-top:4px;">${escapeHtml(tu.moTa)}</p>` : '';

                const actionButtons = VIEW_ONLY 
                    ? `<button class="nut-icon nut-phat-am" data-action="phat-am" title="Nghe thử"><i class="fa-solid fa-volume-high"></i></button>`
                    : `<button class="nut-icon nut-sua-tu" data-action="sua-tu" title="Sửa từ này"><i class="fa-solid fa-pen-to-square"></i></button>
                       <button class="nut-icon nut-phat-am" data-action="phat-am" title="Nghe thử"><i class="fa-solid fa-volume-high"></i></button>
                       <button class="nut-icon nut-xoa-tu" data-action="xoa-tu" title="Xóa"><i class="fa-solid fa-times"></i></button>`;

                theTuVung.innerHTML = `
                    <div class="thong-tin-tu">
                        <p class="tu-vung-chinh">
                            ${escapeHtml(tu.tiengAnh)} 
                            ${hienThiTuLoai}
                            ${hienThiDaCo}
                        </p>
                        <p class="phien-am-tu">${escapeHtml(tu.phienAm)}</p>
                        <p class="nghia-tu">${escapeHtml(tu.nghia)}</p>
                        ${hienThiMoTa}
                        ${hienThiLink}
                    </div>
                    <div class="hanh-dong-tu">
                        ${actionButtons}
                    </div>
                `;
                danhSachContainer.appendChild(theTuVung);
            });
        }
        
        const count = danhSachTu.length;
        if (count < 3) {
            soLuongTuSpan.innerHTML = `${count} <span style="color:red; font-size:0.8em; margin-left:5px">(Cần tối thiểu 3 từ)</span>`;
            btnLuuVaThoat.disabled = true;
            btnLuuVaThoat.style.opacity = '0.5';
            btnLuuVaThoat.style.cursor = 'not-allowed';
        } else {
            soLuongTuSpan.textContent = count;
            btnLuuVaThoat.disabled = false;
            btnLuuVaThoat.style.opacity = '1';
            btnLuuVaThoat.style.cursor = 'pointer';
        }
    }

    // --- UPLOAD AUDIO ---
    if (linkTaiFileAm && inputFileAn) {
        linkTaiFileAm.addEventListener('click', function(e) { e.preventDefault(); inputFileAn.click(); });
        inputFileAn.addEventListener('change', function() { if (this.files && this.files[0]) uploadAudioFile(this.files[0]); });
    }

    async function uploadAudioFile(file) {
        if (file.type !== 'audio/mpeg' && file.type !== 'audio/mp3' && !file.name.endsWith('.mp3')) {
            alert('Vui lòng chỉ chọn file .mp3'); return;
        }
        const oldText = linkTaiFileAm.textContent;
        linkTaiFileAm.textContent = "Đang tải lên...";
        linkTaiFileAm.style.pointerEvents = "none";
        
        const formData = new FormData();
        formData.append('audio_file', file);

        try {
            const response = await fetch(`${API_BASE_URL}/upload_audio.php`, { method: 'POST', body: formData });
            const result = await response.json();
            if (result.success) {
                inputLinkPhatAm.value = result.url; showToast("Đã tải file lên thành công!");
            } else {
                alert("Lỗi upload: " + (result.error || "Không xác định"));
            }
        } catch (error) {
            console.error(error); alert("Lỗi kết nối server khi upload file.");
        } finally {
            linkTaiFileAm.textContent = oldText; linkTaiFileAm.style.pointerEvents = "auto"; inputFileAn.value = '';
        }
    }

    // --- XỬ LÝ THÊM/SỬA TỪ ---
    function handleThemTu(event) {
        event.preventDefault();
        if (btnThemTu.disabled) return;
        btnThemTu.disabled = true;

        const tuTiengAnh = inputTuTiengAnh.value.trim();
        const phienAm = inputPhienAm.value.trim();
        const nghia = inputNghiaTiengViet.value.trim();
        const tuLoai = inputTuLoai.value.trim(); 
        const linkAm = inputLinkPhatAm.value.trim();
        const moTa = inputMoTa.value.trim();

        // 1. Validate bắt buộc
        if (!tuTiengAnh || !nghia) {
            alert('Vui lòng nhập đầy đủ "Từ tiếng Anh" và "Nghĩa tiếng Việt".');
            btnThemTu.disabled = false; return;
        }

        // 2. Validate ký tự đặc biệt
        if (!isEnglishOnly(tuTiengAnh)) {
            alert('Lỗi: Từ tiếng Anh chỉ được chứa chữ cái và số.');
            inputTuTiengAnh.focus(); btnThemTu.disabled = false; return;
        }
        if (!isVietnameseValid(nghia)) {
            alert('Lỗi: Nghĩa tiếng Việt không được chứa ký tự đặc biệt (@, !, #...).');
            inputNghiaTiengViet.focus(); btnThemTu.disabled = false; return;
        }

        if (linkAm && linkAm.startsWith('http') && !isValidUrl(linkAm)) {
            alert('Link phát âm không hợp lệ.');
            btnThemTu.disabled = false; return;
        }

        // --- KIỂM TRA TRÙNG LẶP CHẶT CHẼ ---
        const isDuplicate = danhSachTu.some((t, idx) => {
            if (editingIndex > -1 && idx === editingIndex) return false; 

            const matchEn = t.tiengAnh.toLowerCase() === tuTiengAnh.toLowerCase();
            const matchVi = t.nghia.toLowerCase() === nghia.toLowerCase();
            const matchType = t.tuLoai.toLowerCase() === tuLoai.toLowerCase();
            const matchIpa = t.phienAm === phienAm;
            const matchDef = t.moTa === moTa;
            const matchAudio = t.linkAm === linkAm;
            
            return matchEn && matchVi && matchType && matchIpa && matchDef && matchAudio;
        });

        if (isDuplicate) {
            alert('Dữ liệu này hoàn toàn trùng khớp với một từ đã có (giống cả nghĩa, loại từ, mô tả...).');
            btnThemTu.disabled = false; return;
        }

        const tuData = {
            id: editingIndex > -1 ? danhSachTu[editingIndex].id : null,
            tiengAnh: tuTiengAnh,
            phienAm: phienAm,
            nghia: nghia,
            tuLoai: tuLoai,
            linkAm: linkAm,
            moTa: moTa,
            isExisting: editingIndex > -1 ? danhSachTu[editingIndex].isExisting : false 
        };

        if (editingIndex > -1) {
            danhSachTu[editingIndex] = tuData;
            showToast(`Đã cập nhật: <b>${tuTiengAnh}</b>`);
            editingIndex = -1;
            btnThemTu.innerHTML = originalBtnContent;
        } else {
            danhSachTu.push(tuData);
            showToast(`Đã thêm: <b>${tuTiengAnh}</b>`);
        }

        renderDanhSach();
        formThemTu.reset();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        inputTuTiengAnh.focus();
        setTimeout(() => { btnThemTu.disabled = false; }, 300);
    }

    function handleDanhSachClick(event) {
        const nut = event.target.closest('.nut-icon');
        if (!nut) return;

        const theTuVung = nut.closest('.the-tu-vung');
        const index = parseInt(theTuVung.getAttribute('data-index'), 10);
        const tu = danhSachTu[index];
        const hanhDong = nut.getAttribute('data-action');

        if (hanhDong === 'phat-am') handlePhatAm(tu);
        
        if (hanhDong === 'sua-tu') {
            inputTuTiengAnh.value = tu.tiengAnh;
            inputPhienAm.value = tu.phienAm;
            inputNghiaTiengViet.value = tu.nghia;
            inputTuLoai.value = tu.tuLoai;
            inputLinkPhatAm.value = tu.linkAm;
            inputMoTa.value = tu.moTa;

            editingIndex = index;
            btnThemTu.innerHTML = `<i class="fa-solid fa-save"></i> Cập nhật từ`;
            window.scrollTo({ top: 0, behavior: 'smooth' });
            inputTuTiengAnh.focus();
            renderDanhSach(); 
        }

        if (hanhDong === 'xoa-tu') {
            if (confirm(`Bạn có chắc muốn xóa từ "${tu.tiengAnh}" không?`)) {
                if (index === editingIndex) {
                    editingIndex = -1;
                    btnThemTu.innerHTML = originalBtnContent;
                    formThemTu.reset();
                } else if (index < editingIndex) {
                    editingIndex--;
                }
                danhSachTu.splice(index, 1);
                renderDanhSach();
            }
        }
    }

    function handlePhatAm(tu) {
        if (audioPlayer) { audioPlayer.pause(); audioPlayer.currentTime = 0; }
        window.speechSynthesis.cancel(); 
        
        // === FIX: Nếu có linkAm, ưu tiên phát file, KHÔNG fallback sang text ===
        if (tu.linkAm && tu.linkAm.trim() !== '') {
            audioPlayer.src = tu.linkAm; 
            audioPlayer.play().catch(e => {
                console.error("Lỗi phát audio file:", e);
                alert("Không thể phát file audio. Vui lòng kiểm tra URL: " + tu.linkAm);
            });
        } else if (tu.tiengAnh) {
            // Chỉ phát text nếu không có file audio
            phatAmBangAPI(tu.tiengAnh);
        }
    }

    function phatAmBangAPI(text) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            window.speechSynthesis.speak(utterance);
        } else {
            alert("Trình duyệt không hỗ trợ phát âm.");
        }
    }

    function isValidUrl(string) {
        try {
            const url = new URL(string);
            return url.protocol === "http:" || url.protocol === "https:";
        } catch (_) { return false; }
    }

    // --- [ĐÃ SỬA ĐỔI] SAVE TO SERVER (SỬ DỤNG FILE update-words.php) ---
    async function handleLuuVaThoat() {
        if (danhSachTu.length === 0) { alert('Danh sách trống.'); return; }
        if (danhSachTu.length < 3) { alert(`Bạn mới nhập ${danhSachTu.length} từ. Cần nhập tối thiểu 3 từ.`); return; }
        
        if (editingIndex > -1) {
            if(!confirm("Bạn đang sửa một từ nhưng chưa ấn 'Cập nhật'. Dữ liệu đang sửa sẽ KHÔNG được lưu. Tiếp tục thoát?")) return;
        }

        if (!confirm(`Bạn sắp lưu ${danhSachTu.length} từ vựng. Tiếp tục?`)) return;

        btnLuuVaThoat.textContent = "Đang lưu...";
        btnLuuVaThoat.disabled = true;

        // [QUAN TRỌNG] MAP DỮ LIỆU TỪ JS (tiengAnh, tuLoai...) -> DATABASE (word_en, part_of_speech...)
        const wordsToSend = danhSachTu.map(w => ({
            word_id: w.id,              // Server cần ID để biết là UPDATE
            word_en: w.tiengAnh,        
            word_vi: w.nghia,           
            part_of_speech: w.tuLoai,   // Map đúng tên cột
            pronunciation: w.phienAm,   
            definition: w.moTa,         
            audio_file: w.linkAm        
        }));

        try {
            // [QUAN TRỌNG] GỌI FILE API MỚI: update-words.php
            const response = await fetch(`${API_BASE_URL}/add-words.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    course_id: COURSE_ID,
                    words: wordsToSend // Gửi dữ liệu đã được map
                })
            });

            const textResult = await response.text();
            let result;
            try {
                result = JSON.parse(textResult);
            } catch (e) {
                console.error("Server error:", textResult);
                throw new Error("Phản hồi server lỗi.");
            }

            if (result.success) {
                alert(result.message || "Lưu thành công!");
                window.location.href = `quanlykhoahoc.html`;
            } else {
                alert(result.error || "Có lỗi xảy ra.");
                renderDanhSach(); 
                btnLuuVaThoat.textContent = "Lưu & Thoát";
                btnLuuVaThoat.disabled = false;
            }
        } catch (error) {
            console.error(error);
            alert("Lỗi: " + error.message);
            renderDanhSach(); 
            btnLuuVaThoat.textContent = "Lưu & Thoát";
            btnLuuVaThoat.disabled = false;
        }
    }

    function handleHuyBo() {
        if (danhSachTu.length > 0) {
            if (confirm('Bạn có chắc muốn hủy? Dữ liệu chưa lưu sẽ mất.')) history.back();
        } else { history.back(); }
    }

    // Vô hiệu hóa form và nút nếu ở chế độ chỉ xem
    if (VIEW_ONLY) {
        if (formThemTu) formThemTu.style.display = 'none';
        if (btnLuuVaThoat) btnLuuVaThoat.style.display = 'none';
        if (btnHuyBo) btnHuyBo.style.display = 'none';
    } else {
        if (formThemTu) formThemTu.addEventListener('submit', handleThemTu);
        if (btnHuyBo) btnHuyBo.addEventListener('click', handleHuyBo);
        if (btnLuuVaThoat) btnLuuVaThoat.addEventListener('click', handleLuuVaThoat);
    }

    if (danhSachContainer) danhSachContainer.addEventListener('click', handleDanhSachClick);
    if (btnTroVe) btnTroVe.addEventListener('click', () => history.back());

    loadExistingWords();
});