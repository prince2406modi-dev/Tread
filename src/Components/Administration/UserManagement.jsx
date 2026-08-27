import { useState, useEffect, useMemo } from 'react';
import {
  cloudAuthenticateUser,
  cloudRegisterUser,
  syncAllUsersFromCloud,
  cloudDeleteUser,
} from '../../services/authApi.js';
import DeviceAccessControl from './DeviceAccessControl.jsx';

function UserManagement({
  users = [],
  currentUser,
  onSwitchUser,
  onAddUser,
  onLogout,
  onBack,
}) {
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'add-user' | 'device-access' | 'auth-api'
  const [userList, setUserList] = useState(users);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  // Create User Form State
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [role, setRole] = useState('Operator');
  const [companyName, setCompanyName] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // API Tester State
  const [apiEndpoint, setApiEndpoint] = useState('https://api.tread-erp.com/v1/auth/login');
  const [apiMethod, setApiMethod] = useState('POST');
  const [apiTestUser, setApiTestUser] = useState('admin');
  const [apiTestMobile, setApiTestMobile] = useState('');
  const [apiTestPass, setApiTestPass] = useState('prince');
  const [apiResponse, setApiResponse] = useState(null);
  const [isExecutingApi, setIsExecutingApi] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState('curl'); // 'curl' | 'javascript' | 'python' | 'nodejs'
  const [copiedCode, setCopiedCode] = useState(false);

  const handleSyncFromCloud = async (silent = false) => {
    setIsSyncing(true);
    if (!silent) setSyncMessage('⏳ Syncing users from Cloud Firestore...');
    try {
      const synced = await syncAllUsersFromCloud();
      setUserList(synced);
      if (!silent) {
        setSyncMessage(`✓ Successfully synchronized ${synced.length} user accounts across all devices!`);
        setTimeout(() => setSyncMessage(''), 4000);
      }
    } catch (err) {
      if (!silent) {
        setSyncMessage(`Cloud sync notice: ${err.message}`);
        setTimeout(() => setSyncMessage(''), 4000);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    syncAllUsersFromCloud()
      .then((synced) => {
        if (isMounted && Array.isArray(synced)) {
          setUserList(synced);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    const trimmedUser = newUsername.trim();
    const trimmedPass = newPassword.trim();
    const cleanMobile = newPhone.trim().replace(/\D/g, '');

    if (!trimmedUser || !trimmedPass) {
      setFormError('Please provide username and password.');
      return;
    }

    if (!cleanMobile || cleanMobile.length < 10) {
      setFormError('Please provide a valid 10-digit mobile number for this user.');
      return;
    }

    if (userList.some((u) => u.username.toLowerCase() === trimmedUser.toLowerCase())) {
      setFormError('Username already exists. Please choose another.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');
    setFormMessage('');

    const newUserData = {
      username: trimmedUser,
      password: trimmedPass,
      email: newEmail.trim(),
      phone: cleanMobile,
      companyName: companyName.trim() || 'My Business Enterprise',
      role,
      subscription: {
        planId: 'enterprise',
        planName: 'Enterprise Operator',
        status: 'Active',
        activatedAt: new Date().toISOString(),
      },
    };

    try {
      const result = await cloudRegisterUser(newUserData);
      if (result.success) {
        setFormMessage(`✓ User "${trimmedUser}" created and synced to Cloud! Can now log in from any device with ID, Mobile & Password.`);
        if (onAddUser) onAddUser(result.user);
        setUserList((prev) => [result.user, ...prev.filter((u) => u.username.toLowerCase() !== trimmedUser.toLowerCase())]);
        setNewUsername('');
        setNewPassword('');
        setNewEmail('');
        setNewPhone('');
        setTimeout(() => setFormMessage(''), 4000);
        setActiveTab('users');
      } else {
        setFormError(result.message);
      }
    } catch (err) {
      setFormError(`Failed to save user: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (username) => {
    if (username.toLowerCase() === 'admin') {
      alert('Cannot delete Master Administrator account.');
      return;
    }

    if (window.confirm(`Are you sure you want to delete user "${username}" from all devices and Cloud Database?`)) {
      const res = await cloudDeleteUser(username);
      if (res.success) {
        setUserList((prev) => prev.filter((u) => u.username.toLowerCase() !== username.toLowerCase()));
        alert(`User "${username}" removed.`);
      }
    }
  };

  // API Tester Simulation
  const handleExecuteApiTester = async () => {
    setIsExecutingApi(true);
    setApiResponse(null);

    setTimeout(async () => {
      try {
        const authRes = await cloudAuthenticateUser(apiTestUser, apiTestMobile, apiTestPass);
        if (authRes.success) {
          setApiResponse({
            status: 200,
            statusText: 'OK',
            data: {
              success: true,
              message: 'Authentication successful across all devices (IP Independent).',
              user: {
                username: authRes.user.username,
                phone: authRes.user.phone,
                role: authRes.user.role,
                companyName: authRes.user.companyName,
                subscription: authRes.user.subscription,
              },
              token: 'jwt_token_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now(),
              source: authRes.source,
              timestamp: new Date().toISOString(),
            },
          });
        } else {
          setApiResponse({
            status: 401,
            statusText: 'Unauthorized',
            data: {
              success: false,
              error: authRes.message,
              timestamp: new Date().toISOString(),
            },
          });
        }
      } catch (err) {
        setApiResponse({
          status: 500,
          statusText: 'Internal Server Error',
          data: {
            success: false,
            error: err.message,
          },
        });
      } finally {
        setIsExecutingApi(false);
      }
    }, 400);
  };

  // Code Snippet Generator
  const codeSnippet = useMemo(() => {
    const payloadJson = JSON.stringify({
      username: apiTestUser,
      mobile: apiTestMobile,
      password: apiTestPass,
    }, null, 2);

    if (codeLanguage === 'curl') {
      return `curl -X POST "${apiEndpoint}" \\
  -H "Content-Type: application/json" \\
  -d '${payloadJson.replace(/\n/g, '\n  ')}'`;
    }
    if (codeLanguage === 'javascript') {
      return `// JavaScript (Cross-Device User Login API - IP Independent)
const loginFromAnyDevice = async (userId, mobileNumber, userPassword) => {
  const res = await fetch('${apiEndpoint}', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: userId,
      mobile: mobileNumber,
      password: userPassword
    })
  });

  const data = await res.json();
  if (data.success) {
    console.log('Logged in successfully on this device:', data.user);
  } else {
    console.error('Login failed:', data.error);
  }
};

loginFromAnyDevice('${apiTestUser}', '${apiTestMobile}', '${apiTestPass}');`;
    }
    if (codeLanguage === 'python') {
      return `# Python (requests - Any Device / Any IP)
import requests

url = "${apiEndpoint}"
payload = {
    "username": "${apiTestUser}",
    "mobile": "${apiTestMobile}",
    "password": "${apiTestPass}"
}

response = requests.post(url, json=payload)
print("HTTP Status:", response.status_code)
print("Auth Response:", response.json())`;
    }
    if (codeLanguage === 'nodejs') {
      return `// Node.js (Axios)
const axios = require('axios');

axios.post('${apiEndpoint}', {
  username: '${apiTestUser}',
  mobile: '${apiTestMobile}',
  password: '${apiTestPass}'
})
.then(res => console.log('Auth Token:', res.data.token))
.catch(err => console.error('Auth Error:', err.response?.data || err.message));`;
    }
    return '';
  }, [codeLanguage, apiEndpoint, apiTestUser, apiTestMobile, apiTestPass]);

  return (
    <div className="py-3">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2">
            <h1 className="h3 fw-bold mb-0">👤 User &amp; Cloud Authentication API Management</h1>
            <span className="badge bg-primary">Cross-Device Sync</span>
          </div>
          <p className="text-muted mb-0 mt-1">
            Manage user accounts, enable cross-device login via Cloud Database, and test authentication APIs.
          </p>
        </div>
        <div className="d-flex gap-2">
          {onBack && (
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onBack}>
              ← Back to Dashboard
            </button>
          )}
          <button
            type="button"
            className="btn btn-outline-primary btn-sm fw-semibold"
            onClick={() => handleSyncFromCloud(false)}
            disabled={isSyncing}
          >
            {isSyncing ? '⏳ Syncing Cloud...' : '🔄 Sync Users Across Devices'}
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm fw-bold"
            onClick={() => setActiveTab('add-user')}
          >
            ＋ Add New User
          </button>
        </div>
      </div>

      {syncMessage && (
        <div className="alert alert-info py-2 px-3 mb-3 small d-flex justify-content-between align-items-center">
          <span>{syncMessage}</span>
          <span className="badge bg-info text-dark">Cloud Sync</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <ul className="nav nav-pills nav-fill bg-white p-2 rounded-3 shadow-sm border mb-4">
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link fw-bold ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            👥 Registered Users ({userList.length})
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link fw-bold ${activeTab === 'add-user' ? 'active' : ''}`}
            onClick={() => setActiveTab('add-user')}
          >
            ➕ Provision User (Cloud Sync)
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link fw-bold ${activeTab === 'device-access' ? 'active' : ''}`}
            onClick={() => setActiveTab('device-access')}
          >
            📱 Multi-Device &amp; Remote Access
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link fw-bold ${activeTab === 'auth-api' ? 'active' : ''}`}
            onClick={() => setActiveTab('auth-api')}
          >
            🔌 User Login REST API
          </button>
        </li>
      </ul>

      {/* TAB 1: USERS LIST */}
      {activeTab === 'users' && (
        <div className="card shadow-sm border-0">
          <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
            <div>
              <h2 className="h5 mb-0 fw-bold">👥 System Users &amp; Operators</h2>
              <small className="text-muted">Users can log in with their credentials on any phone, tablet, laptop, or desktop.</small>
            </div>
            {currentUser && (
              <span className="badge bg-success px-3 py-2">
                Logged in as: {currentUser.username}
              </span>
            )}
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>User ID / Username</th>
                    <th>Email &amp; Phone</th>
                    <th>Company / Store</th>
                    <th>Role</th>
                    <th>Cross-Device Cloud Sync</th>
                    <th>Subscription Plan</th>
                    <th className="text-center" style={{ width: '150px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {userList.map((user) => {
                    const isCurrent = currentUser?.username?.toLowerCase() === user.username.toLowerCase();
                    const isMasterAdmin = user.username.toLowerCase() === 'admin';

                    return (
                      <tr key={user.username} className={isCurrent ? 'table-primary' : ''}>
                        <td>
                          <div className="fw-bold text-dark font-monospace">
                            {user.username}
                            {isCurrent && <span className="badge bg-success ms-2">Current Session</span>}
                            {isMasterAdmin && <span className="badge bg-dark ms-2">Master</span>}
                          </div>
                          {user.lastLoginAt && (
                            <small className="text-muted">
                              Last login: {new Date(user.lastLoginAt).toLocaleDateString('en-IN')}
                            </small>
                          )}
                        </td>
                        <td>
                          <div className="small">{user.email || '—'}</div>
                          {user.phone && (
                            <small className="text-muted font-monospace">
                              📱 ******{user.phone.slice(-4)}
                            </small>
                          )}
                        </td>
                        <td className="small text-muted">{user.companyName || '—'}</td>
                        <td>
                          <span className={`badge ${user.role === 'Admin' ? 'bg-primary' : 'bg-secondary'}`}>
                            {user.role || 'Operator'}
                          </span>
                        </td>
                        <td>
                          <span className="badge bg-success-subtle text-success border">
                            ☁️ Synced Across All Devices
                          </span>
                        </td>
                        <td>
                          <span className="badge bg-light text-dark border">
                            {user.subscription?.planName || 'Enterprise'}
                          </span>
                        </td>
                        <td className="text-center">
                          <div className="d-flex justify-content-center gap-1">
                            {isCurrent ? (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger py-0 px-2"
                                onClick={onLogout}
                              >
                                Sign Out
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary py-0 px-2"
                                onClick={() => onSwitchUser(user.username)}
                              >
                                Switch
                              </button>
                            )}
                            {!isMasterAdmin && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger py-0 px-2"
                                title="Delete user"
                                onClick={() => handleDelete(user.username)}
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ADD USER */}
      {activeTab === 'add-user' && (
        <div className="card shadow-sm border-0" style={{ maxWidth: '720px', margin: '0 auto' }}>
          <div className="card-header bg-primary text-white py-3">
            <h2 className="h5 mb-0 fw-bold">➕ Provision New Cloud User Account</h2>
            <small className="text-white-50">
              User will be saved to Cloud Firestore and can log in instantly from any device.
            </small>
          </div>
          <div className="card-body p-4">
            {formMessage && <div className="alert alert-success py-2 small">{formMessage}</div>}
            {formError && <div className="alert alert-danger py-2 small">{formError}</div>}

            <form onSubmit={handleCreateUser}>
              <div className="row g-3 mb-3">
                <div className="col-md-6 col-12">
                  <label className="form-label fw-semibold">User ID / Username *</label>
                  <input
                    type="text"
                    className="form-control font-monospace"
                    placeholder="e.g. manager1"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="col-md-6 col-12">
                  <label className="form-label fw-semibold">Password *</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="row g-3 mb-3">
                <div className="col-md-6 col-12">
                  <label className="form-label fw-semibold">Mobile Number (10 Digits) *</label>
                  <input
                    type="tel"
                    maxLength={10}
                    className="form-control font-monospace"
                    placeholder="9876543210"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, ''))}
                    required
                  />
                </div>
                <div className="col-md-6 col-12">
                  <label className="form-label fw-semibold">Email Address (Optional)</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="operator@mycompany.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="row g-3 mb-3">
                <div className="col-md-6 col-12">
                  <label className="form-label fw-semibold">Company / Store Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Branch 2 / Outlet"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>
                <div className="col-md-6 col-12">
                  <label className="form-label fw-semibold">Role &amp; Permissions</label>
                  <select
                    className="form-select"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="Admin">Administrator (Full Access)</option>
                    <option value="Operator">Operator (Invoicing &amp; Billing)</option>
                    <option value="Viewer">Viewer (Read Only)</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-light rounded-3 border mb-3 small">
                <strong>☁️ Cloud Multi-Device &amp; IP Independence:</strong>
                <p className="text-muted mb-0 mt-1">
                  Once created, this user can log in from any phone, laptop, or broadband connection (IP independent) using their <strong>User ID</strong>, <strong>Mobile No.</strong>, and <strong>Password</strong>.
                </p>
              </div>

              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setActiveTab('users')}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary px-4 fw-bold"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '⏳ Creating in Cloud...' : '💾 Create & Sync User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: DEVICE ACCESS & REMOTE PASSCODE CONTROL */}
      {activeTab === 'device-access' && (
        <DeviceAccessControl currentUser={currentUser} />
      )}

      {/* TAB 4: AUTH REST API & TESTER */}
      {activeTab === 'auth-api' && (
        <div className="row g-4">
          <div className="col-lg-6 col-12">
            {/* Live API Tester */}
            <div className="card shadow-sm border-0 mb-4">
              <div className="card-header bg-dark text-white py-3 d-flex justify-content-between align-items-center">
                <div>
                  <h2 className="h5 mb-0 fw-bold">⚡ User Authentication API Simulator</h2>
                  <small className="text-white-50">Test logging into an account from any remote device or IP.</small>
                </div>
                <span className="badge bg-success">IP Independent</span>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label fw-semibold">HTTP Method &amp; Endpoint URL</label>
                  <div className="input-group">
                    <select
                      className="form-select bg-light fw-bold"
                      style={{ maxWidth: '110px' }}
                      value={apiMethod}
                      onChange={(e) => setApiMethod(e.target.value)}
                    >
                      <option value="POST">POST</option>
                    </select>
                    <input
                      type="text"
                      className="form-control font-monospace"
                      value={apiEndpoint}
                      onChange={(e) => setApiEndpoint(e.target.value)}
                    />
                  </div>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-md-4 col-12">
                    <label className="form-label fw-semibold small">1. User ID / Username</label>
                    <input
                      type="text"
                      className="form-control font-monospace"
                      value={apiTestUser}
                      onChange={(e) => setApiTestUser(e.target.value)}
                    />
                  </div>
                  <div className="col-md-4 col-12">
                    <label className="form-label fw-semibold small">2. Mobile Number</label>
                    <input
                      type="tel"
                      maxLength={10}
                      className="form-control font-monospace"
                      placeholder="Enter 10-digit mobile"
                      value={apiTestMobile}
                      onChange={(e) => setApiTestMobile(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                  <div className="col-md-4 col-12">
                    <label className="form-label fw-semibold small">3. Password</label>
                    <input
                      type="password"
                      className="form-control"
                      value={apiTestPass}
                      onChange={(e) => setApiTestPass(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-success w-100 fw-bold py-2"
                  onClick={handleExecuteApiTester}
                  disabled={isExecutingApi}
                >
                  {isExecutingApi ? '⏳ Verifying Across Cloud Database...' : '🚀 Test Login from Any Device'}
                </button>

                {/* API Response Display */}
                {apiResponse && (
                  <div className="mt-3">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <strong className="small">API Response:</strong>
                      <span className={`badge ${apiResponse.status === 200 ? 'bg-success' : 'bg-danger'}`}>
                        HTTP {apiResponse.status} {apiResponse.statusText}
                      </span>
                    </div>
                    <pre
                      className="p-3 rounded-3 bg-dark text-white font-monospace small mb-0"
                      style={{ maxHeight: '220px', overflowY: 'auto' }}
                    >
                      {JSON.stringify(apiResponse.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="col-lg-6 col-12">
            {/* Code Snippets */}
            <div className="card shadow-sm border-0 mb-4">
              <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                <h3 className="h6 mb-0 fw-bold">💻 Multi-Device Auth Code Snippets</h3>
                <div className="btn-group btn-group-sm">
                  <button
                    type="button"
                    className={`btn ${codeLanguage === 'curl' ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => setCodeLanguage('curl')}
                  >
                    cURL
                  </button>
                  <button
                    type="button"
                    className={`btn ${codeLanguage === 'javascript' ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => setCodeLanguage('javascript')}
                  >
                    JS (Fetch)
                  </button>
                  <button
                    type="button"
                    className={`btn ${codeLanguage === 'python' ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => setCodeLanguage('python')}
                  >
                    Python
                  </button>
                  <button
                    type="button"
                    className={`btn ${codeLanguage === 'nodejs' ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => setCodeLanguage('nodejs')}
                  >
                    Node.js
                  </button>
                </div>
              </div>
              <div className="card-body p-0 position-relative">
                <pre
                  className="p-3 bg-dark text-success font-monospace small mb-0 rounded-bottom"
                  style={{ minHeight: '260px', overflowX: 'auto' }}
                >
                  {codeSnippet}
                </pre>
                <button
                  type="button"
                  className="btn btn-sm btn-light position-absolute top-0 end-0 m-3 shadow-sm border"
                  onClick={() => {
                    navigator.clipboard.writeText(codeSnippet);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                  }}
                >
                  {copiedCode ? '✓ Copied' : '📋 Copy Code'}
                </button>
              </div>
            </div>

            {/* Cross Device Instructions */}
            <div className="card shadow-sm border-0">
              <div className="card-header bg-white py-3">
                <h3 className="h6 mb-0 fw-bold">📱 How Cross-Device Login Works</h3>
              </div>
              <div className="card-body small text-muted">
                <ol className="ps-3 mb-0">
                  <li className="mb-2">
                    <strong>Cloud Firestore Synchronization:</strong> User credentials are securely synchronized to Google Firebase Firestore under collection <code>app_users</code>.
                  </li>
                  <li className="mb-2">
                    <strong>Zero Setup on New Devices:</strong> Open <code>https://tread-8f7a2.web.app</code> on any smartphone, tablet, or laptop.
                  </li>
                  <li>
                    <strong>Instant Access:</strong> Enter your registered User ID and Password. The app verifies against the Cloud API and logs you in immediately.
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagement;
