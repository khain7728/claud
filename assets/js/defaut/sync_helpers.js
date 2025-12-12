/**
 * SYNC HELPERS
 * Helper functions để sử dụng SyncManager dễ dàng hơn
 */

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Broadcast và tự động refresh dashboard stats
 * 🔒 Automatically adds timestamp for security validation
 */
function syncAndRefreshDashboard(action, payload) {
    if (!payload.timestamp) {
        payload.timestamp = Date.now();
    }
    
    window.SyncManager.broadcast(action, payload);
    // Tự động trigger REFRESH_DASHBOARD sau 500ms để đảm bảo DB đã update
    setTimeout(() => {
        window.SyncManager.broadcast(window.SYNC_ACTIONS.REFRESH_DASHBOARD, {
            timestamp: Date.now()
        });
    }, 500);
}

/**
 * Broadcast và tự động refresh course list
 * 🔒 Automatically adds timestamp for security validation
 */
function syncAndRefreshCourses(action, payload) {
    // Add timestamp nếu chưa có
    if (!payload.timestamp) {
        payload.timestamp = Date.now();
    }
    
    window.SyncManager.broadcast(action, payload);
    setTimeout(() => {
        window.SyncManager.broadcast(window.SYNC_ACTIONS.REFRESH_COURSE_LIST, {
            timestamp: Date.now()
        });
    }, 500);
}

/**
 * Setup auto-refresh cho dashboard stats
 */
function setupDashboardSync() {
    // Listen các actions cần refresh dashboard
    const dashboardActions = [
        window.SYNC_ACTIONS.WORD_LEARNED,
        window.SYNC_ACTIONS.WORD_UNLEARNED,
        window.SYNC_ACTIONS.QUIZ_COMPLETED,
        window.SYNC_ACTIONS.REVIEW_COMPLETED,
        window.SYNC_ACTIONS.COURSE_JOINED,
        window.SYNC_ACTIONS.COURSE_CREATED,
        window.SYNC_ACTIONS.DAILY_GOAL_UPDATED,
        window.SYNC_ACTIONS.REFRESH_DASHBOARD
    ];
    
    dashboardActions.forEach(action => {
        window.SyncManager.on(action, () => {
            // console.log(`[Sync] Refreshing dashboard due to: ${action}`);
            
            // Reload dashboard stats với forceRefresh = true để bỏ qua cache
            if (typeof loadDashboardStats === 'function') {
                loadDashboardStats(true);
            }
            
            // Reload daily goal với forceRefresh = true
            if (typeof loadDailyGoal === 'function') {
                loadDailyGoal(true);
            }
            
            // Reload weekly chart khi có quiz completed
            if (action === window.SYNC_ACTIONS.QUIZ_COMPLETED || action === window.SYNC_ACTIONS.REVIEW_COMPLETED) {
                if (typeof loadWeeklyQuizStats === 'function') {
                    loadWeeklyQuizStats(true);
                }
            }
        });
    });
}

/**
 * Setup auto-refresh cho course list
 */
function setupCourseListSync() {
    const courseActions = [
        window.SYNC_ACTIONS.COURSE_CREATED,
        window.SYNC_ACTIONS.COURSE_UPDATED,
        window.SYNC_ACTIONS.COURSE_DELETED,
        window.SYNC_ACTIONS.COURSE_JOINED,
        window.SYNC_ACTIONS.COURSE_LEFT,
        window.SYNC_ACTIONS.REFRESH_COURSE_LIST
    ];
    
    courseActions.forEach(action => {
        window.SyncManager.on(action, () => {
            // console.log(`[Sync] Refreshing courses due to: ${action}`);
            
            // Reload course list với forceRefresh = true để bỏ qua cache
            if (typeof fetchMyCourses === 'function') {
                fetchMyCourses();
            }
            
            // Reload loadMyCourses nếu tồn tại (cho Dashboard)
            if (typeof loadMyCourses === 'function') {
                loadMyCourses(true);
            }
            
            if (typeof fetchPublicCourses === 'function') {
                fetchPublicCourses();
            }
        });
    });
}

/**
 * Setup auto-update header (tên, avatar)
 */
function setupHeaderSync() {
    window.SyncManager.on(window.SYNC_ACTIONS.PROFILE_UPDATED, (payload) => {
        // console.log('[Sync] Updating header profile');
        
        // Update localStorage
        if (payload.name) {
            localStorage.setItem('user_name', payload.name);
        }
        if (payload.avatar) {
            localStorage.setItem('user_avatar', payload.avatar);
        }
        
        // Update header display nếu elements tồn tại
        const nameElement = document.querySelector('.user-name-display');
        if (nameElement && payload.name) {
            nameElement.textContent = payload.name;
        }
        
        const avatarElement = document.querySelector('.user-avatar-img');
        if (avatarElement && payload.avatar) {
            avatarElement.src = payload.avatar;
        }
    });
    
    window.SyncManager.on(window.SYNC_ACTIONS.AVATAR_UPDATED, (payload) => {
        // console.log('[Sync] Updating avatar');
        
        if (payload.avatar) {
            localStorage.setItem('user_avatar', payload.avatar);
            
            const avatarElement = document.querySelector('.user-avatar-img');
            if (avatarElement) {
                avatarElement.src = payload.avatar;
            }
        }
    });
}

/**
 * Setup sync khi user status bị thay đổi bởi admin
 */
function setupAdminSync() {
    window.SyncManager.on(window.SYNC_ACTIONS.USER_STATUS_CHANGED, (payload) => {
        const currentUserId = localStorage.getItem('user_id');
        
        // Nếu user hiện tại bị khóa
        if (payload.userId == currentUserId && payload.status === 'locked') {
            alert('Tài khoản của bạn đã bị khóa bởi quản trị viên. Bạn sẽ được đăng xuất.');
            
            // Logout và redirect về trang đăng nhập
            setTimeout(() => {
                window.location.href = '/VOCAB/auth/logout.php';
            }, 2000);
        }
    });
}

/**
 * Initialize tất cả sync handlers
 * Gọi function này trong mọi trang để enable cross-tab sync
 */
function initializeSyncHandlers() {
    // console.log('[Sync] Initializing sync handlers...');
    
    setupDashboardSync();
    setupCourseListSync();
    setupHeaderSync();
    setupAdminSync();
    
    // console.log('[Sync] ✅ All sync handlers initialized'); 
}

// Auto-initialize nếu DOM đã ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSyncHandlers);
} else {
    initializeSyncHandlers();
}

// Export các functions
window.syncAndRefreshDashboard = syncAndRefreshDashboard;
window.syncAndRefreshCourses = syncAndRefreshCourses;
window.initializeSyncHandlers = initializeSyncHandlers;
