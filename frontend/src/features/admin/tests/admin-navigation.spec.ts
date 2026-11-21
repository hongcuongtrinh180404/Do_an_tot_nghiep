import { describe, expect, it } from 'vitest';
import {
  ADMIN_NAV_ITEMS,
  isAdminNavItemActive,
} from '../constants/admin-navigation';

const dashboardHref = '/admin/dashboard';
const usersHref = '/admin/users';

describe('admin navigation', () => {
  it('points the overview tab at the dashboard route', () => {
    expect(ADMIN_NAV_ITEMS[0]).toMatchObject({ title: 'Tổng quan', href: dashboardHref });
  });

  it('highlights the overview only on the exact dashboard route', () => {
    expect(isAdminNavItemActive('/admin/dashboard', dashboardHref)).toBe(true);
    expect(isAdminNavItemActive('/admin/dashboard/', dashboardHref)).toBe(true);
    expect(isAdminNavItemActive('/admin', dashboardHref)).toBe(false);
    expect(isAdminNavItemActive('/admin/dashboard/details', dashboardHref)).toBe(false);
    expect(isAdminNavItemActive('/admin/dashboard-other', dashboardHref)).toBe(false);
    expect(isAdminNavItemActive('/admin/users', dashboardHref)).toBe(false);
  });

  it('keeps nested detail routes under their own tab', () => {
    expect(isAdminNavItemActive('/admin/users', usersHref)).toBe(true);
    expect(isAdminNavItemActive('/admin/users/abc123', usersHref)).toBe(true);
    expect(isAdminNavItemActive('/admin/revenue', usersHref)).toBe(false);
    expect(isAdminNavItemActive(null, usersHref)).toBe(false);
  });

  it('places instructor approval nav item immediately after course approval', () => {
    const courseIndex = ADMIN_NAV_ITEMS.findIndex((item) => item.href === '/admin/courses');
    const instructorIndex = ADMIN_NAV_ITEMS.findIndex((item) => item.href === '/admin/instructors');

    expect(courseIndex).toBeGreaterThanOrEqual(0);
    expect(instructorIndex).toBe(courseIndex + 1);
    expect(ADMIN_NAV_ITEMS[instructorIndex]).toMatchObject({
      title: 'Phê duyệt giảng viên',
      href: '/admin/instructors',
      icon: 'lucide:user-check',
    });
  });

  it('matches instructor approval route and nested sub-routes', () => {
    const instructorsHref = '/admin/instructors';
    expect(isAdminNavItemActive('/admin/instructors', instructorsHref)).toBe(true);
    expect(isAdminNavItemActive('/admin/instructors/app-123', instructorsHref)).toBe(true);
    expect(isAdminNavItemActive('/admin/courses', instructorsHref)).toBe(false);
  });

  it('does not include removed tabs (promotions, settings)', () => {
    const routes = ADMIN_NAV_ITEMS.map((item) => item.href);
    expect(routes).not.toContain('/admin/promotions');
    expect(routes).not.toContain('/admin/settings');
  });
});
