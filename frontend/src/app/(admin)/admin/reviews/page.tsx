import type { Metadata } from 'next';
import React from 'react';
import { AdminTabPlaceholder } from '@/features/admin';

export const metadata: Metadata = {
  title: 'Kiểm Duyệt Đánh Giá & Bình Luận | DATN Portal Admin',
  description: 'Giám sát và kiểm duyệt phản hồi, đánh giá khóa học từ học viên',
};

export default function AdminReviewsPage(): React.JSX.Element {
  return (
    <AdminTabPlaceholder
      title="Kiểm duyệt Đánh giá & Bình luận"
      description="Kiểm duyệt phản hồi, đánh giá khóa học và thảo luận cộng đồng của học viên."
      icon="lucide:message-square-check"
      badge="Kiểm duyệt nội dung"
      stats={[
        { label: 'Chờ duyệt', value: '--', hint: 'Cần quản trị viên duyệt', icon: 'lucide:inbox' },
        { label: 'Bình luận hôm nay', value: '--', hint: 'Bài học & video', icon: 'lucide:message-circle' },
        { label: 'Báo cáo vi phạm', value: '--', hint: 'Từ học viên/giảng viên', icon: 'lucide:flag' },
        { label: 'Điểm TB toàn sàn', value: '--', hint: 'Hài lòng dịch vụ', icon: 'lucide:star' },
      ]}
    />
  );
}
