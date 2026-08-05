/**
 * ממיר את icon.svg לאייקוני PNG.
 * נחוץ כי אייפון אינו תומך ב־SVG לאייקון מסך הבית (apple-touch-icon חייב PNG).
 * רץ אוטומטית לפני build.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const pub = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const svg = readFileSync(join(pub, 'icon.svg'));

// אייקון רגיל
for (const size of [180, 192, 512]) {
  const buf = await sharp(svg, { density: 400 }).resize(size, size).png().toBuffer();
  writeFileSync(join(pub, `icon-${size}.png`), buf);
  console.log(`✓ icon-${size}.png`);
}

// גרסה maskable לאנדרואיד: התוכן מוקטן ל־80% כדי לשרוד חיתוך עגול
const inner = await sharp(svg, { density: 400 }).resize(410, 410).png().toBuffer();
const maskable = await sharp({
  create: { width: 512, height: 512, channels: 4, background: '#F7EBD6' },
})
  .composite([{ input: inner, top: 51, left: 51 }])
  .png()
  .toBuffer();
writeFileSync(join(pub, 'icon-maskable-512.png'), maskable);
console.log('✓ icon-maskable-512.png');
