import { useState, useMemo } from 'react';
import Logo from '../../assets/Images/Logo.png';
import {
  cloudAuthenticateUser,
  cloudRegisterUser,
  verifyDeviceAuthCode,
  INDIAN_STATES,
  STATE_TO_GST_CODE,
  generateLocationLicenseId,
  lookupCustomerLicense,
} from '../../services/authApi.js';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter Plan',
    price: 499,
    period: '/ year',
    description: 'Perfect for small retailers & individual proprietors.',
    features: [
      'Up to 500 Invoices / Year',
      'Standard GST Tax Invoice Formats',
      'Customer & Party Directory (Accounts)',
      'Instant PDF Export & Print',
      'Local Secure Encrypted Storage'
    ],
    badge: 'Basic',
    color: 'border-secondary',
    headerBg: 'bg-secondary text-white'
  },
  {
    id: 'pro',
    name: 'Professional Plan',
    price: 999,
    period: '/ year',
    popular: true,
    description: 'Best for growing businesses with stock inventory & GST filing.',
    features: [
      'Unlimited Tax Invoices',
      'Live Stock Inventory & Low Stock Alerts',
      'Purchase Bills & Supplier Management',
      'Sales Orders & Purchase Orders (1-Click Convert)',
      'Payment Register (Receive & Pay Track)',
      'GSTR-1, GSTR-2B & GSTR-3B Returns & JSON Export',
      'Multi-Device Cloud Sync Access'
    ],
    badge: 'Most Popular',
    color: 'border-primary',
    headerBg: 'bg-primary text-white'
  },
  {
    id: 'enterprise',
    name: 'Enterprise Suite',
    price: 1999,
    period: '/ year',
    description: 'For wholesale distributors, multi-counter & multi-staff teams.',
    features: [
      'All Professional Features Included',
      'Multi-User Team Management & Role Permissions',
      'Device Access Control & Security Authorization',
      'Master Item Catalog & API Integration',
      'WhatsApp & Email Direct Document Delivery',
      'Financial & Tax Audit Reports'
    ],
    badge: 'Enterprise',
    color: 'border-dark',
    headerBg: 'bg-dark text-white'
  }
];

function Login({ users = [], onLogin, onRegister, isOnline = true }) {
  const [mode, setMode] = useState(users.length === 0 ? 'signup' : 'login');
  const [step, setStep] = useState(1); // 1: Details, 2: Plan & Pay, 3: Success
  const [loginMethod, setLoginMethod] = useState('credentials'); // 'credentials' | 'device-passcode'

  // Form states
  const [username, setUsername] = useState('');
  const [loginMobile, setLoginMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passcodeAccount, setPasscodeAccount] = useState('');
  const [devicePasscode, setDevicePasscode] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [userState, setUserState] = useState('Gujarat');
  const [locality, setLocality] = useState('');
  const [pincode, setPincode] = useState('');

  // Payment states
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [upiId, setUpiId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState(null);

  const [error, setError] = useState('');
  const clearError = () => {
    if (error) setError('');
  };

  const currentPlan = useMemo(
    () => PLANS.find((p) => p.id === selectedPlan) || PLANS[1],
    [selectedPlan]
  );

  // License Lookup & Direct Renewal state
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupPassword, setLookupPassword] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [isSearchingLicense, setIsSearchingLicense] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [copiedLookup, setCopiedLookup] = useState(false);

  // Real-time location license preview for signup
  const licensePreview = useMemo(() => {
    const stateCode = STATE_TO_GST_CODE[userState] || '24';
    let localityCode = '100';
    if (pincode.length >= 3) {
      localityCode = pincode.slice(-3);
    } else if (locality.trim()) {
      let hash = 0;
      for (let i = 0; i < locality.trim().length; i++) {
        hash = (hash * 37 + locality.trim().charCodeAt(i)) % 899;
      }
      localityCode = String(100 + Math.abs(hash)).padStart(3, '0').slice(-3);
    }
    return `91-${stateCode}-${localityCode}-••••••`;
  }, [userState, locality, pincode]);

  const handlePerformLookup = async (e) => {
    e?.preventDefault();
    const q = lookupQuery.trim();
    if (!q) {
      setLookupError('Please enter your User ID or License ID.');
      return;
    }

    const cleanDigits = q.replace(/\D/g, '');
    if (/^\d{10}$/.test(cleanDigits)) {
      setLookupError('🔒 For privacy & security, License IDs are never given out by mobile number alone. Please enter your User ID and Password, or enter your full 13-digit License ID.');
      return;
    }

    setIsSearchingLicense(true);
    setLookupError('');
    setLookupResult(null);
    try {
      const res = await lookupCustomerLicense(q, lookupPassword);
      if (res.found) {
        setLookupResult(res);
      } else {
        setLookupError(res.message);
      }
    } catch (err) {
      setLookupError(err.message || 'Lookup failed.');
    } finally {
      setIsSearchingLicense(false);
    }
  };

  // Handle Standard 3-Factor Login (ID + Mobile + Password)
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const trimmedUser = username.trim();
    const trimmedMobile = loginMobile.trim().replace(/\D/g, '');
    const trimmedPass = password.trim();

    if (!trimmedUser) {
      setError('Please enter your User ID or Username.');
      return;
    }

    if (!trimmedMobile || trimmedMobile.length < 10) {
      setError('Please enter your registered 10-digit Mobile Number.');
      return;
    }

    if (!trimmedPass) {
      setError('Please enter your Password.');
      return;
    }

    setIsAuthenticating(true);
    setError('');

    try {
      const authResult = await cloudAuthenticateUser(trimmedUser, trimmedMobile, trimmedPass);
      if (authResult.success) {
        onLogin(authResult.user.username, authResult.user);
      } else {
        setError(authResult.message);
      }
    } catch (err) {
      setError(`Authentication error: ${err.message}`);
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Handle Authorized Device Passcode Login (Owner ID + 6-digit Code generated by Owner)
  const handlePasscodeLoginSubmit = async (e) => {
    e.preventDefault();
    const trimmedAcc = passcodeAccount.trim();
    const trimmedPin = devicePasscode.trim().replace(/\D/g, '');

    if (!trimmedAcc) {
      setError('Please enter the Account Owner User ID / Mobile / Email.');
      return;
    }

    if (!trimmedPin || trimmedPin.length < 6) {
      setError('Please enter the 6-digit Device Passcode provided by the account owner.');
      return;
    }

    setIsAuthenticating(true);
    setError('');

    try {
      const authResult = await verifyDeviceAuthCode(trimmedAcc, trimmedPin);
      if (authResult.success) {
        onLogin(authResult.user.username, authResult.user);
      } else {
        setError(authResult.message);
      }
    } catch (err) {
      setError(`Device authorization error: ${err.message}`);
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Step 1: Validate Registration Details & proceed to Plan & Payment
  const handleStep1Next = (e) => {
    e.preventDefault();
    const trimmedUser = username.trim();
    const cleanPhone = phone.trim().replace(/\D/g, '');
    const trimmedPass = password.trim();

    if (!trimmedUser) {
      setError('Please fill in User ID / Username.');
      return;
    }

    if (!cleanPhone || cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number for account login & recovery.');
      return;
    }

    if (!trimmedPass) {
      setError('Please enter a password.');
      return;
    }

    if (trimmedPass.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }

    if (trimmedPass !== confirmPassword.trim()) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    const existingUser = users.some(
      (u) => u.username.toLowerCase() === trimmedUser.toLowerCase()
    );
    if (existingUser) {
      setError('This User ID is already registered. Please choose a different User ID or log in.');
      return;
    }

    setError('');
    setStep(2);
  };

  // Step 2: Process Paid Subscription Payment
  const handleProcessPayment = (e) => {
    e.preventDefault();
    setError('');

    if (paymentMethod === 'upi' && !upiId.trim()) {
      setError('Please enter a valid UPI ID (e.g. mobile@upi or name@okaxis).');
      return;
    }

    if (paymentMethod === 'card') {
      if (!cardNumber.trim() || !cardExpiry.trim() || !cardCvv.trim()) {
        setError('Please enter all card payment details.');
        return;
      }
    }

    setIsProcessingPayment(true);

    // Simulate secure payment gateway transaction
    setTimeout(() => {
      setIsProcessingPayment(false);

      const txnId = `TXN-${Math.floor(100000 + Math.random() * 900000)}-${Date.now().toString().slice(-4)}`;
      const generatedLicenseId = generateLocationLicenseId({
        country: '91',
        state: userState,
        locality: locality.trim(),
        pincode: pincode.trim(),
        seed: username.trim(),
      });
      const registrationData = {
        username: username.trim(),
        password: password.trim(),
        companyName: companyName.trim() || 'My Business Enterprise',
        phone: phone.trim(),
        email: email.trim(),
        state: userState,
        locality: locality.trim(),
        pincode: pincode.trim(),
        country: '91',
        role: username.trim().toLowerCase() === 'admin' ? 'Admin' : 'Owner',
        licenseId: generatedLicenseId,
        subscription: {
          planId: currentPlan.id,
          planName: currentPlan.name,
          amountPaid: currentPlan.price,
          status: 'Active',
          transactionId: txnId,
          activatedAt: new Date().toISOString(),
          validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          paymentMethod: paymentMethod.toUpperCase(),
        },
      };

      setPaymentSuccessData(registrationData);
      setStep(3);

      // Register new user with active paid subscription across cloud & local
      cloudRegisterUser(registrationData).then(() => {
        onRegister(registrationData);
      });
    }, 1800);
  };

  // Complete and enter dashboard
  const handleEnterDashboard = () => {
    if (paymentSuccessData) {
      onLogin(paymentSuccessData.username, paymentSuccessData);
    }
  };

  return (
    <div
      className="login-fullwindow-view"
      style={{
        width: '100vw',
        height: '100vh',
        minHeight: '100vh',
        maxHeight: '100vh',
        display: 'flex',
        flexDirection: mode === 'signup' ? 'row-reverse' : 'row',
        background: 'linear-gradient(135deg, #f8fafc 0%, #edf2f7 35%, #e2e8f0 70%, #f1f5f9 100%)',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Dynamic Ambient Bright Glow Lighting */}
      <div style={{ position:'absolute', top:'-140px', left:'15%', width:'650px', height:'650px', borderRadius:'50%', background:'radial-gradient(circle, rgba(99,102,241,0.12) 0%, rgba(219,234,254,0.4) 40%, transparent 70%)', filter:'blur(80px)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:'-120px', right:'12%', width:'550px', height:'550px', borderRadius:'50%', background:'radial-gradient(circle, rgba(245,158,11,0.1) 0%, rgba(254,243,199,0.5) 45%, transparent 65%)', filter:'blur(70px)', pointerEvents:'none' }} />

      {/* =========================================================
          SHOWCASE PANEL (Desktop: Left for Login, Right for Create Account)
          ========================================================= */}
      <div
        className="d-none d-lg-flex flex-column justify-content-between p-4 p-xl-5 position-relative"
        style={{
          flex: mode === 'signup' ? (step === 2 ? '0.65' : '0.8') : (step === 2 ? '0.75' : '1.15'),
          borderRight: mode === 'signup' ? 'none' : '1px solid rgba(226,232,240,0.95)',
          borderLeft: mode === 'signup' ? '1px solid rgba(226,232,240,0.95)' : 'none',
          background: 'linear-gradient(170deg, rgba(255,255,255,0.85) 0%, rgba(248,250,252,0.95) 100%)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          zIndex: 1,
          height: '100vh',
          maxHeight: '100vh',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
        }}
      >
        {/* Brand Header */}
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2.5">
            <img
              src={Logo}
              alt="Tread Logo"
              style={{ maxHeight: '44px', width: 'auto', filter: 'drop-shadow(0 4px 14px rgba(79,70,229,0.3))' }}
            />
            <div>
              <div className="fw-bold" style={{ fontSize: '22px', letterSpacing: '0.06em', lineHeight: 1.1, background: 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 60%, #b45309 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>TREAD</div>
              <div style={{ fontSize: '10.5px', letterSpacing: '0.14em', color: '#b45309', fontWeight: 800, textTransform: 'uppercase' }}>
                {mode === 'signup' ? 'Enterprise Onboarding' : 'Executive Billing & ERP Suite'}
              </div>
            </div>
          </div>
          <span
            className="badge py-1.5 px-3"
            style={{
              fontSize: '11px',
              background: isOnline ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
              color: isOnline ? '#065f46' : '#991b1b',
              border: `1px solid ${isOnline ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
              borderRadius: '20px',
              fontWeight: 600,
            }}
          >
            {isOnline ? '🟢 Cloud Sync Active' : '🔴 Autonomous Offline'}
          </span>
        </div>

        {/* Center Showcase - Adapts dynamically for Login vs Signup */}
        {mode === 'signup' ? (
          <div className="my-auto py-2">
            <div className="d-inline-flex align-items-center gap-2 px-3 py-1.5 rounded-pill mb-3" style={{ background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', fontSize: '12px', fontWeight: 700 }}>
              <span>✨ Rapid Enterprise Onboarding</span>
            </div>

            <h1 className="fw-bold mb-3" style={{ fontSize: '28px', lineHeight: 1.22, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Launch Your Business Suite in 2 Minutes
            </h1>
            <p className="mb-4" style={{ color: '#475569', fontSize: '13.5px', maxWidth: '480px', lineHeight: 1.6 }}>
              Join thousands of businesses managing billing, tax invoices, and real-time inventory with bank-grade local hardware security.
            </p>

            <div className="row g-2.5" style={{ maxWidth: '480px' }}>
              <div className="col-6">
                <div className="p-2.5 rounded-3 h-100" style={{ background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
                  <div className="fs-5 mb-0.5">🚀</div>
                  <div className="fw-bold text-dark mb-0.5" style={{ fontSize: '12.5px' }}>Immediate Setup</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Zero friction; start billing today</div>
                </div>
              </div>
              <div className="col-6">
                <div className="p-2.5 rounded-3 h-100" style={{ background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
                  <div className="fs-5 mb-0.5">🛡️</div>
                  <div className="fw-bold text-dark mb-0.5" style={{ fontSize: '12.5px' }}>Data Autonomy</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Your data never leaves your devices</div>
                </div>
              </div>
              <div className="col-6">
                <div className="p-2.5 rounded-3 h-100" style={{ background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
                  <div className="fs-5 mb-0.5">📊</div>
                  <div className="fw-bold text-dark mb-0.5" style={{ fontSize: '12.5px' }}>100% Tax Compliant</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Full GST, HSN &amp; GSTR-1 ready</div>
                </div>
              </div>
              <div className="col-6">
                <div className="p-2.5 rounded-3 h-100" style={{ background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
                  <div className="fs-5 mb-0.5">💳</div>
                  <div className="fw-bold text-dark mb-0.5" style={{ fontSize: '12.5px' }}>Instant Activation</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Immediate license unlock</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="my-auto py-2">
            <div className="d-inline-flex align-items-center gap-2 px-3 py-1.5 rounded-pill mb-3" style={{ background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', fontSize: '12px', fontWeight: 700 }}>
              <span>⭐ Executive Enterprise Business Suite</span>
            </div>

            <h1 className="fw-bold mb-3" style={{ fontSize: '30px', lineHeight: 1.22, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Next-Gen Enterprise Accounting &amp; GST Invoicing
            </h1>
            <p className="mb-4" style={{ color: '#475569', fontSize: '14px', maxWidth: '520px', lineHeight: 1.6 }}>
              Engineered for precision accounting, retail counters, and distribution hubs with bank-grade local storage and autonomous offline reliability.
            </p>

            {/* 4 Feature Grid */}
            <div className="row g-2.5" style={{ maxWidth: '540px' }}>
              <div className="col-6">
                <div className="p-2.5 rounded-3 h-100" style={{ background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
                  <div className="fs-5 mb-0.5">🎙️</div>
                  <div className="fw-bold text-dark mb-0.5" style={{ fontSize: '12.5px' }}>Voice AI Copilot</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Dictate invoices &amp; hands-free commands</div>
                </div>
              </div>
              <div className="col-6">
                <div className="p-2.5 rounded-3 h-100" style={{ background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
                  <div className="fs-5 mb-0.5">⚡</div>
                  <div className="fw-bold text-dark mb-0.5" style={{ fontSize: '12.5px' }}>Autonomous Offline</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Zero cloud lag; instant local operations</div>
                </div>
              </div>
              <div className="col-6">
                <div className="p-2.5 rounded-3 h-100" style={{ background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
                  <div className="fs-5 mb-0.5">☁️</div>
                  <div className="fw-bold text-dark mb-0.5" style={{ fontSize: '12.5px' }}>Firestore Sync</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Encrypted multi-device synchronization</div>
                </div>
              </div>
              <div className="col-6">
                <div className="p-2.5 rounded-3 h-100" style={{ background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
                  <div className="fs-5 mb-0.5">📑</div>
                  <div className="fw-bold text-dark mb-0.5" style={{ fontSize: '12.5px' }}>Complete GST Suite</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>GSTR-1, HSN codes, tax invoices &amp; PDF</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Left/Right Footer */}
        <div className="d-flex align-items-center justify-content-between pt-2.5" style={{ borderTop: '1px solid #e2e8f0', fontSize: '11px', color: '#64748b' }}>
          <span>🔒 256-Bit Encrypted Vault Storage</span>
          <span className="fw-semibold">Tread Business v1.1</span>
        </div>
      </div>

      {/* =========================================================
          PORTAL (Desktop: Right for Login, Left for Create Account)
          ========================================================= */}
      <div
        className="login-portal-wrapper d-flex flex-column justify-content-center align-items-center p-2 p-md-4 position-relative"
        style={{
          flex: mode === 'signup' ? (step === 2 ? '1.35' : '1.2') : (step === 2 ? '1.25' : '0.85'),
          width: '100%',
          minHeight: '100vh',
          zIndex: 2,
          transition: 'all 0.3s ease',
        }}
      >
        <div
          className="login-card-container border-0 rounded-4 overflow-hidden position-relative w-100 shadow-lg my-auto"
          style={{
            maxWidth: mode === 'signup' ? (step === 2 ? '900px' : '640px') : (step === 2 ? '860px' : '440px'),
            backgroundColor: '#ffffff',
            border: '1px solid rgba(226,232,240,0.9)',
            boxShadow: '0 25px 60px -12px rgba(15,23,42,0.12), 0 0 0 1px rgba(79,70,229,0.06), 0 1px 3px rgba(0,0,0,0.05)',
            borderRadius: '24px',
            display: 'flex',
            flexDirection: 'column',
            transition: 'max-width 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Card Top Banner */}
          <div
            className="text-center position-relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 55%, #312e81 100%)',
              borderBottom: '1px solid rgba(245,158,11,0.25)',
              padding: mode === 'signup' ? '1rem 1.25rem 0.85rem' : '1.25rem 1.25rem 1rem',
            }}
          >
            {/* Top Gold Shimmer Line */}
            <div style={{ position:'absolute', top:0, left:'5%', right:'5%', height:'2px', background:'linear-gradient(90deg, transparent, rgba(245,158,11,0.7), rgba(253,230,138,0.9), rgba(245,158,11,0.7), transparent)', borderRadius:'9999px' }} />
            
            <div className="d-flex align-items-center justify-content-center gap-2 mb-1">
              <img
                src={Logo}
                alt="Tread Logo"
                style={{ maxHeight: '38px', width: 'auto', filter: 'drop-shadow(0 4px 14px rgba(99,102,241,0.65)) drop-shadow(0 0 8px rgba(245,158,11,0.3))' }}
              />
              <span className="fw-bold brand-nav-gold" style={{ letterSpacing: '0.08em', fontSize: '20px' }}>
                TREAD
              </span>
            </div>
            <div style={{ fontSize: '10.5px', letterSpacing: '0.14em', color: 'rgba(245,158,11,0.95)', fontWeight: 700, textTransform: 'uppercase' }}>
              {mode === 'signup' ? 'New Account Registration & Subscription' : 'Executive Authentication Portal'}
            </div>
            <div style={{ width: '32px', height: '2px', background: 'linear-gradient(90deg, transparent, #f59e0b, #fde68a, #f59e0b, transparent)', borderRadius: '9999px', margin: '8px auto 0' }} />
          </div>

          <div
            className="login-card-body card-body p-3 p-md-4"
            style={{
              background: '#ffffff',
              color: '#1e293b',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
        {/* =========================================================
            MODE 1: LOGIN
            ========================================================= */}
        {mode === 'login' && (
          <div className="d-flex flex-column h-100 justify-content-between">
            <div>
              <div className="d-flex align-items-center justify-content-between mb-2.5">
                <div>
                  <h2 className="fw-bold mb-0" style={{ fontSize: '16px', color: '#0f172a' }}>🔐 Sign In</h2>
                  <div style={{ fontSize: '11.5px', color: '#64748b' }}>Authorized enterprise access</div>
                </div>
                <span className="badge bg-light text-dark border" style={{ fontSize: '10.5px', padding: '4px 8px' }}>v1.1</span>
              </div>

              {/* 1-Click Login Method Switcher */}
              <div className="btn-group w-100 mb-3 shadow-xs" role="group">
                <button
                  type="button"
                  className={`btn btn-sm py-1.5 fw-bold login-tab-btn ${
                    loginMethod === 'credentials' ? 'btn-primary' : 'btn-outline-secondary bg-white'
                  }`}
                  style={{ fontSize: '11px', letterSpacing: '-0.01em' }}
                  onClick={() => {
                    setLoginMethod('credentials');
                    clearError();
                  }}
                >
                  🔐 User / License
                </button>
                <button
                  type="button"
                  className={`btn btn-sm py-1.5 fw-bold login-tab-btn ${
                    loginMethod === 'device-passcode' ? 'btn-primary' : 'btn-outline-secondary bg-white'
                  }`}
                  style={{ fontSize: '11px', letterSpacing: '-0.01em' }}
                  onClick={() => {
                    setLoginMethod('device-passcode');
                    clearError();
                  }}
                >
                  🔑 Passcode
                </button>
                <button
                  type="button"
                  className={`btn btn-sm py-1.5 fw-bold login-tab-btn ${
                    loginMethod === 'lookup' ? 'btn-primary' : 'btn-outline-secondary bg-white'
                  }`}
                  style={{ fontSize: '11px', letterSpacing: '-0.01em' }}
                  onClick={() => {
                    setLoginMethod('lookup');
                    clearError();
                  }}
                >
                  🔍 Find ID
                </button>
              </div>

              {error && <div className="py-2 px-3 small rounded-3 mb-2.5" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '8px', fontSize: '12px', fontWeight: 600 }}>{error}</div>}

              {/* Method A: Standard 3-Factor Login */}
              {loginMethod === 'credentials' && (
                <form onSubmit={handleLoginSubmit} autoComplete="off">
                  <div className="mb-2.5">
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <label className="form-label fw-semibold mb-0" style={{ fontSize: '12px', color: '#334155' }}>
                        1. User ID / Customer License ID *
                      </label>
                      <button
                        type="button"
                        className="btn btn-link p-0 text-decoration-none"
                        style={{ fontSize: '11px', color: '#d97706' }}
                        onClick={() => setLoginMethod('lookup')}
                      >
                        Forgot License ID?
                      </button>
                    </div>
                    <input
                      type="text"
                      className="form-control font-monospace py-2 px-3 mobile-touch-input"
                      style={{ fontSize: '14px', borderRadius: '10px', borderColor: '#cbd5e1', backgroundColor: '#f8fafc' }}
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        clearError();
                      }}
                      placeholder="e.g. admin or 91-24-380-749216"
                      autoFocus
                      required
                    />
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                      💡 User ID or 13-digit numeric License ID
                    </div>
                  </div>

                  <div className="mb-2.5">
                    <label className="form-label fw-semibold mb-1" style={{ fontSize: '12px', color: '#334155' }}>2. Registered Mobile (10 Digits) *</label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={10}
                      className="form-control font-monospace py-2 px-3 mobile-touch-input"
                      style={{ fontSize: '14px', borderRadius: '10px', borderColor: '#cbd5e1', backgroundColor: '#f8fafc' }}
                      value={loginMobile}
                      onChange={(e) => {
                        setLoginMobile(e.target.value.replace(/\D/g, ''));
                        clearError();
                      }}
                      placeholder="10-digit registered mobile"
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold mb-1" style={{ fontSize: '12px', color: '#334155' }}>3. Password *</label>
                    <div className="position-relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="form-control py-2 px-3 mobile-touch-input"
                        style={{ fontSize: '14px', borderRadius: '10px', borderColor: '#cbd5e1', backgroundColor: '#f8fafc', paddingRight: '46px' }}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          clearError();
                        }}
                        placeholder="Enter account password"
                        required
                      />
                      <button
                        type="button"
                        className="btn btn-link position-absolute end-0 top-50 translate-middle-y text-muted px-3"
                        style={{ textDecoration: 'none', border: 'none', boxShadow: 'none' }}
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? '👁️' : '🙈'}
                      </button>
                    </div>
                  </div>

                  <div className="d-grid gap-2 mb-2">
                    <button
                      type="submit"
                      className="btn fw-bold w-100 mobile-touch-btn"
                      disabled={isAuthenticating}
                      style={{ background: isAuthenticating ? 'rgba(245,158,11,0.5)' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 55%, #b45309 100%)', color: '#1c0a00', fontSize: '14px', letterSpacing: '0.04em', borderRadius: '12px', border: 'none', boxShadow: '0 8px 22px rgba(245,158,11,0.3)', padding: '0.75rem 1.2rem', textTransform: 'uppercase' }}
                    >
                      {isAuthenticating ? '⏳ Verifying credentials...' : '🔓 Sign In to Dashboard'}
                    </button>
                  </div>
                </form>
              )}

              {/* Method B: Authorized Device Passcode Login */}
              {loginMethod === 'device-passcode' && (
                <form onSubmit={handlePasscodeLoginSubmit} autoComplete="off">
                  <div className="alert alert-info py-2 px-3 small mb-2.5" style={{ fontSize: '11.5px', borderRadius: '8px' }}>
                    💡 Enter the 6-digit Device Passcode generated by account owner in <em>Administration</em>.
                  </div>

                  <div className="mb-2.5">
                    <label className="form-label fw-semibold mb-1" style={{ fontSize: '12px', color: '#334155' }}>1. Owner User ID / Mobile *</label>
                    <input
                      type="text"
                      className="form-control font-monospace py-2 px-3 mobile-touch-input"
                      style={{ fontSize: '14px', borderRadius: '10px', borderColor: '#cbd5e1', backgroundColor: '#f8fafc' }}
                      value={passcodeAccount}
                      onChange={(e) => {
                        setPasscodeAccount(e.target.value);
                        clearError();
                      }}
                      placeholder="e.g. admin or mobile"
                      autoFocus
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold mb-1" style={{ fontSize: '12px', color: '#334155' }}>2. 6-Digit Passcode *</label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      className="form-control font-monospace text-center fs-3 fw-bold py-2 px-2 mobile-touch-input"
                      style={{ borderRadius: '10px', letterSpacing: '8px', borderColor: '#cbd5e1', backgroundColor: '#f8fafc' }}
                      value={devicePasscode}
                      onChange={(e) => {
                        setDevicePasscode(e.target.value.replace(/\D/g, ''));
                        clearError();
                      }}
                      placeholder="••••••"
                      required
                    />
                  </div>

                  <div className="d-grid gap-2 mb-2">
                    <button
                      type="submit"
                      className="btn fw-bold w-100 mobile-touch-btn"
                      disabled={isAuthenticating}
                      style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', fontSize: '14px', letterSpacing: '0.04em', borderRadius: '12px', border: 'none', boxShadow: '0 8px 22px rgba(16,185,129,0.3)', padding: '0.75rem 1.2rem', textTransform: 'uppercase' }}
                    >
                      {isAuthenticating ? '⏳ Authorizing device...' : '🔑 Authorize Device & Sign In'}
                    </button>
                  </div>
                </form>
              )}

              {/* Method C: Customer License Lookup & Direct Company Renewal */}
              {loginMethod === 'lookup' && (
                <div>
                  <div className="p-3 rounded-3 mb-2" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <div className="fw-bold text-dark mb-1" style={{ fontSize: '13px' }}>
                      🔒 License Verification &amp; Expiry Lookup
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>
                      Enter your <strong>User ID &amp; Password</strong> to securely view your License ID, or enter your full <strong>13-digit License ID</strong> to check status.
                    </div>
                    <div className="p-2 rounded-2 mb-2.5" style={{ background: '#fef3c7', border: '1px solid #fde68a', fontSize: '10.5px', color: '#92400e' }}>
                      🛡️ <strong>Privacy Protection:</strong> License IDs are never given out by mobile number alone.
                    </div>

                    <form onSubmit={handlePerformLookup}>
                      <div className="mb-2">
                        <label className="form-label fw-semibold mb-1" style={{ fontSize: '11px', color: '#334155' }}>
                          User ID or License ID *
                        </label>
                        <input
                          type="text"
                          className="form-control font-monospace mobile-touch-input"
                          style={{ fontSize: '13.5px', borderRadius: '10px', borderColor: '#cbd5e1' }}
                          placeholder="e.g. your_username or 91-24-380-749216"
                          value={lookupQuery}
                          onChange={(e) => {
                            setLookupQuery(e.target.value);
                            setLookupError('');
                          }}
                          autoFocus
                          required
                        />
                      </div>

                      {/* Password input for verifying ownership when querying by username */}
                      {!lookupQuery.includes('-') && (
                        <div className="mb-2.5">
                          <label className="form-label fw-semibold mb-1" style={{ fontSize: '11.5px', color: '#334155' }}>
                            Account Password (Required to reveal License ID)
                          </label>
                          <input
                            type="password"
                            className="form-control mobile-touch-input"
                            style={{ fontSize: '13.5px', borderRadius: '10px', borderColor: '#cbd5e1' }}
                            placeholder="Enter password to verify identity"
                            value={lookupPassword}
                            onChange={(e) => {
                              setLookupPassword(e.target.value);
                              setLookupError('');
                            }}
                          />
                        </div>
                      )}

                      <button
                        type="submit"
                        className="btn fw-bold w-100 mobile-touch-btn"
                        disabled={isSearchingLicense}
                        style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: '#1c0a00', fontSize: '13.5px', borderRadius: '10px' }}
                      >
                        {isSearchingLicense ? '⏳ Verifying...' : '🔍 Check License & Expiry Status'}
                      </button>
                    </form>

                    {lookupError && (
                      <div className="alert alert-danger py-1.5 px-2 small mb-0" style={{ fontSize: '11px' }}>
                        {lookupError}
                      </div>
                    )}

                    {lookupResult && (
                      <div className="mt-2 p-2.5 rounded-3 bg-white border" style={{ borderColor: '#cbd5e1' }}>
                        <div className="d-flex align-items-center justify-content-between mb-1">
                          <span className="badge bg-success-subtle text-success border" style={{ fontSize: '10px' }}>
                            ✓ License Verified
                          </span>
                          <span className="text-muted font-monospace" style={{ fontSize: '11px' }}>
                            {lookupResult.username}
                          </span>
                        </div>

                        <div className="text-muted fw-semibold" style={{ fontSize: '10.5px' }}>
                          YOUR UNIQUE CUSTOMER LICENSE ID:
                        </div>
                        <div className="d-flex align-items-center justify-content-between my-1 p-2 rounded-2" style={{ background: '#f1f5f9', border: '1px dashed #cbd5e1' }}>
                          <span className="font-monospace fw-bold fs-6" style={{ color: '#4f46e5', letterSpacing: '0.04em' }}>
                            {lookupResult.licenseId}
                          </span>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary py-0 px-2 fw-semibold"
                            style={{ fontSize: '10.5px' }}
                            onClick={() => {
                              if (navigator.clipboard) {
                                navigator.clipboard.writeText(lookupResult.licenseId);
                                setCopiedLookup(true);
                                setTimeout(() => setCopiedLookup(false), 2000);
                              }
                            }}
                          >
                            {copiedLookup ? '✓ Copied' : '📋 Copy'}
                          </button>
                        </div>

                        <div className="text-muted mb-2" style={{ fontSize: '10.5px' }}>
                          📍 Jurisdiction: <strong>{lookupResult.state}</strong> • <strong>{lookupResult.locality}</strong> • {lookupResult.country}
                        </div>

                        <div className="d-flex align-items-center justify-content-between border-top pt-2 mt-1">
                          <span style={{ fontSize: '11px' }}>
                            Status: <strong className={lookupResult.isExpired ? 'text-danger' : 'text-success'}>
                              {lookupResult.isExpired ? 'Expired' : 'Active'}
                            </strong>
                          </span>
                          <a
                            href={`https://wa.me/?text=${encodeURIComponent(`Hello! I want to renew my Tread Subscription.\nLicense ID: ${lookupResult.licenseId}\nUser ID: ${lookupResult.username}\nCompany: ${lookupResult.companyName}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-success fw-bold py-1 px-2 d-flex align-items-center gap-1"
                            style={{ fontSize: '11px' }}
                          >
                            <span>💬</span> WhatsApp Renewal
                          </a>
                        </div>

                        <button
                          type="button"
                          className="btn btn-link btn-sm p-0 w-100 mt-2 text-primary text-decoration-none fw-semibold"
                          style={{ fontSize: '11px' }}
                          onClick={() => {
                            setUsername(lookupResult.licenseId);
                            if (lookupResult.phone) setLoginMobile(lookupResult.phone.slice(-10));
                            setLoginMethod('credentials');
                          }}
                        >
                          → Fill into Login Form &amp; Sign In
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 text-center" style={{ borderTop: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                New enterprise user?{' '}
                <button
                  type="button"
                  className="btn btn-link p-0 fw-bold text-decoration-none"
                  style={{ color: '#d97706', fontSize: '12px' }}
                  onClick={() => {
                    setMode('signup');
                    setStep(1);
                    clearError();
                  }}
                >
                  Create Account &amp; Subscribe
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            MODE 2: SIGN UP & PAID REGISTRATION
            ========================================================= */}
        {mode === 'signup' && (
          <div>
            {/* Step Progress Tracker */}
            <div className="d-flex justify-content-between align-items-center mb-4 position-relative">
              <div className="text-center" style={{ zIndex: 2, flex: 1 }}>
                <div
                  className={`rounded-circle mx-auto d-flex align-items-center justify-content-center fw-bold ${
                    step >= 1 ? 'bg-primary text-white' : 'bg-light text-muted border'
                  }`}
                  style={{ width: '36px', height: '36px' }}
                >
                  1
                </div>
                <div style={{ fontSize: '11.5px' }} className="fw-semibold mt-1">
                  Details
                </div>
              </div>
              <div
                className="position-absolute top-0 start-50 translate-middle-x"
                style={{
                  height: '2px',
                  width: '60%',
                  backgroundColor: '#dee2e6',
                  zIndex: 1,
                  marginTop: '18px',
                }}
              />
              <div className="text-center" style={{ zIndex: 2, flex: 1 }}>
                <div
                  className={`rounded-circle mx-auto d-flex align-items-center justify-content-center fw-bold ${
                    step >= 2 ? 'bg-primary text-white' : 'bg-light text-muted border'
                  }`}
                  style={{ width: '36px', height: '36px' }}
                >
                  2
                </div>
                <div style={{ fontSize: '11.5px' }} className="mt-1">
                  Plan & Pay
                </div>
              </div>
              <div className="text-center" style={{ zIndex: 2, flex: 1 }}>
                <div
                  className={`rounded-circle mx-auto d-flex align-items-center justify-content-center fw-bold ${
                    step >= 3 ? 'bg-success text-white' : 'bg-light text-muted border'
                  }`}
                  style={{ width: '36px', height: '36px' }}
                >
                  ✓
                </div>
                <div style={{ fontSize: '11.5px' }}>Activation</div>
              </div>
            </div>

            {error && <div className="py-2 px-3 small rounded-3 mb-2" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '8px', fontSize: '12px', fontWeight: 600 }}>{error}</div>}

            {/* STEP 1: Account Information */}
            {step === 1 && (
              <form onSubmit={handleStep1Next} autoComplete="off">
                <div className="text-center mb-3">
                  <h2 className="h5 fw-bold mb-1" style={{ color: '#0f172a' }}>📝 Step 1: Create Account Details</h2>
                  <p className="small mb-0" style={{ color: '#64748b' }}>
                    Enter your business and security credentials to get started.
                  </p>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold small" style={{ color: '#334155' }}>User ID / Username *</label>
                    <input
                      type="text"
                      className="form-control mobile-touch-input"
                      style={{ borderColor: '#cbd5e1', backgroundColor: '#f8fafc', borderRadius: '10px' }}
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        clearError();
                      }}
                      placeholder="e.g. user123 or rahul_store"
                      required
                      autoFocus
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold small" style={{ color: '#334155' }}>Company / Business Name</label>
                    <input
                      type="text"
                      className="form-control mobile-touch-input"
                      style={{ borderColor: '#cbd5e1', backgroundColor: '#f8fafc', borderRadius: '10px' }}
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. My Business / Firm Name"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold small" style={{ color: '#334155' }}>Mobile Number (10 Digits) *</label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={10}
                      className="form-control font-monospace mobile-touch-input"
                      style={{ borderColor: '#cbd5e1', backgroundColor: '#f8fafc', borderRadius: '10px' }}
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value.replace(/\D/g, ''));
                        clearError();
                      }}
                      placeholder="Enter 10-digit mobile number"
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold small" style={{ color: '#334155' }}>Email Address</label>
                    <input
                      type="email"
                      className="form-control mobile-touch-input"
                      style={{ borderColor: '#cbd5e1', backgroundColor: '#f8fafc', borderRadius: '10px' }}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. name@company.com"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold small" style={{ color: '#334155' }}>Password *</label>
                    <input
                      type="password"
                      className="form-control mobile-touch-input"
                      style={{ borderColor: '#cbd5e1', backgroundColor: '#f8fafc', borderRadius: '10px' }}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        clearError();
                      }}
                      placeholder="Create secure password"
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold small" style={{ color: '#334155' }}>Confirm Password *</label>
                    <input
                      type="password"
                      className="form-control mobile-touch-input"
                      style={{ borderColor: '#cbd5e1', backgroundColor: '#f8fafc', borderRadius: '10px' }}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        clearError();
                      }}
                      placeholder="Re-enter password"
                      required
                    />
                  </div>

                  {/* Location Details for Unique Customer License ID */}
                  <div className="col-12 mt-2">
                    <div className="p-2.5 rounded-3" style={{ background: 'rgba(99, 102, 241, 0.05)', border: '1px dashed rgba(99, 102, 241, 0.3)' }}>
                      <div className="fw-semibold text-primary small mb-2 d-flex align-items-center gap-1">
                        <span>📍 Business Location &amp; License Jurisdiction</span>
                        <span className="badge bg-primary-subtle text-primary ms-auto" style={{ fontSize: '10px' }}>Encodes Your Unique License ID</span>
                      </div>
                      <div className="row g-2">
                        <div className="col-md-5">
                          <label className="form-label fw-semibold" style={{ fontSize: '11px', color: '#475569' }}>State / Union Territory *</label>
                          <select
                            className="form-select mobile-touch-input"
                            style={{ borderColor: '#cbd5e1', backgroundColor: '#ffffff', borderRadius: '8px', fontSize: '13px' }}
                            value={userState}
                            onChange={(e) => setUserState(e.target.value)}
                            required
                          >
                            {INDIAN_STATES.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-md-4">
                          <label className="form-label fw-semibold" style={{ fontSize: '11px', color: '#475569' }}>City / Locality</label>
                          <input
                            type="text"
                            className="form-control mobile-touch-input"
                            style={{ borderColor: '#cbd5e1', backgroundColor: '#ffffff', borderRadius: '8px', fontSize: '13px' }}
                            value={locality}
                            onChange={(e) => setLocality(e.target.value)}
                            placeholder="e.g. Surat, Andheri..."
                          />
                        </div>
                        <div className="col-md-3">
                          <label className="form-label fw-semibold" style={{ fontSize: '11px', color: '#475569' }}>PIN Code</label>
                          <input
                            type="tel"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={6}
                            className="form-control font-monospace mobile-touch-input"
                            style={{ borderColor: '#cbd5e1', backgroundColor: '#ffffff', borderRadius: '8px', fontSize: '13px' }}
                            value={pincode}
                            onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                            placeholder="395001"
                          />
                        </div>
                      </div>

                      <div className="mt-2 pt-2 border-top d-flex align-items-center justify-content-between" style={{ borderColor: 'rgba(99,102,241,0.2)' }}>
                        <span style={{ fontSize: '11px', color: '#475569' }}>
                          ⚡ Generated Location License ID:
                        </span>
                        <span className="font-monospace fw-bold" style={{ fontSize: '12.5px', color: '#4f46e5', letterSpacing: '0.04em' }}>
                          {licensePreview}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="d-grid gap-2 mb-3">
                  <button type="submit" className="btn fw-bold w-100" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: '#1c0a00', fontSize: '14px', letterSpacing: '0.04em', borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(245,158,11,0.28)', padding: '0.75rem 1.5rem', textTransform: 'uppercase' }}>
                    Next: Select Plan & Proceed to Payment →
                  </button>
                </div>

                <div className="text-center small" style={{ color: '#64748b' }}>
                  Already have an account?{' '}
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 fw-semibold text-decoration-none"
                    style={{ color: '#d97706' }}
                    onClick={() => {
                      setMode('login');
                      clearError();
                    }}
                  >
                    Sign In here
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: Plan Selection & Checkout Payment */}
            {step === 2 && (
              <form onSubmit={handleProcessPayment}>
                <div className="text-center mb-3">
                  <h2 className="h5 fw-bold mb-1" style={{ color: '#0f172a' }}>💳 Step 2: Choose Subscription & Pay</h2>
                  <p className="text-muted small mb-0">
                    A paid license is required to activate and operate your Tread billing suite.
                  </p>
                </div>

                {/* Pricing Cards */}
                <div className="row g-3 mb-4">
                  {PLANS.map((plan) => {
                    const isSelected = selectedPlan === plan.id;
                    const isPro = plan.id === 'pro';
                    return (
                      <div className="col-md-4 col-12 mobile-plan-card" key={plan.id}>
                        <div
                          className={`card h-100 cursor-pointer position-relative ${isSelected ? 'border-primary border-2' : 'border'}`}
                          style={{
                            cursor: 'pointer',
                            transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
                            transform: isSelected ? 'translateY(-3px)' : 'none',
                            boxShadow: isSelected ? '0 12px 28px -6px rgba(79, 70, 229, 0.25)' : 'none',
                            borderRadius: '16px',
                          }}
                          onClick={() => setSelectedPlan(plan.id)}
                        >
                          {plan.popular && (
                            <span
                              className="position-absolute top-0 start-50 translate-middle badge rounded-pill px-3 py-1 shadow-sm"
                              style={{ background: 'var(--primary-gradient)', fontSize: '10.5px', letterSpacing: '0.05em' }}
                            >
                              ★ RECOMMENDED
                            </span>
                          )}
                          <div
                            className="card-header text-center py-3"
                            style={{
                              background: isPro ? 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)' : '#f8fafc',
                              color: isPro ? '#ffffff' : '#0f172a',
                              borderTopLeftRadius: '15px',
                              borderTopRightRadius: '15px',
                            }}
                          >
                            <div className="fw-bold" style={{ fontSize: '14px', letterSpacing: '-0.01em' }}>{plan.name}</div>
                          </div>
                          <div className="card-body p-3 text-center d-flex flex-column justify-content-between">
                            <div>
                              <div className="h3 fw-bold mb-0 num-tabular" style={{ color: isPro ? '#4f46e5' : '#0f172a' }}>
                                ₹{plan.price}
                              </div>
                              <div className="text-muted small mb-2">{plan.period}</div>
                              <p className="text-secondary small mb-3" style={{ fontSize: '12px' }}>
                                {plan.description}
                              </p>
                              <ul className="text-start small ps-3 mb-0" style={{ fontSize: '11.5px', lineHeight: '1.5' }}>
                                {plan.features.slice(0, 3).map((f, i) => (
                                  <li key={i} className="mb-1 text-secondary">{f}</li>
                                ))}
                              </ul>
                            </div>
                            <div className="mt-3 pt-2 border-top">
                              <span
                                className={`badge ${isSelected ? 'bg-primary text-white' : 'bg-light text-muted border'}`}
                                style={{ fontSize: '11px', padding: '5px 12px' }}
                              >
                                {isSelected ? 'Selected' : 'Select'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Payment Gateway Box */}
                <div className="card bg-light border-0 p-3 mb-4 rounded-3">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h3 className="h6 fw-bold mb-0">🔒 Secure Checkout</h3>
                    <div className="badge bg-success text-white px-2 py-1">
                      Total Payable: ₹{currentPlan.price}.00 (Incl. Taxes)
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="btn-group w-100 mb-3" role="group">
                    <button
                      type="button"
                      className={`btn btn-sm ${paymentMethod === 'upi' ? 'btn-primary fw-bold' : 'btn-outline-secondary'}`}
                      onClick={() => setPaymentMethod('upi')}
                    >
                      📱 UPI (GPay / PhonePe / Paytm)
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${paymentMethod === 'card' ? 'btn-primary fw-bold' : 'btn-outline-secondary'}`}
                      onClick={() => setPaymentMethod('card')}
                    >
                      💳 Credit / Debit Card
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${paymentMethod === 'netbanking' ? 'btn-primary fw-bold' : 'btn-outline-secondary'}`}
                      onClick={() => setPaymentMethod('netbanking')}
                    >
                      🏦 Net Banking
                    </button>
                  </div>

                  {paymentMethod === 'upi' && (
                    <div>
                      <label className="form-label small fw-semibold">Virtual Payment Address (UPI ID) *</label>
                      <div className="input-group input-group-sm mb-2">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. yourbusiness@upi or merchant@okaxis"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-primary"
                          onClick={() => setUpiId('treadbusiness@upi')}
                        >
                          Use Auto UPI
                        </button>
                      </div>
                      <small className="text-muted">Instant activation via standard UPI QR/Collect protocol.</small>
                    </div>
                  )}

                  {paymentMethod === 'card' && (
                    <div className="row g-2">
                      <div className="col-12">
                        <label className="form-label small fw-semibold">Card Number</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="4111 2222 3333 4444"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                        />
                      </div>
                      <div className="col-6">
                        <label className="form-label small fw-semibold">Expiry Date</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="MM/YY"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                        />
                      </div>
                      <div className="col-6">
                        <label className="form-label small fw-semibold">CVV</label>
                        <input
                          type="password"
                          maxLength="4"
                          className="form-control form-control-sm"
                          placeholder="123"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'netbanking' && (
                    <div>
                      <label className="form-label small fw-semibold">Select Bank</label>
                      <select className="form-select form-select-sm">
                        <option>State Bank of India (SBI)</option>
                        <option>HDFC Bank</option>
                        <option>ICICI Bank</option>
                        <option>Union Bank of India</option>
                        <option>Punjab National Bank</option>
                        <option>Axis Bank</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Pay Button */}
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-secondary mobile-touch-btn px-3"
                    onClick={() => setStep(1)}
                    disabled={isProcessingPayment}
                    style={{ borderRadius: '10px' }}
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    className="btn btn-success fw-bold flex-grow-1 py-2 shadow mobile-touch-btn"
                    disabled={isProcessingPayment}
                    style={{ borderRadius: '10px' }}
                  >
                    {isProcessingPayment ? (
                      <span>
                        <span className="spinner-border spinner-border-sm me-2" role="status" />
                        Processing ₹{currentPlan.price}...
                      </span>
                    ) : (
                      `🔒 Pay ₹${currentPlan.price} & Activate`
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Payment Success & Instant Activation */}
            {step === 3 && paymentSuccessData && (
              <div className="text-center py-2">
                <div className="rounded-circle bg-success text-white d-inline-flex justify-content-center align-items-center mb-3 shadow" style={{ width: '64px', height: '64px', fontSize: '32px' }}>
                  ✓
                </div>
                <h2 className="h4 fw-bold text-success mb-1">Payment Successful & Account Activated!</h2>
                <p className="text-muted small mb-4">
                  Your 1-year license for <strong>{paymentSuccessData.subscription.planName}</strong> is now active.
                </p>

                {/* Receipt Card */}
                <div className="card bg-light border p-3 text-start small mb-4 mx-auto" style={{ maxWidth: '400px', fontSize: '12px' }}>
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted">Transaction ID:</span>
                    <span className="fw-bold font-monospace">{paymentSuccessData.subscription.transactionId}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted">User ID:</span>
                    <span className="fw-bold">{paymentSuccessData.username}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted">Plan:</span>
                    <span className="fw-bold text-primary">{paymentSuccessData.subscription.planName}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted">Amount Paid:</span>
                    <span className="fw-bold text-success">₹{paymentSuccessData.subscription.amountPaid}.00</span>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted">License Valid Until:</span>
                    <span className="fw-bold">{paymentSuccessData.subscription.validUntil}</span>
                  </div>
                  <div className="d-flex justify-content-between pt-1 mt-1 border-top">
                    <span className="text-muted fw-semibold">Unique License ID:</span>
                    <span className="fw-bold text-primary font-monospace">{paymentSuccessData.licenseId}</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-primary btn-lg fw-bold w-100 shadow"
                  onClick={handleEnterDashboard}
                >
                  🚀 Open Billing Dashboard
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    </div>
    </div>
);
}
export default Login;
