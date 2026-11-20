import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getNextInvoiceNumber,
  generateInvoiceNumber,
  loadInvoices,
  persistInvoices,
} from '../src/services/invoiceStorage.js';

describe('Invoice Storage & Numbering Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('generates INV-0001 when no previous invoices exist', () => {
    expect(getNextInvoiceNumber([])).toBe('INV-0001');
    expect(getNextInvoiceNumber(null)).toBe('INV-0001');
    expect(generateInvoiceNumber([])).toBe('INV-0001');
  });

  it('increments sequence cleanly while preserving padding length', () => {
    const list = [{ invoiceNumber: 'INV-0042' }];
    expect(getNextInvoiceNumber(list)).toBe('INV-0043');

    const fourDigit = [{ invoiceNumber: 'INV-0999' }];
    expect(getNextInvoiceNumber(fourDigit)).toBe('INV-1000');
  });

  it('preserves custom billing prefixes and formats', () => {
    const list = [{ invoiceNumber: 'BILL/2026/001' }];
    expect(getNextInvoiceNumber(list)).toBe('BILL/2026/002');

    const taxList = [{ invoiceNumber: 'TAX-0099' }];
    expect(getNextInvoiceNumber(taxList)).toBe('TAX-0100');
  });

  it('determines the highest number across all invoices to prevent collisions', () => {
    const unordered = [
      { invoiceNumber: 'INV-0002' },
      { invoiceNumber: 'INV-0015' },
      { invoiceNumber: 'INV-0008' },
    ];
    // Next should be 16, regardless of array order
    expect(getNextInvoiceNumber(unordered)).toBe('INV-0016');
  });

  it('handles load and persist with mocked localStorage', () => {
    const store = {};
    const mockStorage = {
      getItem: vi.fn((key) => store[key] || null),
      setItem: vi.fn((key, val) => {
        store[key] = String(val);
      }),
      removeItem: vi.fn((key) => {
        delete store[key];
      }),
    };

    vi.stubGlobal('window', { localStorage: mockStorage });

    const sampleInvoices = [
      { id: '1', invoiceNumber: 'INV-0001', totals: { total: 1000 } },
    ];

    persistInvoices(sampleInvoices);
    expect(mockStorage.setItem).toHaveBeenCalledWith(
      'gst-invoice-app',
      JSON.stringify(sampleInvoices)
    );

    const loaded = loadInvoices();
    expect(loaded).toEqual(sampleInvoices);

    vi.unstubAllGlobals();
  });
});
