import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const requireAdminApiSession = jest.fn();
const createInvoice = jest.fn();
const deleteInvoiceById = jest.fn();
const getInvoiceDocumentById = jest.fn();
const generateAndStoreInvoicePdf = jest.fn();
const listInvoices = jest.fn();
const updateInvoiceById = jest.fn();

async function loadInvoicesRoute() {
  jest.resetModules();
  jest.doMock('@/lib/admin/auth/require-admin', () => ({
    requireAdminApiSession,
  }));
  jest.doMock('@/lib/invoices/service', () => ({
    createInvoice,
    deleteInvoiceById,
    getInvoiceDocumentById,
    generateAndStoreInvoicePdf,
    listInvoices,
    updateInvoiceById,
  }));

  return import('@/app/api/invoices/route');
}

function buildInvoicePayload() {
  return {
    invoiceNumber: '9J-202607-017',
    invoiceDate: '2026-07-01',
    billedToName: 'Neetu Sharma',
    billedToEmail: 'sharmamelbourne91@gmail.com',
    billedToPhone: '+61 421 803 703',
    weekLabel: '1',
    issuedDate: '2026-07-01',
    validUntil: '2026-07-07',
    dueDate: '2026-07-02',
    description: 'Job Application Services',
    duration: '1 WEEK',
    total: '150',
  };
}

describe('invoices route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireAdminApiSession.mockResolvedValue({
      email: 'admin@9jobs.co',
    });
  });

  test('creates an invoice and auto-generates its preview pdf', async () => {
    const { POST } = await loadInvoicesRoute();
    createInvoice.mockResolvedValue({
      _id: 'invoice-1',
      billedToName: 'Neetu Sharma',
    });
    getInvoiceDocumentById.mockResolvedValue({
      _id: 'invoice-1',
    });
    generateAndStoreInvoicePdf.mockResolvedValue({
      invoice: {
        _id: 'invoice-1',
        billedToName: 'Neetu Sharma',
        generatedPdfUrl: 'db://invoices/invoice-1/generated-invoice.pdf',
      },
    });

    const response = await POST(
      new Request('http://localhost/api/invoices', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(buildInvoicePayload()),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(createInvoice).toHaveBeenCalled();
    expect(getInvoiceDocumentById).toHaveBeenCalledWith('invoice-1');
    expect(generateAndStoreInvoicePdf).toHaveBeenCalledWith({
      _id: 'invoice-1',
    });
    expect(body.previewUrl).toBe('/api/invoices/invoice-1/preview-pdf');
    expect(body.invoice.generatedPdfUrl).toBeTruthy();
  });

  test('lists invoices for the admin register', async () => {
    const { GET } = await loadInvoicesRoute();
    listInvoices.mockResolvedValue([
      {
        _id: 'invoice-1',
        invoiceNumber: '9J-202607-017',
      },
    ]);

    const response = await GET(
      new Request('http://localhost/api/invoices', {
        method: 'GET',
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(listInvoices).toHaveBeenCalled();
    expect(body.invoices).toHaveLength(1);
    expect(body.invoices[0].invoiceNumber).toBe('9J-202607-017');
  });

  test('updates an invoice and refreshes its preview pdf', async () => {
    const { PATCH } = await loadInvoicesRoute();
    updateInvoiceById.mockResolvedValue({
      _id: 'invoice-1',
      invoiceNumber: '9J-202607-017',
    });
    getInvoiceDocumentById.mockResolvedValue({
      _id: 'invoice-1',
    });
    generateAndStoreInvoicePdf.mockResolvedValue({
      invoice: {
        _id: 'invoice-1',
        generatedPdfUrl: 'db://invoices/invoice-1/generated-invoice.pdf',
      },
    });

    const response = await PATCH(
      new Request('http://localhost/api/invoices', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          id: 'invoice-1',
          ...buildInvoicePayload(),
          billedToName: 'Updated Client',
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(updateInvoiceById).toHaveBeenCalledWith('invoice-1', expect.objectContaining({ billedToName: 'Updated Client' }));
    expect(getInvoiceDocumentById).toHaveBeenCalledWith('invoice-1');
    expect(generateAndStoreInvoicePdf).toHaveBeenCalled();
    expect(body.invoice.generatedPdfUrl).toBeTruthy();
  });

  test('deletes an invoice by id', async () => {
    const { DELETE } = await loadInvoicesRoute();
    deleteInvoiceById.mockResolvedValue(true);

    const response = await DELETE(
      new Request('http://localhost/api/invoices?id=invoice-1', {
        method: 'DELETE',
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(deleteInvoiceById).toHaveBeenCalledWith('invoice-1');
    expect(body.deleted).toBe(true);
  });
});
