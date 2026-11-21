import React from 'react';
import { renderToString } from 'react-dom/server';
import { redirect } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminHomePage from '@/app/(admin)/admin/page';
import AdminDashboardPage from '@/app/(admin)/admin/dashboard/page';

vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock('@/features/admin/dashboard', () => ({
  AdminDashboardView: () => 'Admin dashboard content',
}));

describe('admin routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects the admin root to the dashboard route', () => {
    expect(() => AdminHomePage()).toThrow('NEXT_REDIRECT:/admin/dashboard');
    expect(redirect).toHaveBeenCalledExactlyOnceWith('/admin/dashboard');
  });

  it('renders the dashboard without redirecting back to the admin root', () => {
    const html = renderToString(React.createElement(AdminDashboardPage));

    expect(html).toContain('Admin dashboard content');
    expect(redirect).not.toHaveBeenCalled();
  });
});
