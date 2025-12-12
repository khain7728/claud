
(
async function(){
    'use strict';

    // Hàm nhỏ: lấy nội dung HTML từ file và loại bỏ các <link> để tránh đường dẫn CSS không đúng
    async function fetchAndStripLinks(url){
        const res = await fetch(url, {cache: 'no-cache'});
        if(!res.ok) throw new Error('Lỗi khi fetch: ' + url + ' - ' + res.status);
        const text = await res.text();
        const doc = new DOMParser().parseFromString(text, 'text/html');
        // Loại bỏ các thẻ <link> trong file include (để tránh path sai khi nhúng)
        doc.querySelectorAll('link').forEach(n => n.remove());
        return doc.body.innerHTML;
    }

    // Đảm bảo các file CSS chính được chèn vào <head>
    function ensureStyles(){
        // Phát hiện xem đang ở thư mục nào (root hay pages/)
        const basePath = document.location.pathname.includes('/pages/') ? '../' : '';
        
        // CSS header
        const headerCssPath = basePath + 'assets/css/defaut/header_index.css';
        if(!document.querySelector(`link[href="${headerCssPath}"]`)){
            const l = document.createElement('link');
            l.rel = 'stylesheet';
            l.href = headerCssPath;
            document.head.appendChild(l);
        }
        // CSS footer
        const footerCssPath = basePath + 'assets/css/defaut/footer.css';
        if(!document.querySelector(`link[href="${footerCssPath}"]`)){
            const lf = document.createElement('link');
            lf.rel = 'stylesheet';
            lf.href = footerCssPath;
            document.head.appendChild(lf);
        }
    }

    try{
        // Phát hiện base path
        const basePath = document.location.pathname.includes('/pages/') ? '../' : '';
        
        // Lấy và chèn header
        const headerContainer = document.getElementById('header_index') || (function(){
            const d = document.createElement('div'); d.id = 'header_index'; document.body.prepend(d); return d; })();
        const headerHtml = await fetchAndStripLinks(basePath + 'includes/header_index.html');
        headerContainer.innerHTML = headerHtml;

        // Lấy và chèn footer
        const footerContainer = document.getElementById('footer') || (function(){
            const d = document.createElement('div'); d.id = 'footer'; document.body.appendChild(d); return d; })();
        const footerHtml = await fetchAndStripLinks(basePath + 'includes/footer.html');
        footerContainer.innerHTML = footerHtml;

        // Chèn các stylesheet cần thiết
        ensureStyles();

        // Thiết lập layout dạng cột để footer luôn nằm dưới (sau content)
        document.documentElement.style.height = '100%';
        document.body.style.display = 'flex';
        document.body.style.flexDirection = 'column';
        document.body.style.minHeight = '100vh';

        const content = document.getElementById('content');
        if(content){ content.style.flex = '1'; }

        // Đảm bảo footer đứng sau content
        if(content && footerContainer){ content.after(footerContainer); }

        // Kích hoạt active state cho navigation sau khi header được load
        activateNavigation();

    }catch(err){
        // Ghi log lỗi ra console (không làm vỡ trang)
        console.error('include-layout - lỗi:', err);
    }

    // Hàm kích hoạt active state cho navigation
    function activateNavigation() {
        const navLinks = document.querySelectorAll('#dieu_huong .nav-link');
        const currentPath = window.location.pathname;
        
        navLinks.forEach(function(link) {
            const href = link.getAttribute('href');
            
            // Kiểm tra nếu href khớp với current path
            if (href && (currentPath.endsWith(href) || currentPath.includes(href.replace('/','')))) {
                link.classList.add('active');
            }
        });
    }

})();