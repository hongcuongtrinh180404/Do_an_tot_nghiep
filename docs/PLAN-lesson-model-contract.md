# PLAN: Thiết Kế Data Model & API Contract Cho Lesson

> **Mục tiêu:**
> 1. Phân tích và thiết kế cấu trúc dữ liệu hoàn chỉnh cho Bài học (Lesson):
>    - Hỗ trợ lưu trữ thông tin nội dung bài giảng (`content: { type, url, publicId, fileName, fileSize, mimeType, duration }`).
>    - Hỗ trợ cờ đánh dấu học thử miễn phí (`isPreview: boolean`).
> 2. Xác định API Request Payload & Response Contract chuẩn mực cho endpoint:
>    `POST /api/v1/sections/:sectionId/lessons`
> 3. Đảm bảo tính nhất quán với kiến trúc toàn dự án:
>    - `share-lib`: Single Source of Truth cho types và interfaces.
>    - NestJS + Mongoose: Schema thừa kế `BaseAbstractDocument`, DTO dùng `class-validator` + `class-transformer`.
>    - Tương thích với AI Video Pipeline (`a-agentic/features/ai-video-pipeline/`) và Interactive Video Player (`a-agentic/features/interactive-video-player/`).
> 4. **Ranh giới nghiêm ngặt:** Đây là bước **THIẾT KẾ & QUY HOẠCH KIẾN TRÚC**, tuyệt đối **CHƯA** implement code backend, database migration, file upload, hay kết nối React Query mutation.
>
> **Task Slug:** `lesson-model-contract`  
> **Plan File:** `docs/PLAN-lesson-model-contract.md`  
> **Primary Agent:** `project-planner`  
> **Consulting Agents:** `backend-specialist`, `database-architect`  
> **Skills:** `clean-code`, `database-design`, `api-patterns`  
> **Project Type:** `FULL-STACK ARCHITECTURE`

---

## 1. Khảo Sát Hiện Trạng (Context Check)

### 1.1. Schema / Entity Mongoose Hiện Tại
- Vị trí: [`backend/src/modules/course/schemas/lesson.schema.ts`](file:///d:/Download/hk1_2027/project_do_an/backend/src/modules/course/schemas/lesson.schema.ts)
- Cấu trúc hiện tại:
  ```typescript
  @Schema({ timestamps: true, collection: 'lessons' })
  export class LessonEntity extends BaseAbstractDocument {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: SectionEntity.name, required: true, index: true })
    sectionId: Types.ObjectId;

    @Prop({ type: String, required: true, trim: true })
    title: string;

    @Prop({ type: String, required: false, default: null, trim: true })
    description?: string | null;

    @Prop({ type: Number, required: true, min: [0, 'Lesson order cannot be negative'] })
    order: number;
  }
  ```
- **Kế thừa:** `BaseAbstractDocument` cung cấp `createdAt`, `updatedAt`, `deletedAt`, `createdById`, `updatedById`.
- **Index:** Compound index `{ sectionId: 1, deletedAt: 1, order: 1 }`.

### 1.2. Interface `share-lib` Hiện Tại
- Vị trí: [`share-lib/src/interfaces/lesson.interface.ts`](file:///d:/Download/hk1_2027/project_do_an/share-lib/src/interfaces/lesson.interface.ts)
- Cấu trúc hiện tại:
  ```typescript
  export interface ILesson {
    id: string;
    sectionId: string;
    title: string;
    description?: string | null;
    order: number;
    createdAt: Date | string;
    updatedAt: Date | string;
    deletedAt?: Date | string | null;
    createdById?: string | null;
    updatedById?: string | null;
  }
  ```

### 1.3. `CreateLessonDto` Hiện Tại
- Vị trí: [`backend/src/modules/course/dto/create-lesson.dto.ts`](file:///d:/Download/hk1_2027/project_do_an/backend/src/modules/course/dto/create-lesson.dto.ts)
- Các trường hiện tại: `title` (string, 1-200), `description` (string, max 1000, optional), `order` (number, int >= 0).

### 1.4. Đối Chiếu Với Lesson Create UI Vừa Hoàn Thành
- Payload từ UI Form ([`section-lesson-create-form.tsx`](file:///d:/Download/hk1_2027/project_do_an/frontend/src/features/course/components/section-lesson-create-form.tsx)):
  ```typescript
  {
    title: string;
    description?: string;
    order: number;
    contentFile?: File | null;
    isPreview: boolean;
  }
  ```
- **Khoảng trống cần bổ sung:**
  1. Thiếu cấu trúc lưu trữ nội dung bài học (`content`), gồm URL của media sau khi upload (Cloudinary/S3), loại media (`video` hoặc `document`), và metadata cần thiết.
  2. Thiếu trường `isPreview` trong Database Model, `share-lib`, và DTO.

---

## 2. Thiết Kế Cấu Trúc Dữ Liệu Chi Tiết (Data Model Design)

### 2.1. Đề Xuất Enum & Interface Cho `content`
Nội dung bài học có thể là Video bài giảng hoặc Tài liệu học tập (PDF/DOCX). Lưu trữ dưới dạng Embedded Object trong Lesson document (tuân thủ quy tắc 1-to-few/1-to-1 embedding, không tách collection thừa).

```typescript
// share-lib/src/enums/lesson-content-type.enum.ts
export enum LessonContentType {
  VIDEO = 'video',
  DOCUMENT = 'document',
}

// share-lib/src/interfaces/lesson.interface.ts
export interface ILessonContent {
  type: LessonContentType;  // 'video' | 'document'
  url: string;              // URL truy cập file (Cloudinary CDN URL hoặc Storage URL)
  publicId?: string;        // ID định danh file trên Cloudinary (phục vụ việc xóa/thay thế file sau này)
  fileName?: string;        // Tên file gốc (ví dụ: "bai-01-nhap-mon-typescript.mp4")
  fileSize?: number;        // Kích thước file theo bytes
  mimeType?: string;        // Định dạng MIME (ví dụ: "video/mp4", "application/pdf")
  duration?: number;        // Thời lượng video tính theo giây (chỉ áp dụng cho type = 'video')
}
```

#### Phân Tích Sự Cần Thiết Của Các Trường Trong `content`:
| Trường | Kiểu dữ liệu | Bắt buộc? | Mục đích kiến trúc |
| :--- | :--- | :---: | :--- |
| `type` | `LessonContentType` | **Có** | Phân loại renderer trên frontend (Player video vs Document viewer). |
| `url` | `string` | **Có** | Nguồn phát trực tiếp cho HTML5 Video player hoặc link tải tài liệu. |
| `publicId` | `string` | Không | Quản trị vòng đời file trên Cloudinary (xóa file cũ khi bài học bị xóa). |
| `fileName` | `string` | Không | Hiển thị tên file thân thiện cho học viên khi tải tài liệu. |
| `fileSize` | `number` | Không | Hiển thị dung lượng file mà không cần gửi thêm request HEAD HTTP. |
| `mimeType` | `string` | Không | Giúp player/browser xử lý đúng content-type. |
| `duration` | `number` | Không | Phục vụ tính tổng thời lượng khóa học, tiến độ học tập và hiển thị thời lượng bài học (`15:30`). |

### 2.2. Đề Xuất Trường `isPreview`
- Kiểu dữ liệu: `boolean`.
- Giá trị mặc định: `false`.
- Mục đích: Cho phép người dùng chưa mua khóa học được xem thử bài học này. Được dùng bởi `PlayerGuard` / API authorization để cấp quyền xem mà không cần enrollment.

### 2.3. Cấu Trúc Hoàn Chỉnh Của `ILesson` (Single Source of Truth)
```typescript
export interface ILesson {
  id: string;
  sectionId: string;
  title: string;
  description?: string | null;
  order: number;
  content?: ILessonContent | null;  // Có thể null nếu bài học tạo nháp chưa gán nội dung
  isPreview: boolean;               // Mặc định false
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;
  createdById?: string | null;
  updatedById?: string | null;
}
```

### 2.4. Mongoose Schema Update (`LessonEntity`)
```typescript
@Schema({ timestamps: true, collection: 'lessons' })
export class LessonEntity extends BaseAbstractDocument {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: SectionEntity.name, required: true, index: true })
  sectionId: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  title: string;

  @Prop({ type: String, required: false, default: null, trim: true })
  description?: string | null;

  @Prop({ type: Number, required: true, min: [0, 'Lesson order cannot be negative'] })
  order: number;

  @Prop({
    type: {
      type: { type: String, enum: Object.values(LessonContentType), required: true },
      url: { type: String, required: true },
      publicId: { type: String, required: false },
      fileName: { type: String, required: false },
      fileSize: { type: Number, required: false },
      mimeType: { type: String, required: false },
      duration: { type: Number, required: false, min: 0 },
    },
    required: false,
    default: null,
    _id: false,
  })
  content?: ILessonContent | null;

  @Prop({ type: Boolean, required: true, default: false })
  isPreview: boolean;
}
```

---

## 3. Thiết Kế API Contract: `POST /sections/:sectionId/lessons`

### 3.1. Endpoint Specification
- **Method:** `POST`
- **Route:** `/api/v1/sections/:sectionId/lessons`
- **Authorization:** `Bearer <JWT_TOKEN>`
- **Roles:** `@Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)`
- **Header:** `Content-Type: application/json`

### 3.2. Request Payload Contract

> 🔴 **CÁC NGUYÊN TẮC RÀNG BUỘC KIẾN TRÚC ĐÃ CHỐT:**
> 1. **`content` chưa có file**: Bắt buộc để `null` hoặc không gửi (`undefined`), **tuyệt đối KHÔNG gửi object rỗng `{}`**. Nếu gửi object rỗng `{}` sẽ bị `ValidationPipe` từ chối ngay lập tức do thiếu `type` và `url`.
> 2. **`sectionId`**: Chỉ lấy từ URL path param (`POST /sections/:sectionId/lessons`), **tuyệt đối KHÔNG đưa `sectionId` vào request body**. Nếu client cố tình gửi `sectionId` trong body sẽ bị `ValidationPipe` từ chối (`forbidNonWhitelisted: true`).
> 3. **Tách biệt Upload File và Create Lesson**: Đây là 2 operation độc lập. **Chưa implement upload file ở milestone này**.
> 4. **Tách biệt RabbitMQ / AI Pipeline**: **Không triển khai RabbitMQ/AI pipeline trong Lesson Create**, hoãn hoàn toàn sang milestone chuyên biệt phía sau.

#### JSON Schema
```json
{
  "title": "string (bắt buộc, 1-200 ký tự, tự động trim)",
  "description": "string (không bắt buộc, tối đa 1000 ký tự, tự động trim)",
  "order": "number (bắt buộc, số nguyên >= 0)",
  "content": "LessonContentObject | null (không bắt buộc, chỉ gửi khi đã có file, không gửi object rỗng)",
  "isPreview": "boolean (không bắt buộc, mặc định false)"
}
```

#### Chi tiết cấu trúc `content` (khi có file):
```json
{
  "type": "video | document (bắt buộc)",
  "url": "string (bắt buộc, URL hợp lệ)",
  "publicId": "string (không bắt buộc)",
  "fileName": "string (không bắt buộc)",
  "fileSize": "number (không bắt buộc, >= 0)",
  "mimeType": "string (không bắt buộc)",
  "duration": "number (không bắt buộc, >= 0, chỉ dùng cho video)"
}
```

#### Ví Dụ Payload 1: Bài học Video có file đầy đủ (đã upload qua operation riêng)
```json
{
  "title": "Giới thiệu TypeScript và Cấu trúc dự án",
  "description": "Bài học đầu tiên tổng quan về các kiểu dữ liệu nâng cao trong TypeScript.",
  "order": 0,
  "content": {
    "type": "video",
    "url": "https://res.cloudinary.com/elearning/video/upload/v1726930000/courses/lessons/lesson_01.mp4",
    "publicId": "courses/lessons/lesson_01",
    "fileName": "lesson_01.mp4",
    "fileSize": 35680120,
    "mimeType": "video/mp4",
    "duration": 485
  },
  "isPreview": true
}
```

#### Ví Dụ Payload 2: Bài học chưa có file (content = null hoặc omitted)
```json
{
  "title": "Tạo RESTful API với NestJS",
  "description": "Học cách tổ chức Controller, Service và Repository.",
  "order": 1,
  "content": null,
  "isPreview": false
}
```
*(Hoặc hoàn toàn bỏ qua field `content` trong payload JSON, không gửi `{}`).*

### 3.3. DTO Validation Contract (`CreateLessonDto` & `LessonContentDto`)
```typescript
export class LessonContentDto {
  @IsNotEmpty({ message: 'Loại nội dung không được để trống' })
  @IsEnum(LessonContentType, { message: 'Loại nội dung phải là video hoặc document' })
  type: LessonContentType;

  @IsNotEmpty({ message: 'URL nội dung không được để trống' })
  @IsUrl({}, { message: 'URL nội dung không hợp lệ' })
  url: string;

  @IsOptional()
  @IsString()
  publicId?: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  fileSize?: number;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;
}

export class CreateLessonDto {
  @IsNotEmpty({ message: 'Tiêu đề bài học không được để trống' })
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString({ message: 'Tiêu đề bài học phải là chuỗi ký tự' })
  @MinLength(1, { message: 'Tiêu đề bài học không được để trống' })
  @MaxLength(200, { message: 'Tiêu đề bài học không được vượt quá 200 ký tự' })
  title: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() || undefined : value)
  @IsString({ message: 'Mô tả bài học phải là chuỗi ký tự' })
  @MaxLength(1000, { message: 'Mô tả bài học không được vượt quá 1000 ký tự' })
  description?: string;

  @IsNotEmpty({ message: 'Thứ tự bài học không được để trống' })
  @Type(() => Number)
  @IsInt({ message: 'Thứ tự bài học phải là số nguyên' })
  @Min(0, { message: 'Thứ tự bài học phải lớn hơn hoặc bằng 0' })
  order: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => LessonContentDto)
  content?: LessonContentDto | null;

  @IsOptional()
  @IsBoolean({ message: 'Trạng thái học thử phải là boolean' })
  isPreview?: boolean;
}
```

### 3.4. Response Contract: `201 Created`
Tất cả response đều bọc trong standardized envelope `ApiResponse<ILesson>`:

```json
{
  "success": true,
  "message": "Tạo bài học thành công",
  "data": {
    "id": "66f9b1c2d3e4f5a6b7c8d9e0",
    "sectionId": "66f9a000bc4567890abcdef0",
    "title": "Giới thiệu TypeScript và Cấu trúc dự án",
    "description": "Bài học đầu tiên tổng quan về các kiểu dữ liệu nâng cao trong TypeScript.",
    "order": 0,
    "content": {
      "type": "video",
      "url": "https://res.cloudinary.com/elearning/video/upload/v1726930000/courses/lessons/lesson_01.mp4",
      "publicId": "courses/lessons/lesson_01",
      "fileName": "lesson_01.mp4",
      "fileSize": 35680120,
      "mimeType": "video/mp4",
      "duration": 485
    },
    "isPreview": true,
    "createdAt": "2026-09-30T13:10:00.000Z",
    "updatedAt": "2026-09-30T13:10:00.000Z",
    "deletedAt": null,
    "createdById": "66f00000bc4567890abcdef9",
    "updatedById": "66f00000bc4567890abcdef9"
  }
}
```

---

## 4. Danh Sách Các File Cần Thay Đổi Ở Bước Triển Khai Sau

| STT | Package | File | Phạm vi điều chỉnh dự kiến |
| :---: | :--- | :--- | :--- |
| 1 | `share-lib` | `share-lib/src/interfaces/lesson.interface.ts` | Bổ sung enum `LessonContentType`, interface `ILessonContent`, cập nhật `ILesson`. |
| 2 | `share-lib` | `share-lib/src/index.ts` | Re-export các types và enums mới. |
| 3 | `backend` | `backend/src/modules/course/schemas/lesson.schema.ts` | Bổ sung field `content` (embedded subdocument) và `isPreview` (boolean, default false). |
| 4 | `backend` | `backend/src/modules/course/dto/create-lesson.dto.ts` | Bổ sung class `LessonContentDto`, thêm field `content` và `isPreview` vào `CreateLessonDto`. |
| 5 | `backend` | `backend/src/modules/course/services/lesson.service.ts` | Cập nhật interface `CreateLessonInput` và truyền `content`, `isPreview` vào `lessonRepository.create`. |
| 6 | `backend` | `backend/src/modules/course/lesson.controller.ts` | Truyền `content` và `isPreview` từ DTO sang service. |
| 7 | `backend` | `backend/src/modules/course/tests/create-lesson.dto.spec.ts` | Bổ sung test cases validate `content` (type, url, duration, reject `{}`) và `isPreview`. |
| 8 | `backend` | `backend/src/modules/course/tests/lesson.service.spec.ts` | Cập nhật mock và assertion kiểm thử `content` & `isPreview`. |
| 9 | `backend` | `backend/src/modules/course/tests/lesson.controller.spec.ts` | Kiểm thử param binding cho `content` và `isPreview`. |
| 10 | `frontend` | `frontend/src/features/course/types/course.types.ts` | Re-export `LessonContentType`, `ILessonContent` từ `share-lib`. |

---

## 5. Kết Luận Kiến Trúc & Các Nguyên Tắc Thống Nhất

1. **`content` khi chưa có file:**
   - Bắt buộc là `null` hoặc `undefined`. Tuyệt đối không tạo `{}` rỗng.
   - Database schema: `content?: ILessonContent | null;` với `default: null`.
2. **`sectionId`:**
   - 100% trích xuất từ URL route parameter `@Param('sectionId', ParseObjectIdPipe)`.
   - Tuyệt đối không đưa vào Request Body.
3. **Phân tách ranh giới Upload File & Create Lesson:**
   - Upload file và Create Lesson là 2 operations độc lập.
   - Chưa implement upload file ở milestone này.
4. **Trì hoãn RabbitMQ / AI Pipeline:**
   - Tuyệt đối không tích hợp RabbitMQ hay AI pipeline trong Lesson Create API ở giai đoạn này.
   - Sẽ được kích hoạt trong milestone chuyên biệt sau khi hoàn thiện toàn bộ luồng Video Upload và Ingestion.
5. **Tính tương thích ngược (Backward Compatibility):**
   - Các bài học cũ hoặc bài học tạo nháp đều có `content: null` và `isPreview: false`.
   - Endpoint `GET /sections/:sectionId/lessons` hoàn toàn tương thích và không bị ảnh hưởng.

