export interface Topic {
  title: string;
  explanation: string;
  example: string;
  exercise: string;
}

export interface DemoCourse {
  title: string;
  category: string;
  slot: number;
  topics: Topic[];
}

function topic(title: string, explanation: string, example: string, exercise: string): Topic {
  return { title, explanation, example, exercise };
}

function course(category: string, slot: number, title: string, topics: Topic[]): DemoCourse {
  return { category, slot, title, topics };
}

export const CATEGORY_SLUGS = [
  'cong-nghe-thong-tin', 'thiet-ke-do-hoa', 'marketing', 'tai-chinh',
  'ngoai-ngu', 'tin-hoc-van-phong', 'bat-dong-san', 'edit-video',
  'tiktok', 'phong-thuy', 'shopee', 'yoga',
] as const;

export const LEVELS = ['beginner', 'beginner', 'intermediate', 'advanced'] as const;
export const LEVEL_LABELS = ['Cơ bản', 'Cơ bản', 'Trung cấp', 'Nâng cao'];
export const PRICES = [0, 2000, 3000, 4000];

export const COURSES: DemoCourse[] = [
  course('cong-nghe-thong-tin', 0, 'Nhập môn Python', [
    topic('Biến và kiểu dữ liệu', 'Biến đặt tên cho dữ liệu. Python có số nguyên, số thực, chuỗi và giá trị đúng sai. Chọn kiểu phù hợp trước khi tính toán.', 'Đặt gia = 2000 và so_luong = 3; biểu thức gia * so_luong cho kết quả 6000.', 'Tạo biến tên sản phẩm, đơn giá và số lượng; in tổng tiền kèm tên sản phẩm.'),
    topic('Điều kiện và vòng lặp', 'Câu lệnh if chọn nhánh theo điều kiện. Vòng lặp for duyệt từng phần tử; thụt lề xác định khối lệnh trong Python.', 'Duyệt các điểm [6, 8, 4]. Nếu điểm >= 5 thì in Đạt, ngược lại in Cần ôn tập.', 'Duyệt năm khoản chi, chỉ cộng các khoản lớn hơn 100000 đồng và giải thích điều kiện lọc.'),
    topic('Hàm và chương trình nhỏ', 'Hàm gom một nhiệm vụ có tên, nhận tham số và trả kết quả. Chia chương trình thành các hàm giúp kiểm tra từng bước độc lập.', 'Hàm tinh_tong(gia, so_luong) trả về gia * so_luong; gọi với 1500 và 4 nhận 6000.', 'Viết hàm tính tiền sau giảm giá; thử với mức giảm 0%, 10% và 100%.'),
  ]),
  course('cong-nghe-thong-tin', 1, 'HTML & CSS từ đầu', [
    topic('Cấu trúc HTML có ý nghĩa', 'HTML mô tả cấu trúc tài liệu. Dùng một tiêu đề h1 chính, các mục h2 và thẻ liên kết có nội dung mô tả đích đến.', 'Trang giới thiệu khóa học gồm header, main, section mô tả, danh sách bài học và footer.', 'Viết trang hồ sơ với tên, đoạn giới thiệu, ba kỹ năng và liên kết liên hệ.'),
    topic('Box model và bố cục', 'Mỗi phần tử có nội dung, padding, border và margin. Flexbox sắp xếp theo một chiều; Grid phù hợp bố cục hàng và cột.', 'Đặt box-sizing: border-box để chiều rộng đã gồm padding và border; dùng gap tạo khoảng cách giữa các thẻ.', 'Tạo ba thẻ khóa học trong Grid; thêm padding 16px và khoảng cách 24px.'),
    topic('Giao diện thích ứng', 'Thiết kế từ màn hình nhỏ, dùng đơn vị linh hoạt và breakpoint theo nội dung. Hình ảnh nên co theo vùng chứa để tránh tràn ngang.', 'Grid một cột trên điện thoại chuyển thành ba cột từ 900px; ảnh dùng max-width: 100%.', 'Kiểm tra trang ở 375px, 768px và 1280px; ghi lại và sửa mọi vùng tràn ngang.'),
  ]),
  course('cong-nghe-thong-tin', 2, 'Xây dựng ứng dụng React', [
    topic('Component và luồng dữ liệu', 'Component mô tả một phần giao diện. Props truyền dữ liệu từ cha xuống con; state lưu trạng thái thay đổi và kích hoạt render.', 'CourseCard nhận title và price qua props; danh sách cha quản lý bộ lọc đang chọn.', 'Tách trang danh sách thành SearchBar, CourseList và CourseCard; xác định nơi sở hữu state.'),
    topic('Biểu mẫu và tải dữ liệu', 'Input có kiểm soát đồng bộ value với state. Khi tải dữ liệu, xử lý riêng trạng thái đang tải, lỗi và danh sách rỗng.', 'Tìm kiếm dùng từ khóa; mỗi thay đổi hủy yêu cầu cũ bằng AbortController để tránh kết quả đến sai thứ tự.', 'Tạo biểu mẫu tìm khóa học; trình bày thông báo lỗi và nút thử lại khi API thất bại.'),
    topic('Quản lý trạng thái ứng dụng', 'Giữ state tối thiểu, tính dữ liệu dẫn xuất khi render và dùng key ổn định. Tách trạng thái giao diện khỏi bộ nhớ đệm dữ liệu máy chủ.', 'Danh sách yêu thích lưu các ID; số lượng yêu thích được tính từ độ dài thay vì lưu thêm một biến.', 'Thêm bộ lọc giá và yêu thích; kiểm tra thay đổi bộ lọc không làm mất lựa chọn của người dùng.'),
  ]),
  course('cong-nghe-thong-tin', 3, 'Thiết kế API với NestJS', [
    topic('Ranh giới module và hợp đồng API', 'Controller tiếp nhận HTTP, service thực hiện nghiệp vụ và repository truy cập dữ liệu. DTO kiểm tra đầu vào trước khi nghiệp vụ chạy.', 'POST /courses nhận CreateCourseDto; service xác minh instructorId; repository ghi khóa học và trả ID.', 'Thiết kế DTO tạo khóa học với giá không âm, tiêu đề bắt buộc và enum cấp độ.'),
    topic('Phân quyền và tính nhất quán', 'Xác thực nhận diện người gọi; phân quyền kiểm tra hành động trên tài nguyên cụ thể. Giao dịch bảo vệ các cập nhật liên quan khi có lỗi.', 'Chỉ giảng viên sở hữu khóa học được sửa chương; ghi thanh toán và kích hoạt ghi danh trong cùng giao dịch.', 'Vẽ luồng webhook thanh toán; chỉ ra khóa idempotency và cách xử lý webhook gửi lặp.'),
    topic('Hiệu năng và khả năng quan sát', 'Đo thời gian phản hồi trước khi tối ưu. Dùng index theo truy vấn, giới hạn phân trang và log có request ID để truy vết lỗi.', 'Truy vấn khóa học published theo categoryId và createdAt dùng compound index tương ứng, tránh tải toàn bộ collection.', 'Đề xuất index cho hai truy vấn phổ biến và kịch bản kiểm thử tranh chấp cập nhật đồng thời.'),
  ]),
  course('thiet-ke-do-hoa', 0, 'Nhập môn Canva', [
    topic('Thông điệp và kích thước thiết kế', 'Bắt đầu bằng đối tượng xem, thông điệp chính và nơi đăng. Kích thước đúng giúp hạn chế cắt nội dung khi xuất bản.', 'Bài đăng vuông 1080 x 1080 giới thiệu một workshop chỉ cần tên, thời gian và một lời kêu gọi hành động.', 'Viết brief ba dòng cho poster workshop; chọn kích thước và một thông điệp duy nhất.'),
    topic('Phân cấp chữ và màu sắc', 'Phân cấp thị giác giúp người xem đọc tiêu đề trước chi tiết. Chọn ít kiểu chữ, giữ độ tương phản và căn chỉnh các thành phần.', 'Dùng một font cho tiêu đề và một font cho nội dung; nhấn thời gian bằng màu thương hiệu.', 'Thiết kế poster với ba cỡ chữ; thử xem ở kích thước điện thoại và sửa phần khó đọc.'),
    topic('Xuất file và tái sử dụng', 'Chọn định dạng theo mục đích: PNG cho ảnh rõ nét, JPG cho ảnh nhẹ và PDF cho bản in. Giữ bản gốc để chỉnh sửa.', 'Nhân bản thiết kế thành ba bài đăng, thay ảnh và nội dung nhưng giữ lưới căn chỉnh.', 'Xuất bản PNG cho mạng xã hội và PDF cho in; so sánh độ nét và dung lượng.'),
  ]),
  course('thiet-ke-do-hoa', 1, 'Photoshop căn bản', [
    topic('Layer và chỉnh sửa không phá hủy', 'Layer tách các thành phần của ảnh. Adjustment layer điều chỉnh màu riêng biệt; mask kiểm soát vùng hiển thị mà vẫn giữ ảnh gốc.', 'Làm sáng chân dung bằng Curves trên adjustment layer rồi dùng mask chỉ tác động lên khuôn mặt.', 'Tạo file có ảnh gốc, adjustment layer và mask; đặt tên rõ cho từng lớp.'),
    topic('Vùng chọn và ghép ảnh', 'Vùng chọn xác định phần cần chỉnh. Mép chọn cần phù hợp độ nét ảnh; ghép ảnh thuyết phục đòi hỏi hướng sáng và phối cảnh nhất quán.', 'Tách một sản phẩm khỏi nền, đặt trên nền trung tính và thêm bóng mềm cùng hướng nguồn sáng.', 'Ghép sản phẩm vào nền mới; kiểm tra viền ở mức zoom 100% và chỉnh mask.'),
    topic('Màu sắc và xuất ảnh', 'Cân bằng trắng sửa ám màu; contrast điều chỉnh tương phản. Khi xuất cho web, chọn sRGB và kích thước đúng nhu cầu hiển thị.', 'Xuất ảnh bìa rộng 1280px, kiểm tra màu da và dung lượng trước khi tải lên website.', 'Tạo hai bản xuất với chất lượng khác nhau; ghi nhận điểm cân bằng giữa dung lượng và chi tiết.'),
  ]),
  course('thiet-ke-do-hoa', 2, 'Thiết kế thương hiệu với Illustrator', [
    topic('Hình học vector và đường nét', 'Vector dùng điểm neo và đường cong, có thể phóng to mà không vỡ. Giữ ít điểm neo giúp đường nét sạch và dễ chỉnh.', 'Tạo biểu tượng chiếc lá từ hai đường cong Bézier rồi cân bằng độ dày khi hiển thị nhỏ.', 'Vẽ biểu tượng từ ba hình cơ bản; kiểm tra ở 24px và 240px.'),
    topic('Hệ nhận diện nhất quán', 'Logo, màu, kiểu chữ và khoảng trống tạo nên hệ nhận diện. Quy tắc nhất quán quan trọng hơn việc thêm nhiều hiệu ứng.', 'Một thương hiệu cà phê dùng hai màu chính, một font tiêu đề và vùng bảo vệ bằng chiều cao ký tự trong logo.', 'Lập bảng màu, kiểu chữ và ba biến thể logo trên nền sáng, tối và đơn sắc.'),
    topic('Bàn giao bộ tài sản thương hiệu', 'Artboard quản lý nhiều định dạng. Bộ bàn giao cần bản vector, bản raster, quy tắc sử dụng và tên file dễ nhận biết.', 'Xuất SVG cho web, PDF vector cho in và PNG nền trong; kiểm tra lại font trước bàn giao.', 'Tạo bộ tài sản cho danh thiếp, avatar và bảng hiệu; ghi rõ mã màu và kích thước.'),
  ]),
  course('thiet-ke-do-hoa', 3, 'Xây dựng Design System với Figma', [
    topic('Token và nguyên tắc nền tảng', 'Design token đặt tên ngữ nghĩa cho màu, khoảng cách và typography. Tách giá trị gốc khỏi mục đích sử dụng để hỗ trợ nhiều giao diện.', 'Token color.text.primary tham chiếu màu phù hợp cho từng theme, thay vì đặt trực tiếp mã màu trong mọi component.', 'Thiết kế bộ token cho hai theme; mô tả cách chuyển theme mà vẫn giữ độ tương phản.'),
    topic('Component có trạng thái', 'Component cần các trạng thái mặc định, hover, focus, disabled và loading. Auto Layout giúp nội dung dài ngắn vẫn giữ bố cục.', 'Button có biến thể primary và secondary, kích thước nhỏ và lớn; loading giữ nguyên chiều rộng.', 'Tạo component input với label, mô tả lỗi và focus ring; thử bằng nội dung tiếng Việt dài.'),
    topic('Quản trị và bàn giao hệ thống', 'Một hệ thống thiết kế cần tài liệu, phiên bản và quy trình đóng góp. Theo dõi mức sử dụng để phát hiện component trùng hoặc lỗi thời.', 'Mỗi component có mục đích, ví dụ, điều nên tránh và ánh xạ sang tên component trong mã nguồn.', 'Lập quy trình phát hành phiên bản mới và kế hoạch chuyển đổi khi đổi token khoảng cách.'),
  ]),
  course('marketing', 0, 'Nhập môn Digital Marketing', [
    topic('Khách hàng và mục tiêu', 'Marketing bắt đầu từ vấn đề của khách hàng. Mục tiêu cụ thể cần đối tượng, hành động mong muốn và khoảng thời gian đo lường.', 'Một lớp tiếng Anh nhắm người đi làm cần tăng lượt đăng ký tư vấn trong bốn tuần.', 'Viết chân dung một nhóm khách hàng và một mục tiêu có thể đo bằng số.'),
    topic('Kênh và hành trình khách hàng', 'Người dùng đi qua nhận biết, cân nhắc và quyết định. Mỗi kênh cần nội dung phù hợp với giai đoạn thay vì lặp một thông điệp.', 'Video ngắn tạo nhận biết; bài so sánh giải đáp băn khoăn; trang đăng ký cung cấp lịch học và học phí.', 'Vẽ hành trình ba bước và chọn một loại nội dung cho từng bước.'),
    topic('Đo lường hiệu quả cơ bản', 'Lượt hiển thị phản ánh tiếp cận, lượt nhấp phản ánh quan tâm và chuyển đổi phản ánh hành động. Đánh giá chỉ số gắn với mục tiêu ban đầu.', 'Có 1000 lượt xem và 50 lượt nhấp thì CTR là 5%; 5 đăng ký từ 50 lượt nhấp là chuyển đổi 10%.', 'Lập bảng theo dõi lượt xem, nhấp và đăng ký cho một chiến dịch mẫu.'),
  ]),
  course('marketing', 1, 'Viết nội dung mạng xã hội', [
    topic('Thông điệp và góc tiếp cận', 'Một bài viết hiệu quả giải quyết một câu hỏi cụ thể. Chọn góc tiếp cận từ khó khăn thực tế của độc giả và nêu lợi ích rõ ràng.', 'Thay vì viết về mọi tính năng, bài giới thiệu ứng dụng ghi chú tập trung vào cách tìm lại ý tưởng trong vài giây.', 'Liệt kê năm câu hỏi của khách hàng và chọn một câu làm chủ đề bài đăng.'),
    topic('Cấu trúc bài viết', 'Mở đầu tạo lý do đọc tiếp, phần thân cung cấp thông tin và kết thúc đề xuất hành động phù hợp. Đoạn ngắn hỗ trợ đọc trên điện thoại.', 'Bài hướng dẫn gồm vấn đề thường gặp, ba bước xử lý và lời mời lưu bài để thực hành.', 'Viết bài 150 từ theo cấu trúc mở đầu, ba ý chính và một lời kêu gọi hành động.'),
    topic('Lịch nội dung và cải tiến', 'Lịch nội dung cân bằng giáo dục, giải đáp và giới thiệu sản phẩm. So sánh các bài cùng mục tiêu để cải tiến thông điệp.', 'Theo dõi tỷ lệ lưu bài cho nội dung hướng dẫn và số câu hỏi chất lượng cho nội dung tư vấn.', 'Lập lịch một tuần gồm bốn bài; ghi mục tiêu và chỉ số cần theo dõi của từng bài.'),
  ]),
  course('marketing', 2, 'SEO và chiến lược nội dung', [
    topic('Ý định tìm kiếm và cụm chủ đề', 'Ý định tìm kiếm cho biết người dùng muốn học, so sánh hay mua. Nhóm từ khóa theo nhu cầu để tránh nhiều bài cạnh tranh cùng mục đích.', 'Cụm học Excel gồm bài tổng quan, hàm cơ bản, PivotTable và sửa lỗi; mỗi bài đáp ứng một câu hỏi riêng.', 'Nhóm mười từ khóa thành ba cụm, xác định trang trụ cột và các bài hỗ trợ.'),
    topic('Tối ưu nội dung trên trang', 'Tiêu đề, heading và liên kết nội bộ giúp người đọc hiểu cấu trúc. Nội dung cần trả lời đúng câu hỏi và cung cấp ví dụ có ích.', 'Một bài về PivotTable có dữ liệu mẫu, bước thao tác, lỗi thường gặp và liên kết sang hướng dẫn làm sạch dữ liệu.', 'Viết outline với một h1, ba h2 và hai liên kết nội bộ có văn bản mô tả rõ.'),
    topic('Đo lường và cập nhật', 'Theo dõi truy vấn, lượt hiển thị, lượt nhấp và chuyển đổi theo trang. Ưu tiên cập nhật trang có nhu cầu tốt nhưng chưa trả lời đầy đủ.', 'Trang có nhiều hiển thị nhưng CTR thấp cần xem lại tiêu đề; trang có nhấp nhưng ít tương tác cần xem nội dung và trải nghiệm.', 'Lập bảng ưu tiên cập nhật năm bài với giả thuyết, thay đổi dự kiến và thời điểm đánh giá.'),
  ]),
  course('marketing', 3, 'Phân tích và tối ưu chiến dịch', [
    topic('Thiết kế hệ đo lường', 'Sự kiện phải phản ánh hành vi có ý nghĩa và có định nghĩa thống nhất. Quy ước UTM giúp phân biệt nguồn, kênh và chiến dịch.', 'Sự kiện lead_submitted chỉ ghi khi biểu mẫu hợp lệ được lưu, không ghi khi người dùng chỉ bấm nút.', 'Lập sơ đồ sự kiện từ lượt xem đến mua hàng; xác định thuộc tính và cách loại trùng.'),
    topic('Thử nghiệm và suy luận', 'Thử nghiệm A/B thay đổi một yếu tố chính, chia nhóm nhất quán và định trước chỉ số. Tránh kết luận từ mẫu quá nhỏ hoặc chỉ số phụ.', 'So sánh hai tiêu đề trang đăng ký với cùng đối tượng và ngân sách; đánh giá bằng tỷ lệ đăng ký hợp lệ.', 'Viết kế hoạch thử nghiệm gồm giả thuyết, chỉ số chính, thời gian và điều kiện kết thúc.'),
    topic('Phân bổ ngân sách theo hiệu quả', 'Chi phí thu hút cần đối chiếu chất lượng khách hàng và lợi nhuận đóng góp. Mô hình quy kết có giới hạn nên kết hợp nhiều nguồn đo.', 'Kênh A tạo lead rẻ nhưng tỷ lệ mua thấp; kênh B có lead đắt hơn nhưng chi phí cho một khách mua thấp hơn.', 'Tính chi phí khách mua cho hai kênh, đề xuất ngân sách và nêu giả định cần kiểm chứng.'),
  ]),
  course('tai-chinh', 0, 'Quản lý tài chính cá nhân', [
    topic('Thu nhập, chi tiêu và dòng tiền', 'Dòng tiền cá nhân là tiền thực nhận trừ tiền thực chi trong một kỳ. Phân loại khoản thiết yếu và linh hoạt giúp hiểu khả năng tiết kiệm.', 'Thu nhập 10 triệu và chi 8 triệu tạo thặng dư 2 triệu; khoản vay nhận được không phải thu nhập bền vững.', 'Ghi lại mười khoản thu chi gần nhất và phân loại thiết yếu, linh hoạt hoặc tiết kiệm.'),
    topic('Quỹ dự phòng và mục tiêu', 'Quỹ dự phòng dành cho biến cố, cần dễ tiếp cận và tách khỏi tiền chi tiêu. Mục tiêu tiết kiệm nên có số tiền và thời hạn.', 'Mục tiêu 6 triệu trong sáu tháng cần dành 1 triệu mỗi tháng nếu chưa tính lãi.', 'Chọn một mục tiêu và tính số tiền cần dành hằng tháng; ghi phương án khi thu nhập giảm.'),
    topic('Theo dõi và điều chỉnh', 'Ngân sách hữu ích khi được so với thực tế. Đánh giá định kỳ giúp nhận ra khoản vượt chi và điều chỉnh trước khi thiếu tiền.', 'Cuối tuần so sánh ngân sách ăn uống với hóa đơn thực tế rồi điều chỉnh tuần tiếp theo.', 'Tạo bảng kế hoạch, thực tế và chênh lệch cho năm nhóm chi; đề xuất một thay đổi khả thi.'),
  ]),
  course('tai-chinh', 1, 'Lập ngân sách và tiết kiệm', [
    topic('Ngân sách theo mục đích', 'Gán nhiệm vụ cho từng khoản tiền trước khi chi. Tỷ lệ phân bổ cần phù hợp hoàn cảnh thay vì áp dụng máy móc một công thức.', 'Thu nhập 12 triệu được phân cho nhà ở, sinh hoạt, trả nợ, dự phòng và học tập với tổng không vượt 12 triệu.', 'Lập ngân sách tháng có đủ năm nhóm chi và kiểm tra tổng phân bổ bằng thu nhập.'),
    topic('Tiết kiệm tự động', 'Chuyển tiền cho mục tiêu ngay sau ngày nhận thu nhập giúp tạo thói quen. Khoản định kỳ nhỏ nhưng phù hợp dễ duy trì hơn cam kết quá cao.', 'Chuyển 500000 đồng mỗi tháng tạo 6 triệu sau một năm nếu chưa tính lãi và phí.', 'Xác định ngày chuyển tiền, số tiền và tài khoản mục tiêu; tính kết quả sau 12 tháng.'),
    topic('Chi phí định kỳ và tình huống bất thường', 'Chi phí theo năm nên được chia đều vào kế hoạch tháng. Dự trù khoản bất thường giúp ngân sách không bị gián đoạn khi đến hạn.', 'Phí bảo trì 2,4 triệu mỗi năm tương đương khoản dành trước 200000 đồng mỗi tháng.', 'Liệt kê ba chi phí theo năm, quy đổi về tháng và cập nhật ngân sách ban đầu.'),
  ]),
  course('tai-chinh', 2, 'Đọc hiểu báo cáo tài chính', [
    topic('Ba báo cáo và mối liên hệ', 'Bảng cân đối phản ánh tài sản và nguồn vốn tại một thời điểm. Báo cáo kết quả và lưu chuyển tiền tệ phản ánh hoạt động trong một kỳ.', 'Bán chịu có thể làm tăng doanh thu và khoản phải thu, nhưng chưa làm tăng tiền mặt ngay.', 'Giải thích tác động của bán chịu, mua thiết bị và vay ngân hàng lên ba báo cáo.'),
    topic('Biên lợi nhuận và vốn lưu động', 'Biên lợi nhuận gộp là lợi nhuận gộp chia doanh thu. Hàng tồn kho và khoản phải thu có thể khiến doanh nghiệp có lãi nhưng thiếu tiền.', 'Doanh thu 100 và giá vốn 65 tạo lợi nhuận gộp 35, tức biên gộp 35%.', 'Tính biên gộp cho hai kỳ và giải thích tác động khi khoản phải thu tăng nhanh hơn doanh thu.'),
    topic('Chất lượng lợi nhuận', 'Đọc thuyết minh để hiểu chính sách kế toán, khoản bất thường và giao dịch liên quan. Đối chiếu lợi nhuận với dòng tiền qua nhiều kỳ.', 'Lợi nhuận tăng do bán tài sản một lần cần được tách khỏi hiệu quả kinh doanh lặp lại.', 'Lập bảng câu hỏi khi lợi nhuận tăng nhưng dòng tiền kinh doanh âm trong hai kỳ liên tiếp.'),
  ]),
  course('tai-chinh', 3, 'Phân tích danh mục đầu tư', [
    topic('Mục tiêu, thời hạn và phân bổ', 'Danh mục bắt đầu từ nhu cầu tiền, thời hạn và khả năng chịu biến động. Phân bổ tài sản cần xét cả tương quan và tính thanh khoản.', 'Khoản tiền cần dùng sau sáu tháng có yêu cầu thanh khoản khác khoản dành cho mục tiêu sau mười năm.', 'Xây dựng hai danh mục giả định cho hai thời hạn; giải thích tỷ trọng bằng mục tiêu cụ thể.'),
    topic('Lợi suất và rủi ro danh mục', 'Lợi suất danh mục là trung bình theo tỷ trọng. Rủi ro còn phụ thuộc tương quan, nên đa dạng hóa không chỉ là tăng số mã tài sản.', 'Danh mục 60% tài sản A lãi 10% và 40% B lãi 5% đạt 8% trước phí.', 'Tính lợi suất theo tỷ trọng và mô tả tình huống các tài sản cùng giảm khi có cú sốc chung.'),
    topic('Tái cân bằng và đánh giá', 'Tái cân bằng đưa tỷ trọng về mục tiêu theo lịch hoặc ngưỡng lệch. So sánh kết quả sau phí với benchmark phù hợp và cùng thời kỳ.', 'Tỷ trọng cổ phiếu tăng từ 60% lên 72%; ngưỡng lệch 5 điểm phần trăm kích hoạt đánh giá tái cân bằng.', 'Lập chính sách tái cân bằng cho danh mục giả định, nêu phí giao dịch và giới hạn của dữ liệu quá khứ.'),
  ]),
  course('ngoai-ngu', 0, 'Phát âm tiếng Anh cơ bản', [
    topic('Âm và phiên âm', 'Chữ viết và âm tiếng Anh không luôn trùng nhau. Phiên âm giúp nhận diện âm; luyện từng cặp âm trước khi đọc cả câu.', 'Ship /ʃɪp/ và sheep /ʃiːp/ khác nguyên âm; nghe mẫu, ghi âm và so sánh thay vì chỉ nhìn cách viết.', 'Chọn năm cặp từ gần âm, tra phiên âm và ghi âm mỗi cặp ba lần.'),
    topic('Trọng âm từ', 'Một âm tiết trong từ thường nổi bật hơn về độ dài và cường độ. Đánh dấu trọng âm khi học từ mới giúp ghi nhớ cách đọc.', 'TAble có trọng âm đầu; aBOUT có trọng âm sau. Gạch chân âm tiết được nhấn trong sổ từ vựng.', 'Lập danh sách mười từ hai âm tiết, đánh dấu trọng âm và đọc theo nhóm.'),
    topic('Nhịp điệu câu', 'Từ mang thông tin thường được nhấn hơn từ chức năng. Chia câu thành cụm nghĩa và luyện chậm trước khi tăng tốc.', 'Trong câu I need a new book, nhấn need, new và book theo ý cần truyền đạt.', 'Ghi âm đoạn giới thiệu ba câu; đánh dấu chỗ ngắt và từ nhấn rồi thu lại.'),
  ]),
  course('ngoai-ngu', 1, 'Tiếng Anh giao tiếp hằng ngày', [
    topic('Giới thiệu và hỏi thông tin', 'Hội thoại cơ bản cần lời chào, thông tin ngắn và câu hỏi nối tiếp. Dùng câu đơn đúng mục đích trước khi mở rộng từ vựng.', 'Hi, I am Linh. I work in design. What do you do? là một cách mở đầu ngắn, dễ tiếp nối.', 'Viết hội thoại sáu lượt giới thiệu tên, nghề nghiệp và sở thích.'),
    topic('Mua sắm và gọi món', 'Các mẫu yêu cầu lịch sự giúp giao tiếp rõ ràng. Xác nhận số lượng, giá và lựa chọn để giảm hiểu nhầm.', 'Could I have a small coffee, please? Sau đó hỏi How much is it? và xác nhận đơn hàng.', 'Đóng vai khách và nhân viên; gọi hai món, hỏi giá và yêu cầu một thay đổi.'),
    topic('Hỏi đường và xử lý hiểu nhầm', 'Khi chưa hiểu, yêu cầu nhắc lại hoặc nói chậm. Nhắc lại thông tin quan trọng là cách kiểm tra hiểu đúng trong hội thoại.', 'Could you say that again, please? So I turn left at the bank, right? giúp xác nhận hướng đi.', 'Viết chỉ đường ba bước và thêm hai câu hỏi xác nhận; thực hành với bạn học.'),
  ]),
  course('ngoai-ngu', 2, 'Tiếng Anh công sở', [
    topic('Email rõ mục đích', 'Email công việc cần tiêu đề cụ thể, mục đích ngay đầu và hành động mong muốn. Giữ giọng lịch sự và nêu thời hạn rõ.', 'Subject: Feedback on draft by Friday. Could you review the attached draft and share comments by Friday afternoon?', 'Viết email xin phản hồi 100 từ, có tài liệu đính kèm, thời hạn và lời cảm ơn.'),
    topic('Tham gia cuộc họp', 'Chuẩn bị ý chính, dữ liệu và câu hỏi trước cuộc họp. Dùng cụm từ xác nhận hiểu đúng trước khi phản biện hoặc đề xuất.', 'If I understand correctly, the deadline is Monday. Could we prioritize the payment feature first?', 'Soạn ba câu đồng ý, ba câu đề xuất và một đoạn tóm tắt quyết định sau họp.'),
    topic('Báo cáo tiến độ', 'Báo cáo hiệu quả phân biệt phần đã xong, phần đang làm, trở ngại và hỗ trợ cần thiết. Nêu thời điểm cập nhật tiếp theo.', 'The design is complete. Testing is in progress. We need access to the test server by tomorrow.', 'Viết cập nhật tiến độ một dự án gồm bốn mục và trình bày trong một phút.'),
  ]),
  course('ngoai-ngu', 3, 'Thuyết trình và đàm phán bằng tiếng Anh', [
    topic('Lập luận và cấu trúc thuyết trình', 'Bài thuyết trình thuyết phục liên kết luận điểm, bằng chứng và tác động. Báo trước cấu trúc để người nghe theo dõi các phần chính.', 'Today I will cover the problem, our evidence, and the proposed next steps. Mỗi phần kết thúc bằng một ý chốt.', 'Xây dựng bài nói ba phút với một luận điểm, hai bằng chứng và một đề xuất hành động.'),
    topic('Trả lời câu hỏi khó', 'Nghe hết câu hỏi, diễn đạt lại điều cần trả lời và trả lời đúng phạm vi. Khi thiếu dữ liệu, nêu cách và thời điểm bổ sung.', 'That is an important question. We have not measured that yet; I can share the data after the pilot.', 'Chuẩn bị năm câu hỏi phản biện và câu trả lời phân biệt dữ kiện, giả định và điều chưa biết.'),
    topic('Đàm phán theo lợi ích', 'Tìm lợi ích phía sau yêu cầu để đề xuất nhiều phương án. Xác định giới hạn và phương án thay thế trước khi thương lượng.', 'If we extend the delivery date, could you include training? Câu điều kiện liên kết hai nhượng bộ cụ thể.', 'Viết hội thoại đàm phán thời hạn và phạm vi; chốt bằng bản tóm tắt các điều đã thống nhất.'),
  ]),
  course('tin-hoc-van-phong', 0, 'Word cho người mới', [
    topic('Soạn thảo với Styles', 'Styles quản lý định dạng nhất quán cho tiêu đề và đoạn văn. Dùng Heading thay vì tăng cỡ chữ thủ công giúp tạo cấu trúc tài liệu.', 'Áp dụng Heading 1 cho chương, Heading 2 cho mục; thay một style sẽ cập nhật toàn bộ tiêu đề cùng cấp.', 'Soạn tài liệu hai trang với hai Heading 1, bốn Heading 2 và đoạn văn thường.'),
    topic('Bảng, hình ảnh và bố cục', 'Bảng phù hợp dữ liệu theo hàng cột. Hình ảnh cần chế độ bọc chữ phù hợp; ngắt trang giúp bố cục ổn định hơn thêm dòng trống.', 'Chèn bảng lịch học ba cột và hình minh họa đặt In Line with Text để tránh lệch khi chỉnh nội dung.', 'Tạo lịch học năm buổi, thêm chú thích ảnh và ngắt trang trước phần phụ lục.'),
    topic('Mục lục và xuất PDF', 'Mục lục tự động lấy thông tin từ Heading. Cập nhật trường sau khi chỉnh nội dung, kiểm tra số trang trước khi xuất PDF.', 'Sau khi thêm một chương, chọn cập nhật toàn bộ mục lục để đồng bộ tiêu đề và số trang.', 'Thêm số trang, tạo mục lục và xuất PDF; mở lại để kiểm tra font và ngắt trang.'),
  ]),
  course('tin-hoc-van-phong', 1, 'Excel căn bản', [
    topic('Ô, bảng và kiểu dữ liệu', 'Mỗi ô có địa chỉ theo cột và hàng. Giữ dữ liệu số ở dạng số, ngày ở dạng ngày; một cột chỉ nên chứa một loại thông tin.', 'Bảng chi tiêu có Ngày, Nhóm, Mô tả và Số tiền; không gộp đơn vị tiền vào nội dung số.', 'Nhập mười khoản chi thành bảng, định dạng tiền và ngày mà không đổi giá trị gốc.'),
    topic('Công thức và tham chiếu', 'Công thức bắt đầu bằng dấu bằng. Tham chiếu tương đối thay đổi khi sao chép; dấu đô la giữ cố định hàng hoặc cột cần dùng chung.', 'Ô D2 dùng =B2*C2; tỷ lệ thuế đặt ở F1 thì công thức thuế dùng =D2*$F$1.', 'Tạo bảng bán hàng, tính thành tiền và thuế; kéo công thức xuống và kiểm tra từng tham chiếu.'),
    topic('Sắp xếp, lọc và biểu đồ', 'Lọc chỉ ẩn dòng không phù hợp, không xóa dữ liệu. Chọn biểu đồ theo câu hỏi: cột để so sánh, đường để theo dõi theo thời gian.', 'Lọc nhóm Ăn uống rồi tạo biểu đồ chi tiêu theo tuần từ bảng tổng hợp.', 'Sắp xếp khoản chi giảm dần, lọc theo nhóm và tạo biểu đồ có tiêu đề, đơn vị rõ ràng.'),
  ]),
  course('tin-hoc-van-phong', 2, 'Excel: hàm và PivotTable', [
    topic('Hàm điều kiện và tra cứu', 'SUMIFS cộng theo nhiều điều kiện; XLOOKUP tra cứu theo khóa. Chuẩn hóa khóa và xử lý không tìm thấy trước khi phân tích.', 'Cộng doanh thu theo khu vực và tháng bằng SUMIFS; tra tên sản phẩm theo mã bằng XLOOKUP.', 'Tạo bảng mã sản phẩm và bảng bán hàng; tra tên, cộng doanh thu theo hai điều kiện.'),
    topic('Chuẩn bị dữ liệu cho PivotTable', 'Dữ liệu nguồn cần một hàng tiêu đề, không gộp ô và không có dòng tổng chen giữa. Excel Table giúp vùng dữ liệu mở rộng khi thêm dòng.', 'Bảng giao dịch gồm Ngày, Khu vực, Sản phẩm và Doanh thu; mỗi dòng là một giao dịch.', 'Làm sạch bảng có dòng trống, số lưu dạng chữ và tiêu đề trùng trước khi tạo PivotTable.'),
    topic('Phân tích bằng PivotTable', 'Đặt chiều phân tích vào Rows và Columns, chỉ số vào Values. Kiểm tra phép tổng hợp là Sum hay Count và làm mới sau cập nhật nguồn.', 'Tổng doanh thu theo khu vực và tháng, thêm slicer sản phẩm để lọc báo cáo tương tác.', 'Tạo PivotTable và biểu đồ; kiểm tra tổng khớp dữ liệu gốc trước và sau khi thêm giao dịch.'),
  ]),
  course('tin-hoc-van-phong', 3, 'Tự động hóa báo cáo với Power Query', [
    topic('Nhập dữ liệu và định nghĩa kiểu', 'Power Query lưu chuỗi bước biến đổi để chạy lại khi làm mới. Chọn kiểu dữ liệu sớm và giữ bản nguồn tách khỏi bảng kết quả.', 'Nhập CSV bán hàng, chuyển ngày theo locale phù hợp và chuyển cột doanh thu sang số thập phân.', 'Tạo truy vấn từ CSV, đặt kiểu cho từng cột và xử lý ba dòng lỗi có giải thích.'),
    topic('Gộp tệp và kết nối bảng', 'Append nối các bảng cùng cấu trúc; Merge ghép theo khóa. Kiểm tra tính duy nhất của khóa để tránh nhân dòng ngoài ý muốn.', 'Gộp báo cáo tháng bằng Append rồi Merge danh mục sản phẩm theo mã; khóa danh mục cần duy nhất.', 'Gộp ba file tháng và nối bảng danh mục; so sánh số dòng, tổng tiền trước và sau Merge.'),
    topic('Pipeline có thể bảo trì', 'Đặt tên bước rõ, tách truy vấn staging và báo cáo, dùng tham số cho đường dẫn. Kiểm tra schema và tổng kiểm soát sau mỗi lần làm mới.', 'Một tham số thư mục cho phép đổi nguồn mà không sửa tất cả truy vấn; báo cáo lỗi giữ riêng các dòng không hợp lệ.', 'Thiết kế pipeline nhận file tháng mới, có kiểm tra thiếu cột và ghi nhận số dòng lỗi.'),
  ]),
  course('bat-dong-san', 0, 'Nhập môn bất động sản', [
    topic('Loại hình và nhu cầu sử dụng', 'Nhà ở, đất, văn phòng và mặt bằng kinh doanh phục vụ nhu cầu khác nhau. Đánh giá tài sản từ mục đích sử dụng trước khi so giá.', 'Căn hộ để ở cần xét đi lại và dịch vụ; mặt bằng kinh doanh cần xét khách qua lại và khả năng vận hành.', 'Lập bảng so sánh hai loại hình theo người sử dụng, chi phí và yếu tố vị trí.'),
    topic('Thông tin tài sản cần xác minh', 'Diện tích, hiện trạng, quyền sử dụng và quy hoạch ảnh hưởng quyết định. Phân biệt thông tin quảng cáo với hồ sơ và nguồn có thẩm quyền.', 'Diện tích rao bán cần đối chiếu giấy tờ và đo đạc; điều kiện chuyển nhượng cần kiểm tra theo hồ sơ cụ thể.', 'Lập danh sách thông tin cần thu thập cho một căn hộ giả định và nguồn kiểm chứng.'),
    topic('Chi phí sở hữu', 'Giá mua chỉ là một phần tổng chi phí. Tính thêm chi phí giao dịch, sửa chữa, vận hành và chi phí vốn theo tình huống.', 'Một căn hộ có giá mua, phí quản lý hằng tháng và khoản sửa chữa ban đầu; các khoản này vào ngân sách riêng.', 'Lập bảng tổng chi phí năm đầu của một tài sản giả định, ghi rõ từng giả định.'),
  ]),
  course('bat-dong-san', 1, 'Kỹ năng tư vấn khách hàng', [
    topic('Khám phá nhu cầu', 'Đặt câu hỏi mở để hiểu mục đích, ngân sách, thời hạn và ưu tiên. Tóm tắt lại để khách xác nhận trước khi giới thiệu tài sản.', 'Khách cần gần trường và dưới một mức ngân sách; diện tích lớn có thể là ưu tiên sau vị trí.', 'Soạn tám câu hỏi khảo sát và phân nhóm điều bắt buộc với điều có thể linh hoạt.'),
    topic('Trình bày phương án', 'So sánh các lựa chọn trên cùng tiêu chí và nêu cả điểm phù hợp lẫn đánh đổi. Dùng thông tin kiểm chứng được thay cho lời hứa.', 'Bảng ba căn hộ so theo khoảng cách, tổng chi phí, diện tích và tình trạng hồ sơ.', 'Tạo bảng so sánh ba tài sản giả định và giải thích lựa chọn theo nhu cầu đã khảo sát.'),
    topic('Theo dõi và ghi nhận phản hồi', 'Ghi lại câu hỏi, phản hồi và bước tiếp theo sau mỗi buổi tư vấn. Hẹn lịch rõ ràng và cập nhật thông tin khi có thay đổi.', 'Sau buổi xem nhà, gửi tóm tắt ưu nhược điểm và danh sách hồ sơ còn cần xác minh.', 'Viết tin nhắn theo dõi và mẫu ghi chú khách hàng với nhu cầu, phản hồi và lịch hẹn.'),
  ]),
  course('bat-dong-san', 2, 'Phân tích thị trường và định giá', [
    topic('Dữ liệu so sánh phù hợp', 'Tài sản so sánh nên gần về vị trí, loại hình, diện tích và thời điểm. Giá chào bán khác giá giao dịch, cần ghi rõ nguồn dữ liệu.', 'So căn hộ cùng khu và thời điểm, điều chỉnh khác biệt về tầng, diện tích và tình trạng hoàn thiện.', 'Thu thập năm mẫu giả định, đánh dấu giá chào hay giá giao dịch và loại mẫu không tương đồng.'),
    topic('Điều chỉnh và khoảng giá', 'Định giá so sánh cần điều chỉnh có lý do cho các khác biệt. Trình bày khoảng giá và độ tin cậy thay vì một con số chắc chắn.', 'Mẫu đã sửa mới không thể so trực tiếp với căn cần cải tạo; chi phí cải tạo là một đầu vào điều chỉnh.', 'Lập bảng điều chỉnh ba mẫu, nêu cơ sở và khoảng giá đề xuất cho tài sản mục tiêu.'),
    topic('Nguồn cung, nhu cầu và thanh khoản', 'Thị trường không chỉ có giá mà còn thời gian bán và lượng giao dịch. Đọc xu hướng qua nhiều kỳ để giảm ảnh hưởng dữ liệu bất thường.', 'Giá chào tăng nhưng thời gian rao bán kéo dài có thể cho thấy thanh khoản suy giảm.', 'Tạo báo cáo ngắn kết hợp giá, nguồn cung và thời gian bán; nêu giới hạn dữ liệu.'),
  ]),
  course('bat-dong-san', 3, 'Phân tích hiệu quả dự án', [
    topic('Mô hình dòng tiền dự án', 'Lập dòng tiền theo thời điểm thực thu và thực chi. Tách chi phí đầu tư, vận hành, vốn vay và tiền thu từ bán hoặc cho thuê.', 'Chi phí xây dựng xuất hiện trước doanh thu; tiến độ bán hàng làm thay đổi nhu cầu vốn trong từng quý.', 'Lập mô hình tám quý cho dự án giả định với lịch xây dựng, giải ngân và thu tiền.'),
    topic('NPV và suất chiết khấu', 'NPV quy đổi dòng tiền tương lai về hiện tại theo suất chiết khấu. Kết quả phụ thuộc giả định về thời điểm và mức độ rủi ro.', 'NPV bằng tổng dòng tiền chiết khấu trừ vốn ban đầu; cùng dòng tiền nhưng suất chiết khấu cao hơn thường làm NPV thấp hơn.', 'Tính NPV ở ba suất chiết khấu và giải thích vì sao kết luận thay đổi.'),
    topic('Kịch bản và độ nhạy', 'Phân tích độ nhạy thay đổi một biến; kịch bản thay đổi đồng thời các giả định liên quan. Kiểm tra cả hiệu quả lẫn khả năng thiếu tiền.', 'Kịch bản chậm bán sáu tháng kèm tăng chi phí xây dựng ảnh hưởng NPV và nhu cầu vốn đỉnh.', 'Tạo ba kịch bản cơ sở, thuận lợi và bất lợi; xác định biến ảnh hưởng lớn nhất.'),
  ]),
  course('edit-video', 0, 'CapCut cho người mới', [
    topic('Dự án và timeline', 'Timeline sắp xếp clip theo thời gian. Chọn tỷ lệ khung hình theo nơi đăng, rồi cắt phần thừa để câu chuyện đi thẳng vào nội dung.', 'Video dọc dùng tỷ lệ 9:16; ba clip mở đầu, thao tác và kết quả tạo thành một câu chuyện ngắn.', 'Nhập ba clip, đặt tỷ lệ 9:16 và cắt thành video 20 giây có mở đầu rõ.'),
    topic('Chữ, phụ đề và âm thanh', 'Chữ cần đủ lớn và nằm trong vùng an toàn. Cân bằng âm lượng để lời nói rõ hơn nhạc; kiểm tra lại phụ đề tự động.', 'Hạ nhạc nền khi có lời nói và sửa tên riêng trong phụ đề trước khi xuất.', 'Thêm phụ đề cho video, sửa lỗi nhận diện và kiểm tra khi xem trên màn hình nhỏ.'),
    topic('Xuất video và kiểm tra', 'Độ phân giải và tốc độ khung hình nên phù hợp nguồn và nơi đăng. Xem file xuất từ đầu đến cuối để phát hiện lỗi hình hoặc tiếng.', 'Xuất MP4 1080 x 1920, giữ tốc độ khung hình phù hợp clip nguồn và kiểm tra không có khung đen.', 'Xuất hai mức chất lượng, so sánh dung lượng và chọn bản vẫn đọc rõ phụ đề.'),
  ]),
  course('edit-video', 1, 'Premiere Pro căn bản', [
    topic('Tổ chức media và sequence', 'Phân thư mục nguồn trước khi dựng và đặt sequence theo đầu ra. Giữ tên file ổn định để tránh mất liên kết media.', 'Tạo các bin Footage, Audio, Graphics; sequence 1920 x 1080 với frame rate phù hợp cảnh quay.', 'Tổ chức mười clip vào bin, tạo sequence và lưu dự án theo phiên bản.'),
    topic('Cắt dựng và nhịp kể chuyện', 'Điểm cắt nên phục vụ thông tin và cảm xúc. Dùng trim để điều chỉnh nhịp; chuyển cảnh chỉ thêm khi có mục đích rõ.', 'Một cảnh thao tác được nối với cận cảnh kết quả, giúp người xem hiểu quan hệ trước sau.', 'Dựng đoạn 30 giây từ năm clip, giải thích lý do của ba điểm cắt chính.'),
    topic('Âm thanh và xuất bản', 'Âm thanh cần nhất quán giữa các clip và không vượt ngưỡng gây méo. Kiểm tra file xuất theo preset phù hợp với nền tảng đích.', 'Giảm âm lượng nhạc dưới lời nói, làm mềm đầu cuối bằng fade và xuất H.264 cho web.', 'Xuất video, nghe bằng tai nghe và loa điện thoại; ghi lại lỗi cần chỉnh.'),
  ]),
  course('edit-video', 2, 'Kể chuyện bằng dựng phim', [
    topic('Cấu trúc và thông tin', 'Dựng phim kiểm soát thời điểm khán giả nhận thông tin. Xác định nhân vật, mục tiêu và thay đổi để chọn cảnh có vai trò trong câu chuyện.', 'Video về thợ làm bánh bắt đầu bằng thử thách, theo quá trình thử nghiệm và kết bằng mẻ bánh hoàn thiện.', 'Viết cấu trúc ba phần và chọn một cảnh bắt buộc cho từng phần.'),
    topic('Liên tục và nhịp điệu', 'Hướng nhìn, chuyển động và âm thanh giúp nối cảnh liền mạch. Thay đổi độ dài cảnh có chủ đích để điều tiết nhịp.', 'Cắt theo động tác mở cửa tạo liên tục; giữ lâu hơn ở phản ứng nhân vật giúp nhấn cảm xúc.', 'Dựng hai phiên bản cùng footage với nhịp nhanh và chậm; mô tả cảm nhận khác nhau.'),
    topic('J-cut, L-cut và phản hồi', 'J-cut cho âm thanh cảnh sau vào trước hình; L-cut giữ âm thanh cảnh trước khi hình đã chuyển. Dùng để dẫn dắt thông tin tự nhiên.', 'Lời phỏng vấn tiếp tục trên cảnh công việc minh họa, giúp giảm cảm giác nói liên tục trước máy quay.', 'Dựng đoạn phỏng vấn có hai L-cut và một J-cut; nhờ người xem tóm tắt câu chuyện.'),
  ]),
  course('edit-video', 3, 'Chỉnh màu với DaVinci Resolve', [
    topic('Quản lý màu và cân bằng đầu vào', 'Xác định không gian màu nguồn và đầu ra trước khi chỉnh. Cân bằng phơi sáng và trắng giúp các cảnh có nền tảng nhất quán.', 'Footage log cần biến đổi phù hợp sang không gian làm việc; tránh áp hai lần cùng một chuyển đổi màu.', 'Thiết lập color management cho dự án mẫu và ghi rõ không gian màu của từng nguồn.'),
    topic('Node và điều chỉnh chọn lọc', 'Node chia các bước chỉnh màu có thể kiểm soát. Qualifier và power window cô lập vùng, nhưng cần theo dõi chuyển động và mép chọn.', 'Tách node cân bằng, tương phản, màu da và look; kiểm tra vùng chọn khi nhân vật di chuyển.', 'Tạo cây node bốn bước và điều chỉnh một vùng chọn mà không làm ảnh hưởng nền.'),
    topic('Scopes và khớp cảnh', 'Waveform hỗ trợ kiểm tra độ sáng; vectorscope hỗ trợ phân bố màu. So sánh nhiều cảnh cùng lúc để giữ tính nhất quán của toàn chuỗi.', 'Hai cảnh cùng không gian cần khớp cảm nhận về nhiệt độ màu và độ sáng trước khi áp phong cách chung.', 'Khớp ba cảnh quay khác ánh sáng, kiểm tra clipping và xuất bản theo chuẩn đầu ra đã chọn.'),
  ]),
  course('tiktok', 0, 'Xây dựng kênh từ đầu', [
    topic('Chủ đề và người xem', 'Kênh rõ định hướng giúp người xem biết sẽ nhận được gì. Chọn một nhóm người xem và một vấn đề bạn có thể giải thích thường xuyên.', 'Kênh mẹo Excel cho người mới đi làm tập trung vào thao tác tiết kiệm thời gian trong công việc.', 'Viết lời giới thiệu kênh một câu và danh sách mười vấn đề của người xem.'),
    topic('Định dạng nội dung đầu tiên', 'Một định dạng lặp lại giúp sản xuất đều đặn. Mỗi video nên có một ý chính, ví dụ cụ thể và kết thúc trọn vẹn.', 'Định dạng một lỗi thường gặp, cách sửa và kết quả trước sau có thể áp dụng cho nhiều chủ đề.', 'Viết kịch bản ba video cùng định dạng, mỗi video dài khoảng 30 giây.'),
    topic('Lịch đăng và học từ dữ liệu', 'Lịch đăng cần phù hợp khả năng sản xuất. Quan sát thời gian xem và phản hồi để cải tiến nội dung thay vì chỉ đếm lượt xem.', 'Video có nhiều lượt thoát đầu cần xem lại mở đầu; câu hỏi lặp trong bình luận gợi ý chủ đề tiếp theo.', 'Lập lịch hai tuần và mẫu ghi nhận nội dung, thời gian xem và câu hỏi người xem.'),
  ]),
  course('tiktok', 1, 'Quay video ngắn bằng điện thoại', [
    topic('Khung hình và ánh sáng', 'Đặt máy ổn định, làm sạch ống kính và chọn ánh sáng giúp chủ thể rõ. Khung dọc cần chừa vùng cho chữ và giao diện nền tảng.', 'Quay cạnh cửa sổ, đặt máy ngang tầm mắt và tránh nguồn sáng mạnh ngay phía sau chủ thể.', 'Quay cùng một cảnh ở hai hướng sáng, so sánh khuôn mặt và chi tiết nền.'),
    topic('Âm thanh và cảnh bổ trợ', 'Lời nói dễ nghe quan trọng với video hướng dẫn. Quay thêm cận cảnh thao tác để minh họa những gì người xem cần làm.', 'Đoạn giới thiệu sản phẩm gồm toàn cảnh, cận chi tiết và cảnh sử dụng; kiểm tra tiếng ồn trước khi quay chính.', 'Lập shot list năm cảnh và quay thử âm thanh mười giây tại địa điểm thực tế.'),
    topic('Quy trình quay gọn', 'Chuẩn bị kịch bản và đạo cụ trước khi bấm máy. Quay nhiều cảnh cùng góc giúp giảm thời gian thiết lập và giữ ánh sáng đồng nhất.', 'Quay toàn bộ lời dẫn trước, sau đó quay các cảnh tay thao tác để chèn khi dựng.', 'Hoàn thành video 30 giây từ shot list, kiểm tra độ ổn định, ánh sáng và âm thanh.'),
  ]),
  course('tiktok', 2, 'Xây dựng chuỗi nội dung', [
    topic('Trụ cột nội dung', 'Trụ cột là nhóm giá trị lặp lại cho cùng đối tượng. Mỗi nhóm cần đủ ý tưởng và có liên hệ với mục tiêu của kênh.', 'Kênh làm bánh có ba trụ cột: kỹ thuật, sửa lỗi và hậu trường; mỗi trụ cột có nhiều tập độc lập.', 'Tạo ba trụ cột, mỗi trụ cột năm ý tưởng và một định dạng dễ nhận biết.'),
    topic('Kịch bản theo series', 'Mỗi tập phải hữu ích khi xem riêng nhưng có lý do dẫn sang tập khác. Dùng cách đặt tên và cấu trúc nhất quán để người xem nhận diện.', 'Series ba bước sửa lỗi Excel đánh số tập, nhắc vấn đề và dẫn tới bài tiếp theo có liên quan.', 'Viết outline năm tập; chỉ ra giá trị độc lập và mối liên hệ giữa các tập.'),
    topic('Sản xuất theo lô và đánh giá', 'Sản xuất theo lô gom các công việc tương tự: viết, quay và dựng. Đánh giá theo nhóm nội dung để biết series nào giữ chân tốt.', 'Một buổi quay hoàn thành bốn phần lời dẫn; dựng sau bằng cùng bộ phụ đề và quy chuẩn hình ảnh.', 'Lập lịch sản xuất một tháng, dự trù thời gian và chọn hai chỉ số đánh giá series.'),
  ]),
  course('tiktok', 3, 'Phân tích và tối ưu tăng trưởng kênh', [
    topic('Phễu người xem và chất lượng tương tác', 'Phân tích từ tiếp cận đến thời gian xem, theo dõi và hành động mục tiêu. Các chỉ số cần cùng định nghĩa và cùng khoảng thời gian.', 'Một video có ít lượt xem hơn nhưng nhiều lượt lưu và đăng ký phù hợp có thể đóng góp tốt hơn cho mục tiêu.', 'Xây bảng theo dõi mười video với lượt xem, thời gian xem, lượt lưu và người theo dõi mới.'),
    topic('Thử nghiệm mở đầu và định dạng', 'Đặt giả thuyết trước khi thử nghiệm và thay đổi ít yếu tố. So sánh nhóm video tương đồng, ghi nhận ảnh hưởng của chủ đề và thời điểm.', 'Thử mở đầu bằng kết quả so với câu hỏi trên các video cùng chủ đề và độ dài tương tự.', 'Thiết kế thử nghiệm bốn tuần, nêu biến thay đổi, chỉ số và các yếu tố gây nhiễu.'),
    topic('Tối ưu dựa trên bằng chứng', 'Dữ liệu quan sát không tự chứng minh quan hệ nhân quả. Kết hợp chỉ số với nội dung bình luận và năng lực sản xuất khi quyết định mở rộng.', 'Series giữ chân tốt nhưng tốn gấp ba thời gian cần xét hiệu quả trên mỗi giờ sản xuất.', 'Xếp hạng ba series theo giá trị cho người xem và chi phí sản xuất; đề xuất bước tiếp theo.'),
  ]),
  course('phong-thuy', 0, 'Nhập môn phong thủy truyền thống', [
    topic('Bối cảnh văn hóa và khái niệm', 'Phong thủy là hệ quan niệm truyền thống về cách tổ chức không gian. Tìm hiểu ý nghĩa văn hóa và phân biệt diễn giải biểu tượng với yếu tố đo được.', 'Ánh sáng và thông gió có thể quan sát thực tế; cách gán ý nghĩa cho phương hướng thuộc hệ diễn giải truyền thống.', 'Lập hai cột: yếu tố quan sát được trong phòng và cách diễn giải văn hóa tương ứng.'),
    topic('Quan sát không gian sống', 'Bắt đầu bằng sơ đồ phòng, cửa, cửa sổ và lối đi. Ghi nhận ánh sáng, tiếng ồn và thói quen sử dụng trước khi đề xuất bố trí.', 'Bàn chắn lối đi gây bất tiện rõ ràng; chuyển bàn giúp giao thông trong phòng dễ hơn.', 'Vẽ sơ đồ một phòng và đánh dấu ba vị trí gây vướng hoặc thiếu sáng.'),
    topic('Bố trí theo nhu cầu sử dụng', 'Ưu tiên công năng, sự thoải mái và khả năng thực hiện. Có thể tham khảo biểu tượng truyền thống như một lựa chọn thẩm mỹ, phù hợp sở thích cá nhân.', 'Sắp xếp cây và đồ trang trí để dễ chăm sóc, không che ánh sáng hoặc cản lối đi.', 'Đề xuất hai thay đổi nhỏ, nêu lợi ích thực tế và cách đánh giá sau một tuần.'),
  ]),
  course('phong-thuy', 1, 'Bố trí góc làm việc', [
    topic('Nhu cầu và vị trí bàn', 'Góc làm việc cần phù hợp tác vụ, thiết bị và không gian. Chọn vị trí thuận tiện cho ánh sáng, nguồn điện và lối đi.', 'Đặt màn hình tránh phản chiếu trực tiếp từ cửa sổ; giữ khu vực ngồi có khoảng di chuyển thoải mái.', 'Đo góc làm việc, liệt kê thiết bị và vẽ hai phương án vị trí bàn.'),
    topic('Ánh sáng, màu và đồ dùng', 'Ánh sáng cần đủ cho công việc và tránh chói. Màu sắc và trang trí tạo cảm nhận cá nhân, nên chọn dựa trên sở thích và điều kiện phòng.', 'Kết hợp ánh sáng chung với đèn bàn, giữ đồ dùng thường xuyên trong tầm với.', 'Sắp xếp lại mặt bàn thành vùng làm việc, lưu trữ và trang trí; chụp ảnh trước sau.'),
    topic('Đánh giá sau thay đổi', 'Thử bố trí trong thực tế rồi ghi nhận độ tiện dụng. Thói quen giữ gọn và điều chỉnh nhỏ thường có giá trị hơn thay nhiều đồ cùng lúc.', 'Sau một tuần, đánh giá có bị chói màn hình, thiếu chỗ đặt tài liệu hoặc vướng dây điện hay không.', 'Tạo bảng theo dõi năm ngày về ánh sáng, sự tiện dụng và điều cần điều chỉnh.'),
  ]),
  course('phong-thuy', 2, 'Phân tích bố cục nhà ở', [
    topic('Đọc mặt bằng và phân khu', 'Mặt bằng cho thấy quan hệ giữa các khu chức năng. Xác định khu sinh hoạt chung, nghỉ ngơi và phục vụ theo nhu cầu của người ở.', 'Lối từ cửa vào phòng khách nên rõ; khu ngủ cần xem xét tiếng ồn và mức riêng tư.', 'Đánh dấu ba nhóm chức năng trên mặt bằng giả định và chỉ ra vùng chồng chéo.'),
    topic('Luồng di chuyển và thông thoáng', 'Phân tích đường đi thường xuyên để giảm giao cắt bất tiện. Cửa mở, đồ nội thất và ánh sáng tự nhiên cần được xem cùng nhau.', 'Một tủ lớn gần cửa có thể giảm bề rộng lối đi và che sáng; đổi vị trí tạo không gian thông thoáng hơn.', 'Vẽ ba đường di chuyển trong ngày, tìm điểm nghẽn và đề xuất cách bố trí lại.'),
    topic('So sánh phương án theo tiêu chí', 'Chấm phương án bằng tiêu chí công năng, riêng tư, ánh sáng và chi phí. Những lựa chọn biểu tượng truyền thống cần trình bày như sở thích văn hóa.', 'Phương án A có lối đi tốt hơn nhưng ít lưu trữ; phương án B giữ nhiều tủ nhưng cần điều chỉnh ánh sáng.', 'Lập ma trận so sánh hai phương án và giải thích quyết định bằng nhu cầu của gia đình.'),
  ]),
  course('phong-thuy', 3, 'Thực hành lập phương án bố trí không gian', [
    topic('Brief và ràng buộc dự án', 'Một phương án tốt bắt đầu từ yêu cầu, ngân sách và yếu tố không thể thay đổi. Ghi riêng nhu cầu sử dụng và mong muốn theo truyền thống.', 'Căn hộ giữ nguyên kết cấu, cần thêm góc học và lưu trữ; gia chủ thích màu và vật liệu gợi cảm giác gần thiên nhiên.', 'Viết brief một trang với yêu cầu bắt buộc, ưu tiên và giới hạn chi phí.'),
    topic('Phát triển phương án và kiểm chứng', 'Đề xuất nhiều phương án rồi kiểm tra kích thước, lối đi và ánh sáng. Mô phỏng hoặc bố trí thử giúp phát hiện vấn đề trước khi mua sắm.', 'Dùng băng dính đánh dấu kích thước bàn trên sàn để kiểm tra khoảng mở cửa và đường đi.', 'Phát triển hai phương án, kiểm tra năm kích thước quan trọng và ghi kết quả.'),
    topic('Hồ sơ bàn giao và đánh giá', 'Hồ sơ cần mặt bằng, danh sách đồ, thứ tự thực hiện và tiêu chí nghiệm thu. Ghi rõ lý do thực tế và ý nghĩa văn hóa của từng lựa chọn.', 'Bàn giao sơ đồ bố trí, bảng mua sắm theo ngân sách và lịch đánh giá sau hai tuần sử dụng.', 'Tạo bộ hồ sơ ngắn cho phòng mẫu và trình bày cách đo mức phù hợp sau triển khai.'),
  ]),
  course('shopee', 0, 'Mở gian hàng đầu tiên', [
    topic('Sản phẩm và khách hàng mục tiêu', 'Chọn nhóm sản phẩm có thông tin rõ và khả năng cung ứng phù hợp. Hiểu khách cần gì trước khi xây danh mục và nội dung gian hàng.', 'Cửa hàng đồ học tập tập trung sinh viên, mô tả rõ kích thước, chất liệu và số lượng trong mỗi bộ.', 'Chọn năm sản phẩm, viết lợi ích chính và thông tin khách thường cần hỏi.'),
    topic('Thiết lập thông tin gian hàng', 'Tên, mô tả, ảnh đại diện và chính sách cần nhất quán. Kiểm tra thông tin vận hành trong giao diện nhà bán hàng hiện hành.', 'Chuẩn bị tên cửa hàng, địa chỉ lấy hàng, đầu mối hỗ trợ và quy trình trả lời câu hỏi.', 'Lập danh sách thông tin cần điền và kiểm tra độ nhất quán giữa hồ sơ với trang sản phẩm.'),
    topic('Đăng sản phẩm và kiểm tra', 'Tiêu đề và thuộc tính giúp người mua tìm đúng hàng. Xem thử trang như khách để phát hiện thiếu ảnh, sai biến thể hoặc mô tả không rõ.', 'Một sản phẩm áo có bảng kích thước, màu, chất liệu và ảnh từng biến thể tương ứng.', 'Chuẩn bị một trang sản phẩm hoàn chỉnh và checklist kiểm tra trước khi đăng.'),
  ]),
  course('shopee', 1, 'Viết mô tả và chụp ảnh sản phẩm', [
    topic('Thông tin sản phẩm dễ hiểu', 'Mô tả tốt trả lời sản phẩm là gì, phù hợp ai, có thông số nào và cách dùng. Viết rõ nội dung gói hàng để giảm hiểu nhầm.', 'Bình nước cần dung tích, chất liệu, kích thước, cách vệ sinh và thông tin phụ kiện đi kèm.', 'Viết mô tả một sản phẩm theo năm mục và loại bỏ các tuyên bố chưa có căn cứ.'),
    topic('Ánh sáng và bộ ảnh sản phẩm', 'Bộ ảnh cần thể hiện tổng thể, chi tiết, tỷ lệ kích thước và cách sử dụng. Giữ ánh sáng, màu và góc chụp nhất quán.', 'Ảnh chính nền gọn; ảnh phụ có cận chất liệu, kích thước cạnh vật tham chiếu và cảnh sử dụng.', 'Lập shot list sáu ảnh cho một sản phẩm và chụp thử bằng ánh sáng cửa sổ.'),
    topic('Tối ưu trang và phản hồi', 'Đọc câu hỏi khách để bổ sung thông tin còn thiếu. Kiểm tra ảnh trên màn hình nhỏ và bảo đảm biến thể khớp nội dung mô tả.', 'Nếu khách liên tục hỏi kích thước, thêm sơ đồ đo và đưa thông tin lên vị trí dễ thấy.', 'Rà soát trang sản phẩm theo năm câu hỏi giả định và cập nhật ảnh hoặc mô tả tương ứng.'),
  ]),
  course('shopee', 2, 'Vận hành gian hàng hiệu quả', [
    topic('Tồn kho và biến thể', 'Quản lý tồn kho theo mã và biến thể để giảm bán vượt số lượng. Quy trình nhập, xuất và điều chỉnh cần có dấu vết kiểm tra.', 'Áo cùng mẫu nhưng khác màu, cỡ có mã riêng; mỗi đơn làm giảm đúng tồn của biến thể được mua.', 'Thiết kế bảng tồn kho với mã, biến thể, nhập, xuất và tồn; kiểm tra ba đơn mẫu.'),
    topic('Xử lý đơn và đóng gói', 'Quy trình đơn hàng cần bước kiểm tra sản phẩm, đóng gói, bàn giao và theo dõi. Checklist giúp giảm sai sót khi số đơn tăng.', 'Đối chiếu mã hàng và số lượng trước đóng gói; lưu thông tin bàn giao theo quy trình vận chuyển hiện hành.', 'Viết checklist xử lý đơn và quy trình phản hồi khi phát hiện thiếu hoặc sai sản phẩm.'),
    topic('Chăm sóc và đánh giá vận hành', 'Theo dõi thời gian phản hồi, lỗi đơn và nguyên nhân hoàn hàng. Phân loại vấn đề để cải tiến sản phẩm, thông tin hoặc quy trình.', 'Nhiều hoàn hàng do sai cỡ gợi ý cần cải thiện bảng kích thước và bước tư vấn.', 'Lập báo cáo tuần với ba chỉ số vận hành và một hành động cải tiến có người phụ trách.'),
  ]),
  course('shopee', 3, 'Phân tích dữ liệu và tối ưu quảng cáo', [
    topic('Lợi nhuận theo đơn hàng', 'Doanh thu không bằng lợi nhuận. Tính giá vốn, phí, khuyến mãi, đóng gói và chi phí quảng cáo để hiểu biên đóng góp.', 'Đơn 200000 đồng trừ giá vốn 110000, phí và vận hành 30000 còn 60000 trước quảng cáo.', 'Lập bảng lợi nhuận cho ba sản phẩm và tính ngân sách quảng cáo tối đa theo giả định.'),
    topic('Phễu quảng cáo và chuyển đổi', 'Tách hiệu quả thành hiển thị, nhấp, đơn và giá trị đơn. CTR thấp và chuyển đổi thấp cần các cách xử lý khác nhau.', 'Nhiều nhấp nhưng ít đơn có thể liên quan giá, nội dung hoặc độ tin cậy của trang sản phẩm.', 'Phân tích hai chiến dịch mẫu, tính CTR, tỷ lệ chuyển đổi và chi phí mỗi đơn.'),
    topic('Tối ưu ngân sách có kiểm soát', 'Tăng ngân sách theo hiệu quả sau chi phí và kiểm tra khả năng tồn kho. Thử thay đổi từng yếu tố để nhận biết nguyên nhân kết quả.', 'Một sản phẩm ROAS cao nhưng biên lợi nhuận thấp có thể kém hiệu quả hơn sản phẩm ROAS thấp với biên tốt.', 'Đề xuất kế hoạch thử nghiệm hai tuần, ngưỡng đánh giá và phương án khi lợi nhuận giảm.'),
  ]),
  course('yoga', 0, 'Làm quen với Yoga', [
    topic('Không gian và nhận biết cơ thể', 'Bắt đầu trên bề mặt ổn định, có khoảng trống và nhịp tập dễ chịu. Quan sát hơi thở và cảm giác cơ thể trước khi tăng biên độ.', 'Ngồi thoải mái trong một phút, thả lỏng vai và nhận biết nhịp thở tự nhiên mà không cố giữ hơi.', 'Chuẩn bị góc tập và ghi nhận cảm giác trước, sau một phút ngồi yên.'),
    topic('Tư thế nền tảng nhẹ nhàng', 'Tư thế nền tảng tập trung vào sự ổn định và kiểm soát. Chọn biên độ phù hợp, chuyển động chậm và dừng khi xuất hiện đau.', 'Đứng vững, phân bố trọng lượng đều hai chân và thả lỏng vai để quan sát tư thế đứng tự nhiên.', 'Thực hành đứng vững và ngồi thoải mái; ghi lại điểm căng và điều chỉnh nhỏ giúp dễ chịu hơn.'),
    topic('Xây dựng thói quen ngắn', 'Một buổi tập ngắn gồm khởi động, vài chuyển động nhẹ và thư giãn. Tính đều đặn và khả năng lắng nghe cơ thể quan trọng hơn độ khó.', 'Lịch mười phút gồm hai phút quan sát hơi thở, năm phút chuyển động nhẹ và ba phút nghỉ.', 'Lập lịch ba buổi trong tuần và nhật ký về thời lượng, mức thoải mái và cảm nhận.'),
  ]),
  course('yoga', 1, 'Hơi thở và tư thế nền tảng', [
    topic('Quan sát hơi thở tự nhiên', 'Hơi thở là điểm chú ý trong thực hành. Bắt đầu bằng nhịp tự nhiên, không ép sâu hoặc nín thở; giữ vai và hàm thư giãn.', 'Đặt tay lên bụng để nhận biết chuyển động khi hít vào, thở ra nhẹ nhàng trong tư thế ngồi thoải mái.', 'Quan sát mười nhịp thở và ghi nhận khi tâm trí xao nhãng, rồi đưa chú ý trở lại.'),
    topic('Căn chỉnh theo cảm nhận', 'Căn chỉnh giúp phân bố lực phù hợp trong tư thế. Dùng điểm tựa hoặc giảm biên độ khi cần để giữ sự ổn định và hơi thở đều.', 'Trong tư thế đứng, đầu gối mềm, vai thả lỏng; chọn khoảng cách chân tạo cảm giác vững.', 'So sánh hai cách đặt chân khi đứng, chọn cách ổn định và giải thích cảm nhận.'),
    topic('Kết hợp thở và chuyển động', 'Ghép chuyển động chậm với hơi thở giúp duy trì chú ý. Giữ nhịp tự nhiên; nếu khó thở, giảm tốc độ hoặc nghỉ.', 'Nâng tay trong biên độ thoải mái khi hít vào, hạ tay khi thở ra; tránh nâng vai quá mức.', 'Thiết kế chuỗi ba chuyển động đơn giản và ghi thời điểm nghỉ giữa các lượt.'),
  ]),
  course('yoga', 2, 'Chuỗi Yoga tăng sức bền', [
    topic('Cường độ và tiến triển', 'Sức bền được xây dần bằng thời lượng và số lượt phù hợp. Chỉ tăng một yếu tố mỗi lần để quan sát khả năng phục hồi.', 'Giữ cùng chuỗi động tác, tăng nhẹ số lượt ở buổi sau nếu vẫn kiểm soát hơi thở và tư thế.', 'Lập kế hoạch hai tuần, ghi thời lượng, số lượt và ngày nghỉ để theo dõi tiến triển.'),
    topic('Chuyển tiếp và phân bố tải', 'Chuỗi tập cần chuyển tiếp có kiểm soát và phân bố tải giữa các vùng cơ thể. Xen kẽ tư thế giúp tránh dồn sức liên tục vào một vùng.', 'Sau nhóm động tác đứng, thêm giai đoạn nhẹ hơn trước khi tiếp tục chuỗi; điều chỉnh theo mức mệt.', 'Phác thảo chuỗi gồm khởi động, hai nhóm vận động và nghỉ; giải thích thứ tự.'),
    topic('Đánh giá buổi tập', 'Đánh giá chất lượng bằng kiểm soát, hơi thở và khả năng phục hồi. Giảm cường độ khi kỹ thuật suy giảm thay vì cố hoàn thành số lượt.', 'Nhật ký ghi mức mệt tự cảm nhận và tình trạng ngày hôm sau để điều chỉnh buổi kế tiếp.', 'Tạo nhật ký ba buổi và quyết định giữ, tăng nhẹ hoặc giảm thời lượng dựa trên ghi nhận.'),
  ]),
  course('yoga', 3, 'Xây dựng chuỗi Vinyasa nâng cao', [
    topic('Mục tiêu và cấu trúc chuỗi', 'Chuỗi nâng cao cần mục tiêu rõ, bước chuẩn bị và phương án điều chỉnh. Độ phức tạp đến từ chất lượng kết nối, không chỉ tư thế khó.', 'Một chuỗi tập trung thăng bằng có khởi động cổ chân, hông, các bước chuyển và giai đoạn hạ nhịp.', 'Thiết kế cấu trúc năm phần cho chuỗi 20 phút, nêu mục tiêu và thời lượng từng phần.'),
    topic('Chuyển tiếp và phương án thay thế', 'Mỗi chuyển tiếp cần điểm tựa rõ và khả năng kiểm soát. Chuẩn bị biến thể nhẹ hơn để người tập giữ nhịp thở và tránh cố vượt khả năng.', 'Khi chuyển tiếp gây mất ổn định, giảm biên độ, thêm điểm tựa hoặc thay bằng bước chuyển đơn giản.', 'Chọn ba chuyển tiếp và mô tả biến thể giảm tải, điều kiện áp dụng cùng điểm quan sát.'),
    topic('Dẫn nhịp và phản hồi', 'Hướng dẫn chuỗi cần ngắn, đúng thời điểm và có khoảng cho người tập quan sát. Đánh giá qua sự ổn định, nhịp thở và phản hồi sau buổi.', 'Đưa chỉ dẫn điểm đặt chân trước chuyển động, sau đó để khoảng yên cho người tập tự điều chỉnh.', 'Viết lời dẫn cho chuỗi đã thiết kế, bổ sung điểm nghỉ và mẫu thu thập phản hồi.'),
  ]),
];
