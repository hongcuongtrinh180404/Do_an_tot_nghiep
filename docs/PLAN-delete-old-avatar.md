# Kế hoạch Triển khai: Tự động Xóa Avatar Cũ khi Cập nhật Ảnh Đại diện Mới trên MinIO (Avatar Replacement & MinIO Cleanup)

> **Mục tiêu**: 
> 1. Trả lời và xác nhận hiện trạng: Hiện tại hệ thống **chưa có cơ chế xóa avatar cũ** khi người dùng tải lên avatar mới, dẫn tới file rác tích tụ trong MinIO bucket (`thc-datn-media/avatars/`).
> 2. Triển khai đúng chuẩn quy trình xử lý an toàn theo yêu cầu của người dùng:
>    `Old avatar → Upload new avatar → New avatar uploaded successfully → Update DB → Delete old avatar from MinIO`.
> 3. Đảm bảo tính chịu lỗi (Fault Tolerance) & An toàn dữ liệu: Nếu avatar cũ là link bên ngoài (Google OAuth `lh3.googleusercontent.com`, GitHub, v.v.) thì không gọi xóa trên MinIO; nếu thao tác xóa MinIO gặp lỗi mạng thì không làm hỏng request cập nhật avatar của người dùng (chỉ ghi log cảnh báo).
> 4. Dọn dẹp các nhãn giao diện còn sót chữ "Cloudinary" trên trang Profile sang "MinIO".
>
> **Quyết định Đã Thống nhất (User Decisions qua Socratic Gate)**:
> 1. **Phạm vi tính năng**: Giữ đúng trọng tâm luồng đề xuất ban đầu — **Chỉ tự động xóa avatar cũ khi upload ảnh mới** theo 5 bước tuần tự; không bổ sung thêm nút gỡ avatar riêng biệt.
> 2. **Xử lý URL bên ngoài**: Tự động nhận diện domain. Nếu avatar cũ là URL từ bên thứ ba (Google OAuth `lh3.googleusercontent.com`, GitHub, v.v.), hệ thống **tự động bỏ qua lệnh xóa trên MinIO** để tránh lỗi không cần thiết, chỉ lưu avatar mới vào MongoDB.
>
> **Trạng thái**: PLANNING ONLY — Đã chốt yêu cầu kỹ thuật qua Socratic Gate, sẵn sàng kích hoạt triển khai.

---

## 1. Nghiên cứu Hiện trạng & Phân tích Kỹ thuật (Current State & Gap Analysis)

### 1.1. Hiện trạng Codebase
- **Backend (`UserService.updateAvatar`)**:
  - Tệp: [`user.service.ts`](file:///d:/Download/hk1_2027/project_do_an/backend/src/modules/user/services/user.service.ts) (Dòng 96-113).
  - Quy trình hiện tại: Chỉ nhận file -> gọi `storageService.uploadImage(file, 'avatars')` -> cập nhật `avatarUrl` và `avatar` trong DB -> trả về profile mới.
  - **Khoảng trống (Gap)**: Hoàn toàn không kiểm tra avatar hiện tại của user để gọi xóa trên MinIO. File ảnh cũ tồn tại vĩnh viễn trong bucket `thc-datn-media/avatars/`.
- **Storage Service (`StorageService.deleteFile`)**:
  - Tệp: [`storage.service.ts`](file:///d:/Download/hk1_2027/project_do_an/backend/src/modules/storage/storage.service.ts) (Dòng 223-244).
  - Đã có sẵn phương thức `deleteFile(fileKeyOrUrl: string): Promise<boolean>`.
  - Hỗ trợ cả `fileKey` tương đối (`avatars/xxx.webp`) và full public URL (`http://localhost:9000/thc-datn-media/avatars/xxx.webp`).
- **Frontend (`AvatarUploader`)**:
  - Tệp: [`avatar-uploader.tsx`](file:///d:/Download/hk1_2027/project_do_an/frontend/src/features/profile/components/avatar-uploader.tsx).
  - Đã có preview ảnh tức thì và gọi `useUploadAvatarMutation()`.
  - Còn sót text "Lưu trữ trên Cloudinary" và "Tự động lưu lên Cloudinary" từ đợt migration trước cần cập nhật sang MinIO.

---

## 2. Ranh giới & Phạm vi Triển khai (Scope & Boundaries)

| Tiêu chí | Phạm vi trong Kế hoạch (IN SCOPE) | Ngoài phạm vi (OUT OF SCOPE) |
| :--- | :--- | :--- |
| **Quy trình Core** | Thực thi đúng trình tự: Lấy Old Avatar URL → Upload ảnh mới → Cập nhật DB → Xóa ảnh cũ trên MinIO | Xóa lịch sử thay đổi avatar (hệ thống không lưu phiên bản avatar) |
| **An toàn & Bộ lọc** | Kiểm tra URL hợp lệ thuộc MinIO trước khi xóa; bỏ qua OAuth URL (Google/GitHub/Facebook), bỏ qua ảnh mặc định hoặc URL trùng lặp | Quét dọn định kỳ toàn bộ bucket MinIO (Orphaned file cron job) |
| **Chịu lỗi (Resilience)** | Xóa avatar cũ đặt trong khối `try-catch`, ghi `logger.warn` khi thất bại để không chặn luồng cập nhật avatar | Retry queue phức tạp qua RabbitMQ cho việc xóa ảnh avatar đơn lẻ |
| **Mở rộng Nút Gỡ Avatar** | *Không triển khai* (theo quyết định của User: giữ đúng trọng tâm luồng upload mới) | Nút "Gỡ ảnh đại diện" / Revert về initials |
| **UI Polish** | Cập nhật tooltip/guideline sang "MinIO Storage" trên `avatar-uploader.tsx` | Viết lại trang Profile |

---

## 3. Kiến trúc Kỹ thuật & Luồng Dữ Liệu (Technical Architecture & Flows)

### 3.1. Luồng Upload Mới & Xóa Cũ (Sequence Diagram)

```
User (Client)              UserService                 StorageService (MinIO)       MongoDB (UserRepo)
     │                          │                               │                          │
     │── 1. POST /users/avatar ─>│                               │                          │
     │   (Multer File)          │                               │                          │
     │                          │── 2. findByIdOrFail(userId) ──┼─────────────────────────>│
     │                          │<── [Return currentUser with oldAvatarUrl] ───────────────│
     │                          │                               │                          │
     │                          │── 3. uploadImage(file) ──────>│                          │
     │                          │<── [Return newAvatarUrl] ─────│                          │
     │                          │                               │                          │
     │                          │── 4. updateOrFail(userId, { avatarUrl, avatar }) ───────>│
     │                          │<── [Return updated user] ────────────────────────────────│
     │                          │                               │                          │
     │                          │── 5. Kiểm tra oldAvatarUrl? ──│                          │
     │                          │   (Là MinIO URL & != newUrl)  │                          │
     │                          │   ──> deleteFile(oldAvatar) ─>│                          │
     │                          │<───── [Delete OK / Catch] ────│                          │
     │                          │                               │                          │
     │<── 6. 200 OK Response ───│                               │                          │
     │   { avatarUrl, user }    │                               │                          │
```

### 3.2. Tiêu chuẩn Nhận diện URL thuộc MinIO (`isManagedMinioUrl`)

Để tránh gửi yêu cầu xóa sai lên MinIO khi người dùng trước đó đăng nhập qua Google OAuth:
- Một URL được coi là MinIO-managed khi:
  1. Bắt đầu bằng `publicUrl` (`http://localhost:9000/...` hoặc cấu hình `MINIO_PUBLIC_URL`)
  2. Hoặc chứa đường dẫn bucket: `/${bucketName}/avatars/`
  3. Hoặc là đường dẫn tương đối bắt đầu bằng: `avatars/`
- Nếu là domain bên ngoài như `lh3.googleusercontent.com`, `avatars.githubusercontent.com`, hoặc URL static assets thì **bỏ qua**, không gọi lệnh xóa.

### 3.3. Xử lý Lỗi Bất đồng bộ (Graceful Fallback)
```typescript
// Triển khai chuẩn trong UserService.updateAvatar:
if (oldAvatarUrl && oldAvatarUrl !== newAvatarUrl && this.isManagedMinioUrl(oldAvatarUrl)) {
  try {
    await this.storageService.deleteFile(oldAvatarUrl);
    this.logger.log(`[${this.getCorrelationId()}] Deleted old avatar from MinIO: ${oldAvatarUrl}`);
  } catch (deleteError) {
    this.logger.warn(
      `[${this.getCorrelationId()}] Failed to delete old avatar ${oldAvatarUrl}: ${deleteError}`,
    );
  }
}
```

---

## 4. Chi tiết Kế hoạch Triển khai (Task Breakdown)

### Giai đoạn 1: Backend - Core Replacement & Deletion Logic
- [x] **Task 1.1: Bổ sung Helper nhận diện MinIO URL và trích xuất key an toàn trong `StorageService`**
  - **Agent**: `backend-specialist`
  - **Skill**: `clean-code`, `api-patterns`
  - **Input**: Chuỗi URL avatar cũ.
  - **Output**: [`StorageService.deleteFile`](file:///d:/Download/hk1_2027/project_do_an/backend/src/modules/storage/storage.service.ts#L223-L255) nhận diện `publicUrlPrefix` và `/thc-datn-media/`, tự động nhận diện và bỏ qua các URL OAuth bên ngoài như Google OAuth (`https://lh3.googleusercontent.com/...`).
  - **Verify**: Unit tests trong `storage.service.spec.ts` pass 100%.

- [x] **Task 1.2: Cập nhật `UserService.updateAvatar` theo chuẩn 5 bước tuần tự**
  - **Agent**: `backend-specialist`
  - **Skill**: `clean-code`
  - **Input**: `userId`, `file: Express.Multer.File`.
  - **Output**: 
    1. Lấy thông tin user hiện tại (`findByIdOrFail`) để trích xuất `oldAvatarUrl`.
    2. Upload avatar mới qua `storageService.uploadImage`.
    3. Update user document với `avatarUrl` mới.
    4. Xóa avatar cũ qua `storageService.deleteFile(oldAvatarUrl)` với try-catch an toàn.
    5. Trả về profile mới.
  - **Verify**: Chạy qua `pnpm test` trong backend pass 100%.

- [x] **Task 1.3: Cập nhật Unit Tests trong `user.service.avatar.spec.ts`**
  - **Agent**: `test-engineer`
  - **Skill**: `testing-patterns`
  - **Input**: Kịch bản upload avatar khi user đã có avatar cũ trên MinIO; khi user chưa có avatar; khi xóa MinIO thất bại.
  - **Output**: 100% test cases pass với các assertions:
    - `mockStorageService.deleteFile` được gọi với đúng `oldAvatarUrl`.
    - `mockStorageService.deleteFile` KHÔNG được gọi nếu user chưa có avatar cũ.
    - Cập nhật profile vẫn thành công nếu `mockStorageService.deleteFile` throw error.
  - **Verify**: `pnpm --filter backend test src/modules/user/tests/user.service.avatar.spec.ts` pass 100%.

---

### Giai đoạn 2: Frontend - Tinh chỉnh Giao diện Profile
- [x] **Task 2.1: Sửa các nhãn Cloudinary còn sót trong `AvatarUploader`**
  - **Agent**: `frontend-specialist`
  - **Skill**: `frontend-design`, `clean-code`
  - **File**: [`avatar-uploader.tsx`](file:///d:/Download/hk1_2027/project_do_an/frontend/src/features/profile/components/avatar-uploader.tsx).
  - **Output**: Đổi "Lưu trữ trên Cloudinary" -> "Lưu trữ an toàn trên MinIO Storage"; cập nhật text guideline chân trang.
  - **Verify**: Type check pass và kiểm tra hiển thị.

---

## 5. Kế hoạch Kiểm thử & Xác minh (Phase X: Verification)

| STT | Kịch bản Kiểm thử | Trạng thái |
| :---: | :--- | :---: |
| **TC-1** | User chưa có avatar (`avatarUrl = null`) -> Upload avatar mới | ✅ PASS |
| **TC-2** | User đang có avatar MinIO A -> Upload avatar MinIO B, xóa A khỏi MinIO | ✅ PASS |
| **TC-3** | User có avatar từ Google OAuth -> Bỏ qua xóa MinIO, chỉ update DB | ✅ PASS |
| **TC-4** | Giả lập MinIO gặp sự cố tạm thời khi xóa ảnh cũ -> Graceful continue | ✅ PASS |

---

## ✅ PHASE X COMPLETE

- TypeScript Compilation Backend: ✅ Pass (`tsc --noEmit` exit 0)
- TypeScript Compilation Frontend: ✅ Pass (`tsc --noEmit` exit 0)
- Backend Unit Tests: ✅ Pass 19/19 tests (`user.service.avatar.spec.ts` + `storage.service.spec.ts`)
- Date: 2026-10-03

