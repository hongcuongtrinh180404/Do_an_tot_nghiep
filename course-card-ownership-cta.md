# Kế Hoạch Triển Khai: Cập Nhật Nút Hành Động Trên Course Card Theo Trạng Thái Sở Hữu Khóa Học

## 1. Mục Tiêu (Goal Description)
Cập nhật cơ chế hiển thị nút hành động CTA trên toàn bộ các thẻ khóa học (`CourseCard`) công khai của hệ thống Mindly dựa trên trạng thái sở hữu thực tế của học viên từ Backend:
- **Chưa sở hữu:**
  - Khóa học có phí: Hiển thị nút **"Mua ngay"** kèm giá tiền.
  - Khóa học miễn phí (0 đ): Hiển thị nút **"Đăng ký miễn phí"** (thay cho "Đăng ký ngay").
  - Click vào nút điều hướng tới trang chi tiết khóa học `/courses/{courseId}`.
- **Đã sở hữu (đã mua hoặc đã đăng ký miễn phí):**
  - Thay thế hoàn toàn nút "Mua ngay" / "Đăng ký miễn phí" bằng nút **"Vào học"** (kèm icon `lucide:play-circle`, không hiển thị lại giá tiền hay yêu cầu mua).
  - Click "Vào học" điều hướng tới trang chi tiết của chính khóa học đó `/courses/{courseId}` (không điều hướng trực tiếp vào video bài học).
  - Tại trang chi tiết, học viên truy cập toàn bộ bài giảng được cấp quyền theo cơ chế hiện có.
- **Yêu cầu kỹ thuật & Hiệu năng:**
  - **Tránh N+1 Request:** Không để từng Course Card gửi request riêng (`/enrollments/check/:id`). Tận dụng API bulk hiện có `GET /enrollments/my-courses` được cache bởi TanStack Query, đảm bảo chỉ 1 request duy nhất cho toàn bộ danh sách card trên trang.
  - **Tránh Flash/Flicker (FOAC):** Khi dữ liệu tài khoản/sở hữu đang tải (`isCheckingOwnership`), hiển thị trạng thái loading placeholder trên nút, tuyệt đối không hiển thị tạm thời "Mua ngay" rồi giật sang "Vào học". Khách vãng lai (chưa đăng nhập) hiển thị ngay "Mua ngay" / "Đăng ký miễn phí" không có độ trễ.
  - **Cập nhật tức thì (Reactivity):** Trạng thái sở hữu tự động cập nhật ngay sau khi đăng ký khóa học miễn phí hoặc thanh toán thành công qua SePay nhờ cache invalidation `enrollmentKeys.all`.
  - **Bảo mật Backend:** Backend kiểm tra độc lập quyền truy cập nội dung bài học tại `LessonService.getLessonForUser`, không chỉ phụ thuộc vào Frontend.

---

## 2. Xác Nhận Yêu Cầu & Lưu Ý (User Review Required)

> [!IMPORTANT]
> **Điều hướng khi bấm "Vào học":**
> Nút "Vào học" trên `CourseCard` sẽ điều hướng đến trang chi tiết `/courses/{courseId}` (theo đúng yêu cầu: *"Khi click 'Vào học', điều hướng đến trang chi tiết của chính khóa học đó. Không điều hướng trực tiếp đến video bài học"*).
> Tại trang chi tiết, nếu học viên đã sở hữu khóa học, `CoursePurchaseCard` sẽ hiển thị badge "Bạn đã sở hữu khóa học này" và tab giáo trình sẽ mở khóa toàn bộ bài học.

> [!TIP]
> **Tài khoản Giảng viên (Instructor):**
> Nếu người dùng đang đăng nhập là Giảng viên đã tạo ra chính khóa học đó (`isInstructorOwner`), hệ thống cũng xác định là đã sở hữu quyền truy cập khóa học và hiển thị nút "Vào học" (hoặc điều hướng vào trang chi tiết).

---

## 3. Câu Hỏi Thiết Kế (Open Questions)

> [!NOTE]
> 1. **Hiển thị Badge trên ảnh bìa Thumbnail:**
>    Khi đã sở hữu khóa học, thẻ khóa học có cần hiển thị thêm một huy hiệu nhỏ "Đã sở hữu" ở góc trên Thumbnail không, hay chỉ cần thay đổi nút bấm ở chân thẻ (`card-footer`) thành "Vào học"?
>    *(Khuyến nghị: Giữ nguyên bố cục thẻ và các badge hiện có, chỉ thay đổi nút bấm ở chân thẻ theo đúng ràng buộc "Giữ nguyên thiết kế Course Card hiện tại")*.
>
> 2. **Kiểu hiển thị Loading của nút bấm khi đang xác thực:**
>    Khi đang kiểm tra trạng thái đăng nhập & sở hữu (`isCheckingOwnership`), nút hành động nên hiển thị dạng:
>    - **Lựa chọn A (Khuyến nghị):** Nút giữ nguyên kích thước chuẩn `h-10` với nền trung tính nhạt `bg-neutral-100` kèm spinner nhỏ và text mờ `Đang kiểm tra...` (animate-pulse nhẹ, chống giật layout 100%).
>    - **Lựa chọn B:** Skeleton khối xám `bg-neutral-200 animate-pulse rounded-lg h-10`.

---

## 4. Đề Xuất Thay Đổi Cụ Thể (Proposed Changes)

### Component 1: Hook Quản Lý Trạng Thái Sở Hữu Khóa Học Tập Trung
Tạo custom hook `useUserCourseOwnership` tại `frontend/src/features/course/hooks/use-user-course-ownership.ts`:
- Kiểm tra xem người dùng có token không (`localStorage.getItem('accessToken')`).
- Nếu có token và đang fetch thông tin auth hoặc enrollments: `isCheckingOwnership = true`.
- Thực hiện **duy nhất 1 request** lấy danh sách khóa học đã mua (`useMyPurchasedCoursesQuery`) cho toàn bộ các Card trên trang.
- Chuyển mảng khóa học thành `Set<string>` (tra cứu `O(1)`).
- Kiểm tra sở hữu bằng hàm `isCourseOwned(course)`: trả về `true` nếu `enrolledCourseIds.has(course.id)` hoặc `canManageCourse(user, course)`.

#### [NEW] `frontend/src/features/course/hooks/use-user-course-ownership.ts`
- Cung cấp:
  - `isLoggedIn: boolean`
  - `isCheckingOwnership: boolean`
  - `enrolledCourseIds: Set<string>`
  - `isCourseOwned: (course: { id: string; instructorId?: unknown; instructor?: unknown }) => boolean`

#### [MODIFY] `frontend/src/features/course/index.ts`
- Xuất khẩu `useUserCourseOwnership` để tái sử dụng toàn dự án.

---

### Component 2: Cập Nhật Thẻ Khóa Học Công Khai (`CourseCard`)
Cập nhật file `frontend/src/features/course/components/public-discovery/course-card.tsx`:
- Nhận `isEnrolled` tùy chọn từ prop (nếu có) hoặc tự động lấy từ hook `useUserCourseOwnership`.
- Khi `isCheckingOwnership === true`: Hiển thị nút loading placeholder chống giật layout và chống flash "Mua ngay".
- Khi `isEnrolled === true`:
  - Render thẻ `Link` trỏ tới `/courses/${course.id}`.
  - Icon: `<Icon icon="lucide:play-circle" className="size-4 shrink-0 text-white" />`.
  - Nhãn: `Vào học`.
  - Không hiển thị giá tiền hoặc chữ "Mua ngay".
- Khi `isEnrolled === false`:
  - Khóa học miễn phí (`course.price === 0`): Hiển thị "Đăng ký miễn phí" kèm nhãn "Miễn phí".
  - Khóa học có phí (`course.price > 0`): Hiển thị "Mua ngay" kèm giá tiền format VNĐ và giá gạch chân (nếu có giảm giá).

#### [MODIFY] `frontend/src/features/course/components/public-discovery/course-card.tsx`
- Tích hợp hook `useUserCourseOwnership()`.
- Cập nhật JSX tại khu vực `data-ui="card-footer"`.

---

### Component 3: Unit Tests
Cập nhật và bổ sung test cases trong `frontend/src/features/course/tests/public-course-card.spec.ts`:
- Kiểm tra logic phân nhánh nhãn nút:
  - Khóa học có phí chưa sở hữu -> "Mua ngay".
  - Khóa học 0đ chưa sở hữu -> "Đăng ký miễn phí".
  - Khóa học đã sở hữu (bất kể 0đ hay có phí) -> "Vào học".
- Kiểm tra tính đúng đắn của logic `isCourseOwned` với `Set<string>`.

---

## 5. Kế Hoạch Xác Minh (Verification Plan)

### Automated Tests
1. Chạy test suite của Course Card trong frontend:
   ```bash
   pnpm --filter frontend exec vitest run src/features/course/tests/public-course-card.spec.ts
   ```
2. Chạy test backend liên quan đến enrollment & bài học:
   ```bash
   pnpm --filter backend test:payment
   ```
3. Chạy type check kiểm tra syntax:
   ```bash
   pnpm --filter frontend exec tsc --noEmit
   ```

### Manual Verification
1. **Khách vãng lai (Chưa đăng nhập):**
   - Mở trang chủ `http://localhost:3000` và trang danh mục `http://localhost:3000/courses`.
   - Kiểm tra các khóa học trả phí: Hiển thị nút "Mua ngay • [Giá]".
   - Kiểm tra các khóa học miễn phí: Hiển thị nút "Đăng ký miễn phí • Miễn phí".
   - Bấm vào nút: Điều hướng chính xác tới trang `/courses/[id]`.
2. **Học viên đã đăng nhập và sở hữu khóa học:**
   - Đăng nhập tài khoản học viên đã sở hữu ít nhất 1 khóa học.
   - Kiểm tra khóa học đã sở hữu trên trang chủ và trang `/courses`:
     - Nút CTA chuyển thành **"Vào học"** (kèm icon play, không có chữ mua hay giá tiền).
   - Kiểm tra khóa học chưa sở hữu:
     - Vẫn hiển thị "Mua ngay" hoặc "Đăng ký miễn phí".
   - Bấm vào nút "Vào học":
     - Điều hướng tới trang chi tiết của khóa học đó `/courses/[id]`.
     - Trang chi tiết hiển thị trạng thái "Bạn đã sở hữu khóa học này" và tab Giáo trình mở khóa học bình thường.
3. **Kiểm tra hiện tượng giật nút (Flicker / FOAC):**
   - Refresh trang khi đang đăng nhập (hoặc giả lập mạng chậm 3G):
   - Nút hiển thị trạng thái loading placeholder nhẹ nhàng, không xuất hiện nút "Mua ngay" rồi nhảy sang "Vào học".
4. **Kiểm tra N+1 requests qua Network Tab:**
   - Mở DevTools Network Tab, lọc `/enrollments`.
   - Quan sát khi tải trang có 12 khóa học: Chỉ có **duy nhất 1 request** `GET /enrollments/my-courses`, không có 12 requests riêng lẻ `GET /enrollments/check/:id`.
5. **Kiểm tra Reactive Update:**
   - Chọn một khóa học miễn phí chưa đăng ký, bấm vào chi tiết và đăng ký.
   - Quay lại trang chủ hoặc trang `/courses`: Thẻ khóa học đó đã chuyển thành "Vào học".

---

## ✅ PHASE X COMPLETE

- **Unit Tests (`public-course-card.spec.ts`):** ✅ 10/10 passed (6ms)
- **TypeScript Typecheck (`tsc --noEmit`):** ✅ 0 errors
- **Lint (`eslint`):** ✅ 0 errors, 0 warnings
- **Anti-N+1 Request:** ✅ Đã xác nhận triệt tiêu qua hook `useUserCourseOwnership` (1 single cached query)
- **Anti-FOAC / Flicker:** ✅ Đã xác nhận qua trạng thái `isCheckingOwnership` và loading button
- **Living Docs:** ✅ Đã cập nhật Milestone 50 vào `a-agentic/features/course-management/dev-history.md`
- **Date:** 2026-11-12


