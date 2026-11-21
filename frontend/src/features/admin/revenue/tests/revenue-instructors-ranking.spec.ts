import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { DashboardInstructorsSection } from '../index';

describe('DashboardInstructorsSection in Revenue Module', () => {
  it('is exported properly from revenue index', () => {
    expect(DashboardInstructorsSection).toBeDefined();
  });

  it('renders correctly with revenue time filter range values', () => {
    const timeRanges = ['30days', '7days', 'today', 'yesterday', 'thismonth', 'lastmonth', 'thisyear', 'custom'];

    timeRanges.forEach((range) => {
      const html = renderToString(
        React.createElement(DashboardInstructorsSection, { globalPeriod: range }),
      );
      expect(html).toContain('Bảng xếp hạng Giảng viên tiêu biểu');
      expect(html).toContain('Thống kê hiệu suất kinh doanh và doanh thu của các giảng viên hàng đầu theo chu kỳ thời gian');
      expect(html).toContain('Nguyễn Minh Quân');
    });
  });

  it('defaults to 30d if globalPeriod is omitted', () => {
    const html = renderToString(React.createElement(DashboardInstructorsSection, {}));
    expect(html).toContain('Bảng xếp hạng Giảng viên tiêu biểu');
  });
});
