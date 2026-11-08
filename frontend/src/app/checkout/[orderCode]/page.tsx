import type { Metadata } from 'next';
import React, { Suspense } from 'react';
import { PublicHeader, PublicFooter } from '@/features/course/components/public-discovery';
import { CheckoutView } from '@/features/payment/components/checkout-view';

export const metadata: Metadata = {
  title: 'Thanh toán đơn hàng | Mindly - Nền tảng E-Learning AI',
  description: 'Thanh toán chuyển khoản ngân hàng qua VietQR và SePay',
};

interface CheckoutPageProps {
  params: Promise<{
    orderCode: string;
  }>;
}

export default async function CheckoutPage({ params }: CheckoutPageProps): Promise<React.JSX.Element> {
  const { orderCode } = await params;

  return (
    <div className="min-h-[100dvh] w-full flex flex-col bg-background text-foreground">
      <Suspense fallback={<div className="h-16 w-full bg-neutral-900" />}>
        <PublicHeader />
      </Suspense>

      <main className="flex-1">
        <CheckoutView orderCode={orderCode} />
      </main>

      <PublicFooter />
    </div>
  );
}

