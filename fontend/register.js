function renderRegisterPage() {
    document.body.className = 'auth-bg'; // Bật nền gradient

    document.getElementById('app').innerHTML = `
        <div class="container d-flex justify-content-center align-items-center" style="min-height: 100vh;">
            <div class="card auth-card p-4 p-md-5" style="width: 100%; max-width: 450px;">
                <div class="text-center mb-4">
                    <i class="fa-solid fa-user-plus text-success display-4 mb-3"></i>
                    <h3 class="fw-bold text-dark">Tạo Tài Khoản</h3>
                    <p class="text-muted">Tham gia cùng chúng tôi ngay hôm nay</p>
                </div>
                
                <div class="form-floating mb-3">
                    <input type="text" class="form-control rounded-pill" id="reg-fullname" placeholder="Họ tên">
                    <label><i class="fa-solid fa-id-card me-2"></i>Họ và tên</label>
                </div>

                <div class="form-floating mb-3">
                    <input type="text" class="form-control rounded-pill" id="reg-user" placeholder="User">
                    <label><i class="fa-solid fa-user me-2"></i>Tên đăng nhập</label>
                </div>

                <div class="form-floating mb-4">
                    <input type="password" class="form-control rounded-pill" id="reg-pass" placeholder="Pass">
                    <label><i class="fa-solid fa-lock me-2"></i>Mật khẩu</label>
                </div>

                <button class="btn btn-success w-100 rounded-pill py-3 fw-bold shadow-sm" onclick="handleRegister()">
                    ĐĂNG KÝ NGAY
                </button>
                
                <button class="btn btn-link text-decoration-none w-100 mt-2 text-muted" onclick="navigate('login')">
                    <i class="fa-solid fa-arrow-left me-1"></i> Quay lại Đăng nhập
                </button>
            </div>
        </div>
    `;
}

async function handleRegister() {
    const fullName = document.getElementById('reg-fullname').value;
    const username = document.getElementById('reg-user').value;
    const password = document.getElementById('reg-pass').value;

    if (!fullName || !username || !password) {
        showAlert("Vui lòng nhập đầy đủ thông tin!", "warning");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullName, username, password })
        });
        const data = await res.json();

        if (res.ok) {
            Swal.fire({
                icon: 'success',
                title: 'Đăng ký thành công!',
                text: 'Bạn có thể đăng nhập ngay bây giờ.',
            }).then(() => {
                navigate('login');
            });
        } else {
            showAlert(data.message, "error");
        }
    } catch (err) {
        showAlert('Lỗi kết nối Server!', "error");
    }
}