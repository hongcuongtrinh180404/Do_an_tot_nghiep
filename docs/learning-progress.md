# Tiến độ học tập theo thời gian phát thực tế

## Quy tắc

- Chỉ ghi nhận khi tồn tại enrollment chưa bị xóa của tài khoản hiện tại. Quyền admin, tác giả khóa học hoặc quyền xem thử không thay thế enrollment.
- `watchedMs` là thời gian thực tế đã phát, cộng cả xem lại và tất cả video trong khóa học. Không giới hạn số này ở thời lượng khóa học.
- Không cộng thời gian tua qua, tạm dừng, buffering, ngủ thiết bị hoặc xem ngoại tuyến. Phát 2x trong 10 phút thực tế chỉ cộng 10 phút.
- Vẫn ghi nhận khi tab bị ẩn nhưng video tiếp tục phát.
- Tổng thời lượng chỉ gồm video chưa bị xóa thuộc các chương chưa bị xóa. Tài liệu và trailer không tham gia.
- Tỷ lệ = `min(100, watchedMs / totalDurationMs * 100)`. Hiển thị lấy xuống hai chữ số thập phân, không làm tròn sớm thành 100%.
- Tỷ lệ và trạng thái học được suy ra khi đọc/lưu, không lưu một bản phần trăm cố định. Thêm/xóa/đổi video có thể làm trạng thái chuyển từ `COMPLETED` về `IN_PROGRESS` và ngược lại; thời gian hợp lệ trước đó được giữ nguyên.
- Nếu không có video hoặc còn thiếu thời lượng video, `totalDurationMs` và `progressPercent` là `null`, không tự hoàn thành.
- Vị trí tiếp tục (`lastLessonId`, `lastPositionSeconds`) độc lập với thời gian tích lũy. Khi video đã bị xóa/thay nguồn, không trả về con trỏ cũ.

## API

Các đường dẫn dưới đây nằm sau `/api/v1`, yêu cầu Bearer token. User ID luôn lấy từ JWT, không nhận từ request body.

| Phương thức | Đường dẫn | Nội dung |
| --- | --- | --- |
| GET | `/learning-progress/my-courses` | Tiến độ các khóa đã đăng ký, truy vấn theo lô |
| GET | `/learning-progress/courses/:courseId` | Tiến độ hoặc `null` nếu chưa đăng ký |
| POST | `/learning-progress/courses/:courseId/sessions` | `{ sessionId: UUID v4, lessonId: ObjectId }` |
| POST | `/learning-progress/courses/:courseId/heartbeat` | `{ sessionId, sequence, watchedMs, positionSeconds }` |
| POST | `/learning-progress/courses/:courseId/end` | Cùng payload heartbeat, lưu cuối và nhả khóa |

`watchedMs` trong request là tổng cộng dồn **của phiên**, không phải tổng của khóa học và không phải vị trí phát. `sequence` tăng dần trong phiên. Gửi lại một request hoặc nhận sai thứ tự không cộng trùng và không ghi đè vị trí mới bằng vị trí cũ.

## Đồng thời và lưu trữ

- Collection `learning_progress` có unique index `{ userId: 1, courseId: 1 }`; được tạo khi bắt đầu phát lần đầu, không cần backfill enrollment cũ.
- Một lease 45 giây cho mỗi tài khoản–khóa học. Tab/thiết bị khác không thể ghi nhận đồng thời và player sẽ dừng kèm thông báo. Pause/end nhả lease ngay; phiên bị bỏ dở tự hết hạn.
- Lease, số thứ tự, tổng thời gian và vị trí được ghi nguyên tử bằng compare-and-set theo `revision`. Không dựa vào bộ nhớ một tiến trình hoặc khóa localStorage.
- Máy chủ giới hạn phần cộng theo thời gian thực đã trôi qua. Các kiểm tra này chống cộng trùng/sai số, không chứng minh học viên đang chú ý hoặc chống được mọi giả mạo trình duyệt.
- Frontend dùng đồng hồ đơn điệu, kiểm tra video có tiến triển, gửi mỗi 15 giây và khi dừng/kết thúc/chuyển bài/rời trang. Khi rời trang dùng `fetch(..., { keepalive: true })` có Bearer header.
- Chỉ hỗ trợ trực tuyến. Tiến độ đã được máy chủ xác nhận luôn giữ nguyên; mất mạng, tắt cưỡng bức hoặc hệ điều hành dừng tiến trình có thể làm mất phần chưa xác nhận. Không phát lại hàng đợi thời gian offline.
- Frontend đọc lại khi đổi tab, kết nối lại và mỗi 30 giây khi trang đang mở. Khóa cache chứa user ID, không dùng chung tiến độ giữa các tài khoản.

## Kiểm thử

```powershell
pnpm --filter share-lib build
pnpm --filter backend test -- src/modules/learning-progress/tests
pnpm --filter backend exec tsx --tsconfig ../frontend/tsconfig.json --test ../frontend/src/features/course/tests/playback-clock.spec.ts ../frontend/src/features/course/tests/learning-progress-api.spec.ts
pnpm --filter backend build
pnpm --filter frontend build
```

Chạy thêm smoke test với MongoDB và tài khoản đã đăng ký trên môi trường triển khai. Nếu tắt `autoIndex`, cần tạo unique index trên collection mới trước khi cho phép ghi nhận.
