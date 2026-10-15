import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const source = path.join(root, "public/images/brand/maige-logo.jpg");
const brandDir = path.join(root, "public/images/brand");
const iconDir = path.join(root, "public/icons");
await mkdir(iconDir, { recursive: true });

// These bounds isolate pixels from the supplied 578px official logo. No mark or
// wordmark is redrawn; the white field is retained to avoid JPEG edge halos.
const mark = await sharp(source).extract({ left: 145, top: 100, width: 288, height: 214 }).png().toBuffer();
const wordmark = await sharp(source).extract({ left: 90, top: 333, width: 398, height: 142 }).png().toBuffer();

async function squareMark(size, markWidth) {
  const scaled = await sharp(mark).resize({ width: markWidth }).png().toBuffer();
  const { height } = await sharp(scaled).metadata();
  return sharp({ create: { width: size, height: size, channels: 4, background: "#ffffff" } })
    .composite([{ input: scaled, left: Math.round((size - markWidth) / 2), top: Math.round((size - height) / 2) }])
    .png().toBuffer();
}

const icon512 = await squareMark(512, 470);
await writeFile(path.join(root, "app/icon.png"), icon512);
await writeFile(path.join(iconDir, "icon-512.png"), icon512);
await writeFile(path.join(iconDir, "icon-192.png"), await sharp(icon512).resize(192).png().toBuffer());
await writeFile(path.join(root, "app/apple-icon.png"), await sharp(icon512).resize(180).png().toBuffer());
await writeFile(path.join(iconDir, "maskable-512.png"), await squareMark(512, 335));

const faviconSizes = [16, 32, 48];
const faviconPngs = await Promise.all(faviconSizes.map((size) => sharp(icon512).resize(size).png().toBuffer()));
const directoryLength = 6 + faviconSizes.length * 16;
const icoHeader = Buffer.alloc(directoryLength);
icoHeader.writeUInt16LE(1, 2);
icoHeader.writeUInt16LE(faviconSizes.length, 4);
let offset = directoryLength;
faviconSizes.forEach((size, index) => {
  const entry = 6 + index * 16;
  icoHeader.writeUInt8(size, entry);
  icoHeader.writeUInt8(size, entry + 1);
  icoHeader.writeUInt16LE(1, entry + 4);
  icoHeader.writeUInt16LE(32, entry + 6);
  icoHeader.writeUInt32LE(faviconPngs[index].length, entry + 8);
  icoHeader.writeUInt32LE(offset, entry + 12);
  offset += faviconPngs[index].length;
});
await writeFile(path.join(root, "app/favicon.ico"), Buffer.concat([icoHeader, ...faviconPngs]));

const horizontalMark = await sharp(mark).resize({ height: 190 }).png().toBuffer();
const horizontalWordmark = await sharp(wordmark).resize({ width: 460 }).png().toBuffer();
await sharp({ create: { width: 760, height: 210, channels: 4, background: "#ffffff" } })
  .composite([
    { input: horizontalMark, left: 12, top: 10 },
    { input: horizontalWordmark, left: 292, top: 23 },
  ])
  .png().toFile(path.join(brandDir, "maige-horizontal.png"));

function socialBackground(width, height, hostText) {
  const textX = width === 1200 ? 570 : 610;
  const titleSize = width === 1200 ? 54 : 58;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs><linearGradient id="blue" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#092b65"/><stop offset="1" stop-color="#0b55a8"/></linearGradient></defs>
    <rect width="${width}" height="${height}" fill="url(#blue)"/>
    <circle cx="${width - 45}" cy="90" r="250" fill="#4b9fe0" opacity=".13"/>
    <circle cx="${width - 80}" cy="${height - 10}" r="220" fill="#88caee" opacity=".12"/>
    <path d="M${textX} 450H${width - 75}" stroke="#a6d7f6" opacity=".55"/>
    <rect x="50" y="74" width="455" height="${height - 148}" rx="22" fill="#ffffff"/>
    <text x="${textX}" y="205" font-size="${titleSize}" font-weight="700" font-family="Arial,Helvetica,sans-serif" fill="#ffffff">MAIGE Bioscience</text>
    <text x="${textX}" y="282" font-size="31" font-family="Arial,Helvetica,sans-serif" fill="#e2f2ff">Life Science Research Products</text>
    <text x="${textX}" y="358" font-size="26" font-family="Arial,Helvetica,sans-serif" fill="#d0e9fa">Dialysis Tubing  ·  ELISA Kits</text>
    <text x="${textX}" y="${height - 90}" font-size="25" font-weight="700" font-family="Arial,Helvetica,sans-serif" fill="#ffffff">${hostText}</text>
  </svg>`);
}

async function socialCard(width, height, filename) {
  const logo = await sharp(source).resize(375, 375).png().toBuffer();
  await sharp(socialBackground(width, height, "maigebio.com"))
    .composite([{ input: logo, left: 90, top: Math.round((height - 375) / 2) }])
    .png().toFile(path.join(brandDir, filename));
}
await socialCard(1200, 630, "maige-social.png");
await socialCard(1280, 640, "maige-github-preview.png");

const original = await readFile(source);
console.log(`Generated exact-source MAIGE brand assets from ${original.length} source bytes.`);
