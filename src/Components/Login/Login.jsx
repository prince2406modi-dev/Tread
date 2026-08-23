import { useState, useMemo } from 'react';
import Logo from '../../assets/Images/Logo.png';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter Plan',
    price: 499,
    period: '/ year',
    description: 'Perfect for small retailers & individual proprietors.',
    features: [
      'Up to 500 Invoices / Year',
      'Priya Sales Standard Tax Invoice Format',
      'Customer & Party Directory',
      'Instant PDF Export & Print',
      'Local Secure Storage'
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
      'Unlimited Invoices & Transactions',
      'Stock Inventory & Purchase Bill Management',
      'Excel / CSV Purchase Import',
      'Automatic Multi-rate GST Calculation',
      'Firebase Cloud Backup & Restore',
      'Voice Billing Commands'
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
    description: 'For wholesale distributors & multi-counter operations.',
    features: [
      'All Professional Features',
      'Multi-User Roles & Permissions',
      'WhatsApp & Email Direct Share',
      'Financial & Tax Audit Reports',
      'Dedicated 24/7 Support',
      'Lifetime Cloud Archiving'
    ],
    badge: 'Enterprise',
    color: 'border-dark',
    headerBg: 'bg-dark text-white'
  }
];

function Login({ users = [], onLogin, onRegister }) {
  const [mode, setMode] = useState(users.length === 0 ? 'signup' : 'login');
  const [step, setStep] = useState(1); // 1: Details, 2: Plan & Pay, 3: Success

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Payment states
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [upiId, setUpiId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState(null);

  const [error, setError] = useState('');
  const clearError = () => {
    if (error) setError('');
  };

  const currentPlan = useMemo(
    () => PLANS.find((p) => p.id === selectedPlan) || PLANS[1],
    [selectedPlan]
  );

  // Handle Login Submission
  const handleLoginSubmit = (e) => {
    e.preventDefault();
    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    if (!trimmedUser || !trimmedPass) {
      setError('Please enter both User ID and Password.');
      return;
    }

    const account = users.find(
      (u) => u.username.toLowerCase() === trimmedUser.toLowerCase()
    );

    if (!account || account.password !== trimmedPass) {
      setError('Invalid User ID or Password. If you do not have an account, please sign up and choose a plan.');
      return;
    }

    onLogin(account.username);
    setError('');
  };

  // Step 1: Validate Registration Details & proceed to Plan & Payment
  const handleStep1Next = (e) => {
    e.preventDefault();
    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    if (!trimmedUser || !trimmedPass) {
      setError('Please fill in User ID and Password.');
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
      const registrationData = {
        username: username.trim(),
        password: password.trim(),
        companyName: companyName.trim() || 'My Business Enterprise',
        phone: phone.trim(),
        email: email.trim(),
        role: 'Admin',
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

      // Register new user with active paid subscription
      onRegister(registrationData);
    }, 1800);
  };

  // Complete and enter dashboard
  const handleEnterDashboard = () => {
    if (paymentSuccessData) {
      onLogin(paymentSuccessData.username);
    }
  };

  return (
    <div className="card shadow-lg border-0 mx-auto rounded-4 overflow-hidden" style={{ maxWidth: step === 2 ? '780px' : '520px' }}>
      {/* Header Banner */}
      <div className="bg-primary text-white text-center p-4">
        <img
          src={Logo}
          alt="Tread Logo"
          className="mb-2"
          style={{ maxHeight: '55px', width: 'auto', filter: 'brightness(0) invert(1)' }}
        />
        <h1 className="h4 fw-bold mb-1">TREAD GST BILLING SUITE</h1>
        <div className="small opacity-75">Professional Invoicing & Inventory Platform</div>
      </div>

      <div className="card-body p-4 p-md-5 bg-white">
        {/* =========================================================
            MODE 1: LOGIN
            ========================================================= */}
        {mode === 'login' && (
          <div>
            <div className="text-center mb-4">
              <h2 className="h5 fw-bold text-dark mb-1">🔐 Sign In to Your Account</h2>
              <p className="text-muted small mb-0">
                Enter your registered User ID and Password to access your dashboard.
              </p>
            </div>

            {error && <div className="alert alert-danger py-2 small">{error}</div>}

            <form onSubmit={handleLoginSubmit} autoComplete="off">
              <div className="mb-3">
                <label className="form-label fw-semibold small">User ID / Username *</label>
                <input
                  type="text"
                  className="form-control"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    clearError();
                  }}
                  placeholder="Enter your User ID"
                  autoFocus
                  required
                />
              </div>

              <div className="mb-4">
                <label className="form-label fw-semibold small">Password *</label>
                <input
                  type="password"
                  className="form-control"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearError();
                  }}
                  placeholder="Enter your password"
                  required
                />
              </div>

              <div className="d-grid gap-2 mb-3">
                <button type="submit" className="btn btn-primary py-2 fw-bold shadow-sm">
                  🔓 Sign In to Dashboard
                </button>
              </div>
            </form>

            <div className="border-top pt-3 text-center">
              <div className="small text-muted">
                New user? Choose a plan & register:{' '}
                <button
                  type="button"
                  className="btn btn-link btn-sm p-0 fw-bold text-primary text-decoration-none"
                  onClick={() => {
                    setMode('signup');
                    setStep(1);
                    clearError();
                  }}
                >
                  💳 Sign Up & Subscribe
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            MODE 2: SIGN UP (PAID SUBSCRIPTION FLOW)
            ========================================================= */}
        {mode === 'signup' && (
          <div>
            {/* Step Indicators */}
            <div className="d-flex justify-content-between align-items-center mb-4 px-2">
              <div className={`text-center ${step >= 1 ? 'text-primary fw-bold' : 'text-muted'}`}>
                <div className={`rounded-circle d-inline-flex justify-content-center align-items-center mb-1 ${step >= 1 ? 'bg-primary text-white' : 'bg-light text-muted'}`} style={{ width: '28px', height: '28px', fontSize: '13px' }}>
                  1
                </div>
                <div style={{ fontSize: '11.5px' }}>Account Details</div>
              </div>
              <div className="flex-grow-1 border-top mx-2" />
              <div className={`text-center ${step >= 2 ? 'text-primary fw-bold' : 'text-muted'}`}>
                <div className={`rounded-circle d-inline-flex justify-content-center align-items-center mb-1 ${step >= 2 ? 'bg-primary text-white' : 'bg-light text-muted'}`} style={{ width: '28px', height: '28px', fontSize: '13px' }}>
                  2
                </div>
                <div style={{ fontSize: '11.5px' }}>Plan & Payment</div>
              </div>
              <div className="flex-grow-1 border-top mx-2" />
              <div className={`text-center ${step === 3 ? 'text-success fw-bold' : 'text-muted'}`}>
                <div className={`rounded-circle d-inline-flex justify-content-center align-items-center mb-1 ${step === 3 ? 'bg-success text-white' : 'bg-light text-muted'}`} style={{ width: '28px', height: '28px', fontSize: '13px' }}>
                  ✓
                </div>
                <div style={{ fontSize: '11.5px' }}>Activation</div>
              </div>
            </div>

            {error && <div className="alert alert-danger py-2 small">{error}</div>}

            {/* STEP 1: Account Information */}
            {step === 1 && (
              <form onSubmit={handleStep1Next} autoComplete="off">
                <div className="text-center mb-3">
                  <h2 className="h5 fw-bold text-dark mb-1">📝 Step 1: Create Account Details</h2>
                  <p className="text-muted small mb-0">
                    Enter your business and security information to get started.
                  </p>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold small">User ID / Username *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        clearError();
                      }}
                      placeholder="e.g. priyasales or rahul123"
                      required
                      autoFocus
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold small">Company / Business Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. M/S Priya Sales"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold small">Mobile Number</label>
                    <input
                      type="tel"
                      className="form-control"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 9871772123"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold small">Email Address</label>
                    <input
                      type="email"
                      className="form-control"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. info@priyasales.com"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold small">Password *</label>
                    <input
                      type="password"
                      className="form-control"
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
                    <label className="form-label fw-semibold small">Confirm Password *</label>
                    <input
                      type="password"
                      className="form-control"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        clearError();
                      }}
                      placeholder="Re-enter password"
                      required
                    />
                  </div>
                </div>

                <div className="d-grid gap-2 mb-3">
                  <button type="submit" className="btn btn-primary py-2 fw-bold shadow-sm">
                    Next: Select Plan & Proceed to Payment →
                  </button>
                </div>

                <div className="text-center small text-muted">
                  Already have an account?{' '}
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 fw-semibold text-decoration-none"
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
                  <h2 className="h5 fw-bold text-dark mb-1">💳 Step 2: Choose Subscription & Pay</h2>
                  <p className="text-muted small mb-0">
                    A paid license is required to activate and operate your Tread billing suite.
                  </p>
                </div>

                {/* Pricing Cards */}
                <div className="row g-3 mb-4">
                  {PLANS.map((plan) => {
                    const isSelected = selectedPlan === plan.id;
                    return (
                      <div className="col-md-4" key={plan.id}>
                        <div
                          className={`card h-100 cursor-pointer shadow-sm position-relative ${isSelected ? 'border-primary border-3 shadow' : 'border'}`}
                          style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                          onClick={() => setSelectedPlan(plan.id)}
                        >
                          {plan.popular && (
                            <span className="position-absolute top-0 start-50 translate-middle badge rounded-pill bg-danger px-3 py-1">
                              RECOMMENDED
                            </span>
                          )}
                          <div className={`card-header text-center py-2 ${plan.headerBg}`}>
                            <div className="fw-bold fs-6">{plan.name}</div>
                          </div>
                          <div className="card-body p-3 text-center d-flex flex-column justify-content-between">
                            <div>
                              <div className="h3 fw-bold text-primary mb-0">
                                ₹{plan.price}
                              </div>
                              <div className="text-muted small mb-2">{plan.period}</div>
                              <p className="text-secondary small mb-3" style={{ fontSize: '11.5px' }}>
                                {plan.description}
                              </p>
                              <ul className="text-start small ps-3 mb-0" style={{ fontSize: '11px', lineHeight: '1.4' }}>
                                {plan.features.slice(0, 3).map((f, i) => (
                                  <li key={i} className="mb-1">{f}</li>
                                ))}
                              </ul>
                            </div>
                            <div className="mt-3">
                              <input
                                type="radio"
                                name="planSelect"
                                checked={isSelected}
                                onChange={() => setSelectedPlan(plan.id)}
                                className="form-check-input"
                              />
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
                          placeholder="e.g. 9871772123@upi or merchant@okaxis"
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
                    className="btn btn-outline-secondary"
                    onClick={() => setStep(1)}
                    disabled={isProcessingPayment}
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    className="btn btn-success fw-bold flex-grow-1 py-2 shadow"
                    disabled={isProcessingPayment}
                  >
                    {isProcessingPayment ? (
                      <span>
                        <span className="spinner-border spinner-border-sm me-2" role="status" />
                        Processing Secure Payment ₹{currentPlan.price}...
                      </span>
                    ) : (
                      `🔒 Pay ₹${currentPlan.price} & Activate Account`
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
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">License Valid Until:</span>
                    <span className="fw-bold">{paymentSuccessData.subscription.validUntil}</span>
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
  );
}

export default Login;
