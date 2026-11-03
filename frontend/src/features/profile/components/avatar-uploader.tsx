'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { useUploadAvatarMutation } from '../api/profile.api';

interface AvatarUploaderProps {
  currentAvatar?: string | null;
  userName?: string;
}

export function AvatarUploader({
  currentAvatar,
  userName = 'User',
}: AvatarUploaderProps): React.JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const uploadMutation = useUploadAvatarMutation();

  const handleFileSelection = (file: File) => {
    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast.error('Định dạng không hợp lệ', {
        description: 'Vui lòng chọn file ảnh JPG, PNG, WEBP hoặc GIF.',
      });
      return;
    }

    // Validate size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Dung lượng ảnh quá lớn', {
        description: 'Dung lượng ảnh tối đa cho phép là 10MB.',
      });
      return;
    }

    // Instant local preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setFailedUrl(null);

    // Trigger upload
    uploadMutation.mutate(file, {
      onError: () => {
        // Revert local preview on failure
        setPreviewUrl(null);
      },
    });
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelection(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelection(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const displayImage = previewUrl || currentAvatar;
  const initialLetter = userName.trim().charAt(0).toUpperCase() || 'U';

  return (
    <div className="flex flex-col items-start gap-3.5 w-full">
      {/* Avatar Container with Hover & Drag Overlay */}
      <div
        className={`relative group size-28 rounded-2xl overflow-hidden border transition-all duration-150 cursor-pointer ${isDragOver
            ? 'border-foreground ring-2 ring-foreground/20 scale-102'
            : 'border-border/80 hover:border-foreground/40 bg-muted/30'
          } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground`}
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        aria-label="Tải ảnh đại diện mới"
      >
        {displayImage && failedUrl !== displayImage ? (
          <Image
            src={displayImage}
            alt={`Ảnh đại diện của ${userName}`}
            fill
            sizes="128px"
            className="object-cover transition-transform duration-200 group-hover:scale-105"
            onError={() => {
              if (displayImage) setFailedUrl(displayImage);
            }}
            priority
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted/60 text-foreground font-semibold">
            <span className="text-3xl select-none font-medium">
              {initialLetter}
            </span>
          </div>
        )}

        {/* Hover / Loading Overlay */}
        <div
          className={`absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white transition-opacity duration-150 ${uploadMutation.isPending
              ? 'opacity-100 cursor-wait'
              : 'opacity-0 group-hover:opacity-100'
            }`}
        >
          {uploadMutation.isPending ? (
            <>
              <Icon
                icon="lucide:loader-2"
                className="size-6 animate-spin text-white mb-1"
              />
              <span className="text-[11px] font-medium tracking-wide">
                Đang tải lên...
              </span>
            </>
          ) : (
            <>
              <Icon icon="lucide:camera" className="size-5 mb-1 text-white" />
              <span className="text-[11px] font-medium tracking-wide">
                Đổi ảnh
              </span>
            </>
          )}
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={onInputChange}
        disabled={uploadMutation.isPending}
      />

      {/* Control Actions & Guideline */}
      <div className="flex flex-col items-start text-left space-y-1.5 w-full">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
            className="h-8 text-xs font-medium border-border/80"
          >
            <Icon icon="lucide:upload" className="size-3.5 mr-1.5" />
            {uploadMutation.isPending ? 'Đang tải lên...' : 'Tải ảnh mới'}
          </Button>

          {previewUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setPreviewUrl(null);
                setFailedUrl(null);
              }}
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
            >
              Hủy
            </Button>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground max-w-[260px] leading-tight">
          Hỗ trợ JPG, PNG, WEBP (Tối đa 10MB). Khuyến nghị ảnh vuông tỉ lệ 1:1.
        </p>
      </div>
    </div>
  );
}
