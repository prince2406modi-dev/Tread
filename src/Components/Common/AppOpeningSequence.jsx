import { useState, useEffect } from 'react';
import Logo from '../../assets/Images/Logo.png';

const BOOT_STEPS = [
  { id: 1, label: 'Initializing Secure Workspace', icon: '🔐', color: '#a5b4fc' },
  { id: 2, label: 'Loading AI & GST Engine', icon: '⚡', color: '#fde68a' },
  { id: 3, label: 'Connecting Cloud Datastore', icon: '☁️', color: '#93c5fd' },
  { id: 4, label: 'Launching Executive Cockpit', icon: '🚀', color: '#6ee7b7' },
];

export default function AppOpeningSequence({ onComplete, currentUser }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState(15);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Step 1: Local Integrity (0 - 35%)
    const t1 = setTimeout(() => {
      setCurrentStepIndex(1);
      setProgress(45);
    }, 280);

    // Step 2: AI & GST Engine (35% - 70%)
    const t2 = setTimeout(() => {
      setCurrentStepIndex(2);
      setProgress(78);
    }, 620);

    // Step 3: Cloud Sync Handshake (70% - 95%)
    const t3 = setTimeout(() => {
      setCurrentStepIndex(3);
      setProgress(96);
    }, 980);

    // Step 4: Ready (100%) & Fade Out
    const t4 = setTimeout(() => {
      setProgress(100);
      setIsFadingOut(true);
    }, 1300);

    // Finish Handover
    const t5 = setTimeout(() => {
      if (onComplete) onComplete();
    }, 1650);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [onComplete]);

  const handleSkip = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      if (onComplete) onComplete();
    }, 200);
  };

  return (
    <div
      className={`app-boot-overlay ${isFadingOut ? 'fade-out' : ''}`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at center top, #1e293b 0%, #0f172a 50%, #090d16 100%)',
        color: '#ffffff',
        fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
        padding: '1.5rem',
        overflow: 'hidden',
        transition: 'opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        opacity: isFadingOut ? 0 : 1,
        transform: isFadingOut ? 'scale(1.03)' : 'scale(1)',
        pointerEvents: isFadingOut ? 'none' : 'auto',
      }}
    >
      {/* Background Animated Ambient Lights */}
      <div
        style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.22) 0%, rgba(37, 99, 235, 0.08) 50%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'boot-pulse 3s infinite ease-in-out',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '350px',
          height: '350px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.12) 0%, transparent 60%)',
          filter: 'blur(50px)',
          bottom: '10%',
          right: '15%',
          pointerEvents: 'none',
        }}
      />

      {/* Main Glassmorphic Chassis */}
      <div
        className="card border-0 shadow-lg text-center"
        style={{
          width: '100%',
          maxWidth: '460px',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '24px',
          padding: '2.5rem 2rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 35px rgba(99, 102, 241, 0.2)',
          zIndex: 1,
        }}
      >
        {/* Gold Shimmer Line at Card Top */}
        <div className="boot-gold-line" />

        {/* Brand Shield & Animated Breathing Ring */}
        <div className="position-relative d-inline-block mx-auto mb-3">
          <div
            style={{
              position: 'absolute',
              inset: '-10px',
              borderRadius: '24px',
              border: '2px solid rgba(99, 102, 241, 0.4)',
              animation: 'boot-ring 2s infinite ease-in-out',
              pointerEvents: 'none',
            }}
          />
          <img
            src={Logo}
            alt="Tread Logo"
            style={{
              width: '82px',
              height: '82px',
              objectFit: 'contain',
              filter: 'drop-shadow(0 10px 20px rgba(99, 102, 241, 0.45))',
              transform: 'scale(1)',
              animation: 'boot-logo-breathe 2.4s infinite ease-in-out',
            }}
          />
        </div>

        {/* Product Title & Executive Subtitle */}
        <div className="d-flex align-items-center justify-content-center gap-2 mb-1">
          <h2
            className="fw-bold mb-0"
            style={{
              fontSize: '28px',
              letterSpacing: '-0.03em',
              background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            TREAD
          </h2>
          <span
            className="badge rounded-pill fw-bold"
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#ffffff',
              fontSize: '10px',
              letterSpacing: '0.05em',
              padding: '4px 8px',
            }}
          >
            v2.5 PRO
          </span>
        </div>

        <p
          className="text-white-50 mb-4"
          style={{ fontSize: '13px', letterSpacing: '0.02em', fontWeight: 500 }}
        >
          {currentUser?.username
            ? `Welcome back, ${currentUser.username} • Launching Workspace`
            : 'Executive GST Billing, Inventory & ERP Suite'}
        </p>

        {/* Step-by-Step Progress Track */}
        <div className="mb-3 px-1">
          <div
            className="progress"
            style={{
              height: '7px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '9999px',
              overflow: 'hidden',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.4)',
            }}
          >
            <div
              className="progress-bar progress-bar-striped progress-bar-animated"
              role="progressbar"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #6366f1 0%, #f59e0b 60%, #10b981 100%)',
                transition: 'width 0.38s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 0 18px rgba(245, 158, 11, 0.75)',
              }}
            />
          </div>
        </div>

        {/* Live Step Status Label */}
        <div
          className="d-flex align-items-center justify-content-between text-start mb-4 px-1"
          style={{ fontSize: '12px' }}
        >
          <div className="d-flex align-items-center gap-2 text-white-50">
            <span style={{ fontSize: '14px' }}>{BOOT_STEPS[currentStepIndex]?.icon}</span>
            <span className="fw-semibold" style={{ fontSize: '12.5px', color: BOOT_STEPS[currentStepIndex]?.color || '#ffffff' }}>
              {BOOT_STEPS[currentStepIndex]?.label}
            </span>
          </div>
          <span className="text-white fw-bold" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {progress}%
          </span>
        </div>

        {/* Feature Badges Strip */}
        <div
          className="d-flex items-center justify-content-center gap-2 py-2 px-3 rounded-3"
          style={{
            background: 'rgba(245, 158, 11, 0.07)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            fontSize: '11px',
            color: '#fde68a',
            letterSpacing: '0.03em',
          }}
        >
          <span>⚡ Ollama AI Ready</span>
          <span>•</span>
          <span>🔒 256-bit Encrypted</span>
          <span>•</span>
          <span>☁️ Auto-Sync</span>
        </div>

        {/* Instant Skip Button */}
        <div className="mt-3">
          <button
            type="button"
            className="btn btn-link btn-sm text-decoration-none text-white-50 p-0"
            style={{ fontSize: '11px' }}
            onClick={handleSkip}
          >
            Skip to workspace →
          </button>
        </div>
      </div>
    </div>
  );
}
