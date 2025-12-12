document.addEventListener('DOMContentLoaded', function() {

    const API_BASE_URL = 'http://localhost/VOCAB/api';
    const urlParams = new URLSearchParams(window.location.search);
    
    // --- [SỬA ĐỔI 1] Cập nhật logic lấy ID để tránh xung đột ---
    // Ưu tiên lấy 'course_id' (chuẩn mới), nếu không có thì fallback về 'id' (tương thích code cũ)
    const COURSE_ID = urlParams.get('course_id') || urlParams.get('id');
    
    // Lấy ID từ cần sửa (nếu có)
    const TARGET_WORD_ID = urlParams.get('word_id'); 

    let editingIndex = -1; 

    // ... (Giữ nguyên phần Toast Notification Container) ...
    // Toast Notification Container
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    function showToast(message, duration = 2000, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast-msg ${type}`;
        const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
        toast.innerHTML = `<i class="fa-solid ${icon}"></i> ${message}`;
        toastContainer.appendChild(toast);
        requestAnimationFrame(() => { toast.classList.add('show'); });
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
        }, duration);
    }

    if (!COURSE_ID) {
        alert("Không tìm thấy ID khóa học.");
        window.location.href = 'khoa_hoc_cua_toi.html';
        return;
    }

    let danhSachTu = [];
    let isProcessing = false; // Prevent duplicate submissions
    let autoSaveTimer = null;

    // DOM ELEMENTS (Giữ nguyên)
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
    const inputFileAn = document.getElementById('input-file-an');

    // --- VALIDATION FUNCTIONS (Giữ nguyên) ---
    function isEnglishOnly(text) { return /^[a-zA-Z0-9\s]+$/.test(text); }
    function isVietnameseValid(text) { return /^[a-zA-Z0-9\s\u00C0-\u024F\u1E00-\u1EFF]+$/.test(text); }

    // --- SECURITY: Escape HTML để chống XSS ---
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // --- [SỬA ĐỔI 2] Tách logic kích hoạt sửa từ ra hàm riêng ---
    // Hàm này sẽ được gọi từ 2 nơi: 
    // 1. Khi người dùng click nút sửa trong danh sách
    // 2. Tự động gọi khi load trang nếu có word_id trên URL
    function triggerEditMode(index) {
        if (index < 0 || index >= danhSachTu.length) return;

        const tu = danhSachTu[index];
        
        // Điền dữ liệu vào form
        inputTuTiengAnh.value = tu.tiengAnh;
        inputPhienAm.value = tu.phienAm;
        inputNghiaTiengViet.value = tu.nghia;
        inputTuLoai.value = tu.tuLoai;
        inputLinkPhatAm.value = tu.linkAm;
        inputMoTa.value = tu.moTa;

        editingIndex = index;
        
        // Cập nhật giao diện nút bấm
        btnThemTu.innerHTML = `<i class="fa-solid fa-save"></i> Cập nhật từ`;
        
        // Render lại để highlight từ đang sửa
        renderDanhSach();

        // Cuộn lên đầu trang form và focus
        window.scrollTo({ top: 0, behavior: 'smooth' });
        inputTuTiengAnh.focus();
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

                // --- [SỬA ĐỔI 3] Logic tự động sửa nếu có TARGET_WORD_ID từ URL ---
                if (TARGET_WORD_ID) {
                    // Tìm vị trí của từ có ID trùng khớp trong mảng vừa tải về
                    // Lưu ý: dùng toán tử == thay vì === vì ID từ URL là string, ID trong object có thể là number
                    const indexCanSua = danhSachTu.findIndex(w => w.id == TARGET_WORD_ID);
                    
                    if (indexCanSua !== -1) {
                        triggerEditMode(indexCanSua);
                        showToast(`Đang chỉnh sửa từ: <b>${danhSachTu[indexCanSua].tiengAnh}</b>`);
                    }
                }
            }
        } catch (error) {
            console.error("Lỗi tải từ vựng:", error);
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
                
                // --- [SỬA ĐỔI 4] Thêm hiệu ứng Highlight cho từ đang sửa ---
                if (index === editingIndex) {
                    theTuVung.style.border = '2px solid #007bff';
                    theTuVung.style.backgroundColor = '#e7f1ff';
                    theTuVung.style.transform = 'scale(1.01)';
                    theTuVung.style.transition = 'all 0.3s ease';
                    theTuVung.setAttribute('data-editing', 'true');
                }

                theTuVung.setAttribute('data-index', index);

                const hienThiTuLoai = tu.tuLoai ? `<span style="font-weight:normal; font-size:0.9em">(${escapeHtml(tu.tuLoai)})</span>` : '';
                const hienThiDaCo = tu.isExisting ? `<span style="font-size:0.7em; color:green; margin-left:5px">✔ Đã có</span>` : '';
                const hienThiMoTa = tu.moTa ? `<p class="mota-tu">${escapeHtml(tu.moTa)}</p>` : '';

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
                    </div>
                    <div class="hanh-dong-tu">
                        <button class="nut-icon nut-phat-am" data-action="phat-am" title="Nghe thử"><i class="fa-solid fa-volume-high"></i></button>
                        <button class="nut-icon nut-sua-tu" data-action="sua-tu" title="Sửa từ này"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button class="nut-icon nut-xoa-tu" data-action="xoa-tu" title="Xóa"><i class="fa-solid fa-times"></i></button>
                    </div>
                `;
                danhSachContainer.appendChild(theTuVung);
            });
        }
        
        // (Giữ nguyên logic disable nút Lưu & Thoát)
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

    // --- UPLOAD AUDIO (Giữ nguyên) ---
    if (linkTaiFileAm && inputFileAn) {
        linkTaiFileAm.addEventListener('click', function(e) { e.preventDefault(); inputFileAn.click(); });
        inputFileAn.addEventListener('change', function() { if (this.files && this.files[0]) uploadAudioFile(this.files[0]); });
    }

    async function uploadAudioFile(file) {
        // ... (Giữ nguyên code upload) ...
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
            console.error("Upload error:", error);
            alert("Lỗi kết nối server khi upload file.");
        } finally {
            linkTaiFileAm.textContent = oldText; linkTaiFileAm.style.pointerEvents = "auto"; inputFileAn.value = '';
        }
    }

    // --- XỬ LÝ THÊM/SỬA TỪ (Giữ nguyên logic, chỉ cập nhật biến editingIndex) ---
    function handleThemTu(event) {
        event.preventDefault();
        if (btnThemTu.disabled || isProcessing) return;
        
        isProcessing = true;
        btnThemTu.disabled = true;
        const originalText = btnThemTu.innerHTML;
        btnThemTu.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý...';

        const tuTiengAnh = inputTuTiengAnh.value.trim();
        const phienAm = inputPhienAm.value.trim();
        const nghia = inputNghiaTiengViet.value.trim();
        const tuLoai = inputTuLoai.value.trim(); 
        const linkAm = inputLinkPhatAm.value.trim();
        const moTa = inputMoTa.value.trim();

        if (!tuTiengAnh || !nghia) {
            showToast('Vui lòng nhập đầy đủ "Từ tiếng Anh" và "Nghĩa tiếng Việt".', 2000, 'error');
            isProcessing = false;
            btnThemTu.disabled = false;
            btnThemTu.innerHTML = originalText;
            return;
        }

        if (!isEnglishOnly(tuTiengAnh)) {
            showToast('Từ tiếng Anh chỉ được chứa chữ cái và số.', 2000, 'error');
            inputTuTiengAnh.focus();
            isProcessing = false;
            btnThemTu.disabled = false;
            btnThemTu.innerHTML = originalText;
            return;
        }
        if (!isVietnameseValid(nghia)) {
            showToast('Nghĩa tiếng Việt không được chứa ký tự đặc biệt.', 2000, 'error');
            inputNghiaTiengViet.focus();
            isProcessing = false;
            btnThemTu.disabled = false;
            btnThemTu.innerHTML = originalText;
            return;
        }
        if (linkAm && linkAm.startsWith('http') && !isValidUrl(linkAm)) {
            showToast('Link phát âm không hợp lệ.', 2000, 'error');
            isProcessing = false;
            btnThemTu.disabled = false;
            btnThemTu.innerHTML = originalText;
            return;
        }

        // Validate trùng lặp
        const isDuplicate = danhSachTu.some((t, idx) => {
            if (editingIndex > -1 && idx === editingIndex) return false; 
            const matchEn = t.tiengAnh.toLowerCase() === tuTiengAnh.toLowerCase();
            const matchVi = t.nghia.toLowerCase() === nghia.toLowerCase();
            return matchEn && matchVi;
        });

        if (isDuplicate) {
            showToast('Từ này đã có trong danh sách!', 2000, 'error');
            isProcessing = false;
            btnThemTu.disabled = false;
            btnThemTu.innerHTML = originalText;
            return;
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
        
        isProcessing = false;
        btnThemTu.disabled = false;
        btnThemTu.innerHTML = originalText;
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
            // --- [SỬA ĐỔI 5] Gọi hàm triggerEditMode thay vì viết inline ---
            triggerEditMode(index);
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

    // ... (Giữ nguyên các hàm helper còn lại: handlePhatAm, phatAmBangAPI, isValidUrl, handleLuuVaThoat, handleHuyBo) ...
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
        try { const url = new URL(string); return url.protocol === "http:" || url.protocol === "https:"; } catch (_) { return false; }
    }

    async function handleLuuVaThoat() {
        if (danhSachTu.length === 0) { alert('Danh sách trống.'); return; }
        if (danhSachTu.length < 3) { alert(`Bạn mới nhập ${danhSachTu.length} từ. Cần nhập tối thiểu 3 từ.`); return; }
        
        if (editingIndex > -1) {
            if(!confirm("Bạn đang sửa một từ nhưng chưa ấn 'Cập nhật'. Dữ liệu đang sửa sẽ KHÔNG được lưu. Tiếp tục thoát?")) return;
        }

        if (!confirm(`Bạn sắp lưu ${danhSachTu.length} từ vựng. Tiếp tục?`)) return;

        btnLuuVaThoat.textContent = "Đang lưu...";
        btnLuuVaThoat.disabled = true;

        const wordsToSend = danhSachTu.map(w => ({
            word_id: w.id,
            word_en: w.tiengAnh,
            word_vi: w.nghia,
            part_of_speech: w.tuLoai,
            pronunciation: w.phienAm,
            definition: w.moTa,
            audio_file: w.linkAm
        }));

        try {
            const response = await fetch(`${API_BASE_URL}/add-words.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    course_id: COURSE_ID,
                    words: wordsToSend
                })
            });

            const textResult = await response.text();
            let result;
            try { result = JSON.parse(textResult); } catch (e) { throw new Error("Phản hồi server lỗi."); }

            if (result.success) {
                alert(result.message || "Lưu thành công!");
                window.location.href = `khoa_hoc_cua_toi.html`;
            } else {
                alert(result.error || "Có lỗi xảy ra.");
                renderDanhSach(); 
                btnLuuVaThoat.textContent = "Lưu & Thoát";
                btnLuuVaThoat.disabled = false;
            }
        } catch (error) {
            console.error("Save error:", error);
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

    if (formThemTu) formThemTu.addEventListener('submit', handleThemTu);
    if (danhSachContainer) danhSachContainer.addEventListener('click', handleDanhSachClick);
    if (btnTroVe) btnTroVe.addEventListener('click', () => history.back());
    if (btnHuyBo) btnHuyBo.addEventListener('click', handleHuyBo);
    if (btnLuuVaThoat) btnLuuVaThoat.addEventListener('click', handleLuuVaThoat);

    loadExistingWords();
});