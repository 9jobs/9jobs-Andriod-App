export function getHostedCheckoutCustomerCaptureConfig() {
  return {
    billing_address_collection: 'required',
    customer_update: {
      address: 'auto',
      name: 'auto',
    },
  };
}
