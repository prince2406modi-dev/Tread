import { useState } from 'react'

function Login({ users, onLogin, onRegister, onBack }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [accountName, setAccountName] = useState('')
  const [itemName, setItemName] = useState('')
  const [mode, setMode] = useState('login')
  const [error, setError] = useState('')

  const clearError = () => setError('')

  const handleSubmit = (event) => {
    event.preventDefault()
    const trimmedUsername = username.trim()
    const trimmedPassword = password.trim()

    if (!trimmedUsername || !trimmedPassword) {
      setError('Please provide both username and password.')
      return
    }

    if (mode === 'login') {
      const account = users.find((user) => user.username === trimmedUsername)
      if (!account || account.password !== trimmedPassword) {
        setError('Invalid username or password. Please try again.')
        return
      }

      onLogin(trimmedUsername)
      setUsername('')
      setPassword('')
      setError('')
      return
    }

    const existingUser = users.some((user) => user.username === trimmedUsername)
    if (existingUser) {
      setError('This username is already taken. Please choose another.')
      return
    }

    const newUser = {
      username: trimmedUsername,
      password: trimmedPassword,
    }

    onRegister(newUser)
    setUsername('')
    setPassword('')
    setError('')
  }

  return (
    <div className="card shadow-sm">
      <div className="card-body p-4">
        <div className="text-center mb-4">
          <div className="brand-title">Tread</div>
          <div className="brand-subtitle text-muted">GST Invoice Billing</div>
        </div>
        <h2 className="h4 mb-3 text-center">{mode === 'login' ? 'Sign In' : 'Create Account'}</h2>
        <p className="text-center text-muted mb-4">
          {mode === 'login'
            ? 'Enter your login details to access the GST invoice dashboard.'
            : 'Create a new account to start managing invoices securely.'}
        </p>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-control"
              value={username}
              onChange={(event) => {
                setUsername(event.target.value)
                clearError()
              }}
              placeholder="Enter username"
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                clearError()
              }}
              placeholder="Enter password"
            />
          </div>
          <div className="d-grid gap-2 mb-3">
            <button type="submit" className="btn btn-primary">
              {mode === 'login' ? 'Login' : 'Sign Up'}
            </button>
          </div>
        </form>

        <div className="d-flex justify-content-between align-items-center mt-3">
          <div className="text-center text-muted small">
            {mode === 'login'
              ? 'New here? Create a free account to start billing.'
              : 'Already have an account? Login to continue.'}
          </div>
          <div>
            {mode === 'login' ? (
              <button type="button" className="btn btn-link p-0 me-3" onClick={() => setMode('signup')}>
                Create an account
              </button>
            ) : (
              <button type="button" className="btn btn-link p-0 me-3" onClick={() => setMode('login')}>
                Login instead
              </button>
            )}
            {onBack && (
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onBack}>
                Back
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
