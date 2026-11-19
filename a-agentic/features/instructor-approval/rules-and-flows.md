# Quy Tắc Nghiệp Vụ & Luồng Hoạt Động: Phê Duyệt Giảng Viên

## 1. Quy tắc Nghiệp vụ (Business Rules)
1. **Phân quyền nghiêm ngặt**:
   - Toàn bộ endpoints `/api/v1/admin/instructor-applications` và `/api/v1/admin/instructor-terms` bắt buộc có vai trò `@Roles(RoleEnum.ADMIN)`.
   - Endpoints học viên nộp đơn `/api/v1/instructor-applications/apply` và `/api/v1/instructor-applications/my-application` bắt buộc có xác thực `@UseGuards(JwtAuthGuard)`.
2. **Luồng Nộp Đơn Học Viên (Apply / Resubmit Flow)**:
   - Mỗi học viên chỉ có tối đa một hồ sơ ở trạng thái `PENDING`. Nếu đã có, hệ thống chặn với `400 BadRequestException`.
   - Nếu tài khoản đã là `INSTRUCTOR` hoặc hồ sơ đã `APPROVED`, hệ thống từ chối nộp tiếp.
   - Nếu hồ sơ trước đó bị `REJECTED`, cho phép cập nhật lại thông tin và nộp lại (`RESUBMITTED`), chuyển trạng thái về `PENDING`, xóa lý do từ chối cũ và đẩy sự kiện `RESUBMITTED` vào `history`.
3. **Luồng Phê duyệt (Approve Flow) & Lưu vết Lịch sử**:
   - Hồ sơ phải ở trạng thái `PENDING`. Nếu đã `APPROVED`, hệ thống chặn với `400 BadRequestException`.
   - Khi được phê duyệt:
     - Trạng thái hồ sơ chuyển sang `APPROVED`.
     - Lưu thông tin Admin duyệt (`reviewedById`, `reviewedByName`, `reviewedAt = now`).
     - Đẩy sự kiện `APPROVED` vào mảng `history` kèm định danh Admin duyệt (`actorId`, `actorName`, `actorRole: ADMIN`, `comment`, `timestamp`).
     - Tự động nâng quyền của tài khoản người dùng thật (`User.role = RoleEnum.INSTRUCTOR`).
4. **Luồng Từ chối (Reject Flow) & Lưu vết Lịch sử**:
   - Bắt buộc phải có lý do từ chối (`rejectionReason`) với độ dài tối thiểu 10 ký tự và tối đa 1000 ký tự. Tự động trim khoảng trắng thừa.
   - Khi từ chối:
     - Trạng thái chuyển sang `REJECTED`.
     - Lưu lý do từ chối và thông tin Admin xử lý (`reviewedById`, `reviewedByName`, `reviewedAt = now`).
     - Đẩy sự kiện `REJECTED` vào mảng `history` kèm lý do từ chối và tên Admin xử lý.
5. **Thiết lập Điều khoản Giảng viên (Terms Configuration)**:
   - Các điều khoản có thuộc tính `isMandatory` (bắt buộc tích chọn đồng ý) và `order` (thứ tự hiển thị).
   - Admin có thể thêm mới, sửa tiêu đề/nội dung, xóa hoặc đổi thứ tự sắp xếp.
   - Các điều khoản này hiển thị trực tiếp cho học viên tại biểu mẫu đăng ký `/become-instructor`.

## 2. Luồng Trải nghiệm Người dùng (User Experience Flows)
1. **Admin Sidebar**:
   - Mục **"Phê duyệt giảng viên"** hiển thị ngay dưới **"Quản lý & Phê duyệt Khóa học"**.
   - Có badge hiển thị số lượng hồ sơ đang chờ duyệt nếu lớn hơn 0.
2. **2 Tabs Chức năng**:
   - **Tab 1: Phê duyệt (`PENDING`)**: Danh sách các hồ sơ mới nộp, hiển thị Ngày nộp, có nút "Chi tiết", nút nhanh "Từ chối" và "Phê duyệt".
   - **Tab 2: Lịch sử phê duyệt (`HISTORY`)**: Danh sách hồ sơ đã giải quyết (`APPROVED`, `REJECTED`), hiển thị rõ cột **"Người duyệt"** (Admin nào duyệt) và **"Thời gian duyệt"**, có bộ lọc phụ (Tất cả / Đã duyệt / Đã từ chối).
3. **Modal Chi tiết Hồ sơ (`InstructorDetailDialog`)**:
   - Hiển thị Timeline Lịch sử xét duyệt chi tiết từng mốc: Ai nộp ngày nào -> Admin nào duyệt hay từ chối -> Lý do cụ thể.
4. **Nút "Thiết lập điều khoản"**:
   - Đặt tại Header giao diện chính bên phải tiêu đề trang.
   - Bấm nút mở Modal thiết lập điều khoản với 2 tab: "Chỉnh sửa" và "Xem trước (Preview)".
