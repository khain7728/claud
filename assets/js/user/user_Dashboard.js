/**
 * USER DASHBOARD - JavaScript
 * Xử lý tải dữ liệu và hiển thị dashboard cho người dùng
 */

// API Base URL
const API_BASE = '../../api';

// Lấy user_id từ session
let currentUserId = null;

/**
 * Khởi tạo user_id từ session
 */
async function initializeUser() {
    try {
        const response = await fetch(`${API_BASE}/get-session-user.php`);
        const result = await response.json();
        
        if (result.success) {
            currentUserId = result.user_id;
            
            // Lưu vào localStorage để dùng cho các request tiếp theo
            localStorage.setItem('user_id', currentUserId);
            localStorage.setItem('user_name', result.name);
            localStorage.setItem('user_role', result.role);
        } else {
            // Session hết hạn hoặc chưa đăng nhập
            console.error('Session expired or not logged in');
            localStorage.clear(); // Xóa localStorage cũ
            alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
            window.location.href = '../dangnhap.html';
        }
    } catch (error) {
        console.error('Error getting session:', error);
        
        // Phân biệt loại lỗi
        if (!navigator.onLine) {
            // Mất kết nối mạng - cho phép dùng cache tạm thời
            currentUserId = localStorage.getItem('user_id');
            if (!currentUserId) {
                alert('Không có kết nối mạng. Vui lòng kiểm tra và đăng nhập lại.');
                window.location.href = '../dangnhap.html';
            }
            // Hiển thị cảnh báo offline
            console.warn('⚠️ Offline mode - using cached data');
        } else {
            // Lỗi khác (server error, timeout, etc.) - bắt buộc login lại
            localStorage.clear();
            alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
            window.location.href = '../dangnhap.html';
        }
    }
}

/**
 * Load thống kê dashboard
 */
async function loadDashboardStats(forceRefresh = false) {
    try {
        const response = await fetch(`${API_BASE}/get-dashboard-stats.php?user_id=${currentUserId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const text = await response.text();
        let result;
        try {
            result = JSON.parse(text);
        } catch (parseError) {
            console.error('JSON Parse Error. Raw response:', text);
            return;
        }

        if (result.success) {
            displayDashboardStats(result.data);
        } else {
            console.error('Lỗi API:', result.error);
        }
    } catch (error) {
        console.error('Lỗi kết nối API get-dashboard-stats:', error);
    }
}

/**
 * Display dashboard stats (separated from loading)
 */
function displayDashboardStats(data) {
    const welcomeEl = document.getElementById('welcome-message');
    const coursesEl = document.getElementById('total-courses');
    const wordsEl = document.getElementById('total-words');
    const scoreEl = document.getElementById('avg-score');
    
    if (welcomeEl) welcomeEl.textContent = `Chào mừng bạn trở lại, ${data.user_name}`;
    if (coursesEl) coursesEl.textContent = data.total_courses;
    if (wordsEl) wordsEl.textContent = data.total_words_learned;
    if (scoreEl) scoreEl.textContent = `${data.average_score}/100`;
}

/**
 * Load khóa học của người dùng
 */
async function loadMyCourses(forceRefresh = false) {
    try {
        const response = await fetch(`${API_BASE}/get-my-courses.php?user_id=${currentUserId}`);
        const result = await response.json();

        if (result.success) {
            displayMyCourses(result.data || []);
        } else {
            console.error('Lỗi khi tải khóa học:', result.error);
        }
    } catch (error) {
        console.error('Lỗi kết nối API:', error);
    }
}

/**
 * Display courses (separated from loading)
 */
function displayMyCourses(courses) {
    const coursesGrid = document.getElementById('courses-grid');
    
    if (courses.length === 0) {
        coursesGrid.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #999; grid-column: 1 / -1;">
                <i class="fa-solid fa-book-open" style="font-size: 48px; margin-bottom: 15px; opacity: 0.3;"></i>
                <p>Bạn chưa có khóa học nào. Hãy tạo hoặc tham gia khóa học!</p>
            </div>
        `;
        return;
    }
    
    // Hiển thị tối đa 3 khóa học
    const displayCourses = courses.slice(0, 3);
    let html = '';
    
    displayCourses.forEach(course => {
        html += `
            <div class="course-card">
                <h3 class="course-title">${escapeHtml(course.tieuDe)}</h3>
                <p class="course-description">${escapeHtml(course.mota || 'Chưa có mô tả')}</p>
                <div style="font-size: 12px; color: #666; margin: 8px 0;">
                    <i class="fa-solid fa-book"></i> ${course.soTu} từ &nbsp;|&nbsp; 
                    <i class="fa-solid fa-users"></i> ${course.hocVien} học viên
                </div>
                <div class="progress-section">
                    <div class="progress-label">
                        <span>Hoàn thành</span>
                        <span>${course.tienDo}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${course.tienDo}%"></div>
                    </div>
                </div>
                <button class="btn-continue" onclick="goToCourse(${course.id})">
                    ${course.tienDo === 0 ? 'Bắt đầu học' : 'Tiếp tục học'}
                </button>
            </div>
        `;
    });
    
    // Thêm nút xem tất cả nếu có nhiều hơn 3 khóa học
    if (courses.length > 3) {
        html += `
            <div class="more-card" onclick="window.location.href='khoa_hoc_cua_toi.html'" style="cursor: pointer;">
                <i class="fa-solid fa-arrow-right"></i>
                <p>Xem tất cả ${courses.length} khóa học</p>
            </div>
        `;
    }
    
    coursesGrid.innerHTML = html;
}

/**
 * Load mục tiêu hàng ngày
 */
async function loadDailyGoal(forceRefresh = false) {
    try {
        const response = await fetch(`${API_BASE}/get-daily-goal.php?user_id=${currentUserId}`);
        
        // Kiểm tra response status
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Lấy raw text trước để debug
        const text = await response.text();
        // console.log('Raw response:', text);
        
        // Parse JSON
        let result;
        try {
            result = JSON.parse(text);
        } catch (parseError) {
            console.error('JSON Parse Error. Raw response:', text);
            alert('Server trả về dữ liệu không hợp lệ cho daily goal. Kiểm tra console.');
            return;
        }
        
        // console.log('Daily goal result:', result);

        if (result.success) {
            displayDailyGoal(result.data);
            
        } else {
            console.error('Lỗi API:', result.error);
        }
    } catch (error) {
        console.error('Lỗi kết nối API get-daily-goal:', error);
    }
}

/**
 * Display daily goal (separated from loading)
 */
function displayDailyGoal(data) {
    const noGoalCard = document.getElementById('no-goal-card');
    const hasGoalCard = document.getElementById('has-goal-card');
    const streakBadge = document.getElementById('streak-badge');
    const streakDaysEl = document.getElementById('streak-days');
    
    // Kiểm tra elements tồn tại
    if (!noGoalCard || !hasGoalCard) {
        console.error('Goal card elements not found in DOM');
        return;
    }
    
    // Hiển thị streak nếu có
    if (data.streak_days && data.streak_days > 0) {
        if (streakBadge) streakBadge.style.display = 'flex';
        if (streakDaysEl) streakDaysEl.textContent = data.streak_days;
    }
    
    if (data.has_goal) {
        // Hiển thị mục tiêu hiện tại
        noGoalCard.style.display = 'none';
        hasGoalCard.style.display = 'block';
        
        // Cập nhật tiêu đề
        const goalTitle = `Học ${data.daily_target} từ hôm nay${data.is_recurring ? ' (Lặp lại hàng ngày)' : ''}`;
        const goalSubtitle = `Đã học ${data.words_learned_today}/${data.daily_target} từ hôm nay`;
        
        const goalTitleEl = document.getElementById('goal-title');
        const goalSubtitleEl = document.getElementById('goal-subtitle');
        const goalPercentEl = document.getElementById('goal-progress-percent');
        const goalBarEl = document.getElementById('goal-progress-bar');
        
        if (goalTitleEl) goalTitleEl.textContent = goalTitle;
        if (goalSubtitleEl) goalSubtitleEl.textContent = goalSubtitle;
        if (goalPercentEl) goalPercentEl.textContent = `${data.progress_percent}%`;
        if (goalBarEl) goalBarEl.style.width = `${data.progress_percent}%`;
    } else {
        // Chưa có mục tiêu
        noGoalCard.style.display = 'block';
        hasGoalCard.style.display = 'none';
    }
}

/**
 * Hiển thị modal thiết lập mục tiêu
 */
function showGoalModal() {
    const modal = document.getElementById('goal-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

/**
 * Ẩn modal thiết lập mục tiêu
 */
function hideGoalModal() {
    const modal = document.getElementById('goal-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Lưu mục tiêu học hàng ngày
 */
async function saveGoal() {
    const dailyTarget = parseInt(document.getElementById('goal-input').value);
    const isRecurring = document.getElementById('recurring-checkbox').checked ? 1 : 0;
    
    // Validate
    if (!dailyTarget || dailyTarget < 1 || dailyTarget > 1000) {
        alert('Vui lòng nhập số từ từ 1 đến 1000');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/save-daily-goal.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: currentUserId,
                daily_words_target: dailyTarget,
                is_recurring: isRecurring
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Đã lưu mục tiêu thành công!');
            hideGoalModal();
            
            // Clear cache để lấy data mới
            localStorage.removeItem('dashboard_goal');
            
            // Broadcast để sync cross-tab
            if (window.SyncManager) {
                window.SyncManager.broadcast(window.SYNC_ACTIONS.DAILY_GOAL_UPDATED, {
                    userId: currentUserId,
                    dailyTarget: dailyTarget
                });
            }
            
            // Reload mục tiêu để lấy data mới
            await loadDailyGoal();
        } else {
            alert('Lỗi: ' + result.error);
        }
    } catch (error) {
        console.error('Lỗi khi lưu mục tiêu:', error);
        alert('Không thể kết nối đến server');
    }
}

/**
 * Chuyển đến trang khóa học của tôi
 */
function goToCourse(courseId) {
    localStorage.setItem('selected_course_id', courseId);
    window.location.href = `chi_tiet_khoa_hoc.html?id=${courseId}`;
}

/**
 * Escape HTML để tránh XSS
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Load thống kê quiz theo tuần và vẽ chart
 */
let weeklyChart = null; // Biến global để lưu Chart instance

async function loadWeeklyQuizStats(forceRefresh = false) {
    try {
        const response = await fetch(`${API_BASE}/get-weekly-quiz-stats.php?user_id=${currentUserId}`);
        const text = await response.text();
        
        let result;
        try {
            result = JSON.parse(text);
        } catch (parseError) {
            console.error('JSON Parse Error for weekly stats:', text);
            return;
        }
        
        if (result.success && result.data) {
            drawWeeklyChart(result.data);
            // console.log('Weekly quiz stats loaded:', result.data);
        }
    } catch (error) {
        console.error('Error loading weekly quiz stats:', error);
    }
}

/**
 * Vẽ biểu đồ tuần bằng Chart.js
 */
function drawWeeklyChart(weekData) {
    const ctx = document.getElementById('weeklyChart');
    
    if (!ctx) {
        console.error('Canvas element not found');
        return;
    }
    
    if (weekData.length === 0) {
        console.warn('No data to display');
        return;
    }
    
    // Kiểm tra Chart.js đã load chưa
    if (typeof Chart === 'undefined') {
        console.error('Chart.js library not loaded');
        return;
    }
    
    // Destroy chart cũ nếu tồn tại
    if (weeklyChart) {
        weeklyChart.destroy();
    }
    
    // Prepare data
    const labels = weekData.map(day => day.day_name);
    const scores = weekData.map(day => day.avg_score || 0);
    
    // console.log('Drawing chart with data:', { labels, scores });
    
    // Create new chart
    weeklyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Điểm trung bình',
                data: scores,
                borderColor: '#4A90E2',
                backgroundColor: 'rgba(74, 144, 226, 0.1)',
                borderWidth: 3,
                pointBackgroundColor: '#4A90E2',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 5,
                pointHoverBorderWidth: 2,
                tension: 0,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 3,
            layout: {
                padding: {
                    left: 10,
                    right: 30,
                    top: 10,
                    bottom: 10
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: {
                            size: 13,
                            family: 'Roboto'
                        },
                        padding: 15,
                        color: '#666'
                    }
                },
                tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleFont: {
                        size: 14,
                        family: 'Roboto'
                    },
                    bodyFont: {
                        size: 13,
                        family: 'Roboto'
                    },
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return 'Điểm: ' + context.parsed.y.toFixed(1) + '/100';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        stepSize: 25,
                        font: {
                            size: 12,
                            family: 'Roboto'
                        },
                        color: '#666',
                        callback: function(value) {
                            return value.toFixed(1);
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                        drawBorder: false
                    }
                },
                x: {
                    ticks: {
                        font: {
                            size: 12,
                            family: 'Roboto'
                        },
                        color: '#666',
                        padding: 10
                    },
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.03)',
                        drawBorder: false
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index',
                axis: 'x'
            },
            animation: false,
            animations: {
                colors: false,
                x: false,
                y: false
            },
            transitions: {
                active: {
                    animation: {
                        duration: 0
                    }
                }
            },
            hover: {
                animationDuration: 0,
                mode: null
            },
            responsiveAnimationDuration: 0
        }
    });
}

/**
 * Khởi tạo khi trang load
 */
document.addEventListener('DOMContentLoaded', async function() {
    // Khởi tạo user từ session trước
    await initializeUser();
    
    // Sau đó load tất cả dữ liệu
    loadDashboardStats();
    loadMyCourses();
    loadDailyGoal();
    loadWeeklyQuizStats();
    
    // Đóng modal khi click bên ngoài
    const modal = document.getElementById('goal-modal');
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            hideGoalModal();
        }
    });
});
