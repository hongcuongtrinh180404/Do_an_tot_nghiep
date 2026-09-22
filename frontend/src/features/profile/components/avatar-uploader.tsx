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

    // Validate size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File quá lớn', {
        description: 'Dung lượng ảnh tối đa cho phép là 5MB.',
      });
      return;
    }

    // Instant local preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setFailedUrl(null);

    // Trigger upload to Cloudinary via backend
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
    // Reset input value to allow selecting same file again
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
    <div className="flex flex-col items-center sm:items-start gap-4">
      {/* Avatar Container with Hover & Drag Overlay */}
      <div
        className={`relative group size-32 sm:size-36 rounded-2xl overflow-hidden border-2 transition-all duration-200 cursor-pointer shadow-sm ${
          isDragOver
            ? 'border-primary ring-4 ring-primary/20 scale-105'
            : 'border-border/60 hover:border-primary/60 bg-muted/30'
        }`}
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            fileInputRef.current?.click();
          }
        }}
        aria-label="Tải ảnh đại diện"
      >
        {displayImage && failedUrl !== displayImage ? (
          <Image
            src={displayImage}
            alt={`Ảnh đại diện của ${userName}`}
            fill
            sizes="144px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => {
              if (displayImage) setFailedUrl(displayImage);
            }}
            priority
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-primary/5 to-muted text-primary">
            <span className="text-3xl sm:text-4xl font-bold tracking-wider select-none">
              {initialLetter}
            </span>
          </div>
        )}

        {/* Hover / Loading Overlay */}
        <div
          className={`absolute inset-0 bg-black/50 backdrop-blur-[2px] flex flex-col items-center justify-center text-white transition-opacity duration-200 ${
            uploadMutation.isPending
              ? 'opacity-100 cursor-wait'
              : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          {uploadMutation.isPending ? (
            <>
              <Icon
                icon="lucide:loader-2"
                className="size-7 animate-spin text-white mb-1"
              />
              <span className="text-[11px] font-medium tracking-wide">
                Đang lưu Cloud...
              </span>
            </>
          ) : (
            <>
              <Icon icon="lucide:camera" className="size-6 mb-1 drop-shadow" />
              <span className="text-[11px] font-medium tracking-wide drop-shadow">
                Đổi ảnh
              </span>
            </>
          )}
        </div>

        {/* Cloudinary Active Badge */}
        {displayImage && (
          <div
            className="absolute bottom-1 right-1 bg-background/80 backdrop-blur-xs p-1 rounded-full text-emerald-600 shadow"
            title="Lưu trữ trên Cloudinary"
          >
            <Icon icon="lucide:cloud" className="size-3.5" />
          </div>
        )}
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
      <div className="flex flex-col items-center sm:items-start text-center sm:text-left space-y-1.5">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
            className="h-8 text-xs font-medium"
          >
            <Icon icon="lucide:upload" className="size-3.5 mr-1.5" />
            {uploadMutation.isPending ? 'Đang upload...' : 'Chọn ảnh mới'}
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
              className="h-8 text-xs text-muted-foreground"
            >
              Hủy
            </Button>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground leading-tight">
          Hỗ trợ JPG, PNG, WEBP hoặc GIF (Tối đa 5MB). Tự động lưu lên Cloudinary.
        </p>
      </div>
    </div>
  );
}
