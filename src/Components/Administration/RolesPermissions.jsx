function RolesPermissions({ onBack }) {
  const roles = [
    {
      name: 'Administrator',
      badge: 'bg-danger',
      description: 'Full unrestricted access to all modules, financial reports, user management, and system data.',
      permissions: ['Create / Edit / Delete Invoices', 'Modify Company & GST Details', 'User Management & Access Control', 'Data Backup & Database Restore', 'View Financial & Tax Reports'],
    },
    {
      name: 'Account Manager',
      badge: 'bg-primary',
      description: 'Access to billing operations, customer records, reports, and PDF invoice generation.',
      permissions: ['Create / Edit Invoices', 'View Financial & Tax Reports', 'Download & Share PDFs', 'Edit Customer Information'],
    },
    {
      name: 'Billing Operator / Cashier',
      badge: 'bg-success',
      description: 'Streamlined access dedicated to high-speed billing, item addition, and instant invoice printing.',
      permissions: ['Create & Print Invoices', 'Voice Billing Access', 'Search Saved Invoices', 'Add / Edit Line Items'],
    },
  ];

  return (
    <div className="py-3">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1">Roles & Access Permissions</h1>
          <p className="text-muted mb-0">
            Overview of system user roles and security privilege boundaries in Tread GST Billing.
          </p>
        </div>
        {onBack && (
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onBack}>
            ← Back to Dashboard
          </button>
        )}
      </div>

      <div className="row g-4">
        {roles.map((role) => (
          <div className="col-lg-4" key={role.name}>
            <div className="card shadow-sm border-0 h-100">
              <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                <h2 className="h5 mb-0 fw-bold">{role.name}</h2>
                <span className={`badge ${role.badge}`}>{role.name}</span>
              </div>
              <div className="card-body">
                <p className="text-muted small mb-3">{role.description}</p>
                <h3 className="h6 fw-bold text-dark mb-2">Granted Privileges:</h3>
                <ul className="list-unstyled mb-0">
                  {role.permissions.map((perm) => (
                    <li key={perm} className="mb-2 d-flex align-items-center gap-2 small">
                      <span className="text-success fw-bold">✓</span>
                      <span>{perm}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RolesPermissions;
