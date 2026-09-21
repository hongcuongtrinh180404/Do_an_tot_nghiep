# Payment SePay — Rules & Business Flows

> **Module:** Thanh toán học phí tự động qua cổng SePay (quét mã VietQR và kích hoạt khóa học qua Webhook).

---

## 1. Nghiệp vụ & Luồng Thanh toán (Payment Flow)

```mermaid
sequenceDiagram
    autonumber
    actor Student as Học viên
    participant FE as Frontend Web
    participant API as NestJS Payment API
    participant DB as MongoDB
    participant SePay as Cổng SePay (VietQR)
    participant Bank as Ngân hàng

    Student->>FE: Bấm Mua khóa học
    FE->>API: POST /api/v1/payments/create-order { courseId }
    API->>DB: Tạo Order (status = PENDING, orderCode = "DH123456")
    API-->>FE: Trả về thông tin VietQR (Ngân hàng, STK, Số tiền, Nội dung = DH123456)
    FE->>Student: Hiển thị Modal quét mã VietQR

    Student->>Bank: Quét mã VietQR & chuyển khoản
    Bank->>SePay: Báo có tiền vào tài khoản
    SePay->>API: POST /api/v1/payments/webhook (kèm token & payload giao dịch)
    API->>API: Xác thực Webhook Secret & Kiểm tra Idempotency
    API->>DB: Cập nhật Order = PAID & Tạo Enrollment (Transaction session)
    API-->>SePay: Trả về 200 OK

    FE->>API: Polling kiểm tra trạng thái đơn hàng (hoặc qua SSE/WebSocket)
    API-->>FE: Order = PAID
    FE->>Student: Thông báo thành công & Chuyển hướng vào học
```

---

## 2. Quy tắc Nghiệp vụ Cốt lõi (Core Business Rules)

1. **Bảo mật Webhook**:
   - Webhook endpoint phải xác thực Authorization Header (SePay API Token) hoặc Webhook Secret.
2. **Nguyên tắc Idempotency (Chống xử lý trùng)**:
   - Lưu trữ `sepayTransactionId` trong collection `Transactions`.
   - Nếu SePay retry gửi lại webhook có cùng `transactionId`, hệ thống kiểm tra và trả về `200 OK` ngay lập tức mà không cộng tiền hay tạo thêm bản ghi Enrollment.
3. **Tính Toàn vẹn Giao dịch (MongoDB Transaction)**:
   - Thao tác cập nhật trạng thái đơn hàng (`Order.status = PAID`) và cấp quyền học viên (`Enrollment`) phải nằm trọn trong một MongoDB `ClientSession` transaction.
