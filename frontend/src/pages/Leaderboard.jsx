import React, { useEffect, useState } from 'react';
import api from '../services/api';

const CATEGORIES = ['overall', 'DSA', 'System Design', 'Behavioural', 'HR'];

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [category, setCategory] = useState('overall');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/dashboard/leaderboard?category=${encodeURIComponent(category)}`)
      .then(({ data }) => setLeaderboard(data.leaderboard))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [category]);

  return (
    <div className="page-container">
      <h2>Leaderboard</h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            style={{
              background: category === c ? 'var(--accent)' : '#262b36',
              padding: '6px 14px',
              fontSize: 13,
            }}
          >
            {c === 'overall' ? 'Overall' : c}
          </button>
        ))}
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : leaderboard.length === 0 ? (
        <p>No completed interviews in this category yet.</p>
      ) : (
        <table className="history-table">
          <thead>
            <tr><th>Rank</th><th>Name</th><th>Avg Score</th><th>Interviews</th><th>XP</th></tr>
          </thead>
          <tbody>
            {leaderboard.map((u, idx) => (
              <tr key={u.id}>
                <td>{idx + 1}</td>
                <td>{u.name}</td>
                <td>{u.avg_score ? parseFloat(u.avg_score).toFixed(1) : '-'}</td>
                <td>{u.interviews_taken}</td>
                <td>{u.xp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}