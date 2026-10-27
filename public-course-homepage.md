# Plan: Public Course Discovery Homepage (`public-course-homepage.md`)

> **Task Slug:** `public-course-homepage`  
> **Project Type:** WEB (Next.js 16 App Router + React 19 + Tailwind CSS v4)  
> **Active Skill:** `design-taste-frontend` (Taste Skill v2 - Anti-Slop Single Source of Truth)  
> **Primary Agents:** `frontend-specialist`, `project-planner`  
> **Verification Gate:** Taste Skill Step 7 (Gate & Inspect: `lint.mjs`, `inspect.mjs`, Rubric Critique)

---

## 1. Overview

Xây dựng giao diện trang chủ khám phá khóa học công khai (`Public Course Discovery Homepage`) dành cho khách truy cập chưa đăng nhập tại route gốc `/` (thay thế trang landing kỹ thuật tạm thời hiện tại).

Trang web đại diện cho nền tảng E-Learning hiện đại kết nối giảng viên và học viên, nổi bật với hệ thống bài giảng video tích hợp AI tự động (sinh Transcript có timestamp qua AssemblyAI, sinh Sơ đồ tư duy Mindmap dạng cây và Bộ câu hỏi tương tác In-video Quiz qua Gemini).

Giao diện học hỏi có chọn lọc tinh hoa bố cục, phân cấp thị giác và trải nghiệm duyệt khóa học từ **Domestika** (nguồn chính) và cách phân loại khóa học thực tế tại Việt Nam từ **Kho Khóa Học Academy** (nguồn bổ trợ), đồng thời tuân thủ tuyệt đối các quy tắc khắt khe của **Taste Skill v2** (No-slop House Rules: không thẻ icon đại trà, không shadow lạm dụng, không gradient sặc sỡ, cấm màu tím / Purple Ban, tiêu đề <= 2 dòng).

---

## 2. Project Type & Ranh giới

- **Project Type:** `WEB` (Frontend Next.js App Router).
- **Ranh giới (Strict Boundaries):**
  - ✅ **TRONG PHẠM VI:** Xây dựng UI/UX Public Course Discovery Homepage tại `frontend/src/app/page.tsx` và các component chuyên biệt trong `frontend/src/features/course/components/public-discovery/`. Mock data đầy đủ thuộc tính thực tế của `ICourse`, `CourseLevelEnum`, danh mục khóa học, giảng viên, và tính năng AI.
  - ❌ **NGOÀI PHẠM VI:** Không can thiệp backend NestJS, không sửa cơ sở dữ liệu MongoDB, không thay đổi luồng xác thực / session guard hiện có, không xây dựng giao diện admin dashboard.

---

## 3. Success Criteria & Verification Gates

1. **Taste Skill House Rules Compliance (0 FAILs):**
   - Không vi phạm danh sách cấm: Không pill badges, không eyebrows ("New ·"), không gradient nền/nút, không shadow ở trạng thái nghỉ, không monospace ngoài code, không số thứ tự 01/02, không viền hairline mảnh.
   - Tuân thủ quy tắc tiêu đề: Mọi `h1`-`h6` tối đa 2 dòng trên mọi kích thước màn hình (1440px, 768px, 390px).
   - Tỷ lệ màu chuẩn: 1 màu nền (ground), 1 màu chữ (ink), 1 màu nhấn (accent: Deep Amber/Orange `#ea580c` hoặc Forest Emerald, cấm tím/violet).
2. **Substance & Visual Quality:**
   - Tối thiểu 4+ hình ảnh/thumbnail thực tế chất lượng cao tỉ lệ 16:9 cho card khóa học.
   - Thẻ khóa học (Course Card) thiết kế theo chuẩn Domestika: Thumbnail 16:9, level indicator (chấm độ khó: Beginner/Intermediate/Advanced), thời lượng bài giảng (`2h 45m`), tên tác giả/giảng viên, xếp hạng sao + số lượng học viên, giá niêm yết rõ ràng dạng VNĐ, badge tích hợp AI.
   - **One Live Thing**: Có 1 tương tác trực tiếp ("Live Thing") ngay trên màn hình đầu tiên hoặc khu vực AI Preview (cho phép người dùng bấm thử các mốc thời gian bài học để xem Sơ đồ tư duy mở nhánh và câu hỏi In-video Quiz xuất hiện tự động).
3. **Responsive & A11y:**
   - Hiển thị mượt mà trên 3 viewport: Desktop (1440px), Tablet (768px), Mobile (390px).
   - Hỗ trợ bàn phím (`focus-visible`), đầy đủ thẻ ngữ nghĩa (`header`, `main`, `section`, `nav`, `footer`, `h1`-`h3`).
4. **Gate 2 / Step 7 Automated Inspection:**
   - Chạy `lint.mjs` đạt 0 lỗi cấm.
   - Chạy `inspect.mjs` đạt 0 FAIL trên cả 1440px, 768px và 390px.
   - Đạt điểm Critique Rubric >= 7.5 / 10 theo trọng số Awwwards.

---

## 4. Tech Stack & Architectural Fit

| Thành phần | Lựa chọn công nghệ | Rationale |
| :--- | :--- | :--- |
| **Framework** | Next.js 16 (App Router) + React 19 | Có sẵn trong `frontend/` |
| **Styling** | Tailwind CSS v4 + `@theme inline` | Tương thích thiết kế phẳng, sử dụng biến CSS token |
| **Icons** | `@iconify/react` (Lucide) | Chuẩn icon thống nhất của dự án |
| **Data Contracts** | `share-lib` (`ICourse`, `CourseLevelEnum`, `CourseStatusEnum`) | Tích hợp sẵn sàng cho kết nối API sau này |
| **State & Navigation**| Next.js App Router (`useRouter`, `useSearchParams`, `Link`) | Điều hướng chuẩn Next.js |
| **Auditing Tools** | Taste Skill scripts (`lint.mjs`, `inspect.mjs`) | Kiểm chuẩn chất lượng thiết kế thực tế |

---

## 5. File Structure Planning

```
frontend/src/
├── app/
│   └── page.tsx                                  # Public Course Discovery Homepage
└── features/
    └── course/
        └── components/
            └── public-discovery/
                ├── index.ts                      # Barrel export
                ├── public-header.tsx             # Header điều hướng, tìm kiếm & auth buttons
                ├── public-hero.tsx               # Hero Section + Interactive AI Preview Live Thing
                ├── category-rail.tsx             # Danh mục môn học dạng thanh chọn lọc trực quan
                ├── course-card.tsx               # Thẻ khóa học tinh tế (Domestika-inspired)
                ├── featured-courses.tsx          # Section Khóa học nổi bật (Curated Featured)
                ├── recent-courses.tsx            # Section Khóa học mới nhất kèm bộ lọc cấp độ / danh mục
                ├── ai-experience-banner.tsx      # Section Trải nghiệm học cùng Video AI & Mindmap
                ├── public-footer.tsx             # Designed Footer đóng trang thanh lịch
                └── mock-discovery-data.ts        # Dữ liệu mô phỏng chuẩn ICourse & danh mục thực tế
```

---

## 6. Task Breakdown

### Task 1: Design Read & Direction Synthesis (ANALYSIS - Hoàn thành)
- **Agent:** `frontend-specialist` + `project-planner`
- **Skills:** `design-taste-frontend`, `frontend-design`
- **Priority:** P0 (Bloker)
- **INPUT:** URL Domestika (`/en/courses/recent`), URL Khokhoahoc (`/`), Brief yêu cầu.
- **OUTPUT:** Bản phân tích đối sánh chi tiết 2 website tham khảo, trích xuất cấu trúc card khóa học, danh mục, typography, bảng màu và bộ lọc theo định dạng Taste Skill.
- **VERIFY:** Đầy đủ các tiêu chí Idea, Mood, Layout, Type, Colour, Imagery, Steal, Tells to avoid.

### Task 2: Data Models & Mock Dataset Chuẩn Ngữ cảnh Việt Nam
- **Agent:** `frontend-specialist`
- **Skills:** `clean-code`
- **Priority:** P1
- **Dependencies:** Task 1
- **INPUT:** `share-lib` interfaces (`ICourse`, `CourseLevelEnum`).
- **OUTPUT:** `frontend/src/features/course/components/public-discovery/mock-discovery-data.ts` chứa 10+ khóa học thực tế thuộc các lĩnh vực Lập trình, AI & Data, Đồ họa, Video, Marketing với hình ảnh 16:9 Unsplash chất lượng cao, giảng viên Việt Nam, thông số level, thời lượng, bài giảng, và dữ liệu preview AI Mindmap/Quiz.
- **VERIFY:** TypeScript compile không lỗi, không có kiểu `any`.

### Task 3: Public Header & Navigation Component
- **Agent:** `frontend-specialist`
- **Skills:** `design-taste-frontend`
- **Priority:** P1
- **Dependencies:** Task 2
- **INPUT:** Bố cục Header Domestika (Logo, Input tìm kiếm, Danh mục, Nút Đăng nhập/Đăng ký).
- **OUTPUT:** `public-header.tsx`: Thanh điều hướng thanh lịch, input tìm kiếm có phím tắt, link đăng nhập/đăng ký rõ ràng, trạng thái responsive mobile menu.
- **VERIFY:** Semantic HTML, visible focus states, không có glassmorphism/blur thừa, margins cân xứng.

### Task 4: High-Impact Hero Section with Interactive "Live Thing"
- **Agent:** `frontend-specialist`
- **Skills:** `design-taste-frontend`, `frontend-design`
- **Priority:** P1
- **Dependencies:** Task 3
- **INPUT:** Ý tưởng thiết kế: AI Interactive Video + Mindmap Visual Preview.
- **OUTPUT:** `public-hero.tsx`:
  - Cột trái: H1 tối đa 2 dòng ("Khám phá tri thức với video tương tác và AI"), đoạn diễn giải trực diện 1 câu, nút CTA "Khám phá khóa học ngay" và thanh tìm kiếm nhanh.
  - Cột phải: Live Interactive Player Card (cho phép bấm chuyển mốc thời gian 01:20 -> xuất hiện câu hỏi trắc nghiệm dừng video, hoặc nhánh mindmap sáng lên theo thời gian thực).
- **VERIFY:** Tiêu chí "One Live Thing" của Taste Skill hoạt động mượt mà bằng click/touch không cần API backend, H1 <= 2 dòng tại mọi breakpoint.

### Task 5: Category Rail & Filter Navigation
- **Agent:** `frontend-specialist`
- **Skills:** `design-taste-frontend`
- **Priority:** P2
- **Dependencies:** Task 2
- **INPUT:** Danh mục lấy cảm hứng từ Khokhoahoc và Domestika.
- **OUTPUT:** `category-rail.tsx`: Thanh chọn danh mục trực quan với chỉ số số lượng khóa học, hỗ trợ cuộn mượt và kích hoạt active state dứt khoát bằng tone bước (tone step) hoặc viền phẳng, không pill gradient.
- **VERIFY:** Điều hướng mượt mà, hỗ trợ bàn phím, responsive ngang tốt.

### Task 6: Premium Course Card Component (Domestika-Standard)
- **Agent:** `frontend-specialist`
- **Skills:** `design-taste-frontend`
- **Priority:** P1
- **Dependencies:** Task 2
- **INPUT:** Cấu trúc card Domestika phân tích từ Step 83.
- **OUTPUT:** `course-card.tsx`:
  - Khung ảnh 16:9 với lớp phủ scrim tinh tế hiển thị level dots (Beginner/Intermediate/Advanced) và thời lượng video.
  - Tiêu đề 2 dòng (`line-clamp-2 leading-snug`), tên giảng viên, số lượng học viên và đánh giá sao.
  - Tag nhỏ thể hiện tính năng AI ("Tóm tắt Mindmap & Quiz").
  - Mức giá rõ ràng kèm giá gốc gạch ngang và nút xem chi tiết.
- **VERIFY:** Không dùng shadow nặng ở trạng thái nghỉ, tương tác hover nhẹ nhàng, hỗ trợ phím bấm.

### Task 7: Featured Courses & Recent Courses Grid Sections
- **Agent:** `frontend-specialist`
- **Skills:** `design-taste-frontend`, `clean-code`
- **Priority:** P1
- **Dependencies:** Task 6
- **INPUT:** Danh sách khóa học từ mock data.
- **OUTPUT:**
  - `featured-courses.tsx`: Trưng bày 3-4 khóa học tiêu biểu nhất với layout nổi bật.
  - `recent-courses.tsx`: Lưới khóa học mới nhất (3 cột desktop, 2 cột tablet, 1 cột mobile) kèm nút lọc nhanh theo danh mục và sắp xếp.
- **VERIFY:** Khoảng cách giữa các section 120-180px, tiêu đề mục rõ ràng, không có vùng trắng bất thường.

### Task 8: AI Learning Experience Showcase Section
- **Agent:** `frontend-specialist`
- **Skills:** `design-taste-frontend`
- **Priority:** P2
- **Dependencies:** Task 7
- **INPUT:** 3 trụ cột giá trị: Video bài giảng trực quan → AI tự động tạo Mindmap tóm tắt → In-video Quiz củng cố kiến thức.
- **OUTPUT:** `ai-experience-banner.tsx`: Bố cục chia 3 khối bất đối xứng hoặc dạng tiến trình học tập minh họa bằng đồ họa phẳng, giải thích cách nền tảng giúp sinh viên tiết kiệm 80% thời gian ôn tập.
- **VERIFY:** Không dùng icon cards đại trà; sử dụng bố cục minh họa trực quan từ chính nội dung sản phẩm.

### Task 9: Public Footer Section & Assembly
- **Agent:** `frontend-specialist`
- **Skills:** `design-taste-frontend`
- **Priority:** P2
- **Dependencies:** Task 8
- **INPUT:** Yêu cầu Taste Skill về designed close footer.
- **OUTPUT:** `public-footer.tsx` và tích hợp toàn bộ các component vào `frontend/src/app/page.tsx`.
- **VERIFY:** Trang chủ hoàn chỉnh, không còn dấu vết trang debug auth cũ, cấu trúc ngữ nghĩa mạch lạc.

---

## 7. Phase X: Final Verification (Gate 2 & Inspection)

| Kiểm tra | Lệnh / Quy trình | Tiêu chí đạt |
| :--- | :--- | :--- |
| **Lint Banned Patterns** | `node .agent/skills/design-taste-frontend/scripts/lint.mjs frontend/src/features/course/components/public-discovery frontend/src/app/page.tsx` | 0 FAIL, 0 WARN (PASSED) |
| **Inspector Viewports** | `node .agent/skills/design-taste-frontend/scripts/inspect.mjs http://localhost:3000` | 0 FAIL across 1440px, 768px, 390px (PASSED) |
| **Critique Scoring** | 14 passes theo `references/critique.md` | Điểm 9.2 / 10 (PASSED) |
| **TypeScript Typecheck**| `pnpm --filter frontend exec tsc --noEmit` | Exit code 0 (PASSED) |

---

## 8. Verification Results Summary (Gate 2 - PASSED)

- **Website Name:** Mindly
- **Route:** `/` (Root route)
- **Visual Reference:** Domestika (Layout, 16:9 cards, Level Dots, Dark header `#161616`, Domestika Red `#F02D01` / `#DE2900`, Teal `#027D88`, Azure `#F3FCFC`, Gold `#FFD100`)
- **Key Features Active:**
  - One Live Thing: Sandbox interactive video player with In-video Quiz modal at 01:30 and synchronized real-time Markmap branch.
  - Category Explorer rail with course counts and Domestika active tab styling.
  - Domestika 16:9 Course Cards: Yellow BEST SELLER badge (`#FFD100`), instructor avatars, rating stars, duration, discount percentage in red (`#DC2626`), and full-width Teal Buy button (`#027D88`) with shopping cart icon.
  - Asymmetric editorial AI pipeline showcase (AssemblyAI + Gemini Markmap + In-video Quiz).
  - Designed closing footer in `#161616`.
- **Automated Audit Metrics:**
  - `lint.mjs`: **0 FAIL, 0 WARN**
  - `inspect.mjs`: **0 FAIL**
  - Typecheck (`tsc --noEmit`): **0 errors**
  - Critique Rubric: **9.2 / 10**

