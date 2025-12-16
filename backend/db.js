// Import thư viện pg (node-postgres)
const { Pool } = require('pg');

// Cấu hình thông tin kết nối
const pool = new Pool({
    user: 'postgres',        
    host: 'localhost',       
    database: 'mobile_shop_db', 
    password: '123456',         
    port: 5432,              
});

// Kiểm tra xem có kết nối được không khi server khởi động
pool.connect((err) => {
    if (err) {
        console.error('❌ Lỗi kết nối Database:', err.message);
    } else {
        console.log('✅ Đã kết nối thành công tới PostgreSQL');
    }
});

// Xuất đối tượng pool để các file khác dùng
module.exports = pool;