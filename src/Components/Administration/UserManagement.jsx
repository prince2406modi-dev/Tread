import { useState } from 'react';

function UserManagement({
  users = [],
  currentUser,
  onSwitchUser,
  onAddUser,
  onLogout,
  onBack
}) {
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [role, setRole] = useState('Operator');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleCreate = (e) => {
    e.preventDefault();
    const trimmedUser = newUsername.trim();
    const trimmedPass = newPassword.trim();

    if (!trimmedUser || !trimmedPass) {
      setError('Please provide username and password.');
      return;
    }

    if (users.some((u) => u.username === trimmedUser)) {
      setError('Username already exists. Choose another.');
      return;
    }

    if (onAddUser) {
      onAddUser({ username: trimmedUser, password: trimmedPass, role });
    }

    setNewUsername('');
    setNewPassword('');
    setError('');
    setMessage(`User "${trimmedUser}" created successfully.`);
    setTimeout(() => setMessage(''), 4000);
  };

  return (
    <div className="py-3">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1">User & Operator Management</h1>
          <p className="text-muted mb-0">
            Manage system access accounts, switch active operators, or add new staff members.
          </p>
        </div>
        {onBack && (
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onBack}>
            ← Back to Dashboard
          </button>
        )}
      </div>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-4">
        {/* Active Users Table */}
        <div className="col-lg-7">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
              <h2 className="h5 mb-0 fw-bold">👥 Registered Users ({users.length})</h2>
              {currentUser && (
                <span className="badge bg-primary">
                  Active: {currentUser.username}
                </span>
              )}
            </div>
            <div className="card-body p-0">
              {users.length === 0 ? (
                <div className="text-center py-4 text-muted">No users registered yet.</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Username</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th className="text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => {
                        const isCurrent = currentUser?.username === user.username;
                        return (
                          <tr key={user.username} className={isCurrent ? 'table-primary' : ''}>
                            <td className="fw-semibold">
                              {user.username}
                              {isCurrent && <span className="badge bg-success ms-2">Current</span>}
                            </td>
                            <td>{user.role || 'Operator'}</td>
                            <td>
                              <span className="badge bg-light text-dark border">
                                Local Account
                              </span>
                            </td>
                            <td className="text-center">
                              {isCurrent ? (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={onLogout}
                                >
                                  Sign Out
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => onSwitchUser(user.username)}
                                >
                                  Switch To
                                </button>
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
        </div>

        {/* Add User Form */}
        <div className="col-lg-5">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white py-3">
              <h2 className="h5 mb-0 fw-bold">➕ Create New Operator</h2>
            </div>
            <div className="card-body">
              <form onSubmit={handleCreate}>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Username *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. cashier1"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">Password *</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Enter password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="form-label fw-semibold">Role</label>
                  <select
                    className="form-select"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="Operator">Billing Operator</option>
                    <option value="Manager">Account Manager</option>
                    <option value="Admin">Administrator</option>
                  </select>
                </div>

                <button type="submit" className="btn btn-primary w-100">
                  ＋ Register Operator
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserManagement;
