// Import the selected, reviewed Pexels search-page snapshots into a portable manifest.
// Usage: node scripts/demo-catalog/collect-sources.mjs <downloaded-html> ...
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const selections = {
  'cong-nghe-thong-tin': { photos: [1181359, 574077, 31343632, 6424585], video: 2278095 },
  'thiet-ke-do-hoa': { photos: [7971537, 16313660, 20456575, 326514], video: 8126007 },
  marketing: { photos: [6476260, 7693201, 7651801, 7947999], video: 7687928 },
  'tai-chinh': { photos: [4968631, 5900178, 7693686, 7567443], video: 5981287 },
  'ngoai-ngu': { photos: [10549488, 5649522, 5649518, 6476782], video: 4443259 },
  'tin-hoc-van-phong': { photos: [1128207, 6694560, 7735769, 7580704], video: 854167 },
  'bat-dong-san': { photos: [17000987, 31656168, 16495231, 4534504], video: 34042850 },
  'edit-video': { photos: [11063289, 1188751, 695730, 30229850], video: 5092427 },
  tiktok: { photos: [9040531, 8357239, 9040535, 39570848], video: 9032611 },
  'phong-thuy': { photos: [2187966, 28461033, 23224447, 1743555], video: 34955072 },
  shopee: { photos: [6214474, 5878878, 7620626, 6214388], video: 7287308 },
  yoga: { photos: [39190415, 373936, 36715238, 16131310], video: 8480625 },
};

const assets = new Map();
for (const input of process.argv.slice(2)) {
  const html = fs.readFileSync(input, 'utf8');
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);
  if (!match) throw new Error(`Missing Pexels page data: ${input}`);
  const data = JSON.parse(match[1]).props.pageProps.initialData.data;
  for (const item of data) {
    if (item.type === 'photo' || item.type === 'video') {
      assets.set(`${item.type}:${item.attributes.id}`, item.attributes);
    }
  }
}

function source(kind, id) {
  const asset = assets.get(`${kind}:${id}`);
  if (!asset) throw new Error(`Selected asset not found: ${kind}:${id}`);
  const video = asset.video?.video_files
    .filter((file) => file.file_type === 'video/mp4' && file.width > file.height)
    .sort((a, b) => Math.abs(a.width - 1280) - Math.abs(b.width - 1280))[0];
  const url = kind === 'photo' ? asset.image.large : video?.link;
  if (!url) throw new Error(`No download URL: ${kind}:${id}`);
  return {
    id, url,
    page: `https://www.pexels.com/${kind}/${asset.slug}-${id}/`,
    author: [asset.user?.first_name, asset.user?.last_name].filter(Boolean).join(' ').trim(),
    description: asset.description || asset.alt,
    license: 'Pexels License',
    licenseUrl: 'https://www.pexels.com/license/',
  };
}

const manifest = Object.fromEntries(Object.entries(selections).map(([category, selection]) => [
  category, { photos: selection.photos.map((id) => source('photo', id)), video: source('video', selection.video) },
]));
fs.writeFileSync(fileURLToPath(new URL('./sources.json', import.meta.url)), `${JSON.stringify(manifest, null, 2)}\n`);
console.log('Saved 48 reviewed photographs and 12 category video sources.');
