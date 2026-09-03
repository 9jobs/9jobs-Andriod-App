import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const requireAdminApiSession = jest.fn();
const getFortnightInvoiceDocumentById = jest.fn();
const generateAndStoreFortnightInvoicePdf = jest.fn();
const getFortnightInvoicePdfBuffer = jest.fn();
const markFortnightInvoiceSent = jest.fn();
const sendMail = jest.fn();
const createTransport = jest.fn(() => ({
  sendMail,
}));

async function loadSendRoute() {
  jest.resetModules();
  jest.doMock('nodemailer', () => ({
    __esModule: true,
    default: {
      createTransport,
    },
  }));
  jest.doMock('@/lib/admin/auth/require-admin', () => ({
    requireAdminApiSession,
  }));
  jest.doMock('@/lib/fortnight-invoices/service', () => ({
    getFortnightInvoiceDocumentById,
    generateAndStoreFortnightInvoicePdf,
    getFortnightInvoicePdfBuffer,
    markFortnightInvoiceSent,
  }));

  return import('@/app/api/fortnight-invoices/send/[invoiceId]/route');
}

describe('fortnight invoice send route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GMAIL_PASS = 'test-password';
    requireAdminApiSession.mockResolvedValue({
      email: 'admin@9jobs.co',
    });
  });

  test('emails the generated fortnight invoice pdf as an attachment', async () => {
    const { POST } = await loadSendRoute();
    const invoiceDocument = {
      _id: 'fortnight-invoice-1',
      invoiceNumber: '9JF-202607-002',
      billedToName: 'Vijay Shukla',
      billedToEmail: 'vijay@9jobs.co',
      generatedPdfUrl: 'db://fortnight-invoices/fortnight-invoice-1/generated-invoice.pdf',
      total: '200',
      description: 'Fortnight Plan',
      dueDate: '2026-07-03',
    };
    const pdfBuffer = Buffer.from('%PDF-test');

    getFortnightInvoiceDocumentById.mockResolvedValue(invoiceDocument);
    getFortnightInvoicePdfBuffer.mockResolvedValue(pdfBuffer);
    markFortnightInvoiceSent.mockResolvedValue({
      _id: 'fortnight-invoice-1',
      status: 'sent',
      sentAt: '2026-07-02T12:00:00.000Z',
    });

    const response = await POST(
      new Request('http://localhost/api/fortnight-invoices/send/fortnight-invoice-1', {
        method: 'POST',
      }),
      {
        params: Promise.resolve({ invoiceId: 'fortnight-invoice-1' }),
      }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(createTransport).toHaveBeenCalled();
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'vijay@9jobs.co',
        subject: 'Service Invoice between Vijay Shukla and 9Jobs',
        attachments: [
          expect.objectContaining({
            filename: 'Invoice_9JF-202607-002.pdf',
            content: pdfBuffer,
            contentType: 'application/pdf',
          }),
        ],
      })
    );
    expect(markFortnightInvoiceSent).toHaveBeenCalledWith('fortnight-invoice-1');
    expect(body.invoice.status).toBe('sent');
  });
});
