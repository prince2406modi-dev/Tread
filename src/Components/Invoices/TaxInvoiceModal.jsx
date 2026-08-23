import { useState, useMemo } from 'react';
import downloadPDF, { amountToIndianWords } from '../DownloadInvoice/Invoice.jsx';

function TaxInvoiceModal({ invoice, company, isOpen, onClose }) {
  const [copyType, setCopyType] = useState('Original Copy');

  const { processedItems, totalQty, totalGrossAmount, primaryUnit, taxSlabMap } =
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

      const itemsList = rawItems.map((item, idx) => {
        const qty = Number(item.quantity ?? item.stock ?? 1) || 1;
        const unit = item.unit || 'Laddi';
        const rate = Number(item.rate ?? item.price ?? 0) || 0;
        const gstPct = Number(item.gstPercent ?? item.gst ?? 0) || 0;
        const baseAmount = qty * rate;
        const isInterState = invoice?.isInterState || false;
        const halfGstPct = gstPct / 2;

        const totalTax = (baseAmount * gstPct) / 100;
        const cgstAmt = isInterState ? 0 : totalTax / 2;
        const sgstAmt = isInterState ? 0 : totalTax / 2;
        const igstAmt = isInterState ? totalTax : 0;
        const lineTotal = baseAmount + totalTax;

        return {
          sn: idx + 1,
          desc: item.description || item.name || 'Product',
          hsn: item.hsn || item.hsnCode || '—',
          qty,
          unit,
          rate,
          baseAmount,
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
      const totalGrossAmount = itemsList.reduce((sum, it) => sum + it.lineTotal, 0);

      const slabs = {};
      itemsList.forEach((it) => {
        const slabKey = `${it.gstPct}%`;
        if (!slabs[slabKey]) {
          slabs[slabKey] = {
            rate: slabKey,
            taxable: 0,
            cgst: 0,
            sgst: 0,
            igst: 0,
            totalTax: 0,
          };
        }
        slabs[slabKey].taxable += it.baseAmount;
        slabs[slabKey].cgst += it.cgstAmt;
        slabs[slabKey].sgst += it.sgstAmt;
        slabs[slabKey].igst += it.igstAmt;
        slabs[slabKey].totalTax += it.totalTax;
      });

      return {
        processedItems: itemsList,
        totalQty,
        totalGrossAmount,
        primaryUnit,
        taxSlabMap: slabs,
      };
    }, [invoice]);

  if (!isOpen || !invoice) return null;

  // Defaults based on standard format
  const compName = company?.name || 'M/S PRIYA SALES';
  const compAddress =
    company?.address ||
    'SECTOR 53, VILL-GIJHOR, , NOIDA, Gautambuddha Nagar, Uttar Pradesh, 201301';
  const compGstin = company?.gstin || '09ARGPM9069G1Z9';
  const compFssai = company?.fssai || '12724055000459';
  const compPhone = company?.phone || '9871772123, 9717183141';
  const compState = company?.state || 'Uttar Pradesh (09)';
  const bankName = company?.bankName || 'UNION BANK OF INDIA';
  const accountNo = company?.accountNumber || '135811011000257';
  const ifscCode = company?.ifsc || 'UBIN0813583';

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
                style={{ width: '160px' }}
                value={copyType}
                onChange={(e) => setCopyType(e.target.value)}
              >
                <option value="Original Copy">Original Copy</option>
                <option value="Duplicate Copy">Duplicate Copy</option>
                <option value="Triplicate Copy">Triplicate Copy</option>
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

          {/* Invoice Body (Pixel perfect match with Priya Sales Tax Invoice) */}
          <div className="modal-body p-4 bg-light d-flex justify-content-center">
            <div
              className="bg-white p-4 text-dark shadow-sm border border-dark"
              style={{
                width: '100%',
                maxWidth: '850px',
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '12px',
                lineHeight: '1.3',
              }}
            >
              {/* Copy Tag */}
              <div className="text-end small mb-1">{copyType}</div>

              {/* Header Box */}
              <div className="d-flex align-items-center pb-2 border-bottom border-dark position-relative">
                {/* Logo Box */}
                <div
                  className="border border-primary rounded p-2 text-center"
                  style={{ width: '95px', minWidth: '95px' }}
                >
                  <div className="fw-bold text-primary" style={{ fontSize: '24px', lineHeight: '1' }}>
                    PS
                  </div>
                  <div className="fw-bold text-danger" style={{ fontSize: '9px', letterSpacing: '0.5px' }}>
                    PRIYA SALES
                  </div>
                </div>

                {/* Company Titles */}
                <div className="flex-grow-1 text-center px-2">
                  <div className="fw-bold" style={{ fontSize: '13px' }}>
                    TAX INVOICE
                  </div>
                  <div className="fw-bold fs-5 text-uppercase">{compName}</div>
                  <div className="text-muted small" style={{ fontSize: '10px' }}>
                    {compAddress}
                  </div>
                  <div className="small fw-semibold" style={{ fontSize: '11px' }}>
                    GSTIN : {compGstin}
                  </div>
                  <div className="small text-muted" style={{ fontSize: '10.5px' }}>
                    FSSAI Lic. No. : {compFssai}
                  </div>
                  <div className="small" style={{ fontSize: '11px' }}>
                    Mob. : {compPhone}
                  </div>
                </div>
              </div>

              {/* Metadata Row */}
              <div className="row g-0 border-bottom border-dark py-1" style={{ fontSize: '11.5px' }}>
                <div className="col-6 border-end border-dark px-2">
                  <div className="d-flex">
                    <span style={{ width: '90px' }}>Invoice No.</span>
                    <span className="fw-bold">: {invoice.invoiceNumber || '1092/2026-27'}</span>
                  </div>
                  <div className="d-flex">
                    <span style={{ width: '90px' }}>Dated</span>
                    <span>: {formattedDate}</span>
                  </div>
                </div>
                <div className="col-6 px-2">
                  <div className="d-flex">
                    <span style={{ width: '110px' }}>Place of Supply</span>
                    <span>: {invoice.placeOfSupply || compState}</span>
                  </div>
                  <div className="d-flex">
                    <span style={{ width: '110px' }}>Reverse Charge</span>
                    <span>: {invoice.reverseCharge || 'N'}</span>
                  </div>
                </div>
              </div>

              {/* Billed To / Shipped To Row */}
              <div className="row g-0 border-bottom border-dark py-2" style={{ fontSize: '11.5px' }}>
                {/* Billed To */}
                <div className="col-6 border-end border-dark px-2">
                  <div className="text-muted small mb-1">Billed to :</div>
                  <div className="fw-bold">{invoice.customerName || 'GULATI CATERERS'}</div>
                  <div className="text-secondary small mb-2" style={{ whiteSpace: 'pre-line' }}>
                    {invoice.customerAddress || 'GT-60 , Sector - 70\nNoida'}
                  </div>
                  <div className="d-flex small">
                    <span style={{ width: '110px' }}>Party E-Mail ID</span>
                    <span>: {invoice.customerEmail || ''}</span>
                  </div>
                  <div className="d-flex small">
                    <span style={{ width: '110px' }}>Party Mobile No</span>
                    <span>: {invoice.customerPhone || '7217706305'}</span>
                  </div>
                  <div className="d-flex small">
                    <span style={{ width: '110px' }}>GSTIN / UIN</span>
                    <span className="fw-bold">: {invoice.customerGstin || '09ABVPG5831F1ZD'}</span>
                  </div>
                </div>

                {/* Shipped To */}
                <div className="col-6 px-2">
                  <div className="text-muted small mb-1">Shipped to :</div>
                  <div className="fw-bold">
                    {invoice.shipToName || invoice.customerName || 'GULATI CATERERS'}
                  </div>
                  <div className="text-secondary small mb-2" style={{ whiteSpace: 'pre-line' }}>
                    {invoice.shipToAddress || invoice.customerAddress || 'GT-60 , Sector - 70\nNoida'}
                  </div>
                  <div className="d-flex small">
                    <span style={{ width: '110px' }}>Party E-Mail ID</span>
                    <span>: {invoice.shipToEmail || invoice.customerEmail || ''}</span>
                  </div>
                  <div className="d-flex small">
                    <span style={{ width: '110px' }}>Party Mobile No</span>
                    <span>: {invoice.shipToPhone || invoice.customerPhone || '7217706305'}</span>
                  </div>
                  <div className="d-flex small">
                    <span style={{ width: '110px' }}>GSTIN / UIN</span>
                    <span className="fw-bold">: {invoice.shipToGstin || invoice.customerGstin || '09ABVPG5831F1ZD'}</span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="table-responsive">
                <table className="table table-bordered border-dark table-sm mb-0 align-middle text-center" style={{ fontSize: '11px' }}>
                  <thead>
                    <tr>
                      <th rowSpan="2" className="align-middle" style={{ width: '35px' }}>S.N.</th>
                      <th rowSpan="2" className="align-middle text-start" style={{ width: '230px' }}>Description of Goods</th>
                      <th rowSpan="2" className="align-middle" style={{ width: '75px' }}>HSN/SAC<br />Code</th>
                      <th rowSpan="2" className="align-middle text-end" style={{ width: '45px' }}>Qty.</th>
                      <th rowSpan="2" className="align-middle" style={{ width: '50px' }}>Unit</th>
                      <th rowSpan="2" className="align-middle text-end" style={{ width: '65px' }}>Price</th>
                      <th colSpan="2">CGST</th>
                      <th colSpan="2">SGST</th>
                      <th colSpan="2">IGST</th>
                      <th rowSpan="2" className="align-middle text-end" style={{ width: '90px' }}>Amount(` )</th>
                    </tr>
                    <tr>
                      <th style={{ width: '50px' }}>Rate</th>
                      <th style={{ width: '60px' }} className="text-end">Amount</th>
                      <th style={{ width: '50px' }}>Rate</th>
                      <th style={{ width: '60px' }} className="text-end">Amount</th>
                      <th style={{ width: '50px' }}>Rate</th>
                      <th style={{ width: '60px' }} className="text-end">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processedItems.map((it) => (
                      <tr key={it.sn}>
                        <td>{it.sn}.</td>
                        <td className="text-start fw-semibold">{it.desc}</td>
                        <td>{it.hsn}</td>
                        <td className="text-end">{it.qty}</td>
                        <td>{it.unit}</td>
                        <td className="text-end">{it.rate.toFixed(2)}</td>
                        <td>{it.isInterState ? '' : `${it.halfGstPct.toFixed(2)} %`}</td>
                        <td className="text-end">{it.isInterState ? '' : it.cgstAmt.toFixed(2)}</td>
                        <td>{it.isInterState ? '' : `${it.halfGstPct.toFixed(2)} %`}</td>
                        <td className="text-end">{it.isInterState ? '' : it.sgstAmt.toFixed(2)}</td>
                        <td>{it.isInterState ? `${it.gstPct.toFixed(2)} %` : ''}</td>
                        <td className="text-end">{it.isInterState ? it.igstAmt.toFixed(2) : ''}</td>
                        <td className="text-end fw-bold">{it.lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                    {/* Grand Total Row */}
                    <tr className="fw-bold border-top border-dark">
                      <td colSpan="3" className="text-end">Grand Total</td>
                      <td colSpan="2" className="text-center">{totalQty} {primaryUnit}</td>
                      <td colSpan="7"></td>
                      <td className="text-end fw-bold fs-6">
                        ` {totalGrossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Tax Slab Summary & Words Row */}
              <div className="row g-0 border-top border-dark pt-2 mt-2">
                <div className="col-7">
                  <table className="table table-bordered border-dark table-sm mb-2 text-center" style={{ fontSize: '10.5px' }}>
                    <thead>
                      <tr>
                        <th>Tax Rate</th>
                        <th className="text-end">Taxable Amt.</th>
                        <th className="text-end">CGST Amt.</th>
                        <th className="text-end">SGST Amt.</th>
                        <th className="text-end">Total Tax</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.values(taxSlabMap).map((s) => (
                        <tr key={s.rate}>
                          <td>{s.rate}</td>
                          <td className="text-end">{s.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="text-end">{s.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="text-end">{s.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="text-end fw-bold">{s.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Amount in words */}
                  <div className="fw-bold mb-2" style={{ fontSize: '11.5px' }}>
                    {amountWords}
                  </div>

                  {/* Bank Details */}
                  <div className="small mb-1" style={{ fontSize: '11px' }}>
                    <strong>Bank Details :</strong> BANK NAME : <strong>{bankName}</strong>
                  </div>
                  <div className="small ps-4" style={{ fontSize: '11px' }}>
                    A/C NO. : <strong>{accountNo}</strong> &nbsp;&nbsp;&nbsp;&nbsp; IFSC CODE : <strong>{ifscCode}</strong>
                  </div>
                </div>
              </div>

              {/* Footer Terms & Signatures */}
              <div className="row g-0 border-top border-dark pt-2 mt-3" style={{ fontSize: '10.5px' }}>
                <div className="col-6 border-end border-dark pe-3">
                  <div className="fw-bold text-decoration-underline mb-1">Terms & Conditions</div>
                  <ol className="ps-3 mb-0" style={{ lineHeight: '1.4' }}>
                    <li>Goods once sold will not be taken back.</li>
                    <li>Interest @ 18% p.a. will be charged if the payment is not made with in the stipulated time.</li>
                    <li>Subject to &apos;Uttar Pradesh&apos; Jurisdiction only.</li>
                  </ol>
                </div>
                <div className="col-6 ps-3 d-flex flex-column justify-content-between text-end">
                  <div className="text-start">Receiver&apos;s Signature :</div>
                  <div className="fw-bold">For {compName.toUpperCase()}</div>
                  <div className="text-muted mt-4">Authorised Signatory</div>
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
