import Logo from '../../assets/Images/Logo.png';
import { getCategoryIcon, getSubSectionIcon, getItemIcon } from '../../constants/navigation.js';

export default function MobileDrawer({
  isOpen,
  onClose,
  currentUser,
  company,
  cloudSyncStatus,
  onOpenCloudSync,
  onInitiateLogout,
  menus,
  expandedGroups,
  onToggleGroup,
  openSubSections,
  onToggleSubSection,
  activePage,
  onSelectOption,
}) {
  if (!isOpen) return null;

  return (
    <>
      <div className="mobile-slide-down-backdrop" onClick={onClose} />
      <nav className="mobile-slide-down-menu" aria-label="Mobile Navigation Menu">
        <div className="mobile-slide-down-header">
          <div className="d-flex align-items-center gap-2">
            <img src={Logo} alt="Tread Logo" style={{ height: '24px' }} />
            <span className="fw-bold fs-6">Navigation Menu</span>
          </div>
          <button
            type="button"
            className="btn-close btn-close-white btn-sm"
            onClick={onClose}
            aria-label="Close menu"
          />
        </div>

        {currentUser ? (
          <div className="p-3 bg-light border-bottom">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="badge bg-primary fs-7">👤 {currentUser.username}</span>
              <button
                type="button"
                className="btn btn-outline-danger btn-sm py-0 px-2 fw-semibold"
                style={{ fontSize: '11px' }}
                onClick={() => {
                  onClose();
                  onInitiateLogout();
                }}
              >
                Logout
              </button>
            </div>
            <div className="d-flex align-items-center justify-content-between">
              <small className="text-muted text-truncate fw-semibold" style={{ maxWidth: '160px' }}>
                🏢 {company?.name || 'Tread'}
              </small>
              <button
                type="button"
                className="btn btn-sm btn-white border py-0 px-2 shadow-xs"
                style={{ fontSize: '10.5px' }}
                onClick={() => {
                  onClose();
                  onOpenCloudSync();
                }}
                title="On-Demand Cloud Sync Controls"
              >
                {cloudSyncStatus === 'syncing' ? '⏳ Syncing' : '☁️ Cloud Sync 🔄'}
              </button>
            </div>
          </div>
        ) : null}

        <div className="mobile-slide-down-body">
          {currentUser ? (
            Object.entries(menus).map(([group, itemsList]) => {
              const isGroupOpen = !!expandedGroups[group];
              return (
                <div key={group} className={`mobile-accordion-card ${isGroupOpen ? 'open' : ''}`}>
                  <button
                    type="button"
                    className="mobile-accordion-toggle"
                    onClick={() => onToggleGroup(group)}
                  >
                    <span className="d-flex align-items-center gap-2">
                      <span>{getCategoryIcon(group)}</span>
                      <span>{group}</span>
                    </span>
                    <span className="mobile-accordion-chevron">{isGroupOpen ? '▲' : '▼'}</span>
                  </button>

                  {isGroupOpen && (
                    <div className="mobile-accordion-content">
                      {Array.isArray(itemsList) ? (
                        itemsList.map((item) => (
                          <button
                            key={item}
                            type="button"
                            className={`mobile-nav-link ${activePage === item ? 'active' : ''}`}
                            onClick={() => {
                              onSelectOption(item);
                              onClose();
                            }}
                          >
                            <span className="text-primary small">{getItemIcon(item)}</span>
                            <span>{item}</span>
                          </button>
                        ))
                      ) : (
                        Object.entries(itemsList).map(([subKey, subOptions]) => {
                          const mobileSubKey = `mobile_${group}_${subKey}`;
                          const isSubOpen = !!openSubSections[mobileSubKey];
                          return (
                            <div key={subKey} className={`mobile-sub-accordion-card ${isSubOpen ? 'open' : ''}`}>
                              <button
                                type="button"
                                className="mobile-sub-accordion-toggle"
                                onClick={() => onToggleSubSection(mobileSubKey)}
                              >
                                <span className="d-flex align-items-center gap-2">
                                  <span>{getSubSectionIcon(subKey)}</span>
                                  <span>{subKey}</span>
                                </span>
                                <span className="small text-muted">{isSubOpen ? '▲' : '▶'}</span>
                              </button>

                              {isSubOpen && (
                                <div className="mobile-sub-content">
                                  {subOptions.map((option) => (
                                    <button
                                      key={option}
                                      type="button"
                                      className={`mobile-sub-nav-link ${activePage === option ? 'active' : ''}`}
                                      onClick={() => {
                                        onSelectOption(option);
                                        onClose();
                                      }}
                                    >
                                      <span className="text-primary small">{getItemIcon(option)}</span>
                                      <span>{option}</span>
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
              );
            })
          ) : (
            <div className="p-3 text-muted small text-center">
              Please sign in to access full tools.
            </div>
          )}
        </div>
      </nav>
    </>
  );
}
