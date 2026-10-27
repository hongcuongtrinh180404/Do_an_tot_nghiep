'use client';

import React, { useState } from 'react';
import {
  PublicHeader,
  PublicHero,
  CategoryRail,
  FeaturedCourses,
  RecentCourses,
  AiExperienceBanner,
  PublicFooter,
} from '@/features/course/components/public-discovery';

export default function Home(): React.JSX.Element {
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handleSearchSubmit = (query: string): void => {
    setSearchQuery(query);
    // Smooth scroll to recent courses section to view filtered results
    const recentEl = document.getElementById('recent');
    if (recentEl) {
      recentEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSelectCategory = (slug: string): void => {
    setSelectedCategorySlug(slug);
    const recentEl = document.getElementById('recent');
    if (recentEl) {
      recentEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleClearFilters = (): void => {
    setSelectedCategorySlug('all');
    setSearchQuery('');
  };

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

        {/* Category Explorer Rail */}
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
