import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { PaymentSuccess } from '../components/payment-success';

vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}));

describe('PaymentSuccess component', () => {
  it('renders order summary details and call-to-action buttons', () => {
    const html = renderToStaticMarkup(
      <PaymentSuccess
        courseTitle="NestJS Microservices Chuyên Sâu"
        orderCode="MD9876543210"
        amount="799.000 ₫"
        onStartLearning={() => {}}
        onViewMyCourses={() => {}}
      />
    );

    // Verify course title, order code, and amount
    expect(html).toContain('NestJS Microservices Chuyên Sâu');
    expect(html).toContain('MD9876543210');
    expect(html).toContain('799.000 ₫');

    // Verify status badge and heading
    expect(html).toContain('Kích hoạt khóa học thành công');
    expect(html).toContain('Thanh toán hoàn tất!');

    // Verify action buttons
    expect(html).toContain('Vào học ngay');
    expect(html).toContain('Xem khóa học đã mua');
  });

  it('guarantees NO automatic redirection countdown or auto-redirect progress bar', () => {
    const html = renderToStaticMarkup(
      <PaymentSuccess
        courseTitle="Khoá học thử nghiệm"
        orderCode="MDKIEMTRA123"
        amount="100.000 ₫"
        onStartLearning={() => {}}
      />
    );

    // Ensure auto-redirect texts and elements are absent
    expect(html).not.toContain('Tự động chuyển');
    expect(html).not.toContain('countdown');
    expect(html).not.toContain('chuyển vào bài học sau');
  });

  it('renders SVG checkmark with animation classes for smooth visual feedback', () => {
    const html = renderToStaticMarkup(
      <PaymentSuccess
        onStartLearning={() => {}}
      />
    );

    expect(html).toContain('animate-draw-check');
    expect(html).toContain('animate-circle-pop');
    expect(html).toContain('animate-halo');
    expect(html).toContain('animate-card-enter');
  });
});
