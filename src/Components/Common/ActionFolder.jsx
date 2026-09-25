import { useState, useRef, useEffect } from 'react';

/**
 * ActionFolder Component
 * 
 * Collapses multiple action buttons (Preview, Edit, PDF, Share, Delete) into a
 * compact, elegant dropdown pill / folder menu to save interface space across
 * tables and lists.
 */
export default function ActionFolder({
  actions = [],
  primaryAction = null,
  label = 'Actions',
  icon = '📁',
  size = 'sm',
  align = 'end',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleToggle = (e) => {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  };

  return (
    <div
      ref={containerRef}
      className="position-relative d-inline-block text-start"
      style={{ verticalAlign: 'middle' }}
      onClick={(e) => e.stopPropagation()}
    >
      {primaryAction ? (
        <div className="btn-group btn-group-sm shadow-xs rounded-2">
          {/* Quick 1-Click Primary Action (e.g. Preview) */}
          <button
            type="button"
            className="btn btn-outline-primary py-1 px-2 fw-semibold d-inline-flex align-items-center gap-1"
            title={primaryAction.title || primaryAction.label}
            onClick={(e) => {
              e.stopPropagation();
              primaryAction.onClick();
            }}
          >
            <span>{primaryAction.icon || '👁️'}</span>
            <span style={{ fontSize: '11.5px' }}>{primaryAction.label || 'Preview'}</span>
          </button>

          {/* Folder Toggle Arrow */}
          <button
            type="button"
            className={`btn btn-outline-primary py-1 px-1.5 dropdown-toggle dropdown-toggle-split ${
              isOpen ? 'active bg-primary text-white' : ''
            }`}
            aria-expanded={isOpen}
            title="More actions"
            onClick={handleToggle}
          >
            <span className="visually-hidden">Toggle Actions Folder</span>
          </button>
        </div>
      ) : (
        /* Standalone Action Folder Pill Button */
        <button
          type="button"
          className={`btn btn-${size === 'sm' ? 'sm' : ''} btn-outline-secondary py-1 px-2 shadow-xs d-inline-flex align-items-center gap-1.5 rounded-2 ${
            isOpen ? 'active bg-dark text-white border-dark' : 'bg-white'
          }`}
          onClick={handleToggle}
          title="Open actions menu"
          style={{ fontSize: '11.5px', fontWeight: 600 }}
        >
          <span>{icon}</span>
          <span>{label}</span>
          <span style={{ fontSize: '9px' }}>{isOpen ? '▲' : '▼'}</span>
        </button>
      )}

      {/* Floating Action Menu */}
      {isOpen && (
        <div
          className={`dropdown-menu show shadow-lg border-0 rounded-3 p-1 position-absolute ${
            align === 'end' ? 'end-0' : 'start-0'
          }`}
          style={{
            zIndex: 1060,
            minWidth: '160px',
            top: 'calc(100% + 4px)',
            background: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(226, 232, 240, 0.9)',
            boxShadow: '0 12px 28px -6px rgba(15, 23, 42, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          }}
        >
          {actions.map((act, idx) => {
            if (!act) return null;
            if (act.divider) {
              return <hr key={`div-${idx}`} className="dropdown-divider my-1 opacity-25" />;
            }

            const isDanger = act.variant === 'danger';
            const isPrimary = act.variant === 'primary';
            const isSuccess = act.variant === 'success';

            return (
              <button
                key={act.label || idx}
                type="button"
                className={`dropdown-item d-flex align-items-center gap-2 py-1.5 px-2.5 rounded-2 small ${
                  isDanger
                    ? 'text-danger'
                    : isSuccess
                    ? 'text-success'
                    : isPrimary
                    ? 'text-primary fw-semibold'
                    : 'text-dark'
                }`}
                disabled={act.disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  act.onClick();
                }}
                title={act.title || act.label}
                style={{ fontSize: '12px' }}
              >
                {act.icon && <span style={{ width: '16px', textAlign: 'center' }}>{act.icon}</span>}
                <span className="flex-grow-1">{act.label}</span>
                {act.badge && (
                  <span className="badge bg-light text-muted border" style={{ fontSize: '9px' }}>
                    {act.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
