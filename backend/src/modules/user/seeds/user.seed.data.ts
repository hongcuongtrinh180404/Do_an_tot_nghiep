import { RoleEnum, UserStatusEnum } from 'share-lib';

export interface IUserSeedItem {
  email: string;
  username: string;
  fullName: string;
  role: RoleEnum;
  status: UserStatusEnum;
  bio?: string;
  avatarUrl?: string | null;
}

export const DEFAULT_SEED_PASSWORD = 'Password123@';

export const USER_SEED_DATA: IUserSeedItem[] = [
  // 1 Admin
  {
    email: 'admin@thc.edu.vn',
    username: 'admin',
    fullName: 'Quản Trị Viên Hệ Thống',
    role: RoleEnum.ADMIN,
    status: UserStatusEnum.ACTIVE,
    bio: 'Quản trị viên cấp cao phụ trách hệ thống đào tạo THC E-Learning.',
    avatarUrl: null,
  },

  // 3 Instructors
  {
    email: 'instructor1@thc.edu.vn',
    username: 'instructor1',
    fullName: 'TS. Nguyễn Văn Hùng',
    role: RoleEnum.INSTRUCTOR,
    status: UserStatusEnum.ACTIVE,
    bio: 'Tiến sĩ Khoa học Máy tính, chuyên gia Trí tuệ Nhân tạo và Machine Learning.',
    avatarUrl: null,
  },
  {
    email: 'instructor2@thc.edu.vn',
    username: 'instructor2',
    fullName: 'ThS. Trần Thị Mai',
    role: RoleEnum.INSTRUCTOR,
    status: UserStatusEnum.ACTIVE,
    bio: 'Thạc sĩ Kỹ thuật Phần mềm, 8 năm kinh nghiệm giảng dạy Web & Cloud Architecture.',
    avatarUrl: null,
  },
  {
    email: 'instructor3@thc.edu.vn',
    username: 'instructor3',
    fullName: 'KTS. Lê Hoàng Nam',
    role: RoleEnum.INSTRUCTOR,
    status: UserStatusEnum.ACTIVE,
    bio: 'Kiến trúc sư giải pháp hệ thống phân tán và bảo mật ứng dụng cấp doanh nghiệp.',
    avatarUrl: null,
  },

  // 3 Students
  {
    email: 'student1@thc.edu.vn',
    username: 'student1',
    fullName: 'Phạm Minh Quân',
    role: RoleEnum.STUDENT,
    status: UserStatusEnum.ACTIVE,
    bio: 'Sinh viên chuyên ngành Công Nghệ Thông Tin đam mê Fullstack Development.',
    avatarUrl: null,
  },
  {
    email: 'student2@thc.edu.vn',
    username: 'student2',
    fullName: 'Lê Thùy Dung',
    role: RoleEnum.STUDENT,
    status: UserStatusEnum.ACTIVE,
    bio: 'Học viên năng động, tích cực tham gia các khóa học lập trình tương tác.',
    avatarUrl: null,
  },
  {
    email: 'student3@thc.edu.vn',
    username: 'student3',
    fullName: 'Đỗ Hoàng Khang',
    role: RoleEnum.STUDENT,
    status: UserStatusEnum.ACTIVE,
    bio: 'Người học chuyển ngành sang lập trình web, mục tiêu trở thành Software Engineer.',
    avatarUrl: null,
  },
];
