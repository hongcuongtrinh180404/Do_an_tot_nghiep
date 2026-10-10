# Plan: Thêm Nút "Xóa Toàn Bộ Câu Hỏi" Của Cụm & Gỡ Bỏ Chấm Vàng Trên Timeline (Delete Quiz Cluster Flow)

> **File:** `docs/PLAN-delete-quiz-cluster.md`  
> **Feature:** `interactive-video-player` & `course-management`  
> **Module:** Video Quiz Studio & Backend API  
> **Status:** PLANNING (Chờ người dùng duyệt trước khi triển khai)

---

## 1. Tổng Quan & Mục Tiêu

Người dùng yêu cầu bổ sung nút **"Xóa toàn bộ câu hỏi"** ở cột bên phải (danh sách điều hướng câu hỏi) trong Modal `CreateQuizMarkerModal`. Khi giảng viên bấm xóa:
1. Toàn bộ các câu hỏi thuộc cụm mốc thời gian đó sẽ bị xóa khỏi cơ sở dữ liệu (MongoDB).
2. Modal tự động đóng lại, hiển thị thông báo thành công.
3. Chấm vàng đại diện cho cụm câu hỏi đó trên thanh tua video timeline sẽ **biến mất hoàn toàn ngay lập tức**.

---

## 2. Phân Tích Kỹ Thuật & Kiến Trúc (Architecture & Strategy)

### A. Tầng Backend (NestJS + MongoDB Repository Pattern)
- **Hiện trạng:** Backend mới chỉ có API xóa từng câu hỏi đơn lẻ `DELETE /lessons/quizzes/:quizId`. Nếu một mốc có 3-4 câu hỏi, việc xóa từng câu gây ra nhiều request rời rạc và dễ sót.
- **Giải pháp tối ưu:** Bổ sung API xóa trọn vẹn cụm câu hỏi theo mốc thời gian:
  - **Endpoint:** `DELETE /lessons/:id/quizzes/timestamp/:timestamp` (Phân quyền `INSTRUCTOR`, `ADMIN`).
  - **Repository:** Phương thức `deleteQuizzesAtTimestampRange(lessonId, timestamp, rangeSeconds = 2)` sử dụng `updateMany` với bộ lọc `{ lessonId, timestamp: { $gte: timestamp - 2, $lte: timestamp + 2 }, deletedAt: null }` để soft-delete toàn bộ câu hỏi trong cụm một cách nguyên tử (Atomic).
  - **Service:** `LessonQuizService.deleteQuizzesAtTimestamp(lessonId, timestamp)`.

### B. Tầng Frontend API Client & React Query
- Bổ sung hàm API trong `lesson-quiz.api.ts`:
  ```typescript
  deleteLessonQuizCluster: (lessonId: string, timestamp: number) => Promise<ApiResponse<{ deletedCount: number }>>
  ```
- Bổ sung custom mutation hook `useDeleteLessonQuizClusterMutation(lessonId)`:
  - Khi xóa thành công, tự động invalidate query `['lesson-quizzes', lessonId]`.
  - Danh sách `dbQuizzes` tự động cập nhật, giúp chấm vàng trên timeline biến mất tức thì.

### C. Tầng Giao Diện (UI - Cột Phải `CreateQuizMarkerModal`)
- **Vị trí nút:** Tại thanh Header của Cột Phải (`px-4 py-3 border-b flex items-center justify-between`), nằm cạnh nút `[+ Thêm câu]`.
- **Thiết kế nút:**
  - Nút viền đỏ nhạt: `[🗑️ Xóa tất cả]` (`border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400`).
  - Khi chưa lưu vào DB (mốc mới tạo chưa có câu hỏi nào trong DB): Chỉ cần xóa sạch danh sách form hiện tại và đóng modal.
  - Khi đã có câu hỏi lưu trong DB: Hiển thị hộp thoại xác nhận an toàn (Confirmation Dialog) tránh bấm nhầm.
- **Xác nhận an toàn:** Hiển thị Dialog: *"Bạn có chắc chắn muốn xóa toàn bộ câu hỏi tại mốc này? Thao tác này sẽ xóa vĩnh viễn tất cả câu hỏi trong cụm và gỡ bỏ điểm dừng trên video."*
- **Hành động sau xóa:**
  - Kích hoạt mutation xóa trên Backend.
  - Hiển thị Toast thông báo thành công: *"Đã xóa toàn bộ câu hỏi tại mốc này"*.
  - Đóng Modal và trả lại timeline video sạch sẽ không còn chấm vàng.

---

## 3. Kế Hoạch Triển Khai Chi Tiết (Phased Task Breakdown)

### Phase 1: Mở Rộng Backend Service & API Endpoint
- [ ] Bổ sung phương thức `deleteQuizzesAtTimestampRange` trong `backend/src/modules/course/repositories/lesson-quiz.repository.ts`.
- [ ] Bổ sung phương thức `deleteQuizzesAtTimestamp` trong `backend/src/modules/course/services/lesson-quiz.service.ts`.
- [ ] Khai báo endpoint `@Delete(':id/quizzes/timestamp/:timestamp')` trong `backend/src/modules/course/lesson-quiz.controller.ts`.
- [ ] Bổ sung unit test trong `lesson-quiz.service.spec.ts` kiểm thử xóa cụm câu hỏi.

### Phase 2: Frontend API Client & Mutation Hook
- [ ] Thêm `deleteQuizCluster` trong `frontend/src/features/course/api/lesson-quiz.api.ts`.
- [ ] Thêm hook `useDeleteLessonQuizClusterMutation(lessonId)` tự động invalidate query cache.

### Phase 3: Bổ Sung Nút "Xóa Tất Cả" & Dialog Xác Nhận
- [ ] Cập nhật `frontend/src/features/course/components/player/create-quiz-marker-modal.tsx`:
  - Thêm nút `[🗑️ Xóa tất cả]` vào header cột phải bên cạnh `[+ Thêm câu]`.
  - Tích hợp hộp thoại xác nhận xóa `DeleteConfirmDialog` hoặc modal confirmation.
  - Khi người dùng xác nhận xóa: gọi mutation xóa, đóng modal, reset state.

### Phase 4: Kiểm Thử & Nghiệm Thu
- [ ] Kiểm tra thực tế: Tạo 2-3 câu hỏi tại 1 mốc -> Xem xuất hiện chấm vàng -> Bấm vào chấm vàng -> Bấm `Xóa tất cả` -> Xác nhận chấm vàng biến mất ngay trên timeline.
- [ ] Chạy `pnpm --filter frontend exec tsc --noEmit`.
- [ ] Chạy `pnpm --filter backend test src/modules/course/tests/lesson-quiz.service.spec.ts`.
- [ ] Cập nhật nhật ký phát triển trong `a-agentic/features/interactive-video-player/dev-history.md`.

---

## 4. Phân Công Trách Nhiệm (Agent Assignments)

| Vai trò | Phụ trách | Phạm vi |
| :--- | :--- | :--- |
| **`backend-specialist`** | API & Batch Soft-delete Repository | `lesson-quiz.controller.ts`, `lesson-quiz.service.ts`, `lesson-quiz.repository.ts` |
| **`frontend-specialist`** | UI Button, Mutation & Confirmation | `create-quiz-marker-modal.tsx`, `lesson-quiz.api.ts` |

---

## 5. Tiêu Chí Nghiệm Thu (Acceptance Criteria)

1. Ở cột phải danh sách câu hỏi của modal xuất hiện nút **`[Xóa tất cả]`** rõ ràng, thẩm mỹ.
2. Khi bấm nút, có hộp thoại xác nhận để tránh giảng viên lỡ tay bấm nhầm.
3. Khi xác nhận xóa:
   - Backend soft-delete thành công toàn bộ câu hỏi trong cụm mốc thời gian đó.
   - Modal tự động đóng lại.
   - Chấm vàng tại mốc thời gian đó trên thanh timeline biến mất ngay lập tức.
