import { useState, useEffect, useMemo } from 'react';
import {
  generateDeviceAuthCode,
  getDeviceAuthCodes,
  revokeDeviceAuthCode,
  setMultiDeviceLoginAllowed,
  getMultiDeviceLoginAllowed,
  callDeviceAuthApi,
} from '../../services/authApi.js';

function DeviceAccessControl({ currentUser, onBack }) {
  const username = currentUser?.username || 'admin';

  // Sub-tabs: 'manager' | 'api-docs'
  const [activeSubTab, setActiveSubTab] = useState('manager');

  const [multiDeviceEnabled, setMultiDeviceEnabled] = useState(() => getMultiDeviceLoginAllowed(username));
  const [deviceCodes, setDeviceCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deviceLabel, setDeviceLabel] = useState('');
  const [expiryMinutes, setExpiryMinutes] = useState(15);
  const [generatedCode, setGeneratedCode] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  // API Simulator States
  const [apiEndpoint, setApiEndpoint] = useState('generate-passcode');
  const [apiOwner, setApiOwner] = useState(username);
  const [apiLabel, setApiLabel] = useState('Accountant Tablet');
  const [apiExpiry, setApiExpiry] = useState(15);
  const [apiPasscode, setApiPasscode] = useState('');
  const [apiCodeId, setApiCodeId] = useState('');
  const [apiExecuting, setApiExecuting] = useState(false);
  const [apiResponse, setApiResponse] = useState(null);
  const [codeLang, setCodeLang] = useState('curl');
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getDeviceAuthCodes(username)
      .then((list) => {
        if (isMounted) setDeviceCodes(list);
      })
      .catch((err) => console.warn('Error loading device codes:', err));
    return () => {
      isMounted = false;
    };
  }, [username]);

  const loadCodes = async () => {
    setLoading(true);
    try {
      const list = await getDeviceAuthCodes(username);
      setDeviceCodes(list);
    } catch (err) {
      console.warn('Error loading device codes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMultiDevice = async (e) => {
    const newVal = e.target.checked;
    setMultiDeviceEnabled(newVal);
    await setMultiDeviceLoginAllowed(username, newVal);
    setActionMessage(
      newVal
        ? '✓ Cross-device login enabled. Authorized devices can sign in.'
        : '⚠️ Cross-device login disabled. New devices require explicit passcode authorization.'
    );
    setTimeout(() => setActionMessage(''), 4000);
  };

  const handleGenerateCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const codeRecord = await generateDeviceAuthCode(username, {
        label: deviceLabel.trim() || 'Remote Device',
        expiryMinutes: Number(expiryMinutes) || 15,
      });
      setGeneratedCode(codeRecord);
      setDeviceLabel('');
      await loadCodes();
      setActionMessage('✓ 6-Digit Device Passcode generated successfully!');
      setTimeout(() => setActionMessage(''), 5000);
    } catch (err) {
      console.error(err);
      alert('Failed to generate device code.');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (codeId) => {
    if (!window.confirm('Are you sure you want to revoke this device authorization code?')) {
      return;
    }
    await revokeDeviceAuthCode(codeId, username);
    if (generatedCode && generatedCode.id === codeId) {
      setGeneratedCode(null);
    }
    await loadCodes();
    setActionMessage('✓ Device passcode revoked.');
    setTimeout(() => setActionMessage(''), 3000);
  };

  const handleCopyCode = (pin) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(pin);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    }
  };

  const shareWhatsApp = (pin, expMin) => {
    const text = encodeURIComponent(
      `Hello! Your 1-time Device Access Code for Tread Billing is: *${pin}*\nAccount ID: *${username}*\nValid for ${expMin} minutes.\nSign in at: https://tread-8f7a2.web.app`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  // Run API simulation
  const handleExecuteApi = async (e) => {
    e?.preventDefault();
    setApiExecuting(true);
    setApiResponse(null);

    let endpointPath = `/api/v1/auth/device/${apiEndpoint}`;
    let method = 'POST';
    let payload = {};

    if (apiEndpoint === 'generate-passcode') {
      method = 'POST';
      payload = {
        ownerUsername: apiOwner.trim() || username,
        label: apiLabel.trim() || 'Remote Client',
        expiryMinutes: Number(apiExpiry) || 15,
      };
    } else if (apiEndpoint === 'verify-passcode') {
      method = 'POST';
      payload = {
        ownerIdentifier: apiOwner.trim() || username,
        passcode: apiPasscode.trim(),
      };
    } else if (apiEndpoint === 'revoke-passcode') {
      method = 'POST';
      payload = {
        ownerUsername: apiOwner.trim() || username,
        codeId: apiCodeId.trim(),
      };
    } else if (apiEndpoint === 'list-passcodes') {
      method = 'GET';
      payload = {
        owner: apiOwner.trim() || username,
      };
    }

    try {
      const res = await callDeviceAuthApi(endpointPath, method, payload);
      setApiResponse(res);
      if (apiEndpoint === 'generate-passcode' && res.data?.codeId) {
        setApiCodeId(res.data.codeId);
        setApiPasscode(res.data.passcode);
        loadCodes();
      }
    } catch (err) {
      setApiResponse({
        status: 500,
        statusText: 'Client Error',
        latencyMs: 12,
        data: { error: err.message },
      });
    } finally {
      setApiExecuting(false);
    }
  };

  // Dynamic Code Snippet Generation for Active Endpoint
  const codeSnippet = useMemo(() => {
    const baseUrl = 'https://tread-8f7a2.web.app';
    const targetOwner = apiOwner.trim() || username;

    if (apiEndpoint === 'generate-passcode') {
      const payloadObj = {
        ownerUsername: targetOwner,
        label: apiLabel.trim() || 'Accountant Tablet',
        expiryMinutes: Number(apiExpiry) || 15,
      };

      if (codeLang === 'curl') {
        return `curl -X POST "${baseUrl}/api/v1/auth/device/generate-passcode" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(payloadObj, null, 2)}'`;
      }
      if (codeLang === 'javascript') {
        return `// JavaScript (Fetch API) - Generate Device Passcode
const res = await fetch('${baseUrl}/api/v1/auth/device/generate-passcode', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(${JSON.stringify(payloadObj, null, 2)})
});

const data = await res.json();
console.log('Generated 6-Digit Passcode:', data.passcode);
console.log('Expires At:', data.expiresAt);`;
      }
      if (codeLang === 'python') {
        return `# Python - Generate Device Passcode
import requests

url = "${baseUrl}/api/v1/auth/device/generate-passcode"
payload = ${JSON.stringify(payloadObj, null, 4)}

response = requests.post(url, json=payload)
data = response.json()
print("Generated Passcode:", data.get("passcode"))`;
      }
      if (codeLang === 'nodejs') {
        return `// Node.js (Axios) - Generate Device Passcode
const axios = require('axios');

async function generatePasscode() {
  const { data } = await axios.post('${baseUrl}/api/v1/auth/device/generate-passcode', ${JSON.stringify(
          payloadObj,
          null,
          2
        )});
  console.log('Passcode:', data.passcode);
  return data;
}

generatePasscode();`;
      }
    }

    if (apiEndpoint === 'verify-passcode') {
      const payloadObj = {
        ownerIdentifier: targetOwner,
        passcode: apiPasscode || '849201',
      };

      if (codeLang === 'curl') {
        return `curl -X POST "${baseUrl}/api/v1/auth/device/verify-passcode" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(payloadObj, null, 2)}'`;
      }
      if (codeLang === 'javascript') {
        return `// JavaScript - Authenticate Secondary Device via Passcode
const res = await fetch('${baseUrl}/api/v1/auth/device/verify-passcode', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(${JSON.stringify(payloadObj, null, 2)})
});

const auth = await res.json();
if (auth.success) {
  console.log('✓ Device Authorized! Session Token:', auth.token);
  console.log('Logged in as:', auth.user.username);
}`;
      }
      if (codeLang === 'python') {
        return `# Python - Verify Device Passcode
import requests

url = "${baseUrl}/api/v1/auth/device/verify-passcode"
payload = ${JSON.stringify(payloadObj, null, 4)}

response = requests.post(url, json=payload)
print(response.json())`;
      }
      if (codeLang === 'nodejs') {
        return `// Node.js - Verify Device Passcode
const axios = require('axios');

async function verifyDevice() {
  const { data } = await axios.post('${baseUrl}/api/v1/auth/device/verify-passcode', ${JSON.stringify(
          payloadObj,
          null,
          2
        )});
  console.log('Authorization Result:', data);
}

verifyDevice();`;
      }
    }

    if (apiEndpoint === 'revoke-passcode') {
      const payloadObj = {
        ownerUsername: targetOwner,
        codeId: apiCodeId || 'devcode_1787429182_849201',
      };

      if (codeLang === 'curl') {
        return `curl -X POST "${baseUrl}/api/v1/auth/device/revoke-passcode" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(payloadObj, null, 2)}'`;
      }
      if (codeLang === 'javascript') {
        return `// JavaScript - Revoke Device Passcode
const res = await fetch('${baseUrl}/api/v1/auth/device/revoke-passcode', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(${JSON.stringify(payloadObj, null, 2)})
});

const result = await res.json();
console.log('Revocation:', result);`;
      }
      if (codeLang === 'python') {
        return `# Python - Revoke Device Passcode
import requests

url = "${baseUrl}/api/v1/auth/device/revoke-passcode"
payload = ${JSON.stringify(payloadObj, null, 4)}

response = requests.post(url, json=payload)
print(response.json())`;
      }
      if (codeLang === 'nodejs') {
        return `// Node.js - Revoke Passcode
const axios = require('axios');

axios.post('${baseUrl}/api/v1/auth/device/revoke-passcode', ${JSON.stringify(payloadObj, null, 2)})
  .then(res => console.log(res.data));`;
      }
    }

    // Default: list-passcodes
    if (codeLang === 'curl') {
      return `curl -X GET "${baseUrl}/api/v1/auth/device/list-passcodes?owner=${targetOwner}"`;
    }
    if (codeLang === 'javascript') {
      return `// JavaScript - List Active & History Device Passcodes
const res = await fetch('${baseUrl}/api/v1/auth/device/list-passcodes?owner=${targetOwner}');
const { codes } = await res.json();
console.log('Active Passcodes:', codes);`;
    }
    if (codeLang === 'python') {
      return `# Python - List Device Passcodes
import requests

url = "${baseUrl}/api/v1/auth/device/list-passcodes"
params = {"owner": "${targetOwner}"}

response = requests.get(url, params=params)
print(response.json())`;
    }
    return `// Node.js - List Device Passcodes
const axios = require('axios');

axios.get('${baseUrl}/api/v1/auth/device/list-passcodes?owner=${targetOwner}')
  .then(res => console.log(res.data));`;
  }, [apiEndpoint, apiOwner, apiLabel, apiExpiry, apiPasscode, apiCodeId, codeLang, username]);

  return (
    <div className="py-3">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1">📱 Multi-Device &amp; Remote Access Control</h1>
          <p className="text-muted mb-0">
            Grant permission so team members or secondary devices can sign into your account when you want.
          </p>
        </div>
        {onBack && (
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onBack}>
            ← Back to Administration
          </button>
        )}
      </div>

      {actionMessage && (
        <div className="alert alert-success alert-dismissible fade show shadow-sm" role="alert">
          {actionMessage}
          <button type="button" className="btn-close" onClick={() => setActionMessage('')} />
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <ul className="nav nav-pills nav-fill bg-white p-2 rounded-3 shadow-sm border mb-4">
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link fw-bold ${activeSubTab === 'manager' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('manager')}
          >
            🛡️ Device Passcode Manager &amp; Control
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link fw-bold ${activeSubTab === 'api-docs' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('api-docs')}
          >
            🔌 Device Authorization REST API &amp; Code Snippets
          </button>
        </li>
      </ul>

      {/* =========================================================
          SUB-TAB 1: DEVICE PASSCODE MANAGER
          ========================================================= */}
      {activeSubTab === 'manager' && (
        <>
          <div className="row g-4 mb-4">
            {/* Left: Master Access Toggle & Info */}
            <div className="col-lg-6">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-header bg-white py-3">
                  <h2 className="h5 mb-0 fw-bold">🛡️ Device Access Permission Status</h2>
                </div>
                <div className="card-body">
                  <div className="form-check form-switch p-3 bg-light rounded-3 border mb-3">
                    <input
                      className="form-check-input ms-0 me-3"
                      type="checkbox"
                      role="switch"
                      id="multiDeviceSwitch"
                      checked={multiDeviceEnabled}
                      onChange={handleToggleMultiDevice}
                      style={{ width: '2.8em', height: '1.4em', cursor: 'pointer' }}
                    />
                    <label
                      className="form-check-label fw-bold text-dark"
                      htmlFor="multiDeviceSwitch"
                      style={{ cursor: 'pointer' }}
                    >
                      {multiDeviceEnabled
                        ? '🔓 Remote Device Login Allowed'
                        : '🔒 Remote Device Login Restricted'}
                    </label>
                    <div className="small text-muted mt-1 ps-1">
                      {multiDeviceEnabled
                        ? 'Anyone with valid credentials or an active device passcode can log in from other phones, laptops, and tablets.'
                        : 'Logins from other devices require an active One-Time Device Passcode generated by you.'}
                    </div>
                  </div>

                  <div className="p-3 bg-primary-subtle text-primary border rounded-3 small">
                    <strong>💡 How it works:</strong>
                    <ul className="mb-0 ps-3 mt-1">
                      <li>You can generate a temporary 6-digit Device Passcode below.</li>
                      <li>Give the code to your employee, partner, or accountant on their device.</li>
                      <li>
                        They choose <strong>"🔑 Device Passcode Sign-In"</strong> on the login page and
                        enter the code.
                      </li>
                      <li>Once used or expired, access is locked unless authorized again.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: 1-Click Code Generator */}
            <div className="col-lg-6">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-header bg-white py-3">
                  <h2 className="h5 mb-0 fw-bold">⚡ Generate Temporary Device Passcode</h2>
                </div>
                <div className="card-body">
                  <form onSubmit={handleGenerateCode}>
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">
                        Device / Person Label (Optional)
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Sales Manager Phone, Accountant Laptop"
                        value={deviceLabel}
                        onChange={(e) => setDeviceLabel(e.target.value)}
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Passcode Validity Duration</label>
                      <select
                        className="form-select"
                        value={expiryMinutes}
                        onChange={(e) => setExpiryMinutes(e.target.value)}
                      >
                        <option value={15}>15 Minutes (Recommended for quick login)</option>
                        <option value={30}>30 Minutes</option>
                        <option value={60}>1 Hour</option>
                        <option value={720}>12 Hours (Half Day Shift)</option>
                        <option value={1440}>24 Hours (Full Day)</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary fw-bold w-100 py-2 shadow-sm"
                      disabled={loading}
                    >
                      {loading ? '⏳ Generating code...' : '🔑 Generate 6-Digit Device Passcode'}
                    </button>
                  </form>

                  {/* Display Generated Passcode Banner */}
                  {generatedCode && (
                    <div className="mt-3 p-3 bg-dark text-white rounded-3 text-center shadow">
                      <span className="badge bg-warning text-dark mb-2">⚡ Active Device Passcode</span>
                      <div className="fs-1 fw-bold font-monospace letter-spacing-2 text-warning mb-2">
                        {generatedCode.code}
                      </div>
                      <div className="small text-white-50 mb-3">
                        Account: <strong>{username}</strong> | Valid for:{' '}
                        <strong>{expiryMinutes} mins</strong>
                      </div>
                      <div className="d-flex justify-content-center gap-2 flex-wrap">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-light"
                          onClick={() => handleCopyCode(generatedCode.code)}
                        >
                          {copySuccess ? '✓ Copied!' : '📋 Copy Code'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-success fw-semibold"
                          onClick={() => shareWhatsApp(generatedCode.code, expiryMinutes)}
                        >
                          💬 Share on WhatsApp
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => handleRevoke(generatedCode.id)}
                        >
                          🚫 Revoke
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Table of Generated Device Codes */}
          <div className="card shadow-sm border-0">
            <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
              <div>
                <h2 className="h5 mb-0 fw-bold">📋 Authorized Device Passcodes History</h2>
                <small className="text-muted">
                  Review recently authorized access tokens and their redemption status.
                </small>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                onClick={loadCodes}
                disabled={loading}
              >
                🔄 Refresh
              </button>
            </div>
            <div className="card-body p-0">
              {deviceCodes.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <div className="fs-2 mb-2">📱</div>
                  <p className="mb-0">No device access passcodes generated yet.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Passcode</th>
                        <th>Target Device / Label</th>
                        <th>Created At</th>
                        <th>Expires At</th>
                        <th>Status</th>
                        <th className="text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deviceCodes.map((item) => {
                        const isExpired = new Date() > new Date(item.expiresAt);
                        let badgeClass = 'bg-success';
                        let statusText = '🟢 Active & Ready';

                        if (item.status === 'revoked') {
                          badgeClass = 'bg-danger';
                          statusText = '🚫 Revoked';
                        } else if (item.status === 'used') {
                          badgeClass = 'bg-primary';
                          statusText = '✓ Redeemed / Logged In';
                        } else if (isExpired) {
                          badgeClass = 'bg-secondary';
                          statusText = '⏱️ Expired';
                        }

                        return (
                          <tr key={item.id}>
                            <td>
                              <span className="fw-bold font-monospace fs-6 px-2 py-1 bg-light border rounded">
                                {item.code}
                              </span>
                            </td>
                            <td>
                              <div className="fw-semibold">{item.label || 'Other Device'}</div>
                              {item.usedByDevice && (
                                <small
                                  className="text-muted text-truncate d-block"
                                  style={{ maxWidth: '200px' }}
                                >
                                  {item.usedByDevice}
                                </small>
                              )}
                            </td>
                            <td className="small text-muted">
                              {new Date(item.createdAt).toLocaleTimeString('en-IN')}
                            </td>
                            <td className="small text-muted">
                              {new Date(item.expiresAt).toLocaleTimeString('en-IN')}
                            </td>
                            <td>
                              <span className={`badge ${badgeClass} text-white`}>{statusText}</span>
                            </td>
                            <td className="text-center">
                              {item.status === 'active' && !isExpired ? (
                                <div className="btn-group btn-group-sm">
                                  <button
                                    type="button"
                                    className="btn btn-outline-primary"
                                    onClick={() => handleCopyCode(item.code)}
                                  >
                                    📋 Copy
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-outline-danger"
                                    onClick={() => handleRevoke(item.id)}
                                  >
                                    🚫 Revoke
                                  </button>
                                </div>
                              ) : (
                                <span className="text-muted small">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* =========================================================
          SUB-TAB 2: REST API & CODE SNIPPETS
          ========================================================= */}
      {activeSubTab === 'api-docs' && (
        <div className="row g-4">
          {/* Left: Interactive API Runner */}
          <div className="col-lg-6 col-12">
            <div className="card shadow-sm border-0 mb-4">
              <div className="card-header bg-dark text-white py-3 d-flex justify-content-between align-items-center">
                <div>
                  <h2 className="h5 mb-0 fw-bold">⚡ Device Auth API Simulator</h2>
                  <small className="text-white-50">
                    Test REST endpoints for remote device passcodes and cross-device sign-in.
                  </small>
                </div>
                <span className="badge bg-success">REST API v1</span>
              </div>
              <div className="card-body">
                <form onSubmit={handleExecuteApi}>
                  <div className="mb-3">
                    <label className="form-label fw-bold small">1. Select Endpoint</label>
                    <select
                      className="form-select font-monospace small"
                      value={apiEndpoint}
                      onChange={(e) => {
                        setApiEndpoint(e.target.value);
                        setApiResponse(null);
                      }}
                    >
                      <option value="generate-passcode">
                        POST /api/v1/auth/device/generate-passcode (Generate 6-digit Code)
                      </option>
                      <option value="verify-passcode">
                        POST /api/v1/auth/device/verify-passcode (Authorize Device Login)
                      </option>
                      <option value="revoke-passcode">
                        POST /api/v1/auth/device/revoke-passcode (Revoke Passcode)
                      </option>
                      <option value="list-passcodes">
                        GET /api/v1/auth/device/list-passcodes (List Active Passcodes)
                      </option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Account Owner Username / ID</label>
                    <input
                      type="text"
                      className="form-control font-monospace"
                      value={apiOwner}
                      onChange={(e) => setApiOwner(e.target.value)}
                      placeholder="e.g. admin"
                      required
                    />
                  </div>

                  {apiEndpoint === 'generate-passcode' && (
                    <>
                      <div className="mb-3">
                        <label className="form-label small fw-semibold">Target Device Label</label>
                        <input
                          type="text"
                          className="form-control"
                          value={apiLabel}
                          onChange={(e) => setApiLabel(e.target.value)}
                          placeholder="e.g. Warehouse Tablet, Accountant Phone"
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label small fw-semibold">Validity (Minutes)</label>
                        <input
                          type="number"
                          className="form-control"
                          value={apiExpiry}
                          onChange={(e) => setApiExpiry(e.target.value)}
                          min={1}
                          max={1440}
                        />
                      </div>
                    </>
                  )}

                  {apiEndpoint === 'verify-passcode' && (
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">6-Digit Device Passcode</label>
                      <input
                        type="text"
                        maxLength={6}
                        className="form-control font-monospace fs-5 text-center fw-bold"
                        value={apiPasscode}
                        onChange={(e) => setApiPasscode(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••••"
                        required
                      />
                    </div>
                  )}

                  {apiEndpoint === 'revoke-passcode' && (
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Code ID to Revoke</label>
                      <input
                        type="text"
                        className="form-control font-monospace"
                        value={apiCodeId}
                        onChange={(e) => setApiCodeId(e.target.value)}
                        placeholder="e.g. devcode_1787429182_849201"
                        required
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    className="btn btn-primary fw-bold w-100 py-2 shadow-sm"
                    disabled={apiExecuting}
                  >
                    {apiExecuting ? '⏳ Calling REST API...' : '⚡ Execute Live API Request'}
                  </button>
                </form>

                {/* API Response Viewer */}
                {apiResponse && (
                  <div className="mt-4 border rounded-3 p-3 bg-light">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="small fw-bold text-dark">Live API Response:</span>
                      <div>
                        <span
                          className={`badge ${
                            apiResponse.status >= 200 && apiResponse.status < 300
                              ? 'bg-success'
                              : 'bg-danger'
                          } me-2`}
                        >
                          HTTP {apiResponse.status} {apiResponse.statusText}
                        </span>
                        <span className="badge bg-secondary">{apiResponse.latencyMs} ms</span>
                      </div>
                    </div>
                    <pre
                      className="p-3 bg-dark text-warning font-monospace small mb-0 rounded"
                      style={{ maxHeight: '220px', overflowY: 'auto' }}
                    >
                      {JSON.stringify(apiResponse.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Multi-Language Code Snippets */}
          <div className="col-lg-6 col-12">
            <div className="card shadow-sm border-0 mb-4">
              <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
                <h2 className="h5 mb-0 fw-bold">💻 Integration Code Snippets</h2>
                <div className="btn-group btn-group-sm">
                  <button
                    type="button"
                    className={`btn ${codeLang === 'curl' ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => setCodeLang('curl')}
                  >
                    cURL
                  </button>
                  <button
                    type="button"
                    className={`btn ${codeLang === 'javascript' ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => setCodeLang('javascript')}
                  >
                    JS / Fetch
                  </button>
                  <button
                    type="button"
                    className={`btn ${codeLang === 'python' ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => setCodeLang('python')}
                  >
                    Python
                  </button>
                  <button
                    type="button"
                    className={`btn ${codeLang === 'nodejs' ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => setCodeLang('nodejs')}
                  >
                    Node.js
                  </button>
                </div>
              </div>
              <div className="card-body p-0 position-relative">
                <pre
                  className="p-3 bg-dark text-success font-monospace small mb-0 rounded-bottom"
                  style={{ minHeight: '290px', overflowX: 'auto' }}
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

            {/* Quick Architecture Notes */}
            <div className="card shadow-sm border-0">
              <div className="card-header bg-white py-3">
                <h3 className="h6 mb-0 fw-bold">🌐 Cross-Device Security Highlights</h3>
              </div>
              <div className="card-body small text-muted">
                <ul className="ps-3 mb-0">
                  <li className="mb-2">
                    <strong>Firestore Sync:</strong> Device codes are written with ISO UTC timestamps and verified in real-time across all devices.
                  </li>
                  <li className="mb-2">
                    <strong>Single-Use Protection:</strong> Once a device signs in with a passcode, the code status updates to <code>used</code> to prevent replay attacks.
                  </li>
                  <li className="mb-2">
                    <strong>Instant 1-Click Revocation:</strong> Revoking a passcode invalidates authorization immediately worldwide.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DeviceAccessControl;

