export const LOCKED_INVOICE_PAYMENT_DETAILS = {
  accountName: '9 Jobs',
  bankName: '9 Jobs Pty Ltd.',
  accountNumber: '970362192',
  bsb: '083004',
};

export function applyInvoiceDefaults(invoice) {
  return {
    ...LOCKED_INVOICE_PAYMENT_DETAILS,
    ...invoice,
    accountName: invoice?.accountName || LOCKED_INVOICE_PAYMENT_DETAILS.accountName,
    bankName: invoice?.bankName || LOCKED_INVOICE_PAYMENT_DETAILS.bankName,
    accountNumber: invoice?.accountNumber || LOCKED_INVOICE_PAYMENT_DETAILS.accountNumber,
    bsb: invoice?.bsb || LOCKED_INVOICE_PAYMENT_DETAILS.bsb,
  };
}
