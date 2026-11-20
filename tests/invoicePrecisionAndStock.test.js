import { describe, it, expect } from 'vitest';

describe('Invoice Math Precision & Stock Delta Reconciliation Tests', () => {
  const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

  function calculateTotals(items, isCentral = false) {
    const subtotal = round2(
      items.reduce((sum, item) => {
        const q = Number(item.quantity || 1);
        const r = Number(item.rate || 0);
        return sum + q * r;
      }, 0)
    );

    const totalGst = round2(
      items.reduce((sum, item) => {
        const q = Number(item.quantity || 1);
        const r = Number(item.rate || 0);
        const g = Number(item.gstPercent || 0);
        return sum + (q * r * g) / 100;
      }, 0)
    );

    const cgst = isCentral ? 0 : round2(totalGst / 2);
    const sgst = isCentral ? 0 : round2(totalGst - cgst);
    const igst = isCentral ? totalGst : 0;
    const total = round2(subtotal + totalGst);

    return { subtotal, cgst, sgst, igst, totalGst, total };
  }

  it('eliminates IEEE-754 floating point arithmetic leaks', () => {
    // 3 items with fractional prices: 19.99 * 3 = 59.97, 5% GST = 2.9985 -> round to 3.00, total = 62.97
    const items = [
      { quantity: 3, rate: 19.99, gstPercent: 5 },
      { quantity: 1, rate: 0.1, gstPercent: 0 },
      { quantity: 2, rate: 0.2, gstPercent: 0 },
    ];

    const totals = calculateTotals(items, false);
    expect(totals.subtotal).toBe(60.47);
    expect(totals.totalGst).toBe(3.0);
    expect(totals.total).toBe(63.47);
  });

  it('guarantees that CGST + SGST always precisely equals totalGst without 1-paisa drift', () => {
    // Total GST = 5.15 -> 5.15 / 2 = 2.575. Without balancing, 2.58 + 2.58 = 5.16 (1 paisa leak!)
    const items = [{ quantity: 1, rate: 103, gstPercent: 5 }]; // 103 * 0.05 = 5.15
    const totals = calculateTotals(items, false);

    expect(totals.totalGst).toBe(5.15);
    expect(totals.cgst + totals.sgst).toBe(totals.totalGst);
    expect(totals.cgst).toBe(2.58);
    expect(totals.sgst).toBe(2.57);
  });

  it('reconciles inventory stock delta accurately when modifying invoice quantities', () => {
    let stockCatalog = [
      { id: 'item1', name: 'Alloy Wheels', stock: 100 },
    ];

    const oldItems = [{ description: 'Alloy Wheels', quantity: 20 }];
    const newItems = [{ description: 'Alloy Wheels', quantity: 35 }]; // Increased by 15

    // Simulate saveInvoice delta update
    stockCatalog = stockCatalog.map((stockItem) => {
      const nameLower = stockItem.name.trim().toLowerCase();
      const oldSold = oldItems.reduce(
        (sum, it) => (it.description?.trim().toLowerCase() === nameLower ? sum + (Number(it.quantity) || 1) : sum),
        0
      );
      const newSold = newItems.reduce(
        (sum, it) => (it.description?.trim().toLowerCase() === nameLower ? sum + (Number(it.quantity) || 1) : sum),
        0
      );
      const netDelta = newSold - oldSold;
      if (netDelta !== 0) {
        return {
          ...stockItem,
          stock: Math.max(0, (Number(stockItem.stock) || 0) - netDelta),
        };
      }
      return stockItem;
    });

    // 100 original stock - 15 net extra sold = 85
    expect(stockCatalog[0].stock).toBe(85);

    // Now edit again: reduce quantity to 10 (reducing sold quantity by 25)
    const revisedItems = [{ description: 'Alloy Wheels', quantity: 10 }];
    stockCatalog = stockCatalog.map((stockItem) => {
      const nameLower = stockItem.name.trim().toLowerCase();
      const oldSold = newItems.reduce(
        (sum, it) => (it.description?.trim().toLowerCase() === nameLower ? sum + (Number(it.quantity) || 1) : sum),
        0
      );
      const newSold = revisedItems.reduce(
        (sum, it) => (it.description?.trim().toLowerCase() === nameLower ? sum + (Number(it.quantity) || 1) : sum),
        0
      );
      const netDelta = newSold - oldSold; // 10 - 35 = -25
      return {
        ...stockItem,
        stock: Math.max(0, (Number(stockItem.stock) || 0) - netDelta),
      };
    });

    // 85 - (-25) = 110 (which is 100 original - 10 currently sold)
    expect(stockCatalog[0].stock).toBe(110);
  });

  it('restores entire inventory stock when invoice is deleted', () => {
    let stockCatalog = [{ id: 'item1', name: 'Alloy Wheels', stock: 80 }];
    const invoiceToDelete = {
      id: 'inv1',
      items: [{ description: 'Alloy Wheels', quantity: 20 }],
    };

    stockCatalog = stockCatalog.map((stockItem) => {
      const nameLower = stockItem.name.trim().toLowerCase();
      const restoredQty = invoiceToDelete.items.reduce(
        (sum, it) => (it.description?.trim().toLowerCase() === nameLower ? sum + (Number(it.quantity) || 1) : sum),
        0
      );
      return {
        ...stockItem,
        stock: (Number(stockItem.stock) || 0) + restoredQty,
      };
    });

    expect(stockCatalog[0].stock).toBe(100);
  });

  it('factors negotiated line item discounts into converted invoice rates', () => {
    const salesOrderItem = {
      description: 'Solar Inverter',
      rate: 10000,
      discount: 10, // 10% negotiated discount
      qty: 2,
    };

    const rawRate = Number(salesOrderItem.rate);
    const discountPct = Number(salesOrderItem.discount);
    const effectiveRate = discountPct > 0 ? +(rawRate * (1 - discountPct / 100)).toFixed(2) : rawRate;

    expect(effectiveRate).toBe(9000);
  });
});
