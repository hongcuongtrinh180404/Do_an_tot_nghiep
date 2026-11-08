# Payment SePay — Development History & Gotchas

> **Module:** Payment SePay & Enrollment Management

---

## 1. Milestone & Feature Status

- **Trạng thái hiện tại:** `COMPLETED` (Đã hoàn thiện trọn vẹn tích hợp thanh toán SePay VietQR và Webhook bảo mật HMAC-SHA256).
- **Kế hoạch triển khai:** Đã triển khai và kiểm thử tự động toàn bộ luồng mua khóa học thực tế.

---

## 2. Technical Notes & Gotchas

- **Milestone 1 (Mock Purchase & Enrollment Architecture Foundation)**:
  - **Mục tiêu**: Xây dựng nền tảng sở hữu khóa học (`Enrollment`), ghi nhận giao dịch (`Order`) bằng MongoDB Session Transactions, phục vụ chức năng mua khóa học giả lập trước khi kết nối SePay thật.
  - **Kiến trúc triển khai**:
    - **Schema & Indexes**:
      - `OrderEntity` (`orders`): Lưu `orderCode` (unique), `userId`, `courseId`, `amount`, `status` (`OrderStatusEnum.PAID`).
      - `EnrollmentEntity` (`enrollments`): Lưu `userId`, `courseId`, `orderId`, `enrolledAt`. Compound unique index `{ userId: 1, courseId: 1, deletedAt: 1 }` triệt tiêu triệt để race condition mua trùng lặp.
    - **Transaction Idempotency**:
      - `mockPurchase` chạy toàn bộ trong MongoDB `ClientSession` (`withTransaction`).
      - Kiểm tra trùng lặp lần 2 ngay bên trong session transaction trước khi ghi nhận đơn hàng.
    - **Đặc quyền Giảng viên (Instructor Ownership)**:
      - Giảng viên tự động sở hữu các khóa học do mình xuất bản (`status === PUBLISHED`).
      - Endpoint `GET /api/v1/enrollments/my-courses` tự động UNION các khóa học do giảng viên tạo đã xuất bản vào danh sách khóa học đã mua.
    - **Kiểm thử tự động**:
      - 12/12 unit tests đạt chuẩn AAA trong `enrollment.service.spec.ts`.

- **Milestone 2 (SePay VietQR & HMAC-SHA256 Webhook Integration)**:
  - **Mục tiêu**: Thay thế cơ chế mua giả lập bằng thanh toán chuyển khoản ngân hàng thực tế qua VietQR và Webhook SePay bảo mật chữ ký HMAC-SHA256.
  - **Kiến trúc triển khai**:
    - **Bảo mật HMAC-SHA256**:
      - Cấu hình `rawBody: true` tại `NestFactory.create(AppModule, { rawBody: true })` để lấy raw Buffer nguyên vẹn.
      - Xác minh timestamp trong khoảng 300 giây (5 phút), chống replay attack.
      - Chuỗi ký: `${timestamp}.${raw_body}`, băm HMAC-SHA256 với `SEPAY_WEBHOOK_SECRET`.
      - So sánh constant-time bằng `crypto.timingSafeEqual` triệt tiêu timing attack.
    - **Mã thanh toán SePay (Payment Pattern)**:
      - Tiền tố `MD` (cấu hình qua `SEPAY_PAYMENT_PREFIX`), hậu tố 5 chữ số ngẫu nhiên (10000 - 99999).
      - Cơ chế collision retry kiểm tra trùng mã trong CSDL MongoDB.
    - **Xử lý nghiệp vụ & Idempotency**:
      - Bỏ qua giao dịch tiền ra (`transferType: 'out'`).
      - Kiểm tra số tài khoản nhận khớp `SEPAY_BANK_ACCOUNT`.
      - Chống xử lý trùng webhook dựa trên `sepayTransactionId` (unique index trong bảng `payments`).
      - Cấp quyền học viên (`Enrollment`) và cập nhật đơn hàng (`Order.status = PAID`) chạy trong MongoDB Session Transaction (`withTransaction`) với fallback an toàn cho standalone MongoDB.
      - Xử lý chuyển thừa tiền (`OVERPAID`): tự động kích hoạt quyền học và ghi cờ đối soát.
      - Xử lý chuyển thiếu tiền (`UNDERPAID`): không kích hoạt và lưu log đối soát.
      - Tái sử dụng đơn hàng PENDING còn hạn khi học viên click lại để tránh sinh rác đơn.
    - **Frontend Checkout Flow**:
      - Trang thanh toán `/checkout/[orderCode]` hiển thị mã VietQR, STK, Chủ TK, Số tiền, Nội dung chuyển khoản.
      - Đồng hồ đếm ngược 15 phút thời hạn thanh toán.
      - Polling trạng thái đơn hàng mỗi 3 giây; khi thanh toán thành công, tự động hiển thị màn hình chúc mừng và nút "Bắt đầu học ngay".
      - Giữ nguyên luồng đăng ký miễn phí trực tiếp cho các khóa học 0 VNĐ.
    - **Kiểm thử tự động**:
      - 26/26 unit tests trong `payment.service.spec.ts` và `sepay.service.spec.ts` đạt 100% pass.
      - Toàn bộ 83 backend tests và 63 frontend tests pass hoàn hảo.
