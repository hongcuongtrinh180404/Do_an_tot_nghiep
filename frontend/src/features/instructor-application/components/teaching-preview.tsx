'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/icon';
import styles from './become-instructor.module.css';

const LESSON_MOMENTS = [
  {
    time: '00:00',
    title: 'Server Components',
    description: 'Xử lý dữ liệu trên máy chủ, gửi nội dung đã dựng đến trình duyệt.',
  },
  {
    time: '01:30',
    title: 'Client Components',
    description: 'Thêm tương tác với state, sự kiện và các API của trình duyệt.',
  },
  {
    time: '03:00',
    title: 'Kết hợp hai phía',
    description: 'Đặt phần tương tác bên trong trang để giữ phần còn lại trên máy chủ.',
  },
];

export function TeachingPreview(): React.JSX.Element {
  const [moment, setMoment] = useState(1);
  const active = LESSON_MOMENTS[moment];

  return (
    <div className={styles.lessonPreview} data-ui="mindly-lesson-preview">
      <div className={styles.previewTop}>
        <span>Next.js App Router</span>
        <span className={styles.previewNote}>Bài giảng mẫu</span>
      </div>
      <div className={styles.lessonSlide} aria-live="polite">
        <span className={styles.lessonTime}>{active.time}</span>
        <p className={styles.slideTitle}>{active.title}</p>
        <p>{active.description}</p>
      </div>
      <div className={styles.lessonTimeline} role="group" aria-label="Chọn mốc bài giảng mẫu">
        {LESSON_MOMENTS.map((item, index) => (
          <button
            type="button"
            key={item.time}
            aria-pressed={index === moment}
            aria-label={`${item.time} — ${item.title}`}
            onClick={() => setMoment(index)}
          >
            <span>{item.time}</span>
            <span className={styles.timelineTrack} aria-hidden="true" />
          </button>
        ))}
      </div>
      <div className={styles.mindmap}>
        <div className={styles.mindmapRoot}>Next.js</div>
        <div className={styles.mindmapBranches}>
          {LESSON_MOMENTS.map((item, index) => (
            <span key={item.time} className={index === moment ? styles.activeNode : undefined}>
              {item.title}
            </span>
          ))}
        </div>
      </div>
      <p className={styles.previewHint}>Chọn một mốc để xem sơ đồ tư duy thay đổi theo bài giảng.</p>
    </div>
  );
}

export function CourseOutlinePreview(): React.JSX.Element {
  return (
    <div className={styles.outlinePreview} data-ui="mindly-outline-preview">
      <p className={styles.fragmentTitle}>Nội dung khóa học</p>
      <p className={styles.fragmentSubtitle}>Làm quen với Next.js</p>
      <ul className={styles.lessonList}>
        <li><Icon icon="lucide:play" /><span>Kiến trúc App Router</span><span>05:20</span></li>
        <li><Icon icon="lucide:play" /><span>Server & Client</span><span>08:45</span></li>
        <li><Icon icon="lucide:file-text" /><span>Tài liệu thực hành</span><span>PDF</span></li>
      </ul>
    </div>
  );
}

export function TranscriptPreview(): React.JSX.Element {
  return (
    <div className={styles.transcriptPreview} data-ui="mindly-transcript-preview">
      <p className={styles.fragmentTitle}>Nội dung theo từng mốc</p>
      <div className={styles.transcriptRow}>
        <span>00:00</span>
        <p>Server Components chạy trên máy chủ và có thể truy cập dữ liệu trực tiếp.</p>
      </div>
      <div className={`${styles.transcriptRow} ${styles.selectedTranscript}`}>
        <span>01:30</span>
        <p>Khi cần state hoặc xử lý sự kiện, sử dụng Client Components.</p>
      </div>
    </div>
  );
}

export function QuizPreview(): React.JSX.Element {
  const [answer, setAnswer] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  return (
    <div className={styles.quizPreview} data-ui="mindly-quiz-preview">
      <p className={styles.fragmentTitle}>Câu hỏi tại mốc 01:30</p>
      <fieldset>
        <legend>Khi nào cần Client Component?</legend>
        {[
          ['server', 'Khi truy vấn dữ liệu trên máy chủ'],
          ['client', 'Khi xử lý thao tác của người dùng'],
        ].map(([value, label]) => (
          <label key={value} className={styles.quizOption}>
            <input
              type="radio"
              name="instructor-demo-quiz"
              value={value}
              checked={answer === value}
              onChange={() => { setAnswer(value); setChecked(false); }}
            />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>
      <div className={styles.quizAction}>
        <button
          type="button"
          disabled={!answer}
          onClick={() => setChecked(true)}
          className={styles.smallButton}
        >
          Kiểm tra đáp án
        </button>
        <span>Thử một câu hỏi mẫu</span>
      </div>
      <p className={styles.quizFeedback} aria-live="polite">
        {checked
          ? answer === 'client'
            ? 'Chính xác! Tương tác cần được xử lý ở phía trình duyệt.'
            : 'Chưa đúng. Truy vấn trên máy chủ có thể dùng Server Component.'
          : 'Bạn có thể đổi đáp án và thử lại.'}
      </p>
    </div>
  );
}
