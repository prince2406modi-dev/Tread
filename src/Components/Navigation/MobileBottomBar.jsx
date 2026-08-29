export default function MobileBottomBar({
  currentUser,
  activePage,
  onNavigate,
  onToggleMobileDrawer,
}) {
  if (!currentUser) return null;

  return (
    <nav className="mobile-bottom-bar d-md-none" aria-label="Mobile Bottom Navigation">
      <button
        type="button"
        className={`mobile-bottom-btn ${activePage === 'Dashboard' ? 'active' : ''}`}
        onClick={() => onNavigate('Dashboard')}
      >
        <span className="btn-icon">📊</span>
        <span>Dashboard</span>
      </button>
      <button
        type="button"
        className={`mobile-bottom-btn ${
          activePage === 'Add Sales' || activePage === 'Create Transaction' || activePage === 'Create Invoice'
            ? 'active'
            : ''
        }`}
        onClick={() => onNavigate('Add Sales')}
      >
        <span className="btn-icon">＋</span>
        <span>New Sale</span>
      </button>
      <button
        type="button"
        className={`mobile-bottom-btn ${
          activePage === 'List Sales' || activePage === 'All Transactions' || activePage === 'View Transactions'
            ? 'active'
            : ''
        }`}
        onClick={() => onNavigate('List Sales')}
      >
        <span className="btn-icon">📋</span>
        <span>Sales</span>
      </button>
      <button
        type="button"
        className={`mobile-bottom-btn ${
          activePage === 'List Account' || activePage === 'Customers' || activePage === 'Parties' ? 'active' : ''
        }`}
        onClick={() => onNavigate('List Account')}
      >
        <span className="btn-icon">👥</span>
        <span>Parties</span>
      </button>
      <button
        type="button"
        className="mobile-bottom-btn"
        onClick={onToggleMobileDrawer}
      >
        <span className="btn-icon">☰</span>
        <span>Menu</span>
      </button>
    </nav>
  );
}
