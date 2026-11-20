import { describe, it, expect } from 'vitest';
import {
  analysisToInvoice,
  analysisToPurchaseBill,
  analysisToStockItems,
} from '../src/services/fileAnalyzerService.js';

describe('File Analyzer & Document Conversion Service Tests', () => {
  const sampleAnalysis = {
    meta: {
      invoiceNumber: 'INV-7890',
      date: '2026-06-15',
      subtotal: 5000,
      taxTotal: 900,
      totalAmount: 5900,
    },
    party: {
      name: 'Delta Logistics Pvt Ltd',
      gstin: '27AABCD1234E1ZF',
      phone: '9876543210',
      address: 'Sector 18, Navi Mumbai',
    },
    items: [
      {
        name: 'Hydraulic Cylinder',
        hsn: '8412',
        quantity: 2,
        unit: 'PCS',
        rate: 2500,
        gstPercent: 18,
      },
    ],
  };

  it('converts analysis to valid invoice draft payload', () => {
    const inv = analysisToInvoice(sampleAnalysis);
    expect(inv.customerName).toBe('Delta Logistics Pvt Ltd');
    expect(inv.invoiceNumber).toBe('INV-7890');
    expect(inv.invoiceDate).toBe('2026-06-15');
    expect(inv.items.length).toBe(1);
    expect(inv.items[0].description).toBe('Hydraulic Cylinder');
    expect(inv.items[0].rate).toBe(2500);
    expect(inv.items[0].quantity).toBe(2);
  });

  it('converts analysis to canonical purchase bill guaranteeing both vendor and party properties', () => {
    const bill = analysisToPurchaseBill(sampleAnalysis);
    expect(bill.billNumber).toBe('INV-7890');
    expect(bill.vendorName).toBe('Delta Logistics Pvt Ltd');
    expect(bill.partyName).toBe('Delta Logistics Pvt Ltd');
    expect(bill.vendorGstin).toBe('27AABCD1234E1ZF');
    expect(bill.partyGstin).toBe('27AABCD1234E1ZF');
    expect(bill.totalAmount).toBe(5900);
    expect(bill.grandTotal).toBe(5900);
    expect(bill.totals.subtotal).toBe(5000);
    expect(bill.totals.totalTax).toBe(900);
    expect(bill.totals.grandTotal).toBe(5900);
    expect(bill.items.length).toBe(1);
    expect(bill.items[0].description).toBe('Hydraulic Cylinder');
    expect(bill.items[0].amount).toBe(5000);
  });

  it('converts line items into stock inventory catalog format with unique identifiers', () => {
    const catalog = analysisToStockItems(sampleAnalysis);
    expect(catalog.length).toBe(1);
    expect(catalog[0].name).toBe('Hydraulic Cylinder');
    expect(catalog[0].stock).toBe(2);
    expect(catalog[0].rate).toBe(2500);
    expect(catalog[0].hsn).toBe('8412');
    expect(typeof catalog[0].id).toBe('string');
  });
});
