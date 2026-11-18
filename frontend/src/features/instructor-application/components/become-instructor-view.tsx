'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RoleEnum } from 'share-lib';
import { Icon } from '@/components/ui/icon';
import { authPathWithReturn } from '@/features/auth/utils/auth-return-path';
import { useInstructorApplication } from '../hooks/use-instructor-application';
import { BECOME_INSTRUCTOR_PATH } from '../instructor-application';
import { ApplicationPanel } from './application-panel';
import { CourseOutlinePreview, QuizPreview, TeachingPreview, TranscriptPreview } from './teaching-preview';
import styles from './become-instructor.module.css';

const PROCESS = [
  {
    title: 'Chuẩn bị yêu cầu',
    description: 'Đăng nhập bằng tài khoản học viên và chuẩn bị thông tin đăng ký giảng dạy.',
  },
  {
    title: 'Admin xem xét',
    description: 'Theo dõi trạng thái tại trang này. Mỗi tài khoản chỉ có một yêu cầu đang chờ duyệt.',
  },
  {
    title: 'Nhận phản hồi',
    description: 'Xem kết quả từ Admin. Nếu cần bổ sung thông tin, bạn có thể chuẩn bị yêu cầu đăng ký lại.',
  },
];

export function BecomeInstructorView(): React.JSX.Element {
  const router = useRouter();
  const { user, application, isLoading, isError, isPreview, retry } = useInstructorApplication();
  const rootRef = useRef<HTMLElement>(null);
  const registrationRef = useRef<HTMLElement>(null);
  const [draftKey, setDraftKey] = useState<string | null>(null);
  const accountKey = `${user?.id ?? 'guest'}:${application.status}`;
  const loginHref = authPathWithReturn('/login', `${BECOME_INSTRUCTOR_PATH}#registration`);
  const managementPath = user?.role === RoleEnum.INSTRUCTOR
    ? '/courses'
    : user?.role === RoleEnum.ADMIN ? '/admin' : null;

  useEffect(() => {
    if (managementPath) router.replace(managementPath);
  }, [managementPath, router]);

  useEffect(() => {
    const elements = rootRef.current?.querySelectorAll<HTMLElement>('[data-reveal]');
    if (!elements || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.setAttribute('data-visible', 'true');
          observer.unobserve(entry.target);
        }
      }
    }, { threshold: 0.1 });
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [managementPath]);

  function goToRegistration(openDraft = false): void {
    if (openDraft && user && application.status !== 'pending') setDraftKey(accountKey);
    registrationRef.current?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      block: 'start',
    });
    registrationRef.current?.focus({ preventScroll: true });
  }

  if (managementPath) {
    return (
      <main className={styles.page}>
        <div className={styles.redirectState}>
          <p role="status">Đang mở trang quản lý của bạn…</p>
          <Link href={managementPath} className={styles.textLink}>Mở trang quản lý</Link>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page} ref={rootRef}>
      <div className={styles.container}>
        <section className={styles.hero} aria-labelledby="instructor-title">
          <div className={styles.heroCopy}>
            <h1 id="instructor-title" data-reveal>Trở thành<br />giảng viên Mindly</h1>
            <p className={styles.heroDescription} data-reveal>
              Chia sẻ chuyên môn của bạn qua bài giảng video, sơ đồ tư duy và câu hỏi tương tác.
            </p>
            <div className={styles.heroActions} data-reveal>
              {isLoading ? (
                <span role="status" className={styles.loadingAction}>Đang tải tài khoản…</span>
              ) : !user && !isError ? (
                <Link href={loginHref} className={styles.primaryButton}>
                  Gửi yêu cầu đăng ký <Icon icon="lucide:arrow-up-right" />
                </Link>
              ) : (
                <button type="button" className={styles.primaryButton} onClick={() => goToRegistration(!isError && application.status === 'not-applied')}>
                  {isError ? 'Kiểm tra tài khoản' : application.status === 'pending'
                    ? 'Xem trạng thái đăng ký' : application.status === 'rejected'
                      ? 'Xem kết quả đăng ký' : 'Gửi yêu cầu đăng ký'}
                  <Icon icon="lucide:arrow-up-right" />
                </button>
              )}
              <a href="#teaching-tools" className={styles.textLink}>Khám phá công cụ giảng dạy</a>
            </div>
            <p className={styles.heroFootnote} data-reveal>
              Kiến thức của bạn. Trải nghiệm học tập của Mindly.
            </p>
          </div>
          <div className={styles.heroMedia} data-reveal>
            <TeachingPreview />
          </div>
        </section>

        <section id="teaching-tools" className={styles.tools} aria-labelledby="tools-title">
          <div className={styles.sectionIntro}>
            <h2 id="tools-title" data-reveal>Dạy theo cách của bạn</h2>
            <p data-reveal>Từ nội dung đầu tiên đến từng khoảnh khắc người học hiểu bài, mọi công cụ ở cùng một nơi.</p>
          </div>
          <div className={styles.featureBoard}>
            <article className={styles.feature} data-reveal>
              <div className={styles.featureCopy}>
                <h3>Một nơi cho khóa học</h3>
                <p>Sắp xếp chương, bài giảng video và tài liệu thành lộ trình học rõ ràng.</p>
              </div>
              <CourseOutlinePreview />
            </article>
            <article className={`${styles.feature} ${styles.featureMiddle}`} data-reveal>
              <TranscriptPreview />
              <div className={styles.featureCopy}>
                <h3>AI hỗ trợ bài giảng</h3>
                <p>Liên kết nội dung video với phụ đề và sơ đồ tư duy theo từng mốc kiến thức.</p>
              </div>
            </article>
            <article className={styles.feature} data-reveal>
              <div className={styles.featureCopy}>
                <h3>Học bằng tương tác</h3>
                <p>Đặt câu hỏi ngay trong video để người học kiểm tra lại điều vừa tiếp thu.</p>
              </div>
              <QuizPreview />
            </article>
          </div>
        </section>

        <section className={styles.preparation} aria-labelledby="preparation-title">
          <div className={styles.preparationCopy} data-reveal>
            <h2 id="preparation-title">Mang chuyên môn<br />của bạn đến Mindly</h2>
            <p>Bạn có kiến thức muốn chia sẻ và một chủ đề muốn giảng dạy? Hãy bắt đầu từ đó.</p>
          </div>
          <div className={styles.requirements} data-reveal>
            <h3>Điều kiện đăng ký</h3>
            <ul>
              <li><Icon icon="lucide:check" /><span>Sử dụng tài khoản học viên để bắt đầu đăng ký.</span></li>
              <li><Icon icon="lucide:check" /><span>Mỗi tài khoản có tối đa một yêu cầu đang chờ duyệt.</span></li>
              <li><Icon icon="lucide:check" /><span>Yêu cầu được Admin xem xét trước khi bạn bắt đầu giảng dạy.</span></li>
            </ul>
            <p className={styles.secondaryText}>Các yêu cầu về thông tin và hồ sơ sẽ được cập nhật cùng biểu mẫu đăng ký.</p>
          </div>
        </section>

        <section className={styles.process} aria-labelledby="process-title">
          <div className={styles.sectionIntro}>
            <h2 id="process-title" data-reveal>Bắt đầu như thế nào?</h2>
            <p data-reveal>Một nơi để đăng ký, theo dõi trạng thái và nhận phản hồi.</p>
          </div>
          <div className={styles.processPanels}>
            {PROCESS.map((item, index) => (
              <details key={item.title} open={index === 0} className={styles.processItem} data-reveal>
                <summary>{item.title}<Icon icon="lucide:plus" /></summary>
                <p>{item.description}</p>
              </details>
            ))}
          </div>
        </section>

        <section
          id="registration"
          className={styles.registration}
          ref={registrationRef}
          tabIndex={-1}
          aria-label="Đăng ký và trạng thái yêu cầu giảng viên"
        >
          {isPreview && (
            <div className={styles.previewToolbar}>
              <p>Xem trước giao diện · Dữ liệu mẫu</p>
              <nav aria-label="Xem trước trạng thái đăng ký">
                {([
                  ['not-applied', 'Chưa đăng ký'],
                  ['pending', 'Chờ duyệt'],
                  ['rejected', 'Bị từ chối'],
                ] as const).map(([status, label]) => (
                  <Link
                    key={status}
                    href={`${BECOME_INSTRUCTOR_PATH}?preview=${status}#registration`}
                    aria-current={application.status === status ? 'page' : undefined}
                    scroll={false}
                  >{label}</Link>
                ))}
              </nav>
            </div>
          )}
          <div className={styles.applicationBoard}>
            <div className={styles.invitation} data-reveal>
              <div className={styles.invitationTop}>
                <p>Từ kiến thức<br />đến bài giảng.</p>
                <div className={styles.invitationSteps}>
                  <div className={styles.invitationStep}>
                    <strong>Hồ sơ năng lực</strong>
                    <p>Cung cấp thông tin chuyên môn, kinh nghiệm thực tế và đính kèm tài liệu CV.</p>
                  </div>
                  <div className={styles.invitationStep}>
                    <strong>Xét duyệt sư phạm</strong>
                    <p>Ban quản trị xem xét và phản hồi trong 24–48 giờ làm việc.</p>
                  </div>
                  <div className={styles.invitationStep}>
                    <strong>Không gian giảng dạy</strong>
                    <p>Khai phóng trọn bộ công cụ video tương tác, bài tập và sơ đồ tư duy Mindly.</p>
                  </div>
                </div>
              </div>
              <span className={styles.invitationBrand}>Mindly · Map Your Mind</span>
            </div>
            <ApplicationPanel
              application={application}
              isLoading={isLoading}
              isError={isError}
              isGuest={!user}
              isPreview={isPreview}
              showDraft={draftKey === accountKey}
              loginHref={loginHref}
              user={user}
              onRetry={() => { void retry(); }}
              onOpenDraft={() => setDraftKey(accountKey)}
              onCloseDraft={() => setDraftKey(null)}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
