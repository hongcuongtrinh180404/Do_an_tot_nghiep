'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/icon';
import styles from './become-instructor.module.css';

interface LessonMoment {
  time: string;
  title: string;
  subtitle: string;
  description: string;
  badge?: string;
}

const VIETNAM_HISTORY_MOMENTS: LessonMoment[] = [
  {
    time: '00:00',
    title: 'Quyết định lịch sử & Kéo pháo',
    subtitle: 'Chuyển phương châm tác chiến',
    description:
      'Đại tướng Võ Nguyên Giáp quyết định chuyển từ "Đánh nhanh thắng nhanh" sang "Đánh chắc tiến chắc", tổ chức kéo pháo vào trận địa hiểm trở.',
    badge: 'Khởi đầu chiến dịch',
  },
  {
    time: '02:15',
    title: 'Trận mở màn Cứ điểm Him Lam',
    subtitle: 'Đợt tiến công thứ nhất (13/3/1954)',
    description:
      'Đúng 17h ngày 13/3/1954, pháo binh ta đồng loạt phát hỏa, tiêu diệt trung tâm đề kháng Him Lam và Độc Lập, mở toang cửa ngõ lòng chảo.',
    badge: 'Mốc câu hỏi tương tác',
  },
  {
    time: '05:30',
    title: 'Đồi A1 & Toàn thắng chiến dịch',
    subtitle: 'Tổng công kích đợt ba (7/5/1954)',
    description:
      'Khối bộc phá gần 1 tấn tại đồi A1 phát nổ; bộ đội ta tổng tiến công bắt sống tướng De Castries, lá cờ Quyết chiến Quyết thắng tung bay.',
    badge: 'Đại thắng chấn động',
  },
];

export function TeachingPreview(): React.JSX.Element {
  const [moment, setMoment] = useState(1);
  const active = VIETNAM_HISTORY_MOMENTS[moment];

  return (
    <div className={styles.lessonPreview} data-ui="mindly-lesson-preview">
      <div className={styles.previewTop}>
        <div className={styles.previewBreadcrumb}>
          <span className={styles.previewCourseTag}>Lịch sử Việt Nam</span>
          <span className={styles.previewDivider}>/</span>
          <span className={styles.previewLessonName}>Chiến dịch Điện Biên Phủ (1954)</span>
        </div>
        <span className={styles.previewBadge}>
          <Icon icon="lucide:sparkles" /> Bài giảng mẫu
        </span>
      </div>

      {/* Video Simulation Canvas */}
      <div className={styles.lessonSlide} aria-live="polite">
        <div className={styles.slideHeader}>
          <span className={styles.lessonTimeBadge}>
            <Icon icon="lucide:play" /> {active.time}
          </span>
          {active.badge && (
            <span className={styles.slideStageBadge}>{active.badge}</span>
          )}
        </div>

        <div className={styles.slideContent}>
          <span className={styles.slideSubtitle}>{active.subtitle}</span>
          <h4 className={styles.slideTitle}>{active.title}</h4>
          <p className={styles.slideDescription}>{active.description}</p>
        </div>

        {/* Video Scrubber & Controls */}
        <div className={styles.playerBar}>
          <div className={styles.scrubberContainer}>
            <div
              className={styles.scrubberFill}
              style={{
                width: moment === 0 ? '15%' : moment === 1 ? '48%' : '92%',
              }}
            />
            {/* Interactive quiz marker at 02:15 */}
            <div
              className={`${styles.scrubberQuizMarker} ${moment === 1 ? styles.markerActive : ''}`}
              title="Điểm dừng câu hỏi tương tác (02:15)"
            >
              <Icon icon="lucide:help-circle" />
            </div>
          </div>
          <div className={styles.playerControls}>
            <span className={styles.playerTimeText}>
              {active.time} <span>/ 12:45</span>
            </span>
            <span className={styles.playerQualityBadge}>HD 1080p</span>
          </div>
        </div>
      </div>

      {/* Interactive Timeline Tabs */}
      <div
        className={styles.lessonTimeline}
        role="group"
        aria-label="Chọn các mốc lịch sử trong bài giảng"
      >
        {VIETNAM_HISTORY_MOMENTS.map((item, index) => (
          <button
            type="button"
            key={item.time}
            aria-pressed={index === moment}
            aria-label={`${item.time} — ${item.title}`}
            onClick={() => setMoment(index)}
            className={index === moment ? styles.timelineBtnActive : ''}
          >
            <div className={styles.timelineBtnHeader}>
              <span className={styles.timelineBtnTime}>{item.time}</span>
              {index === 1 && (
                <span className={styles.timelineQuizDot} title="Có câu hỏi tương tác" />
              )}
            </div>
            <span className={styles.timelineBtnTitle}>{item.title}</span>
            <span className={styles.timelineTrack} aria-hidden="true" />
          </button>
        ))}
      </div>

      {/* Mindmap Visualization */}
      <div className={styles.mindmapContainer}>
        <div className={styles.mindmap}>
          <div className={styles.mindmapRoot}>
            <Icon icon="lucide:git-branch" />
            <span>Điện Biên Phủ</span>
          </div>
          <div className={styles.mindmapBranches}>
            {VIETNAM_HISTORY_MOMENTS.map((item, index) => (
              <span
                key={item.time}
                className={index === moment ? styles.activeNode : undefined}
                onClick={() => setMoment(index)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setMoment(index);
                }}
              >
                <strong>{item.time}</strong>
                <span>{item.title}</span>
              </span>
            ))}
          </div>
        </div>
        <p className={styles.previewHint}>
          <Icon icon="lucide:info" /> Bấm mốc thời gian hoặc nhánh sơ đồ để xem bài giảng tự động liên kết.
        </p>
      </div>
    </div>
  );
}

export function CourseOutlinePreview(): React.JSX.Element {
  return (
    <div className={styles.outlinePreview} data-ui="mindly-outline-preview">
      <div className={styles.fragmentHeader}>
        <div>
          <span className={styles.fragmentCategory}>Khóa học lịch sử mẫu</span>
          <p className={styles.fragmentTitle}>Lịch sử Việt Nam hiện đại</p>
        </div>
        <span className={styles.outlineBadge}>Chương 3</span>
      </div>

      <ul className={styles.lessonList}>
        <li className={styles.lessonItemActive}>
          <div className={styles.lessonItemLeft}>
            <div className={styles.playIconBox}>
              <Icon icon="lucide:play" />
            </div>
            <div>
              <span className={styles.lessonItemTitle}>Chiến dịch Điện Biên Phủ (1954)</span>
              <span className={styles.lessonItemTag}>Video tương tác & Sơ đồ</span>
            </div>
          </div>
          <span className={styles.lessonDuration}>12:45</span>
        </li>

        <li>
          <div className={styles.lessonItemLeft}>
            <div className={styles.playIconBoxInactive}>
              <Icon icon="lucide:play" />
            </div>
            <div>
              <span className={styles.lessonItemTitle}>Kế hoạch Navarre & Cục diện Đông Dương</span>
              <span className={styles.lessonItemTag}>Bài giảng video</span>
            </div>
          </div>
          <span className={styles.lessonDuration}>08:20</span>
        </li>

        <li>
          <div className={styles.lessonItemLeft}>
            <div className={styles.docIconBox}>
              <Icon icon="lucide:file-text" />
            </div>
            <div>
              <span className={styles.lessonItemTitle}>Bản đồ chiến sự & Tài liệu tham khảo</span>
              <span className={styles.lessonItemTag}>Học liệu bổ trợ</span>
            </div>
          </div>
          <span className={styles.lessonDurationBadge}>PDF</span>
        </li>
      </ul>
    </div>
  );
}

export function TranscriptPreview(): React.JSX.Element {
  return (
    <div className={styles.transcriptPreview} data-ui="mindly-transcript-preview">
      <div className={styles.fragmentHeader}>
        <div>
          <span className={styles.fragmentCategory}>Phụ đề AI đồng bộ thời gian</span>
          <p className={styles.fragmentTitle}>Trích xuất nội dung giảng dạy</p>
        </div>
        <span className={styles.transcriptAiBadge}>
          <Icon icon="lucide:cpu" /> AI Transcript
        </span>
      </div>

      <div className={styles.transcriptList}>
        <div className={styles.transcriptRow}>
          <span className={styles.transcriptTime}>00:00</span>
          <p className={styles.transcriptText}>
            Đại tướng Võ Nguyên Giáp ra quyết định lịch sử: chuyển từ phương châm &ldquo;Đánh nhanh
            thắng nhanh&rdquo; sang &ldquo;Đánh chắc tiến chắc&rdquo;.
          </p>
        </div>

        <div className={`${styles.transcriptRow} ${styles.selectedTranscript}`}>
          <div className={styles.transcriptTimeCol}>
            <span className={styles.transcriptTimeActive}>02:15</span>
            <span className={styles.transcriptSyncPin}>Đang phát</span>
          </div>
          <div className={styles.transcriptContentCol}>
            <p className={styles.transcriptText}>
              Đúng 17h ngày 13/3/1954, toàn bộ hỏa lực pháo binh ta nổ súng đánh vào cụm cứ điểm Him Lam,
              mở màn cho chiến dịch lịch sử.
            </p>
            <span className={styles.transcriptKeywordTag}>Mốc kiến thức trọng tâm</span>
          </div>
        </div>

        <div className={styles.transcriptRow}>
          <span className={styles.transcriptTime}>05:30</span>
          <p className={styles.transcriptText}>
            Khối bộc phá gần 1 tấn tại đồi A1 phát nổ, báo hiệu đợt tổng công kích cuối cùng vào sở chỉ huy
            tập đoàn cứ điểm.
          </p>
        </div>
      </div>
    </div>
  );
}

export function QuizPreview(): React.JSX.Element {
  const [answer, setAnswer] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  const isCorrect = answer === 'him-lam';

  return (
    <div className={styles.quizPreview} data-ui="mindly-quiz-preview">
      <div className={styles.fragmentHeader}>
        <div>
          <span className={styles.fragmentCategory}>Câu hỏi tương tác tự động</span>
          <p className={styles.fragmentTitle}>Dừng video tại mốc 02:15</p>
        </div>
        <span className={styles.quizLiveBadge}>
          <Icon icon="lucide:help-circle" /> Trắc nghiệm
        </span>
      </div>

      <fieldset className={styles.quizFieldset}>
        <legend className={styles.quizQuestionLegend}>
          Cụm cứ điểm nào bị quân ta tiêu diệt trong trận đánh mở màn ngày 13/3/1954?
        </legend>

        <div className={styles.quizOptionsGroup}>
          {[
            ['him-lam', 'Cụm cứ điểm Him Lam (Béatrice)'],
            ['doi-a1', 'Cụm cứ điểm Đồi A1 (Éliane 2)'],
            ['muong-thanh', 'Khu trung tâm Mường Thanh'],
          ].map(([value, label]) => {
            const isSelected = answer === value;
            return (
              <label
                key={value}
                className={`${styles.quizOption} ${isSelected ? styles.quizOptionSelected : ''}`}
              >
                <input
                  type="radio"
                  name="history-demo-quiz"
                  value={value}
                  checked={isSelected}
                  onChange={() => {
                    setAnswer(value);
                    setChecked(false);
                  }}
                  className={styles.quizRadio}
                />
                <span className={styles.quizOptionText}>{label}</span>
                {isSelected && (
                  <Icon icon="lucide:check" className={styles.quizRadioCheckIcon} />
                )}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className={styles.quizAction}>
        <button
          type="button"
          disabled={!answer}
          onClick={() => setChecked(true)}
          className={styles.quizSubmitButton}
        >
          <Icon icon="lucide:check-circle-2" />
          <span>Kiểm tra đáp án</span>
        </button>
        <span className={styles.quizHintText}>Người học trả lời để tiếp tục xem bài giảng</span>
      </div>

      {checked && (
        <div
          className={`${styles.quizFeedbackCard} ${
            isCorrect ? styles.feedbackSuccess : styles.feedbackError
          }`}
          role="status"
          aria-live="polite"
        >
          <Icon
            icon={isCorrect ? 'lucide:check-circle-2' : 'lucide:alert-circle'}
            className={styles.feedbackIcon}
          />
          <div className={styles.feedbackContent}>
            <strong>{isCorrect ? 'Chính xác!' : 'Chưa chính xác!'}</strong>
            <p>
              {isCorrect
                ? 'Trận đánh cứ điểm Him Lam ngày 13/3/1954 là trận mở màn then chốt, đập tan lá chắn phòng thủ kiên cố nhất của địch.'
                : 'Đồi A1 và khu trung tâm Mường Thanh diễn ra ở các đợt tiến công sau. Cụm cứ điểm Him Lam mới là mục tiêu mở màn ngày 13/3/1954.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
