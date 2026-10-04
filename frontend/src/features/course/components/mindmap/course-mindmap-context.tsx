'use client';

import { createContext, useContext } from 'react';

export interface CourseMindmapContextValue {
  onToggleSectionCollapse: (sectionId: string) => void;
  onToggleLessonCollapse: (lessonId: string) => void;
}

const CourseMindmapContext = createContext<CourseMindmapContextValue | null>(null);

export const CourseMindmapContextProvider = CourseMindmapContext.Provider;

export function useCourseMindmapContext(): CourseMindmapContextValue {
  const context = useContext(CourseMindmapContext);
  if (!context) {
    throw new Error('useCourseMindmapContext must be used within CourseMindmapContextProvider');
  }
  return context;
}
