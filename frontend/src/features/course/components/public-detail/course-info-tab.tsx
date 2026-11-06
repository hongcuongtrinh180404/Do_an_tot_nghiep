'use client';

import React from 'react';
import { Icon } from '@/components/ui/icon';
import type { IPublicCourseDetailResponse } from '../../api/enrollment.api';

interface CourseInfoTabProps {
  course: IPublicCourseDetailResponse;
}

export function CourseInfoTab({ course }: CourseInfoTabProps): React.JSX.Element {
  const learningOutcomes = [
    'Nắm vững kiến thức nền tảng và tư duy kiến trúc thực chiến chuẩn doanh nghiệp',
    'Tự tin triển khai các dự án quy mô thực tế với mã nguồn sạch và tối ưu hiệu năng',
    'Thành thạo phương pháp ghi nhớ chủ động thông qua sơ đồ tư duy Mindmap dạng cây tương tác',
    'Vận dụng các điểm dừng trắc nghiệm In-video Quiz để củng cố ngay kiến thức cốt lõi',
    'Xây dựng tư duy phân tích, giải quyết vấn đề và tối ưu hóa hệ thống bài bản',
  ];

  const requirements = [
    'Có kiến thức máy tính cơ bản và tinh thần học hỏi chủ động',
    'Máy tính có kết nối Internet để theo dõi video bài giảng và thực hành',
    'Không yêu cầu kinh nghiệm chuyên sâu từ trước đối với các khóa học ở mức cơ bản',
  ];

  return (
    <div
      role="tabpanel"
      id="tabpanel-info"
      aria-labelledby="tab-info"
      className="space-y-8 pt-2"
    >
      {/* 1. Course Description */}
      <section className="space-y-3">
        <h2 className="text-xl sm:text-2xl font-bold text-[#161616] tracking-tight">
          Giới thiệu khóa học
        </h2>
        <div className="text-sm sm:text-base text-[#444444] leading-relaxed whitespace-pre-line">
          {course.description || course.shortDescription || (
            <p>
              Khóa học được thiết kế chuyên sâu nhằm trang bị cho học viên toàn bộ kiến thức lý thuyết
              vững chắc cùng kỹ năng thực chiến toàn diện. Từng bài giảng được cô đọng, trực quan với các
              ví dụ thực tế giúp bạn nhanh chóng áp dụng vào công việc.
            </p>
          )}
        </div>
      </section>

      {/* 2. What you'll learn */}
      <section className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <Icon icon="lucide:check-circle-2" className="size-5 text-[#027D88]" />
          <h3 className="text-lg sm:text-xl font-bold text-[#161616]">
            Mục tiêu & Kiến thức đạt được
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {learningOutcomes.map((item, idx) => (
            <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-[#333333]">
              <Icon icon="lucide:check" className="size-4 text-[#027D88] shrink-0 mt-0.5" />
              <span className="leading-snug">{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 3. AI Learning Pipeline Experience */}
      <section className="rounded-2xl border border-[#027D88]/20 bg-[#f3fcfc]/70 p-6 space-y-4">
        <div className="flex items-center gap-2 text-[#027D88]">
          <Icon icon="lucide:sparkles" className="size-5" />
          <h3 className="text-lg sm:text-xl font-bold">
            Trải nghiệm học tập thông minh tích hợp AI Mindly
          </h3>
        </div>
        <p className="text-xs sm:text-sm text-[#444444] leading-relaxed">
          Mindly áp dụng mô hình trí tuệ nhân tạo để phân tích bài giảng video theo thời gian thực,
          cung cấp bộ công cụ độc quyền hỗ trợ việc học tập chủ động và đạt hiệu quả tối đa:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div className="rounded-xl bg-white p-4 border border-[#027D88]/15 space-y-1.5 shadow-2xs">
            <div className="size-8 rounded-lg bg-[#f3fcfc] text-[#027D88] flex items-center justify-center font-bold">
              <Icon icon="lucide:git-branch" className="size-4" />
            </div>
            <h4 className="text-sm font-bold text-[#161616]">Mindmap AI</h4>
            <p className="text-xs text-[#666666] leading-relaxed">
              Tự động trích xuất cấu trúc bài học thành sơ đồ tư duy dạng cây trực quan, dễ dàng nắm bắt bức tranh tổng quan.
            </p>
          </div>

          <div className="rounded-xl bg-white p-4 border border-[#027D88]/15 space-y-1.5 shadow-2xs">
            <div className="size-8 rounded-lg bg-[#f3fcfc] text-[#027D88] flex items-center justify-center font-bold">
              <Icon icon="lucide:help-circle" className="size-4" />
            </div>
            <h4 className="text-sm font-bold text-[#161616]">In-video Quiz</h4>
            <p className="text-xs text-[#666666] leading-relaxed">
              Điểm dừng câu hỏi trắc nghiệm thông minh ngay trong video, giúp ghi nhớ và kiểm tra độ hiểu bài lập tức.
            </p>
          </div>

          <div className="rounded-xl bg-white p-4 border border-[#027D88]/15 space-y-1.5 shadow-2xs">
            <div className="size-8 rounded-lg bg-[#f3fcfc] text-[#027D88] flex items-center justify-center font-bold">
              <Icon icon="lucide:file-text" className="size-4" />
            </div>
            <h4 className="text-sm font-bold text-[#161616]">Tóm tắt bài học</h4>
            <p className="text-xs text-[#666666] leading-relaxed">
              Bản tóm tắt văn bản cô đọng kèm phụ đề đồng bộ chính xác từng giây, tiết kiệm thời gian ôn tập.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Requirements */}
      <section className="space-y-3 pt-2">
        <h3 className="text-lg sm:text-xl font-bold text-[#161616]">
          Yêu cầu & Đối tượng phù hợp
        </h3>
        <ul className="space-y-2 text-xs sm:text-sm text-[#444444]">
          {requirements.map((req, idx) => (
            <li key={idx} className="flex items-start gap-2.5">
              <span className="size-1.5 rounded-full bg-[#027D88] shrink-0 mt-2" />
              <span>{req}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

