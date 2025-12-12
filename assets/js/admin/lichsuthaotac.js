/**
 * Tệp: assets/js/admin/lichsuthaotac.js
 * Phiên bản: Final (Đã cập nhật Pagination đồng bộ)
 */

document.addEventListener("DOMContentLoaded", function() {
    // 1. Tải dữ liệu lần đầu
    fetchLogs();

    // 2. Cài đặt các sự kiện
    setupEventListeners();
});

// --- 1. QUẢN LÝ TRẠNG THÁI (STATE) ---
let currentPage = 1;
let currentSort = { col: 'created_at', order: 'DESC' };
let searchTimer = null;
const apiCache = new Map(); // Cache API

// --- 2. HÀM GỌI API (FETCH DATA) ---
async function fetchLogs(forceReload = false) {
    const tableBody = document.getElementById('log_table_body');

    // Lấy giá trị từ các ô input
    const searchEl = document.getElementById('searchLogBox');
    const startEl = document.getElementById('filterStartDate');
    const endEl = document.getElementById('filterEndDate');

    // Lấy giá trị thực tế tại thời điểm gọi hàm
    const currentSearchVal = searchEl ? searchEl.value.trim() : '';
    const startDate = startEl ? startEl.value : '';
    const endDate = endEl ? endEl.value : '';

    // Tạo tham số gửi lên Server
    const params = new URLSearchParams({
        page: currentPage,
        limit: 10,
        sort_by: currentSort.col,
        order: currentSort.order,
        search: currentSearchVal,
        start_date: startDate,
        end_date: endDate
    });

    const cacheKey = params.toString();

    // 1. Kiểm tra Cache
    if (!forceReload && apiCache.has(cacheKey)) {
        const cachedData = apiCache.get(cacheKey);
        // [QUAN TRỌNG] Kiểm tra lại xem ô tìm kiếm có bị thay đổi trong lúc lấy cache không
        if (searchEl && searchEl.value.trim() !== currentSearchVal) return;

        renderLogTable(cachedData.data, (currentPage - 1) * 10);
        renderPagination(cachedData.pagination);
        return;
    }

    // 2. Hiển thị Loading
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: #666;">
                    <i class="fa-solid fa-spinner fa-spin fa-2x"></i>
                    <div style="margin-top: 10px;">Đang tải dữ liệu...</div>
                </td>
            </tr>`;
    }

    try {
        const response = await fetch(`../../api/admin/log_get_list.php?${params.toString()}`);
        if (!response.ok) throw new Error(`Lỗi kết nối (${response.status})`);

        const result = await response.json();

        // --- [ĐOẠN CODE FIX LỖI] ---
        // Kiểm tra xem lúc dữ liệu tải xong, người dùng có xóa/sửa ô tìm kiếm chưa?
        // Nếu giá trị ô input hiện tại KHÁC với giá trị lúc bắt đầu gọi API -> Hủy bỏ kết quả này
        const nowSearchVal = searchEl ? searchEl.value.trim() : '';
        if (nowSearchVal !== currentSearchVal) {
            // console.log("Dữ liệu cũ về chậm -> Bỏ qua để tránh lỗi hiển thị");
            return;
        }
        // ---------------------------

        if (result.status === 'success') {
            apiCache.set(cacheKey, result);
            renderLogTable(result.data, (currentPage - 1) * 10);
            renderPagination(result.pagination);
        } else {
            throw new Error(result.message || "Lỗi server");
        }

    } catch (error) {
        // Chỉ hiện lỗi nếu không phải do người dùng đang gõ tiếp
        if (searchEl && searchEl.value.trim() === currentSearchVal) {
            console.error("Fetch Error:", error);
            if (tableBody) {
                tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red; padding:20px;">Lỗi: ${error.message}</td></tr>`;
            }
        }
    }
}
// --- 3. HÀM VẼ BẢNG 
function renderLogTable(logs, startIndex) {
    const tableBody = document.getElementById('log_table_body');
    if (!tableBody) return;

    if (!logs || logs.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding: 40px; color: #999;">
                    <i class="fa-regular fa-folder-open fa-3x" style="margin-bottom:10px; opacity: 0.5;"></i>
                    <div>Không tìm thấy dữ liệu nào.</div>
                </td>
            </tr>`;
        return;
    }

    let html = '';
    logs.forEach((item, index) => {
        // 1. Tên Admin
        const adminDisplay = item.admin_name ?
            `<strong>${escapeHtml(item.admin_name)}</strong>` :
            `<span style="color:#999">ID: ${item.admin_id}</span>`;

        // 2. Format ngày tháng
        let formattedDate = item.created_at;
        try {
            const dateObj = new Date(item.created_at);
            formattedDate = dateObj.toLocaleDateString('vi-VN') + ' <small style="color:#888">' +
                dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + '</small>';
        } catch (e) {}

        // 3. Xử lý IP
        const ipDisplay = item.ip_address || '-';

        // 4. Xử lý User Agent (Thiết bị)
        // Lấy chuỗi gốc để hiển thị tooltip
        const uaFull = item.user_agent || 'Không xác định';

        // Tự động nhận diện thiết bị sơ bộ (để hiển thị icon nếu muốn cho đẹp)
        let deviceIcon = '<i class="fa-solid fa-desktop"></i>';
        if (/mobile/i.test(uaFull)) deviceIcon = '<i class="fa-solid fa-mobile-screen"></i>';
        else if (/tablet/i.test(uaFull)) deviceIcon = '<i class="fa-solid fa-tablet-screen-button"></i>';

        html += `
            <tr>
                <td class="col-stt">${startIndex + index + 1}</td>
                
                <td class="col-action truncate-cell" title="${escapeHtml(item.action)}">
                    ${escapeHtml(item.action)}
                </td>
                
                <td class="col-target">${escapeHtml(item.target_id || '-')}</td>
                
                <td class="col-admin truncate-cell" title="${item.admin_name || item.admin_id}">
                    ${adminDisplay}
                </td>
                
                <td class="col-ip truncate-cell" title="${escapeHtml(ipDisplay)}">
                    ${escapeHtml(ipDisplay)}
                </td>
                
                <td class="col-time">${formattedDate}</td>
                
                <td class="col-ua truncate-cell" title="${escapeHtml(uaFull)}">
                    <span style="color:#9CA3AF; margin-right:5px;">${deviceIcon}</span>
                    ${escapeHtml(uaFull)}
                </td>
            </tr>
        `;
    });
    tableBody.innerHTML = html;
}

// --- 4. HÀM PHÂN TRANG (CẬP NHẬT ĐỒNG BỘ) ---
function renderPagination(paging) {
    const container = document.getElementById('pagination');
    if (!container) return;

    // Nếu chỉ có 1 trang hoặc không có dữ liệu -> Xóa phân trang
    if (paging.total_pages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';

    // --- NÚT PREVIOUS (<) ---
    html += `<button type="button" class="page-btn" onclick="changePage(${paging.current_page - 1})" ${paging.current_page === 1 ? 'disabled' : ''}>
                <i class="fa-solid fa-chevron-left"></i>
             </button>`;

    // --- CÁC NÚT SỐ TRANG ---
    for (let i = 1; i <= paging.total_pages; i++) {
        // Hiển thị trang đầu, trang cuối, và các trang xung quanh trang hiện tại
        if (i === 1 || i === paging.total_pages || (i >= paging.current_page - 1 && i <= paging.current_page + 1)) {
            const activeClass = i === paging.current_page ? 'active' : '';
            html += `<button type="button" class="page-btn ${activeClass}" onclick="changePage(${i})">${i}</button>`;
        }
        // Hiển thị dấu ...
        else if (i === paging.current_page - 2 || i === paging.current_page + 2) {
            html += `<span class="page-dots">...</span>`;
        }
    }

    // --- NÚT NEXT (>) ---
    html += `<button type="button" class="page-btn" onclick="changePage(${paging.current_page + 1})" ${paging.current_page === paging.total_pages ? 'disabled' : ''}>
                <i class="fa-solid fa-chevron-right"></i>
             </button>`;

    container.innerHTML = html;
}

window.changePage = function(page) {
    const pageInt = parseInt(page);
    if (!pageInt || pageInt < 1) return;
    if (pageInt === currentPage) return;

    currentPage = pageInt;
    fetchLogs();
}

// --- 5. CÀI ĐẶT SỰ KIỆN ---
function setupEventListeners() {

    // A. Tìm kiếm nhanh (Sửa lỗi không reset khi xóa)
    const searchBox = document.getElementById('searchLogBox');
    if (searchBox) {
        // Dùng 'input' thay vì 'keyup'
        searchBox.addEventListener('input', (e) => {
            const keyword = e.target.value;
            clearTimeout(searchTimer);

            // Nếu xóa hết -> Load ngay lập tức
            if (keyword.length === 0) {
                currentPage = 1;
                fetchLogs();
                return;
            }

            searchTimer = setTimeout(() => {
                currentPage = 1;
                fetchLogs();
            }, 300);
        });
    }

    // [TÍNH NĂNG MỚI] Xử lý chọn nhanh thời gian
    const quickSelect = document.getElementById('quickTimeSelect');
    const startPicker = document.getElementById('filterStartDate');
    const endPicker = document.getElementById('filterEndDate');

    if (quickSelect && startPicker && endPicker) {

        // Hàm tính toán ngày
        const setDateRange = (type) => {
            const today = new Date();
            let start = new Date();
            let end = new Date();

            switch (type) {
                case 'today':
                    // Start = End = Hôm nay
                    break;

                case 'yesterday':
                    start.setDate(today.getDate() - 1);
                    end.setDate(today.getDate() - 1);
                    break;

                case 'last_7_days':
                    start.setDate(today.getDate() - 7);
                    break;

                case 'this_month':
                    start = new Date(today.getFullYear(), today.getMonth(), 1); // Ngày 1 đầu tháng
                    break;

                case 'all':
                    startPicker.value = '';
                    endPicker.value = '';
                    currentPage = 1;
                    fetchLogs();
                    return; // Thoát luôn

                default: // 'custom'
                    return; // Không làm gì, để người dùng tự chọn
            }

            // Format ngày thành YYYY-MM-DD để gán vào input
            const formatDate = (date) => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            startPicker.value = formatDate(start);
            endPicker.value = formatDate(end);

            // Gọi API ngay sau khi chọn
            currentPage = 1;
            fetchLogs();
        };

        // Sự kiện khi đổi menu chọn nhanh
        quickSelect.addEventListener('change', function() {
            setDateRange(this.value);
        });

        // Nếu người dùng tự sửa ngày tay -> Chuyển menu về "Tùy chỉnh"
        const handleCustomChange = () => {
            quickSelect.value = 'custom';
            currentPage = 1;
            fetchLogs();
        };

        startPicker.addEventListener('change', handleCustomChange);
        endPicker.addEventListener('change', handleCustomChange);

        // [TÙY CHỌN] Mặc định load trang lần đầu là "7 ngày qua" cho nhẹ server
        // Nếu không thích thì xóa dòng dưới này đi
        setDateRange('last_7_days');
    }

    // C. Sắp xếp cột
    document.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const col = th.getAttribute('data-sort');
            if (currentSort.col === col) {
                currentSort.order = currentSort.order === 'ASC' ? 'DESC' : 'ASC';
            } else {
                currentSort.col = col;
                currentSort.order = 'DESC';
            }
            updateSortIcons(col, currentSort.order);
            fetchLogs();
        });
    });

    // D. Xuất Excel
    const btnExport = document.getElementById('btnExportCSV');
    if (btnExport) {
        btnExport.addEventListener('click', () => {
            const searchEl = document.getElementById('searchLogBox');
            const startEl = document.getElementById('filterStartDate');
            const endEl = document.getElementById('filterEndDate');

            const search = searchEl ? searchEl.value.trim() : '';
            const startDate = startEl ? startEl.value : '';
            const endDate = endEl ? endEl.value : '';

            const params = new URLSearchParams({
                search: search,
                start_date: startDate,
                end_date: endDate
            });

            window.location.href = `../../api/admin/log_export.php?${params.toString()}`;
        });
    }
}
// --- 6. HELPERS ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast-message ${type}`;
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-circle-exclamation';
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function updateSortIcons(activeCol, order) {
    document.querySelectorAll('th.sortable i').forEach(icon => {
        icon.className = 'fa-solid fa-sort';
        icon.style.opacity = '0.3';
    });
    const activeTh = document.querySelector(`th.sortable[data-sort="${activeCol}"]`);
    if (activeTh) {
        const icon = activeTh.querySelector('i');
        if (icon) {
            icon.className = order === 'ASC' ? 'fa-solid fa-sort-up' : 'fa-solid fa-sort-down';
            icon.style.opacity = '1';
        }
    }
}

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return text.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}