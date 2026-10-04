'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

  // Local instant preview states
  const [localThumbnailUrl, setLocalThumbnailUrl] = useState<string | null>(null);
  const [localTrailerUrl, setLocalTrailerUrl] = useState<string | null>(null);

  // Selected file names for UI display
  const [thumbnailFileName, setThumbnailFileName] = useState<string | null>(null);
  const [trailerFileName, setTrailerFileName] = useState<string | null>(null);

  // Upload progress states
  const [thumbnailProgress, setThumbnailProgress] = useState<number>(0);
  const [trailerProgress, setTrailerProgress] = useState<number>(0);

  // Modal preview states (Lightbox & Video Player)
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState<boolean>(false);

  // React Query Mutations
  const uploadThumbnailMutation = useUploadCourseThumbnailMutation(courseId);
  const uploadTrailerMutation = useUploadCourseTrailerMutation(courseId);

  const activeThumbnail = localThumbnailUrl || thumbnailUrl;
  const activeTrailer = localTrailerUrl || trailerUrl;

  // Single Source of Truth: Video trailer poster always derives from course thumbnail
  const activePoster = activeThumbnail || undefined;

  // React remount keys for HTML5 <video> to guarantee browser updates poster when thumbnail changes
  const trailerPreviewKey = `trailer_card_${activeTrailer || 'none'}_${activePoster || 'no_poster'}`;
  const trailerModalKey = `trailer_modal_${activeTrailer || 'none'}_${activePoster || 'no_poster'}`;

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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ========================================================= */}
        {/* Khối 1 (Trái): Course Thumbnail                           */}
        {/* ========================================================= */}
        <Card className="border-border/50 bg-card/60 shadow-xs flex flex-col justify-between overflow-hidden">
          <div>
            <CardHeader className="pb-3 border-b border-border/30">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <Icon icon="lucide:image" className="size-4 text-muted-foreground" />
                Ảnh thu nhỏ khóa học (Thumbnail)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {activeThumbnail ? (
                /* Đã có ảnh: Preview 16:9 với Click-to-Lightbox */
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setIsLightboxOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setIsLightboxOpen(true);
                    }
                  }}
                  className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-900 border border-border/40 group cursor-pointer select-none"
                  title="Nhấn để phóng to ảnh bìa"
                >
                  <Image
                    src={activeThumbnail}
                    alt="Course Thumbnail"
                    fill
                    unoptimized
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-2">
                    <div className="size-10 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center border border-white/30">
                      <Icon icon="lucide:maximize-2" className="size-5 text-white" />
                    </div>
                    <span className="text-xs font-medium tracking-wide drop-shadow">
                      Nhấn để xem ảnh phóng to
                    </span>
                  </div>

                  {/* Uploading Spinner Overlay */}
                  {isUploadingThumbnail && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center text-white z-10 cursor-wait">
                      <Icon icon="lucide:loader-2" className="size-8 animate-spin text-white mb-2" />
                      <span className="text-xs font-semibold">
                        Đang lưu ảnh lên MinIO... ({thumbnailProgress}%)
                      </span>
                      <div className="w-3/5 h-1.5 bg-white/20 rounded-full mt-2.5 overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-200 rounded-full"
                          style={{ width: `${thumbnailProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Chưa có ảnh: Khung nét đứt Call-To-Action */
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (!readOnly && !isUploadingThumbnail) {
                      thumbnailInputRef.current?.click();
                    }
                  }}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && !readOnly && !isUploadingThumbnail) {
                      thumbnailInputRef.current?.click();
                    }
                  }}
                  className="relative aspect-video w-full rounded-xl border-2 border-dashed border-slate-300 dark:border-border/80 bg-slate-50 dark:bg-muted/20 hover:bg-slate-100/70 dark:hover:bg-muted/40 transition-colors flex flex-col items-center justify-center p-6 text-center select-none cursor-pointer group"
                >
                  {isUploadingThumbnail ? (
                    <div className="flex flex-col items-center justify-center w-full">
                      <Icon icon="lucide:loader-2" className="size-8 animate-spin text-primary mb-2" />
                      <span className="text-xs font-semibold text-foreground">
                        Đang lưu ảnh lên MinIO... ({thumbnailProgress}%)
                      </span>
                      <div className="w-1/2 h-1.5 bg-muted rounded-full mt-2.5 overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-200 rounded-full"
                          style={{ width: `${thumbnailProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="size-12 rounded-full bg-slate-200/60 dark:bg-muted flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                        <Icon
                          icon="lucide:image"
                          className="size-6 text-slate-400 dark:text-muted-foreground/60"
                        />
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        Chưa có ảnh bìa khóa học
                      </p>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        Hỗ trợ JPG, PNG, WEBP (Khuyến nghị 1280 x 720 px)
                      </p>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </div>

          {/* Thanh chân thẻ Thumbnail */}
          <div className="px-6 pb-5 pt-1 flex items-center justify-between gap-3">
            <span
              className="text-xs text-muted-foreground italic font-normal truncate max-w-[180px] sm:max-w-[240px]"
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
                'Chưa chọn file'
              )}
            </span>

            {!readOnly && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUploadingThumbnail}
                onClick={() => thumbnailInputRef.current?.click()}
                className="rounded-xl text-xs font-semibold gap-2 border-border/60 shadow-xs hover:bg-muted/60 shrink-0"
              >
                {isUploadingThumbnail ? (
                  <>
                    <Icon icon="lucide:loader-2" className="size-3.5 animate-spin text-muted-foreground" />
                    Đang tải... ({thumbnailProgress}%)
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
          </div>
        </Card>

        {/* ========================================================= */}
        {/* Khối 2 (Phải): Course Trailer                             */}
        {/* ========================================================= */}
        <Card className="border-border/50 bg-card/60 shadow-xs flex flex-col justify-between overflow-hidden">
          <div>
            <CardHeader className="pb-3 border-b border-border/30">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <Icon icon="lucide:film" className="size-4 text-muted-foreground" />
                Video giới thiệu (Trailer)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {activeTrailer ? (
                /* Đã có video: Preview 16:9 với nút Play mở Modal Player */
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setIsVideoModalOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setIsVideoModalOpen(true);
                    }
                  }}
                  className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-950 border border-border/40 group cursor-pointer select-none flex items-center justify-center"
                  title="Nhấn để phát video trailer"
                >
                  {/* Video preview background with automatic thumbnail poster */}
                  <video
                    key={trailerPreviewKey}
                    src={activeTrailer}
                    poster={activePoster}
                    preload={activePoster ? 'none' : 'metadata'}
                    className="w-full h-full object-cover opacity-100"
                  />

                  {/* Play Button Overlay (Minimalist centered Play icon, bright & crystal clear) */}
                  <div className="absolute inset-0 flex items-center justify-center text-white bg-black/[0.07] group-hover:bg-black/[0.14] transition-colors">
                    <div className="size-13 rounded-full bg-white/20 dark:bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/30 text-white shadow-xl group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all duration-300">
                      <Icon icon="lucide:play" className="size-6 ml-0.5 fill-current" />
                    </div>
                  </div>

                  {/* Uploading Spinner Overlay */}
                  {isUploadingTrailer && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center text-white z-10 cursor-wait">
                      <Icon icon="lucide:loader-2" className="size-8 animate-spin text-white mb-2" />
                      <span className="text-xs font-semibold">
                        Đang lưu video lên MinIO... ({trailerProgress}%)
                      </span>
                      <div className="w-3/5 h-1.5 bg-white/20 rounded-full mt-2.5 overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-200 rounded-full"
                          style={{ width: `${trailerProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Chưa có video: Khung nét đứt Call-To-Action (Silent size limit) */
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (!readOnly && !isUploadingTrailer) {
                      trailerInputRef.current?.click();
                    }
                  }}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && !readOnly && !isUploadingTrailer) {
                      trailerInputRef.current?.click();
                    }
                  }}
                  className="relative aspect-video w-full rounded-xl border-2 border-dashed border-slate-300 dark:border-border/80 bg-slate-50 dark:bg-muted/20 hover:bg-slate-100/70 dark:hover:bg-muted/40 transition-colors flex flex-col items-center justify-center p-6 text-center select-none cursor-pointer group"
                >
                  {isUploadingTrailer ? (
                    <div className="flex flex-col items-center justify-center w-full">
                      <Icon icon="lucide:loader-2" className="size-8 animate-spin text-primary mb-2" />
                      <span className="text-xs font-semibold text-foreground">
                        Đang lưu video lên MinIO... ({trailerProgress}%)
                      </span>
                      <div className="w-1/2 h-1.5 bg-muted rounded-full mt-2.5 overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-200 rounded-full"
                          style={{ width: `${trailerProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="size-12 rounded-full bg-slate-200/60 dark:bg-muted flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                        <Icon
                          icon="lucide:film"
                          className="size-6 text-slate-400 dark:text-muted-foreground/60"
                        />
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        Chưa có video trailer giới thiệu
                      </p>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </div>

          {/* Thanh chân thẻ Trailer */}
          <div className="px-6 pb-5 pt-1 flex items-center justify-between gap-3">
            <span
              className="text-xs text-muted-foreground italic font-normal truncate max-w-[180px] sm:max-w-[240px]"
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
                'Chưa chọn file'
              )}
            </span>

            {!readOnly && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUploadingTrailer}
                onClick={() => trailerInputRef.current?.click()}
                className="rounded-xl text-xs font-semibold gap-2 border-border/60 shadow-xs hover:bg-muted/60 shrink-0"
              >
                {isUploadingTrailer ? (
                  <>
                    <Icon icon="lucide:loader-2" className="size-3.5 animate-spin text-muted-foreground" />
                    Đang tải... ({trailerProgress}%)
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
        </Card>
      </div>

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

      {/* ========================================================= */}
      {/* Lightbox Modal: Phóng to xem ảnh bìa Thumbnail           */}
      {/* ========================================================= */}
      <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
        <DialogContent className="sm:max-w-4xl max-w-4xl p-4 bg-background/95 backdrop-blur-md border-border/80">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
              <Icon icon="lucide:image" className="size-4.5 text-primary" />
              Ảnh bìa khóa học (Thumbnail)
            </DialogTitle>
          </DialogHeader>
          {activeThumbnail && (
            <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black/5 dark:bg-black/40 border border-border/40">
              <Image
                src={activeThumbnail}
                alt="Course Thumbnail Full"
                fill
                unoptimized
                className="object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* Video Player Modal: Xem và phát trực tiếp Video Trailer  */}
      {/* ========================================================= */}
      <Dialog open={isVideoModalOpen} onOpenChange={setIsVideoModalOpen}>
        <DialogContent className="sm:max-w-4xl max-w-4xl p-4 bg-background/95 backdrop-blur-md border-border/80">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
              <Icon icon="lucide:film" className="size-4.5 text-primary" />
              Video trailer giới thiệu khóa học
            </DialogTitle>
          </DialogHeader>
          {activeTrailer && (
            <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black border border-border/40 shadow-xl">
              <video
                key={trailerModalKey}
                src={activeTrailer}
                poster={activePoster}
                controls
                autoPlay
                className="w-full h-full aspect-video rounded-xl bg-black"
              >
                Trình duyệt của bạn không hỗ trợ phát thẻ video.
              </video>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
