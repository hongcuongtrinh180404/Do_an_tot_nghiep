# Tiến độ khóa học theo số bài video hoàn thành

## Quy tắc

- Chỉ ghi nhận khi tồn tại enrollment chưa bị xóa của tài khoản hiện tại. Quyền admin, tác giả khóa học hoặc quyền xem thử không thay thế enrollment.
- `completedLessons` là số bài video đang có trạng thái `COMPLETED`; `totalLessons` là tổng số bài video chưa bị xóa thuộc các chương chưa bị xóa. Tài liệu và trailer không tham gia cả tử số lẫn mẫu số. Không ghi nhận hoàn thành tài liệu.
- Bài có câu hỏi tại thời điểm hợp lệ: hoàn thành khi đã lưu câu trả lời cho tất cả câu hỏi hiện tại, không yêu cầu trả lời đúng hoặc xem đủ thời gian. Bài không có câu hỏi hợp lệ: hoàn thành khi đã lưu sự kiện kết thúc phiên bản video hiện tại.
- Mỗi bài video có trọng số bằng nhau và chỉ được đếm một lần. Tỷ lệ = `completedLessons / totalLessons * 100`. Hiển thị lấy xuống hai chữ số thập phân, không làm tròn sớm thành 100%.
- Chỉ đạt `COMPLETED` khi có ít nhất một bài video và tất cả bài video đã hoàn thành. Nếu không có bài video, `progressPercent` là `null`, không tự hoàn thành.
- Tỷ lệ và trạng thái học được suy ra khi đọc/lưu, không lưu một bản phần trăm cố định. Thêm/xóa bài hoặc thay đổi yêu cầu quiz có thể làm tiến độ tăng/giảm theo trạng thái bài hiện tại.
- Dùng chung kết quả hoàn thành bài cho sidebar, tiến độ khóa học, hồ sơ công khai và điều kiện đánh giá (>20%). Truy vấn theo lô cho danh sách khóa học, không truy vấn riêng từng bài.
- Dữ liệu trả lời quiz/kết thúc video đã lưu vẫn có hiệu lực theo phiên bản hiện tại, không cần backfill. Không quy đổi thời gian xem cũ thành bài đã hoàn thành.
- `watchedMs` vẫn là thời gian thực tế đã phát, cộng cả xem lại và tất cả video trong khóa học. Không giới hạn số này ở thời lượng khóa học, nhưng **không dùng để tính tiến độ hoàn thành**.
- Không cộng thời gian tua qua, tạm dừng, buffering, ngủ thiết bị hoặc xem ngoại tuyến. Phát 2x trong 10 phút thực tế chỉ cộng 10 phút.
- Vẫn ghi nhận khi tab bị ẩn nhưng video tiếp tục phát.
- Tổng thời lượng chỉ dùng cho thông tin video. Nếu không có video hoặc còn thiếu thời lượng video, `totalDurationMs` là `null`, không ảnh hưởng đến phép tính % theo số bài.
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
- Sau khi lưu câu trả lời hoặc kết thúc video thành công, frontend tải lại số bài hoàn thành cho khóa học và danh sách khóa đã mua. Phản hồi heartbeat đến muộn chỉ cập nhật dữ liệu phát video, không ghi đè kết quả hoàn thành mới hơn.

## Kiểm thử

```powershell
pnpm --filter share-lib build
pnpm --filter backend test -- src/modules/learning-progress/tests src/modules/profile/tests src/modules/review/tests/review.service.spec.ts
pnpm --filter backend exec tsx --tsconfig ../frontend/tsconfig.json --test ../frontend/src/features/course/tests/playback-clock.spec.ts ../frontend/src/features/course/tests/learning-progress-api.spec.ts ../frontend/src/features/course/tests/lesson-completion-api.spec.ts
pnpm --filter frontend exec vitest run src/features/course/tests/course-learning-progress.spec.tsx src/features/profile/tests/profile-course-card.spec.tsx
pnpm --filter backend build
pnpm --filter frontend build
```

Chạy thêm smoke test với MongoDB và tài khoản đã đăng ký trên môi trường triển khai. Nếu tắt `autoIndex`, cần tạo unique index trên collection mới trước khi cho phép ghi nhận.
