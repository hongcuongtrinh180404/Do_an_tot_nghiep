# Payment SePay — Dependencies

> **Module:** Payment SePay

---

## 1. Upstream & Downstream Dependencies

- **Upstream Dependencies:**
  - `course-management`: Lấy thông tin khóa học và giá tiền (`course.price`).
  - `auth-identity`: Lấy thông tin học viên đang đăng nhập (`userId`).
  - SePay API Server: Nơi gửi webhook khi tài khoản nhận được tiền.
- **Downstream Dependencies:**
  - `course-management`: Cấp quyền truy cập bài học (thông qua bảng `Enrollment`).
