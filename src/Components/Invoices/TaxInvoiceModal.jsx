import { useState, useMemo } from 'react';
import downloadPDF, { amountToIndianWords } from '../DownloadInvoice/Invoice.jsx';

function TaxInvoiceModal({ invoice, company, isOpen, onClose }) {
  const [copyType, setCopyType] = useState('Original for Recipient');

  const { processedItems, totalQty, totalTaxableValue, totalCgstAmt, totalSgstAmt, totalIgstAmt, totalGrossAmount, primaryUnit, taxSlabMap } =
    useMemo(() => {
      const rawItems =
        Array.isArray(invoice?.items) && invoice.items.length > 0
          ? invoice.items
          : [
              {
                description: 'Salted Peanut MRP 10',
                hsn: '21069099',
                quantity: 80,
                unit: 'Laddi',
                rate: 101.0,
                gstPercent: 5,
              },
              {
                description: 'Chips Salted MRP 15',
                hsn: '20052000',
                quantity: 36,
                unit: 'Laddi',
                rate: 100.0,
                gstPercent: 5,
              },
            ];

      const primaryUnit = rawItems[0]?.unit || 'PCS';
      const isInterState = invoice?.invoiceType === 'central' || invoice?.isInterState || false;

      const itemsList = rawItems.map((item, idx) => {
        const qty = Number(item.quantity ?? item.stock ?? 1) || 1;
        const unit = item.unit || 'PCS';
        const rate = Number(item.rate ?? item.price ?? 0) || 0;
        const gstPct = Number(item.gstPercent ?? item.gst ?? 0) || 0;
        const taxableAmount = qty * rate;

        const halfGstPct = gstPct / 2;
        const totalTax = (taxableAmount * gstPct) / 100;
        const cgstAmt = isInterState ? 0 : totalTax / 2;
        const sgstAmt = isInterState ? 0 : totalTax / 2;
        const igstAmt = isInterState ? totalTax : 0;
        const lineTotal = taxableAmount + totalTax;

        return {
          sn: idx + 1,
          desc: item.description || item.name || 'Product Item',
          hsn: item.hsn || item.hsnCode || '—',
          qty,
          unit,
          rate,
          taxableAmount,
          halfGstPct,
          cgstAmt,
          sgstAmt,
          igstAmt,
          gstPct,
          totalTax,
          isInterState,
          lineTotal,
        };
      });

      const totalQty = itemsList.reduce((sum, it) => sum + it.qty, 0);
      const totalTaxableValue = itemsList.reduce((sum, it) => sum + it.taxableAmount, 0);
      const totalCgstAmt = itemsList.reduce((sum, it) => sum + it.cgstAmt, 0);
      const totalSgstAmt = itemsList.reduce((sum, it) => sum + it.sgstAmt, 0);
      const totalIgstAmt = itemsList.reduce((sum, it) => sum + it.igstAmt, 0);
      const totalGrossAmount = itemsList.reduce((sum, it) => sum + it.lineTotal, 0);

      const slabs = {};
      itemsList.forEach((it) => {
        const slabKey = `${it.gstPct}%`;
        if (!slabs[slabKey]) {
          slabs[slabKey] = {
            hsn: it.hsn !== '—' ? it.hsn : '2106',
            rate: slabKey,
            taxable: 0,
            cgst: 0,
            sgst: 0,
            igst: 0,
            totalTax: 0,
          };
        }
        slabs[slabKey].taxable += it.taxableAmount;
        slabs[slabKey].cgst += it.cgstAmt;
        slabs[slabKey].sgst += it.sgstAmt;
        slabs[slabKey].igst += it.igstAmt;
        slabs[slabKey].totalTax += it.totalTax;
      });

      return {
        processedItems: itemsList,
        totalQty,
        totalTaxableValue,
        totalCgstAmt,
        totalSgstAmt,
        totalIgstAmt,
        totalGrossAmount,
        primaryUnit,
        taxSlabMap: slabs,
      };
    }, [invoice]);

  if (!isOpen || !invoice) return null;

  const isInterState = invoice.invoiceType === 'central' || invoice.isInterState || false;

  // Defaults based on standard format (Clean, user-configured only)
  const compName = (company?.name || '').trim();
  const compAddress = (company?.address || '').trim();
  const compGstin = (company?.gstin || '').trim();
  const compPan = (company?.pan || (compGstin.length >= 12 ? compGstin.slice(2, 12) : '')).trim();
  const compFssai = (company?.fssai || '').trim();
  const compPhone = (company?.phone || '').trim();
  const compEmail = (company?.email || '').trim();
  const compState = (company?.state || '').trim();

  const bankName = (company?.bankName || '').trim();
  const accountNo = (company?.accountNumber || '').trim();
  const ifscCode = (company?.ifsc || '').trim();
  const branchName = (company?.branch || '').trim();

  const formattedDate = invoice.invoiceDate
    ? new Date(invoice.invoiceDate).toLocaleDateString('en-GB').replace(/\//g, '-')
    : new Date().toLocaleDateString('en-GB').replace(/\//g, '-');

  const amountWords = amountToIndianWords(totalGrossAmount);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="modal show d-block"
      tabIndex="-1"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1400, overflowY: 'auto' }}
    >
      <div className="modal-dialog modal-xl modal-dialog-scrollable">
        <div className="modal-content shadow-lg border-0">
          {/* Action Header */}
          <div className="modal-header bg-dark text-white py-2 px-3 d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-3">
              <h2 className="modal-title h6 mb-0 text-white">
                📄 Tax Invoice Preview: {invoice.invoiceNumber || 'INV-1092'}
              </h2>
              <select
                className="form-select form-select-sm bg-secondary text-white border-0"
                style={{ width: '220px' }}
                value={copyType}
                onChange={(e) => setCopyType(e.target.value)}
              >
                <option value="Original for Recipient">Original for Recipient</option>
                <option value="Duplicate for Transporter">Duplicate for Transporter</option>
                <option value="Triplicate for Supplier">Triplicate for Supplier</option>
              </select>
            </div>
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-sm btn-outline-light"
                onClick={handlePrint}
              >
                🖨️ Print
              </button>
              <button
                type="button"
                className="btn btn-sm btn-success fw-bold px-3"
                onClick={() => downloadPDF(invoice, company, copyType)}
              >
                📥 Download PDF
              </button>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={onClose}
              />
            </div>
          </div>

          {/* Invoice Body */}
          <div className="modal-body p-2 p-md-4 bg-light overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div
              className="bg-white p-3 p-md-4 text-dark shadow-sm border border-dark rounded-1 mx-auto"
              style={{
                width: '100%',
                maxWidth: '900px',
                minWidth: '600px',
                fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
                fontSize: '12px',
                lineHeight: '1.35',
              }}
            >
              {/* Copy Tag Banner */}
              <div className="d-flex justify-content-between align-items-center pb-2 border-bottom border-dark mb-2">
                <span className="badge bg-primary-subtle text-primary border border-primary px-2 py-1 small">
                  {isInterState ? '🌐 INTER-STATE (CENTRAL IGST INVOICE)' : '📍 INTRA-STATE (LOCAL CGST + SGST INVOICE)'}
                </span>
                <span className="badge bg-light text-dark border px-3 py-1 fw-bold">
                  {copyType.toUpperCase()}
                </span>
              </div>

              {/* Header Box */}
              <div className="d-flex align-items-center pb-3 border-bottom border-dark position-relative">
                {/* Logo Box */}
                {company?.logo ? (
                  <div
                    className="border border-primary rounded p-1 text-center bg-white shadow-xs d-flex align-items-center justify-content-center"
                    style={{ width: '100px', minWidth: '100px', height: '65px' }}
                  >
                    <img
                      src={company.logo}
                      alt="Company Logo"
                      style={{ maxHeight: '55px', maxWidth: '90px', objectFit: 'contain' }}
                    />
                  </div>
                ) : (
                  <div
                    className="border border-primary rounded p-2 text-center bg-primary-subtle"
                    style={{ width: '100px', minWidth: '100px' }}
                  >
                    <div className="fw-bolder text-primary" style={{ fontSize: '26px', lineHeight: '1' }}>
                      {compName ? compName.slice(0, 2).toUpperCase() : 'GST'}
                    </div>
                    <div className="fw-bold text-danger" style={{ fontSize: '9px', letterSpacing: '0.5px' }}>
                      {compName || 'COMPANY NAME'}
                    </div>
                  </div>
                )}

                {/* Company Titles */}
                <div className="flex-grow-1 text-center px-3">
                  <div className="fw-bolder text-uppercase tracking-wider fs-6 text-dark">
                    TAX INVOICE
                  </div>
                  <div className="fw-bold fs-4 text-uppercase text-primary">{compName || 'TAX INVOICE'}</div>
                  {compAddress && (
                    <div className="text-secondary small" style={{ fontSize: '11px' }}>
                      {compAddress}
                    </div>
                  )}
                  {(compGstin || compPan || compState) && (
                    <div className="small fw-bold text-dark mt-1" style={{ fontSize: '11.5px' }}>
                      {[compGstin && `GSTIN: ${compGstin}`, compPan && `PAN: ${compPan}`, compState && `State: ${compState}`].filter(Boolean).join(' | ')}
                    </div>
                  )}
                  {(compFssai || compPhone || compEmail) && (
                    <div className="small text-muted" style={{ fontSize: '11px' }}>
                      {[compFssai && `FSSAI Lic. No.: ${compFssai}`, compPhone && `Phone: ${compPhone}`, compEmail && `Email: ${compEmail}`].filter(Boolean).join(' | ')}
                    </div>
                  )}
                </div>
              </div>

              {/* Metadata Row */}
              <div className="row g-0 border-bottom border-dark py-2" style={{ fontSize: '12px' }}>
                <div className="col-6 border-end border-dark px-3">
                  <div className="d-flex mb-1">
                    <span className="text-muted" style={{ width: '110px' }}>Invoice No.</span>
                    <span className="fw-bold text-dark">: {invoice.invoiceNumber || '1092/2026-27'}</span>
                  </div>
                  <div className="d-flex">
                    <span className="text-muted" style={{ width: '110px' }}>Invoice Date</span>
                    <span className="fw-bold text-dark">: {formattedDate}</span>
                  </div>
                </div>
                <div className="col-6 px-3">
                  <div className="d-flex mb-1">
                    <span className="text-muted" style={{ width: '120px' }}>Place of Supply</span>
                    <span className="fw-bold text-dark">: {invoice.placeOfSupply || compState}</span>
                  </div>
                  <div className="d-flex">
                    <span className="text-muted" style={{ width: '120px' }}>Reverse Charge</span>
                    <span className="fw-bold text-dark">: {invoice.reverseCharge || 'No (N)'}</span>
                  </div>
                </div>
              </div>

              {/* Billed To / Shipped To Row */}
              <div className="row g-0 border-bottom border-dark py-3" style={{ fontSize: '12px' }}>
                {/* Billed To */}
                <div className="col-6 border-end border-dark px-3">
                  <div className="text-primary small fw-bold mb-1">DETAILS OF RECEIVER | BILLED TO :</div>
                  <div className="fw-bold fs-6 text-dark">{invoice.customerName || 'GULATI CATERERS'}</div>
                  <div className="text-secondary small mb-2" style={{ whiteSpace: 'pre-line' }}>
                    {invoice.customerAddress || 'GT-60, Sector - 70, Noida'}
                  </div>
                  <div className="d-flex small mb-1">
                    <span className="text-muted" style={{ width: '110px' }}>Party Mobile</span>
                    <span>: {invoice.customerPhone || '7217706305'}</span>
                  </div>
                  <div className="d-flex small mb-1">
                    <span className="text-muted" style={{ width: '110px' }}>GSTIN / UIN</span>
                    <span className="fw-bold text-dark">: {invoice.customerGstin || '09ABVPG5831F1ZD'}</span>
                  </div>
                  <div className="d-flex small">
                    <span className="text-muted" style={{ width: '110px' }}>State & Code</span>
                    <span>: {invoice.customerState || compState}</span>
                  </div>
                </div>

                {/* Shipped To */}
                <div className="col-6 px-3">
                  <div className="text-primary small fw-bold mb-1">DETAILS OF CONSIGNEE | SHIPPED TO :</div>
                  <div className="fw-bold fs-6 text-dark">
                    {invoice.shipToName || invoice.customerName || 'GULATI CATERERS'}
                  </div>
                  <div className="text-secondary small mb-2" style={{ whiteSpace: 'pre-line' }}>
                    {invoice.shipToAddress || invoice.customerAddress || 'GT-60, Sector - 70, Noida'}
                  </div>
                  <div className="d-flex small mb-1">
                    <span className="text-muted" style={{ width: '110px' }}>Contact No</span>
                    <span>: {invoice.shipToPhone || invoice.customerPhone || '7217706305'}</span>
                  </div>
                  <div className="d-flex small mb-1">
                    <span className="text-muted" style={{ width: '110px' }}>GSTIN / UIN</span>
                    <span className="fw-bold text-dark">: {invoice.shipToGstin || invoice.customerGstin || '09ABVPG5831F1ZD'}</span>
                  </div>
                  <div className="d-flex small">
                    <span className="text-muted" style={{ width: '110px' }}>State & Code</span>
                    <span>: {invoice.shipToState || invoice.customerState || compState}</span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="table-responsive">
                <table className="table table-bordered border-dark table-sm mb-0 align-middle text-center" style={{ fontSize: '11px' }}>
                  <thead className="table-light">
                    {isInterState ? (
                      <tr>
                        <th rowSpan="2" className="align-middle" style={{ width: '35px' }}>#</th>
                        <th rowSpan="2" className="align-middle text-start">Description of Goods / Services</th>
                        <th rowSpan="2" className="align-middle" style={{ width: '80px' }}>HSN/SAC</th>
                        <th rowSpan="2" className="align-middle text-end" style={{ width: '50px' }}>Qty</th>
                        <th rowSpan="2" className="align-middle" style={{ width: '55px' }}>Unit</th>
                        <th rowSpan="2" className="align-middle text-end" style={{ width: '70px' }}>Rate (₹)</th>
                        <th rowSpan="2" className="align-middle text-end" style={{ width: '85px' }}>Taxable (₹)</th>
                        <th colSpan="2">IGST (Integrated Tax)</th>
                        <th rowSpan="2" className="align-middle text-end" style={{ width: '95px' }}>Total (₹)</th>
                      </tr>
                    ) : (
                      <tr>
                        <th rowSpan="2" className="align-middle" style={{ width: '35px' }}>#</th>
                        <th rowSpan="2" className="align-middle text-start">Description of Goods / Services</th>
                        <th rowSpan="2" className="align-middle" style={{ width: '75px' }}>HSN/SAC</th>
                        <th rowSpan="2" className="align-middle text-end" style={{ width: '45px' }}>Qty</th>
                        <th rowSpan="2" className="align-middle" style={{ width: '50px' }}>Unit</th>
                        <th rowSpan="2" className="align-middle text-end" style={{ width: '65px' }}>Rate (₹)</th>
                        <th rowSpan="2" className="align-middle text-end" style={{ width: '75px' }}>Taxable (₹)</th>
                        <th colSpan="2">CGST</th>
                        <th colSpan="2">SGST</th>
                        <th rowSpan="2" className="align-middle text-end" style={{ width: '90px' }}>Total (₹)</th>
                      </tr>
                    )}
                    {isInterState ? (
                      <tr>
                        <th style={{ width: '55px' }}>Rate</th>
                        <th style={{ width: '75px' }} className="text-end">Amount</th>
                      </tr>
                    ) : (
                      <tr>
                        <th style={{ width: '45px' }}>Rate</th>
                        <th style={{ width: '60px' }} className="text-end">Amount</th>
                        <th style={{ width: '45px' }}>Rate</th>
                        <th style={{ width: '60px' }} className="text-end">Amount</th>
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {processedItems.map((it) => (
                      <tr key={it.sn}>
                        <td>{it.sn}</td>
                        <td className="text-start fw-semibold">{it.desc}</td>
                        <td>{it.hsn}</td>
                        <td className="text-end">{it.qty}</td>
                        <td>{it.unit}</td>
                        <td className="text-end">{it.rate.toFixed(2)}</td>
                        <td className="text-end">{it.taxableAmount.toFixed(2)}</td>
                        {isInterState ? (
                          <>
                            <td>{it.gstPct.toFixed(2)}%</td>
                            <td className="text-end">{it.igstAmt.toFixed(2)}</td>
                          </>
                        ) : (
                          <>
                            <td>{it.halfGstPct.toFixed(2)}%</td>
                            <td className="text-end">{it.cgstAmt.toFixed(2)}</td>
                            <td>{it.halfGstPct.toFixed(2)}%</td>
                            <td className="text-end">{it.sgstAmt.toFixed(2)}</td>
                          </>
                        )}
                        <td className="text-end fw-bold">{it.lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                    {/* Grand Total Summary Row */}
                    <tr className="fw-bold table-secondary border-top border-dark">
                      <td colSpan="3" className="text-end">Total :</td>
                      <td colSpan="2" className="text-center">{totalQty} {primaryUnit}</td>
                      <td></td>
                      <td className="text-end">₹{totalTaxableValue.toFixed(2)}</td>
                      {isInterState ? (
                        <>
                          <td></td>
                          <td className="text-end">₹{totalIgstAmt.toFixed(2)}</td>
                        </>
                      ) : (
                        <>
                          <td></td>
                          <td className="text-end">₹{totalCgstAmt.toFixed(2)}</td>
                          <td></td>
                          <td className="text-end">₹{totalSgstAmt.toFixed(2)}</td>
                        </>
                      )}
                      <td className="text-end fw-bold fs-6 text-primary">
                        ₹{totalGrossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Tax Slabs Summary & Financial Totals Box */}
              <div className="row g-3 border-top border-dark pt-3 mt-1">
                {/* Left: GST Statutory Breakdown Table */}
                <div className="col-lg-7 col-12">
                  <div className="fw-bold small text-muted mb-1">GST TAX SLABS STATUTORY SUMMARY</div>
                  <table className="table table-bordered border-dark table-sm mb-2 text-center" style={{ fontSize: '10.5px' }}>
                    <thead className="table-light">
                      {isInterState ? (
                        <tr>
                          <th>HSN/SAC</th>
                          <th>Tax Rate</th>
                          <th className="text-end">Taxable (₹)</th>
                          <th className="text-end">IGST (₹)</th>
                          <th className="text-end">Total Tax (₹)</th>
                        </tr>
                      ) : (
                        <tr>
                          <th>HSN/SAC</th>
                          <th>Tax Rate</th>
                          <th className="text-end">Taxable (₹)</th>
                          <th className="text-end">CGST (₹)</th>
                          <th className="text-end">SGST (₹)</th>
                          <th className="text-end">Total Tax (₹)</th>
                        </tr>
                      )}
                    </thead>
                    <tbody>
                      {Object.values(taxSlabMap).map((s) => (
                        <tr key={s.rate}>
                          <td>{s.hsn}</td>
                          <td>{s.rate}</td>
                          <td className="text-end">{s.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          {isInterState ? (
                            <td className="text-end">{s.igst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          ) : (
                            <>
                              <td className="text-end">{s.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td className="text-end">{s.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </>
                          )}
                          <td className="text-end fw-bold">{s.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Right: Financial Totals Box */}
                <div className="col-lg-5 col-12">
                  <div className="p-3 bg-light rounded border border-dark">
                    <div className="d-flex justify-content-between mb-1 small">
                      <span className="text-muted">Total Taxable Value</span>
                      <span className="fw-semibold">₹{totalTaxableValue.toFixed(2)}</span>
                    </div>
                    {isInterState ? (
                      <div className="d-flex justify-content-between mb-1 small">
                        <span className="text-muted">Add: Integrated Tax (IGST)</span>
                        <span className="fw-semibold">₹{totalIgstAmt.toFixed(2)}</span>
                      </div>
                    ) : (
                      <>
                        <div className="d-flex justify-content-between mb-1 small">
                          <span className="text-muted">Add: Central Tax (CGST)</span>
                          <span className="fw-semibold">₹{totalCgstAmt.toFixed(2)}</span>
                        </div>
                        <div className="d-flex justify-content-between mb-1 small">
                          <span className="text-muted">Add: State Tax (SGST)</span>
                          <span className="fw-semibold">₹{totalSgstAmt.toFixed(2)}</span>
                        </div>
                      </>
                    )}
                    <div className="d-flex justify-content-between pt-2 border-top border-dark mt-2">
                      <span className="fw-bold fs-6">Invoice Total</span>
                      <span className="fw-bold fs-6 text-primary">
                        ₹{totalGrossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Amount in Words Banner */}
              <div className="p-2 bg-light border border-dark rounded-1 my-2 small">
                <strong className="text-muted">Invoice Amount in Words: </strong>
                <span className="fw-bold text-dark">{amountWords}</span>
              </div>

              {/* Bank Details */}
              <div className="p-2 bg-light border border-dark rounded-1 mb-3 small">
                <strong className="text-primary">🏦 Bank &amp; Settlement Details: </strong>
                <span>Bank Name: <strong>{bankName || 'N/A'}</strong> | A/C No: <strong>{accountNo || 'N/A'}</strong> | IFSC: <strong>{ifscCode || 'N/A'}</strong> | Branch: <strong>{branchName || 'N/A'}</strong></span>
              </div>

              {/* Footer Terms & Signatures */}
              <div className="row g-0 border-top border-dark pt-3" style={{ fontSize: '11px' }}>
                <div className="col-6 border-end border-dark pe-3">
                  <div className="fw-bold text-dark mb-1">TERMS &amp; CONDITIONS</div>
                  <ol className="ps-3 mb-0 text-muted" style={{ lineHeight: '1.4' }}>
                    <li>Goods once sold will not be taken back or exchanged.</li>
                    <li>Interest @ 18% p.a. will be charged if payment is delayed beyond credit period.</li>
                    <li>Subject to {compState ? `'${compState}'` : 'local'} Jurisdiction only.</li>
                  </ol>
                </div>
                <div className="col-6 ps-3 d-flex flex-column justify-content-between text-end">
                  <div className="text-start text-muted">Receiver&apos;s Stamp &amp; Signature :</div>
                  <div className="fw-bold fs-6 text-dark">For {compName ? compName.toUpperCase() : 'AUTHORISED SIGNATORY'}</div>
                  <div className="text-muted mt-3">Authorised Signatory</div>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer bg-light py-2">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={handlePrint}
            >
              🖨️ Print
            </button>
            <button
              type="button"
              className="btn btn-success fw-bold px-4"
              onClick={() => downloadPDF(invoice, company, copyType)}
            >
              📥 Download PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TaxInvoiceModal;
