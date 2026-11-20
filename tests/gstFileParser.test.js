import { describe, it, expect } from 'vitest';
import {
  normalizeGstDate,
  detectGstFileType,
  parseGstJsonFile,
  reconcile2bWithPurchaseBills,
  generateGstr1UploadJson,
} from '../src/services/gstFileParser.js';

describe('GST File Parser & Reconciler Tests', () => {
  it('normalizes various date formats to ISO YYYY-MM-DD', () => {
    expect(normalizeGstDate('25/08/2026')).toBe('2026-08-25');
    expect(normalizeGstDate('5-9-2026')).toBe('2026-09-05');
    expect(normalizeGstDate('2026-11-19')).toBe('2026-11-19');
    expect(normalizeGstDate('2026/04/01')).toBe('2026-04-01');
  });

  it('detects GSTR-1, GSTR-2B, GSTR-3B, and e-Invoice formats by payload structure', () => {
    const gstr1Obj = { gstin: '27AABCU9603R1ZM', b2b: [] };
    expect(detectGstFileType('return.json', gstr1Obj).type).toBe('GSTR1_JSON');

    const gstr2bObj = { docdata: { b2b: [] } };
    expect(detectGstFileType('gstr2b.json', gstr2bObj).type).toBe('GSTR2B_JSON');

    const gstr3bObj = { sup_details: {} };
    expect(detectGstFileType('gstr3b.json', gstr3bObj).type).toBe('GSTR3B_JSON');

    const einvoiceObj = { Irn: 'abc1234567890', BuyerDtls: {} };
    expect(detectGstFileType('irn.json', einvoiceObj).type).toBe('EINVOICE_JSON');
  });

  it('parses valid GSTR-1 JSON and extracts taxable amounts and invoice records', () => {
    const mockGstr1 = JSON.stringify({
      gstin: '27AABCU9603R1ZM',
      fp: '082026',
      b2b: [
        {
          ctin: '24AAACC1206D1ZM',
          inv: [
            {
              inum: 'INV-101',
              idt: '15-08-2026',
              val: 1180,
              pos: '24',
              itms: [
                {
                  num: 1,
                  itm_det: {
                    rt: 18,
                    txval: 1000,
                    iamt: 180,
                    camt: 0,
                    samt: 0,
                  },
                },
              ],
            },
          ],
        },
      ],
    });

    const parsed = parseGstJsonFile(mockGstr1);
    expect(parsed.invoices.length).toBe(1);
    expect(parsed.invoices[0].invoiceNumber).toBe('INV-101');
    expect(parsed.grossTaxable).toBe(1000);
    expect(parsed.totalIgst).toBe(180);
    expect(parsed.totalInvoiceValue).toBe(1180);
  });

  it('reconciles GSTR-2B portal statements against recorded purchase books accurately', () => {
    const portalInvoices = [
      {
        billNumber: 'BILL-001',
        vendorGstin: '27AABCU9603R1ZM',
        totals: { total: 1180 },
        claimableItc: 180,
      },
      {
        billNumber: 'BILL-002',
        vendorGstin: '27AABCU9603R1ZM',
        totals: { total: 2360 },
        claimableItc: 360,
      },
    ];

    const purchaseBooks = [
      {
        id: 'b1',
        billNumber: 'BILL-001',
        vendorGstin: '27AABCU9603R1ZM',
        totalAmount: 1180,
      },
      {
        id: 'b3',
        billNumber: 'BILL-003',
        vendorGstin: '24AAACC1206D1ZM',
        totalAmount: 590,
      },
    ];

    const result = reconcile2bWithPurchaseBills(portalInvoices, purchaseBooks);
    expect(result.matched.length).toBe(1);
    expect(result.portalOnly.length).toBe(1);
    expect(result.booksOnly.length).toBe(1);
    expect(result.claimableItcMatched).toBe(180);
  });

  it('generates standard government-compliant GSTR-1 JSON schema', () => {
    const invoices = [
      {
        invoiceNumber: 'INV-1001',
        invoiceDate: '2026-08-10',
        customerGstin: '27AABCU9603R1ZN',
        isInterState: false,
        totals: { total: 1180, subtotal: 1000, cgst: 90, sgst: 90 },
        items: [{ rate: 1000, quantity: 1, gstPercent: 18 }],
      },
    ];

    const json = generateGstr1UploadJson(invoices, { gstin: '27AABCU9603R1ZN' }, '082026');
    expect(json.gstin).toBe('27AABCU9603R1ZN');
    expect(json.fp).toBe('082026');
    expect(Array.isArray(json.b2b)).toBe(true);
    expect(json.b2b.length).toBe(1);
  });
});
