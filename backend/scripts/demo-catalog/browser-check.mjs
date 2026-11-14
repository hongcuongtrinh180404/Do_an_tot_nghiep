import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { Browser } from '../../../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.cache/demo-catalog/enrolled');
process.env.TASTE_SKILL_TMP ??= 'C:/Users/cuong/AppData/Local/Temp/opencode';
const origin = process.env.DEMO_FRONTEND_URL ?? 'http://localhost:3000';
const api = process.env.DEMO_API_URL ?? 'http://localhost:8000/api/v1';
await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME ?? 'thc_datn' });
let browser;
try {
  const db = mongoose.connection.db;
  const course = await db.collection('courses').findOne({ seedBatch: 'mindly-demo-catalog-v1', slug: 'xay-dung-ung-dung-react' });
  assert(course);
  const section = await db.collection('sections').findOne({ courseId: course._id, deletedAt: null });
  const lesson = await db.collection('lessons').findOne({
    sectionId: section._id, seedBatch: 'mindly-demo-enrolled-lesson-v1', deletedAt: null,
  });
  const owner = await db.collection('users').findOne({ _id: course.instructorId, status: 'active', deletedAt: null });
  assert(lesson && owner);
  const token = new JwtService({ secret: process.env.JWT_SECRET }).sign({ sub: owner._id.toString() }, { expiresIn: '10m' });
  const profile = { id: owner._id.toString(), fullName: owner.fullName, role: owner.role,
    email: owner.email, status: owner.status, isEmailVerified: true };
  const lessonPath = `/courses/${course._id}/lessons/${lesson._id}`;
  browser = await Browser.launch();
  const guest = await browser.newPage({ width: 1440, height: 1000 });
  await guest.goto(origin + lessonPath, { settleMs: 2500, timeoutMs: 60000 });
  const locked = await guest.eval(async () => {
    for (let i = 0; i < 100; i++) {
      if (document.body.innerText.includes('Nội dung bài học có tính phí')) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return { paywall: document.body.innerText.includes('Nội dung bài học có tính phí'),
      videos: document.querySelectorAll('video').length };
  });
  assert(locked.paywall && locked.videos === 0, 'Guest could access locked video or the paywall did not render.');
  await guest.screenshot({ path: path.join(root, 'browser-paywall.jpg') });
  await guest.close();

  const page = await browser.newPage({ width: 1440, height: 1000 });
  await page.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `localStorage.setItem('accessToken',${JSON.stringify(token)});localStorage.setItem('user',${JSON.stringify(JSON.stringify(profile))});`,
  });
  await page.goto(origin + lessonPath, { settleMs: 2500, timeoutMs: 60000 });
  const player = await page.eval(async () => {
    for (let i = 0; i < 150; i++) {
      const video = document.querySelector('video');
      if (video?.readyState >= 2) return { duration: video.duration, urlSigned: video.currentSrc.includes('X-Amz-Signature='), ready: true };
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return { ready: false, text: document.body.innerText.slice(0, 600) };
  });
  assert(player.ready && player.urlSigned && Math.abs(player.duration - 535.36) < 1, 'Authorized video did not load.');
  await page.screenshot({ path: path.join(root, 'browser-player.jpg') });
  const tabs = {};
  for (const label of ['Summary', 'Mindmap', 'Quiz']) {
    tabs[label] = await page.eval(async (name) => {
      const button = [...document.querySelectorAll('button')].find((item) => item.textContent.includes(name));
      if (!button) throw new Error(`Missing tab: ${name}`);
      button.click();
      await new Promise((resolve) => setTimeout(resolve, 700));
      const panel = button.closest('section');
      panel.scrollIntoView({ block: 'start' });
      return panel.innerText;
    }, label);
  }
  assert(tabs.Summary.includes('Bối cảnh quốc tế'));
  assert(tabs.Mindmap.includes('Cách mạng tháng Tám 1945'));
  assert(tabs.Quiz.includes('Ngày 9-5-1945'));
  assert(tabs.Quiz.includes('08:35'));

  // Decode/play the same signed media in an isolated element, so browser QA
  // never creates teacher watch-progress/quiz-attempt records.
  const mediaPage = await browser.newPage({ width: 1280, height: 720 });
  const detail = await (await fetch(`${api}/lessons/${lesson._id}`, { headers: { Authorization: `Bearer ${token}` } })).json();
  const playback = await mediaPage.eval(async (url) => {
    const video = document.createElement('video');
    video.src = url;
    video.muted = true;
    document.body.append(video);
    await video.play();
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const result = { duration: video.duration, currentTime: video.currentTime, width: video.videoWidth, height: video.videoHeight };
    video.pause();
    return result;
  }, detail.data.content.url);
  assert(playback.currentTime > 0 && playback.width === 1920 && playback.height === 1080);
  const result = { anonymousPaywall: true, authorizedSignedVideo: true, durationSeconds: playback.duration,
    videoPlayback: true, summaryRendered: true, mindmapRendered: true, quizListRendered: true };
  await fs.writeFile(path.join(root, 'browser-verification.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser?.close();
  await mongoose.disconnect();
}
