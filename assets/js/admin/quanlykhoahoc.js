document.addEventListener("DOMContentLoaded", function() {
    loadCsrfToken();
    fetchCourses();
    setupEventListeners();
});

let currentPage = 1;
let currentSort = { col: 'created_at', order: 'DESC' };
let searchTimer = null;
let csrfToken = '';
let selectedTags = [];
const suggestedTags = ['Ngữ pháp', 'Từ vựng', 'Giao tiếp', 'IELTS', 'TOEFL', 'Business', 'CNTT', 'Y học'];
let allCourses = [];

async function loadCsrfToken() {
    try {
        const res = await fetch('../../api/common/get_csrf.php');
        const data = await res.json();
        if (data.token) {
            csrfToken = data.token;
            const inputCsrf = document.getElementById('csrf_token');
            if (inputCsrf) inputCsrf.value = data.token;
        }
    } catch (e) { console.error("Lỗi CSRF", e); }
}

async function fetchCourses() {
    const tableBody = document.getElementById('course_table_body');
    const searchVal = document.getElementById('searchCourseBox').value.trim();
    const statusVal = document.getElementById('filterStatus').value;

    tableBody.innerHTML = `<tr><td colspan="8" class="text-center py-4"><i class="fa-solid fa-spinner fa-spin"></i> Đang tải dữ liệu...</td></tr>`;

    const params = new URLSearchParams({
        page: currentPage,
        limit: 10,
        sort_by: currentSort.col,
        order: currentSort.order,
        search: searchVal,
        status: statusVal
    });

    try {
        const res = await fetch(`../../api/admin/course_get_list.php?${params.toString()}`);
        const result = await res.json();
        if (result.status === 'success') {
            allCourses = result.data;
            renderTable(result.data, (currentPage - 1) * 10);
            renderPagination(result.pagination);
        } else {
            tableBody.innerHTML = `<tr><td colspan="8" class="text-center text-red">${escapeHtml(result.message)}</td></tr>`;
        }
    } catch (e) { tableBody.innerHTML = `<tr><td colspan="8" class="text-center text-red">Lỗi kết nối máy chủ!</td></tr>`; }
}

function escapeHtml(text) { return text ? text.toString().replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]) : ''; }

function formatDate(dateString) { if (!dateString) return '---'; const date = new Date(dateString); return date.toLocaleDateString('vi-VN') + ' ' + date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }); }

function renderTable(data, startIndex) {
    const tbody = document.getElementById('course_table_body');
    if (!data || data.length === 0) { tbody.innerHTML = `<tr><td colspan="8" class="text-center">Không tìm thấy khóa học nào.</td></tr>`; return; }
    let html = '';
    data.forEach((item, index) => {
        const id = item.course_id;
        const canEdit = item.can_edit_vocab;
        let tagsHtml = item.tags ? item.tags.split(',').map(t => `<span style="background:#EEF2FF; color:#4F46E5; padding:2px 6px; border-radius:4px; font-size:11px; margin-right:2px;">${escapeHtml(t.trim())}</span>`).join('') : '';
        const statusBadge = (item.visibility === 'public') ? `<span class="status-badge public">Công khai</span>` : `<span class="status-badge private">Riêng tư</span>`;
        
        // Nút quản lý từ vựng: chỉ cho phép chỉnh sửa nếu can_edit_vocab = true, ngược lại chỉ xem
        const vocabBtn = canEdit 
            ? `<button class="btn-action btn-vocab" onclick="manageVocabulary(${id})" title="Quản lý từ vựng"><i class="fa-solid fa-book"></i></button>`
            : `<button class="btn-action btn-vocab-view" onclick="viewVocabulary(${id})" title="Xem từ vựng"><i class="fa-solid fa-book-open"></i></button>`;
        
        html += `<tr>
            <td class="text-center">${startIndex + index + 1}</td>
            <td><strong>${escapeHtml(item.course_code)}</strong></td>
            <td>${escapeHtml(item.course_name)}</td>
            <td>${tagsHtml}</td>
            <td>${escapeHtml(item.author_name)}</td>
            <td>${formatDate(item.created_at)}</td>
            <td class="text-center">${statusBadge}</td>
            <td class="text-center">
                <button class="btn-action btn-edit" onclick="openModal('edit', ${id})" title="Sửa"><i class="fa-solid fa-pen"></i></button>
                ${vocabBtn}
                <button class="btn-action btn-delete" onclick="handleDelete(${id})" title="Xóa"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

function renderPagination(paging) {
    const container = document.getElementById('pagination');
    if (!container) return;
    if (paging.total_pages <= 1) { container.innerHTML = ''; return; }
    let html = `<button class="page-btn" onclick="changePage(${paging.current_page - 1})" ${paging.current_page === 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-left"></i></button>`;
    for (let i = 1; i <= paging.total_pages; i++) {
        if (i === 1 || i === paging.total_pages || (i >= paging.current_page - 1 && i <= paging.current_page + 1)) {
            html += `<button class="page-btn ${i === paging.current_page ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
        } else if (i === paging.current_page - 2 || i === paging.current_page + 2) {
            html += `<span class="page-dots">...</span>`;
        }
    }
    html += `<button class="page-btn" onclick="changePage(${paging.current_page + 1})" ${paging.current_page === paging.total_pages ? 'disabled' : ''}><i class="fa-solid fa-chevron-right"></i></button>`;
    container.innerHTML = html;
}

window.changePage = function(page) {
    const pageInt = parseInt(page);
    if (!pageInt || pageInt < 1) return;
    if (pageInt === currentPage) return;
    currentPage = pageInt;
    fetchCourses();
}

function setupEventListeners() {
    document.getElementById('searchCourseBox').addEventListener('input', () => { clearTimeout(searchTimer);
        searchTimer = setTimeout(() => { currentPage = 1;
            fetchCourses(); }, 500); });
    document.getElementById('filterStatus').addEventListener('change', () => { currentPage = 1;
        fetchCourses(); });

    document.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const col = th.getAttribute('data-sort');
            if (currentSort.col === col) currentSort.order = currentSort.order === 'ASC' ? 'DESC' : 'ASC';
            else { currentSort.col = col;
                currentSort.order = 'DESC'; }
            updateSortIcons(col, currentSort.order);
            fetchCourses();
        });
    });

    if (document.getElementById('btnOpenAddModal')) document.getElementById('btnOpenAddModal').onclick = () => openModal('add');
    if (document.getElementById('btnCloseCourseModal')) document.getElementById('btnCloseCourseModal').onclick = closeModal;
    if (document.getElementById('btnCancelCourseModal')) document.getElementById('btnCancelCourseModal').onclick = closeModal;
    if (document.getElementById('saveCourseBtn')) document.getElementById('saveCourseBtn').onclick = handleSaveCourse;

    if (document.getElementById('btnOpenTagModal')) document.getElementById('btnOpenTagModal').onclick = () => openTagModal();
    if (document.getElementById('btnCloseTagModal')) document.getElementById('btnCloseTagModal').onclick = closeTagModal;
    if (document.getElementById('btnConfirmTag')) document.getElementById('btnConfirmTag').onclick = confirmTagSelection;
}

function updateSortIcons(activeCol, order) {
    document.querySelectorAll('th.sortable i').forEach(i => i.className = 'fa-solid fa-sort');
    const activeTh = document.querySelector(`th.sortable[data-sort="${activeCol}"]`);
    if (activeTh) activeTh.querySelector('i').className = order === 'ASC' ? 'fa-solid fa-sort-up' : 'fa-solid fa-sort-down';
}

window.openModal = async function(mode, id = null) {
    document.getElementById('courseId').value = '';
    document.getElementById('courseName').value = '';
    document.getElementById('courseStatus').value = 'active';
    document.getElementById('courseTag').value = '';
    document.getElementById('courseDescription').value = '';
    selectedTags = [];

    const title = document.getElementById('modalTitle');
    const btn = document.getElementById('saveCourseBtn');

    if (mode === 'add') {
        title.innerText = "Thêm Khóa học Mới";
        btn.innerHTML = '<i class="fa-solid fa-arrow-right"></i> Lưu & Tiếp tục';
    } else {
        title.innerText = "Cập nhật Khóa học";
        btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Lưu & Cập nhật';
        const item = allCourses.find(c => c.course_id == id);
        if (item) {
            document.getElementById('courseId').value = item.course_id;
            document.getElementById('courseName').value = item.course_name;
            document.getElementById('courseStatus').value = (item.visibility === 'public') ? 'active' : 'hidden';
            document.getElementById('courseDescription').value = item.description || '';
            if (item.tags) {
                document.getElementById('courseTag').value = item.tags;
                selectedTags = item.tags.split(',').map(t => t.trim()).filter(Boolean);
            }
        }
    }
    document.getElementById('courseModal').classList.add('show');
}

function closeModal() { document.getElementById('courseModal').classList.remove('show'); }

function openTagModal() {
    const currentVal = document.getElementById('courseTag').value;
    if (currentVal && selectedTags.length === 0) selectedTags = currentVal.split(',').map(t => t.trim()).filter(Boolean);
    renderTagUI();
    document.getElementById('tagModal').classList.add('show');
}

function closeTagModal() { document.getElementById('tagModal').classList.remove('show'); }

function confirmTagSelection() {
    document.getElementById('courseTag').value = selectedTags.join(', ');
    closeTagModal();
}

function renderTagUI() {
    const boxSel = document.getElementById('khung-tag-da-chon');
    const boxSug = document.getElementById('khung-tag-goi-y');
    boxSel.innerHTML = '';
    boxSug.innerHTML = '';
    const lowerSel = selectedTags.map(t => t.toLowerCase());

    if (selectedTags.length === 0) boxSel.innerHTML = '<div class="empty-state-text">Chưa chọn thẻ nào.</div>';
    else {
        selectedTags.forEach(t => {
            const chip = document.createElement('div');
            chip.className = 'tag-chip selected';
            chip.innerHTML = `<span>${escapeHtml(t)}</span> <i class="fa-solid fa-xmark"></i>`;
            chip.onclick = () => { selectedTags = selectedTags.filter(x => x !== t);
                renderTagUI(); };
            boxSel.appendChild(chip);
        });
    }

    let hasSuggestion = false;
    suggestedTags.forEach(t => {
        if (!lowerSel.includes(t.toLowerCase())) {
            hasSuggestion = true;
            const chip = document.createElement('div');
            chip.className = 'tag-chip suggested';
            chip.innerHTML = `<i class="fa-solid fa-plus"></i> <span>${escapeHtml(t)}</span>`;
            chip.onclick = () => { selectedTags.push(t);
                renderTagUI(); };
            boxSug.appendChild(chip);
        }
    });
    if (!hasSuggestion) boxSug.innerHTML = '<div class="empty-state-text">Đã chọn hết các thẻ gợi ý.</div>';
}

async function handleSaveCourse() {
    const btn = document.getElementById('saveCourseBtn');
    const id = document.getElementById('courseId').value;
    const name = document.getElementById('courseName').value.trim();
    const desc = document.getElementById('courseDescription').value.trim();

    if (!name) { showToast("Vui lòng nhập tên khóa học!", "error"); return; }
    if (selectedTags.length === 0) { showToast("Vui lòng chọn ít nhất một thẻ (Tag)!", "error"); return; }

    const payload = {
        id: id,
        name: name,
        description: desc,
        status: document.getElementById('courseStatus').value,
        tags: document.getElementById('courseTag').value,
        csrf_token: csrfToken
    };

    const isCreate = !id;
    const url = isCreate ? '../../api/admin/course_create.php' : '../../api/admin/course_update.php';

    btn.disabled = true;
    const originalBtnText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý...';

    try {
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const result = await res.json();

        if (result.status === 'success') {
            closeModal();
            if (isCreate) {
                const newId = result.data && result.data.id ? result.data.id : null;
                showToast("Đang tạo bản nháp... Chuyển trang!", "success");

                // TỰ ĐỘNG CHUYỂN TRANG
                setTimeout(() => {
                    if (newId) {
                        window.location.href = `themtuvung.html?id=${newId}`;
                    } else {
                        showToast("Lỗi: Không lấy được ID khóa học.", "error");
                    }
                }, 1000);
            } else {
                showToast("Cập nhật thành công!", "success");
                fetchCourses();
            }
        } else {
            showToast(result.message, "success");
        }
    } catch (e) { showToast("Lỗi hệ thống!", "error");
        console.error(e); } finally { btn.disabled = false;
        btn.innerHTML = originalBtnText; }
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast-message ${type}`;
    const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';
    const title = type === 'success' ? 'Thông báo' : 'Lỗi';
    toast.innerHTML = `<i class="fa-solid ${icon}"></i><div class="toast-content"><span class="toast-title">${title}</span><span class="toast-desc">${escapeHtml(message)}</span></div>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300); }, 3000);
}

window.manageVocabulary = function(courseId) {
    window.location.href = `themtuvung.html?id=${courseId}`;
};

window.viewVocabulary = function(courseId) {
    window.location.href = `themtuvung.html?id=${courseId}&view_only=1`;
};

window.handleDelete = async function(id) {
    if (!confirm("CẢNH BÁO: Xóa khóa học sẽ xóa toàn bộ dữ liệu liên quan.\nTiếp tục?")) return;
    try {
        const res = await fetch('../../api/admin/course_delete.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: id, csrf_token: csrfToken }) });
        const result = await res.json();
        if (result.status === 'success') { showToast("Xóa thành công!", "success");
            fetchCourses(); } else showToast(result.message, "error");
    } catch (e) { showToast("Lỗi kết nối!", "error"); }
}