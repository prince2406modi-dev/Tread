import Logo from '../../assets/Images/Logo.png';
import { getSubSectionIcon, getItemIcon } from '../../constants/navigation.js';
import { getNavBadgeForPage } from '../../constants/subscriptionPlans.js';

export default function TopNavbar({
  currentUser,
  subscriptionStatus,
  onOpenRenewalModal,
  menus,
  activeMenu,
  onMenuClick,
  onOptionClick,
  openSubSections,
  onToggleSubSection,
  mobileDrawerOpen,
  onToggleMobileDrawer,
  onBrandClick,
}) {
  return (
    <div id="box">
      <div className="d-flex align-items-center">
        {currentUser && (
          <button
            type="button"
            className="mobile-menu-toggle me-2"
            onClick={onToggleMobileDrawer}
            aria-label="Toggle Navigation Menu"
            title="Open Navigation Menu"
          >
            {mobileDrawerOpen ? '✕' : '☰'}
          </button>
        )}

        <div
          className="brand-nav-title mb-0"
          onClick={onBrandClick}
          title="TREAD — Executive GST Billing Suite"
          style={{ cursor: 'pointer' }}
        >
          <img src={Logo} alt="Tread Logo" className="brand-nav-logo" />
          <span className="brand-nav-gold">TREAD</span>
        </div>
      </div>

      <div className="menus-horizontal">
        {currentUser ? (
          Object.keys(menus).map((menu) => (
            <div className="menu-wrapper" key={menu}>
              <button
                type="button"
                className={`top-button ${activeMenu === menu ? 'active' : ''}`}
                onClick={() => onMenuClick(menu)}
              >
                {menu}
                <span className="arrow">{activeMenu === menu ? '▲' : '▼'}</span>
              </button>

              {/* DROPDOWN MENU */}
              {activeMenu === menu && (
                <div className="dropdown-menu-custom">
                  {Array.isArray(menus[menu]) ? (
                    menus[menu].map((option) => {
                      const tierBadge = getNavBadgeForPage(option, '', menu);
                      return (
                        <button
                          key={option}
                          type="button"
                          className="dropdown-item-custom d-flex align-items-center justify-content-between"
                          onClick={() => onOptionClick(option)}
                        >
                          <span className="d-flex align-items-center gap-2">
                            <span className="item-icon">{getItemIcon(option)}</span>
                            <span>{option}</span>
                          </span>
                          {tierBadge && (
                            <span
                              className="badge ms-2"
                              style={{
                                fontSize: '9px',
                                padding: '2px 5px',
                                background: tierBadge === 'ENT' ? 'rgba(147, 51, 234, 0.15)' : 'rgba(245, 158, 11, 0.18)',
                                color: tierBadge === 'ENT' ? '#c084fc' : '#f59e0b',
                                border: tierBadge === 'ENT' ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid rgba(245, 158, 11, 0.4)',
                                borderRadius: '4px',
                                letterSpacing: '0.04em',
                              }}
                            >
                              {tierBadge}
                            </span>
                          )}
                        </button>
                      );
                    })
                  ) : (
                    Object.entries(menus[menu]).map(([subKey, subOptions]) => {
                      const fullSubKey = `${menu}_${subKey}`;
                      const isSubOpen = !!openSubSections[fullSubKey];
                      const subBadge = getNavBadgeForPage('', subKey, menu);
                      return (
                        <div key={subKey} className="dropdown-section-block">
                          <button
                            type="button"
                            className={`dropdown-section-toggle ${isSubOpen ? 'open' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleSubSection(fullSubKey);
                            }}
                          >
                            <span className="d-flex align-items-center gap-2">
                              <span>{getSubSectionIcon(subKey)}</span>
                              <span>{subKey}</span>
                              {subBadge && (
                                <span
                                  className="badge ms-1"
                                  style={{
                                    fontSize: '8.5px',
                                    padding: '1px 4px',
                                    background: 'rgba(245, 158, 11, 0.15)',
                                    color: '#f59e0b',
                                    border: '1px solid rgba(245, 158, 11, 0.35)',
                                    borderRadius: '3px',
                                  }}
                                >
                                  {subBadge}
                                </span>
                              )}
                            </span>
                            <span className="small text-muted">{isSubOpen ? '▲' : '▶'}</span>
                          </button>

                          {isSubOpen && (
                            <div className="dropdown-sub-items-container">
                              {subOptions.map((option) => (
                                <button
                                  key={option}
                                  type="button"
                                  className="dropdown-sub-item"
                                  onClick={() => onOptionClick(option, subKey, menu)}
                                >
                                  <span className="item-icon">{getItemIcon(option)}</span>
                                  {option}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-white-50 small ps-2">
            🔒 Please sign in with your User ID &amp; Password
          </div>
        )}
      </div>

      {currentUser && (
        <div className="d-none d-md-flex align-items-center gap-2 ms-auto pe-3">
          <button
            type="button"
            className="btn btn-sm py-1 px-2.5 d-flex align-items-center gap-1.5 shadow-sm border-0"
            style={{
              background: 'linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(99,102,241,0.2) 100%)',
              border: '1px solid rgba(245,158,11,0.45)',
              borderRadius: '9px',
              cursor: 'pointer',
            }}
            onClick={onOpenRenewalModal}
            title="Click to view Customer License details and renewal options"
          >
            <span style={{ fontSize: '11px', color: '#fde68a', fontWeight: 700 }}>LICENSE:</span>
            <span
              className="font-monospace fw-bold"
              style={{ fontSize: '12px', color: '#ffffff', letterSpacing: '0.04em' }}
            >
              {subscriptionStatus?.licenseId || currentUser?.licenseId || '91-00-000-000000'}
            </span>
            <span
              className="badge ms-1"
              style={{
                fontSize: '9.5px',
                background: subscriptionStatus?.isExpired ? '#ef4444' : '#10b981',
                color: '#ffffff',
                padding: '2px 6px',
                borderRadius: '6px',
              }}
            >
              {subscriptionStatus?.isAdmin ? 'Master' : subscriptionStatus?.isExpired ? 'Expired' : 'Active'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
