# PLAN: Triển Khai Tính Năng Upload Tài Liệu Đính Kèm Thật Sự & Kế Thừa Quyền Xem Cho Bài Học Video

> **Mục tiêu:** Xây dựng luồng tải lên tài liệu học tập thật sự (Full-stack Integration) kết nối giữa Frontend Modal, MinIO Storage, Backend NestJS và MongoDB; kế thừa quyền xem học thử/khóa theo video cha trong thời gian thực; và hiển thị danh sách tài liệu tương tác (mở, tải về, xóa) tại Contextual Inspector Panel.
>
> **Task Slug:** `lesson-materials-upload`
> **Plan File:** `docs/PLAN-lesson-materials-upload.md`
> **Project Type:** `WEB` + `BACKEND`
> **Assigned Agents:** `project-planner` (lập kế hoạch), `backend-specialist` (API & Storage), `frontend-specialist` (UI & Inspector)
> **Assigned Skills:** `api-patterns`, `database-design`, `clean-code`, `frontend-design`, `tailwind-patterns`

---

## 1. Quyết Định Thiết Kế & Quy Tắc Nghiệp Vụ (Business Rules)

### 1.1. Kế Thừa Quyền Xem Thời Gian Thực (Real-Time Access Inheritance)
- Giảng viên **không cần chọn lại** trạng thái miễn phí cho từng tài liệu tải lên.
- Quyền truy cập của tài liệu **luôn phản ánh trạng thái hiện tại của bài học video cha (`lesson.isPreview`)**:
  - Video cha đang bật *"Cho phép học thử"* (`lesson.isPreview === true`): Tài liệu đính kèm tự động mang trạng thái **Miễn phí / Học thử** (hiển thị icon ổ khóa xanh mở `lucide:lock-open` kèm badge xanh lá).
  - Video cha đang *"Bị khóa / Cần mua"* (`lesson.isPreview === false`): Tài liệu đính kèm tự động mang trạng thái **Đã khóa** (hiển thị icon ổ khóa xám/vàng `lucide:lock` kèm badge cảnh báo).
- Khi giảng viên chuyển đổi cờ `isPreview` của bài học video, toàn bộ tài liệu trực thuộc bài học đó tự động đồng bộ trạng thái ngay lập tức mà không cần sửa đổi dữ liệu từng tài liệu.

### 1.2. Thao Tác Tải Về (Download)
- Icon nút Tải về (`lucide:download`) liên kết trực tiếp tới URL công khai của tệp trên MinIO Storage, hỗ trợ mở trực tiếp trong tab mới hoặc kích hoạt tải tệp của trình duyệt.

### 1.3. Thao Tác Xóa Tài Liệu (Delete with Safety Confirmation)
- Khi bấm icon thùng rác màu đỏ (`lucide:trash-2`), hệ thống hiển thị **AlertDialog xác nhận xóa** (tương tự như thiết kế xóa chương học).
- Sau khi giảng viên xác nhận: Backend thực hiện xóa mềm/gỡ tài liệu khỏi mảng `materials` của `LessonEntity` trong MongoDB và đồng thời dọn dẹp vật lý tệp tin tương ứng trên MinIO Storage thông qua `storageService.deleteFile()`.

---

## 2. Thiết Kế Hợp Đồng Dữ Liệu (Data Contracts & Schema)

### 2.1. Thư Viện Chung (`share-lib`)
Bổ sung interface `ILessonMaterial` và cập nhật `ILesson`:
```typescript
// share-lib/src/interfaces/lesson.interface.ts

export interface ILessonMaterial {
  id: string;
  title: string;
  url: string;
  fileName: string;
  fileSize?: number | null;
  mimeType?: string | null;
  publicId?: string | null;
  createdAt: Date | string;
}

export interface ILesson {
  id: string;
  sectionId: string;
  title: string;
  description?: string | null;
  order: number;
  content?: ILessonContent | null;
  materials?: ILessonMaterial[]; // Mảng tài liệu đính kèm của bài học
  isPreview: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;
  createdById?: string | null;
  updatedById?: string | null;
}
```

### 2.2. Mongoose Schema (`backend/src/modules/course/schemas/lesson.schema.ts`)
Khai báo Subdocument `LessonMaterialEntity`:
```typescript
@Schema({ _id: true, timestamps: { createdAt: true, updatedAt: false } })
export class LessonMaterialEntity {
  @Prop({ type: String, required: true, trim: true })
  title: string;

  @Prop({ type: String, required: true })
  url: string;

  @Prop({ type: String, required: true })
  fileName: string;

  @Prop({ type: Number, required: false, default: null, min: 0 })
  fileSize?: number;

  @Prop({ type: String, required: false, default: null })
  mimeType?: string;

  @Prop({ type: String, required: false, default: null })
  publicId?: string;
}

export const LessonMaterialSchema = SchemaFactory.createForClass(LessonMaterialEntity);

// Trong LessonEntity:
@Prop({ type: [LessonMaterialSchema], default: [] })
materials: LessonMaterialEntity[];
```

### 2.3. Mở Rộng MIME Types Cho MinIO Storage (`storage.constants.ts` & `pipes`)
Hỗ trợ đầy đủ các định dạng theo yêu cầu:
- PDF: `application/pdf`
- Word: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/msword`
- Excel: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `application/vnd.ms-excel`
- PowerPoint: `application/vnd.openxmlformats-officedocument.presentationml.presentation`, `application/vnd.ms-powerpoint`
- Nén: `application/zip`, `application/x-zip-compressed`, `application/vnd.rar`, `application/x-rar-compressed`, `application/octet-stream`
- Văn bản: `text/plain`
- Giới hạn dung lượng: ≤ 100MB cho tài liệu đính kèm.

---

## 3. Thiết Kế API Backend

### 3.1. Endpoint 1: Tải Lên & Đính Kèm Tài Liệu
- **Route:** `POST /api/v1/lessons/:id/materials`
- **Method:** `POST`
- **Content-Type:** `multipart/form-data`
- **Body:**
  - `file`: Tệp tài liệu (Multer file)
  - `title`: Tên tài liệu (string, optional - nếu trống tự lấy `file.originalname`)
- **Quyền:** `@Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)`
- **Xử lý nghiệp vụ:**
  1. Kiểm tra tồn tại và quyền sở hữu bài học (IDOR check).
  2. Upload tệp lên MinIO bucket `thc-datn-media` trong thư mục `courses/lessons/materials`.
  3. Thêm phần tử mới vào mảng `materials` của `LessonEntity` bằng toán tử `$push`.
  4. Trả về `ApiResponse.success(updatedLesson, 'Đính kèm tài liệu thành công')`.

### 3.2. Endpoint 2: Xóa Tài Liệu Đính Kèm
- **Route:** `DELETE /api/v1/lessons/:id/materials/:materialId`
- **Method:** `DELETE`
- **Quyền:** `@Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)`
- **Xử lý nghiệp vụ:**
  1. Kiểm tra tồn tại bài học và quyền sở hữu (IDOR check).
  2. Tìm kiếm phần tử tài liệu `materialId` trong `lesson.materials`.
  3. Gỡ phần tử khỏi mảng bằng toán tử `$pull: { materials: { _id: materialObjectId } }`.
  4. Xóa tệp vật lý trên MinIO Storage qua `storageService.deleteFile(material.url)`.
  5. Trả về `ApiResponse.success(updatedLesson, 'Xóa tài liệu thành công')`.

---

## 4. Thiết Kế Giao Diện Frontend (Frontend UI & Inspector Panel)

### 4.1. Đấu Nối API Trong `UploadLessonDocDialog`
- Thay thế mock toast bằng việc gọi API mutation `useUploadLessonMaterialMutation`.
- Khi người dùng bấm [ Tải lên ]:
  - Nút chuyển sang trạng thái loading với spinner xoay `lucide:loader-2` và label *"Đang tải lên..."*.
  - Disable nút [ Hủy ] và các ô nhập liệu trong suốt quá trình upload.
  - Khi thành công: Bắn toast xanh thông báo thành công, làm mới cache bài học (`invalidateQueries`), đóng modal và reset form.
  - Khi thất bại: Bắn toast đỏ thông báo lỗi chi tiết, giữ nguyên form để người dùng có thể thử lại.

### 4.2. Hiển Thị Danh Sách Tài Liệu Tại `ContextualInspectorPanel`
Tại khối *"Tài liệu riêng của bài"*:
1. **Trạng thái rỗng (`materials.length === 0`):**
   - Giữ nguyên thông báo: *"Không có tài liệu riêng cho bài học này."*
2. **Trạng thái có tài liệu (`materials.length > 0`):**
   - Ẩn thông báo rỗng.
   - Hiển thị danh sách các thẻ tài liệu dạng dòng ngắn gọn với phân loại màu sắc icon thông minh:
     - **File PDF (`.pdf`):** Icon `lucide:file-text` màu đỏ (`bg-rose-500/10 text-rose-600 dark:text-rose-400`).
     - **File Nén (`.zip`, `.rar`):** Icon `lucide:archive` màu vàng/amber (`bg-amber-500/10 text-amber-600 dark:text-amber-400`).
     - **File Office (`.docx`, `.pptx`, `.xlsx`):** Icon `lucide:file-spreadsheet` hoặc `lucide:file-text` màu xanh lam (`bg-sky-500/10 text-sky-600 dark:text-sky-400`).
     - **File khác / Text (`.txt`):** Icon `lucide:file` màu xám (`bg-slate-500/10 text-slate-600 dark:text-slate-400`).
   - **Thông tin tệp:** Tên tài liệu in đậm nhẹ, dung lượng định dạng (ví dụ: `Slide-Vong-For.pdf • 2.4 MB`).
   - **Trạng thái khóa/mở (kế thừa từ video cha):**
     - Video được học thử: Icon ổ khóa xanh mở `lucide:lock-open` kèm nhãn *"Học thử"* (`bg-emerald-500/10 text-emerald-700 dark:text-emerald-400`).
     - Video bị khóa: Icon ổ khóa xám/vàng `lucide:lock` kèm nhãn *"Đã khóa"* (`bg-muted text-muted-foreground`).
   - **Cụm nút hành động:**
     - Nút Tải về (`lucide:download`): Hover chuyển xanh, mở URL tệp để tải về.
     - Nút Xóa tài liệu (`lucide:trash-2`): Màu đỏ cảnh báo, hover nền đỏ nhạt.
3. **Modal Xác Nhận Xóa Tài Liệu (`DeleteMaterialConfirmDialog`):**
   - Mở khi bấm icon thùng rác của tài liệu.
   - Cảnh báo rõ tên tài liệu sắp bị xóa vĩnh viễn khỏi hệ thống và MinIO.
   - Nút [ Xác nhận xóa ] gọi mutation xóa và tự động cập nhật danh sách hiển thị.

---

## 5. Danh Sách File Ảnh Hưởng (File Structure)

```plaintext
share-lib/
└── src/
    └── interfaces/
        └── lesson.interface.ts                   # [CẬP NHẬT] Thêm ILessonMaterial và mảng materials trong ILesson

backend/
└── src/
    └── modules/
        ├── storage/
        │   └── storage.constants.ts              # [CẬP NHẬT] Mở rộng MIME types cho tài liệu đính kèm (zip, rar, pptx, xlsx, txt)
        └── course/
            ├── schemas/
            │   └── lesson.schema.ts              # [CẬP NHẬT] Thêm LessonMaterialSchema và Prop materials
            ├── repositories/
            │   └── lesson.repository.ts          # [CẬP NHẬT] Mapper toDomain ánh xạ materials, hàm push/pull material
            ├── services/
            │   └── lesson.service.ts             # [CẬP NHẬT] Nghiệp vụ addMaterial và deleteMaterial
            ├── lessons.controller.ts             # [CẬP NHẬT] Endpoints POST/DELETE materials
            └── tests/
                └── lesson.service.spec.ts        # [CẬP NHẬT] Unit tests kiểm thử upload và xóa tài liệu

frontend/
└── src/
    └── features/
        └── course/
            ├── api/
            │   └── course.api.ts                 # [CẬP NHẬT] API clients & React Query mutations cho lesson materials
            └── components/
                ├── upload-lesson-doc-dialog.tsx  # [CẬP NHẬT] Đấu nối mutation upload thật sự vào nút [ Tải lên ]
                ├── delete-material-dialog.tsx    # [MỚI] Dialog xác nhận xóa tài liệu đính kèm
                └── contextual-inspector-panel.tsx# [CẬP NHẬT] Hiển thị danh sách tài liệu, màu icon, nút tải về và nút xóa
```

---

## 6. Phân Rã Công Việc Chi Tiết (Task Breakdown)

### Task 1: Cập Nhật Contract `share-lib` & Mongoose Schema Backend
- **Agent:** `backend-specialist`
- **Skill:** `database-design`, `clean-code`
- **Priority:** `P0`
- **Dependencies:** None
- **INPUT:** `share-lib/src/interfaces/lesson.interface.ts` và `backend/src/modules/course/schemas/lesson.schema.ts`.
- **OUTPUT:**
  - Định nghĩa interface `ILessonMaterial` và thuộc tính `materials?: ILessonMaterial[]` trong `ILesson`.
  - Khởi tạo `LessonMaterialSchema` nhúng vào `LessonEntity.materials`.
  - Cập nhật `LessonRepository.toDomain()` ánh xạ mảng `materials` an toàn.
  - Mở rộng danh sách MIME types hợp lệ trong `storage.constants.ts`.
- **VERIFY:** Build `share-lib` (`pnpm --filter share-lib build`) và type-check backend thành công.

---

### Task 2: Triển Khai Backend Services & Controllers (Upload & Delete Material)
- **Agent:** `backend-specialist`
- **Skill:** `api-patterns`, `clean-code`
- **Priority:** `P0`
- **Dependencies:** Task 1
- **INPUT:** `LessonService`, `LessonsController`, `StorageService`.
- **OUTPUT:**
  - Phương thức `LessonService.addMaterial(lessonId, file, title, userId)`: Upload lên MinIO qua `storageService`, lưu vào `materials` của bài học.
  - Phương thức `LessonService.deleteMaterial(lessonId, materialId, userId)`: Xóa phần tử khỏi MongoDB và xóa file trên MinIO.
  - Endpoints `POST /lessons/:id/materials` và `DELETE /lessons/:id/materials/:materialId` trong `LessonsController` có phân quyền `INSTRUCTOR` / `ADMIN`.
  - Unit tests bao phủ đầy đủ các trường hợp (thành công, bài học không tồn tại, file không hợp lệ).
- **VERIFY:** Chạy bộ test backend `pnpm --filter backend test` đạt 100% pass.

---

### Task 3: Xây Dựng Frontend API Client & React Query Hooks
- **Agent:** `frontend-specialist`
- **Skill:** `api-patterns`, `clean-code`
- **Priority:** `P1`
- **Dependencies:** Task 2
- **INPUT:** Các endpoints backend vừa tạo.
- **OUTPUT:**
  - `courseApi.uploadLessonMaterial(lessonId, formData)` và hook `useUploadLessonMaterialMutation(courseId)`.
  - `courseApi.deleteLessonMaterial(lessonId, materialId)` và hook `useDeleteLessonMaterialMutation(courseId)`.
  - Cơ chế tự động làm mới cache danh sách bài học và chi tiết bài học sau khi mutate.
- **VERIFY:** TypeScript compile frontend không có lỗi type.

---

### Task 4: Đấu Nối Upload Thật Sự Trong `UploadLessonDocDialog`
- **Agent:** `frontend-specialist`
- **Skill:** `frontend-design`, `clean-code`
- **Priority:** `P1`
- **Dependencies:** Task 3
- **INPUT:** Component `upload-lesson-doc-dialog.tsx`.
- **OUTPUT:**
  - Đóng gói `FormData` gồm `file` và `title`.
  - Kích hoạt `uploadMaterialMutation.mutateAsync`.
  - Hiển thị spinner và trạng thái disabled khi đang upload.
  - Xử lý thông báo thành công qua `toast.success` và lỗi qua `toast.error`.
- **VERIFY:** Thao tác tải tệp thực tế lưu thành công vào MinIO và cơ sở dữ liệu.

---

### Task 5: Nâng Cấp Giao Diện Danh Sách Tài Liệu Trong `ContextualInspectorPanel`
- **Agent:** `frontend-specialist`
- **Skill:** `frontend-design`, `tailwind-patterns`
- **Priority:** `P1`
- **Dependencies:** Task 4
- **INPUT:** Component `contextual-inspector-panel.tsx`.
- **OUTPUT:**
  - Render danh sách tài liệu từ `lesson.materials`:
    - Phân màu icon theo định dạng (Đỏ cho PDF, Vàng cho ZIP/RAR, Xanh cho Office).
    - Hiển thị tên file và dung lượng `(ví dụ: Slide-Vong-For.pdf • 2.4 MB)`.
    - Trạng thái kế thừa: Ổ khóa xanh mở `lucide:lock-open` ("Học thử") nếu video là preview, ổ khóa xám `lucide:lock` ("Đã khóa") nếu video khóa.
    - Nút icon tải về (`lucide:download`) và icon thùng rác (`lucide:trash-2`).
  - Tạo hộp thoại xác nhận xóa `DeleteMaterialConfirmDialog` trước khi thực hiện xóa.
- **VERIFY:** Giao diện hiển thị sắc nét, icon màu sắc chuẩn xác, thao tác tải về và xóa hoạt động mượt mà.

---

## 7. Phase X: Kế Hoạch Xác Minh (Verification Checklist)

- [x] **Build & Typecheck Toàn Dự Án:**
  - `pnpm --filter share-lib build` -> Pass
  - `pnpm --filter backend exec tsc --noEmit` -> 0 errors
  - `npx tsc --noEmit` (frontend) -> 0 errors
  - `pnpm lint` (frontend) -> 0 errors, 0 warnings
- [x] **Backend Unit Tests:** Tất cả unit tests cho `addMaterial` và `deleteMaterial` đều pass 100% (292/292 tests passed).
- [x] **Kiểm thử Upload thật:**
  - Giảng viên chọn bài học video -> bấm nút kẹp ghim -> nhập tên và chọn file -> bấm Tải lên -> file xuất hiện trên MinIO và document MongoDB.
- [x] **Kiểm thử Kế thừa quyền xem:**
  - Với bài học bật Học thử: Tài liệu hiển thị ổ khóa xanh mở `lucide:lock-open` và nhãn "Học thử".
  - Với bài học không bật Học thử: Tài liệu hiển thị ổ khóa xám `lucide:lock` và nhãn "Đã khóa".
  - Chuyển đổi trạng thái học thử của video cha: Trạng thái tài liệu tự động cập nhật đồng bộ ngay lập tức.
- [x] **Kiểm thử Tải về & Xóa tài liệu:**
  - Nhấn nút tải về mở/tải đúng tệp từ URL MinIO.
  - Nhấn icon thùng rác mở popup xác nhận `DeleteLessonMaterialDialog`; sau khi xóa, tài liệu biến mất khỏi danh sách và tệp trên MinIO được dọn dẹp an toàn.
