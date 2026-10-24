import { getRequiredPlanForFeature, FEATURE_PERMISSIONS } from '../../constants/subscriptionPlans.js';

export default function FeatureLockGate({
  featureKey,
  featureTitle,
  currentUser,
  onOpenRenewalModal,
  onBack,
}) {
  const perm = FEATURE_PERMISSIONS[featureKey] || {
    name: featureTitle || 'Exclusive Feature',
    description: 'This feature is exclusive to higher subscription plans.',
  };
  const requiredPlan = getRequiredPlanForFeature(featureKey);
  const userPlanName = currentUser?.subscription?.planName || 'Starter Plan';

  return (
    <div className="container py-5">
      <div
        className="card border-0 rounded-4 shadow-luxury mx-auto overflow-hidden text-center p-4 p-md-5"
        style={{
          maxWidth: '640px',
          background: 'linear-gradient(170deg, #ffffff 0%, #f8fafc 100%)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
        }}
      >
        {/* Top Badge */}
        <div className="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill mx-auto mb-3 shadow-xs" style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.35)' }}>
          <span style={{ fontSize: '14px' }}>👑</span>
          <span className="fw-bold text-uppercase" style={{ fontSize: '11px', letterSpacing: '0.06em', color: '#b45309' }}>
            {requiredPlan.name} Required
          </span>
        </div>

        <div
          className="mx-auto rounded-circle d-flex align-items-center justify-content-center mb-3"
          style={{
            width: '76px',
            height: '76px',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(245, 158, 11, 0.18) 100%)',
            fontSize: '34px',
          }}
        >
          🔒
        </div>

        <h2 className="h4 fw-bold text-dark mb-2" style={{ letterSpacing: '-0.01em' }}>
          {perm.name}
        </h2>

        <p className="text-muted small mb-4 px-md-3" style={{ fontSize: '13.5px', lineHeight: '1.6' }}>
          {perm.description} Your current account is on the <strong>{userPlanName}</strong>. Upgrade to <strong>{requiredPlan.name}</strong> to unlock this module.
        </p>

        {/* Feature Highlights Box */}
        <div
          className="card border-0 rounded-3 p-3 mb-4 text-start text-white shadow-sm mx-auto w-100"
          style={{
            background: 'linear-gradient(135deg, #090d16 0%, #1e1b4b 100%)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
          }}
        >
          <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom border-secondary border-opacity-25">
            <span className="small text-white-50 text-uppercase fw-semibold" style={{ fontSize: '11px', letterSpacing: '0.05em' }}>
              Included in {requiredPlan.name}
            </span>
            <span className="badge bg-warning text-dark fw-bold">
              ₹{requiredPlan.price} {requiredPlan.period}
            </span>
          </div>
          <ul className="list-unstyled mb-0 small text-light" style={{ fontSize: '12.5px' }}>
            {(requiredPlan.features || []).slice(0, 4).map((f, idx) => (
              <li key={idx} className="d-flex align-items-center gap-2 mb-1">
                <span className="text-warning">✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="d-flex flex-wrap justify-content-center gap-2">
          <button
            type="button"
            className="btn btn-primary fw-bold px-4 py-2 d-flex align-items-center gap-2 shadow-sm"
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', borderColor: '#d97706', color: '#1c0a00' }}
            onClick={() => onOpenRenewalModal && onOpenRenewalModal(requiredPlan.id)}
          >
            <span>⚡</span>
            <span>Upgrade to {requiredPlan.name}</span>
          </button>
          {onBack && (
            <button
              type="button"
              className="btn btn-outline-secondary fw-semibold px-3 py-2"
              onClick={onBack}
            >
              ← Back to Dashboard
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
