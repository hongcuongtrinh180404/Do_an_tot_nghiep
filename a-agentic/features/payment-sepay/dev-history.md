# Payment SePay — Development History & Gotchas

> **Module:** Payment SePay & Enrollment Management

---

## 1. Milestone & Feature Status

- **Trạng thái hiện tại:** `IN_PROGRESS` (Đã hoàn thiện Order & Enrollment Domain Foundation, Mock Purchase Transactional Activation, và My Purchased Courses).
- **Kế hoạch triển khai:** Sprint 4 — Tích hợp SePay VietQR webhook và QR code checkout modal.

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
