import type { Metadata } from 'next';
import React from 'react';
import { AdminTabPlaceholder } from '@/features/admin';

export const metadata: Metadata = {
  title: 'Cấu Hình Hệ Thống | DATN Portal Admin',
  description: 'Thiết lập tham số hệ thống, cổng thanh toán SePay, dịch vụ AI và bảo mật nền tảng',
};

export default function AdminSettingsPage(): React.JSX.Element {
  return (
    <AdminTabPlaceholder
      title="Cấu hình Hệ thống"
      description="Thiết lập tham số hệ thống, cổng thanh toán, dịch vụ AI và bảo mật nền tảng."
      icon="lucide:settings-2"
      badge="Cấu hình hệ thống"
      stats={[
        { label: 'Cổng SePay Webhook', value: 'Online', hint: 'Xác thực HMAC SHA256', icon: 'lucide:shield-check' },
        { label: 'Gemini AI Service', value: 'Ready', hint: 'Tạo Mindmap & Quiz', icon: 'lucide:cpu' },
        { label: 'AssemblyAI Transcribe', value: 'Ready', hint: 'Xử lý audio video', icon: 'lucide:mic' },
        { label: 'MinIO / S3 Storage', value: 'Connected', hint: 'Lưu trữ media bài giảng', icon: 'lucide:database' },
      ]}
    />
  );
}
