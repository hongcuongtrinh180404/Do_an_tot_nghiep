# Payment SePay — Development History & Gotchas

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
