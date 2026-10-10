# Plan: Khắc Phục Tụ Tập Nhiều Chấm Vàng Tại 1 Điểm & Gom Cụm 1 Chấm Duy Nhất (Single Quiz Marker Clustered Flow)

> **File:** `docs/PLAN-single-quiz-marker.md`  
> **Feature:** `interactive-video-player`  
> **Module:** Frontend Video Timeline Player  
> **Status:** PLANNING (Chờ người dùng duyệt trước khi triển khai)

---

## 1. Hiện Trạng & Phân Tích Nguyên Nhân Gốc Rễ (Root Cause Analysis)

Quan sát ảnh chụp từ giao diện thực tế của người dùng: Trên thanh timeline xuất hiện hiện tượng **2 hoặc nhiều chấm vàng nằm chồng chéo hoặc dính sát vào nhau tại cùng một vị trí**.

### Nguyên nhân 1: Xung đột giữa Mock State và Database State
- Trong [`lesson-video-screen.tsx`](file:///d:/Download/hk1_2027/project_do_an/frontend/src/features/course/components/player/lesson-video-screen.tsx), trước đây khi chưa có backend thật, hệ thống dùng state tạm thời:
  ```tsx
  const [createdQuizzes, setCreatedQuizzes] = useState<Array<{ timestamp: number; question: string }>>([]);
  ```
- Khi lưu câu hỏi (`handleSaveAll` trong `CreateQuizMarkerModal`), hệ thống vừa lưu vào MongoDB (làm `dbQuizzes` tải lại và sinh chấm vàng từ `quizCheckpoints`), vừa đồng thời gọi `onSavedMock` nhồi dữ liệu vào `createdQuizzes`!
- Cả hai danh sách này cùng lúc thực hiện `.map()` và vẽ chấm vàng lên thanh tua, dẫn đến việc **vẽ đè 2 chấm vàng tại cùng một điểm**!

### Nguyên nhân 2: Trôi số thực Timestamp và thiếu gom cụm lân cận
- Khi click trên thanh tua, tọa độ chuột tạo ra `timestamp` có phần thập phân (ví dụ: `15.34s` và lần sau bấm lại là `16.12s`).
- Hàm nhóm `quizCheckpoints` dùng `Math.floor(q.timestamp)`, làm biến thành 2 key riêng biệt `15` và `16`.
- Trên thanh video dài hàng trăm giây, khoảng cách giữa giây 15 và 16 chỉ xê dịch khoảng 1 - 2 pixel, tạo ra hiệu ứng 2 chấm vàng dính chùm vào nhau như trên ảnh.

---

## 2. Mục Tiêu & Giải Pháp Đề Xuất

### Mục tiêu:
Dù tại một mốc thời gian (hoặc khoảng thời gian sát nhau $\le 2$s) có bao nhiêu câu hỏi đi chăng nữa, trên thanh timeline **CHỈ XUẤT HIỆN DUY NHẤT 1 CHẤM VÀNG ĐẸP MẮT**.

### Giải pháp kỹ thuật:

1. **Xóa bỏ triệt để Mock State `createdQuizzes`:**
   - Xóa bỏ `createdQuizzes`, xóa bỏ prop `onSavedMock` và khối JSX map `createdQuizzes.map(...)`.
   - Toàn bộ chấm vàng trên thanh timeline được quản lý bởi một nguồn sự thật duy nhất (Single Source of Truth) là `dbQuizzes` từ MongoDB.

2. **Thuật toán Gom cụm Checkpoint lân cận (Cluster Window $\pm 2$s):**
   - Khi chuyển đổi `dbQuizzes` sang `quizCheckpoints`:
     ```tsx
     const quizCheckpoints = useMemo(() => {
       const map = new Map<number, typeof dbQuizzes>();
       const sorted = [...dbQuizzes].sort((a, b) => a.timestamp - b.timestamp);
       for (const q of sorted) {
         const rounded = Math.round(q.timestamp);
         let clusterKey: number | null = null;
         for (const existingKey of map.keys()) {
           if (Math.abs(existingKey - rounded) <= 2) {
             clusterKey = existingKey;
             break;
           }
         }
         if (clusterKey !== null) {
           map.get(clusterKey)!.push(q);
         } else {
           map.set(rounded, [q]);
         }
       }
       return map;
     }, [dbQuizzes]);
     ```
   - Nhờ vậy, tất cả các câu hỏi tại cùng mốc hoặc lệch 1-2 giây đều được gộp chung vào **1 mốc duy nhất**, đảm bảo trên timeline **chỉ có đúng 1 chấm vàng**.

3. **Đồng bộ tải câu hỏi trong Modal theo cụm:**
   - Trong `CreateQuizMarkerModal`, điều chỉnh điều kiện tải câu hỏi đã có:
     `Math.abs(q.timestamp - timestamp) <= 2`
   - Khi click vào chấm vàng đó, modal sẽ tải đầy đủ tất cả các câu hỏi thuộc cụm này để giảng viên chỉnh sửa hoặc thêm tiếp câu mới.

---

## 3. Kế Hoạch Triển Khai (Phased Tasks)

### Phase 1: Dọn Dẹp Mock State Thừa
- [ ] Xóa `createdQuizzes`, `setCreatedQuizzes` trong `lesson-video-screen.tsx`.
- [ ] Xóa khối render `createdQuizzes.map(...)` trên thanh timeline.
- [ ] Bỏ prop `onSavedMock` khỏi `CreateQuizMarkerModal`.

### Phase 2: Cài Đặt Thuật Toán Gom Cụm (Clustering $\pm 2$s)
- [ ] Cập nhật useMemo `quizCheckpoints` trong `lesson-video-screen.tsx` áp dụng thuật toán gom cụm khoảng cách $\le 2$ giây.
- [ ] Chuẩn hóa `Math.round(selectedQuizTime)` khi click pin hoặc timeline để timestamp lưu xuống luôn là số nguyên sạch sẽ.

### Phase 3: Đồng Bộ Modal Soạn Thảo
- [ ] Cập nhật `create-quiz-marker-modal.tsx`: nạp danh sách câu hỏi theo dung sai cụm $\le 2$s (`Math.abs(q.timestamp - timestamp) <= 2`).
- [ ] Lưu timestamp làm tròn số nguyên (`Math.round(timestamp)`).

### Phase 4: Kiểm Thử & Xác Nhận
- [ ] Kiểm tra giao diện timeline: xác nhận tại mỗi mốc câu hỏi chỉ còn **duy nhất 1 chấm vàng** đồng nhất, không còn bị dính chùm hay chồng lấn.
- [ ] Chạy kiểm tra TypeScript `pnpm --filter frontend exec tsc --noEmit`.
- [ ] Chạy unit test backend `pnpm --filter backend test src/modules/course/tests/lesson-quiz.service.spec.ts`.
- [ ] Cập nhật dev log trong `a-agentic/features/interactive-video-player/dev-history.md`.

---

## 4. Phân Công Trách Nhiệm (Agent Assignments)

| Vai trò | Phụ trách | Phạm vi |
| :--- | :--- | :--- |
| **`frontend-specialist`** | Timeline Clustering & Cleanup | `lesson-video-screen.tsx`, `create-quiz-marker-modal.tsx` |

---

## 5. Tiêu Chí Nghiệm Thu (Acceptance Criteria)

1. Khi tạo câu hỏi tại bất kỳ mốc nào trên video:
   - Thanh tua timeline chỉ hiển thị **DUY NHẤT 1 CHẤM VÀNG** tại mốc đó.
   - Không còn tình trạng 2 chấm dính chùm, đè lớp hay chênh lệch 1 vài pixel.
2. Khi hover hoặc click vào chấm vàng duy nhất đó:
   - Nút "Thêm câu hỏi" hiển thị chính xác.
   - Modal mở ra tải đầy đủ tất cả các câu hỏi đã tạo thuộc mốc thời gian đó.
