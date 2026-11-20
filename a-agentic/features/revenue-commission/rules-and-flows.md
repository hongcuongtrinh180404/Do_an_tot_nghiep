# Revenue & Commission Management — Rules & Flows

> **Module:** Revenue & Commission Management

---

## 1. Business Rules

### 1.1 Nguyên tắc ghi nhận doanh thu
1. **Chỉ ghi nhận đơn hàng thành công**:
   - `OrderEntity.status === OrderStatusEnum.PAID` (`PAID`).
   - Có biên lai thanh toán SePay với trạng thái đối soát `MATCHED` hoặc `OVERPAID`.
   - Các đơn hàng `PENDING`, `EXPIRED`, `CANCELLED` hoặc giao dịch chưa khớp/thiếu tiền không được tính vào doanh thu.
2. **Không ghi nhận trùng lặp**:
   - Mỗi đơn hàng thanh toán thành công chỉ được ghi nhận một lần duy nhất theo `orderCode`.

### 1.2 Công thức tính hoa hồng & làm tròn số tiền
- Tỷ lệ hoa hồng nền tảng ($R$) là phần trăm Mindly được hưởng ($0 \le R \le 100$).
- Giảng viên nhận phần còn lại: $100 - R$ (%).
- Khi tạo đơn hàng thành công với tổng số tiền học viên thanh toán là $T$:
  $$\text{platformEarnings} = \text{round}\left( \frac{T \times R}{100} \right)$$
  $$\text{instructorEarnings} = T - \text{platformEarnings}$$
- **Bất biến tài chính**: Luôn đảm bảo $\text{platformEarnings} + \text{instructorEarnings} = T$, không phát sinh sai lệch làm tròn số lẻ.

### 1.3 Quy tắc thứ tự áp dụng & ghi đè hoa hồng
1. **Áp dụng toàn hệ thống khi thay đổi Cấu hình mặc định**:
   - Khi Admin thay đổi **Cấu hình hoa hồng mặc định** (icon bánh răng), hệ thống lưu cấu hình mới và **đồng thời ghi đè tỷ lệ hoa hồng (`commissionRate`) của TẤT CẢ giảng viên** trong hệ thống, bao gồm cả những giảng viên đã từng được tùy chỉnh riêng trước đó.
   - Toàn bộ các giao dịch/đơn hàng mới mua khóa học của bất kỳ giảng viên nào phát sinh sau thời điểm thay đổi sẽ áp dụng ngay lập tức tỷ lệ mặc định mới này.
2. **Tùy chỉnh riêng cho từng giảng viên**:
   - Sau khi áp dụng mặc định toàn hệ thống, Admin vẫn có thể vào trang chi tiết của một giảng viên cụ thể (`/admin/revenue/instructors/[instructorId]`) để điều chỉnh tỷ lệ hoa hồng riêng cho giảng viên đó nếu có thỏa thuận đặc biệt. Tỷ lệ riêng này sẽ có hiệu lực cho đến lần thay đổi cấu hình mặc định toàn sàn tiếp theo.
3. **Thứ tự ưu tiên khi tạo đơn hàng mới**:
   - Tỷ lệ hoa hồng riêng của giảng viên (`UserEntity.commissionRate`) $\rightarrow$ Tỷ lệ mặc định hệ thống (`CommissionSettingEntity.platformCommissionRate`) $\rightarrow$ Fallback mặc định ban đầu (**30% Mindly / 70% Giảng viên**).
4. **Snapshot cố định theo đơn hàng**:
   - Tỷ lệ hoa hồng và số tiền chia cho nền tảng / giảng viên được chốt tại thời điểm đơn hàng phát sinh (`platformCommissionRate`, `platformEarnings`, `instructorEarnings` lưu trực tiếp trên `OrderEntity`).
   - Việc thay đổi hoa hồng sau này của giảng viên hoặc hệ thống **không làm thay đổi số liệu của các đơn hàng đã thanh toán trong quá khứ**.
5. **Xử lý đơn hàng lịch sử cũ (Legacy Fallback)**:
   - Các đơn hàng cũ chưa có trường `platformCommissionRate` sẽ tự động áp dụng công thức fallback 30% Mindly / 70% giảng viên khi thống kê hoặc hiển thị chi tiết.

### 1.4 Quy tắc lịch sử điều chỉnh hoa hồng
- Mỗi lần thay đổi tỷ lệ hoa hồng (cả mặc định hệ thống lẫn riêng cho giảng viên) đều bắt buộc ghi log vào bảng `CommissionHistoryEntity`:
  - `targetType: 'SYSTEM'`: Áp dụng toàn hệ thống (kèm lý do do Admin nhập).
  - `targetType: 'INSTRUCTOR'`: Tùy chỉnh riêng cho một giảng viên.
- Trang chi tiết của giảng viên hiển thị cả các mốc thay đổi toàn hệ thống và các mốc tùy chỉnh riêng.
- Ghi nhận: thời gian thay đổi, tỷ lệ cũ, tỷ lệ mới, người thực hiện (`updatedById`), lý do điều chỉnh (`reason`).
- Dữ liệu lịch sử là **bất biến** (chỉ thêm mới, không sửa/xóa).

---

## 2. User Flows & UI Specifications

### 2.1 Cấu trúc giao diện
- Đường dẫn Admin: `/admin/revenue` (đổi từ mục cũ `/admin/orders`).
- Sidebar hiển thị: **"Quản Lý Doanh Thu & Hoa Hồng"**.
- Gồm đúng **2 tab chính**:
  1. **Tổng quan doanh thu**
  2. **Doanh thu giảng viên**
- **Không có tab thứ 3**: Cấu hình hoa hồng mặc định được đặt tại biểu tượng bánh răng ở góc trên bên phải tab Doanh thu giảng viên.
- Chức năng điều chỉnh hoa hồng riêng cho giảng viên nằm tại trang chi tiết: `/admin/revenue/instructors/[instructorId]`.

### 2.2 Tab 1 – Tổng quan doanh thu
1. **Bộ lọc thời gian chung (VN Timezone UTC+7)**:
   - Presets: Hôm nay, Hôm qua, 7 ngày gần nhất, 30 ngày gần nhất (mặc định), Tháng này, Tháng trước, Năm nay, Tùy chỉnh (Từ ngày - Đến ngày).
   - Đồng bộ state trên URL query params (`timeRange`, `startDate`, `endDate`).
2. **4 Thẻ KPI thống kê**:
   - Tổng doanh thu (VND)
   - Hoa hồng nền tảng (VND)
   - Thu nhập giảng viên (VND)
   - Đơn hàng thành công (Số lượng)
3. **Biểu đồ doanh thu**:
   - Nhóm dữ liệu: Tổng doanh thu, Hoa hồng nền tảng, Thu nhập giảng viên.
   - Nhóm theo ngày (khoảng thời gian ngắn) hoặc theo tháng (khoảng thời gian dài).
4. **Danh sách giao dịch (Transaction Table theo chuẩn design-taste-frontend App Screens)**:
   - Hiển thị dạng bảng dữ liệu phẳng viền 1px tinh tế, không dùng zebra striping, tuân thủ Purple Ban.
   - 6 cột trọng tâm:
     1. Mã đơn hàng (monospace `#ORD-...`, copy nhanh).
     2. Học viên (tên, avatar initial, email phụ đề).
     3. Khóa học (tên khóa học, tên giảng viên phụ trách).
     4. Số tiền thực nhận (căn phải, font mono `tabular-nums`, màu sắc theo trạng thái, hiển thị tiền cần thanh toán nếu lệch).
     5. Trạng thái (Pill badge có chấm tròn đặc: Thành công / Thiếu tiền / Thừa tiền).
     6. Thời gian giao dịch (định dạng `dd/MM/yyyy HH:mm`).
   - Thanh công cụ tích hợp:
     - Ô tìm kiếm tổng hợp: Mã đơn, học viên, khóa học.
     - Thanh lọc nhanh trạng thái: Tất cả, Thành công (`MATCHED`), Thiếu tiền (`UNDERPAID`), Thừa tiền (`OVERPAID`).
     - Sắp xếp: Mới nhất, Cũ nhất, Số tiền cao nhất, Số tiền thấp nhất.
   - Tương tác: Click bất kỳ hàng nào mở Slide-over Drawer chi tiết giao dịch (hỗ trợ phím Enter/Space).
   - Phân trang: Chuẩn pagination 10/20/50 dòng/trang.
5. **Slide-over Drawer chi tiết giao dịch (5 nhóm thông tin)**:
   - Nhóm 1: Mã đơn & thời gian thanh toán.
   - Nhóm 2: Thông tin người mua (Họ tên, email, SĐT).
   - Nhóm 3: Thông tin khóa học & giảng viên (Tên khóa học, giá niêm yết, tên giảng viên, email).
   - Nhóm 4: Thông tin thanh toán thực tế SePay (Ngân hàng, số tài khoản, mã tham chiếu ngân hàng, số tiền thực nhận).
   - Nhóm 5: Phân chia doanh thu & hoa hồng (Tỷ lệ Mindly, tiền Mindly nhận, tiền giảng viên nhận).

### 2.3 Tab 2 – Doanh thu giảng viên & Cấu hình hoa hồng
1. **Bảng danh sách giảng viên**:
   - Cột: Giảng viên, Tổng khóa học, Đơn hàng thành công, Tổng doanh thu, Hoa hồng hiện tại (Mindly % / GV %), Thu nhập giảng viên, Hành động (Xem chi tiết).
   - Thanh công cụ: Tìm kiếm giảng viên, sắp xếp, lọc thời gian.
   - Góc trên bên phải: Nút bánh răng mở modal cấu hình hoa hồng mặc định toàn hệ thống.
2. **Trang chi tiết giảng viên (`/admin/revenue/instructors/[instructorId]`)**:
   - Nút quay lại: `/admin/revenue?tab=instructors`.
   - Banner giảng viên: Tên, email, avatar, tỷ lệ hoa hồng hiện tại, nút mở dialog "Điều chỉnh hoa hồng".
   - 4 Thẻ KPI doanh thu riêng của giảng viên.
   - Bảng lịch sử thay đổi hoa hồng (bất biến).
   - Bảng doanh thu theo từng khóa học của giảng viên.
   - Danh sách thẻ ngang các giao dịch gần đây của giảng viên.

