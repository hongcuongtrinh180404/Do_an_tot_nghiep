import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function CourseDetailSkeleton(): React.JSX.Element {
  return (
    <div className="w-full max-w-[1440px] 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 animate-pulse">
      {/* Top Navigation / Breadcrumb Skeleton */}
      <div className="flex items-center gap-3">
        <div className="h-8 w-24 bg-muted rounded-md" />
        <div className="h-4 w-48 bg-muted/60 rounded" />
      </div>

      {/* Hero Header Card Skeleton */}
      <Card className="border-border/50 bg-card/60 shadow-xs">
        <CardHeader className="space-y-4 pb-6 border-b border-border/40">
          {/* Status & Level badges */}
          <div className="flex items-center gap-2">
            <div className="h-5 w-24 bg-muted rounded-full" />
            <div className="h-5 w-20 bg-muted rounded-md" />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <div className="h-8 w-3/4 bg-muted rounded" />
            <div className="h-5 w-1/3 bg-muted/60 rounded font-mono" />
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {/* Quick Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1.5 p-3 rounded-lg bg-muted/30">
              <div className="h-3 w-16 bg-muted/60 rounded" />
              <div className="h-5 w-24 bg-muted rounded" />
            </div>
            <div className="space-y-1.5 p-3 rounded-lg bg-muted/30">
              <div className="h-3 w-16 bg-muted/60 rounded" />
              <div className="h-5 w-24 bg-muted rounded" />
            </div>
            <div className="space-y-1.5 p-3 rounded-lg bg-muted/30">
              <div className="h-3 w-16 bg-muted/60 rounded" />
              <div className="h-5 w-24 bg-muted rounded" />
            </div>
            <div className="space-y-1.5 p-3 rounded-lg bg-muted/30">
              <div className="h-3 w-16 bg-muted/60 rounded" />
              <div className="h-5 w-24 bg-muted rounded" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Short Description Skeleton */}
      <Card className="border-border/50 bg-card/60 shadow-xs">
        <CardHeader className="pb-3">
          <div className="h-5 w-32 bg-muted rounded" />
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="h-4 w-full bg-muted/60 rounded" />
          <div className="h-4 w-4/5 bg-muted/60 rounded" />
        </CardContent>
      </Card>

      {/* Full Description Skeleton */}
      <Card className="border-border/50 bg-card/60 shadow-xs">
        <CardHeader className="pb-3">
          <div className="h-5 w-40 bg-muted rounded" />
        </CardHeader>
        <CardContent className="space-y-2.5">
          <div className="h-4 w-full bg-muted/60 rounded" />
          <div className="h-4 w-full bg-muted/60 rounded" />
          <div className="h-4 w-5/6 bg-muted/60 rounded" />
          <div className="h-4 w-2/3 bg-muted/60 rounded" />
        </CardContent>
      </Card>

      {/* Sections List Skeleton */}
      <Card className="border-border/50 bg-card/60 shadow-xs">
        <CardHeader className="pb-3">
          <div className="h-5 w-36 bg-muted rounded" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-start gap-3.5 p-3.5 rounded-lg border border-border/30 bg-muted/20"
            >
              <div className="size-8 rounded-md bg-muted/60 shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-4 w-1/3 bg-muted rounded" />
                <div className="h-3 w-2/3 bg-muted/50 rounded" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
