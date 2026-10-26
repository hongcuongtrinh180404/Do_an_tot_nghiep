'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import {
  MOCK_CATEGORIES,
  type CategoryItem,
} from '../constants/mock-categories';
import { CategoriesTable } from './categories-table';
import { CategoryModal } from './category-modal';

export function CategoriesView(): React.JSX.Element {
  const [categories, setCategories] = React.useState<CategoryItem[]>(MOCK_CATEGORIES);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  // Lọc danh mục theo từ khóa tìm kiếm
  const filteredCategories = React.useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const query = searchQuery.trim().toLowerCase();
    return categories.filter(
      (cat) =>
        cat.name.toLowerCase().includes(query) ||
        cat.slug.toLowerCase().includes(query),
    );
  }, [categories, searchQuery]);

  // Thêm danh mục mới
  const handleSaveCategory = (data: {
    name: string;
    slug: string;
    imageUrl?: string;
  }) => {
    const newCategory: CategoryItem = {
      id: `cat-${Date.now()}`,
      name: data.name,
      slug: data.slug,
      courseCount: 0,
      iconName: 'lucide:folder',
      colorScheme: {
        bg: 'bg-primary/10',
        border: 'border-primary/20',
        text: 'text-primary',
      },
      imageUrl: data.imageUrl,
    };

    setCategories((prev) => [newCategory, ...prev]);
    toast.success('Đã lưu danh mục thành công!', {
      description: `Danh mục "${data.name}" đã được thêm vào hệ thống.`,
    });
  };

  // Trải nghiệm mẫu khi bấm sửa
  const handleEditCategory = (category: CategoryItem) => {
    toast.info(`[Giao diện mẫu] Chỉnh sửa danh mục: "${category.name}".`);
  };

  // Xóa danh mục khỏi state mẫu trên client
  const handleDeleteCategory = (categoryId: string) => {
    const target = categories.find((c) => c.id === categoryId);
    setCategories((prev) => prev.filter((c) => c.id !== categoryId));
    toast.success('Đã xóa danh mục thành công', {
      description: target ? `Đã gỡ "${target.name}" khỏi danh sách.` : undefined,
    });
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col p-4 sm:p-6 lg:p-8 space-y-6">
      {/* 1. Header & Nút Thêm Danh Mục Trên Cùng */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            Quản lý Danh mục
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Danh sách phân loại sản phẩm và số lượng khóa học liên kết.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <Icon icon="lucide:plus" className="size-4" />
          <span>Thêm danh mục mới</span>
        </button>
      </div>

      {/* 2. Bảng Danh Mục 3 Cột */}
      <div className="bg-card text-card-foreground rounded-2xl border border-border/80 shadow-xs overflow-hidden">
        {/* Toolbar Tìm kiếm & Đếm số lượng */}
        <div className="p-4 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Icon
              icon="lucide:search"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-3.5 pointer-events-none"
            />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm danh mục..."
              className="w-full text-xs pl-8 pr-3 py-2 bg-muted/40 border border-input rounded-xl outline-none focus:ring-2 focus:ring-foreground h-9"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                aria-label="Xóa tìm kiếm"
              >
                <Icon icon="lucide:x" className="size-3.5" />
              </button>
            )}
          </div>

          <span className="text-xs text-muted-foreground font-medium">
            Tổng cộng: {filteredCategories.length} danh mục
          </span>
        </div>

        {/* Bảng Danh mục */}
        <CategoriesTable
          categories={filteredCategories}
          onEdit={handleEditCategory}
          onDelete={handleDeleteCategory}
        />
      </div>

      {/* 3. Dialog / Modal Thêm Danh Mục Mới */}
      <CategoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveCategory}
      />
    </div>
  );
}
