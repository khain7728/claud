// JavaScript xử lý navigation cho header
(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', function() {
        // Lấy tất cả các link navigation
        const navLinks = document.querySelectorAll('#dieu_huong .nav-link');
        
        // Lấy URL hiện tại (normalize về dạng tuyệt đối)
        const currentPath = window.location.pathname;
        const currentPage = currentPath.split('/').pop() || 'index.html';
        
        // Set active cho link tương ứng
        navLinks.forEach(function(link) {
            const href = link.getAttribute('href');
            
            if (!href || href === '#') return;
            
            // Chuẩn hóa href về tên file
            const linkPage = href.split('/').pop() || 'index.html';
            
            // So sánh chính xác tên file
            if (linkPage === currentPage) {
                link.classList.add('active');
            }
            // Hoặc kiểm tra path đầy đủ
            else if (href.startsWith('/VOCAB/') && currentPath === href) {
                link.classList.add('active');
            }
            
            // Xử lý click
            link.addEventListener('click', function(e) {
                // Nếu link bắt đầu bằng /, xử lý relative path
                if (href && href.startsWith('/')) {
                    e.preventDefault();
                    
                    // Kiểm tra xem đang ở folder nào
                    const isInPagesFolder = currentPath.includes('/pages/');
                    
                    let newPath;
                    if (isInPagesFolder) {
                        // Đang ở trong /pages/, cần lùi về root
                        newPath = '..' + href;
                    } else {
                        // Đang ở root, bỏ / đầu tiên
                        newPath = href.substring(1);
                    }
                    
                    window.location.href = newPath;
                }
            });
        });
    });
})();
