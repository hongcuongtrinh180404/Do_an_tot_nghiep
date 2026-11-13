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
