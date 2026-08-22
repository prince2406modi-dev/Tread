const STORAGE_KEY = 'gst-invoice-app';

function safeParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function loadInvoices() {
  if (typeof window === 'undefined') return [];
  const saved = window.localStorage.getItem(STORAGE_KEY);
  const parsed = safeParse(saved);
  return Array.isArray(parsed) ? parsed : [];
}

export function persistInvoices(invoices) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
}

/**
 * Returns the next invoice number incremented by exactly 1 based on the last created invoice.
 * Example: 'INV-0001' -> 'INV-0002', 'INV-1005' -> 'INV-1006', 'INV-2026-001' -> 'INV-2026-002'.
 */
export function getNextInvoiceNumber(invoices = [], defaultPrefix = 'INV') {
  if (!Array.isArray(invoices) || invoices.length === 0) {
    return `${defaultPrefix}-0001`;
  }

  // Check the latest invoice (index 0)
  const lastInvoice = invoices[0];
  const lastNumberStr = String(lastInvoice?.invoiceNumber || '').trim();

  const match = lastNumberStr.match(/^(.*?)(\d+)$/);
  if (match) {
    const prefix = match[1] || `${defaultPrefix}-`;
    const numDigits = match[2];
    const padLength = numDigits.length;

    // Find the highest sequence number among all invoices with this prefix
    let maxNum = parseInt(numDigits, 10);
    invoices.forEach((inv) => {
      const invMatch = String(inv.invoiceNumber || '').match(/^(.*?)(\d+)$/);
      if (invMatch && invMatch[1] === prefix) {
        const val = parseInt(invMatch[2], 10);
        if (!isNaN(val) && val > maxNum) {
          maxNum = val;
        }
      }
    });

    const nextVal = maxNum + 1;
    return `${prefix}${String(nextVal).padStart(padLength, '0')}`;
  }

  return `${defaultPrefix}-0001`;
}

export function generateInvoiceNumber(invoices = []) {
  return getNextInvoiceNumber(invoices);
}
