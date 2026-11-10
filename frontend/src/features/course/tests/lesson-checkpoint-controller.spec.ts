import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { IStudentLessonQuiz } from 'share-lib';
import { QuizQuestionTypeEnum } from 'share-lib';
import { LessonCheckpointController, groupQuizCheckpoints, type ActiveLessonCheckpoint } from '../utils/lesson-checkpoint-controller';

function question(id: string, timestamp: number, answered = false): IStudentLessonQuiz {
  return {
    id, lessonId: 'lesson', revision: `revision-${id}`, timestamp, order: 1,
    question: `Câu hỏi ${id}`, questionType: QuizQuestionTypeEnum.SINGLE,
    options: [{ id: 'a', label: 'A', text: 'Đáp án A' }, { id: 'b', label: 'B', text: 'Đáp án B' }],
    answer: answered ? { quizId: id, quizRevision: `revision-${id}`, selectedOptionIds: ['b'],
      isCorrect: false, correctOptionIds: ['a'], submittedAt: '2026-11-10T00:00:00Z' } : null,
  };
}

function harness(quizzes = [question('q1', 192), question('q2', 254)], start = 132, ready = true) {
  const media = { position: start, paused: false };
  let active: ActiveLessonCheckpoint | null = null;
  let plays = 0;
  const controller = new LessonCheckpointController({
    position: () => media.position, duration: () => 600, paused: () => media.paused,
    seek: (time) => { media.position = time; }, pause: () => { media.paused = true; },
    play: () => { media.paused = false; plays++; }, show: (value) => { active = value; },
  });
  controller.setData(quizzes, ready, true);
  if (start > 0 && ready) controller.requestSeek(start);
  controller.seeked();
  return {
    controller, media, active: () => active, plays: () => plays,
    save: (id: string) => {
      quizzes = quizzes.map((quiz) => quiz.id === id ? question(quiz.id, quiz.timestamp, true) : quiz);
      controller.setData(quizzes, true, true);
    },
  };
}

describe('Lesson checkpoints', () => {
  it('queues Q1 then Q2 and remembers the original 05:00 destination', () => {
    const h = harness();
    h.controller.requestSeek(300);
    assert.equal(h.media.position, 192);
    assert.equal(h.media.paused, true);
    assert.equal(h.active()?.quizzes[0].id, 'q1');
    assert.equal(h.active()?.required, true);
    h.save('q1');
    assert.equal(h.media.position, 254);
    assert.equal(h.active()?.quizzes[0].id, 'q2');
    assert.equal(h.media.paused, true);
    h.save('q2');
    assert.equal(h.active(), null);
    assert.equal(h.media.position, 300);
    assert.equal(h.media.paused, false);
  });

  it('requires only unanswered questions, including an incorrectly answered Q1', () => {
    const h = harness([question('q1', 192, true), question('q2', 254)]);
    h.controller.requestSeek(300);
    assert.equal(h.active()?.quizzes[0].id, 'q2');
  });

  it('does not interrupt a seek over completed checkpoints', () => {
    const h = harness([question('q1', 192, true), question('q2', 254, true)]);
    h.controller.requestSeek(500);
    assert.equal(h.media.position, 500);
    assert.equal(h.active(), null);
  });

  it('uses the newest forward seek while questions are open', () => {
    const h = harness();
    h.controller.requestSeek(300);
    h.controller.requestSeek(420);
    h.controller.requestSeek(360);
    h.save('q1'); h.save('q2');
    assert.equal(h.media.position, 360);
  });

  it('resumes automatically after mandatory quizzes even when the forward seek started paused', () => {
    const h = harness();
    h.media.paused = true;
    h.controller.requestSeek(300);
    h.save('q1'); h.save('q2');
    assert.equal(h.media.position, 300);
    assert.equal(h.media.paused, false);
  });

  it('does not restart the video when the remembered destination is its exact end', () => {
    const h = harness();
    h.controller.requestSeek(600);
    h.save('q1'); h.save('q2');
    assert.equal(h.media.position, 600);
    assert.equal(h.media.paused, true);
  });

  it('rebuilds the queue when the new destination no longer crosses Q2', () => {
    const h = harness();
    h.controller.requestSeek(300);
    h.controller.requestSeek(200);
    h.save('q1');
    assert.equal(h.media.position, 200);
    assert.equal(h.active(), null);
  });

  it('allows backward seeks and does not resume an obsolete forward request after a late save', () => {
    const h = harness();
    h.controller.requestSeek(300);
    h.controller.requestSeek(100);
    h.save('q1');
    assert.equal(h.media.position, 100);
    assert.equal(h.active(), null);
    assert.equal(h.media.paused, true);
  });

  it('does not treat closing an unanswered quiz as completion', () => {
    const h = harness();
    h.controller.requestSeek(300);
    h.controller.close();
    assert.equal(h.media.paused, true);
    assert.equal(h.media.position, 192);
    h.media.paused = false;
    h.controller.play();
    assert.equal(h.active()?.quizzes[0].id, 'q1');
    h.save('q1'); h.save('q2');
    assert.equal(h.media.position, 300);
  });

  it('activates on natural playback even when media samples jump past the exact second', () => {
    const h = harness();
    h.media.position = 193.4;
    h.controller.timeUpdate(193.4);
    assert.equal(h.media.position, 192);
    assert.equal(h.active()?.quizzes[0].id, 'q1');
    h.save('q1');
    assert.equal(h.media.position, 192);
    assert.equal(h.media.paused, false);
    h.controller.timeUpdate(192.5);
    assert.equal(h.active(), null);
  });

  it('opens completed quizzes as skippable review on each natural pass', () => {
    const h = harness([question('q1', 192, true)]);
    h.media.position = 193;
    h.controller.timeUpdate(193);
    assert.equal(h.active()?.required, false);
    h.controller.close();
    assert.equal(h.media.paused, false);
    h.controller.timeUpdate(193);
    assert.equal(h.active(), null);
    h.controller.requestSeek(180);
    h.media.position = 193;
    h.controller.timeUpdate(193);
    assert.equal(h.active()?.required, false);
  });

  it('supports manually opening a completed checkpoint without auto-playing a previously paused video', () => {
    const h = harness([question('q1', 192, true)]);
    h.media.paused = true;
    h.controller.openCheckpoint(192);
    assert.equal(h.active()?.required, false);
    h.controller.close();
    assert.equal(h.media.paused, true);
  });

  it('prevents external/native seeking and restored positions from bypassing missing questions', () => {
    const h = harness();
    h.media.position = 500;
    h.controller.seeking(500);
    assert.equal(h.media.position, 192);
    h.save('q1'); h.save('q2');
    assert.equal(h.media.position, 500);
  });

  it('waits for loaded server state before executing the latest pending seek', () => {
    const h = harness(undefined, 0, false);
    h.controller.requestSeek(300);
    h.controller.requestSeek(400);
    assert.equal(h.media.position, 0);
    assert.equal(h.media.paused, true);
    h.controller.setData([question('q1', 192)], true, true);
    assert.equal(h.active()?.quizzes[0].id, 'q1');
    h.controller.setData([question('q1', 192, true)], true, true);
    assert.equal(h.media.position, 400);
  });

  it('blocks play while quiz requirements are unavailable', () => {
    const h = harness(undefined, 0, false);
    h.controller.play();
    assert.equal(h.media.paused, true);
  });

  it('requires a checkpoint at 00:00 only once before resuming', () => {
    const h = harness([question('q1', 0)], 0);
    h.controller.play();
    assert.equal(h.active()?.timestamp, 0);
    h.save('q1');
    h.controller.timeUpdate(0.1);
    assert.equal(h.active(), null);
  });

  it('does not miss a mandatory checkpoint exactly at the end of the video', () => {
    const h = harness([question('q1', 600)]);
    h.media.position = 600;
    h.media.paused = true;
    h.controller.ended();
    assert.equal(h.active()?.timestamp, 600);
    h.save('q1');
    assert.equal(h.active(), null);
    assert.equal(h.media.paused, true);
  });

  it('rechecks newly published questions behind the current position', () => {
    const h = harness([question('q1', 192, true)]);
    h.controller.requestSeek(400);
    h.controller.setData([question('q1', 192, true), question('q2', 254)], true, true);
    h.media.position = 401;
    h.controller.timeUpdate(401);
    assert.equal(h.active()?.quizzes[0].id, 'q2');
  });

  it('also opens a completed end-of-video checkpoint as skippable review', () => {
    const h = harness([question('q1', 600, true)]);
    h.media.position = 600;
    h.media.paused = true;
    h.controller.ended();
    assert.equal(h.active()?.timestamp, 600);
    assert.equal(h.active()?.required, false);
    h.controller.close();
    assert.equal(h.media.paused, true);
  });

  it('makes an open review mandatory when the instructor publishes new requirements there', () => {
    const h = harness([question('q1', 192, true)]);
    h.controller.openCheckpoint(192);
    assert.equal(h.active()?.required, false);
    h.controller.setData([{ ...question('q1', 192), revision: 'updated-content' }], true, true);
    assert.equal(h.active()?.required, true);
    assert.equal(h.media.paused, true);
  });

  it('groups nearby questions and requires every remaining question in a cluster', () => {
    const h = harness([question('q1', 192, true), question('q2', 193), question('q3', 194)]);
    h.controller.requestSeek(300);
    assert.deepEqual(h.active()?.quizzes.map((quiz) => quiz.id), ['q2', 'q3']);
    h.save('q2');
    assert.deepEqual(h.active()?.quizzes.map((quiz) => quiz.id), ['q3']);
    h.save('q3');
    assert.equal(h.media.position, 300);
    assert.equal(h.active(), null);
  });

  it('keeps preview quizzes optional and never grants completion locally', () => {
    const h = harness([], 0);
    h.controller.setData([question('q1', 192)], true, false);
    h.controller.requestSeek(180);
    h.media.position = 193;
    h.controller.timeUpdate(193);
    assert.equal(h.active()?.required, false);
    assert.equal(h.active()?.quizzes[0].answer, null);
  });

  it('sorts checkpoints deterministically by time and question order', () => {
    const grouped = groupQuizCheckpoints([question('q3', 254), { ...question('q2', 192), order: 2 }, question('q1', 192)]);
    assert.deepEqual([...grouped.keys()], [192, 254]);
    assert.deepEqual(grouped.get(192)?.map((quiz) => quiz.id), ['q1', 'q2']);
  });
});
