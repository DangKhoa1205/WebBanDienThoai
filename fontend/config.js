const API_URL = 'http://localhost:3000/api';

// Hàm hiển thị thông báo đẹp (Dùng SweetAlert2)
function showAlert(message, type = 'success') {
    // type có thể là: 'success' (xanh), 'error' (đỏ), 'warning' (vàng), 'info' (xanh dương)
    Swal.fire({
        title: type === 'error' ? 'Opps...' : 'Thông báo',
        text: message,
        icon: type,
        confirmButtonText: 'Đồng ý',
        confirmButtonColor: '#3085d6'
    });
}

// Hàm hỏi xác nhận (Thay cho confirm mặc định)
async function showConfirm(title, text) {
    const result = await Swal.fire({
        title: title,
        text: text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Đồng ý',
        cancelButtonText: 'Hủy bỏ'
    });
    return result.isConfirmed; // Trả về true nếu bấm Đồng ý
}