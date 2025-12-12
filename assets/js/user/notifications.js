/**
 * MODULE QUẢN LÝ THÔNG BÁO
 * File: assets/js/user/notifications.js
 * 
 * Chức năng:
 * - Load danh sách thông báo (có phân trang)
 * - Đánh dấu đã đọc/chưa đọc
 * - Xóa thông báo (từng cái hoặc tất cả)
 * - Cập nhật badge số lượng chưa đọc
 */

(function() {
  'use strict';

  // Cấu hình
  const CONFIG = {
    API_URL: '../../api/get-notifications.php',
    AUTO_MARK_READ: true, // Tự động đánh dấu đã đọc khi click vào thông báo
    CACHE_DURATION: 30000, // Cache 30 giây
  };

  // State quản lý
  let currentPage = 1;
  let isLoading = false;
  let hasMore = true;
  let lastFetchTime = 0;
  let cachedData = null;

  /**
   * KHỞI TẠO MODULE KHI DOM READY
   */
  function init() {
    // Load thông báo trang đầu tiên
    loadNotifications(1, true);
    
    // Gắn sự kiện cho các nút
    setupEventListeners();
  }

  /**
   * LOAD DANH SÁCH THÔNG BÁO TỪ API
   * @param {number} page - Số trang cần load
   * @param {boolean} replace - True: thay thế list, False: append thêm
   */
  async function loadNotifications(page = 1, replace = false) {
    if (isLoading) return;
    
    // Kiểm tra cache nếu đang load trang đầu
    const now = Date.now();
    if (page === 1 && cachedData && (now - lastFetchTime) < CONFIG.CACHE_DURATION) {
      // console.log('📦 Using cached notifications');
      const { notifications, pagination, unread_count } = cachedData;
      renderNotifications(notifications, replace);
      updateBadge(unread_count);
      updateLoadMoreButton(pagination.has_more);
      return;
    }
    
    isLoading = true;
    showLoadingIndicator();

    try {
      const response = await fetch(`${CONFIG.API_URL}?page=${page}`);
      
      // Xử lý lỗi 429 Too Many Requests - không hiển thị error
      if (response.status === 429) {
        console.warn('⚠️ Rate limit reached, skipping notifications load');
        // Thử lại sau 5 giây nếu cần
        setTimeout(() => {
          if (page === 1 && replace) {
            loadNotifications(page, replace);
          }
        }, 5000);
        return;
      }
      
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Không thể tải thông báo');
      }

      const { notifications, pagination, unread_count } = result.data;

      // Cache dữ liệu trang đầu
      if (page === 1) {
        cachedData = result.data;
        lastFetchTime = now;
      }

      // Cập nhật state
      currentPage = pagination.current_page;
      hasMore = pagination.has_more;

      // Render danh sách
      renderNotifications(notifications, replace);

      // Cập nhật badge
      updateBadge(unread_count);

      // Cập nhật nút "Xem thêm"
      updateLoadMoreButton(pagination.has_more);

      // console.log(`✅ Đã load ${notifications.length} thông báo (trang ${page})`);

    } catch (error) {
      console.error('❌ Lỗi khi load thông báo:', error);
      // Chỉ hiển thị error nếu không phải rate limit
      if (!error.message.includes('429')) {
        showError('Không thể tải thông báo. Vui lòng thử lại!');
      }
    } finally {
      isLoading = false;
      hideLoadingIndicator();
    }
  }

  /**
   * RENDER DANH SÁCH THÔNG BÁO RA HTML
   * @param {Array} notifications - Mảng thông báo
   * @param {boolean} replace - True: thay thế list, False: append
   */
  function renderNotifications(notifications, replace = false) {
    const listElement = document.querySelector('.notif-list');
    if (!listElement) return;

    // Nếu replace = true, xóa hết nội dung cũ
    if (replace) {
      listElement.innerHTML = '';
    }

    // Nếu không có thông báo nào
    if (notifications.length === 0 && replace) {
      listElement.innerHTML = `
        <li class="notif-item notif-empty">
          <p class="notif-text" style="text-align: center; color: #999;">
            <i class="fa-solid fa-bell-slash"></i><br>
            Bạn chưa có thông báo nào
          </p>
        </li>
      `;
      return;
    }

    // Render từng thông báo
    notifications.forEach(notif => {
      const li = createNotificationElement(notif);
      listElement.appendChild(li);
    });
  }

  /**
   * TẠO PHẦN TỬ HTML CHO MỘT THÔNG BÁO
   * @param {Object} notif - Dữ liệu thông báo
   * @returns {HTMLElement} - Phần tử <li>
   */
  function createNotificationElement(notif) {
    const li = document.createElement('li');
    li.className = `notif-item ${!notif.is_read ? 'unread' : ''}`;
    li.dataset.id = notif.id;

    // Icon theo loại thông báo
    const iconMap = {
      'system': 'fa-circle-info',
      'review': 'fa-clock-rotate-left',
      'quiz': 'fa-graduation-cap',
      'custom': 'fa-bell'
    };
    const icon = iconMap[notif.type] || 'fa-bell';

    li.innerHTML = `
      <div class="notif-content">
        <div class="notif-icon">
          <i class="fa-solid ${icon}"></i>
        </div>
        <div class="notif-body">
          <p class="notif-text">
            <strong>${escapeHtml(notif.title)}</strong><br>
            ${escapeHtml(notif.content)}
          </p>
          <span class="notif-time">${escapeHtml(notif.time_ago)}</span>
        </div>
      </div>
      <button class="notif-delete-btn" title="Xóa thông báo" data-id="${notif.id}">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    `;

    // Gắn sự kiện click vào thông báo
    li.querySelector('.notif-content').addEventListener('click', () => {
      handleNotificationClick(notif.id, !notif.is_read);
    });

    // Gắn sự kiện click vào nút xóa
    li.querySelector('.notif-delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      handleDeleteNotification(notif.id);
    });

    return li;
  }

  /**
   * XỬ LÝ KHI CLICK VÀO THÔNG BÁO
   * @param {number} id - ID thông báo
   * @param {boolean} isUnread - Thông báo chưa đọc hay chưa
   */
  async function handleNotificationClick(id, isUnread) {
    if (isUnread) {
      await markAsRead(id)
    }

    // TODO: Thêm logic điều hướng tùy theo type của thông báo
    // console.log(`📌 Clicked notification #${id}`)
  }

  /**
   * ĐÁNH DẤU THÔNG BÁO ĐÃ ĐỌC
   * @param {number|'all'} id - ID thông báo hoặc 'all' để đánh dấu tất cả
   */
  async function markAsRead(id) {
    try {
      const body = id === 'all' 
        ? { mark_all: true } 
        : { notification_id: id };

      const response = await fetch(CONFIG.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      // Cập nhật UI
      if (id === 'all') {
        document.querySelectorAll('.notif-item.unread').forEach(item => {
          item.classList.remove('unread');
        });
        updateBadge(0);
      } else {
        const item = document.querySelector(`.notif-item[data-id="${id}"]`);
        if (item) {
          item.classList.remove('unread');
        }
        // Giảm badge đi 1
        const badge = document.querySelector('.notif-badge');
        if (badge) {
          const count = Math.max(0, parseInt(badge.textContent) - 1);
          updateBadge(count);
        }
      }

      // console.log(`✅ ${result.message}`);

    } catch (error) {
      console.error('❌ Lỗi khi đánh dấu đã đọc:', error);
      showError('Không thể đánh dấu đã đọc');
    }
  }

  /**
   * XÓA THÔNG BÁO (XÓA THẬT KHỎI DATABASE)
   * @param {number|'all'} id - ID thông báo hoặc 'all' để xóa tất cả
   */
  async function handleDeleteNotification(id) {
    // Confirm trước khi xóa
    const confirmMsg = id === 'all' 
      ? 'Bạn có chắc muốn xóa TẤT CẢ thông báo?' 
      : 'Bạn có chắc muốn xóa thông báo này?';
    
    if (!confirm(confirmMsg)) return;

    try {
      const body = id === 'all' 
        ? { delete_all: true } 
        : { notification_id: id };

      const response = await fetch(CONFIG.API_URL, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      // Xóa khỏi UI
      if (id === 'all') {
        document.querySelector('.notif-list').innerHTML = `
          <li class="notif-item notif-empty">
            <p class="notif-text" style="text-align: center; color: #999;">
              <i class="fa-solid fa-bell-slash"></i><br>
              Bạn chưa có thông báo nào
            </p>
          </li>
        `;
        updateBadge(0);
        document.querySelector('.notif-load-more')?.remove();
        document.querySelector('.notif-delete-all')?.remove();
      } else {
        const item = document.querySelector(`.notif-item[data-id="${id}"]`);
        if (item) {
          // Kiểm tra xem có phải unread không
          const wasUnread = item.classList.contains('unread');
          
          // Xóa với animation
          item.style.opacity = '0';
          item.style.transform = 'translateX(100%)';
          setTimeout(() => {
            item.remove();
            
            // Nếu xóa hết thông báo thì hiển thị empty state
            const list = document.querySelector('.notif-list');
            if (list.children.length === 0) {
              list.innerHTML = `
                <li class="notif-item notif-empty">
                  <p class="notif-text" style="text-align: center; color: #999;">
                    <i class="fa-solid fa-bell-slash"></i><br>
                    Bạn chưa có thông báo nào
                  </p>
                </li>
              `;
            }
          }, 300);
          
          // Giảm badge nếu là unread
          if (wasUnread) {
            const badge = document.querySelector('.notif-badge');
            if (badge) {
              const count = Math.max(0, parseInt(badge.textContent) - 1);
              updateBadge(count);
            }
          }
        }
      }

      // console.log(`✅ ${result.message}`);

    } catch (error) {
      console.error('❌ Lỗi khi xóa thông báo:', error);
      showError('Không thể xóa thông báo');
    }
  }

  /**
   * CẬP NHẬT SỐ LƯỢNG THÔNG BÁO CHƯA ĐỌC (BADGE)
   * @param {number} count - Số lượng chưa đọc
   */
  function updateBadge(count) {
    const badge = document.querySelector('.notif-badge');
    if (!badge) return;

    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.style.display = 'block';
    } else {
      badge.style.display = 'none';
    }
  }

  /**
   * CẬP NHẬT NÚT "XEM THÊM"
   * @param {boolean} hasMore - Còn thông báo để load không
   */
  function updateLoadMoreButton(hasMore) {
    let footer = document.querySelector('.notif-footer');
    
    // Tạo footer nếu chưa có
    if (!footer) {
      footer = document.createElement('div');
      footer.className = 'notif-footer';
      document.getElementById('notif-panel').appendChild(footer);
    }

    // Xóa nội dung cũ
    footer.innerHTML = '';

    // Nếu còn thông báo để load
    if (hasMore) {
      const btnLoadMore = document.createElement('button');
      btnLoadMore.className = 'notif-load-more';
      btnLoadMore.innerHTML = '<i class="fa-solid fa-arrow-down"></i> Xem thêm';
      btnLoadMore.addEventListener('click', () => {
        loadNotifications(currentPage + 1, false);
      });
      footer.appendChild(btnLoadMore);
    }

    // Nút "Xóa tất cả" (luôn hiển thị nếu có thông báo)
    const list = document.querySelector('.notif-list');
    if (list && list.children.length > 0 && !list.querySelector('.notif-empty')) {
      const btnDeleteAll = document.createElement('button');
      btnDeleteAll.className = 'notif-delete-all';
      btnDeleteAll.innerHTML = '<i class="fa-solid fa-trash-can"></i> Xóa tất cả';
      btnDeleteAll.addEventListener('click', () => {
        handleDeleteNotification('all');
      });
      footer.appendChild(btnDeleteAll);
    }
  }

  /**
   * THIẾT LẬP CÁC SỰ KIỆN
   */
  function setupEventListeners() {
    // Sự kiện mở/đóng panel đã được xử lý trong layout_user.js
    // Ở đây chỉ cần reload khi panel được mở (nếu cần)
    
    const trigger = document.getElementById('notif-trigger');
    if (trigger) {
      trigger.addEventListener('click', () => {
        // Có thể reload lại danh sách mỗi khi mở panel
        // loadNotifications(1, true);
      });
    }
  }

  /**
   * HIỂN THỊ LOADING INDICATOR
   */
  function showLoadingIndicator() {
    const panel = document.getElementById('notif-panel');
    if (!panel) return;
    
    let loader = panel.querySelector('.notif-loading');
    if (!loader) {
      loader = document.createElement('div');
      loader.className = 'notif-loading';
      loader.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tải...';
      panel.appendChild(loader);
    }
    loader.style.display = 'block';
  }

  /**
   * ẨN LOADING INDICATOR
   */
  function hideLoadingIndicator() {
    const loader = document.querySelector('.notif-loading');
    if (loader) {
      loader.style.display = 'none';
    }
  }

  /**
   * HIỂN THỊ THÔNG BÁO LỖI
   * @param {string} message - Nội dung lỗi
   */
  function showError(message) {
    // Có thể dùng toast notification hoặc alert
    console.error('⚠️', message);
    alert(message);
  }

  /**
   * ESCAPE HTML ĐỂ TRÁNH XSS
   * @param {string} text - Chuỗi cần escape
   * @returns {string} - Chuỗi đã escape
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Khởi tạo khi DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export các hàm public (nếu cần)
  window.NotificationModule = {
    reload: () => loadNotifications(1, true),
    markAsRead,
    deleteNotification: handleDeleteNotification
  };

})();