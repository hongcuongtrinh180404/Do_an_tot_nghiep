'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import {
  useUploadCourseThumbnailMutation,
  useUploadCourseTrailerMutation,
} from '../api/course.api';

/** Giới hạn dung lượng tối đa ảnh thumbnail (10MB) */
const MAX_THUMBNAIL_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

/** Giới hạn dung lượng tối đa video trailer (600MB) — dùng nội bộ, KHÔNG hiển thị trên UI */
const MAX_TRAILER_SIZE_BYTES = 600 * 1024 * 1024; // 600MB

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

export interface CourseMediaPreviewProps {
  courseId: string;
  thumbnailUrl?: string | null;
  trailerUrl?: string | null;
  readOnly?: boolean;
}

export function CourseMediaPreview({
  courseId,
  thumbnailUrl,
  trailerUrl,
  readOnly = false,
}: CourseMediaPreviewProps): React.JSX.Element {
  // Input references
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const trailerInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Local instant preview states
  const [localThumbnailUrl, setLocalThumbnailUrl] = useState<string | null>(null);
  const [localTrailerUrl, setLocalTrailerUrl] = useState<string | null>(null);

  // Selected file names for UI display
  const [thumbnailFileName, setThumbnailFileName] = useState<string | null>(null);
  const [trailerFileName, setTrailerFileName] = useState<string | null>(null);

  // Upload progress states
  const [thumbnailProgress, setThumbnailProgress] = useState<number>(0);
  const [trailerProgress, setTrailerProgress] = useState<number>(0);

  const activeThumbnail = localThumbnailUrl || thumbnailUrl;
  const activeTrailer = localTrailerUrl || trailerUrl;

  // Inline video playing state
  const [isPlayingInline, setIsPlayingInline] = useState<boolean>(false);
  const [prevThumbnail, setPrevThumbnail] = useState(activeThumbnail);
  const [prevTrailer, setPrevTrailer] = useState(activeTrailer);

  // Auto-reset inline video playback when thumbnail or trailer changes
  if (activeThumbnail !== prevThumbnail) {
    setPrevThumbnail(activeThumbnail);
    if (isPlayingInline) {
      setIsPlayingInline(false);
    }
  }

  if (activeTrailer !== prevTrailer) {
    setPrevTrailer(activeTrailer);
    if (isPlayingInline) {
      setIsPlayingInline(false);
    }
  }

  // React Query Mutations
  const uploadThumbnailMutation = useUploadCourseThumbnailMutation(courseId);
  const uploadTrailerMutation = useUploadCourseTrailerMutation(courseId);

  // Single Source of Truth: Video trailer poster always derives from course thumbnail
  const activePoster = activeThumbnail || undefined;

  // React remount key for HTML5 <video> to guarantee browser updates poster when thumbnail changes
  const trailerPreviewKey = `trailer_card_${activeTrailer || 'none'}_${activePoster || 'no_poster'}`;

  // Handle start playing video inline
  const handleStartPlayInline = () => {
    setIsPlayingInline(true);
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Fallback if browser blocks unmuted autoplay
      });
    }
  };

  // Clean up object URLs on component unmount
  useEffect(() => {
    return () => {
      if (localThumbnailUrl) URL.revokeObjectURL(localThumbnailUrl);
      if (localTrailerUrl) URL.revokeObjectURL(localTrailerUrl);
    };
  }, [localThumbnailUrl, localTrailerUrl]);

  const isUploadingThumbnail = uploadThumbnailMutation.isPending;
  const isUploadingTrailer = uploadTrailerMutation.isPending;

  // Handle Thumbnail File Selection & Immediate Upload
  const handleThumbnailSelect = (file: File) => {
    // Stop any ongoing video playback immediately when changing thumbnail
    setIsPlayingInline(false);
    if (videoRef.current) {
      videoRef.current.pause();
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Định dạng ảnh không hợp lệ', {
        description: 'Vui lòng chọn file ảnh định dạng JPG, PNG, WEBP hoặc GIF.',
      });
      return;
    }

    if (file.size > MAX_THUMBNAIL_SIZE_BYTES) {
      toast.error('Dung lượng ảnh vượt quá 10MB', {
        description: `Dung lượng file (${(file.size / (1024 * 1024)).toFixed(1)}MB) vượt quá mức tối đa cho phép là 10MB.`,
      });
      return;
    }

    // Instant local preview
    const objectUrl = URL.createObjectURL(file);
    setLocalThumbnailUrl(objectUrl);
    setThumbnailFileName(file.name);
    setThumbnailProgress(0);

    // Trigger immediate upload
    uploadThumbnailMutation.mutate(
      {
        file,
        onProgress: (percent) => setThumbnailProgress(percent),
      },
      {
        onSuccess: () => {
          URL.revokeObjectURL(objectUrl);
          setLocalThumbnailUrl(null);
        },
        onError: () => {
          URL.revokeObjectURL(objectUrl);
          setLocalThumbnailUrl(null);
          setThumbnailFileName(null);
        },
      },
    );
  };

  // Handle Trailer File Selection & Immediate Upload
  const handleTrailerSelect = (file: File) => {
    // Stop any ongoing video playback immediately when changing trailer
    setIsPlayingInline(false);
    if (videoRef.current) {
      videoRef.current.pause();
    }

    // Check MIME type or file extension for .mp4, .webm, .mov
    const ext = file.name.split('.').pop()?.toLowerCase();
    const isVideoMime = ALLOWED_VIDEO_TYPES.includes(file.type);
    const isVideoExt = ['mp4', 'webm', 'mov'].includes(ext || '');

    if (!isVideoMime && !isVideoExt) {
      toast.error('Định dạng video không hợp lệ', {
        description: 'Vui lòng chọn file video định dạng MP4, WebM hoặc MOV.',
      });
      return;
    }

    // Check size limit: 600MB (Silent on UI, notify via toast if exceeded)
    if (file.size > MAX_TRAILER_SIZE_BYTES) {
      toast.error('Dung lượng video vượt quá 600MB', {
        description: `Dung lượng video (${(file.size / (1024 * 1024)).toFixed(1)}MB) vượt quá giới hạn 600MB. Vui lòng chọn video dung lượng nhỏ hơn.`,
      });
      return;
    }

    // Instant local preview
    const objectUrl = URL.createObjectURL(file);
    setLocalTrailerUrl(objectUrl);
    setTrailerFileName(file.name);
    setTrailerProgress(0);

    // Trigger immediate upload
    uploadTrailerMutation.mutate(
      {
        file,
        onProgress: (percent) => setTrailerProgress(percent),
      },
      {
        onSuccess: () => {
          URL.revokeObjectURL(objectUrl);
          setLocalTrailerUrl(null);
        },
        onError: () => {
          URL.revokeObjectURL(objectUrl);
          setLocalTrailerUrl(null);
          setTrailerFileName(null);
        },
      },
    );
  };

  const onThumbnailInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleThumbnailSelect(file);
    }
    // Reset value so selecting the same file again triggers change event
    e.target.value = '';
  };

  const onTrailerInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleTrailerSelect(file);
    }
    e.target.value = '';
  };

  return (
    <>
      {/* ========================================================= */}
      {/* Thẻ Unified Media Card (Khung 16:9 thích ứng duy nhất)     */}
      {/* ========================================================= */}
      <Card className="border-border/50 bg-card/60 shadow-xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/30 flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <Icon icon="lucide:clapperboard" className="size-4 text-muted-foreground" />
            Media giới thiệu khóa học (Thumbnail & Trailer)
          </CardTitle>
          <span className="text-xs font-medium text-muted-foreground bg-muted/60 border border-border/40 px-2.5 py-0.5 rounded-full shrink-0">
            16:9 Khuyến nghị
          </span>
        </CardHeader>

        <CardContent className="pt-6 pb-4">
          {/* Khung hiển thị 16:9 thích ứng theo 4 trạng thái */}
          <div className="w-full max-w-4xl mx-auto">
            {/* TRẠNG THÁI 1: Chưa có gì (Empty State) */}
            {!activeThumbnail && !activeTrailer && (
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (!readOnly && !isUploadingThumbnail && !isUploadingTrailer) {
                    thumbnailInputRef.current?.click();
                  }
                }}
                onKeyDown={(e) => {
                  if (
                    (e.key === 'Enter' || e.key === ' ') &&
                    !readOnly &&
                    !isUploadingThumbnail &&
                    !isUploadingTrailer
                  ) {
                    thumbnailInputRef.current?.click();
                  }
                }}
                className="relative aspect-video w-full rounded-2xl border-2 border-dashed border-slate-300 dark:border-border/80 bg-slate-50 dark:bg-muted/20 hover:bg-slate-100/70 dark:hover:bg-muted/40 transition-colors flex flex-col items-center justify-center p-6 text-center select-none cursor-pointer group"
                title="Nhấn để tải lên ảnh bìa"
              >
                {/* Uploading Spinner Overlay */}
                {isUploadingThumbnail || isUploadingTrailer ? (
                  <div className="flex flex-col items-center justify-center w-full">
                    <Icon icon="lucide:loader-2" className="size-8 animate-spin text-primary mb-2" />
                    <span className="text-xs font-semibold text-foreground">
                      {isUploadingThumbnail
                        ? `Đang lưu ảnh lên MinIO... (${thumbnailProgress}%)`
                        : `Đang lưu video lên MinIO... (${trailerProgress}%)`}
                    </span>
                    <div className="w-1/2 h-1.5 bg-muted rounded-full mt-2.5 overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-200 rounded-full"
                        style={{
                          width: `${isUploadingThumbnail ? thumbnailProgress : trailerProgress}%`,
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="size-14 rounded-2xl bg-slate-200/60 dark:bg-muted flex items-center justify-center mb-3 group-hover:scale-105 transition-transform gap-1">
                      <Icon
                        icon="lucide:image"
                        className="size-6 text-slate-400 dark:text-muted-foreground/70"
                      />
                      <Icon
                        icon="lucide:film"
                        className="size-5 text-slate-400/80 dark:text-muted-foreground/60"
                      />
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      Chưa có ảnh bìa hoặc video trailer giới thiệu
                    </p>
                    <p className="text-xs text-muted-foreground mt-1.5 max-w-md">
                      Nhấn để tải lên ảnh bìa trước hoặc dùng các nút điều khiển bên dưới (Hỗ trợ ảnh JPG, PNG, WEBP • Video MP4, WebM tối đa 600MB)
                    </p>
                  </>
                )}
              </div>
            )}

            {/* TRẠNG THÁI 2: Chỉ có Ảnh bìa (Thumbnail Only) */}
            {activeThumbnail && !activeTrailer && (
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-900 border border-border/40 select-none">
                <Image
                  src={activeThumbnail}
                  alt="Course Thumbnail"
                  fill
                  unoptimized
                  sizes="(max-width: 1024px) 100vw, 896px"
                  className="object-cover"
                />

                {/* Badge Bottom Left: Đã có Thumbnail */}
                <div className="absolute bottom-3 left-3 bg-black/60 dark:bg-black/80 backdrop-blur-md text-white text-xs font-medium px-2.5 py-1 rounded-lg border border-white/20 flex items-center gap-1.5 shadow-md">
                  <Icon icon="lucide:image" className="size-3.5 text-emerald-400" />
                  <span>Ảnh bìa khóa học</span>
                </div>

                {/* Uploading Spinner Overlay */}
                {(isUploadingThumbnail || isUploadingTrailer) && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center text-white z-10 cursor-wait">
                    <Icon icon="lucide:loader-2" className="size-8 animate-spin text-white mb-2" />
                    <span className="text-xs font-semibold">
                      {isUploadingThumbnail
                        ? `Đang lưu ảnh lên MinIO... (${thumbnailProgress}%)`
                        : `Đang lưu video lên MinIO... (${trailerProgress}%)`}
                    </span>
                    <div className="w-3/5 h-1.5 bg-white/20 rounded-full mt-2.5 overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-200 rounded-full"
                        style={{
                          width: `${isUploadingThumbnail ? thumbnailProgress : trailerProgress}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TRẠNG THÁI 3: Chỉ có Trailer (Trailer Only - Inline Playback) */}
            {!activeThumbnail && activeTrailer && (
              <div
                role={!isPlayingInline ? 'button' : undefined}
                tabIndex={!isPlayingInline ? 0 : undefined}
                onClick={() => {
                  if (!isPlayingInline) handleStartPlayInline();
                }}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && !isPlayingInline) {
                    handleStartPlayInline();
                  }
                }}
                className={`relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 border border-border/40 select-none flex items-center justify-center ${
                  !isPlayingInline ? 'group cursor-pointer' : ''
                }`}
                title={!isPlayingInline ? 'Nhấn để phát video trailer' : undefined}
              >
                {/* Video element (Native controls enabled on inline play) */}
                <video
                  ref={videoRef}
                  key={trailerPreviewKey}
                  src={activeTrailer}
                  preload={isPlayingInline ? 'auto' : 'metadata'}
                  controls={isPlayingInline}
                  autoPlay={isPlayingInline}
                  className="w-full h-full object-cover opacity-100"
                >
                  Trình duyệt của bạn không hỗ trợ thẻ video.
                </video>

                {/* Overlay & Badges: Chỉ hiển thị khi chưa phát video inline */}
                {!isPlayingInline && (
                  <>
                    {/* Play Button Overlay (Minimalist crystal clear glassmorphism) */}
                    <div className="absolute inset-0 flex items-center justify-center text-white bg-black/[0.07] group-hover:bg-black/[0.14] transition-colors pointer-events-none">
                      <div className="size-14 rounded-full bg-white/20 dark:bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/30 text-white shadow-xl group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all duration-300">
                        <Icon icon="lucide:play" className="size-6 ml-0.5 fill-current" />
                      </div>
                    </div>

                    {/* Badge Bottom Right: Đã có Trailer */}
                    <div className="absolute bottom-3 right-3 bg-black/60 dark:bg-black/80 backdrop-blur-md text-white text-xs font-medium px-2.5 py-1 rounded-lg border border-white/20 flex items-center gap-1.5 shadow-md pointer-events-none">
                      <Icon icon="lucide:film" className="size-3.5 text-sky-400" />
                      <span>Video trailer (Chưa có ảnh bìa)</span>
                    </div>
                  </>
                )}

                {/* Uploading Spinner Overlay */}
                {(isUploadingThumbnail || isUploadingTrailer) && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center text-white z-10 cursor-wait">
                    <Icon icon="lucide:loader-2" className="size-8 animate-spin text-white mb-2" />
                    <span className="text-xs font-semibold">
                      {isUploadingThumbnail
                        ? `Đang lưu ảnh lên MinIO... (${thumbnailProgress}%)`
                        : `Đang lưu video lên MinIO... (${trailerProgress}%)`}
                    </span>
                    <div className="w-3/5 h-1.5 bg-white/20 rounded-full mt-2.5 overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-200 rounded-full"
                        style={{
                          width: `${isUploadingThumbnail ? thumbnailProgress : trailerProgress}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TRẠNG THÁI 4: Có cả hai (Chuẩn nhất - Video dùng Thumbnail làm poster, Inline Playback) */}
            {activeThumbnail && activeTrailer && (
              <div
                role={!isPlayingInline ? 'button' : undefined}
                tabIndex={!isPlayingInline ? 0 : undefined}
                onClick={() => {
                  if (!isPlayingInline) handleStartPlayInline();
                }}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && !isPlayingInline) {
                    handleStartPlayInline();
                  }
                }}
                className={`relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 border border-border/40 select-none flex items-center justify-center ${
                  !isPlayingInline ? 'group cursor-pointer' : ''
                }`}
                title={!isPlayingInline ? 'Nhấn để phát video trailer' : undefined}
              >
                {/* Video element with thumbnail poster (Native controls enabled on inline play) */}
                <video
                  ref={videoRef}
                  key={trailerPreviewKey}
                  src={activeTrailer}
                  poster={activePoster}
                  preload={isPlayingInline ? 'auto' : 'none'}
                  controls={isPlayingInline}
                  autoPlay={isPlayingInline}
                  className="w-full h-full object-cover opacity-100"
                >
                  Trình duyệt của bạn không hỗ trợ thẻ video.
                </video>

                {/* Overlay & Badges: Chỉ hiển thị khi chưa phát video inline */}
                {!isPlayingInline && (
                  <>
                    {/* Play Button Overlay (Minimalist crystal clear glassmorphism) */}
                    <div className="absolute inset-0 flex items-center justify-center text-white bg-black/[0.07] group-hover:bg-black/[0.14] transition-colors pointer-events-none">
                      <div className="size-14 rounded-full bg-white/20 dark:bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/30 text-white shadow-xl group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all duration-300">
                        <Icon icon="lucide:play" className="size-6 ml-0.5 fill-current" />
                      </div>
                    </div>

                    {/* Badge Bottom Left: Đã có Thumbnail */}
                    <div className="absolute bottom-3 left-3 bg-black/60 dark:bg-black/80 backdrop-blur-md text-white text-xs font-medium px-2.5 py-1 rounded-lg border border-white/20 flex items-center gap-1.5 shadow-md pointer-events-none">
                      <Icon icon="lucide:image" className="size-3.5 text-emerald-400" />
                      <span>Ảnh bìa (Poster)</span>
                    </div>

                    {/* Badge Bottom Right: Đã có Trailer */}
                    <div className="absolute bottom-3 right-3 bg-black/60 dark:bg-black/80 backdrop-blur-md text-white text-xs font-medium px-2.5 py-1 rounded-lg border border-white/20 flex items-center gap-1.5 shadow-md pointer-events-none">
                      <Icon icon="lucide:film" className="size-3.5 text-sky-400" />
                      <span>Video trailer</span>
                    </div>
                  </>
                )}

                {/* Uploading Spinner Overlay */}
                {(isUploadingThumbnail || isUploadingTrailer) && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center text-white z-10 cursor-wait">
                    <Icon icon="lucide:loader-2" className="size-8 animate-spin text-white mb-2" />
                    <span className="text-xs font-semibold">
                      {isUploadingThumbnail
                        ? `Đang lưu ảnh lên MinIO... (${thumbnailProgress}%)`
                        : `Đang lưu video lên MinIO... (${trailerProgress}%)`}
                    </span>
                    <div className="w-3/5 h-1.5 bg-white/20 rounded-full mt-2.5 overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-200 rounded-full"
                        style={{
                          width: `${isUploadingThumbnail ? thumbnailProgress : trailerProgress}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>

        {/* Thanh chân thẻ: 2 nút điều khiển độc lập ở hai bên */}
        <div className="px-6 py-4 border-t border-border/30 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Nhóm 1 (Trái): Quản lý Ảnh bìa (Thumbnail) */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            {!readOnly && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUploadingThumbnail || isUploadingTrailer}
                onClick={() => thumbnailInputRef.current?.click()}
                className="rounded-xl text-xs font-semibold gap-2 border-border/60 shadow-xs hover:bg-muted/60 shrink-0"
              >
                {isUploadingThumbnail ? (
                  <>
                    <Icon icon="lucide:loader-2" className="size-3.5 animate-spin text-muted-foreground" />
                    Đang tải ảnh... ({thumbnailProgress}%)
                  </>
                ) : activeThumbnail ? (
                  <>
                    <Icon icon="lucide:camera" className="size-3.5 text-muted-foreground" />
                    Thay ảnh bìa
                  </>
                ) : (
                  <>
                    <Icon icon="lucide:upload" className="size-3.5 text-muted-foreground" />
                    Tải lên ảnh bìa
                  </>
                )}
              </Button>
            )}

            <span
              className="text-xs text-muted-foreground italic font-normal truncate max-w-[180px] sm:max-w-[220px]"
              title={thumbnailFileName || undefined}
            >
              {thumbnailFileName ? (
                <span className="flex items-center gap-1.5 not-italic text-foreground/80 font-medium">
                  <Icon icon="lucide:check-circle-2" className="size-3.5 text-emerald-500 shrink-0" />
                  {thumbnailFileName}
                </span>
              ) : activeThumbnail ? (
                <span className="flex items-center gap-1.5 not-italic text-emerald-600 dark:text-emerald-400 font-medium">
                  <Icon icon="lucide:cloud" className="size-3.5 shrink-0" />
                  Đã lưu MinIO Storage
                </span>
              ) : (
                'Chưa có ảnh bìa'
              )}
            </span>
          </div>

          {/* Nhóm 2 (Phải): Quản lý Video Trailer */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <span
              className="text-xs text-muted-foreground italic font-normal truncate max-w-[180px] sm:max-w-[220px]"
              title={trailerFileName || undefined}
            >
              {trailerFileName ? (
                <span className="flex items-center gap-1.5 not-italic text-foreground/80 font-medium">
                  <Icon icon="lucide:check-circle-2" className="size-3.5 text-emerald-500 shrink-0" />
                  {trailerFileName}
                </span>
              ) : activeTrailer ? (
                <span className="flex items-center gap-1.5 not-italic text-emerald-600 dark:text-emerald-400 font-medium">
                  <Icon icon="lucide:cloud" className="size-3.5 shrink-0" />
                  Đã lưu MinIO Storage
                </span>
              ) : (
                'Chưa có trailer'
              )}
            </span>

            {!readOnly && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUploadingThumbnail || isUploadingTrailer}
                onClick={() => trailerInputRef.current?.click()}
                className="rounded-xl text-xs font-semibold gap-2 border-border/60 shadow-xs hover:bg-muted/60 shrink-0"
              >
                {isUploadingTrailer ? (
                  <>
                    <Icon icon="lucide:loader-2" className="size-3.5 animate-spin text-muted-foreground" />
                    Đang tải trailer... ({trailerProgress}%)
                  </>
                ) : activeTrailer ? (
                  <>
                    <Icon icon="lucide:clapperboard" className="size-3.5 text-muted-foreground" />
                    Thay trailer
                  </>
                ) : (
                  <>
                    <Icon icon="lucide:video" className="size-3.5 text-muted-foreground" />
                    Tải lên trailer
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Hidden File Inputs */}
      <input
        ref={thumbnailInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={onThumbnailInputChange}
        disabled={isUploadingThumbnail}
      />
      <input
        ref={trailerInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={onTrailerInputChange}
        disabled={isUploadingTrailer}
      />
    </>
  );
}

