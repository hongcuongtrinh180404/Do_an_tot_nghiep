'use client';

import { useEffect, useState, type RefObject } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PLAYBACK_HEARTBEAT_MS, PLAYBACK_LEASE_MS, type IPlaybackHeartbeat } from 'share-lib';
import { cacheLearningProgress, learningProgressApi, useCourseLearningProgressQuery } from '../../api/learning-progress.api';
import { PlaybackClock } from '../../utils/playback-clock';

interface Options {
  userId?: string;
  courseId: string;
  lessonId: string;
  videoUrl?: string;
  videoRef: RefObject<HTMLVideoElement | null>;
  enabled: boolean;
}

interface ActiveSession {
  id: string;
  sequence: number;
  leaseDeadline: number;
  clock: PlaybackClock;
}

function errorMessage(error: unknown): string {
  return (error as { response?: { data?: { message?: string } } }).response?.data?.message ??
    'Chưa lưu được tiến độ. Kiểm tra kết nối rồi phát lại video.';
}

export function useLessonLearningProgress({ userId, courseId, lessonId, videoUrl, videoRef, enabled }: Options) {
  const queryClient = useQueryClient();
  const query = useCourseLearningProgressQuery(userId, courseId, enabled);
  const [saveState, setSaveState] = useState('');
  const eligible = Boolean(enabled && userId && query.data);
  const resumeLessonId = query.data?.lastLessonId;
  const resumePosition = query.data?.lastPositionSeconds ?? 0;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !eligible || resumeLessonId !== lessonId) return;
    const restore = () => {
      // Never jump a player that the learner has already started interacting with.
      if (video.paused && video.currentTime === 0 && resumePosition > 0 &&
        Number.isFinite(video.duration) && resumePosition < video.duration) video.currentTime = resumePosition;
    };
    if (video.readyState >= 1) restore();
    else video.addEventListener('loadedmetadata', restore, { once: true });
    return () => video.removeEventListener('loadedmetadata', restore);
  }, [eligible, lessonId, resumeLessonId, resumePosition, videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !eligible || !userId || !videoUrl) return;
    let disposed = false;
    let active: ActiveSession | null = null;
    let starting: Promise<void> | null = null;
    let inFlight = false;
    let buffering = false;
    let hasPlayed = false;
    let lastFlush = performance.now();

    const publish = (response: Awaited<ReturnType<typeof learningProgressApi.heartbeat>>) => {
      cacheLearningProgress(queryClient, userId, response.progress);
    };
    const payload = (session: ActiveSession): IPlaybackHeartbeat => ({
      sessionId: session.id, sequence: ++session.sequence, watchedMs: session.clock.watchedMs,
      positionSeconds: Math.max(0, Number.isFinite(video.currentTime) ? video.currentTime : 0),
    });

    const finish = (keepalive = false): void => {
      const session = active;
      if (!session) return;
      active = null;
      if (video.seeking) session.clock.seeking();
      else session.clock.stop(performance.now(), video.currentTime);
      if (!disposed) setSaveState('Đang lưu…');
      void learningProgressApi.end(userId, courseId, payload(session), keepalive).then((response) => {
        publish(response);
        if (!disposed && !active) setSaveState('Đã lưu tiến độ');
      }).catch((error: unknown) => {
        if (!disposed && !active) setSaveState(errorMessage(error));
      });
    };

    const start = (): void => {
      if (disposed || starting || active || !navigator.onLine) return;
      hasPlayed = true;
      const id = crypto.randomUUID();
      const requestedAt = performance.now();
      setSaveState('Đang kết nối phiên học…');
      starting = learningProgressApi.start(userId, courseId, { sessionId: id, lessonId }).then((response) => {
        publish(response);
        // Use a conservative monotonic deadline, never compare the device's wall clock to the server's.
        const session: ActiveSession = { id, sequence: 0, leaseDeadline: requestedAt + PLAYBACK_LEASE_MS, clock: new PlaybackClock() };
        if (disposed || video.paused || video.ended || !navigator.onLine) {
          // A pause/navigation during the start request must not leave a dangling lease.
          void learningProgressApi.end(userId, courseId, payload(session), disposed).then((result) => {
            publish(result);
            if (!disposed && !active) setSaveState('Đã lưu tiến độ');
          }).catch((error: unknown) => {
            if (!disposed && !active) setSaveState(errorMessage(error));
          });
          return;
        }
        active = session;
        if (!video.seeking && !buffering) session.clock.begin(performance.now(), video.currentTime, video.playbackRate);
        lastFlush = performance.now();
        setSaveState('Đang ghi nhận thời gian xem');
      }).catch((error: unknown) => {
        if (!disposed) {
          video.pause();
          setSaveState(errorMessage(error));
        }
      }).finally(() => { starting = null; });
    };

    const flush = (): void => {
      const session = active;
      if (!session || inFlight || !navigator.onLine) return;
      inFlight = true;
      lastFlush = performance.now();
      const requestedAt = performance.now();
      void learningProgressApi.heartbeat(courseId, payload(session)).then((response) => {
        publish(response);
        if (active === session) {
          session.leaseDeadline = requestedAt + PLAYBACK_LEASE_MS;
          if (!disposed) setSaveState('Đang ghi nhận · Đã lưu tiến độ');
        }
      }).catch((error: unknown) => {
        if (active === session) {
          finish();
          video.pause();
          if (!disposed) setSaveState(errorMessage(error));
        }
      }).finally(() => { inFlight = false; });
    };

    const sample = (): void => {
      if (!active) return;
      if (performance.now() >= active.leaseDeadline) {
        // Do not backfill gaps after suspension, a broken connection or lease loss.
        active.clock.seeking();
        finish();
        video.pause();
        setSaveState('Phiên học đã hết hạn. Phát lại video để tiếp tục ghi nhận.');
        return;
      }
      if (!buffering && !video.seeking) active.clock.sample(performance.now(), video.currentTime);
      if (performance.now() - lastFlush >= PLAYBACK_HEARTBEAT_MS) flush();
    };
    const playing = (): void => {
      buffering = false;
      if (!navigator.onLine) {
        setSaveState('Đã mất kết nối. Thời gian xem ngoại tuyến không được ghi nhận.');
        return;
      }
      if (active) active.clock.begin(performance.now(), video.currentTime, video.playbackRate);
      else start();
    };
    const waiting = (): void => {
      buffering = true;
      active?.clock.stop(performance.now(), video.currentTime);
      flush();
    };
    const seeking = (): void => { active?.clock.seeking(); };
    const seeked = (): void => {
      if (!video.paused && !video.ended) playing();
      // A manual seek while paused updates only the resume point, never watch time.
      else if (hasPlayed && !starting) start();
    };
    const ratechange = (): void => {
      if (!active || buffering || video.seeking || video.paused) return;
      active.clock.stop(performance.now(), video.currentTime);
      active.clock.begin(performance.now(), video.currentTime, video.playbackRate);
    };
    const pause = (): void => { finish(); };
    const pagehide = (): void => { finish(true); };
    const pageshow = (): void => { if (!video.paused && !video.ended) playing(); };
    const offline = (): void => {
      finish(true);
      video.pause();
      setSaveState('Đã mất kết nối. Thời gian xem ngoại tuyến không được ghi nhận.');
    };
    const visibilitychange = (): void => {
      // Hidden does NOT mean paused. Save now and keep counting actual background playback.
      sample();
      flush();
    };

    video.addEventListener('playing', playing);
    video.addEventListener('pause', pause);
    video.addEventListener('ended', pause);
    video.addEventListener('error', pause);
    video.addEventListener('waiting', waiting);
    video.addEventListener('seeking', seeking);
    video.addEventListener('seeked', seeked);
    video.addEventListener('ratechange', ratechange);
    video.addEventListener('timeupdate', sample);
    window.addEventListener('pagehide', pagehide);
    window.addEventListener('pageshow', pageshow);
    window.addEventListener('offline', offline);
    document.addEventListener('visibilitychange', visibilitychange);
    // timeupdate is also used above: background media events can outlive throttled timers.
    const timer = window.setInterval(sample, 1000);
    if (!video.paused && !video.ended) playing();

    return () => {
      disposed = true;
      finish(true);
      clearInterval(timer);
      video.removeEventListener('playing', playing);
      video.removeEventListener('pause', pause);
      video.removeEventListener('ended', pause);
      video.removeEventListener('error', pause);
      video.removeEventListener('waiting', waiting);
      video.removeEventListener('seeking', seeking);
      video.removeEventListener('seeked', seeked);
      video.removeEventListener('ratechange', ratechange);
      video.removeEventListener('timeupdate', sample);
      window.removeEventListener('pagehide', pagehide);
      window.removeEventListener('pageshow', pageshow);
      window.removeEventListener('offline', offline);
      document.removeEventListener('visibilitychange', visibilitychange);
    };
  }, [courseId, lessonId, videoUrl, videoRef, eligible, userId, queryClient]);

  return { progress: enabled ? query.data : null, isLoading: query.isLoading, isError: query.isError, saveState, refetch: query.refetch };
}
