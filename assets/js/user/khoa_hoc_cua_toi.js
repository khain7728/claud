document.addEventListener('DOMContentLoaded', function() {

    // ============================================================
    // 1. CẤU HÌNH
    // ============================================================
    const API_BASE_URL = 'http://localhost/VOCAB/api'; 
    const urlParams = new URLSearchParams(window.location.search);
    const USER_ID = localStorage.getItem('user_id'); 

    // DOM ELEMENTS
    const tabKhoaHocCongDong = document.getElementById('tab-khoa-hoc-cong-dong');
    const danhSachContainer = document.getElementById('danh-sach-khoa-hoc');
    const khungPhanTrang = document.getElementById('khung-phan-trang');
    const thanhTimKiem = document.getElementById('thanh-tim-kiem');
    
    // [FIX LỖI #30]: Khai báo biến hiển thị kết quả. 
    let textKetQuaTimKiem = document.getElementById('text-ket-qua-tim-kiem');

    // Filter Elements
    const boLocNguonGocBtn = document.getElementById('bo-loc-nguon-goc');
    const tieuDeNguonGoc = document.getElementById('tieu-de-nguon-goc');
    const menuLocNguonGoc = document.getElementById('menu-loc-nguon-goc');
    const boLocTrangThaiBtn = document.getElementById('bo-loc-trang-thai');
    const tieuDeTrangThai = document.getElementById('tieu-de-trang-thai');
    const menuLocTrangThai = document.getElementById('menu-loc-trang-thai');

    // MODAL
    const btnTaoKhoaHoc = document.getElementById('btn-tao-khoa-hoc'); 
    const khungCheMo = document.getElementById('khung-che-mo');
    const modalTaoKhoaHoc = document.getElementById('modal-tao-khoa-hoc');
    const btnHuyModalTaoKhoaHoc = document.getElementById('btn-huy-modal-taokhoahoc');
    const btnSubmitTaoKhoaHoc = document.getElementById('btn-them-tu-vung'); 
    const tieuDeModal = document.querySelector('#modal-tao-khoa-hoc .tieu-de-modal');
    // [FIX LỖI #33]: Bắt thêm các nút đóng có class .close (nút X)
    const btnCloseIcons = document.querySelectorAll('.close');
    
    // TAGS
    const btnChonTag = document.getElementById('btn-chon-tag');
    const tagInput = document.getElementById('tag-input');
    const modalThemTag = document.getElementById('modal-them-tag');
    const btnDongModalTag = document.getElementById('btn-dong-modal-tag');
    const btnXacNhanTag = document.getElementById('btn-xac-nhan-tag');
    const khungTagDaChon = document.getElementById('khung-tag-da-chon');
    const khungTagGoiY = document.getElementById('khung-tag-goi-y');

    // STATE
    let coursesData = [];    
    let filteredData = [];   
    let boLocNguonGoc = 'tat-ca'; 
    let boLocTrangThai = 'tat-ca'; 
    let tuKhoaTimKiem = '';
    let trangHienTai = 1;
    const soMucTrenTrang = 5;
    let editingCourseId = null;
    let availableTags = []; 
    let dsTagDaChon = [];   

    // [FIX LỖI #41]: Hàm Debounce giúp tối ưu tìm kiếm (chống lag)
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

    // ============================================================
    // 2. API CALLS
    // ============================================================

    async function fetchMyCourses() {
        try {
            if (danhSachContainer) danhSachContainer.innerHTML = '<p style="text-align:center">Đang tải dữ liệu...</p>';
            const response = await fetch(`${API_BASE_URL}/get-my-courses.php?user_id=${USER_ID}`);
            const result = await response.json();

            if (result.success) {
                // --- [LOGIC MỚI] XỬ LÝ TỰ ĐỘNG DỰA TRÊN SỐ TỪ ---
                const rawData = result.data;
                const validCourses = [];

                rawData.forEach(course => {
                    const soTu = parseInt(course.soTu || 0);

                    // Chỉ xử lý nếu user là chủ sở hữu
                    if (course.isOwner) {
                        if (soTu === 0) {
                            // CASE 1: 0 từ -> Xóa vĩnh viễn & Ẩn khỏi list
                            console.warn(`Khóa học ${course.id} (0 từ): Đang tự động xóa...`);
                            autoDeleteCourseSilent(course.id);
                            // Không push vào validCourses -> Ẩn ngay lập tức
                        } 
                        else if (soTu < 3) {
                            // CASE 2: 1 hoặc 2 từ -> Chuyển sang Riêng tư (nếu đang Công khai)
                            // Lưu ý: course.trangThaiChiaSe thường là text hiển thị ("Công khai" / "Riêng tư")
                            if (course.trangThaiChiaSe === 'Công khai') {
                                console.warn(`Khóa học ${course.id} (<3 từ): Chuyển về Riêng tư...`);
                                autoSetPrivateSilent(course);
                                // Cập nhật lại object để hiển thị đúng trên UI ngay
                                course.trangThaiChiaSe = 'Riêng tư'; 
                            }
                            // Vẫn hiển thị ra list
                            validCourses.push(course);
                        } 
                        else {
                            // CASE 3: >= 3 từ -> Giữ nguyên trạng thái
                            validCourses.push(course);
                        }
                    } else {
                        // Khóa học tham gia -> Giữ nguyên
                        validCourses.push(course);
                    }
                });

                coursesData = validCourses;
                // ----------------------------------------------------

                filteredData = coursesData;
                renderDanhSach();
            } else {
                if (danhSachContainer) danhSachContainer.innerHTML = `<p class="thong-bao-rong">Lỗi: ${result.error}</p>`;
            }
        } catch (error) {
            console.error(error);
            if (danhSachContainer) danhSachContainer.innerHTML = `<p class="thong-bao-rong">Lỗi kết nối server.</p>`;
        }
    }

    // Hàm xóa ngầm (khi số từ = 0)
    async function autoDeleteCourseSilent(courseId) {
        try {
            await fetch(`${API_BASE_URL}/delete-course.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ course_id: courseId, action: 'delete' })
            });
        } catch (e) {
            console.error("Lỗi xóa ngầm:", e);
        }
    }

    // Hàm chuyển về riêng tư ngầm (khi số từ < 3)
    async function autoSetPrivateSilent(course) {
        try {
            // Cần gửi đủ thông tin để update-course.php không bị lỗi thiếu trường
            const payload = {
                course_id: course.id,
                course_name: course.tieuDe, // Mapping lại tên trường cho khớp API
                description: course.mota || '',
                visibility: 'private',      // Ép về private
                tags: course.tags || []
            };

            await fetch(`${API_BASE_URL}/update-course.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (e) {
            console.error("Lỗi cập nhật riêng tư ngầm:", e);
        }
    }

    async function fetchTags() {
        try {
            const response = await fetch(`${API_BASE_URL}/get-tags.php`);
            const result = await response.json();
            if (result.success) availableTags = result.data;
        } catch (error) { console.error("Lỗi tải tags:", error); }
    }

    async function saveCourse(payload, isUpdate) {
        const endpoint = isUpdate ? '/update-course.php' : '/create-course.php';
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            return await response.json();
        } catch (error) {
            return { success: false, error: "Lỗi kết nối server" };
        }
    }

    async function deleteOrLeaveCourse(courseId, isOwner) {
        const action = isOwner ? 'delete' : 'leave';
        if (!confirm(isOwner ? 'Xóa vĩnh viễn khóa học?' : 'Rời khỏi khóa học?')) return;
        try {
            const response = await fetch(`${API_BASE_URL}/delete-course.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ course_id: courseId, action: action })
            });
            const result = await response.json();
            if (result.success) {
                alert(result.message);
                fetchMyCourses();
            } else {
                alert("Lỗi: " + result.error);
            }
        } catch (e) { alert("Lỗi kết nối"); }
    }

    // ============================================================
    // 3. RENDER UI
    // ============================================================

    function renderDanhSach() {
        if (!danhSachContainer) return;

        filteredData = coursesData.filter(kh => {
            let hienThiTrangThai = kh.trangThai;
            if (kh.tienDo === 100) hienThiTrangThai = 'Hoàn thành';

            // Filter 1: Nguồn gốc
            let matchNguonGoc = true;
            if (boLocNguonGoc === 'da-tao') matchNguonGoc = kh.isOwner;
            else if (boLocNguonGoc === 'da-tham-gia') matchNguonGoc = !kh.isOwner;
            
            // Filter 2: Trạng thái
            let matchTrangThai = true;
            if (boLocTrangThai === 'chua-hoc') matchTrangThai = hienThiTrangThai === 'Chưa học';
            else if (boLocTrangThai === 'dang-hoc') matchTrangThai = hienThiTrangThai === 'Đang học';
            else if (boLocTrangThai === 'hoan-thanh') matchTrangThai = hienThiTrangThai === 'Hoàn thành';
            
            // Filter 3: Tìm kiếm
            let matchSearch = true;
            if (tuKhoaTimKiem) {
                const k = tuKhoaTimKiem.toLowerCase();
                matchSearch = kh.tieuDe.toLowerCase().includes(k) || (kh.mota && kh.mota.toLowerCase().includes(k));
            }
            return matchNguonGoc && matchTrangThai && matchSearch;
        });

        // [FIX Lỗi #30]: Hiển thị dòng chữ kết quả tìm kiếm
        if (!textKetQuaTimKiem) {
            textKetQuaTimKiem = document.createElement('div');
            textKetQuaTimKiem.id = 'text-ket-qua-tim-kiem';
            textKetQuaTimKiem.style.marginBottom = '10px';
            textKetQuaTimKiem.style.fontStyle = 'italic';
            textKetQuaTimKiem.style.color = '#666';
            danhSachContainer.parentNode.insertBefore(textKetQuaTimKiem, danhSachContainer);
        }

        if (tuKhoaTimKiem && tuKhoaTimKiem.trim() !== '') {
            textKetQuaTimKiem.innerHTML = `Có ${filteredData.length} khóa học liên quan.`;
            textKetQuaTimKiem.style.display = 'block';
            textKetQuaTimKiem.style.color = '#6b7280'; 
            textKetQuaTimKiem.style.marginBottom = '1rem';
        } else {
            textKetQuaTimKiem.innerText = '';
            textKetQuaTimKiem.style.display = 'none';
        }

        const tongSoMuc = filteredData.length;
        const tongSoTrang = Math.ceil(tongSoMuc / soMucTrenTrang);
        if (trangHienTai > tongSoTrang && tongSoTrang > 0) trangHienTai = 1;
        if (tongSoTrang === 0) trangHienTai = 1;

        const batDau = (trangHienTai - 1) * soMucTrenTrang;
        const ketThuc = batDau + soMucTrenTrang;
        const dataTrenTrang = filteredData.slice(batDau, ketThuc);

        danhSachContainer.innerHTML = '';
        if (dataTrenTrang.length === 0) {
            danhSachContainer.innerHTML = '<p class="thong-bao-rong">Không tìm thấy khóa học nào.</p>';
        } else {
            dataTrenTrang.forEach(kh => danhSachContainer.appendChild(taoTheKhoaHoc(kh)));
        }
        renderPhanTrang(tongSoTrang);
    }

    function taoTheKhoaHoc(kh) {
        if (kh.tienDo === 100) kh.trangThai = 'Hoàn thành';

        const div = document.createElement('div');
        div.className = 'the-khoa-hoc';
        div.setAttribute('data-id', kh.id);

        let classTrangThai = kh.trangThai === 'Hoàn thành' ? 'trang-thai-hoan-thanh' : (kh.trangThai === 'Đang học' ? 'trang-thai-dang-hoc' : 'trang-thai-chua-hoc');
        let btnAction = kh.tienDo === 100 ? { text: 'Kiểm tra', action: 'kiem-tra', class: 'nut-xanh' } : { text: 'Học', action: 'hoc', class: 'nut-trang-vien-xanh' };
        const btnSua = kh.isOwner ? `<button class="nut-hanh-dong" data-action="sua"><i class="fa-solid fa-pencil"></i></button>` : '';
        const tagsHtml = (kh.tags && kh.tags.length) ? kh.tags.map(t => `<span class="the-tag">${t}</span>`).join('') : '<span class="the-tag" style="opacity:0.5">Không có tag</span>';

        div.innerHTML = `
            <div class="dau-the">
                <div class="thong-tin-tieu-de"><h3>${kh.tieuDe}</h3><p>${kh.mota}</p></div>
                <span class="trang-thai-the ${classTrangThai}">${kh.trangThai}</span>
            </div>
            <div class="noi-dung-the">
                <div class="khoi-thong-tin"><span>Người tạo</span><span class="giatri-khoi">${kh.nguoiTao}</span></div>
                <div class="khoi-thong-tin"><span>Số từ</span><span class="giatri-khoi">${kh.soTu} từ</span></div>
                <div class="khoi-thong-tin"><span>Trạng thái</span><span class="giatri-khoi">${kh.trangThaiChiaSe}</span></div>
            </div>
            <div class="khung-tags">${tagsHtml}</div>
            <div class="khung-tien-do">
                <span class="nhan-tien-do">Tiến độ:</span>
                <div class="thanh-tien-do-tong"><div class="thanh-tien-do-hien-tai" style="width:${kh.tienDo}%"></div></div>
                <span class="phan-tram-tien-do">${kh.tienDo}%</span>
            </div>
            <div class="khung-nut-bam">
                <button class="nut-bam nut-xanh" data-action="chi-tiet">Xem chi tiết</button>
                <button class="nut-bam ${btnAction.class}" data-action="${btnAction.action}">${btnAction.text}</button>
                <div class="nhom-nut-hanh-dong">
                    ${btnSua}
                    <button class="nut-hanh-dong nut-xoa" data-action="xoa"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `;
        return div;
    }

    function renderPhanTrang(tongSoTrang) {
        if (!khungPhanTrang) return;
        khungPhanTrang.innerHTML = '';
        if (tongSoTrang <= 1) return;
        const taoNut = (txt, p) => {
            const b = document.createElement('button');
            b.className = `nut-phan-trang ${p === trangHienTai ? 'trang-hien-tai' : ''}`;
            b.innerHTML = txt;
            b.onclick = () => { trangHienTai = p; renderDanhSach(); danhSachContainer.scrollIntoView({behavior:'smooth'}); };
            return b;
        };
        khungPhanTrang.appendChild(taoNut('<', Math.max(1, trangHienTai-1)));
        for(let i=1; i<=tongSoTrang; i++) khungPhanTrang.appendChild(taoNut(i, i));
        khungPhanTrang.appendChild(taoNut('>', Math.min(tongSoTrang, trangHienTai+1)));
    }

    // ============================================================
    // 4. MODAL LOGIC & EVENT HANDLERS
    // ============================================================

    function moModalTaoKhoaHoc() {
        editingCourseId = null;
        if (tieuDeModal) tieuDeModal.textContent = "Thông tin khóa học";
        if (btnSubmitTaoKhoaHoc) btnSubmitTaoKhoaHoc.textContent = "Thêm từ vựng";
        moModalChung();
        if(document.getElementById('form-tao-khoa-hoc')) document.getElementById('form-tao-khoa-hoc').reset();
        dsTagDaChon = [];
        if(tagInput) tagInput.value = "";
        fetchTags();
    }

    function openEditModal(course) {
        editingCourseId = course.id;
        if (tieuDeModal) tieuDeModal.textContent = "Cập nhật khóa học";
        if (btnSubmitTaoKhoaHoc) btnSubmitTaoKhoaHoc.textContent = "Lưu thay đổi";
        moModalChung();
        if(document.getElementById('ten-khoa-hoc-input')) document.getElementById('ten-khoa-hoc-input').value = course.tieuDe;
        if(document.getElementById('mo-ta-input')) document.getElementById('mo-ta-input').value = course.mota || "";
        if(document.getElementById('trang-thai-select')) document.getElementById('trang-thai-select').value = (course.trangThaiChiaSe === 'Công khai') ? 'cong-khai' : 'rieng-tu';
        dsTagDaChon = course.tags ? [...course.tags] : [];
        if(tagInput) tagInput.value = dsTagDaChon.join(', ');
        fetchTags();
    }

    function moModalChung() {
        if(khungCheMo) khungCheMo.classList.remove('an');
        if(modalTaoKhoaHoc) modalTaoKhoaHoc.classList.remove('an');
        if(modalThemTag) modalThemTag.classList.add('an');
    }

    function renderTagsTrongModal() {
        if (!khungTagGoiY || !khungTagDaChon) return;
        khungTagGoiY.innerHTML = '';
        khungTagDaChon.innerHTML = '';
        availableTags.forEach(tag => {
            if(!dsTagDaChon.includes(tag)) {
                const sp = document.createElement('span');
                sp.className = 'the-tag-modal'; 
                sp.textContent = tag;
                sp.onclick = () => { dsTagDaChon.push(tag); renderTagsTrongModal(); };
                khungTagGoiY.appendChild(sp);
            }
        });
        dsTagDaChon.forEach(tag => {
            const sp = document.createElement('span');
            sp.className = 'the-tag-modal da-chon'; 
            sp.innerHTML = `${tag} <i class="fa-solid fa-times"></i>`;
            sp.onclick = () => { dsTagDaChon = dsTagDaChon.filter(t => t !== tag); renderTagsTrongModal(); };
            khungTagDaChon.appendChild(sp);
        });
    }

    function dongTatCaModal() {
        if(khungCheMo) khungCheMo.classList.add('an');
        if(modalTaoKhoaHoc) modalTaoKhoaHoc.classList.add('an');
        if(modalThemTag) modalThemTag.classList.add('an');
    }

    // --- EVENTS ---
    if(tabKhoaHocCongDong) tabKhoaHocCongDong.onclick = () => window.location.href = `khoa_hoc_cong_dong.html?user_id=${USER_ID}`;
    if(btnTaoKhoaHoc) btnTaoKhoaHoc.onclick = moModalTaoKhoaHoc;
    if(btnHuyModalTaoKhoaHoc) btnHuyModalTaoKhoaHoc.onclick = dongTatCaModal;
    if(btnCloseIcons) btnCloseIcons.forEach(btn => btn.onclick = dongTatCaModal);
    if(khungCheMo) khungCheMo.onclick = (e) => { if(e.target === khungCheMo) dongTatCaModal(); };

    // --- NÚT LƯU / TẠO ---
    if (btnSubmitTaoKhoaHoc) {
        btnSubmitTaoKhoaHoc.addEventListener('click', async (e) => {
            e.preventDefault();
            const name = document.getElementById('ten-khoa-hoc-input').value.trim();
            const desc = document.getElementById('mo-ta-input').value.trim();
            const visi = document.getElementById('trang-thai-select').value === 'cong-khai' ? 'public' : 'private';
            
            const tagsVal = tagInput.value.trim();
            let tagsToSend = tagsVal ? tagsVal.split(',').map(t => t.trim()).filter(t => t !== "") : dsTagDaChon;

            if (!name) return alert('Vui lòng nhập tên khóa học');

            const isUpdate = (editingCourseId !== null);
            const payload = { course_name: name, description: desc, visibility: visi, tags: tagsToSend };
            if (isUpdate) payload.course_id = editingCourseId;

            btnSubmitTaoKhoaHoc.textContent = "Đang xử lý...";
            btnSubmitTaoKhoaHoc.disabled = true;

            const res = await saveCourse(payload, isUpdate);
            btnSubmitTaoKhoaHoc.disabled = false;
            btnSubmitTaoKhoaHoc.textContent = isUpdate ? "Lưu thay đổi" : "Thêm từ vựng";

            if (res.success) {
                alert(res.message || (isUpdate ? "Cập nhật thành công!" : "Tạo thành công!"));
                dongTatCaModal();
                
                if (isUpdate) {
                    fetchMyCourses();
                } else {
                    const newId = res.course_id; 
                    if (newId && newId > 0) {
                        window.location.href = `them_tu_vung.html?id=${newId}&user_id=${USER_ID}`;
                    } else {
                        alert("Cảnh báo: Không lấy được ID khóa học mới. Vui lòng tải lại trang danh sách.");
                        fetchMyCourses();
                    }
                }
                fetchTags();
            } else {
                alert("Lỗi: " + res.error);
            }
        });
    }

    // Tag Events
    if(btnChonTag) btnChonTag.onclick = (e) => {
        e.preventDefault();
        const currentTags = tagInput.value.split(',').map(t => t.trim()).filter(t => t);
        dsTagDaChon = [...new Set([...dsTagDaChon, ...currentTags])];
        moModalChung(); 
        if(modalTaoKhoaHoc) modalTaoKhoaHoc.classList.add('an'); 
        if(modalThemTag) modalThemTag.classList.remove('an');
        renderTagsTrongModal();
    };
    if(btnDongModalTag) btnDongModalTag.onclick = dongTatCaModal;
    if(btnXacNhanTag) btnXacNhanTag.onclick = () => {
        if(tagInput) tagInput.value = dsTagDaChon.join(', ');
        if(modalThemTag) modalThemTag.classList.add('an');
        if(modalTaoKhoaHoc) modalTaoKhoaHoc.classList.remove('an');
    };

    // Filter & Search Events
    if(boLocNguonGocBtn) {
        boLocNguonGocBtn.onclick = (e) => { 
            e.stopPropagation(); 
            if(menuLocNguonGoc) menuLocNguonGoc.classList.toggle('an');
            if(menuLocTrangThai) menuLocTrangThai.classList.add('an'); 
        };
    }
    
    if(menuLocNguonGoc) {
        menuLocNguonGoc.querySelectorAll('.lua-chon-loc').forEach(item => {
            item.onclick = () => {
                boLocNguonGoc = item.getAttribute('data-source');
                const nguonGocNames = {
                    'tat-ca': 'Tất cả nguồn',
                    'da-tao': 'Đã tạo',
                    'da-tham-gia': 'Đã tham gia'
                };
                if(tieuDeNguonGoc) tieuDeNguonGoc.textContent = nguonGocNames[boLocNguonGoc];
                menuLocNguonGoc.classList.add('an');
                
                menuLocNguonGoc.querySelectorAll('.lua-chon-loc').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                
                trangHienTai = 1;
                renderDanhSach();
            };
        });
    }
    
    if(boLocTrangThaiBtn) {
        boLocTrangThaiBtn.onclick = (e) => { 
            e.stopPropagation(); 
            if(menuLocTrangThai) menuLocTrangThai.classList.toggle('an');
            if(menuLocNguonGoc) menuLocNguonGoc.classList.add('an'); 
        };
    }
    
    if(menuLocTrangThai) {
        menuLocTrangThai.querySelectorAll('.lua-chon-loc').forEach(item => {
            item.onclick = () => {
                boLocTrangThai = item.getAttribute('data-status');
                const trangThaiNames = {
                    'tat-ca': 'Tất cả trạng thái',
                    'chua-hoc': 'Chưa học',
                    'dang-hoc': 'Đang học',
                    'hoan-thanh': 'Hoàn thành'
                };
                if(tieuDeTrangThai) tieuDeTrangThai.textContent = trangThaiNames[boLocTrangThai];
                menuLocTrangThai.classList.add('an');
                
                menuLocTrangThai.querySelectorAll('.lua-chon-loc').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                
                trangHienTai = 1;
                renderDanhSach();
            };
        });
    }
    
    if(thanhTimKiem) {
        thanhTimKiem.oninput = debounce((e) => { 
            tuKhoaTimKiem = e.target.value.toLowerCase(); 
            trangHienTai = 1; 
            renderDanhSach(); 
        }, 300); 
    }
    
    document.onclick = (e) => { 
        if(boLocNguonGocBtn && menuLocNguonGoc && !boLocNguonGocBtn.contains(e.target) && !menuLocNguonGoc.contains(e.target)) {
            menuLocNguonGoc.classList.add('an');
        }
        if(boLocTrangThaiBtn && menuLocTrangThai && !boLocTrangThaiBtn.contains(e.target) && !menuLocTrangThai.contains(e.target)) {
            menuLocTrangThai.classList.add('an');
        }
    };

    async function checkAndNavigateToTest(courseId) {
        try {
            const response = await fetch(`${API_BASE_URL}/get-words.php?course_id=${courseId}&user_id=${USER_ID}`);
            const result = await response.json();
            
            if (result.success) {
                const learnedCount = result.data.statistics.learned;
                if (learnedCount < 2) {
                    alert('Bạn cần học ít nhất 2 từ vựng trước khi có thể kiểm tra!\n\nHãy học thêm từ vựng để mở khóa tính năng này.');
                    return;
                }
                window.location.href = `user_kiem_tra.html?course_id=${courseId}&user_id=${USER_ID}`;
            } else {
                alert('Không thể tải thông tin khóa học. Vui lòng thử lại!');
            }
        } catch (error) {
            console.error('Error checking learned words:', error);
            alert('Lỗi kết nối. Vui lòng thử lại!');
        }
    }

    if(danhSachContainer) danhSachContainer.onclick = (e) => {
        const nut = e.target.closest('.nut-bam, .nut-hanh-dong');
        if(!nut) return;
        const id = nut.closest('.the-khoa-hoc').getAttribute('data-id');
        const action = nut.getAttribute('data-action');
        const course = coursesData.find(c => c.id == id);

        if(action === 'chi-tiet') window.location.href = `chi_tiet_khoa_hoc.html?id=${id}&user_id=${USER_ID}`;
        else if(action === 'hoc') window.location.href = `user_hoc_tu_vung.html?course_id=${id}&user_id=${USER_ID}`;
        else if(action === 'kiem-tra') checkAndNavigateToTest(id);
        else if(action === 'sua') openEditModal(course);
        else if(action === 'xoa') deleteOrLeaveCourse(id, course.isOwner);
    };

    // Init
    fetchMyCourses();
    fetchTags();
});