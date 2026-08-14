import React, { useEffect, useState } from 'react';
import api from '../services/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [auditLog, setAuditLog] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/dashboard/admin/stats')
      .then(({ data }) => setStats(data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load admin stats'));

    api.get('/dashboard/admin/audit-log')
      .then(({ data }) => setAuditLog(data.entries))
      .catch((err) => console.error(err));
  }, []);

  if (error) return <div className="page-container"><p className="error">{error}</p></div>;
  if (!stats) return <div className="page-container">Loading admin dashboard...</div>;

  const completionRate = stats.totalSessions > 0
    ? ((stats.completedSessions / stats.totalSessions) * 100).toFixed(1)
    : 0;
  const dropOffRate = (100 - completionRate).toFixed(1);

  return (
    <div className="page-container">
      <h2>Admin Analytics Dashboard</h2>

      <div className="stats-row">
        <div className="stat-card"><span>{stats.totalUsers}</span><label>Total Users</label></div>
        <div className="stat-card"><span>{stats.totalSessions}</span><label>Total Sessions</label></div>
        <div className="stat-card"><span>{completionRate}%</span><label>Completion Rate</label></div>
        <div className="stat-card"><span>{dropOffRate}%</span><label>Drop-off Rate</label></div>
      </div>

      <h3>Average Score by Category</h3>
      {stats.avgScoreByCategory.length === 0 ? (
        <p>No category data yet.</p>
      ) : (
        <table className="history-table">
          <thead>
            <tr><th>Category</th><th>Average Score</th></tr>
          </thead>
          <tbody>
            {stats.avgScoreByCategory.map((row) => (
              <tr key={row.category}>
                <td>{row.category || 'Uncategorized'}</td>
                <td>{row.avg_score ? parseFloat(row.avg_score).toFixed(1) : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3 style={{ marginTop: 24 }}>Recent Admin Activity</h3>
      {auditLog.length === 0 ? (
        <p>No admin actions logged yet.</p>
      ) : (
        <table className="history-table">
          <thead><tr><th>Admin</th><th>Action</th><th>Time</th></tr></thead>
          <tbody>
            {auditLog.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.admin_name || 'Unknown'}</td>
                <td>{entry.action}</td>
                <td>{new Date(entry.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p style={{ color: '#888', fontSize: 13, marginTop: 20 }}>
        Lower average scores per category indicate weak topics across all candidates — useful for deciding which question categories need better prep resources.
      </p>
    </div>
  );
}