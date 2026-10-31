import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LessonContentTypeEnum, type ILesson } from 'share-lib';
import { formatVideoDuration, getVideoLessonStats } from '../utils/course-lesson-stats.util';

function video(duration?: number): Pick<ILesson, 'content'> {
  return { content: { type: LessonContentTypeEnum.VIDEO, url: '/video.mp4', duration } };
}

describe('Course video lesson statistics', () => {
  it('counts only videos, excluding documents, attachments and empty lessons', () => {
    const lessons: Pick<ILesson, 'content' | 'materials'>[] = [
      { ...video(90), materials: [{ id: 'doc', title: 'Slides', fileName: 'slides.pdf', url: '/slides.pdf' }] },
      video(120),
      { content: { type: LessonContentTypeEnum.DOCUMENT, url: '/reading.pdf', duration: 9999 } },
      { content: null },
      {},
    ];

    assert.deepEqual(getVideoLessonStats(lessons), {
      videoCount: 2,
      totalSeconds: 210,
      missingDurationCount: 0,
    });
  });

  it('sums videos across all chapters and updates after additions and deletions', () => {
    const chapterOne = [video(60), video(120)];
    const chapterTwo = [video(3600)];
    assert.equal(getVideoLessonStats([...chapterOne, ...chapterTwo]).totalSeconds, 3780);
    assert.equal(getVideoLessonStats([...chapterOne, ...chapterTwo]).videoCount, 3);

    chapterTwo.push(video(30));
    assert.equal(getVideoLessonStats([...chapterOne, ...chapterTwo]).totalSeconds, 3810);
    chapterOne.pop();
    assert.equal(getVideoLessonStats([...chapterOne, ...chapterTwo]).videoCount, 3);
    assert.equal(getVideoLessonStats([...chapterOne, ...chapterTwo]).totalSeconds, 3690);
  });

  it('returns zero for an empty course or a chapter containing only documents', () => {
    const empty = { videoCount: 0, totalSeconds: 0, missingDurationCount: 0 };
    assert.deepEqual(getVideoLessonStats([]), empty);
    assert.deepEqual(getVideoLessonStats([
      { content: { type: LessonContentTypeEnum.DOCUMENT, url: '/doc.pdf' } },
    ]), empty);
    assert.equal(formatVideoDuration(empty), '0s');
    assert.equal(formatVideoDuration(empty, 'long'), '0 giây');
  });

  it('counts videos with unknown or invalid duration without corrupting the sum', () => {
    const stats = getVideoLessonStats([
      video(45), video(), video(0), video(-1), video(NaN), video(Infinity),
    ]);
    assert.deepEqual(stats, { videoCount: 6, totalSeconds: 45, missingDurationCount: 5 });
    assert.equal(formatVideoDuration(stats), '45s (chưa đầy đủ)');
    assert.equal(formatVideoDuration(getVideoLessonStats([video()])), 'Chưa xác định');
  });

  it('keeps seconds and rounds only after adding all durations', () => {
    assert.equal(formatVideoDuration(getVideoLessonStats([video(20), video(20)])), '40s');
    assert.equal(formatVideoDuration(getVideoLessonStats([video(29.4), video(29.4)])), '59s');
    assert.equal(formatVideoDuration(getVideoLessonStats([video(3599.6)])), '1h');
    const stats = getVideoLessonStats([video(3600), video(125)]);
    assert.equal(formatVideoDuration(stats), '1h 2p 5s');
    assert.equal(formatVideoDuration(stats, 'long'), '1 giờ 2 phút 5 giây');
  });

  it('clears the incomplete indicator when video metadata becomes available', () => {
    assert.equal(formatVideoDuration(getVideoLessonStats([video(60), video()])), '1p (chưa đầy đủ)');
    assert.equal(formatVideoDuration(getVideoLessonStats([video(60), video(30)])), '1p 30s');
  });
});
