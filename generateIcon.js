const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Create 512x512 PNG file in build/icon.png (required by electron-builder for macOS/Linux)
function createPng() {
  const width = 512;
  const height = 512;
  const cx = width / 2;
  const cy = height / 2;
  const r = width / 2 - 24;

  // Uncompressed raw image data: filter byte (0) + RGBA for each scanline
  const rawData = Buffer.alloc(height * (1 + width * 4));

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + width * 4);
    rawData[rowOffset] = 0; // Filter type: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= r) {
        if (dist >= r - 32) {
          // Amber glow #E5A00D
          rawData[pxOffset] = 0xe5;     // R
          rawData[pxOffset + 1] = 0xa0; // G
          rawData[pxOffset + 2] = 0x0d; // B
          rawData[pxOffset + 3] = 0xff; // A
        } else if (dist >= r - 44) {
          // Dark accent border
          rawData[pxOffset] = 0x1c;
          rawData[pxOffset + 1] = 0x24;
          rawData[pxOffset + 2] = 0x30;
          rawData[pxOffset + 3] = 0xff;
        } else {
          // Central chevron (scaled for 512x512)
          const inChevron = (dx > -60 && dx < 80 && Math.abs(dy) < 100 && dx + Math.abs(dy)*0.7 < 90);
          if (inChevron) {
            rawData[pxOffset] = 0xf5;     // R
            rawData[pxOffset + 1] = 0xb8; // G
            rawData[pxOffset + 2] = 0x10; // B
            rawData[pxOffset + 3] = 0xff; // A
          } else {
            rawData[pxOffset] = 0x0f;     // R
            rawData[pxOffset + 1] = 0x17; // G
            rawData[pxOffset + 2] = 0x1f; // B
            rawData[pxOffset + 3] = 0xff; // A
          }
        }
      } else {
        rawData[pxOffset] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0;
      }
    }
  }

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);

    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const toCrc = Buffer.concat([typeBuf, data]);

    let crc = 0 ^ (-1);
    for (let i = 0; i < toCrc.length; i++) {
      crc = (crc >>> 8) ^ crcTable[(crc ^ toCrc[i]) & 0xff];
    }
    crc = (crc ^ (-1)) >>> 0;
    crcBuf.writeUInt32BE(crc, 0);

    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    crcTable[n] = c;
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: 6 (RGBA)
  ihdr[10] = 0; // Compression: deflate
  ihdr[11] = 0; // Filter: standard
  ihdr[12] = 0; // Interlace: none

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  const pngBuffer = Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
  const outPath = path.join(__dirname, 'build', 'icon.png');
  fs.writeFileSync(outPath, pngBuffer);
  console.log('Successfully generated (512x512):', outPath);
}

// Generate ICO
function createIco() {
  const size = 256;
  const width = size;
  const height = size;
  const bpp = 32;
  const imageSize = width * height * 4;
  
  const bihSize = 40;
  const bih = Buffer.alloc(bihSize);
  bih.writeUInt32LE(bihSize, 0);
  bih.writeInt32LE(width, 4);
  bih.writeInt32LE(height * 2, 8);
  bih.writeUInt16LE(1, 12);
  bih.writeUInt16LE(bpp, 14);
  bih.writeUInt32LE(0, 16);
  bih.writeUInt32LE(imageSize, 20);
  bih.writeInt32LE(0, 24);
  bih.writeInt32LE(0, 28);
  bih.writeUInt32LE(0, 32);
  bih.writeUInt32LE(0, 36);

  const pixels = Buffer.alloc(imageSize);
  const cx = width / 2;
  const cy = height / 2;
  const r = width / 2 - 12;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= r) {
        if (dist >= r - 16) {
          pixels[idx] = 0x0d;     // B
          pixels[idx + 1] = 0xa0; // G
          pixels[idx + 2] = 0xe5; // R
          pixels[idx + 3] = 0xff; // A
        } else if (dist >= r - 22) {
          pixels[idx] = 0x1c;
          pixels[idx + 1] = 0x24;
          pixels[idx + 2] = 0x30;
          pixels[idx + 3] = 0xff;
        } else {
          const inChevron = (dx > -30 && dx < 40 && Math.abs(dy) < 50 && dx + Math.abs(dy)*0.7 < 45);
          if (inChevron) {
            pixels[idx] = 0x10;
            pixels[idx + 1] = 0xb8;
            pixels[idx + 2] = 0xf5;
            pixels[idx + 3] = 0xff;
          } else {
            pixels[idx] = 0x1f;
            pixels[idx + 1] = 0x17;
            pixels[idx + 2] = 0x0f;
            pixels[idx + 3] = 0xff;
          }
        }
      } else {
        pixels[idx] = 0;
        pixels[idx + 1] = 0;
        pixels[idx + 2] = 0;
        pixels[idx + 3] = 0;
      }
    }
  }

  const maskRowSize = Math.floor((width + 31) / 32) * 4;
  const maskSize = maskRowSize * height;
  const mask = Buffer.alloc(maskSize, 0);

  const totalImageBytes = bihSize + imageSize + maskSize;

  const icondir = Buffer.alloc(6);
  icondir.writeUInt16LE(0, 0);
  icondir.writeUInt16LE(1, 2);
  icondir.writeUInt16LE(1, 4);

  const direntry = Buffer.alloc(16);
  direntry.writeUInt8(0, 0);
  direntry.writeUInt8(0, 1);
  direntry.writeUInt8(0, 2);
  direntry.writeUInt8(0, 3);
  direntry.writeUInt16LE(1, 4);
  direntry.writeUInt16LE(bpp, 6);
  direntry.writeUInt32LE(totalImageBytes, 8);
  direntry.writeUInt32LE(6 + 16, 12);

  const icoBuffer = Buffer.concat([icondir, direntry, bih, pixels, mask]);
  const outPath = path.join(__dirname, 'build', 'icon.ico');
  fs.writeFileSync(outPath, icoBuffer);
  console.log('Successfully generated (256x256):', outPath);
}

createPng();
createIco();
