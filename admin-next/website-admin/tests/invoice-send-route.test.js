import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const requireAdminApiSession = jest.fn();
const getInvoiceDocumentById = jest.fn();
const generateAndStoreInvoicePdf = jest.fn();
const getInvoicePdfBuffer = jest.fn();
const markInvoiceSent = jest.fn();
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
  jest.doMock('@/lib/invoices/service', () => ({
    getInvoiceDocumentById,
    generateAndStoreInvoicePdf,
    getInvoicePdfBuffer,
    markInvoiceSent,
  }));

  return import('@/app/api/invoices/send/[invoiceId]/route');
}

describe('invoice send route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GMAIL_PASS = 'test-password';
    requireAdminApiSession.mockResolvedValue({
      email: 'admin@9jobs.co',
    });
  });

  test('emails the generated invoice pdf as an attachment', async () => {
    const { POST } = await loadSendRoute();
    const invoiceDocument = {
      _id: 'invoice-1',
      invoiceNumber: '9J-202607-017',
      billedToName: 'Neetu Sharma',
      billedToEmail: 'sharmamelbourne91@gmail.com',
      generatedPdfUrl: 'db://invoices/invoice-1/generated-invoice.pdf',
      total: '150',
      description: 'Job Application Services',
      dueDate: '2026-07-03',
    };
    const pdfBuffer = Buffer.from('%PDF-test');

    getInvoiceDocumentById.mockResolvedValue(invoiceDocument);
    getInvoicePdfBuffer.mockResolvedValue(pdfBuffer);
    markInvoiceSent.mockResolvedValue({
      _id: 'invoice-1',
      status: 'sent',
      sentAt: '2026-07-02T12:00:00.000Z',
    });

    const response = await POST(
      new Request('http://localhost/api/invoices/send/invoice-1', {
        method: 'POST',
      }),
      {
        params: Promise.resolve({ invoiceId: 'invoice-1' }),
      }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(createTransport).toHaveBeenCalled();
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'sharmamelbourne91@gmail.com',
        subject: 'Service Invoice between Neetu Sharma and 9Jobs',
        attachments: [
          expect.objectContaining({
            filename: 'Invoice_9J-202607-017.pdf',
            content: pdfBuffer,
            contentType: 'application/pdf',
          }),
        ],
      })
    );
    expect(markInvoiceSent).toHaveBeenCalledWith('invoice-1');
    expect(body.invoice.status).toBe('sent');
  });
});