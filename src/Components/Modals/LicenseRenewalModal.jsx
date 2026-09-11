import { useState } from 'react';
import { generateLicenseId, ensureValidLicenseId } from '../../services/authApi';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter Plan',
    price: 499,
    period: '/ year',
    description: 'Up to 500 invoices/year with standard GST formats & local secure storage.',
  },
  {
    id: 'pro',
    name: 'Professional Plan',
    price: 999,
    period: '/ year',
    popular: true,
    description: 'Unlimited invoices, inventory alerts, multi-device cloud sync access.',
  },
  {
    id: 'enterprise',
    name: 'Enterprise Suite',
    price: 1999,
    period: '/ year',
    description: 'All features, multi-user roles, audit reports, priority cloud archiving.',
  },
];

export default function LicenseRenewalModal({
  isOpen,
  onClose,
  currentUser,
  company,
  subscriptionStatus,
  onRenew,
  onCheckStatus,
  companyPhone = '+91 98765 43210',
  companyEmail = 'support@tread.local',
  allowClose = true,
}) {
  const [selectedPlan, setSelectedPlan] = useState(
    currentUser?.subscription?.planId || 'pro'
  );
  const [activeTab, setActiveTab] = useState('direct'); // 'direct' | 'company'
  const [isProcessing, setIsProcessing] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState(null);

  if (!isOpen) return null;

  // Exact license ID: strictly sync with subscriptionStatus shown on Dashboard
  const licenseId =
    subscriptionStatus?.licenseId ||
    currentUser?.licenseId ||
    (currentUser?.username === 'admin' ? '91-00-000-000000' : ensureValidLicenseId(currentUser || {}));

  const handleCopyId = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(licenseId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleWhatsApp = () => {
    const companyDisplayName = company?.name || currentUser?.companyName || '';
    const text = encodeURIComponent(
      `Hello! I want to renew my Tread Subscription.\nLicense ID: ${licenseId}\nUser ID: ${currentUser?.username || ''}${companyDisplayName ? `\nCompany: ${companyDisplayName}` : ''}`
    );
    const cleanPhone = (companyPhone || '').replace(/\D/g, '');
    const isDefaultDummy = cleanPhone === '919876543210' || cleanPhone === '9876543210';
    const url = cleanPhone && !isDefaultDummy
      ? `https://wa.me/${cleanPhone}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleInstantRenew = async () => {
    const plan = PLANS.find((p) => p.id === selectedPlan) || PLANS[1];
    setIsProcessing(true);
    setNotice(null);
    try {
      const res = await onRenew({
        planId: plan.id,
        planName: plan.name,
        amountPaid: plan.price,
        additionalDays: 365,
      });
      if (res?.success) {
        setNotice({ type: 'success', text: res.message || 'License renewed successfully!' });
        setTimeout(() => {
          if (onClose) onClose();
        }, 1200);
      } else {
        setNotice({ type: 'danger', text: res?.message || 'Failed to renew license.' });
      }
    } catch (err) {
      setNotice({ type: 'danger', text: err.message || 'Error renewing license.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckCloud = async () => {
    setIsChecking(true);
    setNotice(null);
    try {
      if (onCheckStatus) {
        const updated = await onCheckStatus();
        if (updated?.subscription?.status === 'Active' && !subscriptionStatus?.isExpired) {
          setNotice({ type: 'success', text: '✓ License is active! Unlocking app...' });
          setTimeout(() => {
            if (onClose) onClose();
          }, 1000);
        } else {
          setNotice({
            type: 'info',
            text: 'License status checked. Please contact company support if payment was made.',
          });
        }
      }
    } catch (err) {
      setNotice({ type: 'danger', text: 'Could not connect to cloud license server.' });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      style={{
        backgroundColor: 'rgba(9, 13, 22, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 1080,
      }}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content rounded-4 border-0 shadow-luxury overflow-hidden">
          {/* Header */}
          <div
            className="modal-header text-white p-4 position-relative"
            style={{
              background: 'linear-gradient(135deg, #090d16 0%, #1e1b4b 60%, #312e81 100%)',
              borderBottom: '1px solid rgba(245, 158, 11, 0.3)',
            }}
          >
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <span className="badge bg-warning text-dark fw-bold px-2 py-1">
                  ⭐ Tread License
                </span>
                {subscriptionStatus?.isExpired ? (
                  <span className="badge bg-danger text-white fw-bold px-2 py-1">
                    🔴 Expired
                  </span>
                ) : (
                  <span className="badge bg-warning-subtle text-warning border border-warning px-2 py-1">
                    ⚠️ {subscriptionStatus?.daysRemaining} Days Left
                  </span>
                )}
              </div>
              <h5 className="modal-title fw-bold mb-0">Subscription &amp; License Center</h5>
              <small className="text-white-50">
                Manage license duration, renew directly, or quote your Unique ID to our team
              </small>
            </div>
            {allowClose && (
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={onClose}
                aria-label="Close"
              />
            )}
          </div>

          {/* Body */}
          <div className="modal-body p-4 bg-light">
            {/* Unique Customer License ID Callout Banner */}
            <div
              className="card border-0 rounded-3 p-3 mb-3 text-white position-relative shadow-sm"
              style={{
                background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
              }}
            >
              <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3">
                <div>
                  <div className="text-white-50 small text-uppercase fw-semibold" style={{ letterSpacing: '0.05em' }}>
                    Your Unique Customer License ID
                  </div>
                  <div className="d-flex align-items-center gap-2 mt-1">
                    <span
                      className="font-monospace fw-bold"
                      style={{ fontSize: '24px', letterSpacing: '0.08em', color: '#fde68a' }}
                    >
                      {licenseId}
                    </span>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-light py-0 px-2 fw-semibold"
                      onClick={handleCopyId}
                      title="Copy License ID"
                    >
                      {copied ? '✓ Copied' : '📋 Copy'}
                    </button>
                  </div>
                  <div className="small text-white-50 mt-1">
                    Account: <strong>{currentUser?.username}</strong> &bull; Current Status:{' '}
                    <span className={subscriptionStatus?.isExpired ? 'text-danger fw-bold' : 'text-warning fw-bold'}>
                      {subscriptionStatus?.validUntil ? `Valid until ${subscriptionStatus.validUntil}` : 'Expired'}
                    </span>
                  </div>
                </div>

                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-light px-3 py-2 fw-semibold"
                    onClick={handleCheckCloud}
                    disabled={isChecking}
                  >
                    {isChecking ? '⏳ Checking...' : '🔄 Check Cloud Status'}
                  </button>
                </div>
              </div>
            </div>

            {notice && (
              <div
                className={`alert alert-${notice.type} py-2 px-3 small rounded-3 mb-3 d-flex align-items-center justify-content-between`}
              >
                <span>{notice.text}</span>
                <button
                  type="button"
                  className="btn-close btn-close-sm"
                  onClick={() => setNotice(null)}
                />
              </div>
            )}

            {/* Mode Switch Tabs */}
            <ul className="nav nav-pills nav-fill mb-3 bg-white p-1 rounded-3 border">
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link fw-bold py-2 ${activeTab === 'direct' ? 'active shadow-sm' : 'text-secondary'}`}
                  onClick={() => setActiveTab('direct')}
                >
                  ⚡ Direct Self-Service Renewal
                </button>
              </li>
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link fw-bold py-2 ${activeTab === 'company' ? 'active shadow-sm' : 'text-secondary'}`}
                  onClick={() => setActiveTab('company')}
                >
                  🏢 Renew via Company / Support
                </button>
              </li>
            </ul>

            {activeTab === 'direct' ? (
              <div>
                <p className="small text-muted mb-3">
                  Select your license tier. Activating will add <strong>365 days (1 full year)</strong> to your license duration immediately across all devices.
                </p>
                <div className="row g-3 mb-3">
                  {PLANS.map((plan) => {
                    const isSel = selectedPlan === plan.id;
                    return (
                      <div className="col-12 col-md-4" key={plan.id}>
                        <div
                          className={`card h-100 p-3 rounded-3 cursor-pointer transition-all border ${
                            isSel
                              ? 'border-primary bg-primary-subtle shadow-sm'
                              : 'border-secondary-subtle bg-white'
                          }`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => setSelectedPlan(plan.id)}
                        >
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <span className="fw-bold text-dark">{plan.name}</span>
                            {plan.popular && (
                              <span className="badge bg-primary" style={{ fontSize: '10px' }}>
                                POPULAR
                              </span>
                            )}
                          </div>
                          <div className="h4 fw-bold text-primary mb-1">
                            ₹{plan.price}
                            <span className="small text-muted fw-normal" style={{ fontSize: '12px' }}>
                              {plan.period}
                            </span>
                          </div>
                          <p className="small text-muted mb-0" style={{ fontSize: '11.5px' }}>
                            {plan.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="d-flex justify-content-end gap-2 pt-2 border-top">
                  {allowClose && (
                    <button
                      type="button"
                      className="btn btn-outline-secondary px-3 fw-semibold"
                      onClick={onClose}
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-success px-4 fw-bold shadow-sm"
                    onClick={handleInstantRenew}
                    disabled={isProcessing}
                  >
                    {isProcessing ? '⏳ Activating License...' : '✓ Confirm & Extend 1 Year'}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="small text-muted mb-3">
                  To renew through bank transfer, UPI invoice, or custom corporate billing, contact our support team. Provide your <strong>Unique License ID</strong> for instant activation.
                </p>

                <div className="bg-white p-3 rounded-3 border mb-3">
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <div className="text-muted small">Unique License ID:</div>
                      <div className="fw-bold font-monospace text-dark fs-5">{licenseId}</div>
                    </div>
                    <div className="col-12 col-md-6">
                      <div className="text-muted small">Registered Mobile:</div>
                      <div className="fw-semibold text-dark">{currentUser?.phone || 'Not recorded'}</div>
                    </div>
                  </div>
                </div>

                <div className="d-flex flex-wrap gap-2 justify-content-center my-3">
                  <button
                    type="button"
                    className="btn btn-success fw-bold px-4 py-2 d-flex align-items-center gap-2 shadow-sm"
                    onClick={handleWhatsApp}
                  >
                    <span>💬</span>
                    <span>Chat on WhatsApp to Renew</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-primary fw-semibold px-4 py-2 d-flex align-items-center gap-2"
                    onClick={handleCopyId}
                  >
                    <span>📋</span>
                    <span>{copied ? 'ID Copied to Clipboard!' : 'Copy License ID'}</span>
                  </button>
                </div>

                <div className="text-center small text-muted mt-2">
                  Once our team confirms your renewal, click <strong>"Check Cloud Status"</strong> above to instantly unlock your account.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}