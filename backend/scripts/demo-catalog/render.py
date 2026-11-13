"""Render 48 course covers and one shared, narrated, seven-minute demo lesson."""
import argparse
import hashlib
import html
import json
import os
from pathlib import Path
import re
import subprocess
import time
import urllib.parse
import urllib.request

from PIL import Image, ImageDraw, ImageFont, ImageOps
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1] / '.cache' / 'demo-catalog'
FFMPEG = os.environ.get('FFMPEG_PATH', 'ffmpeg')
FONT = Path(os.environ.get('DEMO_FONT', 'C:/Windows/Fonts/arial.ttf'))
BOLD = Path(os.environ.get('DEMO_FONT_BOLD', 'C:/Windows/Fonts/arialbd.ttf'))
VERSION = 'shared-seven-minute-v1'


def ffmpeg(*args):
    result = subprocess.run([FFMPEG, '-hide_banner', '-loglevel', 'error', '-y', *map(str, args)],
                            capture_output=True, text=True, encoding='utf-8', errors='replace')
    if result.returncode:
        raise RuntimeError(result.stderr[-3000:])


def duration(path):
    result = subprocess.run([FFMPEG, '-hide_banner', '-i', str(path)], capture_output=True,
                            text=True, encoding='utf-8', errors='replace')
    match = re.search(r'Duration: (\d+):(\d+):(\d+\.\d+)', result.stderr)
    if not match:
        raise RuntimeError(f'Cannot read media duration: {path}')
    h, m, s = map(float, match.groups())
    return h * 3600 + m * 60 + s


def speech(text, out):
    cache = ROOT / 'speech'
    cache.mkdir(exist_ok=True)
    chunks, current = [], ''
    for word in text.split():
        candidate = f'{current} {word}'.strip()
        if len(candidate) > 175:
            chunks.append(current)
            current = word
        else:
            current = candidate
    if current:
        chunks.append(current)
    parts = []
    for chunk in chunks:
        target = cache / (hashlib.sha256(chunk.encode()).hexdigest() + '.mp3')
        if not target.exists():
            query = urllib.parse.urlencode({'ie': 'UTF-8', 'client': 'tw-ob', 'tl': 'vi', 'q': chunk})
            request = urllib.request.Request('https://translate.google.com/translate_tts?' + query,
                                             headers={'User-Agent': 'Mozilla/5.0'})
            for attempt in range(4):
                try:
                    with urllib.request.urlopen(request, timeout=30) as response:
                        data = response.read()
                        if 'audio' not in response.headers.get('Content-Type', '') or len(data) < 1000:
                            raise RuntimeError('Speech response is not valid audio')
                    target.write_bytes(data)
                    break
                except Exception:
                    if attempt == 3:
                        raise
                    time.sleep(2 ** attempt)
        parts.append(target.read_bytes())
    out.write_bytes(b''.join(parts))
    return duration(out)


def wrapped(draw, text, x, y, size, width, color, bold=False, spacing=10):
    font = ImageFont.truetype(str(BOLD if bold else FONT), size)
    lines, line = [], ''
    for word in text.split():
        candidate = (line + ' ' + word).strip()
        if draw.textlength(candidate, font=font) > width and line:
            lines.append(line)
            line = word
        else:
            line = candidate
    if line:
        lines.append(line)
    for line in lines:
        draw.text((x, y), line, font=font, fill=color)
        y += size + spacing
    return y


def slide(topic, number, source_photo, out):
    canvas = Image.new('RGB', (1280, 720), '#f6f3ec')
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 0, 1280, 13), fill='#176450')
    wrapped(draw, f'MINDLY / KỸ NĂNG HỌC TẬP / {number:02} TRÊN 07', 52, 44, 19, 1100, '#176450', True)
    y = wrapped(draw, topic['title'], 52, 110, 37, 725, '#182e2b', True, 11)
    y = wrapped(draw, topic['explanation'], 52, y + 26, 25, 725, '#263c38', spacing=10)
    y = wrapped(draw, 'VÍ DỤ ÁP DỤNG', 52, y + 28, 16, 725, '#176450', True)
    bottom = wrapped(draw, topic['example'], 52, y + 10, 22, 725, '#42554f', spacing=9)
    if bottom > 650:
        raise RuntimeError(f'Slide text overflow: {topic["title"]}')
    photo = ImageOps.fit(Image.open(source_photo).convert('RGB'), (370, 500), method=Image.Resampling.LANCZOS)
    canvas.paste(photo, (850, 120))
    draw.line((52, 660, 1225, 660), fill='#c8d0c7', width=1)
    wrapped(draw, 'Video demo dùng chung · Giọng đọc tiếng Việt · Tự kiểm tra sau mỗi nội dung',
            52, 678, 17, 1160, '#52635c')
    canvas.save(out)


def document(lesson, out):
    pdfmetrics.registerFont(TTFont('Arial', str(FONT)))
    pdfmetrics.registerFont(TTFont('ArialBold', str(BOLD)))
    body = ParagraphStyle('body', fontName='Arial', fontSize=11, leading=17, spaceAfter=10)
    heading = ParagraphStyle('heading', fontName='ArialBold', fontSize=14, leading=20,
                             spaceBefore=16, spaceAfter=10, textColor=colors.HexColor('#176450'))
    title = ParagraphStyle('title', fontName='ArialBold', fontSize=24, leading=31, spaceAfter=20)
    p = lambda text, style=body: Paragraph(html.escape(text), style)
    story = [p(lesson['title'], title), p(lesson['overview'])]
    for index, topic in enumerate(lesson['topics']):
        story += [p(f'{index + 1}. {topic["title"]}', heading), p(topic['explanation']),
                  p('Ví dụ: ' + topic['example']), p('Tự kiểm tra: ' + topic['question'])]
    story += [p('Bài tập tổng kết', heading), p('Chọn một kỹ năng. Viết mục tiêu cụ thể, chia thành ba nhiệm vụ, '
              'thực hiện một sản phẩm nhỏ, nhờ phản hồi và đặt lịch tự kiểm tra lại vào những ngày tiếp theo.'),
              p(lesson['conclusion']), Spacer(1, 14), p('Nội dung tự biên soạn cho demo Mindly. Video có giọng đọc tổng hợp; ảnh minh họa từ Pexels.')]
    def footer(canvas, doc):
        canvas.setFont('Arial', 8)
        canvas.drawString(48, 28, 'Mindly · Tài liệu cho bài video demo 7 phút')
        canvas.drawRightString(548, 28, str(doc.page))
    SimpleDocTemplate(str(out), rightMargin=48, leftMargin=48, topMargin=44, bottomMargin=52,
                      title=lesson['title'], author='Mindly Demo Catalog').build(story, onFirstPage=footer, onLaterPages=footer)


def render():
    manifest = json.loads((ROOT / 'prepared.json').read_text(encoding='utf-8'))
    lesson = json.loads((HERE / 'shared-lesson.json').read_text(encoding='utf-8'))
    for course in manifest['courses']:
        folder = ROOT / 'rendered' / course['slug']
        folder.mkdir(parents=True, exist_ok=True)
        photo = Image.open(course['photoPath']).convert('RGB')
        ImageOps.fit(photo, (1280, 720), method=Image.Resampling.LANCZOS).save(folder / 'cover.webp', quality=86)
    folder = ROOT / 'rendered' / 'shared'
    folder.mkdir(exist_ok=True)
    # Learning, workspace, programming, design, finance, presentation, and yoga imagery.
    photos = [manifest['courses'][i] for i in [17, 20, 0, 7, 13, 19, 44]]
    fingerprint = hashlib.sha256((VERSION + json.dumps([lesson, [p['photo'] for p in photos]],
                                ensure_ascii=False, sort_keys=True)).encode()).hexdigest()
    marker = folder / 'media.json'
    if marker.exists() and json.loads(marker.read_text(encoding='utf-8')).get('fingerprint') == fingerprint:
        if (folder / 'lesson.mp4').exists() and (folder / 'lesson.pdf').exists():
            print('Updated 48 covers; shared seven-minute lesson already rendered.', flush=True)
            return
    document(lesson, folder / 'lesson.pdf')
    timeline, sentences, segments = [], [], []
    for index, topic in enumerate(lesson['topics']):
        audio = folder / f'narration-{index}.mp3'
        raw_duration = speech(topic['narration'], audio)
        # Each narrated section lasts one minute, including a short transition pause.
        tempo = raw_duration / 59.5
        if not 0.65 <= tempo <= 1.5:
            raise RuntimeError(f'Narration requires excessive speed change: {topic["title"]}: {raw_duration}s')
        image, video = folder / f'slide-{index}.png', folder / f'part-{index}.mp4'
        slide(topic, index + 1, photos[index]['photoPath'], image)
        ffmpeg('-loop', '1', '-framerate', '24', '-i', image, '-i', audio, '-t', '60',
               '-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'stillimage', '-threads', '2',
               '-crf', '24', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k', '-ar', '44100',
               '-af', f'atempo={tempo:.8f},apad', '-movflags', '+faststart', video)
        timeline.append({'title': topic['title'], 'start': index * 60, 'end': (index + 1) * 60})
        sentences.append({'text': topic['narration'], 'start': index * 60000, 'end': (index + 1) * 60000 - 500})
        segments.append(video)
        print(f'Rendered minute {index + 1}/7 (narration {raw_duration:.1f}s, tempo {tempo:.2f}).', flush=True)
    listing = folder / 'concat.txt'
    listing.write_text('\n'.join(f"file '{p.name}'" for p in segments), encoding='utf-8')
    ffmpeg('-f', 'concat', '-safe', '0', '-i', listing, '-c', 'copy', '-movflags', '+faststart', folder / 'lesson.mp4')
    measured = duration(folder / 'lesson.mp4')
    if abs(measured - 420) > 1:
        raise RuntimeError(f'Unexpected shared video duration: {measured}')
    marker.write_text(json.dumps({'fingerprint': fingerprint, 'duration': measured, 'timeline': timeline,
                      'sentences': sentences, 'sources': [p['photo'] for p in photos],
                      'narration': 'Original Vietnamese script, synthetic voice'}, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'Completed: 48 covers, one shared video ({measured:.2f}s), one companion PDF.', flush=True)


if __name__ == '__main__':
    argparse.ArgumentParser(description=__doc__).parse_args()
    render()
