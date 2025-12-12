document.addEventListener('DOMContentLoaded', function() {
    
    // === CẤU HÌNH ===
    const API_BASE_URL = 'http://localhost/VOCAB/api'; 
    const USER_ID = localStorage.getItem('user_id'); 

    // DOM ELEMENTS
    const danhSachContainer = document.getElementById('danh-sach-khoa-hoc-cong-dong');
    const thanhTimKiem = document.getElementById('thanh-tim-kiem');
    const tabKhoaHocCuaToi = document.getElementById('tab-khoa-hoc-cua-toi');
    const boLocHienTai = document.getElementById('bo-loc-hien-tai');
    const menuLocDropdown = document.getElementById('menu-loc-dropdown');
    const tieuDeLoc = document.getElementById('tieu-de-loc');
    
    // [FIX Lỗi #30]: Element hiển thị text kết quả tìm kiếm (cần thêm vào HTML)
    const textKetQuaTimKiem = document.getElementById('ket-qua-tim-kiem-text');

    // STATE
    let allCoursesData = [];
    let filteredData = [];
    let tuKhoaTimKiem = '';
    let boLoc = 'tat-ca'; 
    let searchTimeout = null; // [FIX Lỗi #41]: Biến dùng cho Debounce

    // PHÂN TRANG
    let trangHienTai = 1;
    const soMucTrenTrang = 5;
    const khungPhanTrang = document.getElementById('khung-phan-trang');

    // --- 1. GỌI API LẤY DANH SÁCH ---
    async function fetchCommunityCourses() {
        try {
            const response = await fetch(`${API_BASE_URL}/get-public-courses.php?user_id=${USER_ID}`);
            const result = await response.json();

            if (result.success) {
                allCoursesData = result.data;
                // Nếu đang reload sau khi join, cần áp dụng lại bộ lọc hiện tại
                applyFilterAndRender(); 
            } else {
                console.error(result.error);
                danhSachContainer.innerHTML = `<p class="thong-bao-rong">Lỗi: ${result.error}</p>`;
            }
        } catch (error) {
            console.error(error);
        }
    }

    // --- 2. GỌI API THAM GIA KHÓA HỌC ---
    async function joinCourse(courseId, buttonElement) {
        try {
            const response = await fetch(`${API_BASE_URL}/join-course.php`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ 
                    course_id: courseId 
                })
            });

            const result = await response.json();

            if (result.success) {
                alert("Đã tham gia khóa học thành công!");
                
                // [FIX Lỗi #4]: Reload data từ server thay vì sửa mảng local
                // Gọi lại API để lấy dữ liệu mới nhất (số học viên, trạng thái joined)
                fetchCommunityCourses(); 
                
            } else {
                alert("Lỗi: " + result.error);
                // Nếu lỗi logic (ví dụ đã tham gia rồi), mở lại nút bấm
                if(buttonElement) {
                    buttonElement.disabled = false;
                    buttonElement.innerText = "Thêm";
                }
            }

        } catch (error) {
            console.error(error);
            alert("Lỗi kết nối server khi tham gia khóa học.");
            // Nếu lỗi mạng, mở lại nút bấm
            if(buttonElement) {
                buttonElement.disabled = false;
                buttonElement.innerText = "Thêm";
            }
        }
    }

    // --- 3. LOGIC LỌC DỮ LIỆU ---
    // Tách logic lọc ra để dùng chung cho việc search và reload data
    function applyFilterAndRender() {
        let tempData = allCoursesData;
        
        // 1. Lọc theo trạng thái
        if (boLoc === 'da-tham-gia') {
            tempData = tempData.filter(kh => kh.daThamGia === true);
        } else if (boLoc === 'chua-tham-gia') {
            tempData = tempData.filter(kh => !kh.daThamGia || kh.daThamGia === false);
        }
        
        // 2. Lọc theo từ khóa tìm kiếm
        if (tuKhoaTimKiem && tuKhoaTimKiem.trim() !== '') {
            const k = tuKhoaTimKiem.toLowerCase().trim();
            filteredData = tempData.filter(kh => 
                kh.tieuDe.toLowerCase().includes(k) ||
                (kh.mota && kh.mota.toLowerCase().includes(k))
            );
        } else {
            filteredData = tempData;
        }

        renderDanhSach();
    }

    // --- 4. RENDER GIAO DIỆN ---
    function renderDanhSach() {
        if (!danhSachContainer) return;

        // [FIX Lỗi #30]: Hiển thị dòng chữ kết quả tìm kiếm bên dưới thanh search
        if (textKetQuaTimKiem) {
            if (tuKhoaTimKiem && tuKhoaTimKiem.trim() !== '') {
                // Chỉ hiện khi có từ khóa tìm kiếm
                textKetQuaTimKiem.innerText = `Có ${filteredData.length} khóa học liên quan`;
                textKetQuaTimKiem.style.display = 'block';
                textKetQuaTimKiem.style.color = '#6b7280'; // Style nhanh nếu chưa có CSS
                textKetQuaTimKiem.style.marginBottom = '1rem';
            } else {
                // Ẩn đi khi không tìm kiếm
                textKetQuaTimKiem.innerText = '';
                textKetQuaTimKiem.style.display = 'none';
            }
        }

        // Tính toán phân trang
        const tongSoMuc = filteredData.length;
        const tongSoTrang = Math.ceil(tongSoMuc / soMucTrenTrang);
        if (trangHienTai > tongSoTrang && tongSoTrang > 0) trangHienTai = 1;
        const batDau = (trangHienTai - 1) * soMucTrenTrang;
        const ketThuc = batDau + soMucTrenTrang;
        const dataTrenTrang = filteredData.slice(batDau, ketThuc);

        danhSachContainer.innerHTML = '';
        
        if (dataTrenTrang.length === 0) {
            // [FIX Lỗi #27]: Empty state rõ ràng hơn (Thêm icon và style)
            danhSachContainer.innerHTML = `
                <div class="thong-bao-rong" style="display:flex; flex-direction:column; align-items:center; opacity:0.7; padding: 2rem 0;">
                    <i class="fa-solid fa-box-open" style="font-size: 3rem; margin-bottom: 1rem; color:#9ca3af;"></i>
                    <p>Không tìm thấy khóa học nào phù hợp.</p>
                </div>`;
        } else {
            dataTrenTrang.forEach(kh => {
                danhSachContainer.appendChild(taoTheKhoaHoc(kh));
            });
        }
        renderPhanTrang(tongSoTrang);
    }

    function taoTheKhoaHoc(kh) {
        const theDiv = document.createElement('div');
        theDiv.className = 'the-khoa-hoc';
        theDiv.setAttribute('data-id', kh.id);

        const classTrangThai = kh.daThamGia ? 'trang-thai-da-tham-gia' : 'trang-thai-chua-tham-gia';
        const textTrangThai = kh.daThamGia ? 'Đã tham gia' : 'Chưa tham gia';
        
        const nutThemHtml = !kh.daThamGia
            ? `<button class="nut-bam nut-them" data-action="them">Thêm</button>`
            : ''; 

        const tagsHtml = (kh.tags && kh.tags.length) 
            ? kh.tags.map(t => `<span class="the-tag">${t}</span>`).join('') 
            : '<span class="the-tag" style="opacity:0.5">Không có tag</span>';

        theDiv.innerHTML = `
            <div class="dau-the">
                <div class="thong-tin-tieu-de">
                    <h3 class="tieu-de-khoa-hoc">${kh.tieuDe}</h3>
                    <p class="mota-khoa-hoc">${kh.mota}</p>
                </div>
                <span class="trang-thai-the ${classTrangThai}">${textTrangThai}</span>
            </div>
            <div class="noi-dung-the">
                <div class="khoi-thong-tin">
                    <span class="tieu-de-khoi">Người tạo</span>
                    <span class="giatri-khoi">${kh.nguoiTao}</span>
                </div>
                <div class="khoi-thong-tin">
                    <span class="tieu-de-khoi">Số từ</span>
                    <span class="giatri-khoi">${kh.soTu} từ</span>
                </div>
                <div class="khoi-thong-tin">
                    <span class="tieu-de-khoi">Học viên</span>
                    <span class="giatri-khoi">${kh.hocVien}</span>
                </div>
            </div>
            <div class="khung-tags">${tagsHtml}</div>
            <div class="khung-nut-bam">
                ${nutThemHtml}
                <button class="nut-bam nut-xem-chi-tiet" data-action="chi-tiet">Xem chi tiết</button>
            </div>
        `;
        return theDiv;
    }

    function renderPhanTrang(tongSoTrang) {
        if (!khungPhanTrang) return;
        khungPhanTrang.innerHTML = '';
        if (tongSoTrang <= 1) return;

        const taoNut = (text, page, disabled, active) => {
            const btn = document.createElement('button');
            btn.className = 'nut-phan-trang' + (active ? ' trang-hien-tai' : '');
            btn.innerHTML = text;
            btn.disabled = disabled;
            btn.addEventListener('click', () => { 
                trangHienTai = page; 
                renderDanhSach();
                
                // [FIX Lỗi #38]: Smooth scroll lên đầu danh sách khi chuyển trang
                danhSachContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
            return btn;
        };

        khungPhanTrang.appendChild(taoNut('<i class="fa-solid fa-chevron-left"></i>', trangHienTai - 1, trangHienTai === 1, false));
        
        for (let i = 1; i <= tongSoTrang; i++) {
            khungPhanTrang.appendChild(taoNut(i, i, false, i === trangHienTai));
        }
        
        khungPhanTrang.appendChild(taoNut('<i class="fa-solid fa-chevron-right"></i>', trangHienTai + 1, trangHienTai === tongSoTrang, false));
    }

    // --- 5. LISTENERS ---
    
    // Xử lý click nút Thêm và Chi tiết
    if (danhSachContainer) {
        danhSachContainer.addEventListener('click', (e) => {
            const nut = e.target.closest('.nut-bam');
            if (!nut) return;
            const id = nut.closest('.the-khoa-hoc').getAttribute('data-id');
            const action = nut.getAttribute('data-action');

            if (action === 'chi-tiet') {
                window.location.href = `chi_tiet_khoa_hoc.html?id=${id}&user_id=${USER_ID}`;
            } else if (action === 'them') {
                if (confirm('Bạn có muốn tham gia khóa học này?')) {
                    // [FIX Lỗi #34]: Disable button ngay sau khi click
                    nut.disabled = true;
                    nut.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý...';
                    
                    // Truyền nút vào hàm joinCourse để xử lý bật lại nếu lỗi
                    joinCourse(id, nut);
                }
            }
        });
    }

    // [FIX Lỗi #41]: Debounce search input
    if (thanhTimKiem) {
        thanhTimKiem.addEventListener('input', (e) => {
            // Xóa timeout cũ nếu người dùng gõ tiếp
            if (searchTimeout) clearTimeout(searchTimeout);

            // Đặt timeout mới (chờ 300ms)
            searchTimeout = setTimeout(() => {
                tuKhoaTimKiem = e.target.value; // Lấy giá trị gốc
                trangHienTai = 1;
                applyFilterAndRender(); // Gọi hàm lọc chung
            }, 300);
        });
    }

    if (tabKhoaHocCuaToi) tabKhoaHocCuaToi.addEventListener('click', () => window.location.href = `khoa_hoc_cua_toi.html?user_id=${USER_ID}`);

    // Dropdown filter toggle
    if (boLocHienTai) {
        boLocHienTai.addEventListener('click', (e) => {
            e.stopPropagation();
            menuLocDropdown.classList.toggle('an');
        });
    }

    document.addEventListener('click', (e) => {
        if (!menuLocDropdown.contains(e.target) && !boLocHienTai.contains(e.target)) {
            menuLocDropdown.classList.add('an');
        }
    });

    // Xử lý chọn filter
    if (menuLocDropdown) {
        menuLocDropdown.addEventListener('click', (e) => {
            const luaChon = e.target.closest('.lua-chon-loc');
            if (!luaChon) return;
            
            const filter = luaChon.getAttribute('data-filter');
            boLoc = filter;
            
            menuLocDropdown.querySelectorAll('.lua-chon-loc').forEach(item => {
                item.classList.remove('active');
            });
            luaChon.classList.add('active');
            
            const tieuDe = {
                'tat-ca': 'Tất cả khóa học',
                'da-tham-gia': 'Đã tham gia',
                'chua-tham-gia': 'Chưa tham gia'
            };
            tieuDeLoc.textContent = tieuDe[filter] || 'Tất cả khóa học';
            
            menuLocDropdown.classList.add('an');
            trangHienTai = 1;
            
            applyFilterAndRender(); // Dùng hàm chung
        });
    }

    // Init
    fetchCommunityCourses();
});