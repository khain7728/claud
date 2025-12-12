document.addEventListener('DOMContentLoaded', function () {
    const API_BASE_URL = 'http://localhost/VOCAB/api';
    const USER_ID = localStorage.getItem('user_id');
    
    // Link mặc định theo yêu cầu
    const DEFAULT_AVATAR_URL = "https://upload.wikimedia.org/wikipedia/commons/9/99/Sample_User_Icon.png";

    // Elements
    const btnChinhSua = document.getElementById('btn-chinhsua');
    const userNameField = document.getElementById('giatri-ten-user');
    const userBioField = document.getElementById('giatri-tieu-su');
    const userEmail = document.getElementById('giatri-email-user');
    const userJoinDate = document.getElementById('giatri-ngay-tham-gia');
    const userLanguage = document.getElementById('giatri-ngonngu');
    const userLevel = document.getElementById('giatri-trinhdo');
    const achievementGrid = document.getElementById('noidung-thanhtich');

    // Avatar Elements
    const wrapperAvt = document.getElementById('wrapper-avt');
    const inputFileAvt = document.getElementById('input-file-avt');
    const imgAvt = document.getElementById('hien-thi-avt');
    const iconDefault = document.getElementById('icon-mac-dinh'); // Icon cũ (nếu có dùng font-awesome)

    // Modal Elements
    const modal = document.getElementById('modal-view-avt');
    const modalImg = document.getElementById('img-modal-full');
    const closeModal = document.querySelector('.close-modal');

    const editableFields = [userNameField, userBioField];
    let isEditing = false;
    let selectedFile = null;

    // --- 1. HÀM XỬ LÝ HIỂN THỊ AVATAR (LOGIC MỚI) ---
    function renderAvatar(avatarPath) {
        let finalSrc = "";

        if (!avatarPath || avatarPath.trim() === "") {
            // Trường hợp 1: Không có avatar trong DB -> Dùng ảnh Wikimedia
            finalSrc = DEFAULT_AVATAR_URL;
        } else {
            // Trường hợp 2: Có avatar
            if (avatarPath.startsWith('http') || avatarPath.startsWith('https')) {
                // Là link online (Google/Facebook/Link ngoài) -> Dùng trực tiếp
                finalSrc = avatarPath;
            } else {
                // Là file upload local -> Thêm đường dẫn thư mục
                finalSrc = `../../assets/images/avatar/${avatarPath}`;
            }
        }

        // Hiển thị ảnh
        imgAvt.src = finalSrc;
        imgAvt.style.display = 'block';
        
        // Ẩn icon mặc định (nếu HTML có div icon placeholder) vì giờ ta luôn có ảnh (ảnh thật hoặc ảnh default wikimedia)
        if (iconDefault) iconDefault.style.display = 'none';
        
        // Xử lý lỗi nếu link ảnh bị chết -> fallback về mặc định
        imgAvt.onerror = function() {
            this.src = DEFAULT_AVATAR_URL;
        };
    }

    // 2. Click Avatar
    wrapperAvt.addEventListener('click', () => {
        if (isEditing) {
            inputFileAvt.click();
        } else {
            // Mở Modal xem ảnh
            if (imgAvt.src) {
                modal.style.display = "flex";
                modalImg.src = imgAvt.src;
            }
        }
    });

    // 3. Đóng Modal
    if (closeModal) closeModal.addEventListener('click', () => modal.style.display = "none");
    window.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = "none"; });

    // 4. Preview ảnh khi chọn file
    inputFileAvt.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { alert("Ảnh quá lớn (<2MB)"); return; }
            selectedFile = file;
            imgAvt.src = URL.createObjectURL(file);
            imgAvt.style.display = 'block';
            if (iconDefault) iconDefault.style.display = 'none';
        }
    });

    // 5. Load Data
    async function fetchUserProfile() {
        try {
            const response = await fetch(`${API_BASE_URL}/get-user-profile.php?user_id=${USER_ID}`);
            const result = await response.json();
            if (result.success) {
                const u = result.data.user;
                const s = result.data.statistics;

                userNameField.textContent = u.fullname;
                userBioField.textContent = u.bio;
                userEmail.textContent = u.email;
                userJoinDate.textContent = u.joined_date;
                userLanguage.textContent = u.language;
                userLevel.textContent = u.level;
                
                // GỌI HÀM RENDER ĐÃ SỬA
                renderAvatar(u.avatar);

                if (achievementGrid) {
                    achievementGrid.innerHTML = '';
                    const list = [
                        { t: 'Khóa học', v: s.courses_joined, d: 'Tổng số khóa', i: 'fa-book-open' },
                        { t: 'Từ đã học', v: s.words_learned, d: 'Tổng số từ', i: 'fa-font' },
                        { t: 'Độ chính xác', v: s.accuracy + '%', d: 'Kết quả Quiz', i: 'fa-bullseye' },
                        { t: 'Chuỗi ngày', v: s.streak_days + ' ngày', d: 'Học liên tục', i: 'fa-fire' },
                        { t: 'Quiz đã làm', v: s.quizzes_done, d: 'Tổng bài KT', i: 'fa-clipboard-check' }
                    ];
                    list.forEach(a => {
                        achievementGrid.innerHTML += `
                            <div class="the-thanh-tich">
                                <div class="icon-huy-hieu"><i class="fa-solid ${a.i}"></i></div>
                                <p class="tieu-de-thanh-tich">${a.v}</p>
                                <p class="mota-thanh-tich"><strong>${a.t}</strong><br>${a.d}</p>
                            </div>`;
                    });
                }
            }
        } catch (e) { console.error(e); }
    }

    // 6. Save Data (Giữ nguyên logic của bạn, chỉ lưu ý phần render lại nếu cần)
    if (btnChinhSua) {
        btnChinhSua.addEventListener('click', async () => {
            if (!isEditing) {
                isEditing = true;
                btnChinhSua.textContent = 'Lưu thay đổi';
                btnChinhSua.classList.add('che-do-luu');
                editableFields.forEach(f => f.setAttribute('contenteditable', 'true'));
                userNameField.focus();
            } else {
                btnChinhSua.disabled = true;
                btnChinhSua.textContent = "Đang lưu...";

                const newName = userNameField.textContent.trim();
                const newBio = userBioField.textContent.trim();
                
                if (!newName) { alert("Tên không được trống!"); btnChinhSua.disabled = false; return; }

                const formData = new FormData();
                formData.append('user_id', USER_ID);
                formData.append('fullname', newName);
                formData.append('bio', newBio);
                if (selectedFile) formData.append('avatar', selectedFile);

                try {
                    const res = await fetch(`${API_BASE_URL}/update-user-profile.php`, { method: 'POST', body: formData });
                    const rs = await res.json();
                    if (rs.success) {
                        alert("Cập nhật thành công!");
                        localStorage.setItem('user_name', newName);
                        if (rs.avatar_url) localStorage.setItem('user_avatar', rs.avatar_url);
                        location.reload();
                    } else { alert(rs.error); }
                } catch (e) { alert("Lỗi kết nối."); }
                finally {
                    btnChinhSua.disabled = false; isEditing = false;
                    btnChinhSua.textContent = 'Chỉnh sửa';
                    btnChinhSua.classList.remove('che-do-luu');
                    editableFields.forEach(f => f.setAttribute('contenteditable', 'false'));
                }
            }
        });
    }
    fetchUserProfile();
});