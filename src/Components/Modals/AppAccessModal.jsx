import { useState, useEffect } from 'react';

export default function AppAccessModal({ isOpen, onClose }) {
  const [micStatus, setMicStatus] = useState('prompt'); // 'prompt' | 'granted' | 'denied'
  const [notifStatus, setNotifStatus] = useState(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'prompt';
  });
  const [storageStatus, setStorageStatus] = useState('granted');
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Subscribe to permission changes asynchronously
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'microphone' })
        .then((res) => {
          if (isMounted) {
            setMicStatus(res.state);
            res.onchange = () => {
              if (isMounted) setMicStatus(res.state);
            };
          }
        })
        .catch(() => {});
    }

    if (typeof navigator !== 'undefined' && navigator.storage?.persisted) {
      navigator.storage
        .persisted()
        .then((persisted) => {
          if (isMounted && persisted) {
            setStorageStatus('granted');
          }
        })
        .catch(() => {});
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Request Microphone Access
  const requestMicAccess = async () => {
    setIsProcessing(true);
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
        setMicStatus('granted');
      } else {
        alert('Microphone access is not supported on this browser.');
      }
    } catch (err) {
      console.warn('Microphone permission error:', err);
      setMicStatus('denied');
    } finally {
      setIsProcessing(false);
    }
  };

  // Request Notification Access
  const requestNotifAccess = async () => {
    setIsProcessing(true);
    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const res = await Notification.requestPermission();
        setNotifStatus(res);
      } else {
        alert('Push notifications are not supported on this device/browser.');
      }
    } catch (err) {
      console.warn('Notification permission error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Request Storage Persistence
  const requestStorageAccess = async () => {
    setIsProcessing(true);
    try {
      if (navigator.storage?.persist) {
        const isPersisted = await navigator.storage.persist();
        setStorageStatus(isPersisted ? 'granted' : 'granted');
      } else {
        setStorageStatus('granted');
      }
    } catch (err) {
      console.warn('Storage permission error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Grant All Permissions in Sequence
  const handleGrantAll = async () => {
    setIsProcessing(true);
    // Request mic
    if (micStatus !== 'granted') {
      try {
        if (navigator.mediaDevices?.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach((track) => track.stop());
          setMicStatus('granted');
        }
      } catch {
        setMicStatus('denied');
      }
    }

    // Request notification
    if (notifStatus !== 'granted' && typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const res = await Notification.requestPermission();
        setNotifStatus(res);
      } catch {
        // Ignore
      }
    }

    // Request storage
    if (navigator.storage?.persist) {
      try {
        await navigator.storage.persist();
        setStorageStatus('granted');
      } catch {
        // Ignore
      }
    }

    setIsProcessing(false);
  };

  const handleFinish = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('tread-access-prompted', 'true');
      if (dontShowAgain) {
        window.localStorage.setItem('tread-access-dont-show-again', 'true');
      }
    }
    onClose();
  };

  const allGranted = micStatus === 'granted' && notifStatus === 'granted';

  return (
    <div className="modal-backdrop-custom d-flex justify-content-center align-items-center" style={{ zIndex: 1070 }}>
      <div
        className="card shadow-lg border-0 rounded-4 overflow-hidden"
        style={{
          width: '95%',
          maxWidth: '560px',
          backgroundColor: '#ffffff',
          animation: 'fadeIn 0.25s ease',
        }}
      >
        {/* Header */}
        <div
          className="px-4 py-3 text-white d-flex justify-content-between align-items-center"
          style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}
        >
          <div className="d-flex align-items-center gap-2">
            <span className="fs-4">🛡️</span>
            <div>
              <div className="fw-bold fs-6">Device Access &amp; Permissions</div>
              <small className="text-white-50" style={{ fontSize: '11.5px' }}>
                Required for Voice AI, Invoicing &amp; Real-time Alerts
              </small>
            </div>
          </div>
          <button
            type="button"
            className="btn-close btn-close-white"
            onClick={handleFinish}
            aria-label="Close"
          />
        </div>

        {/* Body */}
        <div className="p-4 bg-light">
          <p className="text-muted small mb-3">
            To provide the best experience with <strong>Voice AI Billing</strong>, <strong>PDF Invoice Generation</strong>, and <strong>Business Alerts</strong>, Tread ERP requests access to the following features:
          </p>

          <div className="d-flex flex-column gap-3 mb-4">
            {/* 1. Microphone Access */}
            <div className="card p-3 border rounded-3 bg-white shadow-xs">
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-3">
                  <span className="fs-3 p-2 bg-primary-subtle text-primary rounded-3">🎤</span>
                  <div>
                    <div className="fw-bold text-dark fs-6 d-flex align-items-center gap-2">
                      <span>Microphone &amp; Voice AI</span>
                      {micStatus === 'granted' ? (
                        <span className="badge bg-success rounded-pill" style={{ fontSize: '10px' }}>✓ Allowed</span>
                      ) : micStatus === 'denied' ? (
                        <span className="badge bg-danger rounded-pill" style={{ fontSize: '10px' }}>Blocked</span>
                      ) : (
                        <span className="badge bg-warning text-dark rounded-pill" style={{ fontSize: '10px' }}>Required</span>
                      )}
                    </div>
                    <small className="text-muted d-block" style={{ fontSize: '11.5px' }}>
                      Enables natural voice commands, voice billing, and audio replies with Tread AI Copilot.
                    </small>
                  </div>
                </div>

                <div>
                  {micStatus === 'granted' ? (
                    <span className="text-success fw-bold fs-5">✓</span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm px-3 fw-semibold rounded-pill"
                      style={{ fontSize: '12px' }}
                      onClick={requestMicAccess}
                      disabled={isProcessing}
                    >
                      Allow
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Notification Access */}
            <div className="card p-3 border rounded-3 bg-white shadow-xs">
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-3">
                  <span className="fs-3 p-2 bg-info-subtle text-info rounded-3">🔔</span>
                  <div>
                    <div className="fw-bold text-dark fs-6 d-flex align-items-center gap-2">
                      <span>Notifications &amp; Reminders</span>
                      {notifStatus === 'granted' ? (
                        <span className="badge bg-success rounded-pill" style={{ fontSize: '10px' }}>✓ Allowed</span>
                      ) : notifStatus === 'denied' ? (
                        <span className="badge bg-danger rounded-pill" style={{ fontSize: '10px' }}>Blocked</span>
                      ) : (
                        <span className="badge bg-warning text-dark rounded-pill" style={{ fontSize: '10px' }}>Recommended</span>
                      )}
                    </div>
                    <small className="text-muted d-block" style={{ fontSize: '11.5px' }}>
                      Sends timely reminders for unpaid customer bills, low stock alerts, and GST filing deadlines.
                    </small>
                  </div>
                </div>

                <div>
                  {notifStatus === 'granted' ? (
                    <span className="text-success fw-bold fs-5">✓</span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-outline-info btn-sm px-3 fw-semibold rounded-pill"
                      style={{ fontSize: '12px' }}
                      onClick={requestNotifAccess}
                      disabled={isProcessing}
                    >
                      Allow
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Storage & Downloads Access */}
            <div className="card p-3 border rounded-3 bg-white shadow-xs">
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-3">
                  <span className="fs-3 p-2 bg-success-subtle text-success rounded-3">📁</span>
                  <div>
                    <div className="fw-bold text-dark fs-6 d-flex align-items-center gap-2">
                      <span>Storage &amp; PDF Downloads</span>
                      <span className="badge bg-success rounded-pill" style={{ fontSize: '10px' }}>✓ Active</span>
                    </div>
                    <small className="text-muted d-block" style={{ fontSize: '11.5px' }}>
                      Saves generated PDF invoices, Excel spreadsheets (.xlsx), and offline backups to your device.
                    </small>
                  </div>
                </div>

                <div>
                  {storageStatus === 'granted' ? (
                    <span className="text-success fw-bold fs-5">✓</span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-outline-success btn-sm px-3 fw-semibold rounded-pill"
                      style={{ fontSize: '12px' }}
                      onClick={requestStorageAccess}
                      disabled={isProcessing}
                    >
                      Allow
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="form-check mb-3">
            <input
              className="form-check-input"
              type="checkbox"
              id="dontShowAgainCheck"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
            />
            <label className="form-check-label text-muted small" htmlFor="dontShowAgainCheck">
              Don&apos;t ask again on app startup
            </label>
          </div>

          {/* Actions */}
          <div className="d-flex gap-2 justify-content-end">
            {!allGranted && (
              <button
                type="button"
                className="btn btn-primary fw-semibold px-3 shadow-xs d-flex align-items-center gap-2"
                onClick={handleGrantAll}
                disabled={isProcessing}
              >
                <span>⚡</span>
                <span>Grant All Access</span>
              </button>
            )}

            <button
              type="button"
              className={`btn ${allGranted ? 'btn-success px-4' : 'btn-secondary'} fw-semibold shadow-xs`}
              onClick={handleFinish}
            >
              {allGranted ? '✓ Continue to App' : 'Continue / Later'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
