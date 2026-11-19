'use client';

import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Dialog } from '@base-ui/react/dialog';
import { ArrowRight, ArrowUp, LoaderCircle, MessageCircle, RotateCcw, X } from 'lucide-react';
import { CourseLevelEnum } from 'share-lib';
import { MindlyLogo } from '@/components/brand/mindly-logo';
import { useCurrentUserQuery } from '@/features/auth/api/auth.api';
import { CHATBOT_MESSAGE_LIMIT, type ChatbotReply, type ChatbotTurn } from '../chatbot.contract';
import { useChatbot } from '../hooks/use-chatbot';
import styles from './chatbot.module.css';

const suggestions = [
  'Tìm khóa Python cho người mới',
  'Có khóa học nào dưới 500k?',
  'Có khóa học miễn phí không?',
];
const levelLabels: Record<CourseLevelEnum, string> = {
  [CourseLevelEnum.BEGINNER]: 'Cơ bản',
  [CourseLevelEnum.INTERMEDIATE]: 'Trung cấp',
  [CourseLevelEnum.ADVANCED]: 'Nâng cao',
  [CourseLevelEnum.ALL_LEVELS]: 'Mọi trình độ',
};
const priceFormatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
const mobileQuery = '(max-width: 639px)';
function subscribeMobile(onChange: () => void) {
  const media = window.matchMedia(mobileQuery);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

function SearchReply({ reply, onNavigate }: { reply: ChatbotReply; onNavigate: () => void }) {
  if (reply.status !== 'found' || !reply.result) {
    return <p className={styles.answer}>{reply.answer}</p>;
  }
  const result = reply.result;
  return (
    <div className={styles.results}>
      <p>Tìm thấy <strong>{result.total.toLocaleString('vi-VN')} khóa học</strong> phù hợp.</p>
      <ul className={styles.courses} aria-label="Khóa học tìm được">
        {result.items.map((course) => (
          <li key={course.id}>
            <Link
              href={course.url}
              prefetch={false}
              onClick={onNavigate}
              className={styles.course}
            >
              <span className={styles.courseTitle}>{course.title}</span>
              <span className={styles.courseMeta}>
                {course.categoryName && <span>{course.categoryName}</span>}
                <span>{levelLabels[course.level]}</span>
              </span>
              <span className={styles.courseBottom}>
                <strong>{course.price === 0 ? 'Miễn phí' : priceFormatter.format(course.price)}</strong>
                <span className={styles.courseAction}>Xem khóa học <ArrowRight size={14} aria-hidden /></span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className={styles.meta}>
        Trang {result.page} · Hiển thị {result.items.length}/{result.total.toLocaleString('vi-VN')} khóa học
        {result.hasMore && '. Bạn có thể thêm điều kiện để thu hẹp kết quả.'}
      </p>
    </div>
  );
}

function Turn({
  turn, disabled, onRetry, onNavigate,
}: {
  turn: ChatbotTurn;
  disabled: boolean;
  onRetry: () => void;
  onNavigate: () => void;
}) {
  return (
    <div className={styles.turn}>
      <div className={styles.question}>
        <span className="sr-only">Bạn: </span>{turn.message}
      </div>
      <div className={styles.reply}>
        <span className={styles.speaker}>Mindly</span>
        {turn.status === 'pending' ? (
          <p className={styles.loading} role="status">
            <LoaderCircle size={16} className={styles.spinner} aria-hidden />
            Đang tìm khóa học…
          </p>
        ) : turn.status === 'success' ? (
          <SearchReply reply={turn.reply} onNavigate={onNavigate} />
        ) : (
          <div className={styles.error}>
            <p role="alert">{turn.error.message}</p>
            {turn.error.retryable && (
              <button type="button" onClick={onRetry} disabled={disabled} className={styles.retry}>
                <RotateCcw size={14} aria-hidden /> Thử lại câu hỏi
              </button>
            )}
            {turn.error.requestId && (
              <details className={styles.errorDetails}>
                <summary>Mã hỗ trợ</summary>
                <span>{turn.error.requestId}</span>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ChatbotSession({ authenticated, loading, courseDetail }: {
  authenticated: boolean;
  loading: boolean;
  courseDetail: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const chat = useChatbot();
  const input = useRef<HTMLTextAreaElement>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const mobile = useSyncExternalStore(
    subscribeMobile, () => window.matchMedia(mobileQuery).matches, () => false,
  );
  const loggedIn = authenticated && !chat.requiresLogin;
  const blocked = chat.isPending || chat.secondsRemaining > 0;

  useEffect(() => {
    const element = transcript.current;
    if (open && element && stickToBottom.current) element.scrollTop = element.scrollHeight;
  }, [open, chat.turns]);

  const submit = (message: string) => {
    if (!loggedIn || !chat.send(message)) return;
    setDraft('');
    stickToBottom.current = true;
    input.current?.focus();
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={setOpen}
      modal={mobile}
      disablePointerDismissal={!mobile}
    >
      <Dialog.Trigger
        className={`${styles.launcher} ${courseDetail ? styles.abovePurchase : ''}`}
        aria-label="Mở trợ lý tìm khóa học Mindly"
        data-chatbot-launcher
      >
        <MessageCircle size={21} aria-hidden />
        <span>Tìm khóa học</span>
      </Dialog.Trigger>
      <Dialog.Portal>
        {mobile && <Dialog.Backdrop className={styles.backdrop} />}
        <Dialog.Popup
          className={styles.panel}
          data-chatbot-panel
          initialFocus={(type) => type === 'touch' ? true : input.current ?? true}
        >
          <header className={styles.header}>
            <div className={styles.identity}>
              <MindlyLogo iconOnly showSlogan={false} variant="auto" className={styles.logo} aria-hidden />
              <div>
                <Dialog.Title className={styles.title}>Trợ lý Mindly</Dialog.Title>
                <Dialog.Description className={styles.subtitle}>Tìm khóa học phù hợp với bạn</Dialog.Description>
              </div>
            </div>
            <div className={styles.headerActions}>
              {loggedIn && chat.turns.length > 0 && (
                <button
                  type="button"
                  className={styles.iconButton}
                  aria-label="Xóa cuộc trò chuyện tạm"
                  title="Xóa cuộc trò chuyện tạm"
                  onClick={() => { chat.clear(); setDraft(''); input.current?.focus(); }}
                >
                  <RotateCcw size={18} aria-hidden />
                </button>
              )}
              <Dialog.Close className={styles.iconButton} aria-label="Đóng trợ lý">
                <X size={20} aria-hidden />
              </Dialog.Close>
            </div>
          </header>

          {loading ? (
            <div className={styles.welcome} role="status">Đang kiểm tra phiên đăng nhập…</div>
          ) : !loggedIn ? (
            <div className={styles.welcome}>
              <h3>Tìm khóa học cùng Mindly</h3>
              <p>{chat.requiresLogin
                ? 'Phiên đăng nhập đã hết hạn. Đăng nhập lại để tiếp tục tìm khóa học.'
                : 'Đăng nhập để tìm khóa học theo chủ đề, ngân sách và trình độ của bạn.'}</p>
              <Link href="/login" className={styles.login} onClick={() => setOpen(false)}>
                Đăng nhập <ArrowRight size={16} aria-hidden />
              </Link>
            </div>
          ) : (
            <>
              <div
                ref={transcript}
                className={styles.transcript}
                role="log"
                aria-label="Cuộc trò chuyện tìm khóa học"
                aria-live="polite"
                aria-relevant="additions text"
                onScroll={(event) => {
                  const element = event.currentTarget;
                  stickToBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 64;
                }}
              >
                {chat.turns.length === 0 && (
                  <div className={styles.intro}>
                    <h3>Bạn muốn học gì?</h3>
                    <p>Nói cho Mindly chủ đề bạn quan tâm, mức giá hoặc trình độ muốn tìm.</p>
                    <div className={styles.suggestions}>
                      {suggestions.map((message) => (
                        <button type="button" key={message} disabled={blocked} onClick={() => submit(message)}>
                          {message}<ArrowRight size={16} aria-hidden />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {chat.turns.map((turn) => (
                  <Turn
                    key={turn.id}
                    turn={turn}
                    disabled={blocked}
                    onRetry={() => { stickToBottom.current = true; chat.retry(turn); }}
                    onNavigate={() => setOpen(false)}
                  />
                ))}
              </div>
              <form
                className={styles.composer}
                onSubmit={(event) => { event.preventDefault(); submit(draft); }}
              >
                {chat.secondsRemaining > 0 && (
                  <p className={styles.cooldown} role="status">
                    Có thể gửi lại sau <strong>{chat.secondsRemaining} giây</strong>.
                  </p>
                )}
                <label htmlFor="mindly-chatbot-message" className={styles.inputLabel}>Câu hỏi của bạn</label>
                <div className={styles.inputRow}>
                  <textarea
                    id="mindly-chatbot-message"
                    ref={input}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey
                        && !event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229) {
                        event.preventDefault();
                        submit(draft);
                      }
                    }}
                    maxLength={CHATBOT_MESSAGE_LIMIT}
                    rows={2}
                    placeholder="Ví dụ: React cơ bản dưới 500k"
                    aria-describedby="mindly-chatbot-context mindly-chatbot-limit"
                  />
                  <button
                    type="submit"
                    className={styles.send}
                    disabled={blocked || !draft.trim()}
                    aria-label={chat.isPending ? 'Đang tìm khóa học' : 'Gửi câu hỏi'}
                    title="Gửi câu hỏi"
                  >
                    <ArrowUp size={21} aria-hidden />
                  </button>
                </div>
                <div className={styles.composerMeta}>
                  <span id="mindly-chatbot-context">Mỗi câu hỏi được tìm độc lập.</span>
                  <span id="mindly-chatbot-limit">{draft.length}/{CHATBOT_MESSAGE_LIMIT}</span>
                </div>
              </form>
            </>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default function ChatbotWidget() {
  const pathname = usePathname();
  const { data: user, isLoading } = useCurrentUserQuery();
  // Keep discovery help out of focused authoring, payment and authentication flows.
  if (/^\/(admin|checkout|login|register|reset-password|verify-email(?:-change)?)(\/|$)/.test(pathname)
    || pathname === '/courses/new' || pathname.includes('/lessons/')) return null;

  return (
    <ChatbotSession
      key={user?.id ?? 'guest'}
      authenticated={!!user}
      loading={isLoading}
      courseDetail={/^\/courses\/[^/]+\/?$/.test(pathname)}
    />
  );
}
