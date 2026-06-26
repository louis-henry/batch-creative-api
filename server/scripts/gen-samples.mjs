// One-off generator for the committed sample images. Run: node scripts/gen-samples.mjs
import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

const OUT = '../samples';

const product = (label, color, accent) => `
<svg width="900" height="900" xmlns="http://www.w3.org/2000/svg">
  <rect width="900" height="900" fill="#f4f4f5"/>
  <ellipse cx="450" cy="760" rx="220" ry="36" fill="#00000018"/>
  <rect x="330" y="180" width="240" height="520" rx="44" fill="${color}"/>
  <rect x="330" y="300" width="240" height="120" fill="${accent}" opacity="0.9"/>
  <text x="450" y="372" font-size="46" font-family="Helvetica, Arial" font-weight="700"
        fill="#ffffff" text-anchor="middle">${label}</text>
</svg>`;

const reference = (a, b) => `
<svg width="900" height="900" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/>
  </linearGradient></defs>
  <rect width="900" height="900" fill="url(#g)"/>
  <circle cx="220" cy="240" r="160" fill="#ffffff22"/>
  <circle cx="700" cy="680" r="220" fill="#00000018"/>
</svg>`;

const png = (svg, name) => sharp(Buffer.from(svg)).png().toFile(`${OUT}/${name}.png`);

await mkdir(OUT, { recursive: true });
await Promise.all([
  png(product('AURA', '#2f6db0', '#1d4b7e'), 'product-bottle'),
  png(product('BREW', '#7a4a2b', '#5a3620'), 'product-can'),
  png(reference('#f6c177', '#b8643a'), 'reference-warm'),
  png(reference('#5b6ee1', '#1f2a55'), 'reference-cool'),
]);
console.log('samples written to', OUT);
