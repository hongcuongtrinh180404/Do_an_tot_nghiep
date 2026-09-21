# Payment SePay — Development History & Gotchas

> **Module:** Payment SePay

---

## 1. Milestone & Feature Status

- **Trạng thái hiện tại:** `PLANNING` (Thiết kế luồng VietQR và Webhook Idempotency).
- **Kế hoạch triển khai:** Sprint 4 (Giai đoạn 3: Cài đặt & Lập trình).

---

## 2. Technical Notes & Gotchas

- **Nội dung chuyển khoản (Content Matching)**: Khi sinh mã QR, nội dung chuyển khoản phải chứa tiền tố nhận diện và mã đơn hàng (ví dụ: `DH123456`). Khi nhận webhook, dùng Regex để bóc tách chính xác mã đơn hàng `orderCode` từ chuỗi nội dung chuyển khoản (`transaction.content`).
- **Xử lý số tiền chênh lệch**: Nếu học viên chuyển thiếu tiền so với giá khóa học, không tự động kích hoạt Enrollment mà đổi trạng thái đơn hàng thành `PARTIALLY_PAID` hoặc ghi log cảnh báo để admin xử lý.
