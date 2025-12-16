const app = document.getElementById('app');
let revenueChart = null;

// Đường dẫn Logo
const LOGO_URL = "images/logo.png"; 

// --- 1. ROUTER ---
function navigate(page, param = null) {
    app.innerHTML = '';
    const role = localStorage.getItem('role');
    window.scrollTo(0, 0);

    switch (page) {
        case 'home': 
            renderHomePage(param); // Truyền tham số lọc (VD: 'deals' hoặc 'Samsung')
            break;
        case 'login': renderLoginPage(); break;
        case 'register': renderRegisterPage(); break;
        case 'detail': renderProductDetailPage(param); break;
        case 'order-success': renderOrderSuccessPage(param); break;
        case 'my-orders': renderMyOrdersPage(); break;
        case 'admin':
            if (role === 'admin') renderAdminPage();
            else if (role === 'shipper') navigate('shipper-dashboard');
            else { showAlert("Bạn không có quyền!", "error"); navigate('home'); }
            break;
        case 'shipper-dashboard':
            if (role === 'shipper' || role === 'admin') renderShipperDashboard();
            else { showAlert("Bạn không phải Shipper!", "error"); navigate('home'); }
            break;
        default: renderHomePage();
    }
}

// --- 2. TRANG CHỦ ---
async function renderHomePage(filter = null) {
    const navbarHTML = `
        <nav class="navbar navbar-expand-lg navbar-light bg-white shadow-sm sticky-top">
            <div class="container">
                <a class="navbar-brand d-flex align-items-center gap-2 fw-bold text-primary" href="#" onclick="navigate('home')">
                    <img src="${LOGO_URL}" alt="Logo" width="60" height="60" onerror="this.src='./logoWebOceanMobiStore.png'">
                    OceanMobiStore
                </a>
                <button class="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                    <span class="navbar-toggler-icon"></span>
                </button>
                <div class="collapse navbar-collapse justify-content-end mt-2 mt-lg-0" id="navbarNav">
                    ${getAuthButtons()}
                </div>
            </div>
        </nav>
    `;

    const bannerHTML = `
        <div class="container mt-4">
            <div class="row align-items-center bg-white p-4 rounded-4 shadow-sm position-relative overflow-hidden" 
                 style="background: linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%);">
                <div class="col-md-7 py-3">
                    <!-- NÚT DEAL SỐC (ĐÃ CẬP NHẬT) -->
                    <button class="btn btn-light text-primary fw-bold mb-3 px-3 py-2 rounded-pill shadow-sm border-0" 
                            onclick="navigate('home', 'deals')">
                        🔥 Deal Sốc Hôm Nay
                    </button>
                    
                    <h1 class="display-4 fw-bold mb-3 text-dark">Đại Dương <br><span class="text-primary">Công Nghệ</span></h1>
                    <p class="lead text-dark mb-4" style="opacity: 0.8">Khám phá thế giới smartphone với mức giá tốt nhất.</p>
                    
                    <!-- Nút Khám phá cũng trỏ về Deals -->
                    <button class="btn btn-ocean px-4 py-2 shadow" onclick="navigate('home', 'deals')">
                        Săn Deal Ngay <i class="fa-solid fa-bolt ms-1"></i>
                    </button>
                </div>
                <div class="col-md-5 text-center d-none d-md-block">
                    <img src="./logoWebOceanMobiStore.png" style="max-height: 330px; filter: drop-shadow(0 10px 15px rgba(0,0,0,0.2));">
                </div>
            </div>
        </div>
    `;

    // Xác định tiêu đề dựa trên bộ lọc
    let pageTitle = 'Tất Cả Sản Phẩm';
    if (filter === 'deals') pageTitle = '🔥 Săn Deal Giá Sốc';
    else if (filter) pageTitle = `Điện thoại ${filter}`;

    app.innerHTML = `
        ${navbarHTML}
        ${bannerHTML}

        <div class="container py-5" id="product-section">
            <div class="d-flex justify-content-between align-items-end mb-3">
                <h3 class="fw-bold m-0 text-primary border-start border-4 border-primary ps-3">
                    ${pageTitle}
                </h3>
                <div class="d-none d-md-flex gap-2" id="brand-filter">Loading filter...</div>
            </div>
            
            <div class="d-flex d-md-none gap-2 overflow-auto pb-3 mb-3 no-scrollbar" id="brand-filter-mobile"></div>

            <div id="product-list" class="row g-3 g-md-4">
                <div class="col-12 text-center py-5"><div class="spinner-border text-primary"></div></div>
            </div>
        </div>
        
        ${getCheckoutModalHTML()}
        ${getFooterHTML()}
    `;

    renderBrandFilterAuto(filter);

    try {
        let url = `${API_URL}/products`;
        // Nếu lọc theo hãng (và không phải là 'deals'), thêm param vào URL
        if (filter && filter !== 'deals') url += `?brand=${filter}`;
        
        const res = await fetch(url);
        let products = await res.json();
        
        // LOGIC LỌC DEAL SỐC (Client-side)
        if (filter === 'deals') {
            // Chỉ lấy sản phẩm có discount > 0
            products = products.filter(p => p.discount && p.discount > 0);
        }

        if (products.length === 0) {
            document.getElementById('product-list').innerHTML = `
                <div class="col-12 text-center py-5">
                    <img src="https://cdn-icons-png.flaticon.com/512/7486/7486747.png" width="80" class="mb-3 opacity-50">
                    <h5 class="text-muted">Không tìm thấy sản phẩm nào.</h5>
                    ${filter === 'deals' ? '<p class="text-muted">Hiện tại chưa có chương trình khuyến mãi.</p>' : ''}
                    <button class="btn btn-outline-primary mt-2" onclick="navigate('home')">Xem tất cả</button>
                </div>`;
            return;
        }

        document.getElementById('product-list').innerHTML = products.map(p => `
            <div class="col-6 col-md-4 col-lg-3">
                <div class="product-card d-flex flex-column h-100">
                    <div class="product-img-wrapper cursor-pointer position-relative" onclick="navigate('detail', ${p.id})">
                        <img src="${p.image_url || 'https://via.placeholder.com/300'}" alt="${p.name}">
                        ${p.discount > 0 ? `<span class="badge-sale">-${p.discount}%</span>` : ''}
                    </div>
                    <div class="p-3 flex-grow-1 d-flex flex-column">
                        <div class="text-muted small text-uppercase fw-bold mb-1">${p.brand}</div>
                        <h6 class="fw-bold text-dark text-truncate cursor-pointer mb-2" title="${p.name}" onclick="navigate('detail', ${p.id})">
                            ${p.name}
                        </h6>
                        <div class="mt-auto">
                            <div class="mb-2">${getPriceHTML(p.price, p.discount)}</div>
                            <button class="btn btn-ocean w-100 btn-sm rounded-pill" 
                                onclick="openCheckout('${p.name}', ${getRealPrice(p.price, p.discount)})">
                                <i class="fa-solid fa-cart-plus me-1"></i> Thêm vào giỏ
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (e) {}
}

// --- 3. CHI TIẾT SẢN PHẨM ---
async function renderProductDetailPage(id) {
    app.innerHTML = `<div class="d-flex justify-content-center align-items-center vh-100"><div class="spinner-border text-primary"></div></div>`;
    try {
        const res = await fetch(`${API_URL}/products/${id}`);
        const p = await res.json();

        // Lấy review
        const reviewRes = await fetch(`${API_URL}/reviews/${id}`);
        const reviews = await reviewRes.json();
        const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : 0;
        
        // Reviews HTML
        const reviewsHTML = reviews.length > 0 ? reviews.map(r => `<div class="border-bottom pb-3 mb-3"><div class="d-flex justify-content-between align-items-center"><div class="fw-bold text-dark"><i class="fa-solid fa-user-circle me-1 text-secondary"></i> ${r.full_name}</div><small class="text-muted">${new Date(r.created_at).toLocaleDateString()}</small></div><div class="text-warning mb-1">${renderStars(r.rating)}</div><p class="text-secondary mb-0">${r.comment}</p></div>`).join('') : `<p class="text-center text-muted py-3">Chưa có đánh giá nào.</p>`;
        const reviewFormHTML = localStorage.getItem('token') ? `<div class="bg-light p-4 rounded-3 mt-4"><h6 class="fw-bold mb-3">Viết đánh giá</h6><input type="hidden" id="review-product-id" value="${p.id}"><div class="mb-3"><label class="form-label small fw-bold">Sao:</label><select class="form-select" id="review-rating"><option value="5">5 sao (Tuyệt vời)</option><option value="4">4 sao (Tốt)</option><option value="3">3 sao</option><option value="2">2 sao</option><option value="1">1 sao</option></select></div><div class="mb-3"><textarea class="form-control" id="review-comment" rows="3" placeholder="Nội dung..."></textarea></div><button class="btn btn-ocean btn-sm" onclick="submitReview()">Gửi</button></div>` : `<div class="alert alert-info mt-4"><a href="#" onclick="navigate('login')" class="fw-bold">Đăng nhập</a> để đánh giá.</div>`;

        app.innerHTML = `
            <nav class="navbar navbar-light bg-white shadow-sm mb-3"><div class="container"><button class="btn btn-light rounded-circle" onclick="navigate('home')"><i class="fa-solid fa-arrow-left"></i></button><span class="fw-bold text-primary d-flex align-items-center gap-2"><img src="${LOGO_URL}" width="30"> OceanMobiStore</span><div>${getAuthButtons()}</div></div></nav>
            <div class="container pb-5">
                <div class="row g-4 mb-5">
                    <div class="col-md-6"><div class="bg-white p-4 rounded-4 shadow-sm text-center position-relative">${p.discount > 0 ? `<span class="badge-sale fs-6 px-3 py-2">Giảm ${p.discount}%</span>` : ''}<img src="${p.image_url}" class="img-fluid" style="max-height: 350px;"></div></div>
                    <div class="col-md-6"><div class="bg-white p-4 rounded-4 shadow-sm h-100"><div class="d-flex justify-content-between align-items-start"><span class="badge bg-info text-dark mb-2">${p.brand}</span><span class="text-warning fw-bold"><i class="fa-solid fa-star"></i> ${avgRating}/5</span></div><h2 class="fw-bold mb-3">${p.name}</h2><div class="p-3 bg-light rounded-3 mb-3 border">${getPriceHTML(p.price, p.discount, true)}</div><p class="text-secondary mb-4 text-break" style="font-size: 0.95rem;">${p.description || '...'}</p><div class="d-grid gap-2"><button class="btn btn-ocean btn-lg shadow fw-bold" onclick="openCheckout('${p.name}', ${getRealPrice(p.price, p.discount)})">MUA NGAY VỚI GIÁ TỐT</button></div></div></div>
                </div>
                <div class="row justify-content-center"><div class="col-lg-8"><div class="bg-white p-4 rounded-4 shadow-sm"><h4 class="fw-bold text-primary border-bottom pb-3 mb-4"><i class="fa-solid fa-comments me-2"></i>Đánh giá (${reviews.length})</h4><div style="max-height: 400px; overflow-y: auto;" class="pe-2 custom-scrollbar">${reviewsHTML}</div>${reviewFormHTML}</div></div></div>
            </div>
            ${getCheckoutModalHTML()} ${getFooterHTML()}
        `;
    } catch (e) { navigate('home'); }
}

// --- 4. TRANG HÓA ĐƠN ---
function renderOrderSuccessPage(order) {
    if (!order) { navigate('home'); return; }
    app.innerHTML = `
        <div class="container d-flex justify-content-center align-items-center py-5" style="min-height: 90vh;">
            <div class="card shadow-lg border-0" style="width: 100%; max-width: 600px; border-radius: 16px;">
                <div class="card-header bg-success text-white text-center py-4" style="border-radius: 16px 16px 0 0;"><i class="fa-regular fa-circle-check fa-4x mb-3"></i><h2 class="fw-bold">Đặt Hàng Thành Công!</h2><p class="mb-0 opacity-75">Cảm ơn bạn đã tin tưởng OceanMobiStore</p></div>
                <div class="card-body p-4 p-md-5"><div class="text-center mb-4"><p class="text-muted mb-1">Mã đơn hàng</p><h3 class="text-primary fw-bold">#${order.id}</h3></div><div class="list-group mb-4 shadow-sm rounded-3 overflow-hidden border-0"><div class="list-group-item d-flex justify-content-between align-items-center bg-light"><span class="fw-bold text-secondary">Sản phẩm</span><span class="text-dark fw-bold text-end" style="max-width: 60%">${order.product_name}</span></div><div class="list-group-item d-flex justify-content-between align-items-center"><span class="text-secondary">Tổng thanh toán</span><span class="text-danger fw-bold fs-5">${parseInt(order.total_price).toLocaleString()}đ</span></div><div class="list-group-item"><span class="fw-bold d-block mb-2 text-secondary">Thông tin nhận hàng:</span><div class="ps-2 border-start border-3 border-primary"><div class="mb-1"><i class="fa-solid fa-user me-2 text-primary" style="width:20px"></i> ${order.full_name}</div><div class="mb-1"><i class="fa-solid fa-phone me-2 text-primary" style="width:20px"></i> ${order.phone}</div><div><i class="fa-solid fa-location-dot me-2 text-primary" style="width:20px"></i> ${order.address}</div></div></div></div><div class="text-center"><div class="d-grid gap-2"><button class="btn btn-ocean rounded-pill py-3 fw-bold shadow" onclick="navigate('my-orders')"><i class="fa-solid fa-list-check me-2"></i> Xem đơn hàng của tôi</button><button class="btn btn-light rounded-pill py-2 text-muted" onclick="navigate('home')">Về trang chủ</button></div></div></div>
            </div>
        </div>${getFooterHTML()}`;
}

// --- 5. ĐƠN HÀNG CỦA TÔI ---
async function renderMyOrdersPage() {
    app.innerHTML = `<nav class="navbar navbar-light bg-white shadow-sm mb-4"><div class="container"><button class="btn btn-light rounded-circle" onclick="navigate('home')"><i class="fa-solid fa-arrow-left"></i></button><span class="fw-bold fs-5">Đơn Hàng Của Tôi</span><div>${getAuthButtons()}</div></div></nav><div class="container pb-5" style="min-height: 80vh"><div id="my-orders-list"><div class="text-center py-5"><div class="spinner-border text-primary"></div></div></div></div>${getFooterHTML()}`;
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/my-orders`, { headers: { 'Authorization': token } });
        const orders = await res.json();
        if (orders.length === 0) { document.getElementById('my-orders-list').innerHTML = `<div class="text-center py-5"><img src="https://cdn-icons-png.flaticon.com/512/4076/4076432.png" width="100" class="mb-3 opacity-50"><h5 class="text-muted">Bạn chưa có đơn hàng nào</h5><button class="btn btn-ocean mt-3" onclick="navigate('home')">Mua sắm ngay</button></div>`; return; }
        document.getElementById('my-orders-list').innerHTML = orders.map(o => {
            let statusBadge='', statusText='';
            switch(o.status) { case 'pending': statusBadge='bg-warning text-dark'; statusText='⏳ Chờ xử lý'; break; case 'accepted': statusBadge='bg-info text-dark'; statusText='📦 Đã tiếp nhận'; break; case 'shipping': statusBadge='bg-primary'; statusText='🚚 Đã giao ĐVVC'; break; case 'delivering': statusBadge='bg-primary'; statusText='🛵 Shipper đang giao'; break; case 'delivered': statusBadge='bg-success'; statusText='✅ Đã giao thành công'; break; case 'cancelled': statusBadge='bg-danger'; statusText='❌ Đã hủy'; break; }
            return `<div class="card shadow-sm border-0 rounded-4 mb-3 overflow-hidden"><div class="card-header bg-white py-3 d-flex justify-content-between align-items-center border-bottom"><div><span class="fw-bold text-primary">#${o.id}</span><small class="text-muted ms-2">${new Date(o.created_at).toLocaleString()}</small></div><span class="badge ${statusBadge} rounded-pill">${statusText}</span></div><div class="card-body"><div class="row align-items-center"><div class="col-md-8"><h5 class="fw-bold mb-1">${o.product_name}</h5><p class="text-muted small mb-2"><i class="fa-solid fa-location-dot me-1"></i> ${o.address}</p></div><div class="col-md-4 text-md-end mt-3 mt-md-0"><div class="text-secondary small">Tổng tiền</div><div class="fs-4 fw-bold text-danger">${parseInt(o.total_price).toLocaleString()}đ</div></div></div></div><div class="card-footer bg-white border-0 pt-0 pb-3 text-end"><button class="btn btn-outline-primary btn-sm rounded-pill px-3" onclick="navigate('home')"><i class="fa-solid fa-rotate-right me-1"></i> Mua lại</button></div></div>`;
        }).join('');
    } catch (err) { document.getElementById('my-orders-list').innerHTML = `<div class="alert alert-danger text-center">Lỗi tải danh sách đơn hàng.</div>`; }
}

// --- 6. ADMIN ---
function renderAdminPage() {
    app.innerHTML = `
        <nav class="navbar navbar-dark bg-dark mb-4 shadow"><div class="container"><span class="navbar-brand fw-bold text-uppercase"><i class="fa-solid fa-user-shield me-2 text-info"></i>Quản Trị Viên</span><button class="btn btn-outline-light btn-sm rounded-pill px-3" onclick="navigate('home')"><i class="fa-solid fa-arrow-right-from-bracket me-1"></i> Thoát</button></div></nav>
        <div class="container" style="min-height: 80vh;"><ul class="nav nav-pills mb-4 bg-white p-2 rounded-pill shadow-sm d-inline-flex"><li class="nav-item"><button class="nav-link active" id="tab-products" onclick="switchTab('products')">📦 Kho Hàng</button></li><li class="nav-item"><button class="nav-link" id="tab-orders" onclick="switchTab('orders')">🚚 Đơn Hàng</button></li><li class="nav-item"><button class="nav-link" id="tab-stats" onclick="switchTab('stats')">📊 Doanh Thu</button></li><li class="nav-item"><button class="nav-link" id="tab-users" onclick="switchTab('users')">👥 Tài Khoản</button></li></ul><div id="admin-content" class="fade-in">Loading...</div></div>
        ${getProductModalHTML()} 
    `;
    loadAdminProducts(); 
}
window.switchTab = (tab) => { document.querySelectorAll('.nav-link').forEach(b => b.classList.remove('active')); document.getElementById(`tab-${tab}`).classList.add('active'); if (tab === 'products') loadAdminProducts(); else if (tab === 'orders') loadAdminOrders(); else if (tab === 'users') loadAdminUsers(); else loadAdminStats(); }

async function loadAdminProducts() {
    document.getElementById('admin-content').innerHTML = `<div class="d-flex justify-content-between align-items-center mb-3"><h5 class="text-primary fw-bold border-start border-4 border-primary ps-3 m-0">Danh sách sản phẩm</h5><button class="btn btn-ocean" onclick="openProductModal()"><i class="fa-solid fa-plus me-1"></i> Thêm SP Mới</button></div><div class="card shadow-sm border-0 rounded-4 overflow-hidden"><div class="table-responsive"><table class="table table-hover mb-0 align-middle"><thead class="table-light"><tr><th>ID</th><th>Ảnh</th><th>Tên</th><th>Giá</th><th>Kho</th><th class="text-end pe-4">Hành động</th></tr></thead><tbody id="product-table-body"></tbody></table></div></div>`;
    const res = await fetch(`${API_URL}/products`); const products = await res.json();
    document.getElementById('product-table-body').innerHTML = products.map(p => `<tr><td class="text-muted">#${p.id}</td><td><img src="${p.image_url}" width="45" height="45" class="rounded-3 border" style="object-fit:cover"></td><td class="fw-bold text-dark">${p.name}</td><td class="text-primary fw-bold">${parseInt(p.price).toLocaleString()}</td><td><span class="badge bg-light text-dark border">${p.stock}</span></td><td class="text-end pe-3"><button class="btn-icon edit" onclick="editProduct(${p.id})" title="Sửa"><i class="fa-solid fa-pen"></i></button><button class="btn-icon delete" onclick="deleteProduct(${p.id})" title="Xóa"><i class="fa-solid fa-trash"></i></button></td></tr>`).join('');
}
async function loadAdminOrders() {
    document.getElementById('admin-content').innerHTML = `<h5 class="text-primary fw-bold border-start border-4 border-primary ps-3 mb-3">Quản lý đơn hàng</h5><div class="card shadow border-0 rounded-4"><div class="table-responsive"><table class="table table-hover mb-0 align-middle"><thead class="table-light"><tr><th>Đơn</th><th>Khách/Địa chỉ</th><th>Sản phẩm</th><th>Tiền</th><th>Shipper/Hành động</th><th>Trạng thái</th></tr></thead><tbody id="order-table-body"><tr><td colspan="6" class="text-center p-3">Đang tải...</td></tr></tbody></table></div></div>`;
    try { const token = localStorage.getItem('token'); const shipperRes = await fetch(`${API_URL}/admin/shippers`, { headers: { 'Authorization': token } }); const shippers = await shipperRes.json(); const orderRes = await fetch(`${API_URL}/orders`, { headers: { 'Authorization': token } }); const orders = await orderRes.json();
        document.getElementById('order-table-body').innerHTML = orders.map(order => {
            const shipperOptions = shippers.map(s => `<option value="${s.id}" ${order.shipper_id === s.id ? 'selected' : ''}>${s.full_name}</option>`).join('');
            let actionHTML='', statusBadge='';
            if (order.status === 'pending') { statusBadge = '<span class="badge bg-warning text-dark">⏳ Chờ xử lý</span>'; actionHTML = `<button class="btn btn-primary btn-sm rounded-pill" onclick="updateOrderStatus(${order.id}, 'accepted')">Tiếp nhận</button>`; } 
            else if (order.status === 'accepted') { statusBadge = '<span class="badge bg-info text-dark">📦 Đã tiếp nhận</span>'; actionHTML = `<div class="d-flex gap-1"><select class="form-select form-select-sm" id="shipper-select-${order.id}" style="width: 120px;"><option value="">Chọn Shipper</option>${shipperOptions}</select><button class="btn btn-ocean btn-sm" onclick="assignShipper(${order.id}, document.getElementById('shipper-select-${order.id}').value)">Giao</button></div>`; } 
            else if (order.status === 'shipping') { statusBadge = '<span class="badge bg-primary">🚚 Đã giao ĐVVC</span>'; actionHTML = `<small class="text-muted">Chờ Shipper...</small>`; } 
            else if (order.status === 'delivering') { statusBadge = '<span class="badge bg-primary">🛵 Đang giao</span>'; actionHTML = `<small class="text-primary">Shipper đang đi...</small>`; } 
            else if (order.status === 'delivered') { statusBadge = '<span class="badge bg-success">✅ Thành công</span>'; actionHTML = `<i class="fa-solid fa-check text-success"></i>`; } 
            else { statusBadge = '<span class="badge bg-danger">❌ Đã hủy</span>'; actionHTML = `<span class="text-muted">Đã hủy</span>`; }
            const manualStatus = `<select class="form-select form-select-sm border-0 text-muted mt-1" style="font-size: 0.75rem; width: auto;" onchange="updateOrderStatus(${order.id}, this.value)"><option value="">(Sửa tay)</option><option value="pending">Chờ</option><option value="accepted">Tiếp nhận</option><option value="shipping">Giao ĐVVC</option><option value="delivered">Hoàn thành</option><option value="cancelled">Hủy</option></select>`;
            return `<tr><td class="fw-bold">#${order.id}</td><td><div class="fw-bold small">${order.full_name}</div><small class="text-muted" style="font-size:0.8rem">${order.address}</small></td><td class="text-wrap" style="max-width: 200px;">${order.product_name}</td><td class="text-danger fw-bold">${parseInt(order.total_price).toLocaleString()}</td><td>${actionHTML} ${manualStatus}</td><td>${statusBadge}</td></tr>`;
        }).join('');
    } catch (e) { console.error(e); }
}
async function loadAdminStats() {
    document.getElementById('admin-content').innerHTML = `<div class="row mb-4"><div class="col-md-6"><div class="card text-white bg-success mb-3 shadow border-0"><div class="card-body"><h5 class="card-title">Tổng Doanh Thu</h5><p class="card-text display-6 fw-bold" id="stat-revenue">Loading...</p></div></div></div><div class="col-md-6"><div class="card text-white bg-primary mb-3 shadow border-0"><div class="card-body"><h5 class="card-title">Tổng Đơn Hàng</h5><p class="card-text display-6 fw-bold" id="stat-orders">Loading...</p></div></div></div></div><div class="card shadow border-0"><div class="card-body"><h5 class="text-primary fw-bold mb-4">Biểu Đồ Doanh Thu</h5><canvas id="revenueChart" style="max-height: 400px;"></canvas></div></div>`;
    try { const token = localStorage.getItem('token'); const res = await fetch(`${API_URL}/stats`, { headers: { 'Authorization': token } }); const data = await res.json(); document.getElementById('stat-revenue').innerText = parseInt(data.totalRevenue).toLocaleString() + 'đ'; document.getElementById('stat-orders').innerText = data.totalOrders + ' đơn'; const ctx = document.getElementById('revenueChart').getContext('2d'); if (revenueChart) revenueChart.destroy(); revenueChart = new Chart(ctx, { type: 'bar', data: { labels: data.chartData.map(i=>i.month), datasets: [{ label: 'Doanh thu', data: data.chartData.map(i=>i.revenue), backgroundColor: 'rgba(13, 202, 240, 0.6)' }] } }); } catch (e) {}
}
async function loadAdminUsers() {
    document.getElementById('admin-content').innerHTML = `<h5 class="text-primary fw-bold border-start border-4 border-primary ps-3 mb-3">Danh sách tài khoản</h5><div class="card shadow border-0 rounded-4"><div class="table-responsive"><table class="table table-hover mb-0 align-middle"><thead class="table-light"><tr><th>ID</th><th>Tên đăng nhập</th><th>Họ tên</th><th>Vai trò</th></tr></thead><tbody id="user-table-body"><tr><td colspan="4" class="text-center p-3">Đang tải...</td></tr></tbody></table></div></div>`;
    try { const token = localStorage.getItem('token'); const res = await fetch(`${API_URL}/admin/users`, { headers: { 'Authorization': token } }); const users = await res.json(); document.getElementById('user-table-body').innerHTML = users.map(u => {
        const roleSelect = `<select class="form-select form-select-sm fw-bold ${u.role==='admin'?'text-danger':(u.role==='shipper'?'text-primary':'text-dark')}" style="width: 150px" onchange="changeUserRole(${u.id}, this.value)"><option value="user" ${u.role==='user'?'selected':''}>User</option><option value="shipper" ${u.role==='shipper'?'selected':''}>Shipper</option><option value="admin" ${u.role==='admin'?'selected':''}>Admin</option></select>`;
        return `<tr><td class="text-muted">#${u.id}</td><td class="fw-bold">${u.username}</td><td>${u.full_name||'---'}</td><td>${roleSelect}</td></tr>`;
    }).join(''); } catch (e) { showAlert("Lỗi tải user", "error"); }
}

// --- 7. SHIPPER ---
async function renderShipperDashboard() {
    app.innerHTML = `<nav class="navbar navbar-dark bg-primary mb-4 shadow"><div class="container"><span class="navbar-brand fw-bold"><i class="fa-solid fa-truck-fast me-2"></i>Kênh Shipper</span><div class="d-flex gap-3 align-items-center"><span class="text-white fw-bold d-none d-md-block">Xin chào, ${localStorage.getItem('fullName')}</span><button class="btn btn-light btn-sm rounded-pill px-3 text-primary fw-bold" onclick="handleLogout()">Đăng xuất</button></div></div></nav><div class="container pb-5"><div class="d-flex justify-content-between align-items-center mb-3"><h4 class="text-primary fw-bold">Đơn hàng cần giao</h4><button class="btn btn-outline-primary btn-sm rounded-pill" onclick="renderShipperDashboard()"><i class="fa-solid fa-rotate"></i> Làm mới</button></div><div id="shipper-orders-list"><div class="text-center py-5"><div class="spinner-border text-primary"></div></div></div></div>`;
    try { const token = localStorage.getItem('token'); const res = await fetch(`${API_URL}/shipper/orders`, { headers: { 'Authorization': token } }); const orders = await res.json(); if(orders.length === 0) { document.getElementById('shipper-orders-list').innerHTML = `<div class="text-center text-muted py-5"><i class="fa-solid fa-box-open fa-3x mb-3"></i><br>Chưa có đơn hàng.</div>`; return; }
        document.getElementById('shipper-orders-list').innerHTML = orders.map(order => {
            let actionButtons = ''; if (order.status === 'shipping') { actionButtons = `<button class="btn btn-warning w-100 mb-2 fw-bold text-dark" onclick="shipperUpdateStatus(${order.id}, 'delivering')"><i class="fa-solid fa-motorcycle me-1"></i> Bắt đầu giao</button>`; } else if (order.status === 'delivering') { actionButtons = `<div class="alert alert-info p-2 small text-center mb-2">Đang giao...</div><button class="btn btn-success w-100 mb-2 fw-bold" onclick="shipperUpdateStatus(${order.id}, 'delivered')"><i class="fa-solid fa-check me-1"></i> Thành Công</button><button class="btn btn-outline-danger w-100 btn-sm" onclick="shipperUpdateStatus(${order.id}, 'cancelled')">Thất Bại</button>`; } else if (order.status === 'delivered') { actionButtons = `<div class="alert alert-success text-center p-2 mb-0">Đã hoàn thành</div>`; } else { actionButtons = `<div class="alert alert-danger text-center p-2 mb-0">Đã hủy</div>`; }
            return `<div class="card shadow-sm border-0 rounded-4 mb-3 overflow-hidden"><div class="card-body"><div class="row"><div class="col-md-8 border-end-md"><div class="d-flex justify-content-between mb-2"><span class="badge bg-primary">Đơn #${order.id}</span><span class="fw-bold text-danger">${parseInt(order.total_price).toLocaleString()}đ</span></div><h5 class="fw-bold mb-2">${order.full_name}</h5><p class="mb-1"><i class="fa-solid fa-phone text-primary me-2"></i> <a href="tel:${order.phone}" class="text-decoration-none fw-bold fs-5">${order.phone}</a></p><p class="mb-1 text-break"><i class="fa-solid fa-location-dot text-primary me-2"></i> ${order.address}</p><p class="text-muted small mt-2 border-top pt-2">Sản phẩm: ${order.product_name}</p></div><div class="col-md-4 d-flex flex-column justify-content-center pt-3 pt-md-0">${actionButtons}</div></div></div></div>`;
        }).join('');
    } catch (e) { document.getElementById('shipper-orders-list').innerHTML = `<div class="alert alert-danger">Lỗi tải dữ liệu</div>`; }
}

// --- 8. LOGIC ---
window.assignShipper = async (orderId, shipperId) => { if (!shipperId) return; const token = localStorage.getItem('token'); const res = await fetch(`${API_URL}/admin/assign-order/${orderId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': token }, body: JSON.stringify({ shipperId }) }); if(res.ok) { Swal.fire({ icon: 'success', title: 'Đã gán Shipper', timer: 1500, showConfirmButton: false }); loadAdminOrders(); } else { showAlert("Lỗi gán đơn", "error"); } }
window.updateOrderStatus = async (id, status) => { if(!status) return; const token = localStorage.getItem('token'); await fetch(`${API_URL}/orders/${id}`, { method: 'PUT', headers: {'Content-Type':'application/json','Authorization':token}, body: JSON.stringify({status}) }); loadAdminOrders(); }
window.shipperUpdateStatus = async (orderId, status) => { if (await showConfirm("Xác nhận", "Cập nhật trạng thái?")) { const token = localStorage.getItem('token'); const res = await fetch(`${API_URL}/shipper/update-status/${orderId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': token }, body: JSON.stringify({ status }) }); if(res.ok) { Swal.fire("Thành công", "", "success"); renderShipperDashboard(); } else { showAlert("Lỗi", "error"); } } }
window.changeUserRole = async (userId, newRole) => { if(await showConfirm("Xác nhận đổi quyền?", `Thành ${newRole}?`)) { const token = localStorage.getItem('token'); const res = await fetch(`${API_URL}/admin/users/${userId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': token }, body: JSON.stringify({ role: newRole }) }); if (res.ok) { Swal.fire({ icon: 'success', title: 'Cập nhật thành công!' }); loadAdminUsers(); } else { showAlert("Lỗi", "error"); } } else { loadAdminUsers(); } }

async function renderBrandFilterAuto(selectedBrand) { try { const res = await fetch(`${API_URL}/products`); const products = await res.json(); const brands = [...new Set(products.map(p => p.brand))].sort(); const html = `<button class="filter-btn ${selectedBrand === null ? 'active' : ''}" onclick="navigate('home')">Tất cả</button> <button class="filter-btn ${selectedBrand === 'deals' ? 'active' : ''}" onclick="navigate('home', 'deals')">🔥 Săn Deal</button> ${brands.map(brand => `<button class="filter-btn ${selectedBrand === brand ? 'active' : ''}" onclick="filterBrand('${brand}')">${brand}</button>`).join('')}`; if(document.getElementById('brand-filter')) document.getElementById('brand-filter').innerHTML = html; if(document.getElementById('brand-filter-mobile')) document.getElementById('brand-filter-mobile').innerHTML = html; } catch (e) {} }
window.filterBrand = (b) => { renderHomePage(b); }
window.openProductModal = () => { document.getElementById('p-id').value = ''; ['p-name','p-brand','p-price','p-image','p-stock','p-desc','p-discount'].forEach(i => document.getElementById(i).value = ''); document.getElementById('p-discount').value = 0; new bootstrap.Modal(document.getElementById('adminModal')).show(); }
window.editProduct = async (id) => { const res = await fetch(`${API_URL}/products/${id}`); const p = await res.json(); document.getElementById('p-id').value = p.id; document.getElementById('p-name').value = p.name; document.getElementById('p-brand').value = p.brand; document.getElementById('p-price').value = p.price; document.getElementById('p-image').value = p.image_url; document.getElementById('p-stock').value = p.stock; document.getElementById('p-desc').value = p.description; document.getElementById('p-discount').value = p.discount || 0; new bootstrap.Modal(document.getElementById('adminModal')).show(); }
window.saveProduct = async () => { const id = document.getElementById('p-id').value; const data = { name: document.getElementById('p-name').value, brand: document.getElementById('p-brand').value, price: document.getElementById('p-price').value, image_url: document.getElementById('p-image').value, stock: document.getElementById('p-stock').value, description: document.getElementById('p-desc').value, discount: document.getElementById('p-discount').value }; const token = localStorage.getItem('token'); await fetch(id ? `${API_URL}/products/${id}` : `${API_URL}/products`, { method: id ? 'PUT' : 'POST', headers: {'Content-Type':'application/json','Authorization':token}, body: JSON.stringify(data) }); bootstrap.Modal.getInstance(document.getElementById('adminModal')).hide(); loadAdminProducts(); renderHomePage(); }
window.deleteProduct = async (id) => { if(await showConfirm("Xóa?", "Mất vĩnh viễn!")) { const token = localStorage.getItem('token'); await fetch(`${API_URL}/products/${id}`, { method: 'DELETE', headers: {'Authorization': token} }); loadAdminProducts(); } }
window.openCheckout = (name, price) => { if (!localStorage.getItem('token')) { showAlert("Vui lòng đăng nhập!", "warning"); return; } document.getElementById('buy-product-name').value = name; document.getElementById('buy-product-price-raw').value = price; document.getElementById('show-product-name').innerText = name; document.getElementById('show-product-price').innerText = parseInt(price).toLocaleString() + 'đ'; document.getElementById('buy-fullname').value = localStorage.getItem('fullName') || ''; document.getElementById('buy-address').value = ''; calculateShip(); new bootstrap.Modal(document.getElementById('checkoutModal')).show(); }
window.calculateShip = () => { const addr = document.getElementById('buy-address').value.toLowerCase(); const priceRaw = parseInt(document.getElementById('buy-product-price-raw').value); let shippingFee = (addr.includes('hcm') || addr.includes('hồ chí minh') || addr.includes('sài gòn')) ? 0 : 30000; document.getElementById('show-shipping-fee').innerText = shippingFee === 0 ? 'Miễn phí vận chuyển' : '30.000đ'; document.getElementById('show-shipping-fee').className = shippingFee === 0 ? 'fw-bold text-success' : 'fw-bold text-muted'; document.getElementById('show-final-total').innerText = (priceRaw + shippingFee).toLocaleString() + 'đ'; }
window.submitOrder = async () => { const data = { productName: document.getElementById('buy-product-name').value, price: document.getElementById('buy-product-price-raw').value, fullName: document.getElementById('buy-fullname').value, phone: document.getElementById('buy-phone').value, address: document.getElementById('buy-address').value }; if(!data.fullName || !data.phone || !data.address) { showAlert("Vui lòng điền đầy đủ thông tin!", "warning"); return; } if (!/^0\d{9}$/.test(data.phone)) { showAlert("Số điện thoại không hợp lệ!", "warning"); return; } const token = localStorage.getItem('token'); const res = await fetch(`${API_URL}/checkout`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': token }, body: JSON.stringify(data) }); const result = await res.json(); if (res.ok) { bootstrap.Modal.getInstance(document.getElementById('checkoutModal')).hide(); navigate('order-success', result.order); } else { showAlert(result.message || "Lỗi", "error"); } }
window.submitReview = async () => { const productId = document.getElementById('review-product-id').value; const rating = document.getElementById('review-rating').value; const comment = document.getElementById('review-comment').value; if (!comment.trim()) { showAlert("Vui lòng nhập đánh giá!", "warning"); return; } const token = localStorage.getItem('token'); const res = await fetch(`${API_URL}/reviews`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': token }, body: JSON.stringify({ productId, rating, comment }) }); if (res.ok) { Swal.fire({ icon: 'success', title: 'Cảm ơn bạn!', timer: 1500, showConfirmButton: false }); renderProductDetailPage(productId); } else { showAlert("Lỗi gửi đánh giá", "error"); } }
function renderStars(r){let s='';for(let i=1;i<=5;i++)s+=i<=r?'<i class="fa-solid fa-star"></i>':'<i class="fa-regular fa-star text-secondary"></i>';return s;}
function getPriceHTML(price, discount, isLarge = false) { const original = parseInt(price); if (!discount || discount <= 0) return `<span class="text-primary fw-bold ${isLarge ? 'display-6' : 'fs-5'}">${original.toLocaleString()}đ</span>`; const sale = original * (1 - discount / 100); return `<div class="d-flex align-items-center gap-2 flex-wrap"><span class="text-danger fw-bold ${isLarge ? 'display-6' : 'fs-5'}">${sale.toLocaleString()}đ</span><span class="text-muted text-decoration-line-through ${isLarge ? 'fs-5' : 'small'}">${original.toLocaleString()}đ</span></div>`; }
function getRealPrice(p, d) { return (!d || d <= 0) ? parseInt(p) : parseInt(p) * (1 - d / 100); }
function getAuthButtons() { const fullName = localStorage.getItem('fullName'); const role = localStorage.getItem('role'); if (fullName) { let menuItems = `<li><a class="dropdown-item" href="#" onclick="navigate('my-orders')"><i class="fa-solid fa-list-check me-2"></i>Đơn hàng của tôi</a></li>`; if (role === 'admin') { menuItems += `<li><hr class="dropdown-divider"></li><li><a class="dropdown-item" href="#" onclick="navigate('admin')"><i class="fa-solid fa-gauge me-2"></i>Quản trị Admin</a></li>`; } else if (role === 'shipper') { menuItems += `<li><hr class="dropdown-divider"></li><li><a class="dropdown-item" href="#" onclick="navigate('shipper-dashboard')"><i class="fa-solid fa-truck-fast me-2"></i>Kênh Shipper</a></li>`; } menuItems += `<li><hr class="dropdown-divider"></li><li><a class="dropdown-item text-danger" href="#" onclick="handleLogout()"><i class="fa-solid fa-arrow-right-from-bracket me-2"></i>Đăng xuất</a></li>`; return `<div class="dropdown"><button class="btn btn-light border rounded-pill px-3 py-1 d-flex align-items-center gap-2" data-bs-toggle="dropdown"><div class="bg-primary text-white rounded-circle d-flex justify-content-center align-items-center" style="width: 25px; height: 25px; font-size: 12px;">${fullName.charAt(0).toUpperCase()}</div><span class="d-none d-md-inline small fw-bold">${fullName}</span></button><ul class="dropdown-menu dropdown-menu-end shadow mt-2">${menuItems}</ul></div>`; } return `<button class="btn btn-primary-custom btn-sm px-4" onclick="navigate('login')">Đăng nhập</button>`; }
async function handleLogout() { if(await showConfirm("Đăng xuất?", "Thoát tài khoản?")) { localStorage.clear(); navigate('home'); } }

// --- HTML Templates ---
function getCheckoutModalHTML() { return `<div class="modal fade" id="checkoutModal" tabindex="-1"><div class="modal-dialog modal-dialog-centered"><div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden"><div class="modal-header bg-primary text-white border-0"><h5 class="modal-title fw-bold"><i class="fa-solid fa-bag-shopping me-2"></i>Thanh Toán</h5><button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button></div><div class="modal-body p-4 bg-light"><input type="hidden" id="buy-product-name"><input type="hidden" id="buy-product-price-raw"><div class="bg-white p-3 rounded-3 shadow-sm mb-3 border"><div class="d-flex justify-content-between mb-2"><span class="text-muted">Sản phẩm:</span><span class="fw-bold text-dark" id="show-product-name">...</span></div><div class="d-flex justify-content-between mb-2"><span class="text-muted">Giá bán:</span><span class="fw-bold" id="show-product-price">...</span></div><div class="d-flex justify-content-between mb-2"><span class="text-muted">Vận chuyển:</span><span class="fw-bold text-success" id="show-shipping-fee">...</span></div><hr class="my-2 border-dashed"><div class="d-flex justify-content-between align-items-center"><span class="fw-bold">Tổng cộng:</span><span class="fw-bold text-danger fs-4" id="show-final-total">...</span></div></div><div class="form-floating mb-3"><input type="text" class="form-control rounded-3" id="buy-fullname" placeholder="Họ tên"><label>Họ tên người nhận</label></div><div class="form-floating mb-3"><input type="text" class="form-control rounded-3" id="buy-phone" placeholder="SĐT"><label>Số điện thoại (10 số)</label></div><div class="form-floating"><textarea class="form-control rounded-3" id="buy-address" placeholder="Địa chỉ" style="height: 80px" oninput="calculateShip()"></textarea><label>Địa chỉ nhận hàng (Ghi rõ TP.HCM để Free ship)</label></div></div><div class="modal-footer border-0 bg-white p-3"><button type="button" class="btn btn-light rounded-3 px-4 fw-bold text-muted" data-bs-dismiss="modal">Hủy</button><button type="button" class="btn btn-ocean px-5" onclick="submitOrder()">ĐẶT HÀNG</button></div></div></div></div>`; }
function getProductModalHTML() { return `<div class="modal fade" id="adminModal" tabindex="-1"><div class="modal-dialog modal-dialog-centered"><div class="modal-content border-0 rounded-4 shadow-lg"><div class="modal-header bg-light border-0"><h5 class="modal-title fw-bold text-primary">Thông Tin Sản Phẩm</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div><div class="modal-body"><input type="hidden" id="p-id"><div class="mb-2"><label class="small text-muted fw-bold">Tên SP</label><input type="text" id="p-name" class="form-control rounded-3"></div><div class="row mb-2"><div class="col"><label class="small text-muted fw-bold">Hãng</label><input type="text" id="p-brand" class="form-control rounded-3"></div><div class="col"><label class="small text-muted fw-bold">Kho</label><input type="number" id="p-stock" class="form-control rounded-3"></div></div><div class="row mb-2"><div class="col"><label class="small text-muted fw-bold">Giá gốc</label><input type="number" id="p-price" class="form-control rounded-3"></div><div class="col"><label class="small text-muted fw-bold">% Giảm</label><input type="number" id="p-discount" class="form-control rounded-3"></div></div><div class="mb-2"><label class="small text-muted fw-bold">Link Ảnh</label><input type="text" id="p-image" class="form-control rounded-3"></div><div class="mb-2"><label class="small text-muted fw-bold">Mô tả</label><textarea id="p-desc" class="form-control rounded-3" rows="3"></textarea></div></div><div class="modal-footer border-0"><button class="btn btn-light rounded-pill px-4" data-bs-dismiss="modal">Hủy</button><button class="btn btn-ocean px-4" onclick="saveProduct()">Lưu Thay Đổi</button></div></div></div></div>`; }
function getFooterHTML() { return `<footer class="bg-white text-dark mt-auto border-top"><div class="container pt-5 pb-3"><div class="row"><div class="col-md-4 mb-4"><h5 class="fw-bold text-primary d-flex align-items-center gap-2"><img src="${LOGO_URL}" width="30" height="30" onerror="this.src='./logoWebOceanMobiStore.png'"> OceanMobiStore</h5><p class="small text-muted">Đại dương công nghệ trong tầm tay bạn.</p></div><div class="col-md-4 mb-4"><h5 class="fw-bold">Liên hệ</h5><p class="small mb-1">Hotline: 0378 219 123</p><p class="small">Phường Tân Sơn Hòa, TP.HCM, Việt Nam</p></div><div class="col-md-4"><h5 class="fw-bold">Thanh toán</h5><p class="small text-muted">COD</p></div></div><div class="text-center mt-3 small text-muted">© 2024 OceanMobiStore</div></div><div class="marquee-bar"><div class="marquee-content">🌊 OceanMobiStore - Đại dương công nghệ trong tầm tay 🌊 Hotline: 0378 219 123 🌊 Freeship nội thành TP.HCM 🌊 Bảo hành 1 đổi 1 trong 30 ngày 🌊 Cam kết chính hãng 100%</div></div></footer>`; }

// Nút Scroll
const btnTop=document.getElementById("btn-back-to-top"); window.onscroll=()=>{if(btnTop)btnTop.style.display=(document.body.scrollTop>300||document.documentElement.scrollTop>300)?'block':'none';};
window.scrollToTop=()=>{window.scrollTo({top:0,behavior:"smooth"});}

// START
navigate('home');