'use client';

import React, { useMemo } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import type { IPublicCourseDetailResponse } from '../../api/enrollment.api';

interface CourseInfoTabProps {
  course: IPublicCourseDetailResponse;
}

export function CourseInfoTab({ course }: CourseInfoTabProps): React.JSX.Element {
  const sanitizedHtml = useMemo(() => {
    const html = DOMPurify.sanitize(course.description ?? '');
    // Empty rich-text documents can contain paragraphs, line breaks and non-breaking spaces.
    const text = html.replace(/<[^>]*>/g, '').replace(/&nbsp;|&#160;|&#xa0;/gi, ' ').trim();
    return text ? html : '';
  }, [course.description]);

  return (
    <div
      role="tabpanel"
      id="tabpanel-info"
      aria-labelledby="tab-info"
      className="space-y-3 pt-2"
    >
      <h2 className="text-xl sm:text-2xl font-bold text-[#161616] tracking-tight">
        Thông tin môn học
      </h2>
      {sanitizedHtml ? (
        <div
          className="prose max-w-none text-sm sm:text-base text-[#444444] leading-relaxed break-words prose-headings:font-bold prose-headings:text-[#161616] prose-h2:text-lg sm:prose-h2:text-xl prose-h3:text-base sm:prose-h3:text-lg prose-strong:text-[#161616] prose-a:text-[#027D88] prose-a:underline"
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
      ) : (
        <p className="text-sm sm:text-base text-[#666666] italic leading-relaxed">
          Chưa có thông tin mô tả cho môn học này.
        </p>
      )}
    </div>
  );
}
