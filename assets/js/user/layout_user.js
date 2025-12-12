(function () {
  'use strict';

  const MENU_PATH = '../../includes/menu_user.html';
  const HEADER_PATH = '../../includes/header_user.html';

  // --- Hàm load HTML ---
  async function loadInclude(url, containerId) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Không tải được ${url}`);
      const html = await response.text();
      const container = document.getElementById(containerId);
      if (!container) return;

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Load CSS từ file include
      doc.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
        let href = link.getAttribute('href');
        if (href && href.startsWith('../')) href = '../' + href;
        if (href && !document.querySelector(`link[href="${href}"]`)) {
          const newLink = document.createElement('link');
          newLink.rel = 'stylesheet';
          newLink.href = href;
          document.head.appendChild(newLink);
        }
      });

      const targetElement = doc.body.querySelector(`#${containerId}`);
      container.innerHTML = targetElement ? targetElement.innerHTML : doc.body.innerHTML;
    } catch (error) { console.error(error); }
  }

  // --- Cấu hình Layout & Style ---
  function injectLayoutStyles() {
    const styleId = 'layout-user-styles';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      body.layout-user{ margin: 0; padding: 0; display: flex; flex-direction: row; min-height: 100vh; font-family: 'Roboto', sans-serif; }
      body.layout-user > #menu_user{ position: fixed; left: 0; top: 0; height: 100vh; z-index: 100; }
      body.layout-user #main_container{ flex: 1; display: flex; flex-direction: column; margin-left: 4.5rem; min-height: 100vh; }
      body.layout-user #main_container > #header_user{ position: sticky; top: 0; z-index: 50; width: 100%; margin-left: 0; padding-left: 1rem; box-sizing: border-box; }
      
      /* Header User Info Style */
      body.layout-user #header_user #user-info { cursor: pointer; display: flex; align-items: center; gap: 10px; padding: 0 10px; }
      body.layout-user #header_user #user-info:hover { opacity: 0.8; }
      body.layout-user #header_user #user-info img { width: 35px; height: 35px; object-fit: cover; border-radius: 50%; border: 1px solid #ddd; }
      body.layout-user #header_user #user-info .user-name { font-weight: 500; font-size: 0.95rem; color: #333; max-width: 150px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }

      @media (max-width: 768px){
        body.layout-user #main_container{ margin-left: 0; }
        body.layout-user > #menu_user{ transform: translateX(-100%); transition: transform 220ms ease; }
        body.layout-user.menu-open > #menu_user{ transform: translateX(0); }
        body.layout-user #main_container > #header_user{ width: 100%; padding-left: 0; }
      }
      body.layout-user.menu-open > #menu_user{ width: 15rem !important; align-items: stretch !important; }
      body.layout-user.menu-open #main_container{ margin-left: 15rem !important; }
      body.layout-user.menu-open #main_container > #header_user{ width: 100%; padding-left: 1rem; }
      
      /* Không có transition kéo mờ */
      body.layout-user #menu_user{ transition: width 250ms ease, font-size 250ms ease !important; }
      
      /* Tắt transition khi vừa load để tránh giật */
      body.layout-user.menu-no-anim #menu_user,
      body.layout-user.menu-no-anim #main_container,
      body.layout-user.menu-no-anim #main_container > #header_user{
        transition: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  function setupLayout() {
    document.body.classList.add('layout-user');
    const mainContainer = document.createElement('div');
    mainContainer.id = 'main_container';
    const headerDiv = document.getElementById('header_user');
    const contentDiv = document.getElementById('content');
    if (headerDiv) mainContainer.appendChild(headerDiv);
    if (contentDiv) mainContainer.appendChild(contentDiv);
    document.body.appendChild(mainContainer);
  }

  // --- Logic Header User Data (ĐÃ SỬA LOGIC AVATAR) ---
  async function loadHeaderUserData() {
    const userInfoBox = document.getElementById('user-info');
    if (!userInfoBox) return;

    const avatarImg = userInfoBox.querySelector('img');
    const nameText = userInfoBox.querySelector('.user-name');
    const DEFAULT_AVATAR = "https://upload.wikimedia.org/wikipedia/commons/9/99/Sample_User_Icon.png";

    let storedName = localStorage.getItem('user_name');
    let storedAvatar = localStorage.getItem('user_avatar');
    const userId = localStorage.getItem('user_id');

    // Nếu chưa có tên -> Gọi API lấy ngay
    if ((!storedName || storedName === 'null') && userId) {
        try {
            const response = await fetch(`http://localhost/VOCAB/api/get-user-profile.php?user_id=${userId}`);
            const result = await response.json();
            if (result.success) {
                storedName = result.data.user.fullname;
                storedAvatar = result.data.user.avatar;
                localStorage.setItem('user_name', storedName);
                // Lưu avatar mới (có thể là null, url, hoặc filename)
                if (storedAvatar) localStorage.setItem('user_avatar', storedAvatar);
            }
        } catch (e) { console.error("Lỗi lấy thông tin user header:", e); }
    }

    // Hiển thị tên
    if (nameText) nameText.textContent = (storedName && storedName !== 'null') ? storedName : "User";

    // Hiển thị Avatar (Logic mới)
    if (avatarImg) {
        let finalSrc = DEFAULT_AVATAR;

        // Kiểm tra nếu có dữ liệu avatar hợp lệ
        if (storedAvatar && storedAvatar !== 'null' && storedAvatar.trim() !== "") {
            if (storedAvatar.startsWith('http') || storedAvatar.startsWith('https')) {
                // Link online (Google/Facebook/Cloud)
                finalSrc = storedAvatar;
            } else {
                // File upload local
                finalSrc = `../../assets/images/avatar/${storedAvatar}`;
            }
        }

        avatarImg.src = finalSrc;
        
        // Xử lý fallback: Nếu link ảnh bị lỗi (404) -> chuyển về mặc định
        avatarImg.onerror = function() {
            this.src = DEFAULT_AVATAR;
        };
    }
  }

  // --- Các hàm setup khác ---
  function setupMenuToggle() {
    // ⚡ Bật transition CHỈ KHI user click nút toggle
    document.addEventListener('click', function(e) {
      if (e.target.closest('#menu-toggle')) {
        // Lần đầu click → bật transition
        document.body.classList.add('menu-allow-transition');
      }
    });
    // Menu toggle logic được xử lý bởi menu_manager.js
  }

  function setupLogout() {
    const logoutLink = document.querySelector('#logout a');
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            if (!confirm('Bạn có chắc chắn muốn đăng xuất?')) e.preventDefault();
            else {
                localStorage.removeItem('vocab_menu_state');
                localStorage.clear();
            }
        });
    }
  }

  function setupNotifications() {
     const notifContainer = document.getElementById('notifications');
     const notifTrigger = document.getElementById('notif-trigger');
     if(notifContainer && notifTrigger) {
         notifTrigger.addEventListener('click', (e) => {e.stopPropagation(); notifContainer.classList.toggle('open');});
         document.addEventListener('click', (e) => {if(!notifContainer.contains(e.target)) notifContainer.classList.remove('open');});
     }
  }
  
  function setupUserInfoRedirect() {
    const userInfo = document.getElementById('user-info');
    if (userInfo) userInfo.addEventListener('click', () => window.location.href = 'ho_so_user.html');
  }

  function loadNotificationModule() {
    const script = document.createElement('script');
    script.src = '../../assets/js/user/notifications.js';
    script.defer = true;
    document.head.appendChild(script);
  }

  // --- INIT ---
  function init() {
    injectLayoutStyles();
    
    // ⚡ BƯỚC 1: Restore menu state TRƯỚC KHI load menu (QUAN TRỌNG!)
    const savedMenuState = localStorage.getItem('vocab_menu_state');
    if (savedMenuState === 'open') {
      document.body.classList.add('menu-open');
    }
    
    // ⚡ BƯỚC 2: Load menu và header
    Promise.all([loadInclude(MENU_PATH, 'menu_user'), loadInclude(HEADER_PATH, 'header_user')])
      .then(() => {
        setupLayout();
        setupMenuToggle();
        setupNotifications();
        setupLogout();
        loadHeaderUserData();
        setupUserInfoRedirect();
        loadNotificationModule();
        
        // Load menu manager sau khi layout setup xong
        const menuManagerScript = document.createElement('script');
        menuManagerScript.src = '../../assets/js/user/menu_manager.js';
        menuManagerScript.defer = true;
        document.head.appendChild(menuManagerScript);
      });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();