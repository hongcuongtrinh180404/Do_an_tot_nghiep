'use client';

import * as React from 'react';
import type { ICourseCategory } from 'share-lib';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DeleteConfirmDialog } from '@/components/shared/dialog/delete-confirm-dialog';
import {
  useAdminCategoriesQuery,
  useDeleteCategoryMutation,
  useSaveCategoryMutation,
} from '../api/categories-admin.api';
import { CategoriesTable } from './categories-table';
import { CategoryModal, type SaveCategoryFormData } from './category-modal';

export function CategoriesView(): React.JSX.Element {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<ICourseCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = React.useState<ICourseCategory | null>(null);

  const categoriesQuery = useAdminCategoriesQuery({});
  const saveMutation = useSaveCategoryMutation();
  const deleteMutation = useDeleteCategoryMutation();

  const categories = React.useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);

  const filteredCategories = React.useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const query = searchQuery.trim().toLowerCase();
    return categories.filter(
      (category) =>
        category.name.toLowerCase().includes(query) ||
        category.slug.toLowerCase().includes(query) ||
        (category.description ?? '').toLowerCase().includes(query),
    );
  }, [categories, searchQuery]);

  const activeCount = React.useMemo(
    () => categories.filter((category) => category.isActive).length,
    [categories],
  );

  const openCreateModal = () => {
    setEditingCategory(null);
    setIsModalOpen(true);
  };

  const openEditModal = (category: ICourseCategory) => {
    setEditingCategory(category);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (saveMutation.isPending) return;
    setIsModalOpen(false);
    setEditingCategory(null);
  };

  const handleSaveCategory = async (data: SaveCategoryFormData) => {
    const isEdit = Boolean(editingCategory);

    await saveMutation.mutateAsync({
      id: editingCategory?.id,
      payload: {
        name: data.name,
        slug: data.slug || undefined,
        description: isEdit ? data.description || null : data.description || undefined,
        order: data.order,
        isActive: data.isActive,
      },
      imageFile: data.imageFile,
    });

    setIsModalOpen(false);
    setEditingCategory(null);
  };

  const handleDeleteCategory = () => {
    if (!deletingCategory) return;

    deleteMutation.mutate(deletingCategory.id, {
      onSuccess: () => {
        setDeletingCategory(null);
      },
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
            Danh sách phân loại khóa học và số lượng khóa học liên kết.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <Icon icon="lucide:plus" className="size-4" />
          <span>Thêm danh mục mới</span>
        </button>
      </div>

      {/* 2. Bảng Danh Mục */}
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
              onChange={(event) => setSearchQuery(event.target.value)}
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

          <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
            <span>
              Tổng cộng: {filteredCategories.length} danh mục
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              {activeCount} đang hiển thị
            </span>
          </div>
        </div>

        {/* Bảng Danh mục */}
        {categoriesQuery.isLoading ? (
          <div className="py-12 px-4 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Icon icon="lucide:loader-2" className="size-6 animate-spin" />
            <p className="text-xs font-medium">Đang tải danh sách danh mục...</p>
          </div>
        ) : categoriesQuery.isError ? (
          <div className="py-12 px-4 text-center flex flex-col items-center justify-center space-y-3">
            <div className="size-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
              <Icon icon="lucide:alert-circle" className="size-6" />
            </div>
            <p className="text-sm font-semibold text-foreground">Không thể tải danh mục</p>
            <p className="text-xs text-muted-foreground">
              Đã xảy ra lỗi khi kết nối máy chủ. Vui lòng thử lại sau.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => {
                void categoriesQuery.refetch();
              }}
            >
              <Icon icon="lucide:refresh-cw" className="size-3.5 mr-1.5" />
              Thử lại
            </Button>
          </div>
        ) : (
          <CategoriesTable
            categories={filteredCategories}
            onEdit={openEditModal}
            onDelete={setDeletingCategory}
          />
        )}
      </div>

      {/* 3. Dialog / Modal Thêm Hoặc Sửa Danh Mục */}
      {isModalOpen ? (
        <CategoryModal
          isOpen={isModalOpen}
          onClose={closeModal}
          category={editingCategory}
          isSaving={saveMutation.isPending}
          onSave={handleSaveCategory}
        />
      ) : null}

      {/* 4. Dialog Xác nhận xóa */}
      <DeleteConfirmDialog
        open={Boolean(deletingCategory)}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) setDeletingCategory(null);
        }}
        itemName={deletingCategory?.name}
        description={
          deletingCategory && (deletingCategory.courseCount ?? 0) > 0
            ? `Danh mục "${deletingCategory.name}" đang có ${deletingCategory.courseCount} khóa học. Bạn cần chuyển các khóa học sang danh mục khác trước khi xóa.`
            : undefined
        }
        onConfirm={handleDeleteCategory}
        isLoading={deleteMutation.isPending}
        confirmText="Xóa danh mục"
      />
    </div>
  );
}
