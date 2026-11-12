import 'reflect-metadata';
import fs from 'node:fs';
import path from 'node:path';
import mongoose, { Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { RoleEnum, UserStatusEnum, ReviewStatusEnum, CourseStatusEnum, CourseLevelEnum } from 'share-lib';

// Parse .env manually
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const value = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
} catch {
  // Ignore
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/thc_datn';

interface SeedReviewDef {
  studentIndex: number;
  courseIndex: number;
  rating: number;
  comment: string;
  status: ReviewStatusEnum;
  hideReason?: string | null;
  moderationHistory?: Array<{
    action: 'HIDE' | 'RESTORE' | 'DELETE';
    adminId: Types.ObjectId;
    adminName: string;
    reason: string;
    createdAt: Date;
  }>;
  reports?: Array<{
    userId: Types.ObjectId;
    userName: string;
    reason: string;
    createdAt: Date;
  }>;
  reportCount?: number;
  isDeleted?: boolean;
}

async function run() {
  console.log('🔄 Connecting to MongoDB at:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection failed');
  }

  const usersCol = db.collection('users');
  const coursesCol = db.collection('courses');
  const enrollmentsCol = db.collection('enrollments');
  const reviewsCol = db.collection('reviews');

  console.log('--- BƯỚC 1: XÁC THỰC VÀ TẠO NGƯỜI DÙNG & HỌC VIÊN ---');

  // 1. Tìm hoặc tạo Admin
  let adminUser = await usersCol.findOne({ role: RoleEnum.ADMIN });
  if (!adminUser) {
    const passwordHash = await bcrypt.hash('Password123@', 10);
    const adminRes = await usersCol.insertOne({
      email: 'sseu1804@gmail.com',
      username: 'admin',
      fullName: 'CUONG TRINH',
      role: RoleEnum.ADMIN,
      status: UserStatusEnum.ACTIVE,
      isEmailVerified: true,
      bio: 'Quản trị viên hệ thống Mindly',
      avatarUrl: null,
      passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    adminUser = await usersCol.findOne({ _id: adminRes.insertedId });
  }
  console.log(`✅ Admin xác định: ${adminUser?.fullName} (${adminUser?.email}) [ID: ${adminUser?._id}]`);

  // 2. Tìm hoặc tạo Giảng viên
  let instructorUser = await usersCol.findOne({ role: RoleEnum.INSTRUCTOR });
  if (!instructorUser) {
    const passwordHash = await bcrypt.hash('Password123@', 10);
    const insRes = await usersCol.insertOne({
      email: 'instructor1@thc.edu.vn',
      username: 'instructor1',
      fullName: 'TS. Nguyễn Văn Hùng',
      role: RoleEnum.INSTRUCTOR,
      status: UserStatusEnum.ACTIVE,
      isEmailVerified: true,
      bio: 'Tiến sĩ Khoa học Máy tính, chuyên gia Trí tuệ Nhân tạo.',
      avatarUrl: null,
      passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    instructorUser = await usersCol.findOne({ _id: insRes.insertedId });
  }
  console.log(`✅ Giảng viên xác định: ${instructorUser?.fullName}`);

  // 3. Danh sách học viên thực tế
  const studentProfiles = [
    { email: 'student1@thc.edu.vn', username: 'student1', fullName: 'Phạm Minh Quân', avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80' },
    { email: 'student2@thc.edu.vn', username: 'student2', fullName: 'Lê Thùy Dung', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80' },
    { email: 'student3@thc.edu.vn', username: 'student3', fullName: 'Đỗ Hoàng Khang', avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80' },
    { email: 'student4@thc.edu.vn', username: 'student4', fullName: 'Hoàng Văn Nam', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80' },
    { email: 'student5@thc.edu.vn', username: 'student5', fullName: 'Nguyễn Ngọc Ánh', avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&auto=format&fit=crop&q=80' },
    { email: 'student6@thc.edu.vn', username: 'student6', fullName: 'Vũ Minh Đức', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80' },
    { email: 'student7@thc.edu.vn', username: 'student7', fullName: 'Lê Thu Trang', avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80' },
    { email: 'student8@thc.edu.vn', username: 'student8', fullName: 'Trần Quốc Bảo', avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120&auto=format&fit=crop&q=80' },
  ];

  const studentUsers: Array<{ _id: Types.ObjectId; fullName: string; email: string }> = [];

  for (const prof of studentProfiles) {
    let student = await usersCol.findOne({ email: prof.email });
    if (!student) {
      const passwordHash = await bcrypt.hash('Password123@', 10);
      const res = await usersCol.insertOne({
        email: prof.email,
        username: prof.username,
        fullName: prof.fullName,
        role: RoleEnum.STUDENT,
        status: UserStatusEnum.ACTIVE,
        isEmailVerified: true,
        avatarUrl: prof.avatarUrl,
        passwordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      student = await usersCol.findOne({ _id: res.insertedId });
    } else if (!student.avatarUrl && prof.avatarUrl) {
      await usersCol.updateOne({ _id: student._id }, { $set: { avatarUrl: prof.avatarUrl } });
    }
    if (student) {
      studentUsers.push({
        _id: student._id as Types.ObjectId,
        fullName: student.fullName,
        email: student.email,
      });
    }
  }
  console.log(`✅ Đã chuẩn bị ${studentUsers.length} học viên.`);

  console.log('--- BƯỚC 2: XÁC THỰC VÀ TẠO KHÓA HỌC THỰC TẾ ---');
  let courses = await coursesCol.find({ deletedAt: null }).toArray();

  if (courses.length === 0) {
    console.log('Chưa có khóa học nào. Đang tạo 3 khóa học mẫu chuẩn...');
    const sampleCourses = [
      {
        title: 'Lập trình Fullstack Next.js 14, NestJS & MongoDB',
        slug: 'lap-trinh-fullstack-nextjs-14-nestjs-mongodb',
        description: 'Xây dựng ứng dụng hoàn chỉnh từ giao diện App Router đến RESTful API bảo mật cao.',
        instructorId: instructorUser?._id,
        status: CourseStatusEnum.PUBLISHED,
        level: CourseLevelEnum.INTERMEDIATE,
        price: 799000,
        thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600&auto=format&fit=crop&q=80',
        ratingAvg: 0,
        reviewCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title: 'Trí Tuệ Nhân Tạo & Video Interactive Quiz với Gemini AI',
        slug: 'tri-tue-nhan-tao-video-interactive-quiz-gemini-ai',
        description: 'Khám phá quy trình AI phân tích âm thanh AssemblyAI và sinh câu hỏi tương tác tự động.',
        instructorId: instructorUser?._id,
        status: CourseStatusEnum.PUBLISHED,
        level: CourseLevelEnum.ADVANCED,
        price: 990000,
        thumbnail: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&auto=format&fit=crop&q=80',
        ratingAvg: 0,
        reviewCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title: 'Thiết Kế UI/UX Chuyên Nghiệp & Hệ Thống Thiết Kế (Design System)',
        slug: 'thiet-ke-ui-ux-chuyen-nghiep-design-system',
        description: 'Làm chủ Figma, Tailwind CSS và nguyên lý thiết kế giao diện hiện đại không rườm rà.',
        instructorId: instructorUser?._id,
        status: CourseStatusEnum.PUBLISHED,
        level: CourseLevelEnum.BEGINNER,
        price: 499000,
        thumbnail: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=600&auto=format&fit=crop&q=80',
        ratingAvg: 0,
        reviewCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    await coursesCol.insertMany(sampleCourses);
    courses = await coursesCol.find({ deletedAt: null }).toArray();
  }

  console.log(`✅ Khóa học sẵn sàng: ${courses.length} khóa học:`);
  courses.forEach((c, idx) => console.log(`   ${idx + 1}. [${c._id}] ${c.title}`));

  console.log('--- BƯỚC 3: ĐỒNG NHẤT VÀ TẠO BẢN GHI ĐÁNH GIÁ (REVIEWS) ---');

  // Xóa sạch reviews cũ để đảm bảo dữ liệu đồng nhất, chuẩn xác từ gốc
  await reviewsCol.deleteMany({});
  console.log('🧹 Đã dọn dẹp các review cũ.');

  const adminIdObj = adminUser?._id as Types.ObjectId;
  const adminNameStr = adminUser?.fullName || 'CUONG TRINH';

  // Định nghĩa các trường hợp đánh giá đa dạng:
  // - Điểm sao 1 -> 5
  // - Trạng thái: visible, hidden, deleted
  // - Báo cáo vi phạm (reports)
  // - Lịch sử kiểm duyệt (moderationHistory)
  const seedReviewDefs: SeedReviewDef[] = [
    // === Khóa 1: Lập trình Fullstack Next.js ===
    {
      studentIndex: 0, // Phạm Minh Quân
      courseIndex: 0,
      rating: 5,
      comment: 'Khóa học cực kỳ chi tiết, giảng viên giải thích logic rất sâu sắc. Phần làm bài tập quiz tương tác trực tiếp trên video giúp mình nắm vững kiến thức ngay trong lúc học!',
      status: ReviewStatusEnum.VISIBLE,
    },
    {
      studentIndex: 1, // Lê Thùy Dung
      courseIndex: 0,
      rating: 4,
      comment: 'Nội dung rất hay và thực tế, áp dụng được ngay vào dự án ở công ty. Giá như có thêm phần demo triển khai CI/CD nâng cao thì hoàn hảo hơn nữa.',
      status: ReviewStatusEnum.VISIBLE,
    },
    {
      studentIndex: 2, // Đỗ Hoàng Khang
      courseIndex: 0,
      rating: 5,
      comment: 'Giảng viên nhiệt tình hỗ trợ, sơ đồ tư duy Mindmap sau mỗi bài học tóm tắt cực kỳ trực quan, dễ ôn tập. Rất đáng đồng tiền bát gạo!',
      status: ReviewStatusEnum.VISIBLE,
    },
    {
      studentIndex: 3, // Hoàng Văn Nam - Bị Admin Ẩn do vi phạm
      courseIndex: 0,
      rating: 1,
      comment: 'Khóa học dở tệ, mời mọi người qua nhóm Zalo 0909xxxxxx để nhận tài liệu miễn phí xịn hơn nhiều lừa đảo nhé.',
      status: ReviewStatusEnum.HIDDEN,
      hideReason: 'Nội dung chứa liên kết nhóm Zalo ngoài hệ thống và ngôn từ spam quảng cáo trái phép.',
      moderationHistory: [
        {
          action: 'HIDE',
          adminId: adminIdObj,
          adminName: adminNameStr,
          reason: 'Nội dung chứa liên kết nhóm Zalo ngoài hệ thống và ngôn từ spam quảng cáo trái phép.',
          createdAt: new Date(Date.now() - 3600 * 1000 * 12),
        },
      ],
    },
    {
      studentIndex: 4, // Nguyễn Ngọc Ánh - Từng bị ẩn rồi được khôi phục
      courseIndex: 0,
      rating: 5,
      comment: 'Video chất lượng cao, bài giảng súc tích. Tuy có một số thuật ngữ tiếng Anh hơi khó hiểu ban đầu nhưng tra cứu thêm thì thấy rất chuẩn xác!',
      status: ReviewStatusEnum.VISIBLE,
      moderationHistory: [
        {
          action: 'HIDE',
          adminId: adminIdObj,
          adminName: adminNameStr,
          reason: 'Nghi vấn đánh giá tự động từ tài khoản mới tạo',
          createdAt: new Date(Date.now() - 86400 * 1000 * 2),
        },
        {
          action: 'RESTORE',
          adminId: adminIdObj,
          adminName: adminNameStr,
          reason: 'Đã xác minh học viên thật hoàn thành hơn 60% khóa học và có tiến độ học tập liên tục',
          createdAt: new Date(Date.now() - 86400 * 1000 * 1),
        },
      ],
    },
    {
      studentIndex: 5, // Vũ Minh Đức - Bị người dùng báo cáo vi phạm (Reported)
      courseIndex: 0,
      rating: 3,
      comment: 'Giảng viên nói hơi buồn ngủ, slide bài giảng quá nhiều chữ và link tải tài nguyên ở bài 4 bị hỏng ai cần file inbox telegram @ducvu.',
      status: ReviewStatusEnum.VISIBLE,
      reportCount: 2,
      reports: [
        {
          userId: studentUsers[1]._id,
          userName: studentUsers[1].fullName,
          reason: 'Chia sẻ thông tin liên hệ cá nhân bên ngoài và nghi vấn link tải không an toàn',
          createdAt: new Date(Date.now() - 3600 * 1000 * 6),
        },
        {
          userId: studentUsers[0]._id,
          userName: studentUsers[0].fullName,
          reason: 'Spam thông tin liên lạc ngoài nền tảng',
          createdAt: new Date(Date.now() - 3600 * 1000 * 3),
        },
      ],
    },
    {
      studentIndex: 6, // Lê Thu Trang - Đã bị Admin xóa mềm
      courseIndex: 0,
      rating: 2,
      comment: 'Đánh giá mang tính công kích bôi nhọ cá nhân giảng viên nghiêm trọng.',
      status: ReviewStatusEnum.DELETED,
      isDeleted: true,
      moderationHistory: [
        {
          action: 'DELETE',
          adminId: adminIdObj,
          adminName: adminNameStr,
          reason: 'Admin xóa mềm do sử dụng ngôn từ bôi nhọ cá nhân vi phạm điều khoản dịch vụ.',
          createdAt: new Date(Date.now() - 3600 * 1000 * 24),
        },
      ],
    },

    // === Khóa 2: Trí Tuệ Nhân Tạo & Video Interactive Quiz ===
    {
      studentIndex: 0, // Phạm Minh Quân
      courseIndex: 1,
      rating: 5,
      comment: 'Ý tưởng video tương tác dừng lại hỏi bài thông minh thực sự mở ra cách học mới. Rất ấn tượng với phần tích hợp Gemini API!',
      status: ReviewStatusEnum.VISIBLE,
    },
    {
      studentIndex: 2, // Đỗ Hoàng Khang
      courseIndex: 1,
      rating: 4,
      comment: 'Bài tập thực hành rất hay, hệ thống chạy mượt mà. Đôi khi AssemblyAI nhận diện tiếng Việt có từ chuyên ngành bị lệch nhẹ nhưng chấp nhận được.',
      status: ReviewStatusEnum.VISIBLE,
    },
    {
      studentIndex: 7, // Trần Quốc Bảo
      courseIndex: 1,
      rating: 5,
      comment: 'Khóa học tuyệt đỉnh! Giảng viên hướng dẫn chi tiết từng dòng code backend NestJS xử lý hàng đợi RabbitMQ rất chuyên nghiệp.',
      status: ReviewStatusEnum.VISIBLE,
    },
    {
      studentIndex: 3, // Hoàng Văn Nam - Bị báo cáo spam
      courseIndex: 1,
      rating: 2,
      comment: 'Chán òm, dạy lý thuyết suông. Bán khóa học giá cắt cổ.',
      status: ReviewStatusEnum.VISIBLE,
      reportCount: 1,
      reports: [
        {
          userId: studentUsers[2]._id,
          userName: studentUsers[2].fullName,
          reason: 'Bình luận công kích thiếu căn cứ, học viên chưa học hết bài 1.',
          createdAt: new Date(Date.now() - 3600 * 1000 * 4),
        },
      ],
    },

    // === Khóa 3: Thiết Kế UI/UX Chuyên Nghiệp ===
    {
      studentIndex: 1, // Lê Thùy Dung
      courseIndex: 2,
      rating: 5,
      comment: 'Khóa học dạy tư duy phối màu và typography xuất sắc. Giờ mình đã tự tin xây dựng trọn bộ Design System cho dự án công ty.',
      status: ReviewStatusEnum.VISIBLE,
    },
    {
      studentIndex: 4, // Nguyễn Ngọc Ánh
      courseIndex: 2,
      rating: 4,
      comment: 'Nội dung thực tế, giảng viên chữa bài rất có tâm. Sẽ giới thiệu cho bạn bè cùng học!',
      status: ReviewStatusEnum.VISIBLE,
    },
    {
      studentIndex: 5, // Vũ Minh Đức - Bị Admin Ẩn
      courseIndex: 2,
      rating: 1,
      comment: 'Toàn lý thuyết vớ vẩn, slide lượm trên mạng, khuyên mọi người không nên mua.',
      status: ReviewStatusEnum.HIDDEN,
      hideReason: 'Đánh giá có hành vi phá hoại uy tín giảng viên có tổ chức, ngôn từ thiếu văn hóa.',
      moderationHistory: [
        {
          action: 'HIDE',
          adminId: adminIdObj,
          adminName: adminNameStr,
          reason: 'Đánh giá có hành vi phá hoại uy tín giảng viên có tổ chức, ngôn từ thiếu văn hóa.',
          createdAt: new Date(Date.now() - 3600 * 1000 * 18),
        },
      ],
    },
  ];

  let insertedCount = 0;

  for (const def of seedReviewDefs) {
    const student = studentUsers[def.studentIndex];
    const targetCourse = courses[def.courseIndex];
    if (!student || !targetCourse) continue;

    // 1. Đảm bảo bản ghi Enrollment hợp lệ cho học viên
    const existingEnrollment = await enrollmentsCol.findOne({
      userId: student._id,
      courseId: targetCourse._id,
    });
    if (!existingEnrollment) {
      await enrollmentsCol.insertOne({
        userId: student._id,
        courseId: targetCourse._id,
        enrolledAt: new Date(Date.now() - 86400 * 1000 * 7),
        createdAt: new Date(Date.now() - 86400 * 1000 * 7),
        updatedAt: new Date(Date.now() - 86400 * 1000 * 7),
        deletedAt: null,
      });
    }

    // 2. Tạo bản ghi Review
    const createdAt = new Date(Date.now() - (insertedCount + 1) * 3600 * 1000 * 8);
    const deletedAt = def.isDeleted ? new Date() : null;

    await reviewsCol.insertOne({
      userId: student._id,
      courseId: targetCourse._id,
      rating: def.rating,
      comment: def.comment,
      status: def.status,
      hideReason: def.hideReason || null,
      moderationHistory: def.moderationHistory || [],
      reports: def.reports || [],
      reportCount: def.reportCount || 0,
      createdAt,
      updatedAt: createdAt,
      deletedAt,
      createdById: student._id.toString(),
      updatedById: student._id.toString(),
    });

    insertedCount++;
  }

  console.log(`✅ Đã tạo thành công ${insertedCount} đánh giá thực tế.`);

  console.log('--- BƯỚC 4: TÍNH TOÁN LẠI ĐIỂM TRUNG BÌNH & SỐ LƯỢT ĐÁNH GIÁ KHÓA HỌC ---');

  for (const course of courses) {
    // Chỉ tính đánh giá visible và deletedAt: null
    const visibleReviews = await reviewsCol
      .find({
        courseId: course._id,
        status: ReviewStatusEnum.VISIBLE,
        deletedAt: null,
      })
      .toArray();

    const reviewCount = visibleReviews.length;
    let ratingAvg = 0;

    if (reviewCount > 0) {
      const sum = visibleReviews.reduce((acc, r) => acc + Number(r.rating), 0);
      ratingAvg = Math.round((sum / reviewCount) * 10) / 10;
    }

    await coursesCol.updateOne(
      { _id: course._id },
      {
        $set: {
          ratingAvg,
          reviewCount,
          updatedAt: new Date(),
        },
      },
    );

    console.log(
      `📊 Khóa học "${course.title}": Điểm TB = ${ratingAvg}⭐ | Tổng đánh giá hiển thị = ${reviewCount} lượt`,
    );
  }

  console.log('--- BƯỚC 5: KIỂM TRA THỐNG KÊ TOÀN SÀN TRÊN ADMIN PORTAL ---');
  const totalReviews = await reviewsCol.countDocuments();
  const visibleCount = await reviewsCol.countDocuments({ status: ReviewStatusEnum.VISIBLE, deletedAt: null });
  const hiddenCount = await reviewsCol.countDocuments({ status: ReviewStatusEnum.HIDDEN, deletedAt: null });
  const reportedCount = await reviewsCol.countDocuments({ reportCount: { $gt: 0 }, deletedAt: null });
  const deletedCount = await reviewsCol.countDocuments({ $or: [{ status: ReviewStatusEnum.DELETED }, { deletedAt: { $ne: null } }] });

  console.log(`🎉 HOÀN TẤT ĐỒNG NHẤT DỮ LIỆU ĐÁNH GIÁ THỰC TẾ:`);
  console.log(`   - Tổng số đánh giá: ${totalReviews}`);
  console.log(`   - Đang công khai (Visible): ${visibleCount}`);
  console.log(`   - Đã bị ẩn (Hidden): ${hiddenCount}`);
  console.log(`   - Có báo cáo vi phạm (Reported): ${reportedCount}`);
  console.log(`   - Đã xóa mềm (Deleted): ${deletedCount}`);

  await mongoose.disconnect();
  console.log('🔌 Đã ngắt kết nối database.');
}

run().catch((err) => {
  console.error('❌ Lỗi khi đồng nhất dữ liệu:', err);
  process.exit(1);
});
