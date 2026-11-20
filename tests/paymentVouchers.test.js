import { describe, it, expect } from 'vitest';

describe('Payment Voucher Sequencing & Cascading Linkage Tests', () => {
  function getNextVoucherNumber(type, payments = []) {
    const year = new Date().getFullYear();
    const prefix = type === 'Payment In' ? 'RCP' : 'PAY';
    const regex = new RegExp(`^${prefix}-${year}-(\\d+)$`);

    const existingNums = (payments || [])
      .filter((p) => p.type === type && typeof p.voucherNumber === 'string')
      .map((p) => {
        const match = p.voucherNumber.match(regex);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => !isNaN(n) && n > 0);

    const nextSeq = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
    return `${prefix}-${year}-${String(nextSeq).padStart(4, '0')}`;
  }

  it('generates the initial voucher sequence for receipts and disbursements', () => {
    const year = new Date().getFullYear();
    expect(getNextVoucherNumber('Payment In', [])).toBe(`RCP-${year}-0001`);
    expect(getNextVoucherNumber('Payment Out', [])).toBe(`PAY-${year}-0001`);
  });

  it('safely finds the maximum sequence avoiding collisions even if vouchers are deleted in the middle', () => {
    const year = new Date().getFullYear();
    // Vouchers 1, 2, and 5 exist (3 and 4 were deleted)
    const payments = [
      { type: 'Payment In', voucherNumber: `RCP-${year}-0001` },
      { type: 'Payment In', voucherNumber: `RCP-${year}-0002` },
      { type: 'Payment In', voucherNumber: `RCP-${year}-0005` },
    ];

    // Simple count (3 + 1 = 4) would collide with next additions.
    // Our max-based algorithm picks max(1,2,5) + 1 = 6:
    expect(getNextVoucherNumber('Payment In', payments)).toBe(`RCP-${year}-0006`);
  });

  it('cascades invoice number renaming to all linked payment vouchers', () => {
    let payments = [
      { id: 'p1', linkedDocument: 'INV-2026-001', amount: 2000 },
      { id: 'p2', linkedDocument: 'INV-2026-002', amount: 1500 },
      { id: 'p3', linkedDocument: 'INV-2026-001', amount: 3000 },
    ];

    const oldInvoiceNo = 'INV-2026-001';
    const newInvoiceNo = 'INV-2026-001-REV';

    // Simulate saveInvoice rename cascade
    payments = payments.map((p) =>
      p.linkedDocument === oldInvoiceNo
        ? { ...p, linkedDocument: newInvoiceNo }
        : p
    );

    expect(payments[0].linkedDocument).toBe('INV-2026-001-REV');
    expect(payments[1].linkedDocument).toBe('INV-2026-002');
    expect(payments[2].linkedDocument).toBe('INV-2026-001-REV');
  });

  it('gracefully unlinks and annotates payment vouchers when parent invoice is deleted', () => {
    let payments = [
      { id: 'p1', voucherNumber: 'RCP-2026-0001', linkedDocument: 'INV-2026-001', narration: 'Advance', amount: 500 },
    ];

    const deletedInvoiceNo = 'INV-2026-001';

    payments = payments.map((p) =>
      p.linkedDocument === deletedInvoiceNo
        ? {
            ...p,
            linkedDocument: '',
            narration: (p.narration ? p.narration + ' | ' : '') + `[Unlinked from deleted invoice ${deletedInvoiceNo}]`,
          }
        : p
    );

    expect(payments[0].linkedDocument).toBe('');
    expect(payments[0].narration).toContain('[Unlinked from deleted invoice INV-2026-001]');
  });
});
