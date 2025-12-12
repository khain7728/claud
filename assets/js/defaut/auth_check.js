/**
 * AUTH CHECK - JavaScript Client-Side (SECONDARY LAYER)
 * ⚠️ LƯU Ý: Đây chỉ là lớp bảo vệ PHỤ - KHÔNG THỂ thay thế PHP check
 * PHP middleware (index.php) là lớp bảo vệ CHÍNH không thể bypass
 * 
 * JavaScript này chỉ dùng để:
 * 1. Improve UX (redirect nhanh hơn nếu chưa login)
 * 2. Double-check session còn hiệu lực
 * 3. Verify thông tin user từ meta tags (injected bởi PHP)
 */

/**
 * Kiểm tra xem trang đã đi qua PHP gateway chưa
 */
function isGatewayVerified() {
    const authMeta = document.querySelector('meta[name="auth-verified"]');
    return authMeta && authMeta.content === 'true';
}

/**
 * Lấy thông tin user từ meta tags (injected bởi PHP gateway)
 */
function getUserFromMeta() {
    const userId = document.querySelector('meta[name="user-id"]')?.content;
    const userRole = document.querySelector('meta[name="user-role"]')?.content;
    const userName = document.querySelector('meta[name="user-name"]')?.content;
    
    if (userId && userRole) {
        return {
            user_id: parseInt(userId),
            role: userRole,
            name: userName || 'User'
        };
    }
    
    return null;
}

/**
 * Helper function để lấy đường dẫn đăng nhập phù hợp
 */
function getLoginPath() {
    const currentPath = window.location.pathname;
    const isAdminPage = currentPath.includes('/pages/admin/');
    const isUserPage = currentPath.includes('/pages/user/');
    
    if (isAdminPage || isUserPage) {
        return '../dangnhap.html';
    }
    
    return 'dangnhap.html';
}

/**
 * Verify session với server (backup check)
 */
async function verifySessionWithServer() {
    try {
        const response = await fetch('/VOCAB/api/get-session-user.php', {
            cache: 'no-cache'
        });
        const result = await response.json();
        
        if (!result.success) {
            return null;
        }
        
        return {
            user_id: result.user_id,
            role: result.role,
            name: result.name
        };
    } catch (error) {
        console.error('Session verification failed:', error);
        return null;
    }
}

/**
 * Main authentication check
 */
(async function checkAuth() {
    // BƯỚC 1: Kiểm tra đã qua PHP gateway chưa
    if (isGatewayVerified()) {
        // ✅ Trang đã qua PHP authentication - AN TOÀN
        const userFromMeta = getUserFromMeta();
        
        if (userFromMeta) {
            // Lưu vào localStorage cho JavaScript khác sử dụng
            localStorage.setItem('user_id', userFromMeta.user_id);
            localStorage.setItem('user_name', userFromMeta.name);
            localStorage.setItem('user_role', userFromMeta.role);
            
            // console.log('✅ PHP Gateway Auth Verified:', userFromMeta);
            
            // Verify ngay lập tức với server (phòng trường hợp session expire)
            const serverUser = await verifySessionWithServer();
            if (!serverUser) {
                console.warn('⚠️ Session expired - redirecting to login');
                alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
                localStorage.clear(); // Xóa localStorage cũ
                window.location.href = getLoginPath();
                return;
            }
            
            return; // Authenticated - cho phép tiếp tục
        }
    }
    
    // BƯỚC 2: Nếu không có meta tag auth-verified, fallback về API check
    // (Dùng cho các trang HTML cũ chưa qua gateway)
    console.warn('⚠️ Page not verified by PHP gateway - using fallback API check');
    
    try {
        const result = await verifySessionWithServer();
        
        if (!result) {
            // Chưa đăng nhập, redirect về login
            console.error('❌ Not authenticated - redirecting to login');
            alert('Vui lòng đăng nhập để tiếp tục');
            window.location.href = getLoginPath();
            return;
        }
        
        // Lưu thông tin user vào localStorage
        localStorage.setItem('user_id', result.user_id);
        localStorage.setItem('user_name', result.name);
        localStorage.setItem('user_role', result.role);
        
        // Kiểm tra quyền truy cập
        const currentPath = window.location.pathname;
        const isAdminPage = currentPath.includes('/pages/admin/');
        const isUserPage = currentPath.includes('/pages/user/');
        
        if (isAdminPage && result.role !== 'admin') {
            console.error('❌ Insufficient permissions for admin page');
            alert('Bạn không có quyền truy cập trang này!');
            window.location.href = '../user/user_Dashboard.html';
            return;
        }
        
        if (isUserPage && result.role !== 'user' && result.role !== 'admin') {
            console.error('❌ Insufficient permissions');
            alert('Bạn không có quyền truy cập!');
            window.location.href = getLoginPath();
            return;
        }
        
        // console.log('✅ Fallback authentication check passed:', result);
        
    } catch (error) {
        console.error('❌ Auth check failed:', error);
        alert('Không thể xác thực. Vui lòng đăng nhập lại.');
        window.location.href = getLoginPath();
    }
})();
