# Giai Đoạn 4: Summary Frontend & Xử Lý Trạng Thái UI

> **Thuộc kế hoạch:** [`docs/chatbot/plan-rabbitmq-ai-jobs/README.md`](./README.md)  
> **Trạng thái:** Sẵn sàng thực hiện  
> **Giai đoạn trước:** [`phase-3-summary-backend.md`](./phase-3-summary-backend.md)  
> **Mục tiêu:** Nâng cấp Frontend (Next.js) để tương thích với phản hồi bất đồng bộ HTTP 202, theo dõi tiến độ Job qua cơ chế Polling thông minh, hiển thị giao diện trạng thái bền vững xuyên suốt reload trang/mất mạng, và cho phép retry thủ công.

---

## 1. Mục Tiêu Giai Đoạn

1. **Tương Thích Ngược & Tiến:** Frontend xử lý mượt mà cả 2 trường hợp: Backend trả về kết quả ngay (HTTP 200 - cũ) hoặc tiếp nhận Job (HTTP 202 kèm `jobId` - mới).
2. **Quản Lý Trạng Thái Bền Vững (Persistent Job State):** Không dựa vào state cục bộ `isPending` trong component; sử dụng React Query đồng bộ với server state để khi reload trang, đổi tab, hay mở trên thiết bị khác, trạng thái Job vẫn được phục hồi nguyên vẹn.
3. **Polling Thông Minh Có Backoff:**
   - Khi Job `processing`: Polling mỗi 2–3 giây.
   - Khi Job `queued` lâu: Giãn polling mỗi 5–10 giây.
   - Khi Job `completed` hoặc `failed`: Lập tức dừng polling.
   - Tự động kích hoạt refetch khi người dùng quay lại tab trình duyệt (`refetchOnWindowFocus: true`) hoặc khi mạng kết nối lại.
4. **Trải Nghiệm Người Dùng Rõ Ràng:**
   - Hiển thị đầy đủ các giai đoạn: Đang xếp hàng (`queued`), Đang gọi AI (`calling_ai`), Đang lưu kết quả (`saving_result`), Chờ thử lại (`waiting_retry`), Thất bại (`failed`).
   - Vô hiệu hóa nút bấm tạo mới khi đang có Job `active`.
   - Cung cấp nút "Thử lại" (Retry) trực quan khi Job bị lỗi.
5. **Cập Nhật Dữ Liệu Tức Thì (Cache Invalidation):** Chỉ invalidate cache của Summary và approval checklist sau khi Job đã chuyển sang `completed`, không invalidate ngay lúc vừa enqueue.

---

## 2. Thiết Kế Kỹ Thuật Chi Tiết

### 2.1. API Client Mới (`frontend/src/features/course/api/analysis-jobs.api.ts`)

```typescript
import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/types/api-response';

export interface AnalysisJobResponse {
  id: string;
  lessonId: string;
  type: 'summary' | 'quiz' | 'mindmap' | 'transcription';
  status: 'queued' | 'processing' | 'completed' | 'failed';
  phase: 'waiting_dispatch' | 'waiting_worker' | 'waiting_retry' | 'calling_ai' | 'saving_result';
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  startedAt: string | null;
  nextRunAt: string | null;
  error: {
    code: string;
    message: string;
  } | null;
}

export const analysisJobsApi = {
  getLessonJobs: (lessonId: string) =>
    apiClient.get<ApiResponse<AnalysisJobResponse[]>>(`/lessons/${lessonId}/analysis/jobs`),

  getJobById: (lessonId: string, jobId: string) =>
    apiClient.get<ApiResponse<AnalysisJobResponse>>(`/lessons/${lessonId}/analysis/jobs/${jobId}`),

  retryJob: (lessonId: string, jobId: string) =>
    apiClient.post<ApiResponse<AnalysisJobResponse>>(`/lessons/${lessonId}/analysis/jobs/${jobId}/retry`),
};
```

### 2.2. Custom Hook Polling Thông Minh (`frontend/src/features/course/hooks/use-analysis-jobs.ts`)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { analysisJobsApi, AnalysisJobResponse } from '../api/analysis-jobs.api';

export function useLessonAnalysisJob(lessonId: string, type: 'summary' | 'quiz' | 'mindmap') {
  const queryClient = useQueryClient();

  const queryKey = ['lesson-analysis-job', lessonId, type];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await analysisJobsApi.getLessonJobs(lessonId);
      const jobs = response.data.data;
      // Tìm job đang active hoặc job gần nhất
      const activeJob = jobs.find((j) => j.type === type && (j.status === 'queued' || j.status === 'processing'));
      return activeJob || jobs.filter((j) => j.type === type)[0] || null;
    },
    enabled: !!lessonId,
    refetchOnWindowFocus: true, // Ghi đè cấu hình mặc định để bắt kịp tiến độ khi đổi tab
    refetchInterval: (query) => {
      const job = query.state.data;
      if (!job) return false;
      if (job.status === 'processing') return 2500; // Polling 2.5s khi đang xử lý
      if (job.status === 'queued') return 5000;     // Polling 5s khi đang xếp hàng
      return false; // Dừng polling khi completed hoặc failed
    },
  });

  // Tự động invalidate dữ liệu tóm tắt khi Job hoàn tất
  const activeJob = query.data;
  if (activeJob?.status === 'completed') {
    queryClient.invalidateQueries({ queryKey: ['lesson-summary', lessonId] });
  }

  const retryMutation = useMutation({
    mutationFn: (jobId: string) => analysisJobsApi.retryJob(lessonId, jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    job: activeJob,
    isLoading: query.isLoading,
    isProcessing: activeJob?.status === 'queued' || activeJob?.status === 'processing',
    retryJob: retryMutation.mutate,
    isRetrying: retryMutation.isPending,
  };
}
```

### 2.3. Component Hiển Thị Trạng Thái Job (`analysis-job-status.tsx`)

Xây dựng banner thông báo trạng thái gắn trực tiếp trong tab tóm tắt:

```tsx
export function AnalysisJobStatusBanner({ job, onRetry, isRetrying }: Props) {
  if (!job || job.status === 'completed') return null;

  return (
    <div className="rounded-lg border p-4 mb-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {job.status === 'queued' && (
          <Clock className="w-5 h-5 text-amber-500 animate-pulse" />
        )}
        {job.status === 'processing' && (
          <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
        )}
        {job.status === 'failed' && (
          <AlertCircle className="w-5 h-5 text-rose-500" />
        )}
        <div>
          <h4 className="font-medium text-sm">
            {job.status === 'queued' && 'Đang xếp hàng chờ xử lý...'}
            {job.status === 'processing' && (job.phase === 'calling_ai' ? 'AI đang phân tích và tạo tóm tắt...' : 'Đang hoàn tất lưu kết quả...')}
            {job.status === 'failed' && 'Không thể tạo tóm tắt bài học'}
          </h4>
          <p className="text-xs text-muted-foreground">
            {job.status === 'failed' ? job.error?.message || 'Đã có lỗi xảy ra' : 'Bạn có thể chuyển trang khác, tác vụ vẫn tiếp tục chạy.'}
          </p>
        </div>
      </div>
      {job.status === 'failed' && (
        <Button size="sm" variant="outline" onClick={() => onRetry(job.id)} disabled={isRetrying}>
          {isRetrying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Thử lại'}
        </Button>
      )}
    </div>
  );
}
```

---

## 3. Ma Trận File Thay Đổi

| File | Hành động | Mục đích |
|---|---|---|
| `frontend/src/features/course/api/analysis-jobs.api.ts` | **Tạo mới** | API client gọi các endpoints Job (`GET /jobs`, `POST /retry`) |
| `frontend/src/features/course/hooks/use-analysis-jobs.ts` | **Tạo mới** | React Query hook xử lý polling, cache invalidation và retry |
| `frontend/src/features/course/components/player/analysis-job-status.tsx` | **Tạo mới** | UI component hiển thị trạng thái xử lý AI thời gian thực |
| `frontend/src/features/course/api/transcript-analysis.api.ts` | Chỉnh sửa | Xử lý phản hồi đa hình (cả `200 OK` và `202 Accepted`) |
| `frontend/src/features/course/components/player/lesson-tabs-container.tsx` | Chỉnh sửa | Đồng bộ state Job để hiển thị indicator trên tiêu đề Tab |
| `frontend/src/features/course/components/player/tabs/lesson-summary-tab.tsx` | Chỉnh sửa | Nhúng banner trạng thái, vô hiệu hóa nút submit khi có Job active |

---

## 4. Danh Sách Nhiệm Vụ Cụ Thể (Checklist)

- [ ] Tạo API client `analysis-jobs.api.ts` kết nối với Backend.
- [ ] Xây dựng hook `useLessonAnalysisJob` hỗ trợ polling thích ứng (adaptive polling) và tự động refetch khi window focus.
- [ ] Xây dựng component `AnalysisJobStatusBanner` tuân thủ design system hiện có, có icon và màu sắc tương ứng theo trạng thái.
- [ ] Chỉnh sửa `transcript-analysis.api.ts`: Khi nhận mã `202`, trả về thông tin `jobId` để kích hoạt polling thay vì thông báo lỗi timeout.
- [ ] Cập nhật `lesson-summary-tab.tsx`:
  - Khởi tạo `useLessonAnalysisJob(lessonId, 'summary')`.
  - Hiển thị banner trạng thái khi có Job đang chạy hoặc Job lỗi.
  - Vô hiệu hóa nút "Tạo tóm tắt bằng AI" khi `isProcessing === true`.
  - Giữ nguyên các chức năng chỉnh sửa Markdown thủ công và lưu bản nháp/áp dụng chính thức.
- [ ] Kiểm tra khả năng hồi phục sau khi reload: Mở bài học đang có Job chạy, nhấn F5; giao diện phải khôi phục ngay trạng thái loading kèm thông tin Job.

---

## 5. Kịch Bản Kiểm Thử & Nghiệm Thu (Verification)

1. **Trải Nghiệm Reload / Đổi Tab:** Bấm "Tạo tóm tắt bằng AI" -> UI chuyển sang trạng thái "Đang phân tích". F5 lại trang hoặc chuyển sang tab khác rồi quay lại -> Giao diện vẫn duy trì trạng thái xử lý; khi Worker hoàn tất, tóm tắt tự động xuất hiện mà không cần bấm thêm gì.
2. **Nhiều Tab Cùng Mở Một Bài Học:** Mở cùng 1 bài học trên 2 tab trình duyệt. Tab 1 bấm tạo tóm tắt; Tab 2 trong lần poll tiếp theo (sau tối đa 2.5s) phải tự động hiển thị banner "AI đang phân tích" và nút bấm ở Tab 2 cũng bị vô hiệu hóa.
3. **Mất Mạng Tạm Thời Phía Trình Duyệt:** Ngắt kết nối mạng client trong lúc Job đang chạy, sau đó bật lại mạng. Hook tự động reconnect và cập nhật kết quả chính xác từ server khi online trở lại.
4. **Xử Lý Lỗi Và Nút Retry:** Cấu hình mock lỗi AI trên Backend. Frontend hiển thị trạng thái "Thất bại" kèm thông báo an toàn; người dùng bấm nút "Thử lại", một Job mới được tạo (`retryOfJobId`) và quy trình phân tích được bắt đầu lại.
5. **Hồi Quy Nghiệp Vụ Chỉnh Sửa:** Các thao tác chỉnh sửa tóm tắt tay, lưu draft, apply draft và xuất bản khóa học vẫn hoạt động hoàn hảo không lỗi.

---

## 6. Tiêu Chí Nghiệm Thu (Exit Gate)

Giai đoạn 4 hoàn thành khi:
- [ ] Người dùng không bao giờ gặp tình trạng thông báo "Thành công" giả khi Worker chưa hoàn tất.
- [ ] Người dùng không cần phải giữ tab mở để đợi AI xử lý.
- [ ] Reload trang hoặc đổi bài học và quay lại khôi phục 100% đúng tiến độ xử lý từ server.
- [ ] Không có hiện tượng polling vô hạn khi Job đã hoàn tất hoặc thất bại.
- [ ] Nút bấm tạo mới bị khóa hoàn toàn khi có tác vụ đang chạy, loại bỏ khả năng bấm đúp.

---

## 7. Kế Hoạch Rollback

Nếu giao diện Frontend gặp lỗi hiển thị:
1. Revert các thay đổi trong `lesson-summary-tab.tsx` và `transcript-analysis.api.ts`.
2. Trả về component hiển thị cũ dựa trên mutation sync.
3. Phía Backend chỉ cần tắt cờ `AI_ASYNC_TYPES` để trả về HTTP 200 đồng bộ như ban đầu.
