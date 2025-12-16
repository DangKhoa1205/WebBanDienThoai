function renderLoginPage() {
    // Thêm class auth-bg để có màu nền gradient
    document.body.className = 'auth-bg'; 

    document.getElementById('app').innerHTML = `
        <div class="container d-flex justify-content-center align-items-center" style="min-height: 100vh;">
            <div class="card auth-card p-4 p-md-5" style="width: 100%; max-width: 450px;">
                <div class="text-center mb-4">
                    <i class="fa-solid fa-user-circle text-primary display-4 mb-3"></i>
                    <h3 class="fw-bold text-dark">Chào Mừng Trở Lại!</h3>
                    <p class="text-muted">Vui lòng đăng nhập để tiếp tục</p>
                </div>
                
                <div class="form-floating mb-3">
                    <input type="text" class="form-control rounded-pill" id="login-user" placeholder="Tên đăng nhập">
                    <label for="login-user"><i class="fa-solid fa-user me-2"></i>Tên đăng nhập</label>
                </div>

                <div class="form-floating mb-4">
                    <input type="password" class="form-control rounded-pill" id="login-pass" placeholder="Mật khẩu">
                    <label for="login-pass"><i class="fa-solid fa-lock me-2"></i>Mật khẩu</label>
                </div>
                
                <button class="btn btn-primary w-100 rounded-pill py-3 fw-bold shadow-sm" onclick="handleLogin()">
                    ĐĂNG NHẬP <i class="fa-solid fa-arrow-right ms-2"></i>
                </button>
                
                <button class="btn btn-link text-decoration-none w-100 mt-2 text-muted" onclick="navigate('home')">
                    <i class="fa-solid fa-house me-1"></i> Về Trang chủ
                </button>

                <div class="mt-4 text-center border-top pt-3">
                    <span class="text-muted">Chưa có tài khoản? </span>
                    <span class="text-primary fw-bold cursor-pointer" onclick="navigate('register')">
                        Đăng ký ngay
                    </span>
                </div>
            </div>
        </div>
    `;
}

async function handleLogin() {
    const username = document.getElementById('login-user').value;
    const password = document.getElementById('login-pass').value;

    if (!username || !password) {
        showAlert("Vui lòng nhập đầy đủ thông tin!", "warning"); // Dùng warning màu vàng
        return;
    }

    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (res.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('username', data.username);
            localStorage.setItem('role', data.role);
            localStorage.setItem('fullName', data.fullName || data.username);
            
            // Reset màu nền body khi đăng nhập xong
            document.body.className = ''; 
            
            // Thông báo thành công
            Swal.fire({
                icon: 'success',
                title: 'Tuyệt vời!',
                text: `Xin chào ${data.fullName}`,
                timer: 1500, // Tự tắt sau 1.5s
                showConfirmButton: false
            }).then(() => {
                navigate('home');
            });
            
        } else {
            showAlert(data.message, "error"); // Dùng error màu đỏ
        }
    } catch (err) {
        showAlert('Không thể kết nối đến Server!', "error");
    }
}