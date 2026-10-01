import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function LessonDetailSkeleton(): React.JSX.Element {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-pulse">
      {/* Top Navigation Skeleton */}
      <div className="flex items-center gap-3">
        <div className="h-8 w-28 bg-muted rounded-md" />
        <div className="h-4 w-40 bg-muted/60 rounded" />
      </div>

      {/* Main Content & Player Skeleton */}
      <Card className="border-border/50 bg-card/60 shadow-xs overflow-hidden">
        <CardHeader className="space-y-3 pb-5 border-b border-border/40">
          {/* Badges */}
          <div className="flex items-center gap-2">
            <div className="h-5 w-16 bg-muted rounded-md" />
            <div className="h-5 w-20 bg-muted rounded-full" />
            <div className="h-5 w-24 bg-muted rounded-md" />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <div className="h-7 w-3/4 bg-muted rounded" />
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Video / Document Viewer Skeleton Area */}
          <div className="w-full aspect-video rounded-xl bg-muted/40 border border-border/40 flex items-center justify-center">
            <div className="size-14 rounded-full bg-muted/70 flex items-center justify-center" />
          </div>

          {/* Metadata bar skeleton */}
          <div className="flex items-center gap-4 py-3 px-4 rounded-lg bg-muted/20 border border-border/30">
            <div className="h-4 w-28 bg-muted/60 rounded" />
            <div className="h-4 w-20 bg-muted/60 rounded" />
            <div className="h-4 w-32 bg-muted/60 rounded" />
          </div>
        </CardContent>
      </Card>

      {/* Description Card Skeleton */}
      <Card className="border-border/50 bg-card/60 shadow-xs">
        <CardHeader className="pb-3">
          <div className="h-5 w-32 bg-muted rounded" />
        </CardHeader>
        <CardContent className="space-y-2.5">
          <div className="h-4 w-full bg-muted/60 rounded" />
          <div className="h-4 w-5/6 bg-muted/60 rounded" />
          <div className="h-4 w-2/3 bg-muted/60 rounded" />
        </CardContent>
      </Card>
    </div>
  );
}
