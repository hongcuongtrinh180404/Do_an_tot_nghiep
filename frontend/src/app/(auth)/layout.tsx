import React from 'react';
import { AuthShowcaseCarousel } from '@/features/auth/components/auth-showcase-carousel';
import { AuthTopNav } from '@/features/auth/components/auth-top-nav';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps): React.JSX.Element {
  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2 bg-background">
      {/* Left Column: Focused Auth Form & Controls */}
      <div className="w-full min-h-screen flex flex-col p-4 sm:p-8 lg:p-10 overflow-y-auto bg-background">
        {/* Top Navigation Bar */}
        <AuthTopNav />

        {/* Centered Main Form Container */}
        <main className="flex-1 flex items-center justify-center py-4 sm:py-6 w-full">
          {children}
        </main>
      </div>

      {/* Right Column: Full-Bleed Showcase Image (Desktop Only, 50% Split) */}
      <div className="hidden lg:block relative w-full h-full min-h-screen overflow-hidden bg-slate-950">
        <AuthShowcaseCarousel />
      </div>
    </div>
  );
}
