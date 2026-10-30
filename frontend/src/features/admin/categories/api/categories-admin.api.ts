'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  IApiResponse,
  ICourseCategory,
  ICreateCourseCategoryPayload,
  IUpdateCourseCategoryPayload,
} from 'share-lib';
import { apiClient } from '@/lib/api-client';
import { useIsMounted } from '@/hooks/use-is-mounted';

export interface AdminCategoriesQueryParams {
  search?: string;
  isActive?: boolean;
}

export interface SaveCategoryVariables {
  id?: string;
  payload: ICreateCourseCategoryPayload | IUpdateCourseCategoryPayload;
  imageFile?: File | null;
}

export interface SaveCategoryResult {
  category: ICourseCategory;
  isEdit: boolean;
  imageUploadError?: string;
}

export const categoriesAdminKeys = {
  all: ['admin-course-categories'] as const,
  list: (params: AdminCategoriesQueryParams) =>
    [...categoriesAdminKeys.all, 'list', params] as const,
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const raw = (error as { response?: { data?: { message?: string | string[] } } }).response
      ?.data?.message;
    if (Array.isArray(raw)) return raw.join(', ');
    if (typeof raw === 'string' && raw.trim()) return raw;
  }
  return fallback;
}

export const categoriesAdminApi = {
  async getCategories(params: AdminCategoriesQueryParams): Promise<ICourseCategory[]> {
    const queryParams: Record<string, string | boolean> = {};

    if (params.search?.trim()) {
      queryParams.search = params.search.trim();
    }

    if (params.isActive !== undefined) {
      queryParams.isActive = params.isActive;
    }

    const res = await apiClient.get<IApiResponse<ICourseCategory[]>>(
      '/course-categories/admin',
      { params: queryParams },
    );

    return res.data.data;
  },

  async createCategory(payload: ICreateCourseCategoryPayload): Promise<ICourseCategory> {
    const res = await apiClient.post<IApiResponse<ICourseCategory>>(
      '/course-categories',
      payload,
    );
    return res.data.data;
  },

  async updateCategory(
    id: string,
    payload: IUpdateCourseCategoryPayload,
  ): Promise<ICourseCategory> {
    const res = await apiClient.patch<IApiResponse<ICourseCategory>>(
      `/course-categories/${id}`,
      payload,
    );
    return res.data.data;
  },

  async uploadImage(id: string, file: File): Promise<ICourseCategory> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await apiClient.patch<IApiResponse<ICourseCategory>>(
      `/course-categories/${id}/image`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000,
      },
    );

    return res.data.data;
  },

  async deleteCategory(id: string): Promise<null> {
    const res = await apiClient.delete<IApiResponse<null>>(`/course-categories/${id}`);
    return res.data.data;
  },
};

export function useAdminCategoriesQuery(params: AdminCategoriesQueryParams) {
  const isMounted = useIsMounted();

  return useQuery({
    queryKey: categoriesAdminKeys.list(params),
    queryFn: () => categoriesAdminApi.getCategories(params),
    enabled: isMounted,
    staleTime: 30 * 1000,
  });
}

export function useSaveCategoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
      imageFile,
    }: SaveCategoryVariables): Promise<SaveCategoryResult> => {
      const isEdit = Boolean(id);

      let category = isEdit
        ? await categoriesAdminApi.updateCategory(id as string, payload)
        : await categoriesAdminApi.createCategory(payload as ICreateCourseCategoryPayload);

      let imageUploadError: string | undefined;

      if (imageFile) {
        try {
          category = await categoriesAdminApi.uploadImage(category.id, imageFile);
        } catch (error: unknown) {
          // The category itself was saved successfully. Keep the flow successful
          // so retrying does not create a duplicate category, and warn the user.
          imageUploadError = getErrorMessage(
            error,
            'Không thể tải ảnh danh mục lên máy chủ.',
          );
        }
      }

      return { category, isEdit, imageUploadError };
    },
    onSuccess: ({ category, isEdit, imageUploadError }) => {
      void queryClient.invalidateQueries({ queryKey: categoriesAdminKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['course-categories'] });

      toast.success(isEdit ? 'Cập nhật danh mục thành công!' : 'Tạo danh mục thành công!', {
        description: `Danh mục "${category.name}" đã được lưu vào hệ thống.`,
      });

      if (imageUploadError) {
        toast.warning('Đã lưu danh mục nhưng tải ảnh thất bại', {
          description: imageUploadError,
        });
      }
    },
    onError: (error: unknown) => {
      toast.error('Lỗi lưu danh mục', {
        description: getErrorMessage(error, 'Không thể lưu danh mục. Vui lòng thử lại sau.'),
      });
    },
  });
}

export function useDeleteCategoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => categoriesAdminApi.deleteCategory(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: categoriesAdminKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['course-categories'] });
      toast.success('Xóa danh mục thành công', {
        description: 'Danh mục đã được chuyển vào trạng thái xóa mềm.',
      });
    },
    onError: (error: unknown) => {
      toast.error('Lỗi xóa danh mục', {
        description: getErrorMessage(
          error,
          'Không thể xóa danh mục. Vui lòng thử lại sau.',
        ),
      });
    },
  });
}
