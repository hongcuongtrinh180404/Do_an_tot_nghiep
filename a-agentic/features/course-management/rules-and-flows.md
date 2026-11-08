# Course Management — Rules & Business Flows

> **Module:** Quản lý khóa học, chương học, bài giảng video và phân quyền giảng viên/học viên.

---

## 1. Nghiệp vụ & Luồng Dữ liệu (Business Overview)

- **Cấu trúc Khóa học phân cấp**:
  - `Course` (Khóa học): Chứa thông tin tiêu đề, mô tả, ảnh bìa (thumbnail), giảng viên (`instructorId`), giá bán (`price`), trạng thái xuất bản (`isPublished`).
  - `Chapter` (Chương học): Nhóm các bài học theo chủ đề thuộc một khóa học, có trường thứ tự `orderIndex`.
  - `Lesson` (Bài học): Đơn vị học tập cốt lõi. Mỗi bài học có thể chứa Video bài giảng, Mindmap Markdown, và bộ In-video Quiz.
- **Quyền hạn Giảng viên & Quản trị viên**:
  - Giảng viên (`INSTRUCTOR`) chỉ có thể chỉnh sửa, thêm bài học và xem doanh thu thuộc các khóa học do chính mình tạo ra (`createdById === user._id`).
  - Quản trị viên (`ADMIN`) có quyền duyệt (`publish`), gỡ bài hoặc xem toàn bộ danh mục khóa học của tất cả giảng viên.
- **Quyền hạn Học viên**:
  - Học viên (`USER`) xem được danh sách khóa học, xem thử các bài học miễn phí (`isFreePreview: true`).
  - Chỉ khi đã thanh toán thành công (có bản ghi `Enrollment` hợp lệ), học viên mới được mở khóa toàn bộ bài học có tính phí.

---

## 2. Quy tắc Nghiệp vụ Cốt lõi (Core Business Rules)

1. **Thứ tự hiển thị (Order Indexing) & Kéo - Thả (Drag & Drop)**:
   - Các chương học (`Section`) và bài học (`Lesson`) được sắp xếp tăng dần theo trường `order` (0-based).
   - Khi tạo chương học mới, trường `order` tự động được tính bằng `max(current_orders) + 1` (hoặc `0` nếu là chương đầu tiên) mà không cần người dùng nhập tay.
   - Thao tác Kéo - Thả (Drag & Drop) tại giao diện Master Tree tự động kích hoạt tính năng tính toán lại vị trí và đồng bộ hàng loạt vào CSDL thông qua MongoDB Transaction với cơ chế Silent Optimistic UI.
2. **Trạng thái bài giảng liên quan tới Video**:
   - Khi tạo bài học mới và tải video lên, trạng thái video ban đầu là `UPLOADED`. Bài học chỉ có thể chuyển sang trạng thái `ACTIVE` khi AI Pipeline hoàn tất xử lý và trả về `READY`.
3. **Audit & Soft Delete**:
   - Mọi thao tác xóa khóa học/bài học đều sử dụng Soft Delete (`deletedAt != null`) để đảm bảo quyền lợi của học viên đã mua khóa học trước đó.
4. **Lưu trữ & Truy vấn Sơ đồ Tư duy (`course_mindmaps`)**:
   - Nhằm tối ưu hóa tốc độ tải trang sơ đồ tư duy cho học viên mà không phải thực hiện các phép JOIN / `$lookup` qua 4 collection (`courses` -> `sections` -> `lessons` -> `keypoints`), hệ thống duy trì một document store `course_mindmaps` với khóa chính `courseId`.
   - **Ghi (Upsert)**: Khi Giảng viên nhấn nút "Cập nhật Mindmap", backend nhận toàn bộ chuỗi JSON và thực hiện upsert ghi đè (`findOneAndUpdate` với `upsert: true`). Chỉ Giảng viên sở hữu khóa học hoặc Quản trị viên (`ADMIN`) mới có quyền ghi đè.
   - **Đọc (Query)**: Endpoint `GET /api/v1/courses/:courseId/mindmap` mở công khai (Public), cho phép học viên và khách vãng lai truy vấn trực tiếp cây phân cấp JSON trong vài mili-giây để vẽ giao diện sơ đồ tư duy 4 cấp độ.
5. **Khóa Chỉnh Sửa Khóa Học Khi Chờ Duyệt (PENDING_APPROVAL Locking)**:
   - Khi khóa học ở trạng thái `PENDING_APPROVAL`, hệ thống kích hoạt cơ chế khóa toàn diện (Read-only lock):
     - Không cho phép cập nhật tiêu đề, mô tả, slug, học phí, thumbnail, video trailer.
     - Không cho phép thêm, sửa, xóa, hoặc sắp xếp lại thứ tự chương học (`Section`).
     - Không cho phép thêm, sửa, xóa bài học (`Lesson`), tài liệu đính kèm (`material`), quiz tương tác video, hay mindmap.
     - Mọi yêu cầu ghi vi phạm sẽ bị chặn ở cấp Service và trả về `409 ConflictException`.
     - Phía giao diện giảng viên chuyển sang trạng thái tĩnh (disabled/read-only), ẩn các nút thao tác chỉnh sửa/xóa, và hiển thị banner thông báo đang chờ Admin duyệt.
6. **Quy Trình Phê Duyệt & Yêu Cầu Chỉnh Sửa Của Admin**:
   - **Phê duyệt (`PUBLISHED`)**:
     - Admin kiểm tra chất lượng khóa học và xác nhận qua Dialog phê duyệt.
     - Khóa học chuyển sang `PUBLISHED`, mở khóa cho học viên đăng ký/thanh toán.
   - **Yêu cầu chỉnh sửa (`DRAFT` kèm `rejectionReason`)**:
     - Admin bắt buộc phải nhập lý do (tối thiểu 10 ký tự, tối đa 500 ký tự) qua Dialog từ chối (ví dụ: *"Video bài giảng thứ 2 bị mất âm thanh. Vui lòng kiểm tra và gửi phê duyệt lại."*).
     - Khóa học chuyển về trạng thái `DRAFT`, lưu vết `rejectionReason`, `reviewedAt`, `reviewedById`.
     - Phía giảng viên: Giao diện mở khóa toàn bộ quyền chỉnh sửa, hiển thị Banner cảnh báo màu Amber chứa nội dung phản hồi của Admin.
     - Sau khi chỉnh sửa xong, giảng viên gửi lại phê duyệt (`requestApproval`): hệ thống tự động reset `rejectionReason: null` và chuyển trạng thái về `PENDING_APPROVAL`.
7. **Kiểm Soát Tranh Chấp Đồng Thời Của Admin (Optimistic Concurrency Control)**:
   - Khi 2 Admin cùng mở và bấm phê duyệt hoặc từ chối cùng một khóa học đồng thời:
     - MongoDB thực thi câu lệnh atomic `findOneAndUpdate` có điều kiện `{ _id: courseId, deletedAt: null, status: CourseStatusEnum.PENDING_APPROVAL }`.
     - Nhờ cơ chế Document-level lock của WiredTiger engine, chỉ đúng 1 câu lệnh cập nhật thành công.
     - Admin thứ hai sẽ không match được bản ghi nào (vì trạng thái đã đổi khác `PENDING_APPROVAL`), backend trả về ngay `409 ConflictException` ("Khóa học không ở trạng thái chờ duyệt hoặc đã được xử lý bởi quản trị viên khác.").
     - Giao diện Admin hiển thị toast lỗi rõ ràng và tự động refetch bảng dữ liệu.

8. **Phân Định Quyền Hạn Triệt Để Giữa Trải Nghiệm Học Viên & Studio Biên Tập (Strict Dual-Mode Isolation)**:
   - **Nguyên tắc cốt lõi**: Khi Giảng viên hoặc Quản trị viên truy cập vào bài học/khóa học với tư cách học viên, tuyệt đối không được có bất kỳ quyền hạn hay giao diện chỉnh sửa nào can thiệp.
   - **Tầng Backend (`LessonManagementGuard`)**:
     - Mọi endpoint sửa đổi bài học (`POST /sections/:sectionId/lessons`), upload/xóa tài liệu (`/lessons/:id/materials`), xóa bài học, retry phiên âm, đồng bộ/xóa quiz (`/lessons/:id/quizzes`), và kích hoạt AI phân tích transcript (`/lessons/:id/analysis/*`) bắt buộc phải gắn `@UseGuards(LessonManagementGuard)`.
     - Guard tự động truy vết ngược cây thực thể: `quizId -> lessonId -> sectionId -> courseId`, kiểm tra quyền sở hữu `course.instructorId === user.id` (hoặc `RoleEnum.ADMIN`), loại trừ dữ liệu bị xóa mềm (`deletedAt`), và chặn thao tác nếu khóa học đang ở trạng thái `PENDING_APPROVAL` (409 Conflict).
   - **Tầng Frontend (`CourseViewMode`)**:
     - Quy ước hiển thị: Mặc định tất cả các route chi tiết khóa học `/courses/:id` và bài học `/courses/:id/lessons/:id` đều hoạt động ở chế độ `'learn'` (Học tập thuần túy).
     - Chỉ khi có query parameter tường minh `?mode=edit` và thỏa mãn `canEditCourseContent(user, course, mode)`, giao diện mới mở các tính năng biên tập: sửa node Mindmap, kéo thả canvas, marker timeline quiz, modal thêm câu hỏi, và sửa tóm tắt bài giảng.
     - Khi xem ở chế độ học viên, hệ thống khóa kéo thả node canvas (`nodesDraggable={false}`), ẩn các trigger thêm/sửa/xóa và nút sinh AI.


9. **Vòng Đời Khóa Học: Hủy Duyệt, Xóa Khóa Học, Ngừng Bán & Mở Bán Lại (Course Lifecycle & Deletion Rules)**:
   - **Hủy / Rút yêu cầu phê duyệt (`cancel-approval` / `withdraw-approval`)**:
     - Khi khóa học ở trạng thái `PENDING_APPROVAL`, giảng viên có quyền chủ động hủy/rút yêu cầu duyệt.
     - Backend thực hiện atomic transition: `PENDING_APPROVAL` -> `DRAFT`, đồng thời reset `approvalRequestedAt: null`.
     - Ngay sau khi rút duyệt, khóa học mở khóa trở lại toàn bộ quyền biên tập (sửa thông tin, thêm/sửa/xóa bài học, upload video, v.v.) hoặc cho phép giảng viên tiến hành xóa khóa học.
   - **Quy tắc Nghiệp vụ Xóa Khóa Học (`DELETE /api/v1/courses/:id`)**:
     - **Bản nháp (`DRAFT`)**: Cho phép xóa.
     - **Đang chờ duyệt (`PENDING_APPROVAL`)**: **CHẶN XÓA TUYỆT ĐỐI** (ném `409 ConflictException`). Giảng viên phải rút yêu cầu duyệt về `DRAFT` trước khi thực hiện xóa.
     - **Đã xuất bản (`PUBLISHED`) và chưa có học viên (`studentsCount === 0`)**: Cho phép xóa.
     - **Đã có học viên ghi danh (`studentsCount > 0`)**: **CHẶN XÓA TUYỆT ĐỐI** (ném `400 BadRequestException`). Nhằm bảo vệ quyền học tập và lịch sử thanh toán của học viên, hệ thống chỉ cho phép chuyển sang trạng thái **Ngừng bán (`ARCHIVED`)**.
     - **Xóa nguyên tử (Cascade Soft-delete via MongoDB Session)**: Thao tác xóa khóa học được đóng gói trong một `ClientSession` transaction: đồng thời cập nhật `deletedAt` cho Course, tất cả Sections, tất cả Lessons, và CourseMindmap liên quan.
     - **Dọn dẹp vật lý trên MinIO**: Sau khi transaction commit thành công, hệ thống tự động quét và xóa vật lý toàn bộ file liên kết trên MinIO (thumbnail, trailer, video bài học, tài liệu đính kèm) để giải phóng dung lượng lưu trữ.
   - **Ẩn / Ngừng Bán (`ARCHIVED`) & Mở Bán Lại (`PUBLISHED`)**:
     - **Ngừng bán (`POST /api/v1/courses/:id/archive`)**: Chuyển trạng thái từ `PUBLISHED` sang `ARCHIVED`. Khóa học sẽ bị ẩn khỏi danh mục sàn/tìm kiếm công khai và ngăn học viên mới mua.
     - **Bảo lưu quyền học viên**: Học viên đã mua khóa học trước đó vẫn giữ nguyên 100% quyền truy cập, xem video bài giảng, mindmap và làm bài kiểm tra bình thường.
     - **Mở bán lại (`POST /api/v1/courses/:id/unarchive`)**: Giảng viên có thể mở bán lại khóa học từ `ARCHIVED` trở về `PUBLISHED` bất kỳ lúc nào để tiếp tục nhận học viên mới.
   - **Tìm kiếm, Lọc & Thống kê Giảng viên (Instructor Analytics Toolbar)**:
     - Trang quản lý khóa học của giảng viên cung cấp 6 thẻ chỉ số: Tổng số khóa học, Đã xuất bản, Đang chờ duyệt, Bản nháp, Ngừng bán, Tổng học viên.
     - Hỗ trợ thanh tìm kiếm theo tên khóa học tức thời, tab lọc theo trạng thái và sắp xếp đa tiêu chí (Mới nhất, Cũ nhất, Nhiều học viên nhất, Tên A-Z).
