# Course Management — Development History & Gotchas

> **Module:** Course Management

---

## 1. Milestone & Feature Status

- **Trạng thái hiện tại:** `PLANNING` (Đã thiết kế kiến trúc và định dạng dữ liệu).
- **Kế hoạch triển khai:** Sprint 1 (Giai đoạn 3: Cài đặt & Lập trình).

---

## 2. Technical Notes & Gotchas

- **Slug Generation**: Cần tạo slug thân thiện với SEO từ tiếng Việt có dấu (ví dụ: `lap-trinh-nestjs-co-ban`). Cần đảm bảo tính duy nhất bằng cách đính kèm short ID hoặc số thứ tự nếu trùng lặp.
- **Nested Population Guard**: Không dùng cascading `.populate()` đa tầng từ Course -> Chapters -> Lessons. Thay vào đó dùng Aggregation Pipeline `$lookup` có `$project` tường minh các trường cần thiết để đảm bảo hiệu năng cao.
