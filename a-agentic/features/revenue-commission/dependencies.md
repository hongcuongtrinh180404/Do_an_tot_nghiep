# Revenue & Commission Management — Dependencies

> **Module:** Revenue & Commission Management (`payment` module & `enrollment` order models)

---

## 1. Upstream & Downstream Dependencies

### Upstream Dependencies
- **`payment-sepay`**: Cung cấp webhook SePay, đối soát giao dịch thực tế (`PaymentTransactionEntity`), trạng thái thanh toán `MATCHED` / `OVERPAID`, và luồng cập nhật đơn hàng thành `PAID`.
- **`course-management`**: Cung cấp thông tin khóa học (`CourseEntity`), giá bán (`price`), tác giả/giảng viên (`instructorId`).
- **`auth-identity` & `user`**: Cung cấp thông tin tài khoản người dùng (`UserEntity`), danh sách giảng viên (role `INSTRUCTOR`), và lưu trữ tỷ lệ hoa hồng tùy chỉnh cá nhân (`commissionRate`).
- **`enrollment` (Order)**: Lưu trữ đơn hàng (`OrderEntity`), snapshot thông tin học viên, giảng viên, khóa học, và phân bổ doanh thu (`platformCommissionRate`, `platformEarnings`, `instructorEarnings`).

### Downstream Dependencies
- **Admin Revenue Dashboard**: Cung cấp số liệu tổng quan doanh thu, biểu đồ doanh thu theo thời gian, danh sách thẻ ngang giao dịch thành công, drawer chi tiết 5 nhóm thông tin, và bảng doanh thu giảng viên.
- **Instructor Revenue Detail**: Cung cấp thống kê doanh thu theo giảng viên, danh sách khóa học, giao dịch gần đây, và điều chỉnh hoa hồng kèm lịch sử thay đổi bất biến.

