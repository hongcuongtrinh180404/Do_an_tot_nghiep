'use client';

import * as React from 'react';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; slug: string; imageUrl?: string }) => void;
}

// Hàm chuyển đổi tiếng Việt có dấu thành slug URL thân thiện SEO
function toSlug(str: string): string {
  return (
    '/' +
    str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/([^0-9a-z-\s])/g, '')
      .replace(/(\s+)/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
  );
}

export function CategoryModal({
  isOpen,
  onClose,
  onSave,
}: CategoryModalProps): React.JSX.Element | null {
  const [name, setName] = React.useState('');
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [fileName, setFileName] = React.useState('');
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Reset form khi đóng mở
  React.useEffect(() => {
    if (isOpen) {
      setName('');
      setPreviewUrl(null);
      setFileName('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const slug = name.trim() ? toSlug(name.trim()) : '/';

  // Xử lý chọn file ảnh
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Xóa ảnh đã chọn
  const handleRemoveImage = () => {
    setPreviewUrl(null);
    setFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Submit form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      slug,
      imageUrl: previewUrl || undefined,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-card text-card-foreground rounded-2xl max-w-md w-full shadow-2xl border border-border overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Dialog */}
        <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
          <h3 className="font-bold text-foreground text-base">Thêm danh mục mới</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition cursor-pointer p-1 rounded-md"
            aria-label="Đóng"
          >
            <Icon icon="lucide:x" className="size-4" />
          </button>
        </div>

        {/* Form Dialog */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* 1. Tên danh mục */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Tên danh mục <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Lập trình - Website"
              className="w-full text-xs px-3.5 py-2.5 bg-background border border-input rounded-xl outline-none focus:border-foreground focus:ring-1 focus:ring-foreground transition"
            />
            {name.trim() && (
              <p className="text-[11px] text-muted-foreground font-mono mt-1">
                Đường dẫn tĩnh (Slug): <span className="text-primary font-semibold">{slug}</span>
              </p>
            )}
          </div>

          {/* 2. Upload Hình ảnh / Biểu tượng */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Hình ảnh / Biểu tượng danh mục
            </label>

            <div className="relative">
              {/* Khung khi chưa có ảnh */}
              {!previewUrl ? (
                <label
                  htmlFor="category-image-input"
                  className="border-2 border-dashed border-border/80 hover:border-foreground/40 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer bg-muted/20 hover:bg-muted/40 transition text-center group"
                >
                  <div className="size-10 rounded-full bg-background shadow-xs border border-border flex items-center justify-center text-muted-foreground group-hover:text-foreground mb-2 transition">
                    <Icon icon="lucide:cloud-upload" className="size-5" />
                  </div>
                  <span className="text-xs font-medium text-foreground">Tải ảnh hoặc icon lên</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">
                    Hỗ trợ PNG, JPG, SVG (Tối đa 2MB)
                  </span>
                </label>
              ) : (
                /* Khung Preview khi đã chọn file */
                <div className="border border-border rounded-xl p-3 flex items-center justify-between bg-muted/30">
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Icon Preview"
                      className="size-10 rounded-lg object-cover border border-border bg-background"
                    />
                    <div className="truncate max-w-[180px]">
                      <p className="text-xs font-medium text-foreground truncate">{fileName}</p>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        Sẵn sàng tải lên
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="p-1.5 text-muted-foreground hover:text-rose-600 rounded-lg transition cursor-pointer"
                    title="Xóa ảnh này"
                  >
                    <Icon icon="lucide:trash-2" className="size-4" />
                  </button>
                </div>
              )}

              {/* Input File ẩn */}
              <input
                ref={fileInputRef}
                type="file"
                id="category-image-input"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-xs font-semibold cursor-pointer rounded-xl px-4 py-2"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              size="sm"
              className="text-xs font-semibold cursor-pointer rounded-xl px-4 py-2 bg-foreground text-background hover:bg-foreground/90 shadow-xs"
            >
              Lưu danh mục
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
