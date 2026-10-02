'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { decodeUtf8FileName, type IApiResponse, type ILessonContent } from 'share-lib';
import { apiClient } from '@/lib/api-client';

export const lessonContentKeys = {
  all: ['lesson-content'] as const,
  upload: () => [...lessonContentKeys.all, 'upload'] as const,
};

export const lessonContentApi = {
  async upload(file: File): Promise<ILessonContent> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await apiClient.post<IApiResponse<ILessonContent>>(
      '/lesson-content/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );
    return res.data.data;
  },

  async getStreamUrl(key: string): Promise<string> {
    const res = await apiClient.get<IApiResponse<{ url: string }>>(
      '/lesson-content/stream-url',
      {
        params: { key },
      },
    );
    return res.data.data.url;
  },
};

export function useUploadLessonContentMutation() {
  return useMutation({
    mutationFn: (file: File) => lessonContentApi.upload(file),
    onSuccess: (data: ILessonContent) => {
      const typeLabel = data.type === 'video' ? 'Video bài học' : 'Tài liệu bài học';
      const cleanFileName = decodeUtf8FileName(data.fileName);
      toast.success('Tải lên nội dung bài học thành công!', {
        description: `${typeLabel} "${cleanFileName || 'tập tin'}" đã được lưu trữ an toàn trên MinIO.`,
      });
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Không thể tải file lên máy chủ lưu trữ. Vui lòng kiểm tra lại kết nối hoặc file đã chọn.';
      toast.error('Lỗi upload file', {
        description: message || 'Quá trình upload thất bại. Vui lòng thử lại.',
      });
    },
  });
}
