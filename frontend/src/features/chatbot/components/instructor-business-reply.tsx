'use client';

import Link from 'next/link';
import type { ChatbotBusinessReply } from '../chatbot-business.contract';
import styles from './chatbot.module.css';

const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
const numbers = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });
const timestamps = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric',
});
type Result = ChatbotBusinessReply['result'];
const date = (value: string) => value.split('-').reverse().join('/');
const label = (p: Result['period']) => `${date(p.startDate)}–${date(p.endDate)}${p.isPartial ? ' · Đến hiện tại' : ''}`;

export function InstructorBusinessReply({ reply, disabled, onAsk, onNavigate }: {
  reply: ChatbotBusinessReply; disabled: boolean; onAsk: (question: string) => void; onNavigate: () => void;
}) {
  const r = reply.result;
  if (r.scope === 'not_owned') return <p className={styles.answer}>{reply.answer}</p>;
  const select = (position: number) => onAsk(`Chọn khóa thứ ${position}`);
  return (
    <div className={styles.results} data-chatbot-business={r.scope}>
      <p className={styles.courseTitle}>{r.course?.title ?? 'Các khóa bạn giảng dạy'}</p>
      <p className={styles.meta}>{label(r.period)} · Giờ Việt Nam</p>
      {r.scope === 'selection' ? (
        <>
          <p>Có {numbers.format(r.total)} khóa phù hợp. Bạn muốn xem số liệu khóa nào?</p>
          <ol className={styles.courses} aria-label="Chọn khóa giảng dạy">
            {r.items.map((course, index) => <li key={course.id}>
              <button type="button" className={`${styles.course} ${styles.selection}`} disabled={disabled}
                onClick={() => select(index + 1)}>{index + 1}. {course.title}</button>
            </li>)}
          </ol>
        </>
      ) : r.scope === 'top_courses' ? (
        <>
          <p><strong>Khóa bán chạy</strong> · Xếp theo lượt mua thành công</p>
          {r.topTiedCount > 1 && <p>{numbers.format(r.topTiedCount)} khóa đồng hạng bán chạy nhất.</p>}
          {!r.items.length && <p>{reply.answer}</p>}
          <ol className={styles.courses} aria-label="Khóa học bán chạy">
            {r.items.map((course, index) => <li key={course.id} className={styles.course}>
              <p className={styles.courseTitle}>{index + 1}. {course.title}</p>
              <dl className={styles.progressFacts}>
                <div><dt>Hạng theo lượt bán</dt><dd>{course.rank}</dd></div>
                <div><dt>Lượt mua thành công</dt><dd>{numbers.format(course.successfulSales)}</dd></div>
                <div><dt>Sau hoa hồng</dt><dd>{money.format(course.instructorEarnings)}</dd></div>
              </dl>
              <button type="button" className={styles.textAction} disabled={disabled}
                onClick={() => onAsk(`Xem doanh thu khóa thứ ${index + 1}`)}>Xem doanh thu khóa này</button>
            </li>)}
          </ol>
          {r.hasMore && r.topTiedCount > r.items.filter((course) => course.rank === 1).length
            && r.page === 1 && <p className={styles.meta}>Còn khóa đồng hạng ở trang sau.</p>}
        </>
      ) : r.scope === 'compare' ? (
        <>
          <p>{r.metric === 'instructor_earnings' ? 'So sánh thu nhập sau hoa hồng' : 'So sánh lượt mua thành công'}</p>
          <dl className={`${styles.progressFacts} ${styles.businessComparison}`}>
            <div><dt>{label(r.period)}</dt><dd>{r.metric === 'instructor_earnings'
              ? money.format(r.current.instructorEarnings) : `${numbers.format(r.current.successfulSales)} lượt`}</dd></div>
            <div><dt>{label(r.previousPeriod)}</dt><dd>{r.metric === 'instructor_earnings'
              ? money.format(r.previous.instructorEarnings) : `${numbers.format(r.previous.successfulSales)} lượt`}</dd></div>
          </dl>
          <p className={styles.businessChange}>
            {r.change.direction === 'unchanged' ? 'Không thay đổi'
              : r.change.direction === 'new' ? 'Phát sinh từ mức 0'
                : r.change.direction === 'up' ? 'Tăng' : 'Giảm'}
            {r.change.direction !== 'unchanged' && <> · {r.change.absolute > 0 ? '+' : '−'}{r.metric === 'instructor_earnings'
              ? money.format(Math.abs(r.change.absolute)) : `${numbers.format(Math.abs(r.change.absolute))} lượt`}</>}
            {r.change.percent !== null && <> ({r.change.percent > 0 ? '+' : ''}{numbers.format(r.change.percent)}%)</>}
          </p>
          {r.change.direction === 'new' && <p className={styles.meta}>Kỳ trước bằng 0 nên không tính tỷ lệ tăng.</p>}
        </>
      ) : (
        <>
          <div className={styles.businessLead}>
            <p>{r.scope === 'revenue' ? 'Thu nhập sau hoa hồng' : 'Lượt mua thành công'}</p>
            <strong>{r.scope === 'revenue' ? money.format(r.totals.instructorEarnings) : numbers.format(r.totals.successfulSales)}</strong>
          </div>
          <dl className={styles.progressFacts}>
            {r.scope === 'revenue' && <>
              <div><dt>Tổng tiền bán hàng</dt><dd>{money.format(r.totals.totalRevenue)}</dd></div>
              <div><dt>Hoa hồng nền tảng</dt><dd>{money.format(r.totals.platformCommission)}</dd></div>
              <div><dt>Lượt mua thành công</dt><dd>{numbers.format(r.totals.successfulSales)}</dd></div>
            </>}
          </dl>
          {r.totals.successfulSales === 0 && <p className={styles.meta}>Chưa có lượt mua thành công trong khoảng này.</p>}
          {r.totals.reconstructedOrders > 0 && <p className={styles.meta}>
            {numbers.format(r.totals.reconstructedOrders)} đơn cũ được backend tính từ tỷ lệ hoa hồng lưu trên đơn.
          </p>}
        </>
      )}
      {r.scope !== 'selection' && <p className={styles.meta}>
        {r.scope === 'sales_count' ? 'Không bao gồm đăng ký miễn phí.'
          : 'Thu nhập ghi nhận từ đơn đã thanh toán, không phải xác nhận đã chi trả vào ngân hàng.'}
      </p>}
      {(r.scope === 'top_courses' || r.scope === 'selection') && <div className={styles.courseBottom}>
        <span className={styles.meta}>Trang {r.page} · {r.items.length}/{numbers.format(r.total)} khóa</span>
        {r.hasMore && <button type="button" className={styles.textAction} disabled={disabled}
          onClick={() => onAsk('Xem thêm')}>Xem thêm</button>}
      </div>}
      <p className={styles.meta}>Tra cứu lúc {timestamps.format(new Date(r.asOf))}</p>
      <Link href="/instructor/statistics" prefetch={false} className={styles.textAction} onClick={onNavigate}>
        Mở thống kê giảng dạy
      </Link>
    </div>
  );
}
