document.addEventListener("DOMContentLoaded", function() {
    // 1. Hiển thị ngày hiện tại
    const dateEl = document.getElementById('current-date');
    if (dateEl) dateEl.innerText = new Date().toLocaleDateString('vi-VN');

    // 2. Gọi API lần đầu (hiện Loading)
    fetchDashboardStatistics(false);

    // Dashboard stats realtime
    // Tự động cập nhật mỗi 30 giây (true = chạy ngầm, không hiện loading)
    setInterval(() => {
        fetchDashboardStatistics(true);
    }, 30000);
});

// Thêm tham số isBackground để xử lý UX Loading (#22)
async function fetchDashboardStatistics(isBackground = false) {
    const apiUrl = '../../api/admin/dashboard_get_stats.php';

    // Chỉ hiện loading icon khi load trang lần đầu
    if (!isBackground) {
        const loadingIcon = '<i class="fa-solid fa-spinner fa-spin"></i>';
        ['stats-total-users', 'stats-total-courses', 'stats-today-activity'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = loadingIcon;
        });
    }

    try {
        const response = await fetch(apiUrl);
        // Check HTTP Status
        if (!response.ok) throw new Error(`Lỗi kết nối: ${response.status}`);

        const result = await response.json();

        if (result.status === 'success') {
            updateDashboardUI(result.data);
        } else {
            throw new Error(result.message || "Lỗi dữ liệu từ server");
        }
    } catch (error) {
        console.error("Lỗi API:", error);

        if (!isBackground) {
            showToast("Không thể tải dữ liệu. Vui lòng kiểm tra kết nối!", "error");

            // Trả về số 0 nếu lỗi lần đầu
            setTextContent('stats-total-users', 0);
            setTextContent('stats-total-courses', 0);
            setTextContent('stats-today-activity', 0);
        }
    }
}

function updateDashboardUI(data) {
    // Cập nhật số liệu text (Có hiệu ứng đếm số nhẹ nếu muốn, ở đây gán thẳng)
    setTextContent('stats-total-users', data.total_users);
    setTextContent('stats-total-courses', data.total_courses);
    setTextContent('stats-today-activity', data.today_activity);

    // Vẽ danh sách hoạt động
    renderActivityList(data.recent_activities);

    // Vẽ biểu đồ
    renderCharts(data);
}

function renderActivityList(activities) {
    const listContainer = document.getElementById('list-recent-activities');
    if (!listContainer) return;

    if (!activities || activities.length === 0) {
        listContainer.innerHTML = '<li class="activity-item" style="padding:10px; color: #666;">Chưa có hoạt động nào gần đây.</li>';
        return;
    }

    // So sánh dữ liệu cũ để tránh render lại HTML nếu không cần thiết (Tối ưu DOM)
    // Tuy nhiên với list ngắn (6 item) thì render lại luôn cho đơn giản
    let html = '';
    activities.forEach(item => {
        let timeDisplay = item.created_at;
        try {
            const d = new Date(item.created_at);
            // Format: HH:mm - dd/MM
            timeDisplay = `${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')} - ${d.getDate()}/${d.getMonth()+1}`;
        } catch (e) {}

        // Map action sang tiếng Việt đẹp hơn (tuỳ chọn)
        const actionText = item.action || 'Thao tác hệ thống';

        html += `
            <li class="activity-item">
                <div class="icon-box-small"><i class="fa-solid fa-clock-rotate-left"></i></div>
                <div class="activity-text">
                    <p><strong>${item.admin_name || 'Admin'}</strong>: ${actionText}</p>
                    <span>${timeDisplay}</span>
                </div>
            </li>
        `;
    });
    listContainer.innerHTML = html;
}

// [FIX LỖI #33] Chart re-render
function renderCharts(data) {
    if (typeof Chart === 'undefined') return;

    // Helper function để vẽ hoặc update chart
    const createOrUpdateChart = (canvasId, type, chartData, options) => {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        // Kiểm tra xem chart đã tồn tại chưa
        const existingChart = Chart.getChart(ctx);

        if (existingChart) {
            // [FIX LỖI #33] Nếu chart đã có, ta hủy đi vẽ lại 
            // (Hoặc tối ưu hơn là update data, nhưng destroy an toàn hơn cho logic đổi loại chart)
            existingChart.destroy();
        }

        new Chart(ctx, {
            type: type,
            data: chartData,
            options: options
        });
    };

    // 1. BIỂU ĐỒ KHÓA HỌC
    createOrUpdateChart('chart-popular-courses', 'bar', {
        labels: data.popular_courses.map(i => i.course_name),
        datasets: [{
            label: 'Học viên',
            data: data.popular_courses.map(i => i.learning_count),
            backgroundColor: '#FF9F43',
            borderRadius: 4,
            barPercentage: 0.5
        }]
    }, {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            y: { beginAtZero: true, ticks: { precision: 0 } },
            x: { grid: { display: false } }
        }
    });

    // 2. BIỂU ĐỒ USER
    createOrUpdateChart('chart-new-users', 'line', {
        labels: data.user_chart.map(i => i.month_year),
        datasets: [{
            label: 'Thành viên mới',
            data: data.user_chart.map(i => i.count),
            borderColor: '#7367F0',
            backgroundColor: 'rgba(115, 103, 240, 0.1)',
            tension: 0,
            fill: true,
            pointRadius: 4,
            pointHoverRadius: 6
        }]
    }, {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }, // Ẩn legend cho gọn
        scales: {
            y: { beginAtZero: true, ticks: { precision: 0 } },
            x: { grid: { display: false } }
        }
    });
}

function setTextContent(id, val) {
    const el = document.getElementById(id);
    if (el) el.innerText = val !== undefined ? val : 0;
}

// [FIX LỖI #27] Toast notification
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const iconMap = {
        success: '<i class="fa-solid fa-circle-check"></i>',
        error: '<i class="fa-solid fa-circle-exclamation"></i>',
        warning: '<i class="fa-solid fa-triangle-exclamation"></i>'
    };

    const toast = document.createElement('div');
    toast.className = `toast-message ${type}`;
    toast.innerHTML = `${iconMap[type] || ''} <span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s reverse'; // Nếu có animation out
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}