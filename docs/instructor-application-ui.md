# Giao diện đăng ký giảng viên

## Điểm vào

- CTA trước footer: khách → `/register`; đã đăng nhập → `/become-instructor`.
- Footer: “Trở thành giảng viên” → `/become-instructor`.
- Menu tài khoản học viên (desktop/mobile): mục đăng ký nằm ngay trước Đăng xuất. Trạng thái chờ duyệt hoặc bị từ chối mở thẳng khu vực đăng ký.
- Giảng viên hiện hữu vào `/become-instructor` sẽ được chuyển tới `/courses`; Admin tới `/admin/dashboard`.

## Phạm vi hiện tại

Trang giới thiệu, công cụ giảng dạy minh họa, điều kiện/quy trình và giao diện ba trạng thái:

- `not-applied`: chưa đăng ký.
- `pending`: chờ duyệt; không có thao tác gửi yêu cầu mới.
- `rejected`: kết quả và lý do từ chối; có thao tác đăng ký lại.

Nút đăng ký của khách mở trang đăng nhập với `next=/become-instructor#registration`.
Đăng nhập bằng mật khẩu hoặc Google sẽ quay lại khu vực đăng ký. Liên kết chuyển giữa
đăng nhập và tạo tài khoản cũng giữ đích quay lại.

Biểu mẫu hiện là khung thông báo để phát triển tiếp. Chưa có endpoint gửi đơn hay
lưu trạng thái; thao tác mở khung không gửi yêu cầu và không tạo kết quả thành công.

## Xem trước trạng thái

Chạy frontend ở chế độ development và đăng nhập tài khoản **học viên**:

- `/become-instructor?preview=not-applied#registration`
- `/become-instructor?preview=pending#registration`
- `/become-instructor?preview=rejected#registration`

Thanh xem trước cho phép chuyển giữa ba giao diện. Ngày gửi, ngày phản hồi, ghi chú
từ chối là dữ liệu mẫu. Query `preview` bị bỏ qua trong production và với các vai trò khác.

Khi bổ sung backend, thay adapter trong
`frontend/src/features/instructor-application/hooks/use-instructor-application.ts`
bằng truy vấn yêu cầu của tài khoản, đồng thời nối biểu mẫu và thao tác đăng ký lại.

## Kiểm tra

```powershell
# Từ frontend/
pnpm exec vitest run src/features/auth/tests/auth-return-path.spec.ts src/features/instructor-application/tests/application-preview.spec.ts

# Từ thư mục gốc, với frontend đang chạy
node frontend/scripts/test-instructor-application-browser.mjs

# Với bản production chạy ở cổng khác
$env:INSTRUCTOR_ORIGIN = 'http://localhost:3100'
$env:INSTRUCTOR_PREVIEW = 'false'
node frontend/scripts/test-instructor-application-browser.mjs
```

Browser test chặn request API bằng fixture, không thay đổi tài khoản hay dữ liệu thật.
