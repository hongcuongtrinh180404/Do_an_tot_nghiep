# Interactive Video Player & Mindmap — Technical Specifications

> **Module:** Frontend Components, Hooks, State Management for Video Player and Markmap.

---

## 1. Frontend Components Architecture

```
frontend/src/features/player/
├── components/
│   ├── interactive-video-player.tsx   # Trình phát video chính (HTML5 Video hoặc Video.js)
│   ├── in-video-quiz-modal.tsx        # Modal trắc nghiệm ngắt quãng
│   ├── markmap-viewer.tsx             # Component render Markmap SVG
│   └── lesson-sidebar.tsx             # Danh sách bài học trong chương
├── hooks/
│   ├── use-video-quiz.ts              # Hook quản lý breakpoint, pause/resume video
│   └── use-markmap.ts                 # Hook quản lý khởi tạo và render Markmap instance
└── types/
    └── player.types.ts                # Kiểu dữ liệu QuizItem, MarkmapOptions, LessonDetail
```

---

## 2. Thư viện Tích hợp (Libraries)

- **Markmap**:
  - `markmap-lib`: Biên dịch Markdown sang cấu trúc node của Markmap.
  - `markmap-view`: Render cây SVG tương tác.
  - Hoặc `@markmap/react` để tích hợp mượt mà trong React 19.
- **Video Player**:
  - Dùng thẻ `<video>` chuẩn HTML5 kết hợp custom controls bằng Tailwind CSS hoặc tích hợp `video.js` / `@vidstack/react`.

---

## 3. Quiz State Management Contract

```typescript
export interface InVideoQuiz {
  timestamp: number; // giây cần ngắt
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface QuizProgressState {
  answeredQuizTimestamps: Set<number>;
  currentActiveQuiz: InVideoQuiz | null;
  isPausedForQuiz: boolean;
}
```
