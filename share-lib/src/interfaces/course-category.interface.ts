/**
 * Tóm tắt danh mục được nhúng vào khóa học khi populate.
 */
export interface ICourseCategorySummary {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
}

/**
 * Danh mục/tag khóa học (collection `course_categories`).
 */
export interface ICourseCategory extends ICourseCategorySummary {
  description?: string | null;
  order: number;
  isActive: boolean;
  courseCount?: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;
  createdById?: string | null;
  updatedById?: string | null;
}

export interface ICreateCourseCategoryPayload {
  name: string;
  slug?: string;
  description?: string;
  order?: number;
  isActive?: boolean;
}

export interface IUpdateCourseCategoryPayload {
  name?: string;
  slug?: string;
  description?: string | null;
  order?: number;
  isActive?: boolean;
}
