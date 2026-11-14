# Bộ khóa học demo Mindly

## Dữ liệu được tạo

- 48 khóa mới, 4 khóa cho mỗi danh mục đang có trong hệ thống.
- 4 giảng viên hiện có nhận 12 khóa/người; mỗi người có 6 cơ bản, 3 trung cấp, 3 nâng cao.
- Mỗi danh mục: 2 cơ bản, 1 trung cấp, 1 nâng cao; giá lần lượt 0, 2.000, 3.000, 4.000 VND.
- **Mỗi khóa đúng 1 chương, 1 bài video khoảng 7 phút.**
- Cùng nội dung video tiếng Việt: **Phương pháp học trực tuyến và thực hành hiệu quả**.
- Mỗi bài có transcript theo thời gian, summary, mindmap 7 nhánh, 7 câu quiz và tài liệu PDF.
- 48 ảnh bìa riêng, nguồn Pexels được lưu trong `sources.json` và ghi nhận trong mô tả khóa học.

`catalog.ts` chứa thông tin chủ đề của các khóa. `shared-lesson.json` là nguồn chính cho kịch bản, summary, mindmap và quiz của video dùng chung. `render.py` tạo giọng đọc tổng hợp và ghép video 7 phần, mỗi phần một phút. Không cần gọi pipeline AssemblyAI/Gemini khi nạp bộ demo này.

## Chạy

Chạy các lệnh trong thư mục `backend`, với MongoDB replica set, MinIO và API đang hoạt động. Cấu hình được đọc từ `backend/.env`.

```powershell
python -m pip install -r scripts/demo-catalog/requirements.txt
pnpm seed:catalog:prepare
pnpm seed:catalog:render
pnpm seed:catalog:import
pnpm seed:catalog:verify
```

Python mặc định dùng font Arial trên Windows. Có thể đặt `PYTHON`, `DEMO_FONT`, `DEMO_FONT_BOLD` khi dùng môi trường khác. FFmpeg lấy từ dependency `ffmpeg-static` hiện có. Khâu tạo giọng đọc cần Internet; nội dung được lưu đệm để chạy lại.

Tất cả media, manifest trung gian và báo cáo kiểm tra nằm trong `.cache/demo-catalog/`, đã được gitignore. Ảnh, MP4 và PDF được tải lên MinIO khi import.

## Cách nạp và kiểm tra

- ID ổn định theo `mindly-demo-catalog-v1`, slug và vị trí chương/bài; chạy lại cập nhật bộ demo tương ứng, không tạo thêm bản trùng.
- Bộ nạp đối chiếu 12 danh mục và 4 tài khoản giảng viên đang hoạt động trước khi ghi dữ liệu.
- Kiểm tra điều kiện xuất bản bằng `buildCourseApprovalChecklist` rồi ghi toàn bộ dữ liệu trong một transaction.
- Nội dung video giống nhau nhưng mỗi khóa có object key riêng để tương thích với vòng đời xóa media hiện tại.
- SHA-256 giúp bỏ qua tài nguyên đã tải lên đúng nội dung.
- `verify` kiểm tra số lượng, giá, cấp độ, phân công, 1 chương/1 bài, thời lượng, quiz, hash và quyền truy cập 144 tài nguyên, cùng API chi tiết của cả 48 khóa.
- Báo cáo kết quả: `.cache/demo-catalog/verification.json`.

## Bài video bổ sung không xem thử

Sau khi chạy phần mở rộng, mỗi khóa có **1 chương, 2 bài video**:

1. Bài 7 phút hiện có vẫn là bài xem thử công khai.
2. **Cách mạng tháng Tám – Tóm tắt nhanh lịch sử Việt Nam**, tác giả **EZ Sử**, video do người dùng cung cấp, dài khoảng **8 phút 55 giây**. Bài này đặt `isPreview: false`; 36 khóa có phí yêu cầu sở hữu sau thanh toán, 12 khóa giá 0 yêu cầu đăng ký miễn phí.

```powershell
pnpm seed:catalog:locked:prepare "D:\path\to\source.mp4"
pnpm seed:catalog:locked:generate
pnpm seed:catalog:locked:import
pnpm seed:catalog:locked:verify
pnpm seed:catalog:verify
```

- File gốc không bị thay đổi. FFmpeg tạo bản H.264/AAC 1080p và âm thanh mono để trích transcript.
- AssemblyAI chỉ trích lời thoại một lần; nội dung summary, mindmap, 10 quiz được tạo từ transcript một lần rồi dùng cho 48 bài mới.
- Cần đọc và kiểm tra `.cache/demo-catalog/enrolled/learning-content.json` trước khi import.
- Video mới nằm trong bucket riêng tư `MINIO_PRIVATE_BUCKET_NAME` (mặc định `<MINIO_BUCKET_NAME>-private`), không có anonymous policy. Không chuyển bucket ảnh và bài xem thử sang riêng tư.
- Mỗi khóa có object key riêng để xóa bài của một khóa không làm hỏng khóa khác. Nội dung được upload một lần rồi sao chép trong MinIO.
- API chỉ tạo URL ký tạm thời sau khi kiểm tra quyền truy cập bài học. Endpoint ký URL theo key cũng kiểm tra quyền; transcript, summary, mindmap và quiz áp dụng cùng chính sách.
- Bộ nạp chỉ thêm vào 48 khóa có `seedBatch: mindly-demo-catalog-v1`. Giữ nguyên chương, bài cũ, ảnh bìa, học phí, cấp độ và phân công giảng viên. Dữ liệu mới mang `seedBatch: mindly-demo-enrolled-lesson-v1`, ID ổn định để không sinh bản trùng.
- Snapshot trước thay đổi, file xử lý và báo cáo kiểm tra nằm trong `.cache/demo-catalog/enrolled/`, không đưa video/transcript riêng vào Git.
- Sau khi đã có phần mở rộng, `seed:catalog:import` sẽ từ chối nạp lại phần gốc để tránh ghi đè mô tả thành một bài; dùng các lệnh `locked:*` cho phần bổ sung.
