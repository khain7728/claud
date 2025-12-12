// JavaScript cho trang đăng ký
(function() {
    'use strict';

    // Đợi DOM load xong
    document.addEventListener('DOMContentLoaded', function() {
        
        // Kiểm tra và hiển thị flash message từ server
        checkFlashMessage();
        
        // Lấy các elements
        const registerButton = document.querySelector('.login-button');
        const nameInput = document.getElementById('name');
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const confirmPasswordInput = document.getElementById('confirm-password');
        const termsCheckbox = document.getElementById('terms-checkbox');

        // Tự động điền email từ trang đăng nhập (nếu có)
        checkAndFillEmail();

        // Xử lý click vào "Điều khoản dịch vụ"
        const termsLinks = document.querySelectorAll('.terms a');
        termsLinks.forEach(function(link) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const linkText = this.textContent;
                
                if (linkText.includes('Điều khoản')) {
                    showTermsModal();
                } else if (linkText.includes('Chính sách')) {
                    showPrivacyModal();
                }
            });
        });

        // Xử lý đăng ký
        if (registerButton) {
            registerButton.addEventListener('click', function(e) {
                e.preventDefault();

                // Ngăn không cho submit nhiều lần
                if (registerButton.disabled) {
                    console.log('Register button đã disabled, bỏ qua click');
                    return;
                }

                // Lấy giá trị từ input
                const name = nameInput ? nameInput.value.trim() : '';
                const email = emailInput ? emailInput.value.trim() : '';
                const password = passwordInput ? passwordInput.value : '';
                const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : '';
                const termsAccepted = termsCheckbox ? termsCheckbox.checked : false;

                // Validate
                if (!name) {
                    showError('Vui lòng nhập tên đầy đủ!');
                    nameInput.focus();
                    return;
                }

                if (name.length < 2) {
                    showError('Tên phải có ít nhất 2 ký tự!');
                    nameInput.focus();
                    return;
                }

                if (!email) {
                    showError('Vui lòng nhập email!');
                    emailInput.focus();
                    return;
                }

                if (!validateEmail(email)) {
                    showError('Email không hợp lệ!');
                    emailInput.focus();
                    return;
                }

                if (!password) {
                    showError('Vui lòng nhập mật khẩu!');
                    passwordInput.focus();
                    return;
                }

                if (password.length < 8) {
                    showError('Mật khẩu phải có ít nhất 8 ký tự!');
                    passwordInput.focus();
                    return;
                }

                // Kiểm tra mật khẩu mạnh
                const hasUpperCase = /[A-Z]/.test(password);
                const hasLowerCase = /[a-z]/.test(password);
                const hasNumber = /[0-9]/.test(password);
                const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

                if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
                    showError('Mật khẩu phải bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt (!@#$%^&*...)');
                    passwordInput.focus();
                    return;
                }

                if (!confirmPassword) {
                    showError('Vui lòng xác nhận mật khẩu!');
                    confirmPasswordInput.focus();
                    return;
                }

                if (password !== confirmPassword) {
                    showError('Mật khẩu xác nhận không khớp!');
                    confirmPasswordInput.focus();
                    return;
                }

                if (!termsAccepted) {
                    showWarning('Vui lòng đồng ý với Điều khoản dịch vụ và Chính sách bảo mật!');
                    return;
                }

                // Nếu validate thành công, gửi request đến backend
                const formData = new FormData();
                formData.append('name', name);
                formData.append('email', email);
                formData.append('password', password);
                formData.append('confirm_password', confirmPassword);
                formData.append('terms_accepted', termsAccepted ? '1' : '0');

                // Vô hiệu hóa nút đăng ký ngay lập tức
                console.log('Disabling register button...');
                registerButton.disabled = true;
                registerButton.textContent = 'Đang xử lý...';

                // Timeout sau 10 giây
                const timeoutId = setTimeout(() => {
                    registerButton.disabled = false;
                    registerButton.textContent = 'Đăng ký';
                    showError('Yêu cầu quá lâu. Vui lòng thử lại!');
                }, 10000);

                // Gửi request
                fetch('../process/register-process.php', {
                    method: 'POST',
                    body: formData
                })
                .then(response => {
                    clearTimeout(timeoutId);
                    // Kiểm tra xem có redirect không
                    if (response.redirected) {
                        window.location.href = response.url;
                        return;
                    }
                    
                    // Kiểm tra content-type
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        return response.json();
                    }
                    return response.text();
                })
                .then(data => {
                    // Xử lý response JSON khi email đã tồn tại
                    if (data && typeof data === 'object') {
                        if (data.error_type === 'email_exists') {
                            // Hỏi có muốn đăng nhập không (không cần flash message vì confirm đã rõ)
                            const userConfirm = confirm(
                                data.message + '\n\n' +
                                'Bạn có muốn đăng nhập với tài khoản này không?'
                            );
                            
                            if (userConfirm) {
                                // Hiển thị toast trước khi chuyển trang
                                showInfo('Chỉnh đang chuyển đến trang đăng nhập...');
                                // Delay 1.5s để người dùng thấy toast
                                setTimeout(() => {
                                    window.location.href = 'dangnhap.html';
                                }, 1500);
                            } else {
                                // Người dùng không muốn đăng nhập, kích hoạt lại nút
                                registerButton.disabled = false;
                                registerButton.textContent = 'Đăng ký';
                                if (emailInput) emailInput.focus();
                            }
                        } else {
                            // Lỗi khác
                            showError(data.message || 'Có lỗi xảy ra!');
                            registerButton.disabled = false;
                            registerButton.textContent = 'Đăng ký';
                        }
                    } else if (data) {
                        console.log(data);
                    }
                })
                .catch(error => {
                    console.error('Lỗi:', error);
                    showError('Có lỗi xảy ra. Vui lòng thử lại!');
                    // Re-enable button khi có exception
                    registerButton.disabled = false;
                    registerButton.textContent = 'Đăng ký';
                });
            });
        }

        // Cho phép nhấn Enter để chuyển field
        if (nameInput) {
            nameInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    emailInput.focus();
                }
            });
        }

        if (emailInput) {
            emailInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    passwordInput.focus();
                }
            });
        }

        if (passwordInput) {
            passwordInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    confirmPasswordInput.focus();
                }
            });
        }

        if (confirmPasswordInput) {
            confirmPasswordInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    registerButton.click();
                }
            });
        }
    });

    // Hàm validate email
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    // Kiểm tra và điền email từ session
    function checkAndFillEmail() {
        // Gọi PHP để lấy email từ session
        fetch('../process/get-register-email.php', {
            method: 'GET',
            cache: 'no-cache'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success && data.email) {
                // Hiển thị thông báo info
                showInfo('Email "' + data.email + '" chưa có trong hệ thống. Vui lòng đăng ký tài khoản mới.');
                
                // Điền email vào form
                if (emailInput) {
                    emailInput.value = data.email;
                    emailInput.readOnly = true;
                    emailInput.style.background = '#f0f0f0';
                }
                // Focus vào tên
                if (nameInput) {
                    nameInput.focus();
                }
            }
        })
        .catch(error => {
            console.error('Lỗi khi lấy email:', error);
        });
    }

    // Hiển thị modal Điều khoản dịch vụ
    function showTermsModal() {
        alert('ĐIỀU KHOẢN DỊCH VỤ\n\n' +
              '1. Chấp nhận điều khoản\n' +
              'Bằng việc sử dụng dịch vụ VOCAB, bạn đồng ý với các điều khoản này.\n\n' +
              '2. Tài khoản người dùng\n' +
              'Bạn chịu trách nhiệm bảo mật thông tin tài khoản của mình.\n\n' +
              '3. Sử dụng dịch vụ\n' +
              'Bạn cam kết sử dụng dịch vụ đúng mục đích học tập.\n\n' +
              '4. Quyền sở hữu trí tuệ\n' +
              'Mọi nội dung trên VOCAB đều thuộc quyền sở hữu của chúng tôi.\n\n' +
              'Trang chi tiết đang được phát triển.');
    }

    // Hiển thị modal Chính sách bảo mật
    function showPrivacyModal() {
        alert('CHÍNH SÁCH BẢO MẬT\n\n' +
              '1. Thu thập thông tin\n' +
              'Chúng tôi thu thập email, tên và thông tin học tập của bạn.\n\n' +
              '2. Sử dụng thông tin\n' +
              'Thông tin được sử dụng để cải thiện trải nghiệm học tập.\n\n' +
              '3. Bảo mật dữ liệu\n' +
              'Chúng tôi cam kết bảo vệ thông tin cá nhân của bạn.\n\n' +
              '4. Chia sẻ thông tin\n' +
              'Chúng tôi không chia sẻ thông tin của bạn với bên thứ ba.\n\n' +
              '5. Quyền của người dùng\n' +
              'Bạn có quyền yêu cầu xóa hoặc chỉnh sửa thông tin cá nhân.\n\n' +
              'Trang chi tiết đang được phát triển.');
    }

    // Hàm kiểm tra flash message từ server
    async function checkFlashMessage() {
        try {
            const response = await fetch('../api/get-flash-message.php');
            const result = await response.json();
            
            if (result.success && result.message) {
                // Map type từ PHP sang toast type
                let toastType = 'info';
                if (result.type === 'error') toastType = 'error';
                else if (result.type === 'success') toastType = 'success';
                else if (result.type === 'warning') toastType = 'warning';
                
                // Hiển thị toast
                if (typeof showToast === 'function') {
                    showToast(result.message, toastType);
                } else {
                    // Fallback nếu chưa có toast-message.js
                    alert(result.message);
                }
            }
        } catch (error) {
            console.error('Error checking flash message:', error);
        }
    }

})();
