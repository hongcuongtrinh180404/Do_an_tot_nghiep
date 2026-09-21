# Interactive Video Player & Mindmap — Development History

> **Module:** Interactive Video Player

---

## 1. Milestone & Feature Status

- **Trạng thái hiện tại:** `PLANNING` (Thiết kế luồng trải nghiệm in-video quiz và component Markmap viewer).
- **Kế hoạch triển khai:** Sprint 3 (Giai đoạn 3: Cài đặt & Lập trình).

---

## 2. Technical Notes & Gotchas

- **Next.js SSR với Markmap**: Thư viện Markmap thao tác trực tiếp với DOM (`window`, `svg`). Do đó, component `MarkmapViewer` bắt buộc phải là Client Component (`'use client'`) và nên được nạp qua `next/dynamic` với `{ ssr: false }` để tránh lỗi Hydration mismatch trên Next.js App Router.
- **Phòng chống lặp Quiz**: Khi người dùng xem xong quiz và bấm tiếp tục, nếu video resume tại đúng giây `timestamp` đó, sự kiện `timeupdate` có thể bắn thêm 1 lần nữa trong cùng giây đó. Giải pháp: Thêm `answeredQuizTimestamps` vào Set hoặc cộng thêm `0.5s` khi phát tiếp (`video.currentTime += 0.5`).
