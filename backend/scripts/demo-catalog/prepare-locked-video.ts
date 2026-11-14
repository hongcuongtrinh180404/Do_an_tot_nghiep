import 'reflect-metadata';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import ffmpeg from 'ffmpeg-static';
import { ConfigService } from '@nestjs/config';
import { AssemblyAiService } from '../../src/modules/assemblyai/assemblyai.service.js';

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.cache/demo-catalog/enrolled');
const source = process.argv[2];
assert(source, 'Pass the path to the Vietnamese source video.');
await fs.mkdir(root, { recursive: true });
const stat = await fs.stat(source);
assert(stat.isFile() && stat.size > 1000);
let probe = '';
try { await run(String(ffmpeg), ['-hide_banner', '-i', source]); } catch (error) {
  probe = (error as { stderr: string }).stderr;
}
const durationMatch = probe.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
assert(durationMatch, 'Cannot detect video duration.');
const seconds = Number(durationMatch[1]) * 3600 + Number(durationMatch[2]) * 60 + Number(durationMatch[3]);
const hash = createHash('sha256').update(await fs.readFile(source)).digest('hex');
const metadataFile = path.join(root, 'source.json');
let existing: { sha256?: string } = {};
try { existing = JSON.parse(await fs.readFile(metadataFile, 'utf8')); } catch { /* First run. */ }
if (existing.sha256 && existing.sha256 !== hash) throw new Error('A different source has already been prepared; use a new cache before replacing it.');
const metadata = { sourcePath: path.resolve(source), sourceFileName: path.basename(source), sha256: hash,
  title: 'Cách mạng tháng Tám – Tóm tắt nhanh lịch sử Việt Nam',
  author: 'EZ Sử', source: 'Video do người dùng cung cấp', duration: Math.round(seconds),
  actualDuration: seconds, preparedAt: new Date().toISOString() };
await fs.writeFile(metadataFile, JSON.stringify(metadata, null, 2));
async function exists(file: string) {
  try { return (await fs.stat(path.join(root, file))).size > 1000; } catch { return false; }
}
if (!await exists('audio.mp3')) {
  await run(String(ffmpeg), ['-hide_banner', '-loglevel', 'error', '-y', '-i', source, '-vn',
    '-ac', '1', '-ar', '16000', '-b:a', '64k', path.join(root, 'audio.mp3')]);
}
console.log(`Prepared Vietnamese audio (${seconds}s); transcoding video and transcribing once.`);
await Promise.all([
  (async () => {
    if (await exists('lesson.mp4')) return;
    const temporary = path.join(root, 'encoding.mp4');
    await run(String(ffmpeg), ['-hide_banner', '-loglevel', 'error', '-y', '-i', source,
      '-vf', 'scale=-2:1080', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24',
      '-pix_fmt', 'yuv420p', '-threads', '4', '-c:a', 'aac', '-b:a', '128k',
      '-movflags', '+faststart', temporary], { maxBuffer: 2 * 1024 * 1024 });
    await fs.rename(temporary, path.join(root, 'lesson.mp4'));
    console.log('Browser-compatible H.264 video ready.');
  })(),
  (async () => {
    if (await exists('transcript.json')) return;
    const service = new AssemblyAiService(new ConfigService(process.env));
    const transcript = await service.transcribeFile(path.join(root, 'audio.mp3'), { languageCode: 'vi' });
    assert(transcript.sentences.length > 10 && transcript.rawTranscript.length > 1000, 'Incomplete transcript.');
    await fs.writeFile(path.join(root, 'transcript.json'), JSON.stringify(transcript, null, 2));
    console.log(`Vietnamese transcript ready: ${transcript.sentences.length} sentences.`);
  })(),
]);
