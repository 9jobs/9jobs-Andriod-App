import { PDFDocument } from 'pdf-lib';
import { decodePDFRawStream } from 'pdf-lib/cjs/core/streams/decode';
import { generateAgreementPdfArtifact } from '@/lib/agreements/pdf';

/**
 * Converts a text string to its uppercase Hexadecimal representation.
 * @param {string} str 
 * @returns {string}
 */
function textToHex(str) {
  return Array.from(str)
    .map(c => c.charCodeAt(0).toString(16).toUpperCase())
    .join('');
}

/**
 * Extracts coordinates from decoded content stream text by scanning backwards from the marker.
 * Looks for the nearest preceding Text Matrix (Tm) operator.
 * 
 * @param {string} streamText 
 * @param {string} marker 
 * @returns {{x: number, y: number} | null}
 */
function extractCoordinates(streamText, marker) {
  const hexMarker = textToHex(marker);
  let index = streamText.toUpperCase().indexOf(hexMarker);
  
  // Fallback to literal search if not hex-encoded
  if (index === -1) {
    index = streamText.indexOf(marker);
  }
  
  if (index === -1) {
    return null;
  }

  const beforeMarker = streamText.substring(0, index);
  // Match standard Tm operators: "a b c d x y Tm" where x and y are numbers
  // Matches e.g. "1 0 0 1 114.25 245.5 Tm"
  const tmRegex = /([\d\.-]+)\s+([\d\.-]+)\s+([\d\.-]+)\s+([\d\.-]+)\s+([\d\.-]+)\s+([\d\.-]+)\s+Tm/g;
  let match;
  let lastMatch = null;
  
  while ((match = tmRegex.exec(beforeMarker)) !== null) {
    lastMatch = match;
  }

  if (lastMatch) {
    return {
      x: parseFloat(lastMatch[5]),
      y: parseFloat(lastMatch[6]),
    };
  }
  return null;
}

/**
 * Scans all pages of a PDF document to locate the coordinates of the placeholders.
 * Throws a controlled error if any placeholder is missing.
 * 
 * @param {Buffer} pdfBuffer 
 * @returns {Promise<{
 *   providerSign: { pageIndex: number, x: number, y: number },
 *   customerSign: { pageIndex: number, x: number, y: number },
 *   dateBlock: { pageIndex: number, x: number, y: number }
 * }>}
 */
export async function parsePdfSignatureCoords(pdfBuffer) {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();

  let providerSign = null;
  let customerSign = null;
  let dateBlock = null;

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const page = pages[pageIndex];
    const node = page.node;
    const contents = node.Contents();
    
    let streams = [];
    if (contents) {
      if (contents.size && typeof contents.get === 'function') {
        for (let i = 0; i < contents.size(); i++) {
          streams.push(contents.get(i));
        }
      } else {
        streams = [contents];
      }
    }

    for (let i = 0; i < streams.length; i++) {
      const ref = streams[i];
      const stream = pdfDoc.context.lookup(ref);
      if (!stream) continue;
      
      const decodedStream = decodePDFRawStream(stream);
      const bytes = decodedStream.getBytes();
      const text = new TextDecoder().decode(bytes);

      if (!providerSign) {
        const coords = extractCoordinates(text, '[[DS_PROVIDER_SIGN_HERE]]');
        if (coords) {
          providerSign = { pageIndex, ...coords };
        }
      }
      if (!customerSign) {
        const coords = extractCoordinates(text, '[[DS_CUSTOMER_SIGN_HERE]]');
        if (coords) {
          customerSign = { pageIndex, ...coords };
        }
      }
      if (!dateBlock) {
        // Date block contains: [[DS_PROVIDER_DATE_HERE]] [[DS_CUSTOMER_DATE_HERE]]
        const coords = extractCoordinates(text, '[[DS_PROVIDER_DATE_HERE]]');
        if (coords) {
          dateBlock = { pageIndex, ...coords };
        }
      }
    }
  }

  // Strict Validation: If any required coordinate is missing, throw a controlled error.
  if (!providerSign || !customerSign || !dateBlock) {
    throw new Error(
      `Controlled Error: Failed to parse required signature anchors. ` +
      `Provider anchor: ${providerSign ? 'Found' : 'MISSING'}, ` +
      `Customer anchor: ${customerSign ? 'Found' : 'MISSING'}, ` +
      `Date anchor: ${dateBlock ? 'Found' : 'MISSING'}.`
    );
  }

  return {
    providerSign,
    customerSign,
    dateBlock,
  };
}

function isValidCoordBlock(block) {
  return Boolean(
    block &&
      Number.isFinite(Number(block.pageIndex)) &&
      Number.isFinite(Number(block.x)) &&
      Number.isFinite(Number(block.y))
  );
}

function normalizeCoordBlock(block) {
  return {
    pageIndex: Number(block.pageIndex),
    x: Number(block.x),
    y: Number(block.y),
  };
}

function normalizeAnchorCoords(coords) {
  if (
    !coords ||
    !isValidCoordBlock(coords.providerSign) ||
    !isValidCoordBlock(coords.customerSign) ||
    !isValidCoordBlock(coords.dateBlock)
  ) {
    return null;
  }

  return {
    providerSign: normalizeCoordBlock(coords.providerSign),
    customerSign: normalizeCoordBlock(coords.customerSign),
    dateBlock: normalizeCoordBlock(coords.dateBlock),
  };
}

function toPlainAgreement(agreement) {
  if (!agreement) {
    return {};
  }

  if (typeof agreement.toObject === 'function') {
    return agreement.toObject();
  }

  return { ...agreement };
}

export async function resolvePdfSignatureCoords(pdfBuffer, agreement) {
  const storedCoords = normalizeAnchorCoords(agreement?.pdfAnchorCoords);
  if (storedCoords) {
    return storedCoords;
  }

  try {
    return await parsePdfSignatureCoords(pdfBuffer);
  } catch (parseError) {
    const plainAgreement = toPlainAgreement(agreement);
    const artifact = await generateAgreementPdfArtifact({
      ...plainAgreement,
      _id: String(plainAgreement._id || 'agreement'),
    });
    const fallbackCoords = normalizeAnchorCoords(artifact.anchorCoords);

    if (!fallbackCoords) {
      throw parseError;
    }

    return fallbackCoords;
  }
}
