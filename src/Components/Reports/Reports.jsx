import { useState, useMemo } from 'react';
import { exportToExcel, exportToCSV, exportToGSTR1JSON } from '../../services/exportReports.js';

function Reports({ invoices = [], company = {}, onBack }) {
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'register'

  // Available months from invoice records
  const availableMonths = useMemo(() => {
    const monthsSet = new Set();
    invoices.forEach((inv) => {
      if (inv.invoiceDate) {
        monthsSet.add(inv.invoiceDate.slice(0, 7)); // YYYY-MM
      }
    });
    return Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
  }, [invoices]);

  // Filtered invoices by selected month
  const filteredInvoices = useMemo(() => {
    if (selectedMonth === 'all') return invoices;
    return invoices.filter((inv) => (inv.invoiceDate || '').startsWith(selectedMonth));
  }, [invoices, selectedMonth]);

  const reportData = useMemo(() => {
    const gstSlabs = {
      0: { taxable: 0, tax: 0, count: 0 },
      5: { taxable: 0, tax: 0, count: 0 },
      12: { taxable: 0, tax: 0, count: 0 },
      18: { taxable: 0, tax: 0, count: 0 },
      28: { taxable: 0, tax: 0, count: 0 },
      other: { taxable: 0, tax: 0, count: 0 },
    };

    let grandTaxable = 0;
    let grandTax = 0;
    let grandTotal = 0;

    const monthlyMap = {};
    const customerMap = {};

    filteredInvoices.forEach((inv) => {
      const invTotal = inv.totals?.total || 0;
      const invTax = inv.totals?.totalGst || 0;
      const invTaxable = inv.totals?.subtotal || 0;

      grandTotal += invTotal;
      grandTax += invTax;
      grandTaxable += invTaxable;

      // Slabs breakdown from items
      if (Array.isArray(inv.items)) {
        inv.items.forEach((item) => {
          const qty = Number(item.quantity ?? item.itemQty ?? 1);
          const rate = Number(item.rate ?? item.itemRate ?? item.price ?? 0);
          const gstRate = Number(item.gstPercent ?? item.gst ?? 0);

          const itemTaxable = qty * rate;
          const itemTax = (itemTaxable * gstRate) / 100;

          if (gstSlabs[gstRate] !== undefined) {
            gstSlabs[gstRate].taxable += itemTaxable;
            gstSlabs[gstRate].tax += itemTax;
            gstSlabs[gstRate].count += 1;
          } else {
            gstSlabs.other.taxable += itemTaxable;
            gstSlabs.other.tax += itemTax;
            gstSlabs.other.count += 1;
          }
        });
      }

      // Monthly aggregation
      const dateStr = inv.invoiceDate || 'Unknown';
      const monthKey = dateStr.slice(0, 7); // YYYY-MM
      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = { month: monthKey, count: 0, taxable: 0, tax: 0, total: 0 };
      }
      monthlyMap[monthKey].count += 1;
      monthlyMap[monthKey].taxable += invTaxable;
      monthlyMap[monthKey].tax += invTax;
      monthlyMap[monthKey].total += invTotal;

      // Customer aggregation
      const custName = inv.customerName?.trim() || 'Walk-in Customer';
      if (!customerMap[custName]) {
        customerMap[custName] = { name: custName, count: 0, total: 0, phone: inv.customerPhone || '' };
      }
      customerMap[custName].count += 1;
      customerMap[custName].total += invTotal;
    });

    const monthlyList = Object.values(monthlyMap).sort((a, b) => b.month.localeCompare(a.month));
    const customerList = Object.values(customerMap).sort((a, b) => b.total - a.total).slice(0, 5);

    return {
      gstSlabs,
      grandTaxable,
      grandTax,
      grandTotal,
      monthlyList,
      customerList,
      totalInvoices: filteredInvoices.length,
    };
  }, [filteredInvoices]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="py-3 print-container">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4 no-print">
        <div>
          <h1 className="h3 fw-bold mb-1">📊 GSTR-1 & Sales Reports</h1>
          <p className="text-muted mb-0">
            {company?.name ? `${company.name} — ` : ''}Generate monthly sales data, slab-wise tax breakdown, and export for GSTR-1 filing.
          </p>
        </div>
        {onBack && (
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onBack}>
            ← Back to Dashboard
          </button>
        )}
      </div>

      {/* Filter & Export Bar */}
      <div className="card shadow-sm border-0 mb-4 bg-white no-print">
        <div className="card-body p-3 d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3">
          {/* Month Selector */}
          <div className="d-flex align-items-center gap-2">
            <span className="fw-semibold text-muted text-nowrap">📅 Period:</span>
            <select
              className="form-select form-select-sm"
              style={{ minWidth: '180px' }}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="all">All Invoices ({invoices.length})</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            {selectedMonth !== 'all' && (
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => setSelectedMonth('all')}
              >
                Reset
              </button>
            )}
          </div>

          {/* Export Action Buttons */}
          <div className="d-flex gap-2 flex-wrap">
            <button
              type="button"
              className="btn btn-success btn-sm fw-semibold shadow-sm d-flex align-items-center gap-1"
              title="Download Excel Spreadsheet with formatted columns"
              onClick={() => exportToExcel(invoices, company, selectedMonth)}
              disabled={filteredInvoices.length === 0}
            >
              📊 Export Excel (.xls)
            </button>
            <button
              type="button"
              className="btn btn-outline-success btn-sm fw-semibold d-flex align-items-center gap-1"
              title="Download standard CSV for Excel or GST tools"
              onClick={() => exportToCSV(invoices, company, selectedMonth)}
              disabled={filteredInvoices.length === 0}
            >
              📑 Export CSV
            </button>
            <button
              type="button"
              className="btn btn-outline-primary btn-sm fw-semibold d-flex align-items-center gap-1"
              title="Download official GSTR-1 offline returns JSON"
              onClick={() => exportToGSTR1JSON(invoices, company, selectedMonth)}
              disabled={filteredInvoices.length === 0}
            >
              📦 GSTR-1 JSON
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm fw-semibold shadow-sm d-flex align-items-center gap-1"
              title="Print formatted sales report"
              onClick={handlePrint}
              disabled={filteredInvoices.length === 0}
            >
              🖨️ Print Report
            </button>
          </div>
        </div>
      </div>

      {/* Printable Report Header */}
      <div className="print-header d-none d-print-block mb-4">
        <h2 className="h4 fw-bold mb-1">{company.name || 'Company Sales Report'}</h2>
        <div className="small text-muted">
          GSTIN: {company.gstin || 'N/A'} | Period:{' '}
          {selectedMonth === 'all' ? 'All Records' : selectedMonth} | Date:{' '}
          {new Date().toLocaleDateString('en-IN')}
        </div>
        <hr className="my-2" />
      </div>

      {/* Summary Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card shadow-sm border-0 p-3 bg-light">
            <div className="text-muted small fw-bold text-uppercase">Taxable Value</div>
            <div className="h3 fw-bold text-primary mb-0">
              ₹{reportData.grandTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <small className="text-muted">Net sales excluding GST</small>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card shadow-sm border-0 p-3 bg-light">
            <div className="text-muted small fw-bold text-uppercase">Output GST Tax</div>
            <div className="h3 fw-bold text-success mb-0">
              ₹{reportData.grandTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <small className="text-muted">CGST + SGST combined</small>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card shadow-sm border-0 p-3 bg-light">
            <div className="text-muted small fw-bold text-uppercase">Gross Revenue</div>
            <div className="h3 fw-bold text-dark mb-0">
              ₹{reportData.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <small className="text-muted">From {reportData.totalInvoices} invoice(s)</small>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <ul className="nav nav-tabs mb-3 no-print">
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${activeTab === 'summary' ? 'active fw-bold' : ''}`}
            onClick={() => setActiveTab('summary')}
          >
            🏷️ GSTR-1 Slabs & Monthly Summary
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${activeTab === 'register' ? 'active fw-bold' : ''}`}
            onClick={() => setActiveTab('register')}
          >
            📋 Detailed Invoices Register ({filteredInvoices.length})
          </button>
        </li>
      </ul>

      {/* TAB 1: GSTR-1 Slabs & Monthly Summary */}
      {activeTab === 'summary' && (
        <>
          {/* GST Slabs Breakdown */}
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
              <h2 className="h5 mb-0 fw-bold">🏷️ GST Rate-wise Breakdown (GSTR-1 Table 4 & Table 7)</h2>
              <span className="badge bg-primary text-white">
                {selectedMonth === 'all' ? 'All Invoices' : `Month: ${selectedMonth}`}
              </span>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-bordered table-hover mb-0 align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>GST Rate Slab</th>
                      <th className="text-center">Items Sold</th>
                      <th className="text-end">Taxable Amount</th>
                      <th className="text-end">CGST (₹)</th>
                      <th className="text-end">SGST (₹)</th>
                      <th className="text-end">Total GST (₹)</th>
                      <th className="text-end">Gross Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[0, 5, 12, 18, 28].map((rate) => {
                      const data = reportData.gstSlabs[rate];
                      const cgst = data.tax / 2;
                      const sgst = data.tax / 2;
                      const total = data.taxable + data.tax;

                      return (
                        <tr key={rate}>
                          <td>
                            <span className="badge bg-secondary me-2">{rate}% GST</span>
                            {rate === 0 && <small className="text-muted">Exempt / Nil Rated</small>}
                            {rate === 18 && <small className="text-muted">Standard Rate</small>}
                          </td>
                          <td className="text-center">{data.count}</td>
                          <td className="text-end">₹{data.taxable.toFixed(2)}</td>
                          <td className="text-end text-muted">₹{cgst.toFixed(2)}</td>
                          <td className="text-end text-muted">₹{sgst.toFixed(2)}</td>
                          <td className="text-end fw-semibold text-success">₹{data.tax.toFixed(2)}</td>
                          <td className="text-end fw-bold">₹{total.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="table-dark">
                    <tr>
                      <th>Total</th>
                      <th className="text-center">
                        {Object.values(reportData.gstSlabs).reduce((acc, curr) => acc + curr.count, 0)}
                      </th>
                      <th className="text-end">₹{reportData.grandTaxable.toFixed(2)}</th>
                      <th className="text-end">₹{(reportData.grandTax / 2).toFixed(2)}</th>
                      <th className="text-end">₹{(reportData.grandTax / 2).toFixed(2)}</th>
                      <th className="text-end">₹{reportData.grandTax.toFixed(2)}</th>
                      <th className="text-end">₹{reportData.grandTotal.toFixed(2)}</th>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* Monthly & Top Clients Grid */}
          <div className="row g-4">
            <div className="col-lg-7">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-header bg-white py-3">
                  <h2 className="h5 mb-0 fw-bold">📅 Monthly Sales Summary</h2>
                </div>
                <div className="card-body p-0">
                  {reportData.monthlyList.length === 0 ? (
                    <div className="text-center py-4 text-muted">No monthly records in selected period.</div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover mb-0 align-middle">
                        <thead className="table-light">
                          <tr>
                            <th>Month</th>
                            <th className="text-center">Invoices</th>
                            <th className="text-end">Taxable</th>
                            <th className="text-end">GST</th>
                            <th className="text-end">Total Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.monthlyList.map((m) => (
                            <tr key={m.month}>
                              <td className="fw-semibold">{m.month}</td>
                              <td className="text-center">{m.count}</td>
                              <td className="text-end">₹{m.taxable.toFixed(2)}</td>
                              <td className="text-end text-success">₹{m.tax.toFixed(2)}</td>
                              <td className="text-end fw-bold">₹{m.total.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="col-lg-5">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-header bg-white py-3">
                  <h2 className="h5 mb-0 fw-bold">👥 Top Customers by Revenue</h2>
                </div>
                <div className="card-body p-0">
                  {reportData.customerList.length === 0 ? (
                    <div className="text-center py-4 text-muted">No customer data yet.</div>
                  ) : (
                    <ul className="list-group list-group-flush">
                      {reportData.customerList.map((c, index) => (
                        <li key={c.name} className="list-group-item d-flex justify-content-between align-items-center py-3">
                          <div>
                            <div className="fw-bold">
                              {index + 1}. {c.name}
                            </div>
                            <small className="text-muted">{c.count} {c.count === 1 ? 'invoice' : 'invoices'}</small>
                          </div>
                          <span className="fw-bold text-primary fs-6">
                            ₹{c.total.toFixed(2)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: Detailed Invoices Register */}
      {activeTab === 'register' && (
        <div className="card shadow-sm border-0 mb-4">
          <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
            <h2 className="h5 mb-0 fw-bold">📋 Detailed Sales Invoices Register</h2>
            <small className="text-muted">Showing {filteredInvoices.length} invoice(s)</small>
          </div>
          <div className="card-body p-0">
            {filteredInvoices.length === 0 ? (
              <div className="text-center py-5 text-muted">No invoices found for selected period.</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover table-bordered mb-0 align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Invoice No &amp; Mode</th>
                      <th>Date</th>
                      <th>Customer Name</th>
                      <th>Phone</th>
                      <th className="text-center">Items</th>
                      <th className="text-end">Taxable (₹)</th>
                      <th className="text-end">GST (₹)</th>
                      <th className="text-end">Total Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map((inv) => {
                      const isCentral = inv.invoiceType === 'central' || inv.isInterState === true;

                      return (
                        <tr key={inv.id || inv.invoiceNumber}>
                          <td>
                            <div className="d-flex flex-column align-items-start gap-1">
                              <span className="fw-bold text-primary">{inv.invoiceNumber}</span>
                              {isCentral ? (
                                <span className="badge bg-primary-subtle text-primary border" style={{ fontSize: '10px' }}>
                                  🌐 Central (IGST)
                                </span>
                              ) : (
                                <span className="badge bg-success-subtle text-success border" style={{ fontSize: '10px' }}>
                                  📍 Local (CGST+SGST)
                                </span>
                              )}
                            </div>
                          </td>
                          <td>{inv.invoiceDate}</td>
                          <td>
                            <div className="fw-semibold">{inv.customerName}</div>
                            {inv.customerAddress && <small className="text-muted">{inv.customerAddress}</small>}
                          </td>
                          <td>{inv.customerPhone || '—'}</td>
                          <td className="text-center">{inv.items?.length || 0}</td>
                          <td className="text-end">₹{(inv.totals?.subtotal || 0).toFixed(2)}</td>
                          <td className="text-end text-success">₹{(inv.totals?.totalGst || 0).toFixed(2)}</td>
                          <td className="text-end fw-bold">₹{(inv.totals?.total || 0).toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Reports;
