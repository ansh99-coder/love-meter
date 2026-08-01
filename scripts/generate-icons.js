// Love Meter - Icon Generator
// Creates simple SVG icons and converts them to PNG via canvas
// Run: node scripts/generate-icons.js

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = join(fileURLToPath(import.meta.url), '..');
const iconsDir = join(__dirname, '..', 'public', 'icons');

mkdirSync(iconsDir, { recursive: true });

function createSVGIcon(size, gradient = true) {
  const colors = gradient
    ? `<defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
         <stop offset="0%" stop-color="#ff2f87"/>
         <stop offset="100%" stop-color="#7c3aff"/>
       </linearGradient></defs>`
    : '';
  const fill = gradient ? 'url(#g)' : '#ff2f87';
  const heart = gradient
    ? `<text x="${size/2}" y="${size*0.75}" font-size="${size*0.6}" text-anchor="middle" fill="${fill}">❤️</text>`
    : `<text x="${size/2}" y="${size*0.75}" font-size="${size*0.6}" text-anchor="middle">❤️</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${size*0.15}" fill="#0a0012"/>
    ${colors}
    ${heart}
  </svg>`;
}

// Generate PNG icons using a simple SVG approach
// For production, we'd use a proper tool, but SVG icons work in most browsers
const icons = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'icon-192-maskable.png', size: 192 },
  { name: 'icon-512-maskable.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'og-image.png', size: 1200 },
];

for (const icon of icons) {
  const isOg = icon.name === 'og-image.png';
  let svg;
  if (isOg) {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0a0012"/>
          <stop offset="50%" stop-color="#120726"/>
          <stop offset="100%" stop-color="#0a0012"/>
        </linearGradient>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ff2f87"/>
          <stop offset="100%" stop-color="#7c3aff"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#bg)"/>
      <rect x="0" y="0" width="1200" height="630" fill="rgba(124,58,255,0.05)"/>
      <text x="600" y="280" font-size="80" text-anchor="middle" fill="url(#g)" font-family="sans-serif" font-weight="900">Love Meter ❤️</text>
      <text x="600" y="360" font-size="32" text-anchor="middle" fill="#b9a9db" font-family="sans-serif">Discover your magical love compatibility</text>
      <text x="600" y="460" font-size="40" text-anchor="middle">❤️</text>
    </svg>`;
  } else {
    svg = createSVGIcon(icon.size, !icon.name.includes('maskable'));
  }
  writeFileSync(join(iconsDir, icon.name), svg);
  console.log(`✓ Created ${icon.name}`);
}

// Also create a simple HTML page with inline SVG that works as favicon
const faviconSvg = createSVGIcon(32);
writeFileSync(join(iconsDir, '..', 'favicon.svg'), faviconSvg);
console.log('✓ Updated favicon.svg');

console.log('\n✅ All icons generated!');
