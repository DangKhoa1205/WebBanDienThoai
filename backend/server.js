const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const pool = require('./db'); 
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const port = 3000;
const SECRET_KEY = "chuoi_bi_mat_cua_ban"; 
// --- MIDDLEWARE CƠ BẢN ---
app.use(cors());
app.use(bodyParser.json());


// --- MIDDLEWARE BẢO VỆ (MỚI) ---
// Hàm này sẽ chặn nếu user không phải admin
const verifyAdmin = (req, res, next) => {
    // 1. Lấy token từ header gửi lên (Frontend sẽ gửi dạng: "headers: { Authorization: token }")
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(403).json({ message: "Không có quyền truy cập (Thiếu Token)" });
    }

    try {
        // 2. Giải mã token
        const decoded = jwt.verify(token, SECRET_KEY);
        
        // 3. Kiểm tra Role bên trong token
        if (decoded.role !== 'admin') {
            return res.status(403).json({ message: "Bạn không phải là Admin!" });
        }

        // 4. Nếu đúng là Admin, cho phép đi tiếp
        req.user = decoded; 
        next(); 

    } catch (err) {
        return res.status(401).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
    }
};

// --- CÁC ROUTE (API) ---

// 1. Lấy danh sách (Ai cũng xem được)
app.get('/api/products', async (req, res) => {
    try {
        const { brand } = req.query; // Lấy tham số ?brand=... trên đường dẫn
        
        let sql = 'SELECT * FROM products';
        let params = [];

        // Nếu có brand thì thêm điều kiện WHERE
        if (brand) {
            sql += ' WHERE brand = $1';
            params.push(brand);
        }

        sql += ' ORDER BY id ASC'; // Sắp xếp

        const result = await pool.query(sql, params);
        res.json(result.rows); 
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Lỗi Server');
    }
});

// 2. Lấy chi tiết (Ai cũng xem được)
app.get('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ message: "Không tìm thấy" });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).send('Lỗi Server');
    }
});

// 3. Đặt hàng (Ai cũng đặt được - Cần đăng nhập sau này tính sau)
app.post('/api/order', async (req, res) => {
    const client = await pool.connect();
    try {
        const { productId, quantity } = req.body;
        await client.query('BEGIN');
        const productRes = await client.query('SELECT stock FROM products WHERE id = $1 FOR UPDATE', [productId]);
        
        if (productRes.rows.length === 0) throw new Error("Sản phẩm không tồn tại");
        const currentStock = productRes.rows[0].stock;
        if (currentStock < quantity) throw new Error("Hết hàng!");

        await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [quantity, productId]);
        await client.query('COMMIT');
        
        res.json({ message: "Đặt hàng thành công!", newStock: currentStock - quantity });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: err.message });
    } finally {
        client.release();
    }
});


// --- CÁC ROUTE ADMIN (CÓ BẢO VỆ) ---
// Thêm middleware 'verifyAdmin' vào giữa

// 4. Thêm sản phẩm (CHỈ ADMIN)
app.post('/api/products', verifyAdmin, async (req, res) => {
    try {
        // Thêm discount vào req.body
        const { name, brand, price, image_url, description, stock, discount } = req.body;
        
        const newProduct = await pool.query(
            'INSERT INTO products (name, brand, price, image_url, description, stock, discount) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [name, brand, price, image_url, description, stock, discount || 0] // Nếu không nhập thì mặc định 0
        );
        res.json(newProduct.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send("Lỗi khi thêm sản phẩm");
    }
});

// 7. Sửa sản phẩm (CHỈ ADMIN)
app.put('/api/products/:id', verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        // Thêm discount
        const { name, brand, price, image_url, description, stock, discount } = req.body;

        const result = await pool.query(
            'UPDATE products SET name=$1, brand=$2, price=$3, image_url=$4, description=$5, stock=$6, discount=$7 WHERE id=$8 RETURNING *',
            [name, brand, price, image_url, description, stock, discount || 0, id]
        );
        res.json({ message: "Cập nhật thành công!", product: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).send("Lỗi khi cập nhật sản phẩm");
    }
});

// 8. Xóa sản phẩm (CHỈ ADMIN)
app.delete('/api/products/:id', verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM products WHERE id = $1', [id]);
        res.json({ message: "Đã xóa sản phẩm!" });
    } catch (err) {
        console.error(err);
        res.status(500).send("Lỗi khi xóa sản phẩm");
    }
});

// --- AUTH ROUTE ---

// 5. Đăng ký (Mặc định tạo ra role là 'user')
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, fullName } = req.body;
        const userCheck = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (userCheck.rows.length > 0) return res.status(400).json({ message: "Tên tồn tại!" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Mặc định insert vào role là 'user' (do Database set default)
        const newUser = await pool.query(
            'INSERT INTO users (username, password, full_name) VALUES ($1, $2, $3) RETURNING id, username, role',
            [username, hashedPassword, fullName]
        );

        res.json({ message: "Đăng ký thành công!", user: newUser.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).send("Lỗi Server");
    }
});

// 6. Đăng nhập (CẬP NHẬT: Trả về Role và Nhét Role vào Token)
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (result.rows.length === 0) return res.status(400).json({ message: "Sai thông tin" });

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Sai thông tin" });

        // --- QUAN TRỌNG: Đưa role vào Token ---
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role }, 
            SECRET_KEY, 
            { expiresIn: '1h' }
        );

        res.json({ 
            message: "Đăng nhập thành công!", 
            token: token, 
            username: user.username,
            role: user.role, // --- QUAN TRỌNG: Trả role về cho Frontend ---
            fullName: user.full_name
        });

    } catch (err) {
        console.error(err);
        res.status(500).send("Lỗi Server");
    }
});
// 9. Khách hàng đặt hàng (CÓ TÍNH PHÍ SHIP)
app.post('/api/checkout', async (req, res) => {
    const client = await pool.connect();
    try {
        const token = req.headers['authorization'];
        if (!token) return res.status(401).json({ message: "Bạn cần đăng nhập!" });
        const decoded = jwt.verify(token, SECRET_KEY);
        
        const { fullName, phone, address, productName, price } = req.body; // price này là giá gốc sản phẩm

        await client.query('BEGIN');

        // 1. Kiểm tra kho
        const productRes = await client.query('SELECT id, stock FROM products WHERE name = $1 FOR UPDATE', [productName]);
        if (productRes.rows.length === 0) throw new Error("Sản phẩm không tồn tại");
        const product = productRes.rows[0];
        if (product.stock <= 0) throw new Error("Hết hàng!");

        // 2. TÍNH PHÍ SHIP (LOGIC BACKEND)
        // Chuyển địa chỉ về chữ thường để so sánh cho dễ
        const addressLower = address.toLowerCase();
        let shippingFee = 30000; // Mặc định là 30k

        // Nếu địa chỉ chứa từ khóa HCM hoặc Hồ Chí Minh thì Free ship
        if (addressLower.includes('hồ chí minh') || addressLower.includes('hcm') || addressLower.includes('sài gòn')) {
            shippingFee = 0;
        }

        // Tổng tiền cuối cùng = Giá sản phẩm + Phí ship
        const finalTotal = Number(price) + shippingFee;

        // 3. Trừ kho
        await client.query('UPDATE products SET stock = stock - 1 WHERE id = $1', [product.id]);

        // 4. Lưu đơn hàng (Lưu finalTotal vào cột total_price)
        const orderRes = await client.query(
            'INSERT INTO orders (user_id, full_name, phone, address, product_name, total_price, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [decoded.id, fullName, phone, address, productName, finalTotal, 'pending']
        );

        await client.query('COMMIT');

        res.json({ 
            message: "Thành công", 
            order: orderRes.rows[0] 
        });

    } catch (err) {
        await client.query('ROLLBACK');
        res.status(400).json({ message: err.message });
    } finally {
        client.release();
    }
});

// 10. Admin lấy danh sách đơn hàng (Có bảo vệ verifyAdmin)
app.get('/api/orders', verifyAdmin, async (req, res) => {
    try {
        // Lấy đơn hàng mới nhất lên đầu (DESC)
        const result = await pool.query('SELECT * FROM orders ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).send("Lỗi server");
    }
});

// 11. Admin cập nhật trạng thái đơn hàng
app.put('/api/orders/:id', verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // status mới: processing, shipping...

        await pool.query('UPDATE orders SET status = $1 WHERE id = $2', [status, id]);
        res.json({ message: "Cập nhật trạng thái thành công!" });
    } catch (err) {
        res.status(500).send("Lỗi server");
    }
});
// 12. API Báo cáo thống kê (Chỉ Admin)
app.get('/api/stats', verifyAdmin, async (req, res) => {
    try {
        // 1. Tính tổng doanh thu (Chỉ tính đơn đã giao - delivered)
        const revenueRes = await pool.query(
            "SELECT SUM(total_price) as total FROM orders WHERE status = 'delivered'"
        );
        const totalRevenue = revenueRes.rows[0].total || 0;

        // 2. Đếm tổng số đơn hàng
        const countRes = await pool.query("SELECT COUNT(*) as count FROM orders");
        const totalOrders = countRes.rows[0].count;

        // 3. Thống kê doanh thu theo tháng (Dùng cho biểu đồ)
        // PostgreSQL: Dùng to_char để lấy tháng-năm (Ví dụ: '2024-11')
        const chartRes = await pool.query(`
            SELECT to_char(created_at, 'YYYY-MM') as month, SUM(total_price) as revenue 
            FROM orders 
            WHERE status = 'delivered' 
            GROUP BY month 
            ORDER BY month ASC
        `);

        res.json({
            totalRevenue,
            totalOrders,
            chartData: chartRes.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Lỗi thống kê");
    }
});
// 13. Xem lịch sử đơn hàng của TÔI (User)
app.get('/api/my-orders', async (req, res) => {
    try {
        // 1. Lấy token từ header
        const token = req.headers['authorization'];
        if (!token) return res.status(401).json({ message: "Bạn cần đăng nhập!" });
        
        // 2. Giải mã token để lấy ID người dùng
        const decoded = jwt.verify(token, SECRET_KEY);
        const userId = decoded.id;

        // 3. Lấy đơn hàng của người này (Sắp xếp mới nhất lên đầu)
        const result = await pool.query(
            'SELECT * FROM orders WHERE user_id = $1 ORDER BY id DESC', 
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send("Lỗi Server");
    }
});
// --- QUẢN LÝ SHIPPER ---

// 14. Lấy danh sách tất cả Shipper (Chỉ Admin dùng)
app.get('/api/admin/shippers', verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query("SELECT id, full_name, username FROM users WHERE role = 'shipper'");
        res.json(result.rows);
    } catch (err) {
        res.status(500).send("Lỗi lấy shipper");
    }
});

// 15. Admin gán đơn hàng cho Shipper
app.put('/api/admin/assign-order/:id', verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { shipperId } = req.body;
        await pool.query('UPDATE orders SET shipper_id = $1, status = $2 WHERE id = $3', [shipperId, 'shipping', id]);
        res.json({ message: "Đã giao đơn cho Shipper!" });
    } catch (err) {
        res.status(500).send("Lỗi gán đơn");
    }
});

// 16. Shipper xem danh sách đơn được giao (Cần middleware verifyShipper - viết thêm bên dưới)
const verifyShipper = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ message: "Thiếu token" });
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        if (decoded.role !== 'shipper' && decoded.role !== 'admin') return res.status(403).json({ message: "Không phải Shipper" });
        req.user = decoded;
        next();
    } catch (err) { res.status(401).json({ message: "Lỗi xác thực" }); }
};

app.get('/api/shipper/orders', verifyShipper, async (req, res) => {
    try {
        // Lấy các đơn hàng được gán cho shipper này (trừ đơn đã hủy hoặc hoàn thành lâu rồi nếu muốn)
        const result = await pool.query(
            "SELECT * FROM orders WHERE shipper_id = $1 ORDER BY id DESC", 
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send("Lỗi lấy đơn shipper");
    }
});

// 17. Shipper cập nhật trạng thái (Đã giao / Giao thất bại)
app.put('/api/shipper/update-status/:id', verifyShipper, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'delivered' hoặc 'cancelled'
        
        // Shipper chỉ được sửa đơn của chính mình
        await pool.query(
            "UPDATE orders SET status = $1 WHERE id = $2 AND shipper_id = $3", 
            [status, id, req.user.id]
        );
        res.json({ message: "Cập nhật thành công!" });
    } catch (err) {
        res.status(500).send("Lỗi cập nhật");
    }
});
// 18. [MỚI] Lấy danh sách tất cả tài khoản (Trừ password)
app.get('/api/admin/users', verifyAdmin, async (req, res) => {
    try {
        // Lấy id, username, tên, quyền. Không lấy password!
        const result = await pool.query("SELECT id, username, full_name, role FROM users ORDER BY id ASC");
        res.json(result.rows);
    } catch (err) {
        res.status(500).send("Lỗi lấy danh sách user");
    }
});

// 19. [MỚI] Thay đổi quyền hạn (Role) của tài khoản
app.put('/api/admin/users/:id', verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body; // 'user', 'shipper', 'admin'

        // Chặn không cho tự hạ quyền Admin của chính mình (nếu cần thiết)
        // Nhưng ở mức cơ bản này ta cứ cho phép update.
        
        await pool.query('UPDATE users SET role = $1 WHERE id = $2', [role, id]);
        res.json({ message: "Cập nhật quyền thành công!" });
    } catch (err) {
        res.status(500).send("Lỗi cập nhật quyền");
    }
});
// 20. Lấy danh sách đánh giá của 1 sản phẩm
app.get('/api/reviews/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        // Join bảng users để lấy tên người bình luận
        const result = await pool.query(
            `SELECT r.*, u.full_name 
             FROM reviews r 
             JOIN users u ON r.user_id = u.id 
             WHERE r.product_id = $1 
             ORDER BY r.created_at DESC`,
            [productId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send("Lỗi lấy đánh giá");
    }
});

// 21. Gửi đánh giá mới (Cần đăng nhập)
app.post('/api/reviews', async (req, res) => {
    try {
        const token = req.headers['authorization'];
        if (!token) return res.status(401).json({ message: "Bạn cần đăng nhập!" });
        
        const decoded = jwt.verify(token, SECRET_KEY);
        const { productId, rating, comment } = req.body;

        await pool.query(
            'INSERT INTO reviews (user_id, product_id, rating, comment) VALUES ($1, $2, $3, $4)',
            [decoded.id, productId, rating, comment]
        );

        res.json({ message: "Đánh giá thành công!" });
    } catch (err) {
        console.error(err);
        res.status(500).send("Lỗi gửi đánh giá");
    }
});
app.listen(port, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${port}`);
}); 