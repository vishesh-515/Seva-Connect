const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const rootDir = process.cwd();
const publicDir = path.join(rootDir, 'public');
const brandDir = path.join(publicDir, 'brand');
if (!fs.existsSync(brandDir)) fs.mkdirSync(brandDir, { recursive: true });

const srcPath = 'C:/Users/vishe/.gemini/antigravity-ide/brain/2ec368a2-9eb3-4aff-b971-1ae043b4accc/.user_uploaded/media_1792433390917.png';
const src = PNG.sync.read(fs.readFileSync(srcPath));

// 1. Save original full logo
const srcBuffer = fs.readFileSync(srcPath);
fs.writeFileSync(path.join(brandDir, 'seva-connect-logo.png'), srcBuffer);
fs.writeFileSync(path.join(brandDir, 'seva-connect-full.png'), srcBuffer);

// 2. Emblem extraction
// Emblem bbox: minX: 230, maxX: 903, minY: 108, maxY: 686
const emW = 903 - 230; // 673
const emH = 686 - 108; // 578
const canvasSize = 720;
const padX = Math.round((canvasSize - emW) / 2);
const padY = Math.round((canvasSize - emH) / 2);

const emblemCanvas = new PNG({ width: canvasSize, height: canvasSize });
for (let i = 0; i < canvasSize * canvasSize * 4; i++) emblemCanvas.data[i] = 0;

for (let dy = 0; dy < emH; dy++) {
  for (let dx = 0; dx < emW; dx++) {
    const sIdx = ((108 + dy) * src.width + (230 + dx)) * 4;
    const dIdx = ((padY + dy) * canvasSize + (padX + dx)) * 4;
    emblemCanvas.data[dIdx] = src.data[sIdx];
    emblemCanvas.data[dIdx + 1] = src.data[sIdx + 1];
    emblemCanvas.data[dIdx + 2] = src.data[sIdx + 2];
    emblemCanvas.data[dIdx + 3] = src.data[sIdx + 3];
  }
}

function resizePNG(img, targetW, targetH) {
  const dst = new PNG({ width: targetW, height: targetH });
  const xRatio = img.width / targetW;
  const yRatio = img.height / targetH;

  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const srcXStart = Math.floor(x * xRatio);
      const srcXEnd = Math.min(Math.ceil((x + 1) * xRatio), img.width);
      const srcYStart = Math.floor(y * yRatio);
      const srcYEnd = Math.min(Math.ceil((y + 1) * yRatio), img.height);

      let rSum = 0, gSum = 0, bSum = 0, aSum = 0, count = 0;
      for (let sy = srcYStart; sy < srcYEnd; sy++) {
        for (let sx = srcXStart; sx < srcXEnd; sx++) {
          const idx = (sy * img.width + sx) * 4;
          const a = img.data[idx + 3] / 255;
          rSum += img.data[idx] * a;
          gSum += img.data[idx + 1] * a;
          bSum += img.data[idx + 2] * a;
          aSum += img.data[idx + 3];
          count++;
        }
      }
      const dstIdx = (y * targetW + x) * 4;
      if (aSum > 0) {
        dst.data[dstIdx] = Math.round(rSum / (aSum / 255));
        dst.data[dstIdx + 1] = Math.round(gSum / (aSum / 255));
        dst.data[dstIdx + 2] = Math.round(bSum / (aSum / 255));
        dst.data[dstIdx + 3] = Math.round(aSum / count);
      } else {
        dst.data[dstIdx] = 0;
        dst.data[dstIdx + 1] = 0;
        dst.data[dstIdx + 2] = 0;
        dst.data[dstIdx + 3] = 0;
      }
    }
  }
  return dst;
}

const emblem512 = resizePNG(emblemCanvas, 512, 512);
fs.writeFileSync(path.join(brandDir, 'seva-connect-emblem.png'), PNG.sync.write(emblem512));

const emblem180 = resizePNG(emblemCanvas, 180, 180);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), PNG.sync.write(emblem180));

const emblem64 = resizePNG(emblemCanvas, 64, 64);
fs.writeFileSync(path.join(publicDir, 'favicon-64x64.png'), PNG.sync.write(emblem64));

const emblem32 = resizePNG(emblemCanvas, 32, 32);
fs.writeFileSync(path.join(publicDir, 'favicon.png'), PNG.sync.write(emblem32));
fs.writeFileSync(path.join(publicDir, 'favicon-32x32.png'), PNG.sync.write(emblem32));

const emblem16 = resizePNG(emblemCanvas, 16, 16);
fs.writeFileSync(path.join(publicDir, 'favicon-16x16.png'), PNG.sync.write(emblem16));

// Build ICO from 16, 32, 48
const emblem48 = resizePNG(emblemCanvas, 48, 48);
const pngBuffers = [
  PNG.sync.write(emblem16),
  PNG.sync.write(emblem32),
  PNG.sync.write(emblem48)
];
const sizes = [16, 32, 48];

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(pngBuffers.length, 4);

let offset = 6 + pngBuffers.length * 16;
const dirEntries = [];
for (let i = 0; i < pngBuffers.length; i++) {
  const entry = Buffer.alloc(16);
  entry.writeUInt8(sizes[i], 0);
  entry.writeUInt8(sizes[i], 1);
  entry.writeUInt8(0, 2);
  entry.writeUInt8(0, 3);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(pngBuffers[i].length, 8);
  entry.writeUInt32LE(offset, 12);
  dirEntries.push(entry);
  offset += pngBuffers[i].length;
}

const icoBuffer = Buffer.concat([header, ...dirEntries, ...pngBuffers]);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);

// Also generate public/favicon.svg that embeds base64 of emblem512
const base64Emblem = PNG.sync.write(emblem512).toString('base64');
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <image width="512" height="512" href="data:image/png;base64,${base64Emblem}"/>
</svg>
`;
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent);

console.log('Successfully generated all brand assets and favicons!');
