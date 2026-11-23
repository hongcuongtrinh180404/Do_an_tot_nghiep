// Standalone, explicitly labelled interaction demo; never used as catalog/course API data.
export interface ILivePreviewBreakpoint {
  timestamp: string;
  seconds: number;
  label: string;
  mindmapActiveNode: string;
  mindmapBranch: string[];
  quiz?: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
}

export const INTERACTIVE_PREVIEW_DEMO = {
  lessonTitle: 'Bài 03: Tối ưu Server Components & Phân cấp State',
  durationText: '04:15',
  breakpoints: [
    {
      timestamp: '00:45',
      seconds: 45,
      label: 'Kiến trúc Server First',
      mindmapActiveNode: 'RSC vs Client Component Boundary',
      mindmapBranch: ['Kiến trúc Next.js', 'React Server Components', 'RSC vs Client Component Boundary'],
    },
    {
      timestamp: '01:30',
      seconds: 90,
      label: 'Mốc kiểm tra In-video Quiz',
      mindmapActiveNode: 'Quy tắc Client Directive ("use client")',
      mindmapBranch: ['Kiến trúc Next.js', 'Client Boundary', 'Quy tắc Client Directive ("use client")'],
      quiz: {
        question: 'Khi nào BẮT BUỘC phải khai báo chỉ thị "use client" ở đầu tệp tin trong Next.js?',
        options: [
          'Khi component cần fetch dữ liệu trực tiếp từ cơ sở dữ liệu MongoDB',
          'Khi component sử dụng React hooks như useState, useEffect hoặc xử lý sự kiện onClick',
          'Khi render các thẻ HTML tĩnh như header, footer và thẻ p',
          'Tất cả mọi file trong thư mục app/ đều bắt buộc phải có "use client"',
        ],
        correctIndex: 1,
        explanation: 'Chính xác! Chỉ thị "use client" đánh dấu ranh giới chuyển đổi từ Server sang Client runtime, bắt buộc khi cần tương tác DOM, hooks hoặc state của trình duyệt.',
      },
    },
    {
      timestamp: '02:40',
      seconds: 160,
      label: 'Đồng bộ TanStack Query Server Cache',
      mindmapActiveNode: 'Hydration & QueryClient Provider',
      mindmapBranch: ['Kiến trúc Next.js', 'Quản lý State', 'Hydration & QueryClient Provider'],
    },
  ] as ILivePreviewBreakpoint[],
};
