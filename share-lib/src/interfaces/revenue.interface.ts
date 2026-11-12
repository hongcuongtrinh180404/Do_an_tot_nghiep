export interface IRevenueOverviewKpi {
  totalRevenue: number;
  platformCommission: number;
  instructorEarnings: number;
  successfulOrders: number;
}

export interface IRevenueChartItem {
  date: string;
  label: string;
  totalRevenue: number;
  platformCommission: number;
  instructorEarnings: number;
  orderCount: number;
}

export interface IRevenueTransactionItem {
  id: string;
  orderCode: string;
  courseTitle: string;
  studentName: string;
  instructorName: string;
  paidAt: string;
  amount: number;
  paymentMethod?: string;
}

export interface IRevenueTransactionDetail {
  // Nhóm 1: Thông tin đơn hàng
  orderCode: string;
  sepayTransactionId?: string | null;
  createdAt: string;
  paidAt: string | null;
  paymentMethod: string;
  status: string;

  // Nhóm 2: Thông tin học viên
  student: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl?: string | null;
  };

  // Nhóm 3: Thông tin khóa học
  course: {
    id: string;
    title: string;
    thumbnailUrl?: string | null;
    instructorName: string;
    lockedPrice: number;
  };

  // Nhóm 4: Thông tin thanh toán
  amountDue: number;
  amountPaid: number;
  paymentDate: string | null;

  // Nhóm 5: Phân chia doanh thu
  platformCommissionRate: number;
  instructorCommissionRate: number;
  platformEarnings: number;
  instructorEarnings: number;
}

export interface IInstructorRevenueSummary {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  status: string;
  totalCourses: number;
  successfulSales: number;
  totalRevenue: number;
  commissionRate: number;
  lastTransactionDate: string | null;
}

export interface IInstructorRevenueDetail {
  instructor: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl?: string | null;
    status: string;
    createdAt: string;
    commissionRate: number;
    commissionRateUpdatedAt?: string | null;
  };
  kpi: {
    totalRevenue: number;
    instructorEarnings: number;
    totalCourses: number;
    successfulSales: number;
  };
}

export interface IInstructorCourseRevenue {
  id: string;
  title: string;
  status: string;
  price: number;
  thumbnailUrl?: string | null;
  successfulSales: number;
  totalRevenue: number;
}

export interface ICommissionConfig {
  defaultRate: number;
  updatedAt?: string | null;
  updatedById?: string | null;
  updatedByName?: string | null;
}

export interface ICommissionHistoryItem {
  id: string;
  targetType?: 'SYSTEM' | 'INSTRUCTOR';
  instructorId?: string | null;
  oldRate: number;
  newRate: number;
  reason: string;
  createdAt: string;
  adminName: string;
  adminEmail: string;
}

