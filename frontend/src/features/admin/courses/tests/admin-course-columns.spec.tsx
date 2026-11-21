// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CourseLevelEnum, CourseStatusEnum, type ICourse } from 'share-lib';
import { createAdminCourseColumns } from '../components/admin-course-columns';

vi.mock('next/link', () => ({
  default: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props} />,
}));
vi.mock('@/components/ui/icon', () => ({ Icon: () => <span aria-hidden="true" /> }));
vi.mock('@/components/shared/data-table', () => ({ DataTableColumnHeader: () => null }));

describe('Admin course view action', () => {
  let container: HTMLDivElement;
  let root: Root;
  const onApprove = vi.fn();
  const onReject = vi.fn();

  function Harness({ status }: { status: CourseStatusEnum }) {
    const table = useReactTable({
      data: [{
        id: 'course-1', title: 'Khoa học trong nấu ăn', slug: 'khoa-hoc-trong-nau-an',
        instructorId: 'instructor', price: 0, level: CourseLevelEnum.BEGINNER,
        status, createdAt: '2026-11-01', updatedAt: '2026-11-01',
      } satisfies ICourse],
      columns: createAdminCourseColumns({ onApprove, onReject }),
      getCoreRowModel: getCoreRowModel(),
    });
    const cell = table.getRowModel().rows[0].getAllCells().find((cell) => cell.column.id === 'actions')!;
    return <>{flexRender(cell.column.columnDef.cell, cell.getContext())}</>;
  }

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it.each(Object.values(CourseStatusEnum))('opens %s in learner mode, never edit mode', (status) => {
    act(() => root.render(<Harness status={status} />));
    const link = container.querySelector('a')!;
    expect(link.textContent).toBe('Xem');
    expect(link.getAttribute('href')).toBe('/courses/course-1');
    expect(link.title).toBe('Xem khóa học ở chế độ học viên');
    expect(link.target).toBe('_blank');
    expect(link.rel).toBe('noopener noreferrer');
    expect(container.querySelector('a[href*="mode=edit"]')).toBeNull();
    expect(onApprove).not.toHaveBeenCalled();
    expect(onReject).not.toHaveBeenCalled();
  });

  it('keeps approval and change-request actions on the admin list', () => {
    act(() => root.render(<Harness status={CourseStatusEnum.PENDING_APPROVAL} />));
    const buttons = container.querySelectorAll('button');
    act(() => buttons[0].click());
    act(() => buttons[1].click());
    expect(onApprove).toHaveBeenCalledWith(expect.objectContaining({ id: 'course-1' }));
    expect(onReject).toHaveBeenCalledWith(expect.objectContaining({ id: 'course-1' }));
  });
});
