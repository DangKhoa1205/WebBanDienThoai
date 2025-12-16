const API_URL = 'http://localhost:3000/api/products'; // Đường dẫn Backend

// 1. Hàm lấy sản phẩm và hiển thị theo chuẩn Bootstrap
async function fetchProducts() {
    try {
        const response = await fetch(API_URL);
        const products = await response.json();
        
        const container = document.getElementById('products');
        container.innerHTML = '';

        products.forEach(p => {
            // Nếu không có ảnh thì dùng ảnh mẫu
            const imageShow = p.image_url || 'https://via.placeholder.com/300x300?text=No+Image';
            
            // --- ĐOẠN NAY KHÁC BIỆT: Dùng class của Bootstrap (col-md, card, btn...) ---
            const html = `
                <div class="col-6 col-md-4 col-lg-3">
                    <div class="card h-100 shadow-sm">
                        <img src="${imageShow}" class="card-img-top" alt="${p.name}">
                        <div class="card-body d-flex flex-column">
                            <h5 class="card-title text-truncate" title="${p.name}">${p.name}</h5>
                            <p class="card-text text-muted small mb-2">${p.brand}</p>
                            
                            <div class="mt-auto">
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <span class="price-tag">${parseInt(p.price).toLocaleString()}đ</span>
                                </div>
                                <button onclick="buyNow(${p.id})" class="btn btn-primary w-100 fw-bold">
                                    <i class="fa-solid fa-cart-plus me-2"></i>Đặt Mua
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            container.innerHTML += html;
        });
    } catch (err) {
        console.error("Lỗi tải dữ liệu:", err);
        document.getElementById('products').innerHTML = '<p class="text-center text-danger">Không thể kết nối Server! Hãy kiểm tra lại Backend.</p>';
    }
}

// 2. Hàm xử lý mua hàng (Tạm thời chỉ thông báo)
function buyNow(id) {
    // Kiểm tra xem đã đăng nhập chưa
    const username = localStorage.getItem('username');
    if (!username) {
        if(confirm("Bạn cần đăng nhập để mua hàng. Đi đến trang đăng nhập?")) {
            window.location.href = 'login.html';
        }
        return;
    }

    // Logic mua hàng sẽ viết sau (gọi API order)
    alert('Đã thêm sản phẩm ID: ' + id + ' vào giỏ hàng!');
}

// 3. Hàm kiểm tra đăng nhập (Cập nhật giao diện Navbar)
function checkLogin() {
    const username = localStorage.getItem('username');
    const userInfoDiv = document.getElementById('user-info');

    if (username) {
        // Nếu đã đăng nhập: Thay nút "Đăng nhập" bằng "Xin chào..." và nút Đăng xuất
        // Sử dụng class text-white để chữ màu trắng nổi trên nền xanh của Navbar
        userInfoDiv.innerHTML = `
            <span class="text-white me-2">Xin chào, <b>${username}</b></span>
            <button onclick="logout()" class="btn btn-outline-light btn-sm">Đăng xuất</button>
        `;
    }
}

// 4. Hàm đăng xuất
function logout() {
    if(confirm("Bạn có chắc muốn đăng xuất?")) {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        location.reload(); // Tải lại trang để cập nhật giao diện
    }
}

// --- KHỞI CHẠY KHI TẢI TRANG ---
fetchProducts();
checkLogin();