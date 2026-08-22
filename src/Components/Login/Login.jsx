import { useState } from 'react';
import Logo from '../../assets/Images/Logo.png';

function Login({ users, onLogin, onRegister }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login');
  const [error, setError] = useState('');

  const clearError = () => setError('');

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    if (!trimmedUsername || !trimmedPassword) {
      setError('Please enter both User ID and Password.');
      return;
    }

    if (mode === 'login') {
      const account = users.find(
        (user) => user.username.toLowerCase() === trimmedUsername.toLowerCase()
      );
      if (!account || account.password !== trimmedPassword) {
        setError('Invalid User ID or Password. Please check your credentials.');
        return;
      }

      onLogin(account.username);
      setUsername('');
      setPassword('');
      setError('');
      return;
    }

    const existingUser = users.some(
      (user) => user.username.toLowerCase() === trimmedUsername.toLowerCase()
    );
    if (existingUser) {
      setError('This User ID is already taken. Please choose another.');
      return;
    }

    const newUser = {
      username: trimmedUsername,
      password: trimmedPassword,
      role: 'Operator',
    };

    onRegister(newUser);
    setUsername('');
    setPassword('');
    setError('');
  };

  return (
    <div className="card shadow-lg border-0 mx-auto rounded-4 overflow-hidden" style={{ maxWidth: '500px' }}>
      <div className="bg-primary text-white text-center p-4">
        <img
          src={Logo}
          alt="Tread Logo"
          className="mb-2"
          style={{ maxHeight: '60px', width: 'auto', filter: 'brightness(0) invert(1)' }}
        />
        <h1 className="h4 fw-bold mb-1">TREAD GST BILLING</h1>
        <div className="small opacity-75">Secure Enterprise Access</div>
      </div>

      <div className="card-body p-4 p-md-5 bg-white">
        <div className="text-center mb-4">
          <h2 className="h5 fw-bold text-dark mb-1">
            {mode === 'login' ? '🔐 Sign In to Your Account' : '📝 Create New Operator ID'}
          </h2>
          <p className="text-muted small mb-0">
            {mode === 'login'
              ? 'Enter your User ID and Password to unlock your billing dashboard.'
              : 'Register a new User ID and Password to manage invoices securely.'}
          </p>
        </div>

        {error && <div className="alert alert-danger py-2 small">{error}</div>}

        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="mb-3">
            <label className="form-label fw-semibold small">User ID / Username *</label>
            <input
              type="text"
              className="form-control"
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
                clearError();
              }}
              placeholder="e.g. admin or your username"
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
              onChange={(event) => {
                setPassword(event.target.value);
                clearError();
              }}
              placeholder="Enter your password"
              required
            />
          </div>

          <div className="d-grid gap-2 mb-3">
            <button type="submit" className="btn btn-primary py-2 fw-bold shadow-sm">
              {mode === 'login' ? '🔓 Sign In' : '＋ Create Account & Sign In'}
            </button>
          </div>
        </form>

        <div className="border-top pt-3 text-center">
          {mode === 'login' ? (
            <div className="small text-muted">
              Don&apos;t have an account?{' '}
              <button
                type="button"
                className="btn btn-link btn-sm p-0 fw-semibold text-decoration-none"
                onClick={() => {
                  setMode('signup');
                  clearError();
                }}
              >
                Register New User ID
              </button>
            </div>
          ) : (
            <div className="small text-muted">
              Already registered?{' '}
              <button
                type="button"
                className="btn btn-link btn-sm p-0 fw-semibold text-decoration-none"
                onClick={() => {
                  setMode('login');
                  clearError();
                }}
              >
                Sign In to existing account
              </button>
            </div>
          )}
        </div>

        {/* Demo credentials tip */}
        <div className="mt-4 p-2 bg-light rounded-3 border text-center small text-muted">
          💡 Default Login: ID: <code>admin</code> | Password: <code>password</code>
        </div>
      </div>
    </div>
  );
}

export default Login;
