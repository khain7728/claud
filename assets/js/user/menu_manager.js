/**
 * MENU MANAGER - Quản lý trạng thái menu và active state
 * - Lưu trạng thái menu (open/close) vào localStorage
 * - Khôi phục trạng thái khi chuyển trang
 * - Highlight menu item active dựa vào current page
 * - Chỉ toggle menu bằng nút 3 gạch
 */

(function () {
    'use strict';

    const MENU_STATE_KEY = 'vocab_menu_state';
    const MENU_OPEN = 'open';
    const MENU_CLOSED = 'closed';

    /**
     * Ánh xạ trang HTML với menu item
     * filename -> selector của link trong menu
     */
    const PAGE_TO_MENU_MAP = {
        'user_Dashboard.html': 'a[href*="user_Dashboard.html"]',
        'khoa_hoc_cua_toi.html': 'a[href*="khoa_hoc_cua_toi.html"]',
        'khoa_hoc_cong_dong.html': 'a[href*="khoa_hoc_cua_toi.html"]', // Khóa học cộng đồng -> active "Quản lý khóa học"
        'chi_tiet_khoa_hoc.html': 'a[href*="khoa_hoc_cua_toi.html"]', // Chi tiết khóa học -> active "Quản lý khóa học"
        'them_tu_vung.html': 'a[href*="khoa_hoc_cua_toi.html"]', // Thêm từ vựng -> active "Quản lý khóa học"
        'user_hoc_tu_vung.html': 'a[href*="khoa_hoc_cua_toi.html"]', // Học từ vựng -> active "Quản lý khóa học"
        'user_hinh_thuc_on_tap.html': 'a[href*="khoa_hoc_cua_toi.html"]', // Hình thức ôn tập -> active "Quản lý khóa học"
        'user_kiem_tra.html': 'a[href*="khoa_hoc_cua_toi.html"]', // Quiz -> active "Quản lý khóa học"
        'user_kiemtra_ketqua.html': 'a[href*="khoa_hoc_cua_toi.html"]', // Kết quả quiz -> active "Quản lý khóa học"
        'user_ketquachitiet_kiemtra.html': 'a[href*="khoa_hoc_cua_toi.html"]', // Chi tiết kết quả -> active "Quản lý khóa học"
        'user_ontap_flashcard.html': 'a[href*="khoa_hoc_cua_toi.html"]', // Ôn tập flashcard -> active "Quản lý khóa học"
        'user_ontap_tracnghiem.html': 'a[href*="khoa_hoc_cua_toi.html"]', // Ôn tập trắc nghiệm -> active "Quản lý khóa học"
        'user_ontap_dien_tu.html': 'a[href*="khoa_hoc_cua_toi.html"]', // Ôn tập điền từ -> active "Quản lý khóa học"
        'user_ontap_ketqua.html': 'a[href*="khoa_hoc_cua_toi.html"]', // Kết quả ôn tập -> active "Quản lý khóa học"
        'ho_so_user.html': 'a[href*="ho_so_user.html"]',
        'user_thongbao.html': 'a[href*="user_thongbao.html"]'
    };

    /**
     * Lấy tên file trang hiện tại
     */
    function getCurrentPageName() {
        const pathname = window.location.pathname;
        const fileName = pathname.split('/').pop();
        return fileName || 'user_Dashboard.html';
    }

    /**
     * Lấy trạng thái menu từ localStorage
     */
    function getMenuState() {
        const saved = localStorage.getItem(MENU_STATE_KEY);
        return saved || MENU_CLOSED; // Mặc định là đóng
    }

    /**
     * Lưu trạng thái menu vào localStorage
     */
    function saveMenuState(state) {
        localStorage.setItem(MENU_STATE_KEY, state);
    }

    /**
     * Mở menu
     */
    function openMenu() {
        const body = document.body;
        body.classList.add('menu-open');
        saveMenuState(MENU_OPEN);
    }

    /**
     * Đóng menu
     */
    function closeMenu() {
        const body = document.body;
        body.classList.remove('menu-open');
        saveMenuState(MENU_CLOSED);
    }

    /**
     * Toggle menu (chỉ dùng cho nút 3 gạch)
     */
    function toggleMenu() {
        const body = document.body;
        if (body.classList.contains('menu-open')) {
            closeMenu();
        } else {
            openMenu();
        }
    }

    /**
     * Khôi phục trạng thái menu từ localStorage
     */
    function restoreMenuState() {
        const state = getMenuState();
        if (state === MENU_OPEN) {
            openMenu();
        } else {
            closeMenu();
        }
    }

    /**
     * Set active state cho menu item dựa vào trang hiện tại
     */
    function setActiveMenuItem() {
        const currentPage = getCurrentPageName();
        const selector = PAGE_TO_MENU_MAP[currentPage];

        if (!selector) return;

        // Xóa active state khỏi tất cả menu items
        document.querySelectorAll('#frame_menu > #main_menu a').forEach(link => {
            link.classList.remove('active');
        });

        // Thêm active state vào menu item phù hợp
        const activeLink = document.querySelector(selector);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }

    /**
     * Thiết lập event listener cho nút toggle menu
     */
    function setupMenuToggle() {
        const menuBtn = document.getElementById('menu');
        if (menuBtn) {
            menuBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleMenu();
            });
        }
    }

    /**
     * Ngăn chặn menu bị đóng khi click vào các phần tử bên trong
     */
    function preventMenuCloseOnClick() {
        const menu = document.getElementById('menu_user');
        if (menu) {
            menu.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
    }

    /**
     * Ngăn chặn menu bị đóng khi click vào body (ngoại trừ nút 3 gạch)
     */
    function preventBodyClickFromClosingMenu() {
        document.addEventListener('click', (e) => {
            const menuBtn = document.getElementById('menu');
            const menu = document.getElementById('menu_user');
            
            // Nếu click vào nút menu hoặc trong menu, đừng đóng
            if (menuBtn && (e.target === menuBtn || menuBtn.contains(e.target))) {
                return;
            }
            if (menu && menu.contains(e.target)) {
                return;
            }

            // Nếu click ngoài menu và nút menu, đừng có đóng tự động
            // Menu chỉ đóng khi bấm nút 3 gạch
        });
    }

    /**
     * Khởi tạo menu manager
     */
    function init() {
        // Đợi menu được load xong
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => {
                    restoreMenuState();
                    setActiveMenuItem();
                    setupMenuToggle();
                    preventMenuCloseOnClick();
                    preventBodyClickFromClosingMenu();
                }, 100);
            });
        } else {
            // DOM đã sẵn sàng
            setTimeout(() => {
                restoreMenuState();
                setActiveMenuItem();
                setupMenuToggle();
                preventMenuCloseOnClick();
                preventBodyClickFromClosingMenu();
            }, 100);
        }
    }

    // Khởi động
    init();

    // Export để dùng từ các file khác nếu cần
    window.MenuManager = {
        openMenu,
        closeMenu,
        toggleMenu,
        restoreMenuState,
        setActiveMenuItem,
        getCurrentPageName
    };

})();
