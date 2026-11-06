'use client';

import React from 'react';
import { Icon } from '@/components/ui/icon';

interface CourseReviewsTabProps {
  rating?: number;
  reviewCount?: number;
}

interface IReviewItem {
  id: string;
  name: string;
  role: string;
  avatarText: string;
  date: string;
  rating: number;
  comment: string;
  highlightTag?: string;
}

const SAMPLE_REVIEWS: IReviewItem[] = [
  {
    id: 'rev-1',
    name: 'Nguyễn Văn An',
    role: 'Học viên Kỹ thuật phần mềm',
    avatarText: 'NA',
    date: '2 tuần trước',
    rating: 5,
    comment:
      'Khóa học được đầu tư bài bản và cực kỳ thực tế. Điều mình thích nhất là tính năng Mindmap AI sau mỗi bài học, giúp mình xâu chuỗi và tổng hợp lại cấu trúc kiến thức nhanh chóng mà không phải tự mất hàng giờ ghi chép.',
    highlightTag: 'Mindmap AI xuất sắc',
  },
  {
    id: 'rev-2',
    name: 'Lê Thị Mai Hương',
    role: 'Product Designer',
    avatarText: 'MH',
    date: '1 tháng trước',
    rating: 5,
    comment:
      'Trải nghiệm xem video rất mượt. Đặc biệt là các điểm dừng In-video Quiz xuất hiện đúng lúc, buộc mình phải tập trung suy nghĩ và hiểu sâu bản chất vấn đề trước khi chuyển sang phần tiếp theo.',
    highlightTag: 'In-video Quiz hiệu quả',
  },
  {
    id: 'rev-3',
    name: 'Trần Đức Minh',
    role: 'Fullstack Developer',
    avatarText: 'TM',
    date: '1 tháng trước',
    rating: 5,
    comment:
      'Giảng viên giải thích cặn kẽ từ tư duy đến ứng dụng thực tế. Bản tóm tắt bài giảng rất cô đọng, xem lại ôn bài trước khi phỏng vấn hoặc làm dự án thực tế cực kỳ tiện lợi.',
    highlightTag: 'Giáo trình thực chiến',
  },
  {
    id: 'rev-4',
    name: 'Hoàng Quốc Tuấn',
    role: 'Sinh viên CNTT năm cuối',
    avatarText: 'QT',
    date: '2 tháng trước',
    rating: 5,
    comment:
      'Khóa học đáng từng đồng tiền bát gạo! Nội dung phân chia chương hồi rõ ràng từ cơ bản đến nâng cao. Nhờ lộ trình này mình đã tự tin vượt qua vòng phỏng vấn chuyên môn.',
    highlightTag: 'Đáng giá 5 sao',
  },
];

export function CourseReviewsTab({
  rating = 4.9,
  reviewCount = 583,
}: CourseReviewsTabProps): React.JSX.Element {
  const ratingDistribution = [
    { stars: 5, percentage: 92 },
    { stars: 4, percentage: 6 },
    { stars: 3, percentage: 2 },
    { stars: 2, percentage: 0 },
    { stars: 1, percentage: 0 },
  ];

  return (
    <div
      role="tabpanel"
      id="tabpanel-reviews"
      aria-labelledby="tab-reviews"
      className="space-y-8 pt-2"
    >
      {/* 1. Rating Summary Box */}
      <section className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-2xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Big Score */}
          <div className="text-center md:border-r border-[#e5e7eb] md:pr-6 space-y-1">
            <div className="text-4xl sm:text-5xl font-extrabold text-[#161616] tracking-tight">
              {rating.toFixed(1)}
            </div>
            <div className="flex items-center justify-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Icon
                  key={star}
                  icon="lucide:star"
                  className="size-4.5 fill-[#ffd100] text-[#ffd100]"
                />
              ))}
            </div>
            <p className="text-xs text-[#666666] pt-1">
              Dựa trên {reviewCount} nhận xét từ học viên đã ghi danh
            </p>
          </div>

          {/* Star breakdown bars */}
          <div className="md:col-span-2 space-y-2">
            {ratingDistribution.map((item) => (
              <div key={item.stars} className="flex items-center gap-3 text-xs">
                <span className="w-12 text-[#666666] font-medium flex items-center gap-1">
                  <span>{item.stars}</span>
                  <Icon icon="lucide:star" className="size-3 fill-[#ffd100] text-[#ffd100]" />
                </span>

                <div className="flex-1 h-2 rounded-full bg-neutral-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#ffd100]"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>

                <span className="w-9 text-right font-medium text-[#666666] tabular-nums">
                  {item.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. Student Testimonials List */}
      <section className="space-y-4">
        <h3 className="text-lg sm:text-xl font-bold text-[#161616]">
          Nhận xét nổi bật của học viên
        </h3>

        <div className="space-y-4">
          {SAMPLE_REVIEWS.map((review) => (
            <article
              key={review.id}
              className="rounded-2xl border border-[#e5e7eb] bg-white p-5 space-y-3 shadow-2xs hover:border-neutral-300 transition-colors"
            >
              {/* Header: User info + stars */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-[#f3fcfc] border border-[#027D88]/20 text-[#027D88] font-bold text-xs flex items-center justify-center shrink-0">
                    {review.avatarText}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#161616]">{review.name}</h4>
                    <p className="text-xs text-[#666666]">{review.role}</p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-0.5 justify-end">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Icon
                        key={s}
                        icon="lucide:star"
                        className={`size-3.5 ${
                          s <= review.rating
                            ? 'fill-[#ffd100] text-[#ffd100]'
                            : 'fill-neutral-200 text-neutral-200'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] text-neutral-400 mt-0.5 block">{review.date}</span>
                </div>
              </div>

              {/* Tag highlight */}
              {review.highlightTag && (
                <div className="inline-flex items-center gap-1 rounded bg-[#f3fcfc] px-2 py-0.5 text-[11px] font-semibold text-[#027D88]">
                  <Icon icon="lucide:check-circle" className="size-3 text-[#027D88]" />
                  <span>{review.highlightTag}</span>
                </div>
              )}

              {/* Review Comment */}
              <p className="text-xs sm:text-sm text-[#444444] leading-relaxed">
                {review.comment}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

