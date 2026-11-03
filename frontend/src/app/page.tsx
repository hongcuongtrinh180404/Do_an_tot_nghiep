'use client';

import React, { Suspense, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  PublicHeader,
  PublicHero,
  CategoryRail,
  FeaturedCourses,
  NewsHighlightsCarousel,
  RecentCourses,
  AiExperienceBanner,
  PublicFooter,
} from '@/features/course/components/public-discovery';

function HomeContent(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL state is single source of truth (Eliminates setState inside useEffect)
  const categoryParam = searchParams.get('category');
  const selectedCategorySlug = categoryParam && categoryParam.trim() !== '' ? categoryParam : 'all';
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handleSearchSubmit = (query: string): void => {
    setSearchQuery(query);
    // Smooth scroll to recent courses section to view filtered results
    const recentEl = document.getElementById('recent');
    if (recentEl) {
      recentEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSelectCategory = useCallback(
    (slug: string): void => {
      if (slug && slug !== 'all') {
        router.push(`/courses?category=${encodeURIComponent(slug)}`);
      } else {
        router.push('/courses');
      }
    },
    [router],
  );

  const handleClearFilters = useCallback((): void => {
    setSearchQuery('');
    router.push('/#recent', { scroll: false });
  }, [router]);

  return (
    <div className="min-h-[100dvh] w-full max-w-full overflow-x-hidden flex flex-col bg-background text-foreground selection:bg-foreground selection:text-background">
      {/* 1. Global Navigation Header */}
      <PublicHeader
        onSearchSubmit={handleSearchSubmit}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* 2. Main Discovery Flow */}
      <main className="flex-1 flex flex-col">
        {/* Hero Section with Interactive Live Preview Sandbox */}
        <PublicHero />

        {/* Featured Courses Showcase */}
        <FeaturedCourses />

        {/* Media Carousel / Horizontal Slider: News and highlights (Dark mode) */}
        <NewsHighlightsCarousel />

        {/* Category Explorer Grid (1:1 Aspect Ratio, 6 cols desktop, Domestika style) */}
        <CategoryRail
          selectedCategorySlug={selectedCategorySlug}
          onSelectCategory={handleSelectCategory}
        />

        {/* Recent Courses Catalog with Filters & Sort */}
        <RecentCourses
          selectedCategorySlug={selectedCategorySlug}
          searchQuery={searchQuery}
          onClearFilters={handleClearFilters}
        />

        {/* AI Learning Pipeline Experience Showcase */}
        <AiExperienceBanner />
      </main>

      {/* 3. Designed Closing Footer */}
      <PublicFooter />
    </div>
  );
}

export default function Home(): React.JSX.Element {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] w-full bg-background" />}>
      <HomeContent />
    </Suspense>
  );
}
