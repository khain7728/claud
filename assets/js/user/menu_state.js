/**
 * MENU STATE MANAGER - Quản lý trạng thái menu (đóng/mở)
 * Script này chạy TRƯỚC KHI render menu để tránh animation
 */
(function() {
    'use strict';
    
    const MENU_STATE_KEY = 'vocab_menu_state';
    const MENU_OPEN = 'open';
    
    // Restore menu state từ localStorage NGAY LẬP TỨC
    const savedState = localStorage.getItem(MENU_STATE_KEY);
    if (savedState === MENU_OPEN) {
        document.body.classList.add('menu-open');
    }
    
    // Toggle menu khi click nút
    document.addEventListener('click', function(e) {
        if (e.target.closest('#menu-toggle')) {
            document.body.classList.toggle('menu-open');
            const isOpen = document.body.classList.contains('menu-open');
            localStorage.setItem(MENU_STATE_KEY, isOpen ? MENU_OPEN : 'closed');
            
            // Bật transition sau lần click đầu tiên
            document.body.classList.add('menu-allow-transition');
        }
    });
    
    // Active menu item dựa vào trang hiện tại
    document.addEventListener('DOMContentLoaded', function() {
        const currentPage = window.location.pathname.split('/').pop();
        const menuLinks = document.querySelectorAll('#main_menu a');
        
        // Các trang cùng nhóm
        const khoaHocPages = ['khoa_hoc_cua_toi.html', 'khoa_hoc_cong_dong.html'];
        
        menuLinks.forEach((link) => {
            const href = link.getAttribute('href');
            
            // Chỉ active link trỏ đến chính trang hiện tại (exact match)
            if (href === currentPage) {
                link.classList.add('active');
                
                // Workaround: Force background color nếu CSS variable không apply ngay
                setTimeout(() => {
                    const computed = window.getComputedStyle(link);
                    const bg = computed.backgroundColor;
                    if (!bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') {
                        link.style.setProperty('background-color', '#7BB7EE', 'important');
                        link.style.setProperty('color', '#fff', 'important');
                    }
                }, 100);
            }
        });
    });
})();
