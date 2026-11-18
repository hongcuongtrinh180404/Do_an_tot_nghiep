# Quy Tắc Nghiệp Vụ & Luồng Hoạt Động: Phê Duyệt Giảng Viên

## 1. Quy tắc Nghiệp vụ (Business Rules)
1. **Phân quyền nghiêm ngặt**:
   - Toàn bộ endpoints `/api/v1/admin/instructor-applications` và `/api/v1/admin/instructor-terms` bắt buộc có vai trò `@Roles(RoleEnum.ADMIN)`.
2. **Luồng Phê duyệt (Approve Flow)**:
   - Hồ sơ phải ở trạng thái `PENDING`. Nếu đã `APPROVED`, hệ thống chặn với `400 BadRequestException`.
   - Khi được phê duyệt:
     - Trạng thái hồ sơ chuyển sang `APPROVED`.
     - Lưu thông tin Admin duyệt (`reviewedById`, `reviewedByName`, `reviewedAt = now`).
     - Tự động nâng quyền của tài khoản người dùng (`User.role = RoleEnum.INSTRUCTOR`).
3. **Luồng Từ chối (Reject Flow)**:
   - Bắt buộc phải có lý do từ chối (`rejectionReason`) với độ dài tối thiểu 10 ký tự và tối đa 1000 ký tự. Tự động trim khoảng trắng thừa.
   - Khi từ chối:
     - Trạng thái chuyển sang `REJECTED`.
     - Lưu lý do từ chối và thông tin Admin xử lý.
4. **Thiết lập Điều khoản Giảng viên (Terms Configuration)**:
   - Các điều khoản có thuộc tính `isMandatory` (bắt buộc tích chọn đồng ý) và `order` (thứ tự hiển thị).
   - Admin có thể thêm mới, sửa tiêu đề/nội dung, xóa hoặc đổi thứ tự sắp xếp.
   - Các điều khoản này hiển thị trực tiếp cho học viên tại biểu mẫu đăng ký `/become-instructor`.

## 2. Luồng Trải nghiệm Người dùng (User Experience Flows)
1. **Admin Sidebar**:
   - Mục **"Phê duyệt giảng viên"** hiển thị ngay dưới **"Quản lý & Phê duyệt Khóa học"**.
   - Có badge hiển thị số lượng hồ sơ đang chờ duyệt nếu lớn hơn 0.
2. **2 Tabs Chức năng**:
   - **Tab 1: Phê duyệt (`PENDING`)**: Danh sách các hồ sơ mới nộp, có nút "Chi tiết", nút nhanh "Từ chối" và "Phê duyệt".
   - **Tab 2: Lịch sử phê duyệt (`HISTORY`)**: Danh sách hồ sơ đã giải quyết (`APPROVED`, `REJECTED`), có bộ lọc phụ (Tất cả / Đã duyệt / Đã từ chối).
3. **Nút "Thiết lập điều khoản"**:
   - Đặt tại Header giao diện chính bên phải tiêu đề trang.
   - Bấm nút mở Modal thiết lập điều khoản với 2 tab: "Chỉnh sửa" và "Xem trước (Preview)".
