document.addEventListener("DOMContentLoaded", function() {
    fetchUsers();
    setupEventListeners();
});

let currentPage = 1;
let currentSort = { col: 'created_at', order: 'DESC' };
let searchTimer = null;
const apiCache = new Map();
let currentModalUserId = null; // ID user đang mở trong modal

// --- API FETCH USERS ---
async function fetchUsers(forceReload = false) {
    const tableBody = document.getElementById('user_table_body');
    const searchEl = document.getElementById('searchUserBox');
    const currentSearchVal = searchEl ? searchEl.value.trim() : '';

    const params = new URLSearchParams({
        page: currentPage,
        limit: 10,
        sort_by: currentSort.col,
        order: currentSort.order,
        search: currentSearchVal
    });
    const cacheKey = params.toString();

    if (!forceReload && apiCache.has(cacheKey)) {
        const cachedData = apiCache.get(cacheKey);
        if (searchEl && searchEl.value.trim() !== currentSearchVal) return;
        renderUserTable(cachedData.data, (currentPage - 1) * 10);
        renderPagination(cachedData.pagination);
        updateSortIcons();
        return;
    }

    if (tableBody) tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 40px; color: #666;"><i class="fa-solid fa-spinner fa-spin fa-2x"></i><div style="margin-top: 10px;">Đang tải dữ liệu...</div></td></tr>`;

    try {
        const response = await fetch(`../../api/admin/user_get_list.php?${params.toString()}`);
        if (response.status === 403) { showToast("Hết phiên đăng nhập", "error"); return; }
        const result = await response.json();

        if (searchEl && searchEl.value.trim() !== currentSearchVal) return;

        if (result.status === 'success') {
            apiCache.set(cacheKey, result);
            renderUserTable(result.data, (currentPage - 1) * 10);
            renderPagination(result.pagination);
            updateSortIcons();
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        if (tableBody) tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red; padding:20px;">Lỗi: ${error.message}</td></tr>`;
    }
}

// --- RENDER TABLE ---
function renderUserTable(users, startIndex) {
    const tableBody = document.getElementById('user_table_body');
    if (!tableBody) return;
    if (!users || users.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 40px; color: #999;">Không tìm thấy tài khoản nào.</td></tr>`;
        return;
    }

    let html = '';
    users.forEach((u, index) => {
        const isActive = u.status == 1;

        // Nút xem chi tiết (GỌI HÀM showUserModal)
        // Chuyển đối tượng user thành chuỗi JSON để truyền vào hàm
        const userJson = JSON.stringify(u).replace(/"/g, '&quot;');

        const btnView = `<button class="btn-action btn-view" onclick="showUserModal(${userJson})" title="Xem chi tiết"><i class="fa-solid fa-eye"></i></button>`;
        const btnAction = isActive ?
            `<button class="btn-action btn-lock" onclick="toggleStatus(this, ${u.user_id}, 'locked')" title="Khóa"><i class="fa-solid fa-lock"></i></button>` :
            `<button class="btn-action btn-unlock" onclick="toggleStatus(this, ${u.user_id}, 'active')" title="Mở khóa"><i class="fa-solid fa-lock-open"></i></button>`;

        const statusBadge = isActive ? `<span class="status-badge active">Hoạt động</span>` : `<span class="status-badge locked">Đã khóa</span>`;
        const initial = u.name ? u.name.charAt(0).toUpperCase() : '?';
        const avatarHtml = u.avatar ? `<img src="${escapeHtml(u.avatar)}" class="user-avatar" alt="A">` : `<div class="user-avatar placeholder">${initial}</div>`;

        html += `<tr>
            <td class="col-stt">${startIndex + index + 1}</td>
            <td><div class="user-info-wrapper">${avatarHtml}<div class="user-text"><div class="user-name">${escapeHtml(u.name)}</div><small class="user-email">${escapeHtml(u.email)}</small></div></div></td>
            <td class="col-date">${new Date(u.created_at).toLocaleDateString('vi-VN')}</td>
            <td class="col-status">${statusBadge}</td>
            <td class="col-action">${btnView} ${btnAction}</td>
        </tr>`;
    });
    tableBody.innerHTML = html;
}

// --- MODAL LOGIC (HIỂN THỊ & UPLOAD) ---
window.showUserModal = function(user) {
    currentModalUserId = user.user_id;
    document.getElementById('modalUserDetail').classList.add('show');

    document.getElementById('modal_fullname').innerText = user.name || 'Chưa cập nhật';
    document.getElementById('modal_email').innerText = user.email;
    document.getElementById('modal_id').innerText = user.user_id;
    document.getElementById('modal_joined').innerText = new Date(user.created_at).toLocaleDateString('vi-VN');

    // Hiển thị Avatar hoặc Chữ ký
    const avatarContainer = document.getElementById('modal_avatar_display');
    if (user.avatar) {
        avatarContainer.innerHTML = `<img src="${escapeHtml(user.avatar)}" alt="Avatar">`;
    } else {
        const initial = user.name ? user.name.charAt(0).toUpperCase() : '?';
        avatarContainer.innerHTML = `<div class="user-avatar placeholder" style="width:100%; height:100%; font-size:28px;">${initial}</div>`;
    }

    // Reset input file
    document.getElementById('avatarUploadInput').value = '';
};

// --- UPLOAD AVATAR ---
const fileInput = document.getElementById('avatarUploadInput');
if (fileInput) {
    fileInput.addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) { showToast("Vui lòng chọn file ảnh!", "error"); return; }
        if (file.size > 2 * 1024 * 1024) { showToast("Ảnh quá lớn (Max 2MB)", "error"); return; }

        const formData = new FormData();
        formData.append('avatar', file);
        formData.append('user_id', currentModalUserId);

        try {
            showToast("Đang tải ảnh...", "success");
            const res = await fetch('../../api/admin/user_update_avatar.php', { method: 'POST', body: formData });
            const result = await res.json();

            if (result.status === 'success') {
                showToast("Cập nhật thành công!", "success");
                // Cập nhật ảnh trong modal
                document.getElementById('modal_avatar_display').innerHTML = `<img src="${result.data.avatar_url}" alt="Avatar">`;
                // Reload list bên ngoài
                apiCache.clear();
                fetchUsers();
            } else {
                showToast(result.message, "error");
            }
        } catch (err) { showToast("Lỗi tải ảnh", "error"); }
    });
}

// --- UTILS ---
window.toggleStatus = async(btnElement, userId, targetStatus) => {
    const actionText = targetStatus === 'active' ? 'MỞ KHÓA' : 'KHÓA';
    if (!confirm(`Bạn có chắc chắn muốn ${actionText} tài khoản này?`)) return;
    try {
        const res = await fetch('../../api/admin/user_update_status.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, status: targetStatus })
        });
        const data = await res.json();
        if (data.status === 'success') { showToast(data.message, 'success');
            apiCache.clear();
            fetchUsers(true); } else showToast(data.message, 'error');
    } catch (e) { showToast('Lỗi hệ thống', 'error'); }
};

function renderPagination(paging) {
    const container = document.getElementById('pagination');
    if (!container) return;
    if (paging.total_pages <= 1) { container.innerHTML = ''; return; }
    let html = `<button class="page-btn" onclick="changePage(${paging.current_page - 1})" ${paging.current_page === 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-left"></i></button>`;
    for (let i = 1; i <= paging.total_pages; i++) {
        if (i === 1 || i === paging.total_pages || (i >= paging.current_page - 1 && i <= paging.current_page + 1)) {
            html += `<button class="page-btn ${i === paging.current_page ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
        } else if (i === paging.current_page - 2 || i === paging.current_page + 2) { html += `<span style="padding: 0 6px;">...</span>`; }
    }
    html += `<button class="page-btn" onclick="changePage(${paging.current_page + 1})" ${paging.current_page === paging.total_pages ? 'disabled' : ''}><i class="fa-solid fa-chevron-right"></i></button>`;
    container.innerHTML = html;
}

window.changePage = (page) => { if (page < 1) return;
    currentPage = page;
    fetchUsers(); };

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast-message ${type}`;
    const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';
    toast.innerHTML = `<i class="fa-solid ${icon}"></i><span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300); }, 3000);
}

function escapeHtml(text) { return text ? text.toString().replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]) : ''; }

function updateSortIcons() {
    document.querySelectorAll('th.sortable i').forEach(i => i.className = 'fa-solid fa-sort text-muted');
    const activeTh = document.querySelector(`th[data-sort="${currentSort.col}"]`);
    if (activeTh) activeTh.querySelector('i').className = currentSort.order === 'ASC' ? 'fa-solid fa-sort-up' : 'fa-solid fa-sort-down';
}

function setupEventListeners() {
    document.getElementById('searchUserBox').addEventListener('input', (e) => {
        clearTimeout(searchTimer);
        if (!e.target.value) { currentPage = 1;
            fetchUsers(); return; }
        searchTimer = setTimeout(() => { currentPage = 1;
            fetchUsers(); }, 300);
    });
    document.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const col = th.getAttribute('data-sort');
            if (currentSort.col === col) currentSort.order = currentSort.order === 'ASC' ? 'DESC' : 'ASC';
            else { currentSort.col = col;
                currentSort.order = 'DESC'; }
            fetchUsers();
        });
    });
    // Modal Close Events
    const modal = document.getElementById('modalUserDetail');
    document.getElementById('btnCloseModalHeader').onclick = () => modal.classList.remove('show');
    document.getElementById('btnCloseModalFooter').onclick = () => modal.classList.remove('show');
    window.onclick = (e) => { if (e.target == modal) modal.classList.remove('show'); };
}