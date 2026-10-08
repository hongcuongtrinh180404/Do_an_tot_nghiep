import * as React from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Icon } from '@/components/ui/icon';

interface DataTableEmptyStateProps {
  colSpan: number;
  title?: string;
  description?: string;
  icon?: string;
}

export function DataTableEmptyState({
  colSpan,
  title = 'Không tìm thấy dữ liệu',
  description = 'Không có bản ghi nào phù hợp với điều kiện tìm kiếm hoặc bộ lọc hiện tại.',
  icon = 'lucide:inbox',
}: DataTableEmptyStateProps): React.JSX.Element {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="h-64 text-center">
        <div className="flex flex-col items-center justify-center space-y-3 py-8">
          <div className="size-12 rounded-xl bg-muted/80 border border-border/60 flex items-center justify-center text-muted-foreground shadow-2xs">
            <Icon icon={icon} className="size-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-foreground">{title}</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
              {description}
            </p>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}
