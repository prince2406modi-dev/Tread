export default function ImportHistoryTab({
  history = [],
  onOpenAiImport,
}) {
  return (
    <div className="import-history-tab">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2 mb-4 pb-2 border-bottom">
        <div>
          <h4 className="fw-bold mb-1 text-dark" style={{ fontSize: '18px' }}>
            Catalog Import History &amp; Audit Trail
          </h4>
          <span className="small text-muted">
            Detailed chronological logs of all parsed Excel and CSV price lists, validation results, and inventory sync batches.
          </span>
        </div>
        <button
          type="button"
          className="btn btn-primary px-3 py-2 fw-semibold d-flex align-items-center gap-2 shadow-sm"
          onClick={onOpenAiImport}
        >
          <span>📥</span>
          <span>Import New File</span>
        </button>
      </div>

      {history.length === 0 ? (
        <div className="card border-0 rounded-4 shadow-sm p-5 text-center bg-white">
          <span className="fs-1 text-muted d-block mb-2">📜</span>
          <h5 className="fw-bold text-dark">No Import Operations Recorded</h5>
          <p className="small text-muted mb-3">
            Use the AI-Powered Catalog Importer to upload an Excel or CSV file.
          </p>
          <button type="button" className="btn btn-sm btn-primary mx-auto" onClick={onOpenAiImport}>
            Launch Importer
          </button>
        </div>
      ) : (
        <div className="card border-0 rounded-4 shadow-sm bg-white overflow-hidden">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 small">
              <thead className="table-light text-muted fw-semibold">
                <tr>
                  <th>Timestamp</th>
                  <th>File Name</th>
                  <th>Format</th>
                  <th>Target Destination</th>
                  <th>Total Rows</th>
                  <th>Imported</th>
                  <th>Warnings / Errors</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {history.map((hist) => (
                  <tr key={hist.id}>
                    <td className="font-monospace text-muted" style={{ fontSize: '11px' }}>
                      {new Date(hist.timestamp).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="fw-bold text-dark">{hist.fileName}</td>
                    <td>
                      <span className="badge bg-light text-dark border font-monospace">
                        .{hist.fileType}
                      </span>
                    </td>
                    <td>
                      <span className="badge bg-secondary bg-opacity-10 text-dark">
                        {hist.target === 'inventory' ? 'Stock Inventory' : 'Manufacturer Catalog'}
                      </span>
                    </td>
                    <td className="font-monospace fw-semibold">{hist.totalRows}</td>
                    <td className="font-monospace text-success fw-bold">
                      {hist.importedCount}
                    </td>
                    <td className="font-monospace">
                      <span className="text-warning fw-semibold">{hist.warningCount || 0}</span> /{' '}
                      <span className="text-danger fw-semibold">{hist.errorCount || 0}</span>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          hist.status === 'success'
                            ? 'bg-success'
                            : hist.status === 'partial'
                            ? 'bg-warning text-dark'
                            : 'bg-danger'
                        }`}
                      >
                        {hist.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="text-muted" style={{ maxWidth: '240px' }}>
                      {hist.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
