import type { IApiResponse, ICourseMindmap } from 'share-lib';
import { apiClient } from '@/lib/api-client';

export const courseMindmapKeys = {
  all: ['course-mindmap'] as const,
  detail: (courseId: string) => [...courseMindmapKeys.all, 'detail', courseId] as const,
};

export interface IUpsertMindmapPayload {
  mindmapData: Record<string, unknown>;
}

export const courseMindmapApi = {
  /**
   * Lấy dữ liệu cấu trúc Mindmap đã lưu của khóa học
   */
  async getMindmap(courseId: string): Promise<Record<string, unknown> | null> {
    const res = await apiClient.get<IApiResponse<Record<string, unknown> | null>>(
      `/courses/${courseId}/mindmap`,
    );
    return res.data.data;
  },

  /**
   * Lưu snapshot cấu trúc Mindmap lên cơ sở dữ liệu
   */
  async upsertMindmap(
    courseId: string,
    mindmapData: Record<string, unknown>,
  ): Promise<ICourseMindmap> {
    const res = await apiClient.put<IApiResponse<ICourseMindmap>>(
      `/courses/${courseId}/mindmap`,
      { mindmapData },
    );
    return res.data.data;
  },
};
