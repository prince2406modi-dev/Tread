import { describe, it, expect } from 'vitest';
import {
  computePartyLedger,
  computeStockMovement,
  normalizeStockItem,
  normalizeParty,
  findCustomerFast,
  findStockItemFast,
} from '../src/services/treadBackend.js';

describe('TreadBackend - Accounting Engine & Ledger Tests', () => {
  const mockCustomers = [
    { id: 'c1', name: 'Acme Traders', openingBalance: 1500, gstin: '27AABCU9603R1ZM' },
    { id: 'c2', name: 'Global Supplies', openingBalance: -500, gstin: '24AAACC1206D1ZM' },
  ];

  const mockInvoices = [
    {
      id: 'inv1',
      invoiceNumber: 'INV-2026-001',
      invoiceDate: '2026-01-10',
      customerName: 'Acme Traders',
      totals: { total: 5000, totalGst: 762.71, subtotal: 4237.29 },
      items: [{ description: 'Steel Brackets', quantity: 10, rate: 423.73 }],
    },
    {
      id: 'inv2',
      invoiceNumber: 'INV-2026-002',
      invoiceDate: '2026-02-15',
      customerName: 'Acme Traders',
      totals: { total: 3000, totalGst: 457.63, subtotal: 2542.37 },
      items: [{ description: 'Copper Pipes', quantity: 5, rate: 508.47 }],
    },
  ];

  const mockPurchaseBills = [
    {
      id: 'pb1',
      billNumber: 'PB-2026-001',
      billDate: '2026-01-15',
      vendorName: 'Acme Traders',
      totals: { grandTotal: 2000, totalTax: 300, subtotal: 1700 },
      items: [{ description: 'Steel Brackets', quantity: 20, rate: 85 }],
    },
  ];

  const mockPayments = [
    {
      id: 'pay1',
      voucherNumber: 'RCP-2026-0001',
      type: 'Payment In',
      date: '2026-01-20',
      partyName: 'Acme Traders',
      amount: 4000,
      paymentMode: 'Bank Transfer',
      referenceNo: 'UTR998877',
    },
    {
      id: 'pay2',
      voucherNumber: 'PAY-2026-0001',
      type: 'Payment Out',
      date: '2026-02-20',
      partyName: 'Acme Traders',
      amount: 1000,
      paymentMode: 'Cash',
    },
  ];

  it('handles invalid or empty party names gracefully', () => {
    const res = computePartyLedger('', {});
    expect(res.entries).toEqual([]);
    expect(res.closingBalance).toBe(0);
    expect(res.closingType).toBe('Dr');
  });

  it('correctly loads initial customer opening balance b/f', () => {
    const res = computePartyLedger('Acme Traders', { customers: mockCustomers });
    expect(res.openingBalance).toBe(1500);
    expect(res.entries.length).toBe(1);
    expect(res.entries[0].vchType).toBe('Opening Balance');
    expect(res.entries[0].balance).toBe(1500);
    expect(res.entries[0].balanceType).toBe('Dr');
  });

  it('computes full chronological party ledger with all voucher types', () => {
    const res = computePartyLedger('Acme Traders', {
      invoices: mockInvoices,
      purchaseBills: mockPurchaseBills,
      payments: mockPayments,
      customers: mockCustomers,
    });

    // Initial 1500 + Inv1 (5000) - PB1 (2000) - RCP1 (4000) + Inv2 (3000) + PAY1 (1000) = 4500 Dr
    expect(res.closingBalance).toBe(4500);
    expect(res.closingType).toBe('Dr');
    expect(res.entries.length).toBe(6); // 1 opening + 5 transactions
  });

  it('accumulates prior transactions into period opening balance when fromDate is applied', () => {
    // When filtering from 2026-02-01:
    // Prior transactions:
    // Initial: +1500
    // 2026-01-10 Inv1: +5000 Dr
    // 2026-01-15 PB1: -2000 Cr
    // 2026-01-20 RCP1: -4000 Cr
    // Period Opening Balance = 1500 + 5000 - 2000 - 4000 = +500 Dr
    const res = computePartyLedger('Acme Traders', {
      invoices: mockInvoices,
      purchaseBills: mockPurchaseBills,
      payments: mockPayments,
      customers: mockCustomers,
      fromDate: '2026-02-01',
      toDate: '2026-02-28',
    });

    expect(res.openingBalance).toBe(500);
    const openingEntry = res.entries.find((e) => e.vchType === 'Opening Balance');
    expect(openingEntry).toBeDefined();
    expect(openingEntry.debit).toBe(500);
    expect(openingEntry.date).toBe('2026-02-01');

    // Only Feb vouchers should be in visible transactions (Inv2 & Pay2)
    const visibleTx = res.entries.filter((e) => e.vchType !== 'Opening Balance');
    expect(visibleTx.length).toBe(2);
    expect(visibleTx.map((t) => t.vchNo)).toEqual(['INV-2026-002', 'PAY-2026-0001']);

    // Closing = 500 + 3000 (Inv2) + 1000 (Pay2) = 4500 Dr
    expect(res.closingBalance).toBe(4500);
    expect(res.closingType).toBe('Dr');
  });

  it('tracks inventory movements accurately with inward and outward flow', () => {
    const mockStock = [{ id: 's1', name: 'Steel Brackets', stock: 50, rate: 100 }];
    const movement = computeStockMovement('Steel Brackets', {
      invoices: mockInvoices,
      purchaseBills: mockPurchaseBills,
      stockItems: mockStock,
    });

    expect(movement.totalInward).toBe(20); // From pb1
    expect(movement.totalOutward).toBe(10); // From inv1
    expect(movement.movements.length).toBe(2);
  });

  it('normalizes stock items with defaults for rate, stock, and uppercase unit', () => {
    const raw = { name: '  Industrial Valve  ', salesPrice: '450.50', stock: '25' };
    const normalized = normalizeStockItem(raw);
    expect(normalized.name).toBe('Industrial Valve');
    expect(normalized.rate).toBe(450.5);
    expect(normalized.stock).toBe(25);
    expect(normalized.unit).toBe('PCS');
    expect(normalized.gst).toBe(18);
  });

  it('normalizes parties and parses Dr/Cr opening balance strings', () => {
    const rawDebtor = { name: 'Beta Corp', openingBalance: '5000.50 Dr', groupName: 'Sundry Debtors' };
    const normDebtor = normalizeParty(rawDebtor);
    expect(normDebtor.type).toBe('Customer');
    expect(normDebtor.openingBalance).toBe(5000.5);

    const rawCreditor = { name: 'Gamma Ltd', openingBalance: '2500 Cr', group: 'Creditors' };
    const normCreditor = normalizeParty(rawCreditor);
    expect(normCreditor.type).toBe('Vendor');
    expect(normCreditor.openingBalance).toBe(-2500);
  });

  it('finds party and stock items fast with case insensitivity and whitespace tolerance', () => {
    const c = findCustomerFast('  aCmE TrAdErS  ', mockCustomers);
    expect(c).toBeDefined();
    expect(c.id).toBe('c1');

    const s = findStockItemFast('  copper pipes  ', [
      { id: 's2', name: 'Copper Pipes', stock: 15 },
    ]);
    expect(s).toBeDefined();
    expect(s.stock).toBe(15);
  });
});

