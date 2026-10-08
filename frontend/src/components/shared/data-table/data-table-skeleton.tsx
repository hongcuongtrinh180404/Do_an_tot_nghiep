import * as React from 'react';
import { TableRow, TableCell } from '@/components/ui/table';

interface DataTableSkeletonProps {
  columnCount?: number;
  rowCount?: number;
}

export function DataTableSkeleton({
  columnCount = 5,
  rowCount = 6,
}: DataTableSkeletonProps): React.JSX.Element {
  return (
    <>
      {Array.from({ length: rowCount }).map((_, rowIndex) => (
        <TableRow key={`skeleton-row-${rowIndex}`} className="hover:bg-transparent">
          {Array.from({ length: columnCount }).map((_, colIndex) => (
            <TableCell key={`skeleton-col-${colIndex}`}>
              <div
                className="h-5 bg-muted/60 animate-pulse rounded-md"
                style={{
                  width: `${colIndex === 0 ? 60 : colIndex === 1 ? 80 : 50}%`,
                  maxWidth: '180px',
                }}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
