import Logo from '../../assets/Images/Logo.png';
import { getSubSectionIcon, getItemIcon } from '../../constants/navigation.js';

export default function TopNavbar({
  currentUser,
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
          title="Tread - Clear Screen / Menu View"
          style={{ cursor: 'pointer' }}
        >
          <img src={Logo} alt="Tread Logo" className="brand-nav-logo" />
          <span>Tread</span>
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
                    menus[menu].map((option) => (
                      <button
                        key={option}
                        type="button"
                        className="dropdown-item-custom"
                        onClick={() => onOptionClick(option)}
                      >
                        <span className="item-icon">{getItemIcon(option)}</span>
                        {option}
                      </button>
                    ))
                  ) : (
                    Object.entries(menus[menu]).map(([subKey, subOptions]) => {
                      const fullSubKey = `${menu}_${subKey}`;
                      const isSubOpen = !!openSubSections[fullSubKey];
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
                                  onClick={() => onOptionClick(option)}
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
    </div>
  );
}
