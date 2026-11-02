# Kế Hoạch: Khắc Phục Lỗi Sinh Sơ Đồ Mindmap Do Vượt Quá Độ Sâu Cây (Fix Mindmap Tree Depth Validation Error)

> **Mục tiêu:**
> Xử lý triệt để lỗi không thể tạo Mindmap khi phân tích AI (`Cấu trúc cây Mindmap không hợp lệ: Node ... ở level 4 (level tối đa: 4) không được có node con thêm.; Cây mindmap vượt quá độ sâu tối đa cho phép (tối đa 4 level). Node vi phạm: ... tại level 5.`).
> Đảm bảo quy trình sinh sơ đồ tư duy hoạt động ổn định 100%, không bị gián đoạn ngay cả khi mô hình Gemini phân rã dữ liệu sâu hơn 4 cấp đối với các bài học có nội dung kiến thức phong phú (như Trận Bạch Đằng).
>
> **Task Slug:** `fix-mindmap-depth`  
> **Plan File:** `docs/PLAN-fix-mindmap-depth.md`  
> **Project Type:** `BACKEND (NestJS + MongoDB + Google Gemini API)`  
> **Primary Agent:** `project-planner`  
> **Assigned Agents:** `backend-specialist`, `clean-code`  

---

## 1. Phân Tích Nguyên Nhân Gốc Rễ (Root Cause Analysis)

### 1.1. Hiện Tượng & Thông Báo Lỗi
Tại trang chi tiết bài học của giảng viên (`/instructor/courses/:id/lessons/:lessonId`), khi bấm **"Sinh Mindmap bằng AI"**, hệ thống báo lỗi:
```text
Cấu trúc cây Mindmap không hợp lệ: Node "Đặc điểm sông Bạch Đằng" ở level 4 (level tối đa: 4) không được có node con thêm.; Cây mindmap vượt quá độ sâu tối đa cho phép (tối đa 4 level). Node vi phạm: "Dài hơn 20 km, giữa Quảng Ninh và Hải Phòng" tại level 5.; Cây mindmap vượt quá độ sâu tối đa cho phép (tối đa 4 level). Node vi phạm: "Giao nhau của sông Giá, sông Chanh, sông Đá Bạc" tại level 5.; Cây mindmap vượt quá độ sâu tối đa cho phép (tối đa 4 level). Node vi phạm: "Cửa biển thuận lợi nhất từ biển Đông vào nước ta" tại level 5.; Node "Địa hình hai bên: rừng cây, núi đá vôi, kênh rạch" ở level 4 (level tối đa: 4) không được có node con thêm.; Cây mindmap vượt quá độ sâu tối đa cho phép (tối đa 4 level). Node vi phạm: "Thích hợp để mai phục" tại level 5.; ...
```

### 1.2. Cơ Chế Phát Sinh Lỗi Trong Mã Nguồn
1. **Prompt Gemini yêu cầu tối đa 4 level nhưng cũng bắt buộc phân tách thông tin cốt lõi:**
   - File: `backend/src/modules/transcript-analysis/services/mindmap-analysis.service.ts` (`buildMindmapPrompt`).
   - Mục I quy định: Cây tối đa 4 level (Level 1 Root -> Level 2 Chủ đề -> Level 3 Ý chi tiết -> Level 4 Chi tiết cụ thể/Từ khóa).
   - Tuy nhiên, Mục III lại quy định: *"BẮT BUỘC TÁCH thành node riêng đối với các thông tin mang giá trị cốt lõi: Chủ đề chính, Cơ chế hoạt động, Điều kiện tiên quyết, Các bước trong quy trình..."*.
   - Với bài học có diễn biến phức tạp như **Trận Bạch Đằng năm 938**, Gemini đã phân cấp theo logic ngữ nghĩa:
     - Level 1: Tên bài học.
     - Level 2: Giai đoạn / Kế sách chuẩn bị.
     - Level 3: Nghiên cứu địa hình & Bố phòng sông Bạch Đằng.
     - Level 4: "Đặc điểm sông Bạch Đằng", "Địa hình hai bên...", "Thủy triều dao động mạnh...".
     - Level 5: Các dữ kiện cụ thể (chiều dài >20km, hợp lưu các sông, cửa ngõ biển Đông, địa hình mai phục...).
2. **Kiểm Tra Cứng (Hard Validation) Thiếu Lớp Phòng Thủ Tự Động:**
   - Tại `mindmap-analysis.service.ts` dòng 222:
     ```typescript
     MindmapValidator.validateOrFail(geminiResult.data, durationSeconds, 3);
     ```
   - Trong `mindmap.validator.ts`, `maxDepth = 3` (tương ứng 4 level tính từ 0). Khi gặp node ở Level 4 có `children` hoặc node ở Level 5 (`currentDepth > maxDepth`), validator gom toàn bộ lỗi và ném ra `UnprocessableEntityException` (HTTP 422).
   - Hệ thống **thiếu hoàn toàn bước Auto-Pruning / Sanitization** (cắt tỉa hoặc làm phẳng các cấp vượt trần). Vì Gemini là mô hình sinh ngôn ngữ tự nhiên xác suất, việc chỉ dựa vào prompt không thể đảm bảo 100% LLM không sinh thêm nhánh con ở các bài giảng chi tiết.
3. **Mâu Thuẫn Kiến Trúc Giữa Backend và Frontend:**
   - **Frontend** (`LessonMindmapCanvasView` + Dagre layout) đã được thiết kế mở rộng tiệm tiến (Progressive Disclosure): tự động thu gọn 2 cấp đầu, hiển thị badge `+{childCount}` cho phép xem cây ở **bất kỳ độ sâu nào** mà không vỡ giao diện.
   - Khi giảng viên tự tay chỉnh sửa (`updateMindmap`), Backend cho phép độ sâu lên tới **20 level** (`MindmapValidator.validateOrFail(dto.mindmap, durationSeconds, 20)`).
   - Việc giới hạn cứng 4 level khi AI sinh gây ra điểm nghẽn nghiêm trọng (Single Point of Failure) cho các bài học có hàm lượng kiến thức cao.

---

## 2. Giải Pháp Đề Xuất (Architecture & Implementation Plan)

### Nguyên Tắc Cốt Lõi: Phòng Thủ Nhiều Lớp (Defense in Depth)
1. **Nâng trần cấu trúc hợp lý (Level 5 / `maxDepth = 4`)**:
   - Level 1: Tên bài giảng (Root).
   - Level 2: Phân đoạn / Chủ đề lớn.
   - Level 3: Ý chính / Cơ chế / Kế sách.
   - Level 4: Khái niệm cụ thể / Địa bàn / Nhân vật / Diễn biến.
   - Level 5: Dữ kiện chi tiết, số liệu, từ khóa cốt lõi hoặc ví dụ minh họa (nhánh lá cuối cùng).
2. **Cơ chế Auto-Pruning / Sanitizer Bắt Buộc (Fail-safe)**:
   - Trước khi gọi `MindmapValidator.validateOrFail()`, hệ thống tự động chạy `MindmapSanitizer.pruneExcessDepth(tree, maxAllowedDepth)`.
   - Nếu LLM sinh ra nhánh sâu hơn độ sâu cho phép (ví dụ Level 6, 7), Sanitizer sẽ tự động cắt tỉa phần con thừa hoặc gộp tóm tắt vào node cha ở cấp tối đa mà **không bao giờ ném lỗi 422 làm gián đoạn người dùng**.
3. **Đồng Bộ Prompt & Validator**:
   - Cập nhật hướng dẫn trong `buildMindmapPrompt` phản ánh rõ ràng cấu trúc 5 level.
   - Cập nhật test case bảo đảm độ bao phủ 100%.

---

## 3. Lộ Trình Triển Khai (Phased Roadmap)

### Phase 1: Xây Dựng Tiện Ích Auto-Pruning / Sanitizer Cho Cây Mindmap
- **File:** `backend/src/modules/transcript-analysis/validators/mindmap.sanitizer.ts` (hoặc tích hợp trong `MindmapValidator`)
- **Nhiệm vụ:**
  - Viết hàm `sanitizeMindmapTree(data: ILessonMindmapData, maxDepth = 4): ILessonMindmapData`.
  - Duyệt đệ quy cây:
    - Khi `currentDepth === maxDepth`, xóa bỏ hoàn toàn thuộc tính `children` của node đó (hoặc đặt `children = undefined`), biến nó thành node lá an toàn.
    - Cắt bỏ mọi node có `currentDepth > maxDepth`.
    - Làm sạch khoảng trắng (`trim`) và chuẩn hóa id nếu thiếu.

### Phase 2: Cập Nhật Giới Hạn Độ Sâu Trong MindmapAnalysisService & MindmapValidator
- **Files:**
  - `backend/src/modules/transcript-analysis/services/mindmap-analysis.service.ts`
  - `backend/src/modules/transcript-analysis/validators/mindmap.validator.ts`
- **Nhiệm vụ:**
  - Trong `MindmapAnalysisService.generateMindmap`:
    - Cho phép sinh sơ đồ đến 5 level (`maxDepth = 4`).
    - Chạy sanitize trước khi validate:
      ```typescript
      const sanitizedMindmap = MindmapValidator.sanitize(geminiResult.data, 4);
      MindmapValidator.validateOrFail(sanitizedMindmap, durationSeconds, 4);
      ```
  - Cập nhật `buildMindmapPrompt`:
    - Bổ sung định nghĩa rõ ràng cho 5 Level (Level 1: Root -> Level 2: Chủ đề chính -> Level 3: Ý triển khai -> Level 4: Chi tiết -> Level 5: Từ khóa / Dữ kiện cốt lõi).

### Phase 3: Cập Nhật & Mở Rộng Bộ Kiểm Thử Đơn Vị (Unit Tests)
- **Files:**
  - `backend/src/modules/transcript-analysis/tests/mindmap.validator.spec.ts`
  - `backend/src/modules/transcript-analysis/tests/mindmap-analysis.service.spec.ts`
- **Nhiệm vụ:**
  - Test trường hợp cây có 5 level hợp lệ (`maxDepth = 4`).
  - Test cơ chế Auto-Sanitizer tự động cắt tỉa khi cây có 6 level trở lên mà không ném ngoại lệ.
  - Test regression các bài test hiện có để bảo đảm 100% pass.

### Phase 4: Ghi Nhật Ký Phát Triển & Living Docs
- **File:** `a-agentic/features/ai-video-pipeline/dev-history.md`
- **Nhiệm vụ:**
  - Ghi lại bản tin Dev History: Phân tích root cause lỗi độ sâu cây Mindmap từ bài học Bạch Đằng, kiến trúc Auto-Sanitizer và việc nâng trần lên 5 level.

---

## 4. Danh Sách Tệp Tác Động (Impacted Files)

| STT | Tệp tin | Thao tác | Mục đích |
| :---: | :--- | :---: | :--- |
| 1 | `backend/src/modules/transcript-analysis/validators/mindmap.validator.ts` | Cập nhật | Thêm hàm `sanitize()` cắt tỉa cây an toàn và hỗ trợ `maxDepth = 4` mặc định |
| 2 | `backend/src/modules/transcript-analysis/services/mindmap-analysis.service.ts` | Cập nhật | Áp dụng sanitize trước khi validate, cập nhật prompt 5 level |
| 3 | `backend/src/modules/transcript-analysis/tests/mindmap.validator.spec.ts` | Cập nhật | Thêm test case cho 5 level và kiểm tra auto-pruning |
| 4 | `backend/src/modules/transcript-analysis/tests/mindmap-analysis.service.spec.ts` | Cập nhật | Kiểm tra luồng `generateMindmap` qua sanitize và validate an toàn |
| 5 | `a-agentic/features/ai-video-pipeline/dev-history.md` | Cập nhật | Lưu vết tài liệu kỹ thuật theo quy tắc dự án |

---

## Phase X: Tiêu Chí Nghiệm Thu (Verification Checklist)

- [ ] Lỗi 422 `Cấu trúc cây Mindmap không hợp lệ: Node ... ở level 4 không được có node con thêm` biến mất hoàn toàn.
- [ ] Bấm "Sinh Mindmap bằng AI" cho bài học Bạch Đằng (`6ae59437cc8ea03631319823`) tạo thành công sơ đồ tư duy đầy đủ chi tiết và lưu vào cơ sở dữ liệu.
- [ ] Cây Mindmap hiển thị mượt mà trên Canvas 2D (`LessonMindmapCanvasView`), hoạt động thu gọn/mở rộng tiệm tiến (`+{count}`) bình thường.
- [ ] Nếu LLM sinh ra cây vượt quá cấp độ cho phép, cơ chế `sanitize` tự động cắt tỉa an toàn mà không làm sập ứng dụng.
- [ ] 100% Unit Tests trong `transcript-analysis` chạy thành công (`pnpm test:run`).
- [ ] Không sử dụng kiểu `any`, tuân thủ nghiêm ngặt các quy tắc kiến trúc của dự án.

