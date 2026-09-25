import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';

export function CourseCardSkeleton(): React.JSX.Element {
  return (
    <Card className="border-border/50 bg-card/60 shadow-xs animate-pulse flex flex-col justify-between">
      <CardHeader className="space-y-2 pb-3">
        {/* Badges skeleton */}
        <div className="flex items-center justify-between gap-2">
          <div className="h-5 w-20 bg-muted rounded-full" />
          <div className="h-5 w-16 bg-muted rounded-md" />
        </div>

        {/* Title skeleton */}
        <div className="space-y-1.5 pt-1">
          <div className="h-5 w-5/6 bg-muted rounded" />
          <div className="h-5 w-3/5 bg-muted rounded" />
        </div>

        {/* Slug skeleton */}
        <div className="h-3.5 w-1/2 bg-muted/60 rounded font-mono" />
      </CardHeader>

      <CardContent className="py-2 space-y-2">
        <div className="h-3.5 w-full bg-muted/50 rounded" />
        <div className="h-4 w-1/3 bg-muted rounded mt-2" />
      </CardContent>

      <CardFooter className="pt-3 pb-3 border-t border-border/40 flex items-center justify-between">
        <div className="h-3.5 w-28 bg-muted/60 rounded" />
      </CardFooter>
    </Card>
  );
}

export function CourseListSkeleton(): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <CourseCardSkeleton />
      <CourseCardSkeleton />
      <CourseCardSkeleton />
    </div>
  );
}
