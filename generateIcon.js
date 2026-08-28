const fs = require('fs');
const path = require('path');

// Simple script to generate a valid 256x256 BMP/ICO file for Plex Diagnostics
function createIco() {
  const size = 256;
  const width = size;
  const height = size;
  const bpp = 32;
  const imageSize = width * height * 4;
  
  // BMP Header (BITMAPINFOHEADER)
  const bihSize = 40;
  const bih = Buffer.alloc(bihSize);
  bih.writeUInt32LE(bihSize, 0);
  bih.writeInt32LE(width, 4);
  bih.writeInt32LE(height * 2, 8); // ICO format height is doubled (image + mask)
  bih.writeUInt16LE(1, 12); // Planes
  bih.writeUInt16LE(bpp, 14); // Bit count
  bih.writeUInt32LE(0, 16); // Compression (BI_RGB)
  bih.writeUInt32LE(imageSize, 20); // Image size
  bih.writeInt32LE(0, 24); // X pixels per meter
  bih.writeInt32LE(0, 28); // Y pixels per meter
  bih.writeUInt32LE(0, 32); // Colors used
  bih.writeUInt32LE(0, 36); // Important colors

  // Pixel data (BGRA) - Drawing a sleek Plex Amber & Dark Charcoal diagnostics badge
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
        // Outer ring
        if (dist >= r - 16) {
          // Amber glow #E5A00D
          pixels[idx] = 0x0d;     // B
          pixels[idx + 1] = 0xa0; // G
          pixels[idx + 2] = 0xe5; // R
          pixels[idx + 3] = 0xff; // A
        } else if (dist >= r - 22) {
          // Dark accent border
          pixels[idx] = 0x1c;
          pixels[idx + 1] = 0x24;
          pixels[idx + 2] = 0x30;
          pixels[idx + 3] = 0xff;
        } else {
          // Inner body: Charcoal background #121820 with an amber central chevron / heartbeat
          const inChevron = (dx > -30 && dx < 40 && Math.abs(dy) < 50 && dx + Math.abs(dy)*0.7 < 45);
          if (inChevron) {
            // Bright amber diagnostic chevron
            pixels[idx] = 0x10;
            pixels[idx + 1] = 0xb8;
            pixels[idx + 2] = 0xf5;
            pixels[idx + 3] = 0xff;
          } else {
            pixels[idx] = 0x1f;     // B
            pixels[idx + 1] = 0x17; // G
            pixels[idx + 2] = 0x0f; // R
            pixels[idx + 3] = 0xff; // A
          }
        }
      } else {
        // Transparent outside
        pixels[idx] = 0;
        pixels[idx + 1] = 0;
        pixels[idx + 2] = 0;
        pixels[idx + 3] = 0;
      }
    }
  }

  // AND Mask (1 bit per pixel)
  const maskRowSize = Math.floor((width + 31) / 32) * 4;
  const maskSize = maskRowSize * height;
  const mask = Buffer.alloc(maskSize, 0);

  // Total entry size
  const totalImageBytes = bihSize + imageSize + maskSize;

  // ICONDIR Header (6 bytes)
  const icondir = Buffer.alloc(6);
  icondir.writeUInt16LE(0, 0); // Reserved
  icondir.writeUInt16LE(1, 2); // Type 1 = ICO
  icondir.writeUInt16LE(1, 4); // 1 Image

  // ICONDIRENTRY (16 bytes)
  const direntry = Buffer.alloc(16);
  direntry.writeUInt8(0, 0); // Width 256 = 0
  direntry.writeUInt8(0, 1); // Height 256 = 0
  direntry.writeUInt8(0, 2); // Color palette
  direntry.writeUInt8(0, 3); // Reserved
  direntry.writeUInt16LE(1, 4); // Color planes
  direntry.writeUInt16LE(bpp, 6); // Bits per pixel
  direntry.writeUInt32LE(totalImageBytes, 8); // Size of image data
  direntry.writeUInt32LE(6 + 16, 12); // Offset of image data

  const icoBuffer = Buffer.concat([icondir, direntry, bih, pixels, mask]);
  const outPath = path.join(__dirname, 'build', 'icon.ico');
  fs.writeFileSync(outPath, icoBuffer);
  console.log('Successfully generated:', outPath);
}

createIco();
