# Kế Hoạch Triển Khai: Tích Hợp Animation Mail Sent (Lottie) Vào Modal Quên Mật Khẩu

> **Mục tiêu:**
> Tích hợp animation Lottie (`mail-sent.lottie`) vào giao diện modal Quên mật khẩu (`ForgotPasswordModal`) của Mindly với bố cục 2 cột (desktop) / 1 cột (mobile), tuân thủ tiêu chuẩn thiết kế `/design-taste-frontend`, đảm bảo animation không tự chạy khi mở trang mà chỉ kích hoạt khi backend xác nhận tiếp nhận yêu cầu thành công và tự động phát lại mượt mà.

- **Task Slug:** `forgot-password-lottie`
- **Plan File:** `docs/PLAN-forgot-password-lottie.md`
- **Project Type:** `WEB` (Next.js 16 App Router, React 19, Tailwind CSS v4)
- **Primary Agent:** `project-planner`
- **Executing Agent:** `frontend-specialist`
- **Key Skills:** `design-taste-frontend`, `clean-code`, `react-best-practices`, `plan-writing`

---

## 1. Tổng Quan & Yêu Cầu Kỹ Thuật (Overview)

### 1.1. Hiện trạng hệ thống
- **Frontend:** Next.js 16.3.5 (App Router), React 19.2.8, Tailwind CSS v4, `@iconify/react`.
- **Luồng Forgot Password:** Đã hoàn chỉnh tại `frontend/src/features/auth/components/forgot-password-modal.tsx` sử dụng `useForgotPasswordMutation` từ `../api/auth.api`. Modal được bao bọc bởi `DialogLayout` (`@/components/shared/dialog`).
- **Tài nguyên Animation:** Đã có file Lottie tại `frontend/public/animations/Mail Sent.lottie` (kích thước ~4.2KB), đã được sao chép sang `frontend/public/animations/mail-sent.lottie`.
- **Thư viện Lottie:** Đã cài đặt `@lottiefiles/dotlottie-react` (^0.20.0).

### 1.2. Quyết định triển khai sau Socratic Gate
1. **Trạng thái Animation ở cột phải trước khi bấm gửi:** Ở frame 0 (`autoplay = false`), áp dụng hiệu ứng CSS lắc nhẹ nhàng (`animate-mail-idle-wobble`) để bức thư có chuyển động sống động trước khi gửi. Khi backend phản hồi thành công, hiệu ứng lắc dừng lại và animation Lottie chính thức bắt đầu phát từ đầu.
2. **Nhịp phát lại của Animation (Phương án B):** Khi gửi thành công, animation phát từ đầu 1 lượt trọn vẹn (`loop = false`). Sau khi hoàn tất lượt đầu, animation nghỉ khoảng 1.8s rồi mới tự động phát lại từ đầu.
3. **Thứ tự hiển thị trên màn hình Mobile (Phương án A):**
   - Khi chưa gửi (`mode === 'form'`): Form nhập email ở trên, animation ở dưới form.
   - Khi đã gửi thành công (`mode === 'sent'`): Animation được đưa lên trên cùng làm điểm nhấn thị giác, thông báo và nút gửi lại ở bên dưới.

---

## 2. Tiêu Chí Nghiệm Thu (Success Criteria)

1. [x] **Thư viện & Bundle:** Cài đặt thành công `@lottiefiles/dotlottie-react` tương thích với React 19 và Next.js 16.
2. [x] **Chuẩn hóa asset:** File animation `mail-sent.lottie` được đặt trong `frontend/public/animations/mail-sent.lottie`, đọc qua đường dẫn tĩnh nội bộ `/animations/mail-sent.lottie`, không dùng CDN bên ngoài.
3. [x] **Trạng thái phát animation chính xác:**
   - Mở modal lần đầu: Animation tĩnh ở frame 0, lắc nhẹ nhàng (idle wobble), không tự phát timeline lottie.
   - Khi gửi thành công: Tua về đầu (frame 0) và phát mượt mà.
   - Sau khi phát xong 1 lượt: Nghỉ 1.8s và tự động phát lại (Phương án B).
   - Khi bấm gửi lại (Resend): Tua về đầu và phát lại.
   - Khi lỗi: Giữ thông báo lỗi, không kích hoạt trạng thái thành công.
4. [x] **Responsive & UX:**
   - Desktop (>= 768px): 2 cột cân đối, cột trái chứa form/nội dung (7 cột), cột phải chứa animation (5 cột).
   - Mobile (< 768px): 1 cột, form ở trên khi chưa gửi, animation lên trên khi đã gửi thành công.
5. [x] **Code Quality & Architecture:** TypeScript không lỗi (`tsc --noEmit`), ESLint đạt chuẩn, Next.js build thành công.

---

## 3. Kiến Trúc Kỹ Thuật & Giải Pháp (Tech Stack & Architecture)

### 3.1. DotLottie Player Integration
- Sử dụng `<DotLottieReact />` từ `@lottiefiles/dotlottie-react`.
- Điều khiển instance qua `dotLottieRefCallback={setDotLottie}`.
- Đăng ký sự kiện `'complete'` để kích hoạt `setTimeout` 1800ms lặp lại vòng tiếp theo theo đúng Phương án B.
- Dọn dẹp timer và listener khi component unmount hoặc mode thay đổi.

### 3.2. Bố cục Responsive 2 Cột
- Sử dụng Grid CSS `md:grid-cols-12 gap-5 md:gap-6 items-center`.
- Cột trái: `md:col-span-7`, cột phải: `md:col-span-5`.
- Modal width: `sm:max-w-xl md:max-w-2xl` truyền vào `DialogLayout`.
- Khung animation: Nền trong suốt với bo góc mềm mại `rounded-2xl`, viền `border-border/50`, nền `bg-muted/20`, kích thước vuông cân đối với `object-contain`.

---

## 4. Danh Mục Tệp Đã Thay Đổi (File Structure)

| Thao tác | Đường dẫn tệp | Mục đích |
|---|---|---|
| **Created** | `frontend/public/animations/mail-sent.lottie` | Chuẩn hóa tên file animation không có khoảng trắng cho URL tĩnh. |
| **Modified** | `frontend/package.json` | Cài đặt thêm `@lottiefiles/dotlottie-react` (^0.20.0). |
| **Modified** | `frontend/src/app/globals.css` | Bổ sung `@keyframes mailIdleWobble` và class `.animate-mail-idle-wobble`. |
| **Modified** | `frontend/src/features/auth/components/forgot-password-modal.tsx` | Tái cấu trúc giao diện 2 cột, tích hợp DotLottie player và các trạng thái responsive. |
| **Modified** | `a-agentic/features/auth-identity/dev-history.md` | Ghi chép cập nhật dev-history về tính năng. |

---

## 5. Giai Đoạn Nghiệm Thu Cuối Cùng (Phase X: Final Verification)

- [x] **Lint & TypeScript Check:** `pnpm --filter frontend lint` & `tsc --noEmit` thành công 100%.
- [x] **Design Rules Check:**
  - Không có màu tím bị cấm (`purple`, `violet`, `indigo`).
  - Nền animation trong suốt, viền và bo góc đồng bộ Design System Mindly (`rounded-2xl`, `bg-muted/20`, `border-border/50`).
  - Hiệu ứng Frame 0 idle wobble lắc nhẹ thư trước khi gửi (`animate-mail-idle-wobble`).
  - Không vỡ layout trên màn hình nhỏ (< 640px) và màn hình chuẩn desktop (2 cột md:grid-cols-12).
- [x] **Animation Triggers Check:**
  - Không tự phát khi modal mở lần đầu (`autoplay = false`).
  - Phát từ đầu khi API thành công (`mode === 'sent'`).
  - Nghỉ 1.8s rồi tự động lặp lại theo Phương án B sau khi kết thúc lượt phát đầu tiên.
  - Gửi lại (Resend) kích hoạt replay animation từ đầu.
  - Thứ tự mobile theo Phương án A: Form ở trên khi chưa gửi; Animation lên trên cùng khi gửi thành công.
- [x] **Build Check:** Chạy build frontend (`next build --webpack`) thành công 20/20 route tĩnh không có lỗi.

## ✅ PHASE X COMPLETE

- Lint: ✅ Pass (0 error)
- TypeScript: ✅ Pass (0 error)
- Build: ✅ Success (Compiled successfully in 24.1s)
- Date: 2026-10-30
