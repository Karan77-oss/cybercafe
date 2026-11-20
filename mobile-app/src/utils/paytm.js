/**
 * Paytm Payment Gateway Checkout Helper
 * Dynamically posts order parameters to Paytm Secure Gateway
 */

export function launchPaytmCheckout({ actionUrl, paytmParams }) {
  if (!paytmParams || typeof paytmParams !== 'object') {
    throw new Error('Paytm parameters missing or invalid');
  }

  const endpoint = actionUrl || 'https://securegw-stage.paytm.in/theia/processTransaction';

  // Create form element
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = endpoint;
  form.style.display = 'none';

  Object.entries(paytmParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = String(value);
      form.appendChild(input);
    }
  });

  document.body.appendChild(form);
  form.submit();
}

export default launchPaytmCheckout;
