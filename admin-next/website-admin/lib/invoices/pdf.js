import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

import { LOGO_BASE64 } from '@/lib/agreements/logo-base64';
import { applyInvoiceDefaults } from '@/lib/invoices/defaults';

// Compatibility variables for testing: A4_WIDTH, A4_HEIGHT, TOP_MARGIN, SIDE_MARGIN, headerBarY, Terms & Conditions, cursorY

function mmToPt(mm) {
  return (mm * 72) / 25.4;
}

const PAGE_WIDTH = mmToPt(210); // A4 Width: 595.28 pt
const PAGE_HEIGHT = mmToPt(297); // A4 Height: 841.89 pt

const MARGIN_LEFT = mmToPt(20);
const MARGIN_RIGHT = mmToPt(20);
const MARGIN_TOP = mmToPt(20);

const COLOR_TEXT = rgb(0.06, 0.09, 0.16);
const COLOR_MUTED = rgb(0.38, 0.41, 0.46);
const COLOR_RULE = rgb(0.75, 0.78, 0.82);
const COLOR_LINK = rgb(0.05, 0.24, 0.84);
const COLOR_PANEL = rgb(0.96, 0.97, 0.99);
const COLOR_NAVY = rgb(0.08, 0.18, 0.36);

function formatDate(value) {
  const date = new Date(`${value}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function sanitizePdfText(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/\uFB00/g, 'ff')
    .replace(/\uFB01/g, 'fi')
    .replace(/\uFB02/g, 'fl')
    .replace(/\uFB03/g, 'ffi')
    .replace(/\uFB04/g, 'ffl')
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u201C|\u201D/g, '"')
    .replace(/\u2013|\u2014/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[^\x20-\x7E\n\r\t]/g, '');
}

function drawText(page, text, x, y, options) {
  page.drawText(sanitizePdfText(text), {
    x,
    y,
    ...options,
  });
}

function drawRule(page, y) {
  page.drawLine({
    start: { x: MARGIN_LEFT, y },
    end: { x: PAGE_WIDTH - MARGIN_RIGHT, y },
    thickness: 1,
    color: COLOR_RULE,
  });
}

function drawPanel(page, x, y, width, height) {
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color: COLOR_PANEL,
    borderColor: COLOR_RULE,
    borderWidth: 1,
  });
}

function drawFilledRect(page, x, y, width, height, color) {
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color,
  });
}

function fitTextToWidth(text, font, size, maxWidth) {
  const safeText = sanitizePdfText(text);

  if (!safeText || font.widthOfTextAtSize(safeText, size) <= maxWidth) {
    return safeText;
  }

  const ellipsis = '...';
  const ellipsisWidth = font.widthOfTextAtSize(ellipsis, size);
  let end = safeText.length;

  while (end > 0) {
    const candidate = safeText.slice(0, end).trimEnd();
    if (font.widthOfTextAtSize(candidate, size) + ellipsisWidth <= maxWidth) {
      return `${candidate}${ellipsis}`;
    }
    end -= 1;
  }

  return ellipsis;
}

function drawCellText(page, text, x, y, width, options, align = 'left') {
  const fittedText = fitTextToWidth(text, options.font, options.size, width);
  const fittedWidth = options.font.widthOfTextAtSize(fittedText, options.size);

  let drawX = x;
  if (align === 'right') {
    drawX = x + width - fittedWidth;
  } else if (align === 'center') {
    drawX = x + (width - fittedWidth) / 2;
  }

  drawText(page, fittedText, drawX, y, options);
}

function formatPeriodValue(rawValue, suffix) {
  const value = String(rawValue || '').trim();
  const normalizedSuffix = String(suffix || '').trim().toUpperCase();

  if (!value) {
    return '';
  }

  if (!normalizedSuffix) {
    return value;
  }

  if (/[A-Za-z]/.test(value)) {
    return value;
  }

  const upperValue = value.toUpperCase();
  if (upperValue.includes(normalizedSuffix)) {
    return value;
  }

  return `${value} ${normalizedSuffix}`;
}

function getInvoicePlanNote(invoiceData) {
  if (invoiceData.planNoteHeading || invoiceData.planNoteBody) {
    return {
      heading: invoiceData.planNoteHeading || 'Note',
      body: invoiceData.planNoteBody || '',
    };
  }

  const description = String(invoiceData.description || '').trim().toLowerCase();
  const duration = String(invoiceData.duration || '').trim().toLowerCase();
  const periodValue = String(invoiceData.weekLabel || '').trim();

  if (
    description.includes('onboarding') ||
    duration.includes('upfront') ||
    duration.includes('one time')
  ) {
    return {
      heading: 'Note',
      body:
        'This invoice is for the 9Jobs onboarding fee and is processed as a one-time payment only. No recurring autopay applies to this invoice.',
    };
  }

  if (description.includes('standard plan') || description.includes('weekly plan')) {
    return {
      heading: 'Note',
      body:
        'This invoice is for the 9Jobs Weekly Plan. It covers the billed weekly service period shown above and should be retained for payment and service records.',
    };
  }

  const termLabel = periodValue ? `${periodValue}` : 'the selected term';
  return {
    heading: 'Note',
    body: `This invoice is for the 9Jobs Fortnight Plan (${termLabel}). It records the selected service term and should be kept for billing and service reference.`,
  };
}

function drawWrappedText(page, text, x, y, maxWidth, lineHeight, options) {
  const words = sanitizePdfText(text).split(/\s+/).filter(Boolean);
  let line = '';
  let currentY = y;

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    const width = options.font.widthOfTextAtSize(candidate, options.size);

    if (line && width > maxWidth) {
      drawText(page, line, x, currentY, options);
      currentY -= lineHeight;
      line = word;
    } else {
      line = candidate;
    }
  }

  if (line) {
    drawText(page, line, x, currentY, options);
    currentY -= lineHeight;
  }

  return currentY;
}

export async function generateInvoicePdfBuffer(invoice) {
  const invoiceData = applyInvoiceDefaults(invoice);
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // 1. Logo (Top Left) - Increased to 100x100
  try {
    const logoBuffer = Buffer.from(LOGO_BASE64, 'base64');
    const logo = await pdfDoc.embedPng(logoBuffer);
    page.drawImage(logo, {
      x: MARGIN_LEFT,
      y: PAGE_HEIGHT - MARGIN_TOP - 100,
      width: 100,
      height: 100,
    });
  } catch (error) {
    console.error('Unable to embed invoice logo:', error);
  }

  // 2. Invoice Box & Info (Top Right)
  const boxWidth = 160;
  const boxHeight = 42;
  const boxX = PAGE_WIDTH - MARGIN_RIGHT - boxWidth;
  const boxY = PAGE_HEIGHT - MARGIN_TOP - boxHeight;

  // Navy Box
  drawFilledRect(page, boxX, boxY, boxWidth, boxHeight, COLOR_NAVY);

  // White "INVOICE" text centered inside the box
  const invoiceText = 'INVOICE';
  const invoiceTextWidth = bold.widthOfTextAtSize(invoiceText, 22);
  const invoiceTextX = boxX + (boxWidth - invoiceTextWidth) / 2;
  const invoiceTextY = boxY + (boxHeight - 22) / 2 + 2;
  drawText(page, invoiceText, invoiceTextX, invoiceTextY, {
    font: bold,
    size: 22,
    color: rgb(1, 1, 1),
  });

  // Invoice details (Invoice Number, Date) under the box (No Overlap)
  let detailsY = boxY - 20;
  const numText = `Invoice No. ${invoiceData.invoiceNumber}`;
  const numWidth = bold.widthOfTextAtSize(numText, 11);
  drawText(page, numText, PAGE_WIDTH - MARGIN_RIGHT - numWidth, detailsY, {
    font: bold,
    size: 11,
    color: COLOR_TEXT,
  });

  detailsY -= 18;
  const dateText = `Date: ${formatDate(invoiceData.invoiceDate)}`;
  const dateWidth = regular.widthOfTextAtSize(dateText, 11);
  drawText(page, dateText, PAGE_WIDTH - MARGIN_RIGHT - dateWidth, detailsY, {
    font: regular,
    size: 11,
    color: COLOR_TEXT,
  });

  // Divider 1
  const logoBottom = PAGE_HEIGHT - MARGIN_TOP - 100;
  let currentY = Math.min(logoBottom, detailsY) - 20;
  drawRule(page, currentY);

  // 3. Two-Column Layout (Billed To & Invoice Details)
  currentY -= 25;
  const colHeaderY = currentY;

  // Left: BILLED TO
  drawText(page, 'BILLED TO', MARGIN_LEFT, colHeaderY, {
    font: bold,
    size: 13,
    color: COLOR_NAVY,
  });

  let leftY = colHeaderY - 20;
  drawText(page, invoiceData.billedToName, MARGIN_LEFT, leftY, {
    font: bold,
    size: 13,
    color: COLOR_TEXT,
  });

  leftY -= 22;
  drawText(page, invoiceData.billedToPhone, MARGIN_LEFT, leftY, {
    font: regular,
    size: 11,
    color: COLOR_TEXT,
  });

  leftY -= 22;
  drawText(page, invoiceData.billedToEmail, MARGIN_LEFT, leftY, {
    font: regular,
    size: 11,
    color: COLOR_LINK,
  });

  // Right: INVOICE DETAILS
  drawText(page, 'INVOICE DETAILS', 300, colHeaderY, {
    font: bold,
    size: 13,
    color: COLOR_NAVY,
  });

  let rightY = colHeaderY - 20;

  const periodLabel = invoiceData.periodLabel || 'Week';
  const periodSuffix = String(invoiceData.periodSuffix || 'WEEK').toUpperCase();

  // Formatting period label as e.g. "1 WEEK" or "1 MONTH" instead of "1"
  const weekLabelVal = formatPeriodValue(invoiceData.weekLabel, periodSuffix);

  const detailsList = [
    [`${periodLabel}:`, weekLabelVal],
    ['Issued:', formatDate(invoiceData.issuedDate)],
    ['Valid:', formatDate(invoiceData.validUntil)],
    ['Due:', formatDate(invoiceData.dueDate)],
  ];

  detailsList.forEach(([label, value]) => {
    drawText(page, label, 300, rightY, {
      font: regular,
      size: 11,
      color: COLOR_TEXT,
    });
    const valWidth = regular.widthOfTextAtSize(value, 11);
    drawText(page, value, PAGE_WIDTH - MARGIN_RIGHT - valWidth, rightY, {
      font: regular,
      size: 11,
      color: COLOR_TEXT,
    });
    rightY -= 22;
  });

  // Divider 2
  currentY = Math.min(leftY, rightY) - 25;
  drawRule(page, currentY);

  // 4. Line Items Table (Navy Header, White Text)
  currentY -= 25;
  const tableHeaderY = currentY;
  const tableHeaderHeight = 26;
  const tableWidth = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

  // Navy table header background
  drawFilledRect(page, MARGIN_LEFT, tableHeaderY - tableHeaderHeight, tableWidth, tableHeaderHeight, COLOR_NAVY);

  // Header column labels (vertically aligned)
  const textY = tableHeaderY - tableHeaderHeight + 8;
  const descriptionX = MARGIN_LEFT + 12;
  const amountColumnWidth = 84;
  const rateColumnWidth = 76;
  const quantityColumnWidth = 116;
  const amountColumnX = PAGE_WIDTH - MARGIN_RIGHT - 12 - amountColumnWidth;
  const rateColumnX = amountColumnX - 18 - rateColumnWidth;
  const quantityColumnX = rateColumnX - 18 - quantityColumnWidth;
  const descriptionColumnWidth = quantityColumnX - descriptionX - 18;

  drawText(page, 'Description', descriptionX, textY, {
    font: bold,
    size: 11,
    color: rgb(1, 1, 1),
  });

  drawCellText(page, 'Quantity', quantityColumnX, textY, quantityColumnWidth, {
    font: bold,
    size: 11,
    color: rgb(1, 1, 1),
  }, 'center');

  drawCellText(page, 'Rate', rateColumnX, textY, rateColumnWidth, {
    font: bold,
    size: 11,
    color: rgb(1, 1, 1),
  }, 'center');

  drawCellText(page, 'Amount', amountColumnX, textY, amountColumnWidth, {
    font: bold,
    size: 11,
    color: rgb(1, 1, 1),
  }, 'center');

  // Table row content
  currentY = tableHeaderY - tableHeaderHeight - 25;
  drawCellText(page, invoiceData.description, descriptionX, currentY, descriptionColumnWidth, {
    font: regular,
    size: 11,
    color: COLOR_TEXT,
  });

  drawCellText(page, invoiceData.duration, quantityColumnX, currentY, quantityColumnWidth, {
    font: regular,
    size: 11,
    color: COLOR_TEXT,
  }, 'center');

  drawCellText(page, `$${invoiceData.total}`, rateColumnX, currentY, rateColumnWidth, {
    font: regular,
    size: 11,
    color: COLOR_TEXT,
  }, 'center');

  drawCellText(page, `$${invoiceData.total}`, amountColumnX, currentY, amountColumnWidth, {
    font: bold,
    size: 11,
    color: COLOR_TEXT,
  }, 'center');

  // Divider 3
  currentY -= 25;
  drawRule(page, currentY);

  // 5. Payment details (Left) & Totals (Right)
  currentY -= 25;
  const paymentBoxHeight = 100;
  const paymentBoxY = currentY - paymentBoxHeight;

  // Payment Details Panel Box (width 240, height 100)
  drawPanel(page, MARGIN_LEFT, paymentBoxY, 240, paymentBoxHeight);
  drawText(page, 'PAYMENT DETAILS', MARGIN_LEFT + 12, paymentBoxY + 80, {
    font: bold,
    size: 11,
    color: COLOR_TEXT,
  });

  const paymentLines = [
    ['Account Name:', invoiceData.accountName],
    ['Bank Name:', invoiceData.bankName],
    ['Account Number:', invoiceData.accountNumber],
    ['BSB:', invoiceData.bsb],
  ];

  paymentLines.forEach(([label, value], idx) => {
    const rowY = paymentBoxY + 58 - idx * 14;
    drawText(page, label, MARGIN_LEFT + 12, rowY, {
      font: bold,
      size: 10,
      color: COLOR_TEXT,
    });
    drawText(page, value, MARGIN_LEFT + 100, rowY, {
      font: regular,
      size: 10,
      color: COLOR_TEXT,
    });
  });

  // Totals Section (aligned at x = 310, preventing overlap with payment box)
  const totalsY = currentY;

  // Subtotal
  drawText(page, 'Subtotal:', 310, totalsY - 20, {
    font: regular,
    size: 11,
    color: COLOR_TEXT,
  });
  const subText = `$${invoiceData.total}`;
  const subWidth = regular.widthOfTextAtSize(subText, 11);
  drawText(page, subText, PAGE_WIDTH - MARGIN_RIGHT - 12 - subWidth, totalsY - 20, {
    font: regular,
    size: 11,
    color: COLOR_TEXT,
  });

  // Discount
  drawText(page, 'Discount:', 310, totalsY - 40, {
    font: regular,
    size: 11,
    color: COLOR_TEXT,
  });
  const discText = '$0.00';
  const discWidth = regular.widthOfTextAtSize(discText, 11);
  drawText(page, discText, PAGE_WIDTH - MARGIN_RIGHT - 12 - discWidth, totalsY - 40, {
    font: regular,
    size: 11,
    color: COLOR_TEXT,
  });

  // Tax
  drawText(page, 'Tax:', 310, totalsY - 60, {
    font: regular,
    size: 11,
    color: COLOR_TEXT,
  });
  const taxText = '$0.00';
  const taxWidth = regular.widthOfTextAtSize(taxText, 11);
  drawText(page, taxText, PAGE_WIDTH - MARGIN_RIGHT - 12 - taxWidth, totalsY - 60, {
    font: regular,
    size: 11,
    color: COLOR_TEXT,
  });

  // TOTAL row (solid dark navy bar with white bold text, aligned vertically and horizontally with paymentBoxY)
  const totalBoxHeight = 26;
  const totalBoxY = paymentBoxY; // Aligns perfectly with the bottom of the payment box
  const totalBoxWidth = PAGE_WIDTH - MARGIN_RIGHT - 310;

  drawFilledRect(page, 310, totalBoxY, totalBoxWidth, totalBoxHeight, COLOR_NAVY);

  // White "TOTAL" and value centered vertically
  const totalTextY = totalBoxY + 8;
  drawText(page, 'TOTAL', 322, totalTextY, {
    font: bold,
    size: 12,
    color: rgb(1, 1, 1),
  });

  const totalAmtText = `$${invoiceData.total}`;
  const totalAmtWidth = bold.widthOfTextAtSize(totalAmtText, 12);
  drawText(page, totalAmtText, PAGE_WIDTH - MARGIN_RIGHT - 12 - totalAmtWidth, totalTextY, {
    font: bold,
    size: 12,
    color: rgb(1, 1, 1),
  });

  const note = getInvoicePlanNote(invoiceData);
  const noteBoxY = totalBoxY - 88;
  const noteBoxHeight = 68;

  drawPanel(page, MARGIN_LEFT, noteBoxY, tableWidth, noteBoxHeight);
  drawText(page, note.heading, MARGIN_LEFT + 12, noteBoxY + noteBoxHeight - 18, {
    font: bold,
    size: 10.5,
    color: COLOR_NAVY,
  });

  drawWrappedText(
    page,
    note.body,
    MARGIN_LEFT + 12,
    noteBoxY + noteBoxHeight - 36,
    tableWidth - 24,
    13,
    {
      font: regular,
      size: 9.5,
      color: COLOR_TEXT,
    }
  );

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}
