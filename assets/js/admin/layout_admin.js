document.addEventListener("DOMContentLoaded", async function() {
    // 1. Định nghĩa đường dẫn (Giữ nguyên)
    const basePath = "../../includes/";

    try {
        // 2. Tải Header và Menu song song
        await Promise.all([
            loadComponent("placeholder-menu", basePath + "menu_admin.html"),
            loadComponent("placeholder-header", basePath + "header_admin.html")
        ]);

        // 3. Sau khi tải xong HTML -> Active menu hiện tại
        activeCurrentMenu();

    } catch (error) {
        console.error("Lỗi tải giao diện:", error);
    }
});

/**
 * Hàm hỗ trợ tải file HTML và nhúng vào ID chỉ định
 */
async function loadComponent(elementId, filePath) {
    const element = document.getElementById(elementId);
    if (!element) return;
    try {
        const response = await fetch(filePath);
        if (response.ok) element.innerHTML = await response.text();
    } catch (e) { console.error(`Lỗi tải ${filePath}:`, e); }
}

/**
 * XỬ LÝ SỰ KIỆN GLOBAL (MENU, CLICK OUTSIDE, LOGOUT)
 * Sử dụng Event Delegation để bắt sự kiện cho các element được load động
 */
document.addEventListener('click', function(e) {
    const body = document.body;

    // Tìm các phần tử mục tiêu
    const toggleBtn = e.target.closest('#menu'); // Nút 3 gạch
    const sidebar = e.target.closest('#placeholder-menu'); // Thanh menu bên trái
    const logoutBtn = e.target.closest('#btn_logout'); // Nút đăng xuất

    // --- 1. Xử lý Nút Logout ---
    if (logoutBtn) {
        if (!confirm('Bạn có chắc chắn muốn đăng xuất?')) {
            e.preventDefault();
        }
        return; // Dừng xử lý
    }

    // --- 2. Xử lý Toggle Menu (Nút 3 gạch) ---
    if (toggleBtn) {
        // Ngăn chặn sự kiện lan ra ngoài (để không bị tính là click outside)
        e.stopPropagation();
        body.classList.toggle('menu-collapsed');
        return;
    }

    // --- 3. Xử lý Click Outside (Thu nhỏ menu khi bấm ra ngoài) ---
    // Logic: Nếu click KHÔNG phải vào Menu VÀ Menu đang mở to -> Thu nhỏ lại
    if (!sidebar && !toggleBtn) {
        // Kiểm tra: Nếu chưa có class 'menu-collapsed' nghĩa là đang mở to
        if (!body.classList.contains('menu-collapsed')) {
            body.classList.add('menu-collapsed');
        }
    }
});

/**
 * Hàm tô đậm menu đang truy cập dựa trên URL
 */
function activeCurrentMenu() {
    const currentPath = window.location.pathname;
    // Tìm tất cả thẻ a trong menu
    // Lưu ý: Cần đợi DOM load xong menu mới tìm được (đã xử lý ở trên bằng await)
    const links = document.querySelectorAll(".menu-item a");

    links.forEach(link => {
        const href = link.getAttribute("href");
        // So sánh chính xác bằng cách kiểm tra endsWith
        if (href && currentPath.endsWith(href)) {
            link.classList.add("active");
        }
    });
}