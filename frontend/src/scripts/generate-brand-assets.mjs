import fs from 'fs';
import path from 'path';

const brandDir = 'frontend/public/brand';
if (!fs.existsSync(brandDir)) {
  fs.mkdirSync(brandDir, { recursive: true });
}

// 1. Read the official trace from refer/logo_nguoi_hoc_trace.svg
const referSvg = fs.readFileSync('refer/logo_nguoi_hoc_trace.svg', 'utf8');
const match = referSvg.match(/d="([^"]+)"/);
if (!match) throw new Error('Could not find path d attribute in refer/logo_nguoi_hoc_trace.svg');
const pathD = match[1];

// 2. Standalone Icon SVG
function buildIconOnlySvg(color = '#FF1018') {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1389 1132" width="1389" height="1132" fill="none">
  <path d="${pathD}" fill="${color}" fill-rule="evenodd" clip-rule="evenodd"/>
</svg>`;
}

// 3. Full Logo SVG
function buildFullLogoSvg({
  iconColor = '#FF1018',
  textColor = '#FF1018',
  sloganColor = '#4A387D',
  includeXml = true,
}) {
  const xmlHeader = includeXml ? `<?xml version="1.0" encoding="UTF-8"?>\n` : '';
  const scale = (70 / 1132).toFixed(6);

  return `${xmlHeader}<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 84" width="280" height="84" fill="none">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@800;900&amp;display=swap');
      .mindly-brand-title {
        font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
        font-weight: 900;
        font-size: 44px;
        letter-spacing: -0.6px;
      }
      .mindly-brand-slogan {
        font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
        font-weight: 800;
        font-size: 8.8px;
        letter-spacing: 3.8px;
      }
    </style>
  </defs>

  <!-- 1. Left Thinking Student Icon (Official Traced Vector) -->
  <g transform="translate(6, 7) scale(${scale})">
    <path d="${pathD}" fill="${iconColor}" fill-rule="evenodd" clip-rule="evenodd"/>
  </g>

  <!-- 2. Wordmark "Mindly" -->
  <text x="106" y="53" class="mindly-brand-title" fill="${textColor}">Mindly</text>

  <!-- 3. Slogan "MAP YOUR MIND" -->
  <text x="108" y="72" class="mindly-brand-slogan" fill="${sloganColor}">MAP YOUR MIND</text>
</svg>`;
}

// Generate files:
// Canonical light logo
fs.writeFileSync(
  path.join(brandDir, 'mindly-logo-light.svg'),
  buildFullLogoSvg({
    iconColor: '#FF1018',
    textColor: '#FF1018',
    sloganColor: '#4A387D',
  })
);

// Canonical dark header logo
fs.writeFileSync(
  path.join(brandDir, 'mindly-logo-dark.svg'),
  buildFullLogoSvg({
    iconColor: '#FF1018',
    textColor: '#FFFFFF',
    sloganColor: '#CBD5E1',
  })
);

// Default logo
fs.writeFileSync(
  path.join(brandDir, 'mindly-logo.svg'),
  buildFullLogoSvg({
    iconColor: '#FF1018',
    textColor: '#FF1018',
    sloganColor: '#4A387D',
  })
);

// Standalone thinking student icon
fs.writeFileSync(
  path.join(brandDir, 'mindly-icon.svg'),
  buildIconOnlySvg('#FF1018')
);

console.log('Successfully generated official brand SVG assets in frontend/public/brand/');
