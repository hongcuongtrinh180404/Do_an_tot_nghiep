import { describe, expect, it } from 'vitest';
import {
  ADMIN_NAV_ITEMS,
  isAdminNavItemActive,
} from '../constants/admin-navigation';

const dashboardHref = '/admin';
const usersHref = '/admin/users';

describe('admin navigation', () => {
  it('points the overview tab at the admin root', () => {
    expect(ADMIN_NAV_ITEMS[0]).toMatchObject({ title: 'Tổng quan', href: dashboardHref });
  });

  it('highlights the overview only on the exact admin root', () => {
    expect(isAdminNavItemActive('/admin', dashboardHref)).toBe(true);
    expect(isAdminNavItemActive('/admin/', dashboardHref)).toBe(true);
    expect(isAdminNavItemActive('/admin/users', dashboardHref)).toBe(false);
  });

  it('keeps nested detail routes under their own tab', () => {
    expect(isAdminNavItemActive('/admin/users', usersHref)).toBe(true);
    expect(isAdminNavItemActive('/admin/users/abc123', usersHref)).toBe(true);
    expect(isAdminNavItemActive('/admin/revenue', usersHref)).toBe(false);
    expect(isAdminNavItemActive(null, usersHref)).toBe(false);
  });
});
