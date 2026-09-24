import React from 'react';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';

export function CourseEmptyState(): React.JSX.Element {
  return (
    <Card className="border-border/50 bg-card/60 shadow-xs">
      <CardContent className="flex flex-col items-center justify-center text-center py-16 px-4 sm:px-6">
        {/* Visual Icon Badge */}
        <div className="size-16 rounded-2xl bg-muted/80 border border-border/60 flex items-center justify-center text-muted-foreground shadow-xs mb-5">
          <Icon icon="lucide:book-open" className="size-8 text-foreground/80" />
        </div>

        {/* Content Heading & Description */}
        <h3 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground mb-2">
          Chưa có khóa học nào
        </h3>
        <p className="text-sm text-muted-foreground max-w-md leading-relaxed mb-6">
          Bạn chưa tạo khóa học nào. Hãy bắt đầu xây dựng bài giảng và chia sẻ kiến thức ngay hôm nay bằng cách tạo khóa học đầu tiên.
        </p>

        {/* Call to Action Button */}
        <Link
          href="/instructor/courses/new"
          className={buttonVariants()}
        >
          <Icon icon="lucide:plus" className="size-4 mr-1.5" />
          Tạo khóa học
        </Link>
      </CardContent>
    </Card>
  );
}
