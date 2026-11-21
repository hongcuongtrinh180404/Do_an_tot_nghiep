# Payment SePay — Development History & Gotchas

## 2026-11-20 — Bổ sung Dropdown List Lọc Ngày, Tháng cho Danh Sách Giao Dịch (/admin/revenue)

- **Vấn đề / Yêu cầu**: Section "Danh Sách Giao Dịch" tại trang Quản lý Doanh thu & Hoa hồng (`/admin/revenue`) thiếu bộ lọc thời gian độc lập giống như ở trang Tổng quan Dashboard (`/admin/dashboard`), khiến quản trị viên gặp khó khăn khi muốn tra cứu giao dịch theo chu kỳ cụ thể (Hôm nay, Hôm qua, 7 ngày, Tháng này, Tháng trước, Năm nay, Tùy chỉnh khoảng ngày).
- **Giải pháp**:
  - Xây dựng component `TransactionTimeFilter` chuẩn theo layout và phong cách của `DashboardHeader`: gồm Calendar icon, `<select>` chu kỳ thời gian, Picker khoảng ngày Từ - Đến khi chọn `custom`, và Badge hiển thị khoảng ngày thực tế.
  - Tách riêng state `transactionTimeFilter` trong `RevenueView` cho bảng giao dịch (mặc định 30 ngày, có tùy chọn đồng bộ *"Theo bộ lọc trang"*). Khi đổi bộ lọc thời gian, tự động reset `page = 1`.
  - Cập nhật `TransactionTable` empty state và nút "Đặt lại bộ lọc" để hỗ trợ reset cả bộ lọc thời gian khi không có dữ liệu.
  - Bổ sung alias chu kỳ thời gian (`7d`, `30d`, `this_month`, `last_month`, `this_year`) trong `revenue-date.util.ts` ở backend để bảo đảm tính tương thích chéo 100% giữa Dashboard và Revenue APIs.
  - Bổ sung unit tests cho `TransactionTimeFilter` tại `frontend/src/features/admin/revenue/tests/transaction-time-filter.spec.ts`. Toàn bộ 21 tests frontend và 17 tests backend đều pass 100%.

## 2026-11-18 — UI PaymentSuccess với pháo hoa canvas-confetti & kiểm soát chuyển trang

- Cài đặt `canvas-confetti`, `@types/canvas-confetti` và `lucide-react` cho frontend.
- Xây dựng component `PaymentSuccess` với hiệu ứng nảy vòng tròn (`circlePop`), SVG checkmark tự vẽ nét (`drawCheck`), hiệu ứng hào quang lan tỏa (`pulseHalo`) và pháo giấy `canvas-confetti` rực rỡ chào mừng thanh toán thành công.
- **Tuân thủ chính sách không tự động chuyển trang**: Loại bỏ hoàn toàn bộ đếm ngược countdown tự động điều hướng để học viên chủ động lưu lại mã đơn hàng, xem tóm tắt thông tin thanh toán và tự quyết định thời điểm vào học ("Vào học ngay" hoặc "Xem khóa học đã mua").
- Tích hợp component vào `CheckoutView` khi trạng thái đơn hàng chuyển sang `PAID`, bổ sung unit test xác thực tại `frontend/src/features/payment/tests/payment-success.spec.tsx`.

## 2026-11-16 — Hỗ trợ Test send của Dashboard SePay

- DTO webhook chấp nhận `id=0` (payload mẫu của nút **Test send**); ID giao dịch thật vẫn bắt buộc số nguyên dương.
- Sau khi xác thực HMAC/timestamp, webhook test được ACK `{ "success": true }` ngay và bỏ qua: không lưu receipt, không đối soát, không kích hoạt đơn.
- Bổ sung unit test và HTTP integration test bảo đảm test send không tạo dữ liệu thanh toán.

## 2026-11-09 — Payment integrity hardening

- Loại bỏ luồng mua trực tiếp tự cấp quyền cho khóa có phí, API cũ và hook frontend tương ứng. Đăng ký khóa miễn phí chuyển sang `register-free`, backend bắt buộc kiểm tra giá 0 và không tạo đơn thanh toán.
- Mã mới: `MD` + 10 ký tự A–Z/0–9, có cả chữ/số, dùng crypto; collision được xử lý tại INSERT. Mã ngắn chỉ còn hỗ trợ đọc/đối soát lịch sử.
- Thêm sparse unique checkout key, snapshot giá/khóa học/ngân hàng; không sửa/xóa hàng loạt dữ liệu lịch sử.
- Bắt buộc replica set/sharded cluster và unique index khi bật thanh toán. Loại bỏ fallback standalone vì không bảo đảm toàn vẹn.
- Webhook chỉ ACK sau transaction commit; lỗi lưu đối soát không còn bị nuốt. Không tái tạo raw body bằng JSON.stringify.
- Khóa ghi từng đơn để xử lý đồng thời và cộng dồn partial payments; chống dùng lại receipt/enrollment, phân biệt giao dịch chuyển thêm với doanh thu hợp lệ.
- Cập nhật hết hạn có điều kiện, không ghi đè PAID. Dùng thời gian ngân hàng theo +07:00 để chấp nhận webhook đến trễ nhưng chuyển tiền đúng hạn.
- Thêm API đối soát ADMIN, reprocess receipt đã xác thực và ghi nhận hoàn tiền bên ngoài có audit. Không thêm API tự tạo giao dịch hoặc tự đánh dấu PAID.
- Tách endpoint chi tiết khỏi status polling; frontend backoff, dừng đúng trạng thái, sửa countdown lệch đồng hồ và ẩn QR cũ sau partial payment.
- Bổ sung unit test, test frontend trên helper/API thực và integration MongoDB replica set + HTTP trong database test độc lập. Chạy SePay Test mode qua Dashboard là bước kiểm thử môi trường riêng, không được coi các test local là giao dịch Live.

## Lưu ý vận hành

1. `createdAt` của Mongoose là immutable. Test ngày giao dịch cũ phải backdate fixture qua raw collection có chủ đích; không nới kiểm tra thời gian production để test qua.
2. Khi chuyển sang mã 10 ký tự, cấu hình cả Test mode và Live trên SePay; chúng độc lập. Không để mẫu ngắn đứng trước mẫu mới gây trích mã bị cắt.
3. Receipt cũ thiếu `verifiedAt`/`payloadHash` cần Replay có chữ ký hợp lệ từ SePay trước khi xử lý lại.
4. Endpoint resolve chỉ lưu bằng chứng hoàn tiền ngoài hệ thống; không tích hợp API hoàn tiền ngân hàng.
5. Không chia sẻ endpoint, secret hay database giữa Test mode và production vì payload Test mode giống Live.
