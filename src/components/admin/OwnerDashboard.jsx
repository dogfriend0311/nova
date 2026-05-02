import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import '../../OwnerDashboard.css';

const OwnerDashboard = ({ onExit }) => {
  const { logout, updateUserRole } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    setLoading(true);
    const stored = JSON.parse(localStorage.getItem('nova_users') || '[]');
    setUsers(stored);
    setLoading(false);
  };

  const changeRole = (username, role) => {
    const res = updateUserRole(username, role);
    if (res.success) {
      loadUsers();
    } else {
      alert(res.error || 'Failed to update role');
    }
  };

  return (
    <div className="owner-dashboard">
      <div className="dashboard-header">
        <h1 className="gradient-text">Owner Dashboard</h1>
        <div>
          <button className="neon-button" onClick={logout}>
            Logout
          </button>
          <button className="neon-button" onClick={onExit} style={{ marginLeft: '10px' }}>
            Back
          </button>
        </div>
      </div>

      <div className="dashboard-tabs">
        <h3>User Roles</h3>
      </div>

      <div className="dashboard-content">
        <div className="neon-card p-3">
          {loading && <div>Loading...</div>}
          {!loading && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Username</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Email</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Role</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.username} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '8px' }}>{u.username}</td>
                    <td style={{ padding: '8px' }}>{u.email}</td>
                    <td style={{ padding: '8px' }}>{u.role || 'member'}</td>
                    <td style={{ padding: '8px' }}>
                      <button className="neon-button" onClick={() => changeRole(u.username, 'member')}>Set Member</button>
                      <button className="neon-button" onClick={() => changeRole(u.username, 'admin')} style={{ marginLeft: '8px' }}>Set Admin</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default OwnerDashboard;
