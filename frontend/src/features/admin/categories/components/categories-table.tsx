'use client';

import * as React from 'react';
import { Icon } from '@/components/ui/icon';
import { type CategoryItem } from '../constants/mock-categories';

interface CategoriesTableProps {
  categories: CategoryItem[];
  onEdit: (category: CategoryItem) => void;
  onDelete: (categoryId: string) => void;
}

export function CategoriesTable({
  categories,
  onEdit,
  onDelete,
}: CategoriesTableProps): React.JSX.Element {
  if (categories.length === 0) {
    return (
      <div className="py-12 px-4 text-center flex flex-col items-center justify-center space-y-3">
        <div className="size-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
          <Icon icon="lucide:folder-x" className="size-6" />
        </div>
        <p className="text-sm font-semibold text-foreground">Không tìm thấy danh mục nào</p>
        <p className="text-xs text-muted-foreground">
          Hãy thử tìm kiếm với từ khóa khác hoặc bấm nút thêm danh mục mới.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-border/60 text-[11px] font-bold text-muted-foreground uppercase tracking-wider bg-muted/30">
            <th className="py-3 px-5">Danh mục</th>
            <th className="py-3 px-5 text-center w-40">Số khóa học</th>
            <th className="py-3 px-5 text-right w-24">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50 text-xs">
          {categories.map((category) => (
            <tr
              key={category.id}
              className="hover:bg-muted/40 transition-colors group"
            >
              {/* Cột 1: Danh mục (Icon + Tên + Slug) */}
              <td className="py-3.5 px-5">
                <div className="flex items-center gap-3">
                  <div
                    className={`size-10 rounded-xl border flex items-center justify-center shrink-0 overflow-hidden ${category.colorScheme.bg} ${category.colorScheme.border} ${category.colorScheme.text}`}
                  >
                    {category.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={category.imageUrl}
                        alt={category.name}
                        className="size-full object-cover"
                      />
                    ) : (
                      <Icon icon={category.iconName} className="size-5" />
                    )}
                  </div>
                  <p className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
                    {category.name}
                  </p>
                </div>
              </td>

              {/* Cột 2: Số khóa học */}
              <td className="py-3.5 px-5 text-center">
                <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-muted text-foreground/80">
                  {category.courseCount} khóa
                </span>
              </td>

              {/* Cột 3: Thao tác (Sửa / Xóa) */}
              <td className="py-3.5 px-5 text-right space-x-1">
                <button
                  type="button"
                  onClick={() => onEdit(category)}
                  className="p-1.5 text-muted-foreground hover:text-foreground transition rounded-md hover:bg-muted cursor-pointer"
                  title="Sửa danh mục"
                  aria-label={`Sửa danh mục ${category.name}`}
                >
                  <Icon icon="lucide:pencil" className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(category.id)}
                  className="p-1.5 text-muted-foreground hover:text-rose-600 transition rounded-md hover:bg-rose-500/10 cursor-pointer"
                  title="Xóa danh mục"
                  aria-label={`Xóa danh mục ${category.name}`}
                >
                  <Icon icon="lucide:trash-2" className="size-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
