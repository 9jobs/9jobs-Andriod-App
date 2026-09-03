import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

import { buildAgreementTemplate } from '@/lib/agreements/template';
import { LOGO_BASE64 } from './logo-base64';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const PAGE_MARGIN_LEFT_RIGHT = 54;
const PAGE_MARGIN_TOP = 120;
const PAGE_MARGIN_BOTTOM = 60;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN_LEFT_RIGHT * 2;
const COLOR_INK = rgb(0.02, 0.02, 0.02);
const COLOR_GOLD = rgb(0.85, 1.00, 0.37); // Lime Green Accent
const COLOR_BODY = rgb(0.18, 0.18, 0.20);
const COLOR_MUTED = rgb(0.35, 0.43, 0.47);
const COLOR_WHITE = rgb(1, 1, 1);

function wrapText(text, font, fontSize, maxWidth) {
  const words = String(text || '').replace(/\s+/g, ' ').trim().split(' ');

  if (!words[0]) {
    return [''];
  }

  const lines = [];
  let currentLine = words[0];

  for (const word of words.slice(1)) {
    const nextLine = `${currentLine} ${word}`;

    if (font.widthOfTextAtSize(nextLine, fontSize) <= maxWidth) {
      currentLine = nextLine;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }

  lines.push(currentLine);
  return lines;
}

function createRenderer(pdfDoc, fonts) {
  const pages = [];
  let page = null;
  let cursorY = 0;

  function addPage() {
    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pages.push(page);
    cursorY = PAGE_HEIGHT - PAGE_MARGIN_TOP;
    return page;
  }

  function ensureSpace(requiredHeight) {
    if (!page || cursorY - requiredHeight < PAGE_MARGIN_BOTTOM) {
      addPage();
    }
  }

  function drawWrappedText(text, options = {}) {
    const {
      x = PAGE_MARGIN_LEFT_RIGHT,
      font = fonts.regular,
      fontSize = 10.5,
      color = COLOR_BODY,
      lineHeight = fontSize * 1.45,
      paragraphGap = 8,
      maxWidth = CONTENT_WIDTH,
    } = options;

    const lines = wrapText(text, font, fontSize, maxWidth);
    ensureSpace(lines.length * lineHeight + paragraphGap);

    for (const line of lines) {
      page.drawText(line, {
        x,
        y: cursorY - fontSize,
        font,
        size: fontSize,
        color,
      });
      cursorY -= lineHeight;
    }

    cursorY -= paragraphGap;
  }

  function drawCenteredText(text, options = {}) {
    const { font = fonts.bold, fontSize = 20, color = COLOR_INK, paragraphGap = 12 } = options;
    const textWidth = font.widthOfTextAtSize(text, fontSize);

    ensureSpace(fontSize + paragraphGap);
    page.drawText(text, {
      x: (PAGE_WIDTH - textWidth) / 2,
      y: cursorY - fontSize,
      font,
      size: fontSize,
      color,
    });
    cursorY -= fontSize * 1.35 + paragraphGap;
  }

  function drawSignatureLine(label, value, options = {}) {
    const { gapAfter = 8, font = fonts.regular } = options;
    drawWrappedText(`${label} ${value}`, {
      font,
      fontSize: 11,
      color: COLOR_INK,
      paragraphGap: gapAfter,
    });
  }

  addPage();

  return {
    addPage,
    pages,
    fonts,
    drawCenteredText,
    drawWrappedText,
    drawSignatureLine,
    get page() {
      return page;
    },
    set cursorY(value) {
      cursorY = value;
    },
    get cursorY() {
      return cursorY;
    },
  };
}

function drawHeaderAndFooter(renderer, logoImage) {
  renderer.pages.forEach((page, index) => {
    // 0. Draw large faint logo watermark in the center
    if (logoImage) {
      const wmWidth = 250;
      const wmHeight = 250;
      page.drawImage(logoImage, {
        x: (PAGE_WIDTH - wmWidth) / 2,
        y: (PAGE_HEIGHT - wmHeight) / 2,
        width: wmWidth,
        height: wmHeight,
        opacity: 0.04, // extremely faint
      });
    }

    // A. Left Border Layout (Transitioning J. TUCKER LAW Theme)
    // 1. Straight vertical Navy bar at the top (above y = PAGE_HEIGHT - 135)
    page.drawRectangle({
      x: 0,
      y: PAGE_HEIGHT - 135,
      width: 12,
      height: 135,
      color: COLOR_INK,
    });

    // 2. Straight vertical Gold/Lime bar at the bottom (below y = PAGE_HEIGHT - 135)
    page.drawRectangle({
      x: 0,
      y: 0,
      width: 12,
      height: PAGE_HEIGHT - 135,
      color: COLOR_GOLD,
    });

    // 3. Left Transition Wedges (symmetrical overlay creating the chevron split)
    // Gold wedge (drawn behind)
    page.drawSvgPath(`M 0 ${PAGE_HEIGHT - 175} L 12 ${PAGE_HEIGHT - 175} L 24 ${PAGE_HEIGHT - 135} L 12 ${PAGE_HEIGHT - 95} L 0 ${PAGE_HEIGHT - 95} Z`, {
      color: COLOR_GOLD,
    });
    // Navy wedge (drawn on top)
    page.drawSvgPath(`M 0 ${PAGE_HEIGHT - 95} L 12 ${PAGE_HEIGHT - 95} L 24 ${PAGE_HEIGHT - 135} L 12 ${PAGE_HEIGHT - 175} L 0 ${PAGE_HEIGHT - 175} Z`, {
      color: COLOR_INK,
    });

    // A2. Right Border Layout (Mirrored J. TUCKER LAW Theme)
    // 1. Straight vertical Navy bar at the top
    page.drawRectangle({
      x: PAGE_WIDTH - 12,
      y: PAGE_HEIGHT - 135,
      width: 12,
      height: 135,
      color: COLOR_INK,
    });

    // 2. Straight vertical Gold/Lime bar at the bottom
    page.drawRectangle({
      x: PAGE_WIDTH - 12,
      y: 0,
      width: 12,
      height: PAGE_HEIGHT - 135,
      color: COLOR_GOLD,
    });

    // 3. Right Transition Wedges (horizontally mirrored chevrons)
    // Gold wedge (drawn behind)
    page.drawSvgPath(`M ${PAGE_WIDTH} ${PAGE_HEIGHT - 175} L ${PAGE_WIDTH - 12} ${PAGE_HEIGHT - 175} L ${PAGE_WIDTH - 24} ${PAGE_HEIGHT - 135} L ${PAGE_WIDTH - 12} ${PAGE_HEIGHT - 95} L ${PAGE_WIDTH} ${PAGE_HEIGHT - 95} Z`, {
      color: COLOR_GOLD,
    });
    // Navy wedge (drawn on top)
    page.drawSvgPath(`M ${PAGE_WIDTH} ${PAGE_HEIGHT - 95} L ${PAGE_WIDTH - 12} ${PAGE_HEIGHT - 95} L ${PAGE_WIDTH - 24} ${PAGE_HEIGHT - 135} L ${PAGE_WIDTH - 12} ${PAGE_HEIGHT - 175} L ${PAGE_WIDTH} ${PAGE_HEIGHT - 175} Z`, {
      color: COLOR_INK,
    });

    // B. Header Pattern & Content
    // 1. Draw light beige geometric triangle pattern in the top-right corner (clearly highlighted, matching gold theme)
    const colSpacing = 16;
    const rowSpacing = 13.86; // 16 * sin(60) = 13.86
    const totalCols = 15;
    const totalRows = 7;

    for (let r = 0; r < totalRows; r++) {
      const y = PAGE_HEIGHT - r * rowSpacing;
      for (let c = 0; c < totalCols; c++) {
        // Offset x on odd rows for isometric alignment
        const x = PAGE_WIDTH - c * colSpacing - (r % 2 === 1 ? colSpacing / 2 : 0);

        // Fade color based on column index (fading to the left)
        const opacity = Math.max(0, 1 - (c / 10));
        if (opacity <= 0) continue;

        // Beautiful faded gold/beige pattern color
        const fadedColor = rgb(
          1 - (1 - 0.94) * opacity,
          1 - (1 - 0.90) * opacity,
          1 - (1 - 0.84) * opacity
        );

        // Draw connections
        if (c > 0) {
          page.drawLine({
            start: { x, y },
            end: { x: x + colSpacing, y },
            thickness: 0.8,
            color: fadedColor,
          });
        }
        if (r < totalRows - 1) {
          const nextY = y - rowSpacing;
          const nextX1 = x - colSpacing / 2;
          const nextX2 = x + colSpacing / 2;

          page.drawLine({
            start: { x, y },
            end: { x: nextX1, y: nextY },
            thickness: 0.8,
            color: fadedColor,
          });

          page.drawLine({
            start: { x, y },
            end: { x: nextX2, y: nextY },
            thickness: 0.8,
            color: fadedColor,
          });
        }
      }
    }

    // 2. Draw Logo on the left (Larger 85x85 size, clearly highlighted)
    if (logoImage) {
      const logoWidth = 85;
      const logoHeight = 85;
      page.drawImage(logoImage, {
        x: PAGE_MARGIN_LEFT_RIGHT,
        y: PAGE_HEIGHT - 90,
        width: logoWidth,
        height: logoHeight,
      });
    }

    // 3. Contact details stack on the right (with gold icons and clean sans-serif text)
    const xIcon = PAGE_WIDTH - PAGE_MARGIN_LEFT_RIGHT - 180;
    const xText = PAGE_WIDTH - PAGE_MARGIN_LEFT_RIGHT - 162;

    const contactLines = [
      '+61 422 279 428',
      '9jobsapplicationservice@gmail.com',
      'ABN: 83 679 842 972',
      'www.9jobs.co'
    ];

    contactLines.forEach((line, lineIndex) => {
      const y = PAGE_HEIGHT - 35 - (lineIndex * 13);
      
      // Draw Text
      page.drawText(line, {
        x: xText,
        y,
        font: renderer.fonts.sansRegular,
        size: 8,
        color: COLOR_INK,
      });

      // Draw black vector icons next to each text line
      if (lineIndex === 0) {
        // Phone Icon (Smartphone shape)
        page.drawRectangle({
          x: xIcon + 2.5,
          y: y - 1,
          width: 5,
          height: 8,
          borderWidth: 0.8,
          borderColor: COLOR_INK,
        });
        page.drawRectangle({
          x: xIcon + 3.3,
          y: y + 0.7,
          width: 3.4,
          height: 5.3,
          color: COLOR_GOLD,
        });
        page.drawCircle({
          x: xIcon + 5,
          y: y - 0.1,
          size: 0.8,
          color: COLOR_INK,
        });
      } else if (lineIndex === 1) {
        // Envelope Icon
        page.drawRectangle({
          x: xIcon + 1,
          y: y,
          width: 8,
          height: 5.5,
          borderWidth: 0.8,
          borderColor: COLOR_INK,
        });
        page.drawLine({
          start: { x: xIcon + 1, y: y + 5.5 },
          end: { x: xIcon + 5, y: y + 2.5 },
          thickness: 0.8,
          color: COLOR_INK,
        });
        page.drawLine({
          start: { x: xIcon + 9, y: y + 5.5 },
          end: { x: xIcon + 5, y: y + 2.5 },
          thickness: 0.8,
          color: COLOR_INK,
        });
      } else if (lineIndex === 2) {
        // Document (ABN) Icon
        page.drawRectangle({
          x: xIcon + 2,
          y: y - 1,
          width: 6,
          height: 8,
          borderWidth: 0.8,
          borderColor: COLOR_INK,
        });
        page.drawLine({ start: { x: xIcon + 3.5, y: y + 4.5 }, end: { x: xIcon + 6.5, y: y + 4.5 }, thickness: 0.6, color: COLOR_INK });
        page.drawLine({ start: { x: xIcon + 3.5, y: y + 3 }, end: { x: xIcon + 6.5, y: y + 3 }, thickness: 0.6, color: COLOR_INK });
        page.drawLine({ start: { x: xIcon + 3.5, y: y + 1.5 }, end: { x: xIcon + 5.5, y: y + 1.5 }, thickness: 0.6, color: COLOR_INK });
      } else if (lineIndex === 3) {
        // Globe (Website) Icon
        page.drawCircle({
          x: xIcon + 5,
          y: y + 3,
          size: 3.5,
          borderWidth: 0.8,
          borderColor: COLOR_INK,
        });
        // horizontal line
        page.drawLine({
          start: { x: xIcon + 1.5, y: y + 3 },
          end: { x: xIcon + 8.5, y: y + 3 },
          thickness: 0.6,
          color: COLOR_INK,
        });
        // vertical line
        page.drawLine({
          start: { x: xIcon + 5, y: y - 0.5 },
          end: { x: xIcon + 5, y: y + 6.5 },
          thickness: 0.6,
          color: COLOR_INK,
        });
        // vertical curved meridian
        page.drawEllipse({
          x: xIcon + 5,
          y: y + 3,
          xScale: 1.5,
          yScale: 3.5,
          borderWidth: 0.6,
          borderColor: COLOR_INK,
        });
        // horizontal curved latitude
        page.drawEllipse({
          x: xIcon + 5,
          y: y + 3,
          xScale: 3.5,
          yScale: 1.5,
          borderWidth: 0.6,
          borderColor: COLOR_INK,
        });
      }
    });

    // 4. Header Divider line (Gold - starts at x = 12, ends at PAGE_WIDTH - 12 to avoid crossing borders)
    page.drawLine({
      start: { x: 12, y: PAGE_HEIGHT - 95 },
      end: { x: PAGE_WIDTH - 12, y: PAGE_HEIGHT - 95 },
      thickness: 2.0,
      color: COLOR_GOLD,
    });

    // C. Footer Layout (Single-Line Style matching Screenshot 3)
    // 1. Footer Divider line (Thin light grey - starts at x = 12, ends at PAGE_WIDTH - 12 to avoid crossing borders)
    page.drawLine({
      start: { x: 12, y: 40 },
      end: { x: PAGE_WIDTH - 12, y: 40 },
      thickness: 0.8,
      color: rgb(0.85, 0.85, 0.85),
    });

    // 2. Left-aligned footer details
    page.drawText('9 Jobs Pty Ltd | ABN 83 679 842 972 | +61 422 279 428', {
      x: 54,
      y: 25,
      font: renderer.fonts.sansRegular,
      size: 7.5,
      color: COLOR_MUTED,
    });

    // 3. Right-aligned page numbers
    const pageNumText = `Page ${index + 1} of ${renderer.pages.length}`;
    const textWidth = renderer.fonts.sansRegular.widthOfTextAtSize(pageNumText, 7.5);
    const xPageNum = PAGE_WIDTH - PAGE_MARGIN_LEFT_RIGHT - textWidth;
    page.drawText(pageNumText, {
      x: xPageNum,
      y: 25,
      font: renderer.fonts.sansRegular,
      size: 7.5,
      color: COLOR_MUTED,
    });
  });
}

export async function generateAgreementPdfBuffer(agreement) {
  const artifact = await generateAgreementPdfArtifact(agreement);
  return artifact.buffer;
}

function formatAgreementDate(value) {
  // Supabase date fields may arrive as an ISO timestamp. The contract renders
  // only its calendar date, without a time or timezone suffix.
  const match = String(value || '').match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : String(value || '29 June 2026');
}

export async function generateAgreementPdfArtifact(agreement) {
  const document = buildAgreementTemplate(agreement);
  const pdfDoc = await PDFDocument.create();
  const fonts = {
    regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    sansRegular: await pdfDoc.embedFont(StandardFonts.Helvetica),
    sansBold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
  };

  let logoImage = null;
  try {
    const logoBuffer = Buffer.from(LOGO_BASE64, 'base64');
    logoImage = await pdfDoc.embedPng(logoBuffer);
  } catch (err) {
    console.error('Error embedding logo png:', err);
  }

  const renderer = createRenderer(pdfDoc, fonts);
  const anchorCoords = {
    providerSign: null,
    customerSign: null,
    dateBlock: null,
  };

  renderer.drawCenteredText('9Jobs Standard Plan Contract', {
    font: fonts.bold,
    fontSize: 20,
    color: COLOR_INK,
    paragraphGap: 10,
  });

  renderer.drawWrappedText(
    `This Service Contract is made and entered into as of ${formatAgreementDate(document.agreementDate)}, by and between:`,
    {
      font: fonts.regular,
      fontSize: 11,
      color: COLOR_BODY,
      lineHeight: 16,
      paragraphGap: 16,
    }
  );

  const cardHeight = 78;
  const cardWidth = 235;
  const cardY = renderer.cursorY - cardHeight;

  const cardBgColor = rgb(0.97, 0.97, 0.95);
  const cardBorderColor = rgb(0.90, 0.91, 0.86);

  // 1. Draw Service Provider Card
  renderer.page.drawRectangle({
    x: PAGE_MARGIN_LEFT_RIGHT,
    y: cardY,
    width: cardWidth,
    height: cardHeight,
    color: cardBgColor,
    borderColor: cardBorderColor,
    borderWidth: 0.8,
  });

  // 2. Draw Client Card
  renderer.page.drawRectangle({
    x: PAGE_MARGIN_LEFT_RIGHT + cardWidth + 16,
    y: cardY,
    width: cardWidth,
    height: cardHeight,
    color: cardBgColor,
    borderColor: cardBorderColor,
    borderWidth: 0.8,
  });

  // Draw Text inside Service Provider Card
  const providerX = PAGE_MARGIN_LEFT_RIGHT + 12;
  renderer.page.drawText('SERVICE PROVIDER', {
    x: providerX,
    y: cardY + 56,
    font: fonts.sansBold,
    size: 7.5,
    color: COLOR_MUTED,
  });
  renderer.page.drawText(document.provider.legalName, {
    x: providerX,
    y: cardY + 40,
    font: fonts.sansBold,
    size: 11,
    color: COLOR_INK,
  });
  renderer.page.drawText(`ABN: ${document.provider.abn}`, {
    x: providerX,
    y: cardY + 26,
    font: fonts.sansRegular,
    size: 8.5,
    color: COLOR_BODY,
  });
  renderer.page.drawText(`Phone: ${document.provider.phone}`, {
    x: providerX,
    y: cardY + 12,
    font: fonts.sansRegular,
    size: 8.5,
    color: COLOR_BODY,
  });

  // Draw Text inside Client Card
  const clientX = PAGE_MARGIN_LEFT_RIGHT + cardWidth + 16 + 12;
  renderer.page.drawText('CLIENT', {
    x: clientX,
    y: cardY + 56,
    font: fonts.sansBold,
    size: 7.5,
    color: COLOR_MUTED,
  });
  renderer.page.drawText(document.signatureBlocks.customer.name, {
    x: clientX,
    y: cardY + 40,
    font: fonts.sansBold,
    size: 11,
    color: COLOR_INK,
  });
  renderer.page.drawText(`Email: ${document.signatureBlocks.customer.email}`, {
    x: clientX,
    y: cardY + 26,
    font: fonts.sansRegular,
    size: 8.5,
    color: COLOR_BODY,
  });
  renderer.page.drawText(`Phone: ${document.signatureBlocks.customer.phone}`, {
    x: clientX,
    y: cardY + 12,
    font: fonts.sansRegular,
    size: 8.5,
    color: COLOR_BODY,
  });

  renderer.cursorY = cardY - 20;

  document.sections.forEach((section) => {
    // Prevent orphan headings: check space for heading + first block of content
    const headingFontSize = 11;
    const headingLineHeight = 15;
    const headingLines = wrapText(section.heading, fonts.bold, headingFontSize, CONTENT_WIDTH);
    const headingHeight = headingLines.length * headingLineHeight + 6;

    let firstBlockHeight = 25; // default fallback
    if (section.intro) {
      const introFontSize = 9.5;
      const introLineHeight = 13.5;
      const introLines = wrapText(section.intro, fonts.regular, introFontSize, CONTENT_WIDTH);
      firstBlockHeight = introLines.length * introLineHeight + 6;
    } else if (section.paragraphs && section.paragraphs.length > 0) {
      const paraFontSize = 9.5;
      const paraLineHeight = 13.5;
      const firstPara = `a. ${section.paragraphs[0]}`;
      const paraLines = wrapText(firstPara, fonts.regular, paraFontSize, CONTENT_WIDTH - 14);
      firstBlockHeight = paraLines.length * paraLineHeight + 6;
    }

    const totalRequiredHeight = headingHeight + firstBlockHeight;
    if (renderer.cursorY - totalRequiredHeight < PAGE_MARGIN_BOTTOM) {
      renderer.addPage();
    }

    renderer.drawWrappedText(section.heading, {
      font: fonts.bold,
      fontSize: 11,
      color: COLOR_INK,
      lineHeight: 15,
      paragraphGap: 6,
    });

    if (section.intro) {
      renderer.drawWrappedText(section.intro, {
        font: fonts.regular,
        fontSize: 9.5,
        color: COLOR_BODY,
        lineHeight: 13.5,
        paragraphGap: 6,
      });
    }

    section.paragraphs.forEach((paragraph, index) => {
      const letter = String.fromCharCode(97 + index);
      renderer.drawWrappedText(`${letter}. ${paragraph}`, {
        x: PAGE_MARGIN_LEFT_RIGHT + 14,
        maxWidth: CONTENT_WIDTH - 14,
        font: fonts.regular,
        fontSize: 9.5,
        color: COLOR_BODY,
        lineHeight: 13.5,
        paragraphGap: 6,
      });
    });

  });

  // Ensure the entire signature and payment details section fits on the current page, otherwise break page
  const requiredSigHeight = 220;
  if (renderer.cursorY - requiredSigHeight < PAGE_MARGIN_BOTTOM) {
    renderer.addPage();
  }
  renderer.drawWrappedText(
    'In witness where of, the parties have executed this Contract as of the date first written above.',
    {
      font: fonts.regular,
      fontSize: 10,
      color: COLOR_BODY,
      lineHeight: 14,
      paragraphGap: 16,
    }
  );

  const startY = renderer.cursorY;

  // --- SERVICE PROVIDER SIGNATURE BLOCK ---
  renderer.page.drawText('SERVICE PROVIDER', {
    x: 54,
    y: startY - 12,
    font: fonts.sansBold,
    size: 7.5,
    color: COLOR_MUTED,
  });
  renderer.page.drawText(document.provider.legalName, {
    x: 54,
    y: startY - 26,
    font: fonts.sansBold,
    size: 10,
    color: COLOR_INK,
  });

  // Signature line
  renderer.page.drawLine({
    start: { x: 54, y: startY - 50 },
    end: { x: 280, y: startY - 50 },
    thickness: 0.8,
    color: COLOR_MUTED,
  });
  renderer.page.drawText('Signature', {
    x: 54,
    y: startY - 60,
    font: fonts.sansRegular,
    size: 7.5,
    color: COLOR_MUTED,
  });

  // Date line
  renderer.page.drawLine({
    start: { x: 54, y: startY - 85 },
    end: { x: 280, y: startY - 85 },
    thickness: 0.8,
    color: COLOR_MUTED,
  });
  // --- CLIENT SIGNATURE BLOCK ---
  renderer.page.drawText('CLIENT', {
    x: 315,
    y: startY - 12,
    font: fonts.sansBold,
    size: 7.5,
    color: COLOR_MUTED,
  });
  renderer.page.drawText(document.signatureBlocks.customer.name, {
    x: 315,
    y: startY - 26,
    font: fonts.sansBold,
    size: 10,
    color: COLOR_INK,
  });

  // Signature line
  renderer.page.drawLine({
    start: { x: 315, y: startY - 50 },
    end: { x: 541, y: startY - 50 },
    thickness: 0.8,
    color: COLOR_MUTED,
  });
  renderer.page.drawText('Signature', {
    x: 315,
    y: startY - 60,
    font: fonts.sansRegular,
    size: 7.5,
    color: COLOR_MUTED,
  });

  // Date line
  renderer.page.drawLine({
    start: { x: 315, y: startY - 85 },
    end: { x: 541, y: startY - 85 },
    thickness: 0.8,
    color: COLOR_MUTED,
  });
  // Render e-signature anchors invisibly in white
  renderer.page.drawText('[[DS_PROVIDER_SIGN_HERE]]', {
    x: 54 + 60,
    y: startY - 45,
    font: fonts.regular,
    size: 10,
    color: COLOR_WHITE,
  });
  renderer.page.drawText('[[DS_CUSTOMER_SIGN_HERE]]', {
    x: 315 + 60,
    y: startY - 45,
    font: fonts.regular,
    size: 10,
    color: COLOR_WHITE,
  });
  renderer.page.drawText('[[DS_PROVIDER_DATE_HERE]]', {
    x: 54 + 60,
    y: startY - 80,
    font: fonts.regular,
    size: 10,
    color: COLOR_WHITE,
  });
  renderer.page.drawText('[[DS_CUSTOMER_DATE_HERE]]', {
    x: 315 + 60,
    y: startY - 80,
    font: fonts.regular,
    size: 10,
    color: COLOR_WHITE,
  });

  anchorCoords.providerSign = {
    pageIndex: renderer.pages.length - 1,
    x: 54 + 60,
    y: startY - 45,
  };
  anchorCoords.customerSign = {
    pageIndex: renderer.pages.length - 1,
    x: 315 + 60,
    y: startY - 45,
  };

  // Combined date block at bottom margin for compatibility
  renderer.page.drawText('[[DS_PROVIDER_DATE_HERE]] [[DS_CUSTOMER_DATE_HERE]]', {
    x: PAGE_MARGIN_LEFT_RIGHT,
    y: PAGE_MARGIN_BOTTOM,
    font: fonts.regular,
    size: 10,
    color: COLOR_WHITE,
  });
  anchorCoords.dateBlock = {
    pageIndex: renderer.pages.length - 1,
    x: PAGE_MARGIN_LEFT_RIGHT,
    y: PAGE_MARGIN_BOTTOM,
  };

  // --- PAYMENT DETAILS BOX ---
  const payBoxY = startY - 155;
  const payBoxHeight = 52;
  const payBoxWidth = 487;

  renderer.page.drawRectangle({
    x: PAGE_MARGIN_LEFT_RIGHT,
    y: payBoxY,
    width: payBoxWidth,
    height: payBoxHeight,
    color: rgb(0.97, 0.97, 0.95),
    borderColor: rgb(0.90, 0.91, 0.86),
    borderWidth: 0.8,
  });

  // Title
  renderer.page.drawText('PAYMENT DETAILS', {
    x: PAGE_MARGIN_LEFT_RIGHT + 12,
    y: payBoxY + 36,
    font: fonts.sansBold,
    size: 7.5,
    color: COLOR_INK,
  });

  // Account Name
  renderer.page.drawText('ACCOUNT NAME', {
    x: PAGE_MARGIN_LEFT_RIGHT + 12,
    y: payBoxY + 22,
    font: fonts.sansBold,
    size: 6.5,
    color: COLOR_MUTED,
  });
  renderer.page.drawText('9 Jobs Application Services', {
    x: PAGE_MARGIN_LEFT_RIGHT + 12,
    y: payBoxY + 10,
    font: fonts.sansBold,
    size: 8.5,
    color: COLOR_INK,
  });

  // BSB
  renderer.page.drawText('BSB', {
    x: PAGE_MARGIN_LEFT_RIGHT + 175,
    y: payBoxY + 22,
    font: fonts.sansBold,
    size: 6.5,
    color: COLOR_MUTED,
  });
  renderer.page.drawText('083004', {
    x: PAGE_MARGIN_LEFT_RIGHT + 175,
    y: payBoxY + 10,
    font: fonts.sansBold,
    size: 8.5,
    color: COLOR_INK,
  });

  // Account Number
  renderer.page.drawText('ACCOUNT NUMBER', {
    x: PAGE_MARGIN_LEFT_RIGHT + 315,
    y: payBoxY + 22,
    font: fonts.sansBold,
    size: 6.5,
    color: COLOR_MUTED,
  });
  renderer.page.drawText('970362192', {
    x: PAGE_MARGIN_LEFT_RIGHT + 315,
    y: payBoxY + 10,
    font: fonts.sansBold,
    size: 8.5,
    color: COLOR_INK,
  });

  renderer.cursorY = payBoxY - 20;

  drawHeaderAndFooter(renderer, logoImage);

  const bytes = await pdfDoc.save();
  return {
    buffer: Buffer.from(bytes),
    anchorCoords,
  };
}
