'use client';

import React from 'react';
import Image from 'next/image';
import { Icon } from '@/components/ui/icon';
import type { ICourseInstructorSummary } from 'share-lib';

interface CourseInstructorTabProps {
  instructor?: ICourseInstructorSummary | null;
}

export function CourseInstructorTab({
  instructor,
}: CourseInstructorTabProps): React.JSX.Element {
  const fullName = instructor?.fullName || 'Giảng viên Mindly';
  const email = instructor?.email || 'instructor@mindly.edu.vn';

  return (
    <div
      role="tabpanel"
      id="tabpanel-instructor"
      aria-labelledby="tab-instructor"
      className="space-y-6 pt-2"
    >
      <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 sm:p-8 shadow-2xs space-y-6">
        {/* Profile Card Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="relative size-20 sm:size-24 rounded-full overflow-hidden shrink-0 border-2 border-[#e5e7eb] bg-neutral-100 shadow-xs">
            {instructor?.avatarUrl ? (
              <Image
                src={instructor.avatarUrl}
                alt={fullName}
                fill
                sizes="96px"
                className="object-cover"
              />
            ) : (
              <div className="size-full flex items-center justify-center text-neutral-600 font-extrabold text-2xl">
                {fullName.charAt(0) || 'G'}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#f3fcfc] border border-[#027D88]/20 px-2.5 py-0.5 text-xs font-semibold text-[#027D88]">
              <Icon icon="lucide:badge-check" className="size-3.5" />
              <span>Giảng viên chuyên gia được xác thực</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#161616]">
              {fullName}
            </h2>
            <p className="text-xs sm:text-sm text-[#666666]">
              {email} • Senior Technical Architect & AI Curriculum Lead
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-b border-[#f2f2f2] py-4">
          <div className="text-center sm:text-left space-y-0.5">
            <span className="text-xs text-[#666666]">Điểm đánh giá</span>
            <div className="flex items-center justify-center sm:justify-start gap-1 font-bold text-base text-[#161616]">
              <Icon icon="lucide:star" className="size-4 fill-[#ffd100] text-[#ffd100]" />
              <span>4.9 / 5.0</span>
            </div>
          </div>

          <div className="text-center sm:text-left space-y-0.5">
            <span className="text-xs text-[#666666]">Tổng học viên</span>
            <p className="font-bold text-base text-[#161616]">15.409+</p>
          </div>

          <div className="text-center sm:text-left space-y-0.5">
            <span className="text-xs text-[#666666]">Khóa học giảng dạy</span>
            <p className="font-bold text-base text-[#161616]">8 khóa</p>
          </div>

          <div className="text-center sm:text-left space-y-0.5">
            <span className="text-xs text-[#666666]">Tỷ lệ hoàn thành</span>
            <p className="font-bold text-base text-[#161616]">96%</p>
          </div>
        </div>

        {/* Biography & Philosophy */}
        <div className="space-y-3 text-xs sm:text-sm text-[#444444] leading-relaxed">
          <h3 className="text-base font-bold text-[#161616]">Về giảng viên</h3>
          <p>
            Với hơn 8 năm kinh nghiệm thực chiến trong lĩnh vực phát triển phần mềm và kiến trúc hệ thống,
            giảng viên luôn tâm huyết mang đến phương pháp giảng dạy hiện đại, trực quan và gắn liền với thực tế
            doanh nghiệp.
          </p>
          <p>
            Mỗi bài giảng trên nền tảng Mindly được xây dựng cẩn trọng, tích hợp tối đa các công cụ hỗ trợ
            học tập thông minh như Mindmap AI để học viên không chỉ ghi nhớ thụ động mà nắm bắt sâu sắc bản chất vấn đề.
          </p>
        </div>
      </div>
    </div>
  );
}

