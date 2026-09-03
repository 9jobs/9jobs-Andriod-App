import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

function sanitizeText(value) {
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

function formatTimestamp(value) {
  const date = value ? new Date(value) : null;

  if (!date || Number.isNaN(date.getTime())) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat('en-AU', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(date);
}

function formatMoney(amountCents, currency = 'AUD') {
  const numericAmount = Number(amountCents || 0) / 100;

  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: String(currency || 'AUD').toUpperCase(),
  }).format(numericAmount);
}

function drawText(page, text, x, y, options) {
  page.drawText(sanitizeText(text), { x, y, ...options });
}

function drawWrappedText(page, text, x, y, maxWidth, lineHeight, options) {
  const words = sanitizeText(text).split(/\s+/).filter(Boolean);
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

export async function generatePaymentSlipPdfBuffer({
  invoiceNumber = '',
  invoiceDescription = '',
  billedToName = '',
  billedToEmail = '',
  amountCents = 0,
  currency = 'AUD',
  paymentDate = '',
  paymentStatus = 'paid',
  paymentReference = '',
  paymentIntentId = '',
  subscriptionId = '',
  title = 'Payment Slip',
}) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const colors = {
    text: rgb(0.06, 0.09, 0.16),
    muted: rgb(0.37, 0.43, 0.51),
    rule: rgb(0.86, 0.89, 0.92),
    success: rgb(0.22, 0.69, 0.34),
    panel: rgb(0.97, 0.98, 0.99),
    accent: rgb(0.07, 0.19, 0.36),
  };

  const left = 48;
  const width = page.getWidth() - left * 2;
  let y = page.getHeight() - 72;

  page.drawRectangle({
    x: left,
    y: y - 26,
    width,
    height: 58,
    color: colors.accent,
    borderRadius: 18,
  });

  drawText(page, title, left + 24, y, {
    font: bold,
    size: 24,
    color: rgb(1, 1, 1),
  });

  drawText(page, 'Payment Successful', left + 24, y - 22, {
    font: regular,
    size: 12,
    color: rgb(0.88, 0.95, 1),
  });

  y -= 96;

  page.drawRectangle({
    x: left,
    y: y - 84,
    width,
    height: 92,
    color: colors.panel,
    borderColor: colors.rule,
    borderWidth: 1,
  });

  drawText(page, 'Payment Summary', left + 20, y - 8, {
    font: bold,
    size: 15,
    color: colors.text,
  });
  drawText(page, formatMoney(amountCents, currency), left + 20, y - 38, {
    font: bold,
    size: 26,
    color: colors.success,
  });
  drawText(page, `Status: ${paymentStatus}`, left + 20, y - 62, {
    font: regular,
    size: 11,
    color: colors.muted,
  });
  drawText(page, `Paid on: ${formatTimestamp(paymentDate)}`, left + 260, y - 38, {
    font: regular,
    size: 11,
    color: colors.muted,
  });
  drawText(page, `Invoice: ${invoiceNumber || 'Not available'}`, left + 260, y - 62, {
    font: regular,
    size: 11,
    color: colors.muted,
  });

  y -= 126;

  const rows = [
    ['Customer name', billedToName || 'Not available'],
    ['Customer email', billedToEmail || 'Not available'],
    ['Plan / Invoice', invoiceDescription || 'Not available'],
    ['Payment reference', paymentReference || 'Not available'],
    ['Payment Intent', paymentIntentId || 'Not available'],
    ['Subscription', subscriptionId || 'Not available'],
  ];

  for (const [label, value] of rows) {
    drawText(page, label, left, y, {
      font: bold,
      size: 11,
      color: colors.text,
    });
    y = drawWrappedText(page, value, left + 150, y, width - 150, 15, {
      font: regular,
      size: 11,
      color: colors.text,
    });
    y -= 8;
    page.drawLine({
      start: { x: left, y },
      end: { x: left + width, y },
      thickness: 1,
      color: colors.rule,
    });
    y -= 18;
  }

  drawText(page, 'This slip confirms that the payment was completed successfully through Stripe.', left, y - 10, {
    font: regular,
    size: 11,
    color: colors.muted,
  });

  return Buffer.from(await pdfDoc.save());
}
