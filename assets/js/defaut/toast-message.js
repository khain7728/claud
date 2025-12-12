/**
 * Toast Message System
 * Hệ thống hiển thị thông báo dạng toast
 */

(function() {
    'use strict';

    // Tạo container cho toast nếu chưa có
    function createToastContainer() {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        return container;
    }

    // Icon cho từng loại thông báo
    const icons = {
        success: '<i class="fa-solid fa-circle-check"></i>',
        error: '<i class="fa-solid fa-circle-xmark"></i>',
        warning: '<i class="fa-solid fa-triangle-exclamation"></i>',
        info: '<i class="fa-solid fa-circle-info"></i>'
    };

    // Tiêu đề mặc định cho từng loại
    const defaultTitles = {
        success: 'Thành công',
        error: 'Lỗi',
        warning: 'Cảnh báo',
        info: 'Thông tin'
    };

    /**
     * Hiển thị toast message
     * @param {string} message - Nội dung thông báo
     * @param {string} type - Loại thông báo: success, error, warning, info
     * @param {object} options - Tùy chọn bổ sung
     */
    window.showToast = function(message, type = 'info', options = {}) {
        const container = createToastContainer();
        
        // Tùy chọn mặc định
        const settings = {
            title: options.title || defaultTitles[type] || 'Thông báo',
            duration: options.duration || 4000,
            closeable: options.closeable !== false,
            ...options
        };

        // Tạo toast element
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        // Nội dung toast
        toast.innerHTML = `
            <div class="toast-icon">${icons[type] || icons.info}</div>
            <div class="toast-content">
                <div class="toast-title">${settings.title}</div>
                <div class="toast-message">${message}</div>
            </div>
            ${settings.closeable ? '<button class="toast-close" aria-label="Đóng">&times;</button>' : ''}
            <div class="toast-progress" style="animation-duration: ${settings.duration}ms"></div>
        `;

        // Thêm vào container
        container.appendChild(toast);

        // Xử lý nút đóng
        if (settings.closeable) {
            const closeBtn = toast.querySelector('.toast-close');
            closeBtn.addEventListener('click', () => {
                removeToast(toast);
            });
        }

        // Tự động đóng sau duration
        setTimeout(() => {
            removeToast(toast);
        }, settings.duration);
    };

    /**
     * Xóa toast
     * @param {HTMLElement} toast - Element toast cần xóa
     */
    function removeToast(toast) {
        toast.classList.add('closing');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300); // Thời gian animation
    }

    // Shorthand methods
    window.showSuccess = function(message, options = {}) {
        showToast(message, 'success', options);
    };

    window.showError = function(message, options = {}) {
        showToast(message, 'error', options);
    };

    window.showWarning = function(message, options = {}) {
        showToast(message, 'warning', options);
    };

    window.showInfo = function(message, options = {}) {
        showToast(message, 'info', options);
    };

})();
