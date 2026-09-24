'use client';

import React from 'react';
import { CourseHeader } from './course-header';
import { CourseEmptyState } from './course-empty-state';

export function CourseManagementContent(): React.JSX.Element {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <CourseHeader />
      <CourseEmptyState />
    </div>
  );
}
