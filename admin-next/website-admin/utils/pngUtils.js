import zlib from 'node:zlib';

/**
 * Paeth predictor for PNG un-filtering.
 */
function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

/**
 * Validates, decompresses, inspects for transparency, and re-encodes a PNG signature buffer.
 * Strips all metadata, auxiliary chunks, and potential exploits.
 * 
 * @param {Buffer} buffer The raw uploaded signature file buffer
 * @returns {Buffer} Sanitized, re-encoded clean PNG buffer
 */
export function sanitizeAndReencodePng(buffer) {
  // 1. Strict Byte Limit Check (100 KB)
  if (buffer.length > 100 * 1024) {
    throw new Error('Signature file size exceeds the 100 KB limit.');
  }

  // 2. Validate PNG Signature
  const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  if (!buffer.subarray(0, 8).equals(pngSignature)) {
    throw new Error('Invalid file format. Only valid PNG images are accepted.');
  }

  // 3. Parse IHDR Chunk
  // IHDR starts at offset 8 (length 4 bytes, chunk type "IHDR" 4 bytes, data 13 bytes)
  const ihdrLength = buffer.readUInt32BE(8);
  const ihdrType = buffer.subarray(12, 16).toString('ascii');
  if (ihdrType !== 'IHDR' || ihdrLength !== 13) {
    throw new Error('Malformed PNG: Missing or invalid IHDR chunk.');
  }

  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const bitDepth = buffer[24];
  const colorType = buffer[25];

  // Enforce Strict Pixel Dimensions
  if (width > 600 || height > 200) {
    throw new Error(`Signature dimensions (${width}x${height}) exceed the maximum allowed limits (600x200).`);
  }
  if (width === 0 || height === 0) {
    throw new Error('Signature dimensions must be greater than zero.');
  }
  if (bitDepth !== 8 || colorType !== 6) {
    throw new Error('Only 8-bit RGBA PNG images are accepted.');
  }

  // 4. Extract and Concatenate IDAT chunks
  let offset = 8 + 4 + 4 + ihdrLength + 4; // Skip Signature + IHDR length, type, data, and CRC
  let idatBuffers = [];

  while (offset < buffer.length) {
    if (offset + 8 > buffer.length) {
      throw new Error('Malformed PNG: Unexpected end of file.');
    }
    const chunkLength = buffer.readUInt32BE(offset);
    const chunkType = buffer.subarray(offset + 4, offset + 8).toString('ascii');
    
    if (offset + 8 + chunkLength + 4 > buffer.length) {
      throw new Error('Malformed PNG: Chunk size exceeds file boundaries.');
    }

    if (chunkType === 'IDAT') {
      idatBuffers.push(buffer.subarray(offset + 8, offset + 8 + chunkLength));
    } else if (chunkType === 'IEND') {
      break;
    }
    offset += 8 + chunkLength + 4; // Move to next chunk
  }

  if (idatBuffers.length === 0) {
    throw new Error('Malformed PNG: Missing IDAT chunks.');
  }

  const compressedIdat = Buffer.concat(idatBuffers);
  let decompressed;
  try {
    decompressed = zlib.inflateSync(compressedIdat);
  } catch (err) {
    throw new Error('Malformed PNG: Failed to decompress pixel data.');
  }

  // 5. Un-filter PNG scanlines to extract raw RGBA pixels
  const bpp = 4; // RGBA
  const rowSize = 1 + width * bpp;
  const expectedDecompressedLength = height * rowSize;

  if (decompressed.length !== expectedDecompressedLength) {
    throw new Error('Malformed PNG: Decompressed data size mismatch.');
  }

  const rawPixels = Buffer.alloc(width * height * bpp);
  let hasVisiblePixels = false;

  for (let y = 0; y < height; y++) {
    const filterType = decompressed[y * rowSize];
    const rowStart = y * rowSize + 1;

    for (let x = 0; x < width; x++) {
      for (let c = 0; c < bpp; c++) {
        const decompressedIdx = rowStart + x * bpp + c;
        const pixelIdx = (y * width + x) * bpp + c;
        const val = decompressed[decompressedIdx];

        let rawVal;
        if (filterType === 0) {
          rawVal = val;
        } else if (filterType === 1) {
          const prior = x > 0 ? rawPixels[pixelIdx - bpp] : 0;
          rawVal = (val + prior) & 0xFF;
        } else if (filterType === 2) {
          const above = y > 0 ? rawPixels[pixelIdx - width * bpp] : 0;
          rawVal = (val + above) & 0xFF;
        } else if (filterType === 3) {
          const prior = x > 0 ? rawPixels[pixelIdx - bpp] : 0;
          const above = y > 0 ? rawPixels[pixelIdx - width * bpp] : 0;
          rawVal = (val + Math.floor((prior + above) / 2)) & 0xFF;
        } else if (filterType === 4) {
          const prior = x > 0 ? rawPixels[pixelIdx - bpp] : 0;
          const above = y > 0 ? rawPixels[pixelIdx - width * bpp] : 0;
          const abovePrior = (x > 0 && y > 0) ? rawPixels[pixelIdx - (width + 1) * bpp] : 0;
          rawVal = (val + paethPredictor(prior, above, abovePrior)) & 0xFF;
        } else {
          throw new Error(`Unsupported PNG filter type: ${filterType}`);
        }

        rawPixels[pixelIdx] = rawVal;

        // Check if there are any non-transparent visible pixels
        // (c === 3 is the Alpha channel)
        if (c === 3 && rawVal > 10) {
          hasVisiblePixels = true;
        }
      }
    }
  }

  // Reject completely transparent / empty signatures
  if (!hasVisiblePixels) {
    throw new Error('Signature is blank or completely transparent.');
  }

  // 6. Re-encode the raw pixels to a clean PNG
  // We use filter type 0 (None) for all rows for simplicity and sanitization.
  const cleanDecompressed = Buffer.alloc(height * rowSize);
  for (let y = 0; y < height; y++) {
    cleanDecompressed[y * rowSize] = 0; // Filter type 0 (None)
    rawPixels.copy(cleanDecompressed, y * rowSize + 1, y * width * bpp, (y + 1) * width * bpp);
  }

  const cleanIdatData = zlib.deflateSync(cleanDecompressed, { level: 9 });

  // Construct PNG chunks
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // Create IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8-bit depth
  ihdrData[9] = 6; // Color type 6 (RGBA)
  ihdrData[10] = 0; // Compression (deflate)
  ihdrData[11] = 0; // Filter (None)
  ihdrData[12] = 0; // Interlace (None)
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Create IDAT chunk
  const idatChunk = createChunk('IDAT', cleanIdatData);

  // Create IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

/**
 * Creates a standard PNG chunk with length, type, data, and CRC-32.
 */
function createChunk(type, data) {
  const lengthBuf = Buffer.alloc(4);
  lengthBuf.writeUInt32BE(data.length, 0);

  const typeBuf = Buffer.from(type, 'ascii');
  const typeAndData = Buffer.concat([typeBuf, data]);

  const crc = crc32(typeAndData);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);

  return Buffer.concat([lengthBuf, typeAndData, crcBuf]);
}

/**
 * CRC-32 checksum calculation for PNG chunks.
 */
let crcTable = null;
function getCrcTable() {
  if (crcTable) return crcTable;
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) {
        c = 0xedb88320 ^ (c >>> 1);
      } else {
        c = c >>> 1;
      }
    }
    table[n] = c;
  }
  crcTable = table;
  return table;
}

function crc32(buffer) {
  const table = getCrcTable();
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i++) {
    crc = table[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
