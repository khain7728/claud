/**
 * QUÊN MẬT KHẨU - MODAL HANDLER
 * Xử lý 3 bước: Nhập email → Nhập code → Đổi password
 */

// console.log('forgot-password-modal.js loaded');

document.addEventListener('DOMContentLoaded', function() {
    // console.log('DOMContentLoaded - Initializing modal...');
    
    // Elements
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    const modalOverlay = document.getElementById('modalOverlay');
    const modal = document.getElementById('forgotPasswordModal');
    const closeModalBtn = document.getElementById('closeModal');
    
    // console.log('Modal elements:', {
    //     forgotPasswordLink,
    //     modalOverlay,
    //     modal,
    //     closeModalBtn
    // });
    
    // Steps
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    const step3 = document.getElementById('step3');
    
    // Inputs
    const resetEmail = document.getElementById('resetEmail');
    const resetEmail2 = document.getElementById('resetEmail2');
    const resetCode = document.getElementById('resetCode');
    const newPassword = document.getElementById('newPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    
    // Buttons
    const sendCodeBtn = document.getElementById('sendCodeBtn');
    const verifyCodeBtn = document.getElementById('verifyCodeBtn');
    const resetPasswordBtn = document.getElementById('resetPasswordBtn');
    const backToStep1Btn = document.getElementById('backToStep1');
    
    // Alerts
    const alertStep1 = document.getElementById('alertStep1');
    const alertStep2 = document.getElementById('alertStep2');
    const alertStep3 = document.getElementById('alertStep3');
    
    // ========================================
    // MODAL CONTROLS
    // ========================================
    
    // Mở modal
    forgotPasswordLink.addEventListener('click', function(e) {
        e.preventDefault();
        // console.log('Forgot password link clicked!');
        openModal();
    });
    
    // Đóng modal
    closeModalBtn.addEventListener('click', function() {
        // console.log('Close button clicked!');
        closeModal();
    });
    
    modalOverlay.addEventListener('click', function() {
        // console.log('Overlay clicked!');
        closeModal();
    });
    
    function openModal() {
        // console.log('Opening modal...');
        modalOverlay.classList.add('active');
        modal.classList.add('active');
        resetToStep1();
    }
    
    function closeModal() {
        // console.log('Closing modal...');
        modalOverlay.classList.remove('active');
        modal.classList.remove('active');
        resetToStep1();
    }
    
    // ========================================
    // NAVIGATION BETWEEN STEPS
    // ========================================
    
    function showStep(stepNumber) {
        step1.classList.remove('active');
        step2.classList.remove('active');
        step3.classList.remove('active');
        
        if (stepNumber === 1) {
            step1.classList.add('active');
        } else if (stepNumber === 2) {
            step2.classList.add('active');
        } else if (stepNumber === 3) {
            step3.classList.add('active');
        }
    }
    
    function resetToStep1() {
        showStep(1);
        resetEmail.value = '';
        resetEmail2.value = '';
        resetCode.value = '';
        newPassword.value = '';
        confirmPassword.value = '';
        alertStep1.innerHTML = '';
        alertStep2.innerHTML = '';
        alertStep3.innerHTML = '';
    }
    
    backToStep1Btn.addEventListener('click', resetToStep1);
    
    // ========================================
    // ALERT HELPERS
    // ========================================
    
    function showAlert(container, message, type = 'error') {
        container.innerHTML = `<div class="modal-alert ${type}">${message}</div>`;
    }
    
    function clearAlert(container) {
        container.innerHTML = '';
    }
    
    // ========================================
    // BƯỚC 1: GỬI CODE VỀ EMAIL
    // ========================================
    
    sendCodeBtn.addEventListener('click', async function() {
        const email = resetEmail.value.trim();
        
        // Validate
        if (!email) {
            showAlert(alertStep1, 'Vui lòng nhập email.');
            return;
        }
        
        if (!validateEmail(email)) {
            showAlert(alertStep1, 'Email không hợp lệ.');
            return;
        }
        
        // Disable button
        sendCodeBtn.disabled = true;
        sendCodeBtn.innerHTML = '<span class="modal-loading"></span>Đang gửi...';
        clearAlert(alertStep1);
        
        try {
            const response = await fetch('../api/send-reset-code.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Chuyển sang bước 2
                resetEmail2.value = email;
                showStep(2);
                
                // Hiển thị code để test (XÓA KHI PRODUCTION)
                // if (data.debug_code) {
                //     showAlert(alertStep2, `Mã code của bạn là: <strong>${data.debug_code}</strong> (Chỉ hiển thị khi testing)`, 'info');
                // }
            } else {
                showAlert(alertStep1, data.message, 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showAlert(alertStep1, 'Có lỗi xảy ra. Vui lòng thử lại.', 'error');
        } finally {
            sendCodeBtn.disabled = false;
            sendCodeBtn.innerHTML = 'Gửi';
        }
    });
    
    // ========================================
    // BƯỚC 2: VERIFY CODE
    // ========================================
    
    verifyCodeBtn.addEventListener('click', async function() {
        const email = resetEmail2.value.trim();
        const code = resetCode.value.trim();
        
        // Validate
        if (!code) {
            showAlert(alertStep2, 'Vui lòng nhập mã code.');
            return;
        }
        
        if (code.length !== 6 || !/^\d{6}$/.test(code)) {
            showAlert(alertStep2, 'Mã code phải là 6 chữ số.');
            return;
        }
        
        // Disable button
        verifyCodeBtn.disabled = true;
        verifyCodeBtn.innerHTML = '<span class="modal-loading"></span>Đang xác thực...';
        clearAlert(alertStep2);
        
        try {
            const response = await fetch('../api/verify-reset-code.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, code })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Chuyển sang bước 3
                showStep(3);
            } else {
                showAlert(alertStep2, data.message, 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showAlert(alertStep2, 'Có lỗi xảy ra. Vui lòng thử lại.', 'error');
        } finally {
            verifyCodeBtn.disabled = false;
            verifyCodeBtn.innerHTML = 'Gửi';
        }
    });
    
    // ========================================
    // BƯỚC 3: ĐẶT LẠI MẬT KHẨU
    // ========================================
    
    resetPasswordBtn.addEventListener('click', async function(e) {
        // Ngăn không cho submit nhiều lần
        if (resetPasswordBtn.disabled) {
            // console.log('Button đã disabled, bỏ qua click');
            return;
        }
        
        // console.log('Reset password button clicked');
        
        const password = newPassword.value;
        const confirm = confirmPassword.value;
        
        // console.log('Password validation:', {   
        //     hasPassword: !!password,
        //     hasConfirm: !!confirm,
        //     length: password.length,
        //     match: password === confirm
        // });
        
        // Validate
        if (!password || !confirm) {
            showAlert(alertStep3, 'Vui lòng nhập đầy đủ thông tin.');
            return;
        }
        
        if (password.length < 8) {
            showAlert(alertStep3, 'Mật khẩu phải có ít nhất 8 ký tự.');
            return;
        }
        
        if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
            showAlert(alertStep3, 'Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số.');
            return;
        }
        
        if (password !== confirm) {
            showAlert(alertStep3, 'Mật khẩu xác nhận không khớp.');
            return;
        }
        
        // Disable button ngay lập tức
        // console.log('Disabling button...');
        resetPasswordBtn.disabled = true;
        resetPasswordBtn.innerHTML = '<span class="modal-loading"></span>Đang cập nhật...';
        clearAlert(alertStep3);
        
        try {
            // console.log('Sending request to reset-password.php...');
            const startTime = performance.now();
            
            const response = await fetch('../api/reset-password.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    password, 
                    confirm_password: confirm 
                })
            });
            
            const endTime = performance.now();
            // console.log(`API response time: ${endTime - startTime}ms`);
            
            const data = await response.json();
            // console.log('API response:', data);
            
            if (data.success) {
                // Thành công - hiển thị thông báo và đóng modal
                showAlert(alertStep3, data.message, 'success');
                
                setTimeout(() => {
                    closeModal();
                    alert('Đặt lại mật khẩu thành công! Bạn có thể đăng nhập với mật khẩu mới.');
                }, 1500);
            } else {
                showAlert(alertStep3, data.message, 'error');
                // Re-enable button khi có lỗi
                resetPasswordBtn.disabled = false;
                resetPasswordBtn.innerHTML = 'Đặt lại mật khẩu';
            }
        } catch (error) {
            console.error('Error:', error);
            showAlert(alertStep3, 'Có lỗi xảy ra. Vui lòng thử lại.', 'error');
            // Re-enable button khi có exception
            resetPasswordBtn.disabled = false;
            resetPasswordBtn.innerHTML = 'Đặt lại mật khẩu';
        }
    });
    
    // ========================================
    // HELPERS
    // ========================================
    
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    // Auto-focus và chỉ cho phép nhập số cho code input
    resetCode.addEventListener('input', function(e) {
        this.value = this.value.replace(/\D/g, ''); // Chỉ cho phép số
    });
    
    // Enter key handlers
    resetEmail.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') sendCodeBtn.click();
    });
    
    resetCode.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') verifyCodeBtn.click();
    });
    
    confirmPassword.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') resetPasswordBtn.click();
    });
});
