# Payment SePay — Rules & Business Flows

## Thanh toán khóa học có phí

1. Học viên gọi `POST /api/v1/payments/create-order` với duy nhất `courseId`. Backend kiểm tra tài khoản, khóa học công khai, quyền sở hữu và giá nguyên VND dương.
2. Tái sử dụng đơn PENDING còn hạn. Đơn mới có mã `MD` + **10 ký tự A–Z/0–9**, hậu tố có cả chữ và số; sinh bằng `crypto.randomInt`.
3. Snapshot giá, giảm giá, tên khóa học và ngân hàng được giữ nguyên trong thời hạn đơn. Sparse unique `pendingCheckoutKey` chống tạo nhiều checkout đồng thời; mã đơn được bảo vệ bằng unique index và retry khi INSERT trùng.
4. Frontend tải chi tiết đơn một lần, sau đó chỉ polling trạng thái gọn nhẹ khi PENDING. QR luôn chứa phần tiền còn thiếu, không hiển thị QR cũ sau khi ghi nhận thanh toán một phần.
5. SePay gửi webhook JSON có HMAC-SHA256 trên **raw body**, timestamp lệch tối đa 300 giây. Không tái tạo raw body từ JSON, không có endpoint bỏ qua xác thực.
6. Trong một transaction MongoDB: kiểm tra `sepayTransactionId`, khóa ghi theo đơn (`paymentRevision`), lưu receipt, đối soát tiền, cập nhật Order và cấp Enrollment. Chỉ ACK `{ "success": true }` sau commit. Lỗi lưu dữ liệu trả lỗi để SePay retry.
7. Các webhook cùng mã đơn được xử lý tuần tự bằng write conflict/retry transaction; unique transaction ID và unique enrollment bảo đảm không cấp quyền hoặc cộng tiền hai lần.

## Chính sách tiền và thời gian

- Chỉ nhận `transferType=in`, đúng tài khoản nhận của snapshot đơn (cấu hình hiện tại với đơn cũ).
- Chỉ cộng các receipt đã xác thực, cùng đơn/tài khoản, số tiền VND nguyên dương, thời gian nằm trong khoảng tạo đơn–hết hạn và chưa hoàn lại phần tiền đó.
- **Thiếu tiền:** cộng dồn các giao dịch khác ID; chưa cấp quyền. QR được cập nhật phần còn thiếu. Khi đủ, các receipt đã dùng đều có `appliedAt`.
- **Thừa tiền:** cấp quyền theo giá chốt của đơn, ghi `OVERPAID` và `excessAmount`; không tăng doanh thu khóa học theo số tiền thừa.
- **Chuyển thêm sau PAID:** ghi `DUPLICATE_PAYMENT`, không coi là một lần bán mới.
- **Webhook đến trễ nhưng ngân hàng chuyển đúng hạn:** vẫn cấp quyền, kể cả đơn đã bị đánh dấu EXPIRED. Hủy các checkout PENDING thay thế của cùng người–khóa học.
- **Tiền thực sự chuyển sau hạn / đơn CANCELLED / đã sở hữu qua đơn khác / tài khoản hoặc khóa học không khả dụng:** không tự cấp quyền; đưa vào đối soát.
- SePay dùng `YYYY-MM-DD HH:mm:ss` theo Việt Nam. Backend parse rõ `+07:00`, không phụ thuộc timezone máy chủ. Ngày sai, tương lai bất thường hoặc trước lúc tạo đơn cần đối soát.
- Cập nhật hết hạn luôn có điều kiện `status=PENDING`, không thể ghi đè PAID.

## Khóa miễn phí

`POST /api/v1/enrollments/register-free` chỉ chấp nhận giá **đúng bằng 0** ở backend. Tạo Enrollment với `orderId=null`, không tạo Order/Payment. Đăng ký đồng thời được bảo vệ bởi unique enrollment. Khóa có phí chỉ được cấp quyền qua receipt SePay đã xác thực.

## Đối soát quản trị viên

- Đọc danh sách và lịch sử giao dịch qua API dành riêng ADMIN.
- Reprocess chỉ dùng receipt đã được webhook HMAC xác thực; không nhận số tiền/tài khoản mới từ quản trị viên. Chỉ cho gắn mã thủ công khi receipt chưa liên kết đơn, cần ghi lý do. Không chuyển tiền đã liên kết sang đơn khác hoặc dùng lại tiền đã hoàn.
- Mỗi thao tác có actor, thời gian, lý do và trạng thái/mã đơn trước đó.
- Resolve chỉ **ghi nhận** kết quả đối soát/hoàn tiền thực hiện ngoài hệ thống, không gọi ngân hàng hay tự đánh dấu Order PAID. Hoàn tiền yêu cầu mã giao dịch ngân hàng và số tiền bằng toàn bộ receipt chưa dùng, hoặc đúng phần thừa nếu đã cấp quyền.
- Receipt cũ thiếu dấu xác thực phải được Replay từ SePay trước khi reprocess. Signed replay có thể phục hồi các giao dịch cũ đã PAID nhưng thiếu Enrollment; không tự cấp lại quyền đã bị thu hồi của đơn đó, không sửa/xóa hàng loạt dữ liệu lịch sử.

## Triển khai và Test mode

- Bắt buộc MongoDB replica set/sharded cluster. Không có fallback standalone. Khi cấu hình thanh toán, startup kiểm tra topology và tạo các unique index cần thiết, kể cả khi `autoIndex` bị tắt.
- Production bắt buộc đủ ngân hàng, chủ tài khoản, secret tối thiểu 32 ký tự và thời hạn nguyên 1–1440 phút. Development không cấu hình thanh toán vẫn chạy các chức năng khác; không thể tạo đơn nếu cấu hình thiếu.
- Trên SePay: bật nhận diện mã, tiền tố `MD`, hậu tố min=max=**10**, loại **Số và chữ**. Đặt mẫu mới trước mẫu cũ nếu còn giữ mẫu cũ. Backend chỉ đọc mã MD+5 số cho đơn lịch sử, không sinh mã dạng đó nữa.
- Cân nhắc tắt bộ lọc “Chỉ gửi khi có mã thanh toán” để các khoản chuyển sai nội dung vẫn đến hàng đợi đối soát; trong giai đoạn chuyển mẫu mã cần bảo đảm webhook của mã cũ vẫn được gửi.
- Test mode và Live dùng cùng payload/cơ chế ký. **Dùng endpoint, secret và database riêng cho Test mode; không trỏ webhook Test mode vào production hoặc dùng chung secret với Live.** Cấu hình mã ở Test mode và Live là độc lập.
- Kiểm thử thực tế bằng Dashboard SePay Test mode và xem Delivery logs/Replay. Test tự động trong repository chỉ dùng fixture trong database test riêng, không phải tính năng thanh toán thay thế trong ứng dụng.

Tài liệu SePay: [mã thanh toán](https://developer.sepay.vn/en/sepay-webhooks/cau-hinh-ma-thanh-toan), [Test mode và Live](https://developer.sepay.vn/en/sepay-webhooks/test-mode/so-sanh-voi-live).
