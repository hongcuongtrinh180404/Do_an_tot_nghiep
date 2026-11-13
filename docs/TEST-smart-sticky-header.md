# Kết quả test Smart Sticky Header

Ngày kiểm tra và sửa lỗi: 12/11/2026. **Đã sửa lỗi header không xuất hiện khi cuộn lên; toàn bộ test trong phạm vi kiểm tra đều PASS.** Chưa kiểm chứng rubber-band trên Safari/thiết bị Apple thật.

## Kết quả thực chạy

| Bộ kiểm tra | PASS | FAIL | Tổng |
| --- | ---: | ---: | ---: |
| Hook thật, render bằng React + JSDOM | 38 | 0 | 38 |
| Chrome trên bản production: desktop, tablet, mobile emulation | 25 | 0 | 25 |
| ESLint trên hook, header, hai page và hai file test | Đạt | | |
| TypeScript frontend: `tsc --noEmit` | Đạt | | |
| Production build: `pnpm --filter frontend build` | Đạt | | |

Trước sửa: hook **32/36 PASS**, browser **5/15 PASS**. Sau sửa bổ sung 2 test hook và 10 kiểm tra browser, không skip hay bỏ các test từng FAIL.

Bộ 6 test cũ PASS nhưng chỉ chạy `SmartHeaderScrollController`, một bản sao thuật toán trong file test. Bộ mới import trực tiếp `useSmartHeaderScroll`; chỉ mock số đo trình duyệt và hàng đợi `requestAnimationFrame`.

## Đối chiếu yêu cầu

| # | Yêu cầu | Kết quả |
| --- | --- | --- |
| 1 | Luôn hiện khi `scrollY <= 64` | PASS. Header bám viewport, `rect.top=0` cả ở `scrollY=64`. |
| 2 | Ẩn khi cuộn xuống qua top offset và threshold | Đạt các trường hợp đã kiểm tra, kể cả ranh giới 7px/8px. |
| 3 | Hiện lại ngay khi cuộn lên đủ 8px | PASS. `500 -> 492` đưa header về `rect.top=0`, `rect.bottom=65`. Đã kiểm tra cả wheel thật và animation bình thường. |
| 4 | Tích lũy pixel qua nhiều frame | PASS: 1px/frame, 0.25px/frame, frame không di chuyển, đổi hướng và gộp nhiều event/frame. Browser xác nhận header thực sự hiện sau 8 frame × 1px. |
| 5 | Chặn overscroll âm và đáy trang | PASS trong mô phỏng, gồm cả trang ngắn và trang chuyển từ có thể cuộn sang không thể cuộn. Safari thật chưa kiểm chứng. |
| 6 | Luôn hiện khi menu/drawer mở hoặc input focus | PASS cả trạng thái và vị trí thực. Sau khi đóng/blur, bắt đầu tính lại từ vị trí hiện tại, không ẩn sau 1px. |

## Các lỗi đã khắc phục

Các bước tái hiện dưới đây mô tả hành vi **trước sửa**.

### 1. Ưu tiên cao: header không sticky theo viewport

- Vị trí: `frontend/src/app/page.tsx`, `frontend/src/app/courses/page.tsx`; header tại `frontend/src/features/course/components/public-discovery/public-header.tsx`.
- Wrapper dùng `overflow-x-hidden`. Trình duyệt tính `overflow-y: auto`, khiến header sticky theo wrapper thay vì viewport đang cuộn.
- Desktop: tại `scrollY=64`, header có `aria-hidden="false"` nhưng `getBoundingClientRect().top=-64`.
- Cuộn `500 -> 492`: trạng thái đã hiện, `translate: 0px`, nhưng `rect.top=-492`, `rect.bottom=-427`.
- Tái hiện cả desktop 1440×900 và mobile 390×844. Menu tài khoản, mobile drawer và focus tìm kiếm không khắc phục được vị trí ngoài viewport.
- Đã đổi wrapper của cả trang chủ và danh sách khóa học sang `overflow-x-clip`: giữ chặn tràn ngang nhưng không tạo scroll container.
- Đã kiểm tra trên `/` và `/courses?view=catalog`; header hiện đúng ở đỉnh viewport, không phát sinh cuộn ngang.

### 2. Overscroll dương làm ẩn header trên trang không cuộn được

- Vị trí: `frontend/src/hooks/use-smart-header-scroll.ts`.
- Hai test FAIL: `scrollHeight=600` và `800`, với viewport cao `800`.
- Khi mô phỏng bounce `scrollY=100`, hook trả `{ isVisible: false, isAtTop: false }` thay vì `{ isVisible: true, isAtTop: true }`.
- Nguyên nhân: guard đáy chỉ chạy khi `maxScrollY > 0`; trường hợp `maxScrollY <= 0` vẫn được xử lý như cuộn xuống thật.
- Đã chuẩn hóa giới hạn cuộn không âm và coi vị trí cuộn hợp lệ là `0` khi trang không có vùng cuộn. Cả hai test cũ và test trang trở thành không cuộn được đều PASS.

### 3. Header ẩn sau 1px khi kết thúc tương tác

- Vị trí: effect trong `frontend/src/hooks/use-smart-header-scroll.ts`.
- Tái hiện bằng hook: cuộn đến `400` → `disabled=true` → cuộn đến `900` → `disabled=false` → cuộn đến `901`.
- Thực tế: header ẩn ngay sau 1px, thay vì chờ tích lũy đủ 8px kể từ vị trí kết thúc tương tác.
- Browser xác nhận tương tự: focus tìm kiếm → cuộn đến `500` → blur → cuộn đến `501`, `aria-hidden` chuyển thành `true`.
- Nguyên nhân: không đồng bộ lại `lastScrollYRef`/`pivotScrollYRef` khi bật lại tính năng sau tương tác.
- Đã đồng bộ `lastScrollYRef` và `pivotScrollYRef` với vị trí cuộn hợp lệ khi effect bắt đầu/chạy lại. Test hook và browser đều PASS sau khi kết thúc tương tác.

### 4. `isAtTop` sai khi mount ở vị trí cuộn đã khôi phục

- Vị trí: `frontend/src/hooks/use-smart-header-scroll.ts`.
- Tái hiện: đặt `window.scrollY=800` trước khi mount hook, không phát scroll event.
- Thực tế: `{ isVisible: true, isAtTop: true }`; mong đợi `isAtTop=false`.
- Nguyên nhân: state/ref khởi tạo theo giả định trang luôn ở `0`, chưa đồng bộ vị trí thực khi effect bắt đầu.
- Đã đồng bộ `isAtTop` và mốc tính khoảng cách từ vị trí thực trong effect; giữ giá trị khởi tạo an toàn cho SSR. Hai test khôi phục vị trí `800` và ngưỡng `800 -> 808` đều PASS.

## Chạy lại

Từ thư mục gốc repository:

```powershell
pnpm --filter frontend test:smart-header
pnpm --filter frontend test:smart-header:browser
pnpm --filter frontend exec eslint src/hooks/use-smart-header-scroll.ts src/features/course/components/public-discovery/public-header.tsx src/app/page.tsx src/app/courses/page.tsx src/features/course/tests/smart-header-scroll.spec.ts scripts/test-smart-header-browser.mjs
pnpm --filter frontend exec tsc --noEmit
pnpm --filter frontend build
```

- Browser test yêu cầu Node 22+, Chrome/Edge/Chromium đã cài, và frontend đang chạy tại `http://localhost:3000`.
- Có thể đổi server bằng biến môi trường `SMART_HEADER_ORIGIN`, đường dẫn trình duyệt bằng `CHROME_PATH`, thư mục kết quả bằng `SMART_HEADER_ARTIFACT_DIR`.
- Script browser dùng CDP helper đã có trong repository: `.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs`.
- Test có lỗi sẽ trả exit code `1`; không skip hoặc đánh dấu expected-failure để che lỗi.
- Để kiểm tra production: build, chạy `pnpm --filter frontend start --port 3103`, đặt `SMART_HEADER_ORIGIN=http://localhost:3103` rồi chạy lại browser test.

## Môi trường và giới hạn

- Windows, Node `25.9.0`, pnpm `11.1.3`, React `19.2.8`, Next.js `16.3.5`, Vitest `4.1.11`, JSDOM `30.1.1`.
- Chrome `157.0.8103.51`, kiểm tra `/` và `/courses?view=catalog` trên production build tại `http://localhost:3103`.
- Viewport desktop 1440×900, tablet 768×1024, mobile emulation 390×844. Các test hình học dùng reduced motion; hai test wheel thật dùng animation 300ms bình thường và kiểm tra trạng thái sau khi transition kết thúc.
- Catalog rỗng trên desktop chỉ có thể cuộn đến `421px`; test dùng vị trí thực `421 -> 413` để xác nhận đúng 8px, không giả định mọi trang đều dài ít nhất 500px.
- Đã mở và kiểm tra 7 ảnh kết quả: header hiện đúng trên ba kích thước, hai route, drawer mở và wheel thật; giữ nguyên thiết kế/màu sắc/nội dung hiện có.
- API được chặn bằng fixture trong phiên trình duyệt: tài khoản student giả lập, danh sách khóa học rỗng; không ghi dữ liệu backend/database.
- Overscroll Safari/iOS/macOS mới được mô phỏng bằng số đo trong unit test, chưa chạy Safari thật hoặc thao tác rubber-band trên thiết bị Apple. Mobile emulation Chrome không phải Safari.
- Đã chạy production build; chưa chạy toàn bộ regression suite không liên quan đến header. Kết quả ESLint/TypeScript đúng phạm vi lệnh ghi rõ.

Kết quả chi tiết của lần chạy này:

- Unit JSON sau sửa: `C:\Users\cuong\AppData\Local\Temp\opencode\smart-header-unit-fixed-results.json`.
- Browser JSON và ảnh sau sửa: `C:\Users\cuong\AppData\Local\Temp\opencode\smart-header-fixed-production\`.
- Ảnh ví dụ: `desktop-shown-and-pinned-after-exactly-8px-upward.png`, `tablet-shown-and-pinned-after-exactly-8px-upward.png`, `mobile-open-drawer-locks-visibility-while-scrolling.png`.
- Unit JSON trước sửa được giữ tại `smart-header-unit-results.json`; các ảnh lỗi trước sửa còn trong thư mục `smart-header-check` của cùng thư mục tạm.
