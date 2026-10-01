# PLAN: Hiển Thị Danh Sách Bài Học (Lessons) Trong Mỗi Section Trên Trang Course Detail

> **Mục tiêu:**
> 1. Tích hợp hiển thị danh sách bài học (`Lesson`) phân cấp bên dưới mỗi chương học (`Section`) trên trang Course Detail (`/instructor/courses/[id]`).
> 2. Cấu trúc hiển thị phân cấp trực quan:
>    ```text
>    Section 1
>      ├── Lesson 1
>      ├── Lesson 2
>      └── Lesson 3
>    Section 2
>      ├── Lesson 1
>      └── Lesson 2
>    ```
> 3. Kết nối API Client gọi endpoint đã hoàn thành:
>    `GET /api/v1/sections/:sectionId/lessons`
> 4. Xây dựng hook React Query `useSectionLessonsQuery(sectionId)` và component `SectionLessonsList` đảm bảo:
>    - Hiển thị đầy đủ 4 trạng thái: Loading (skeleton), Error (thông báo + nút thử lại), Empty (chưa có bài học), và Success (danh sách bài học theo thứ tự `order ASC`).
>    - Tôn trọng triệt để Design System hiện tại: không dùng màu tím (Purple Ban), typography đồng bộ qua token Tailwind CSS, bố cục lùi lề phân cấp trực quan.
> 5. **Ranh giới nghiêm ngặt (Strict Scope Boundaries):**
>    - ✅ CHỈ làm: API query `useSectionLessonsQuery` và render danh sách Lesson trong Section.
>    - ❌ TUYỆT ĐỐI KHÔNG làm: Thêm nút "Add Lesson", tạo/sửa/xóa bài học, sắp xếp lại (reorder), Lesson Editor, upload video/file, hoặc sửa backend API.
>
> **Task Slug:** `display-section-lessons`  
> **Plan File:** `docs/PLAN-display-section-lessons.md`  
> **Primary Agent:** `project-planner`  
> **Supporting Agents:** `frontend-specialist`  
> **Project Type:** `WEB`

---

## 1. Khảo Sát Hiện Trạng & Ràng Buộc Kiến Trúc (Context Check)

### 1.1. Khảo Sát Trang Course Detail & Section List Hiện Tại
- **Route:** `frontend/src/app/instructor/courses/[id]/page.tsx` (RSC dynamic route).
- **Content Component:** [`frontend/src/features/course/components/course-detail-content.tsx`](file:///d:/Download/hk1_2027/project_do_an/frontend/src/features/course/components/course-detail-content.tsx):
  - Nhúng `<CourseSectionsList courseId={course.id} />`.
- **Section Component:** [`frontend/src/features/course/components/course-sections-list.tsx`](file:///d:/Download/hk1_2027/project_do_an/frontend/src/features/course/components/course-sections-list.tsx):
  - Sử dụng `useCourseSectionsQuery(courseId)` để lấy danh sách Section.
  - Render từng Section dạng Card item gồm Order badge (`01`, `02`), Title và Description.
  - Hiện tại bên trong mỗi Section **chưa có** phần hiển thị danh sách bài học con.

### 1.2. Khảo Sát API Client & React Query Convention
- File: [`frontend/src/features/course/api/course.api.ts`](file:///d:/Download/hk1_2027/project_do_an/frontend/src/features/course/api/course.api.ts).
- `apiClient` từ `@/lib/api-client`: đã cấu hình `baseURL` kèm `/api/v1` và request interceptor tự động gắn Bearer Token nếu có.
- Query key convention:
  ```typescript
  export const courseKeys = {
    ...
    sections: (courseId: string) => [...courseKeys.detail(courseId), 'sections'] as const,
    lessons: (sectionId: string) => ['sections', sectionId, 'lessons'] as const,
  };
  ```
- Endpoint Backend:
  `GET /api/v1/sections/:sectionId/lessons` (đã test pass 100% ở Milestone 19, trả về `ApiResponse<ILesson[]>`).

### 1.3. Khảo Sát Domain Types & Share-Lib
- `share-lib` đã export interface `ILesson` (`id`, `sectionId`, `title`, `description`, `order`, timestamps).
- [`frontend/src/features/course/types/course.types.ts`](file:///d:/Download/hk1_2027/project_do_an/frontend/src/features/course/types/course.types.ts) sẽ re-export `ILesson` để làm Single Source of Truth cho toàn bộ feature Course.

---

## 2. Thiết Kế Chi Tiết & Ràng Buộc Kỹ Thuật

### 2.1. Cập Nhật API Client & React Query Hook

File: `frontend/src/features/course/api/course.api.ts`

1. **Bổ sung query key:**
   ```typescript
   export const courseKeys = {
     all: ['courses'] as const,
     lists: () => [...courseKeys.all, 'list'] as const,
     myCourses: () => [...courseKeys.all, 'my-courses'] as const,
     detail: (id: string) => [...courseKeys.all, 'detail', id] as const,
     sections: (courseId: string) => [...courseKeys.detail(courseId), 'sections'] as const,
     lessons: (sectionId: string) => ['sections', sectionId, 'lessons'] as const,
   };
   ```

2. **Bổ sung API method trong `courseApi`:**
   ```typescript
   async getLessons(sectionId: string): Promise<ILesson[]> {
     const res = await apiClient.get<IApiResponse<ILesson[]>>(`/sections/${sectionId}/lessons`);
     return res.data.data;
   },
   ```

3. **Bổ sung React Query Hook:**
   ```typescript
   export function useSectionLessonsQuery(sectionId: string) {
     return useQuery({
       queryKey: courseKeys.lessons(sectionId),
       queryFn: () => courseApi.getLessons(sectionId),
       enabled: Boolean(sectionId),
     });
   }
   ```

---

### 2.2. Xây Dựng Component Hiển Thị Bài Học (`SectionLessonsList`)

File: `frontend/src/features/course/components/section-lessons-list.tsx`

Tách riêng thành sub-component độc lập tuân thủ Single Responsibility và React Rules of Hooks:

```tsx
'use client';

import React from 'react';
import { Icon } from '@/components/ui/icon';
import { useSectionLessonsQuery } from '../api/course.api';

interface SectionLessonsListProps {
  sectionId: string;
}

export function SectionLessonsList({ sectionId }: SectionLessonsListProps): React.JSX.Element {
  const { data: lessons, isLoading, isError, refetch } = useSectionLessonsQuery(sectionId);

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="space-y-2 py-1 pl-4 border-l-2 border-border/40 ml-2">
        <div className="h-4 w-1/3 bg-muted/60 rounded animate-pulse" />
        <div className="h-4 w-1/2 bg-muted/40 rounded animate-pulse" />
      </div>
    );
  }

  // 2. Error State
  if (isError) {
    return (
      <div className="flex items-center justify-between text-xs text-destructive py-1.5 px-2.5 rounded-md bg-destructive/5 border border-destructive/20 ml-2">
        <span className="flex items-center gap-1.5">
          <Icon icon="lucide:alert-circle" className="size-3.5 shrink-0" />
          Không thể tải danh sách bài học
        </span>
        <button
          type="button"
          onClick={() => void refetch()}
          className="text-xs underline hover:no-underline font-medium ml-2"
        >
          Thử lại
        </button>
      </div>
    );
  }

  // 3. Empty State
  if (!lessons || lessons.length === 0) {
    return (
      <div className="py-1.5 pl-4 border-l-2 border-border/30 ml-2">
        <p className="text-xs text-muted-foreground italic">
          Chưa có bài học nào trong chương này
        </p>
      </div>
    );
  }

  // 4. Success State: Danh sách bài học theo thứ tự API trả về (order ASC)
  return (
    <div className="space-y-1 pl-4 border-l-2 border-border/40 ml-2">
      {lessons.map((lesson) => {
        const lessonOrder = String(lesson.order + 1).padStart(2, '0');
        return (
          <div
            key={lesson.id}
            className="flex items-center gap-2.5 py-1.5 px-2.5 rounded-md hover:bg-muted/30 transition-colors text-xs text-foreground group"
          >
            <Icon
              icon="lucide:play-circle"
              className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0"
            />
            <span className="font-mono text-muted-foreground text-[11px] shrink-0 font-medium">
              {lessonOrder}.
            </span>
            <span className="font-medium truncate flex-1">{lesson.title}</span>
          </div>
        );
      })}
    </div>
  );
}
```

---

### 2.3. Tích Hợp Vào `CourseSectionsList` (`course-sections-list.tsx`)

File: [`frontend/src/features/course/components/course-sections-list.tsx`](file:///d:/Download/hk1_2027/project_do_an/frontend/src/features/course/components/course-sections-list.tsx)

Cập nhật phần render từng Section:
- Giữ nguyên cấu trúc card của Section (`title`, `description`, order badge).
- Bổ sung vùng chứa phân cấp `border-t border-border/30 bg-muted/5 px-3.5 py-2.5` gọi `<SectionLessonsList sectionId={section.id} />`.
- Đảm bảo layout phân cấp rõ ràng theo đúng wireframe:
  ```text
  Section 1
    ├── Lesson 1
    ├── Lesson 2
    └── Lesson 3
  ```

---

## 3. Kế Hoạch Triển Khai Chi Tiết (Task Breakdown)

### Phase 1: Mở Rộng Types & API Client
- **Files:**
  - `frontend/src/features/course/types/course.types.ts`: Re-export `ILesson`.
  - `frontend/src/features/course/api/course.api.ts`: Bổ sung `courseKeys.lessons`, `courseApi.getLessons`, và hook `useSectionLessonsQuery`.
- **Verification:** Typecheck TypeScript cho frontend không phát sinh lỗi.

### Phase 2: Xây Dựng Component `SectionLessonsList`
- **File:** `frontend/src/features/course/components/section-lessons-list.tsx`.
- **Thực hiện:** Xây dựng component với đầy đủ 4 trạng thái (Loading, Error, Empty, Success).
- **Verification:** Export qua `frontend/src/features/course/index.ts`.

### Phase 3: Tích Hợp Vào `CourseSectionsList`
- **File:** `frontend/src/features/course/components/course-sections-list.tsx`.
- **Thực hiện:** Nhúng `<SectionLessonsList sectionId={section.id} />` dưới phần thông tin của từng Section.
- **Verification:** Kiểm tra giao diện DOM và hierarchy layout.

### Phase 4: Kiểm Định Toàn Diện (Verification)
- **Action 1 - TypeScript Typecheck:**
  ```bash
  pnpm --filter frontend exec npx tsc --noEmit
  ```
- **Action 2 - Frontend ESLint:**
  ```bash
  pnpm --filter frontend lint
  ```
- **Action 3 - Backend Regression Tests:**
  ```bash
  pnpm --filter backend test
  ```
- **Action 4 - Living Docs Update:** Cập nhật `dev-history.md` cho Milestone 20.

---

## 4. Scope Boundary Checkpoint

| Hạng Mục | Trạng Thái | Ghi Chú |
| :--- | :---: | :--- |
| `useSectionLessonsQuery` | ✅ IN-SCOPE | Hook React Query gọi GET API |
| `SectionLessonsList` | ✅ IN-SCOPE | Component hiển thị danh sách bài học con |
| Cập nhật `CourseSectionsList` | ✅ IN-SCOPE | Nhúng phân cấp bên dưới từng Section |
| Nút "Add Lesson" | ❌ OUT-OF-SCOPE | Tuyệt đối không thêm |
| Tạo bài học (Create Lesson) | ❌ OUT-OF-SCOPE | Tuyệt đối không làm |
| Chỉnh sửa bài học (Edit Lesson) | ❌ OUT-OF-SCOPE | Tuyệt đối không làm |
| Xóa bài học (Delete Lesson) | ❌ OUT-OF-SCOPE | Tuyệt đối không làm |
| Sắp xếp lại (Reorder Lesson) | ❌ OUT-OF-SCOPE | Tuyệt đối không làm |
| Lesson Editor / Video Upload | ❌ OUT-OF-SCOPE | Tuyệt đối không làm |
| Thay đổi Backend API | ❌ OUT-OF-SCOPE | Giữ nguyên 100% |
