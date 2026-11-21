'use client';

import Link from 'next/link';
import { LearningStatusEnum } from 'share-lib';
import type { ChatbotOwnedCourse, ChatbotPersonalReply } from '../chatbot.contract';
import styles from './chatbot.module.css';

const labels: Record<LearningStatusEnum, string> = {
  [LearningStatusEnum.NOT_STARTED]: 'Chưa bắt đầu',
  [LearningStatusEnum.IN_PROGRESS]: 'Đang học',
  [LearningStatusEnum.COMPLETED]: 'Đã hoàn thành',
};
const numbers = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });
const dates = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

function Progress({ course }: { course: ChatbotOwnedCourse }) {
  const p = course.progress;
  return (
    <div className={styles.progressBlock}>
      <div className={styles.courseBottom}>
        <span>{labels[p.status]}</span>
        <strong>{p.progressPercent === null ? 'Chưa xác định' : `${numbers.format(p.progressPercent)}%`}</strong>
      </div>
      {p.progressPercent !== null && (
        <div className={styles.progressTrack} role="progressbar" aria-label={`Tiến độ ${course.title}`}
          aria-valuemin={0} aria-valuemax={100} aria-valuenow={p.progressPercent}>
          <span style={{ width: `${p.progressPercent}%` }} />
        </div>
      )}
      <p className={styles.meta}>{p.totalLessons
        ? `${numbers.format(p.completedLessons)}/${numbers.format(p.totalLessons)} bài video hoàn thành`
        : 'Khóa học chưa có bài video để tính tiến độ.'}</p>
    </div>
  );
}

function CourseLink({ course, onNavigate }: { course: ChatbotOwnedCourse; onNavigate: () => void }) {
  return <Link href={course.resumeUrl ?? course.url} prefetch={false} onClick={onNavigate} className={styles.textAction}>
    {course.resumeUrl ? 'Tiếp tục học' : course.url === '/my-courses' ? 'Khóa học của tôi' : 'Xem khóa học'}
  </Link>;
}

export function PersonalLearningReply({ reply, disabled, onAsk, onNavigate }: {
  reply: ChatbotPersonalReply; disabled: boolean; onAsk: (question: string) => void; onNavigate: () => void;
}) {
  if (reply.kind === 'my_courses') {
    const r = reply.result;
    if (!r.items.length) return <p className={styles.answer}>{reply.answer}</p>;
    return (
      <div className={styles.results} data-chatbot-personal="courses">
        <p><strong>{numbers.format(r.total)} khóa học bạn đang sở hữu</strong> phù hợp.</p>
        <ol className={styles.courses} aria-label="Khóa học của bạn">
          {r.items.map((course, index) => (
            <li key={course.id} className={styles.course}>
              <p className={styles.courseTitle}>{index + 1}. {course.title}</p>
              <Progress course={course} />
              <p className={styles.meta}>Đăng ký {dates.format(new Date(course.enrolledAt))}</p>
              <div className={styles.courseBottom}>
                <button type="button" className={styles.textAction} disabled={disabled}
                  onClick={() => onAsk(`Xem tiến độ khóa thứ ${index + 1}`)}>Xem tiến độ</button>
                <CourseLink course={course} onNavigate={onNavigate} />
              </div>
            </li>
          ))}
        </ol>
        <p className={styles.meta}>Trang {r.page} · {r.items.length}/{numbers.format(r.total)} khóa học
          {r.hasMore && '. Bạn có thể hỏi “xem thêm”.'}</p>
      </div>
    );
  }
  const r = reply.result;
  if (r.scope === 'not_owned') return <p className={styles.answer}>{reply.answer}</p>;
  if (r.scope === 'overview') return (
    <div className={styles.results} data-chatbot-personal="overview">
      <p>Bạn đang sở hữu <strong>{numbers.format(r.totalCourses)} khóa học</strong>.</p>
      <dl className={styles.progressFacts}>
        <div><dt>Chưa bắt đầu</dt><dd>{numbers.format(r.notStarted)}</dd></div>
        <div><dt>Đang học</dt><dd>{numbers.format(r.inProgress)}</dd></div>
        <div><dt>Đã hoàn thành</dt><dd>{numbers.format(r.completed)}</dd></div>
      </dl>
      <button type="button" className={styles.textAction} disabled={disabled}
        onClick={() => onAsk('Xem các khóa học của tôi')}>Xem các khóa học của tôi</button>
    </div>
  );
  if (r.scope === 'selection') return (
    <div className={styles.results} data-chatbot-personal="selection">
      <p>{r.items.length ? `Có ${numbers.format(r.total)} khóa phù hợp. Bạn muốn xem tiến độ khóa nào?` : reply.answer}</p>
      <ol className={styles.courses} aria-label="Chọn khóa để xem tiến độ">
        {r.items.map((course, index) => (
          <li key={course.id}>
            <button type="button" className={`${styles.course} ${styles.selection}`} disabled={disabled}
              onClick={() => onAsk(`Xem tiến độ khóa thứ ${index + 1}`)}>{index + 1}. {course.title}</button>
          </li>
        ))}
      </ol>
      <p className={styles.meta}>Trang {r.page}{r.hasMore && ' · Bạn có thể hỏi “xem thêm”.'}</p>
    </div>
  );
  const p = r.course.progress;
  const minutes = Math.floor(p.watchedMs / 60000);
  const position = `${Math.floor(p.lastPositionSeconds / 60)}:${String(Math.floor(p.lastPositionSeconds % 60)).padStart(2, '0')}`;
  return (
    <div className={styles.results} data-chatbot-personal="detail">
      <p className={styles.courseTitle}>{r.course.title}</p>
      <Progress course={r.course} />
      <dl className={styles.progressFacts}>
        <div><dt>Bài video còn lại</dt><dd>{numbers.format(r.remainingLessons)}</dd></div>
        <div><dt>Thời gian xem đã ghi nhận</dt><dd>{numbers.format(minutes)} phút</dd></div>
      </dl>
      {r.lastLessonTitle && <p className={styles.meta}>Tiếp tục tại {r.lastLessonTitle} · {position}</p>}
      <CourseLink course={r.course} onNavigate={onNavigate} />
    </div>
  );
}
