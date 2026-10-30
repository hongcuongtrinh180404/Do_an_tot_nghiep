'use client';

import * as React from 'react';
import type { ICourseCategory } from 'share-lib';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

interface CategoriesTableProps {
  categories: ICourseCategory[];
  onEdit: (category: ICourseCategory) => void;
  onDelete: (category: ICourseCategory) => void;
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
            <th className="py-3 px-5 text-center w-32">Trạng thái</th>
            <th className="py-3 px-5 text-center w-32">Số khóa học</th>
            <th className="py-3 px-5 text-right w-24">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50 text-xs">
          {categories.map((category) => (
            <tr key={category.id} className="hover:bg-muted/40 transition-colors group">
              {/* Cột 1: Danh mục (Ảnh/Icon + Tên + Slug) */}
              <td className="py-3.5 px-5">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl border border-border/60 bg-muted/30 flex items-center justify-center shrink-0 overflow-hidden">
                    {category.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={category.imageUrl}
                        alt={category.name}
                        className="size-full object-contain p-0.5"
                      />
                    ) : (
                      <Icon icon="lucide:folder" className="size-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors truncate">
                      {category.name}
                    </p>
                    <p className="flex items-center gap-1 text-[11px] text-muted-foreground truncate mt-0.5">
                      <Icon icon="lucide:link" className="size-3 shrink-0 opacity-60" />
                      {category.slug}
                    </p>
                    {category.description ? (
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5 max-w-md">
                        {category.description}
                      </p>
                    ) : null}
                  </div>
                </div>
              </td>

              {/* Cột 2: Trạng thái */}
              <td className="py-3.5 px-5 text-center">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold',
                    category.isActive
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                      : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
                  )}
                >
                  <span
                    className={cn(
                      'size-1.5 rounded-full',
                      category.isActive ? 'bg-emerald-500' : 'bg-zinc-400',
                    )}
                  />
                  {category.isActive ? 'Hiển thị' : 'Tạm ẩn'}
                </span>
              </td>

              {/* Cột 3: Số khóa học */}
              <td className="py-3.5 px-5 text-center">
                <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-muted text-foreground/80">
                  {category.courseCount ?? 0} khóa
                </span>
              </td>

              {/* Cột 4: Thao tác (Sửa / Xóa) */}
              <td className="py-3.5 px-5 text-right space-x-1 whitespace-nowrap">
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
                  onClick={() => onDelete(category)}
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
