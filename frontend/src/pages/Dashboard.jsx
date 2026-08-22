import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../services/api';
import { useAuth } from '../context/AuthContext.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [questionCount, setQuestionCount] = useState(5);
  const [persona, setPersona] = useState('friendly');
  const [badges, setBadges] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [companySearch, setCompanySearch] = useState('');
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);

  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCompany, setFilterCompany] = useState('all');
  const [filterScoreRange, setFilterScoreRange] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  useEffect(() => {
    api.get('/interview/history')
      .then(({ data }) => setHistory(data.history))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));

    api.get('/badges/mine')
      .then(({ data }) => setBadges(data.badges))
      .catch((err) => console.error(err));

    api.get('/companies')
      .then(({ data }) => setCompanies(data.companies))
      .catch((err) => console.error(err));
  }, []);

  const filteredCompanyOptions = companies.filter((c) =>
    c.name.toLowerCase().includes(companySearch.toLowerCase())
  );

  const selectedCompanyName =
    companies.find((c) => c.id === selectedCompanyId)?.name ||
    'Any (General Practice)';

  const scoreInRange = (score, range) => {
    if (range === 'all' || score == null) return true;

    const s = parseFloat(score);

    if (range === 'lt30') return s < 30;
    if (range === '30-50') return s >= 30 && s < 50;
    if (range === '50-75') return s >= 50 && s < 75;
    if (range === 'gt75') return s >= 75;

    return true;
  };

  const filteredHistory = history.filter((s) => {
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;

    if (
      filterCompany !== 'all' &&
      String(s.company_name || 'General') !== filterCompany
    ) {
      return false;
    }

    if (!scoreInRange(s.overall_score, filterScoreRange)) return false;

    if (
      filterDateFrom &&
      new Date(s.started_at) < new Date(filterDateFrom)
    ) {
      return false;
    }

    if (
      filterDateTo &&
      new Date(s.started_at) > new Date(filterDateTo + 'T23:59:59')
    ) {
      return false;
    }

    return true;
  });

  const uniqueCompanyNames = [
    'all',
    ...new Set(history.map((s) => s.company_name || 'General')),
  ];

  return (
    <div className="page-container">
      <h2>Welcome back, {user?.name}</h2>

      <div className="stats-row">
        <div className="stat-card">
          <span>{user?.xp || 0}</span>
          <label>XP</label>
        </div>

        <div className="stat-card">
          <span>{history.length}</span>
          <label>Interviews Taken</label>
        </div>

        <div className="stat-card">
          <span>🔥 {user?.streak_count || 0}</span>
          <label>Day Streak</label>
        </div>
      </div>

      {badges.length > 0 && (
        <div style={{ margin: '20px 0' }}>
          <h3>Badges Earned</h3>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {badges.map((b) => (
              <div
                key={b.code}
                className="stat-card"
                style={{
                  flex: '0 0 auto',
                  minWidth: 140,
                }}
                title={b.description}
              >
                <span style={{ fontSize: 24 }}>{b.icon}</span>
                <label>{b.label}</label>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="actions-row">
        <label style={{ display: 'block', marginBottom: 8 }}>
          Company (optional)
        </label>

        <div
          style={{
            position: 'relative',
            maxWidth: 320,
            marginBottom: 16,
          }}
        >
          <input
            type="text"
            placeholder="Search companies or leave blank for general..."
            value={
              showCompanyDropdown
                ? companySearch
                : selectedCompanyName
            }
            onFocus={() => {
              setShowCompanyDropdown(true);
              setCompanySearch('');
            }}
            onChange={(e) => setCompanySearch(e.target.value)}
            onBlur={() =>
              setTimeout(() => setShowCompanyDropdown(false), 150)
            }
            style={{
              width: '100%',
              padding: 10,
              borderRadius: 6,
              background: '#0f1115',
              border: '1px solid #2c313d',
              color: '#e6e6e6',
            }}
          />

          {showCompanyDropdown && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: '#161922',
                border: '1px solid #262b36',
                borderRadius: 8,
                maxHeight: 220,
                overflowY: 'auto',
                zIndex: 50,
              }}
            >
              <div
                onMouseDown={() => {
                  setSelectedCompanyId('');
                  setShowCompanyDropdown(false);
                }}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  color: '#888',
                }}
              >
                Any (General Practice)
              </div>

              {filteredCompanyOptions.map((c) => (
                <div
                  key={c.id}
                  onMouseDown={() => {
                    setSelectedCompanyId(c.id);
                    setShowCompanyDropdown(false);
                  }}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  {c.logo_url && (
                    <img
                      src={c.logo_url}
                      alt=""
                      width={18}
                      height={18}
                      style={{
                        borderRadius: 4,
                        objectFit: 'contain',
                        background: 'white',
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  )}

                  {c.name}
                </div>
              ))}

              {filteredCompanyOptions.length === 0 && (
                <div
                  style={{
                    padding: '8px 12px',
                    color: '#888',
                  }}
                >
                  No matches
                </div>
              )}
            </div>
          )}
        </div>

        <label style={{ display: 'block', marginBottom: 8 }}>
          Number of questions: <strong>{questionCount}</strong>
        </label>

        <input
          type="range"
          min="1"
          max="25"
          value={questionCount}
          onChange={(e) => setQuestionCount(Number(e.target.value))}
          style={{
            width: '100%',
            maxWidth: 300,
          }}
        />

        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            marginTop: 12,
            alignItems: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            {['friendly', 'strict', 'technical'].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setPersona(option)}
                className={
                  persona === option
                    ? 'btn-primary'
                    : 'btn-secondary'
                }
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>

          <Link
            to={`/interview?count=${questionCount}${
              selectedCompanyId
                ? `&companyId=${selectedCompanyId}`
                : ''
            }&persona=${persona}`}
            className="btn-primary"
          >
            Start New Mock Interview
          </Link>
        </div>
      </div>

      <h3>Past Sessions</h3>

      {loading ? (
        <LoadingSpinner label="Loading your dashboard..." />
      ) : history.length === 0 ? (
        <p>No interviews yet. Start your first one above!</p>
      ) : (
        <>
          {history.filter((s) => s.status === 'completed').length >= 2 && (
            <div style={{ marginBottom: 24 }}>
              <h3>Progress Over Time</h3>

              <div
                style={{
                  width: '100%',
                  height: 220,
                }}
              >
                <ResponsiveContainer>
                  <LineChart
                    data={[...history]
                      .filter((s) => s.status === 'completed')
                      .reverse()
                      .map((s) => ({
                        date: new Date(
                          s.started_at
                        ).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        }),
                        score:
                          parseFloat(s.overall_score) || 0,
                      }))}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#262b36"
                    />

                    <XAxis
                      dataKey="date"
                      stroke="#888"
                      fontSize={12}
                    />

                    <YAxis
                      domain={[0, 100]}
                      stroke="#888"
                      fontSize={12}
                    />

                    <Tooltip
                      contentStyle={{
                        background: '#161922',
                        border: '1px solid #262b36',
                      }}
                    />

                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="var(--accent)"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Filters panel: company first, then status to align with table headers */}
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                flexWrap: 'wrap',
                padding: 12,
                borderRadius: 10,
                background: 'rgba(22,25,34,0.6)',
                border: '1px solid #334155',
                backdropFilter: 'blur(6px)',
              }}
            >
              {(() => {
                const inputBase = {
                  height: 40,
                  padding: '0 12px',
                  borderRadius: 8,
                  background: '#161922',
                  color: '#e6e6e6',
                  border: '1px solid #334155',
                  fontSize: 14,
                };

                return (
                  <>
                    <select
                      value={filterCompany}
                      onChange={(e) =>
                        setFilterCompany(e.target.value)
                      }
                      style={{
                        ...inputBase,
                        minWidth: 200,
                      }}
                    >
                      {uniqueCompanyNames.map((name) => (
                        <option key={name} value={name}>
                          {name === 'all'
                            ? 'All Companies'
                            : name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={filterStatus}
                      onChange={(e) =>
                        setFilterStatus(e.target.value)
                      }
                      style={{
                        ...inputBase,
                        minWidth: 160,
                      }}
                    >
                      <option value="all">
                        All Statuses
                      </option>
                      <option value="completed">
                        Completed
                      </option>
                      <option value="in_progress">
                        In Progress
                      </option>
                    </select>

                    <select
                      value={filterScoreRange}
                      onChange={(e) =>
                        setFilterScoreRange(e.target.value)
                      }
                      style={{
                        ...inputBase,
                        minWidth: 160,
                      }}
                    >
                      <option value="all">
                        Any Score
                      </option>
                      <option value="lt30">
                        Less than 30
                      </option>
                      <option value="30-50">
                        30 - 50
                      </option>
                      <option value="50-75">
                        50 - 75
                      </option>
                      <option value="gt75">
                        Greater than 75
                      </option>
                    </select>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <input
                        type="date"
                        value={filterDateFrom}
                        onChange={(e) =>
                          setFilterDateFrom(e.target.value)
                        }
                        style={{
                          ...inputBase,
                          width: 170,
                        }}
                      />

                      <span
                        style={{
                          color: '#94a3b8',
                          fontSize: 13,
                          padding: '0 4px',
                        }}
                      >
                        to
                      </span>

                      <input
                        type="date"
                        value={filterDateTo}
                        onChange={(e) =>
                          setFilterDateTo(e.target.value)
                        }
                        style={{
                          ...inputBase,
                          width: 170,
                        }}
                      />
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          <table className="history-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Status</th>
                <th>Score</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {filteredHistory.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    style={{
                      color: '#888',
                      textAlign: 'center',
                      padding: 16,
                    }}
                  >
                    No sessions match these filters.
                  </td>
                </tr>
              ) : (
                filteredHistory.map((s) => (
                  <tr key={s.id}>
                    <td>
                      {s.company_name || 'General'}
                    </td>

                    <td>{s.status}</td>

                    <td>
                      {s.overall_score ?? '-'}
                    </td>

                    <td>
                      {new Date(
                        s.started_at
                      ).toLocaleDateString()}
                    </td>

                    <td>
                      <Link to={`/report/${s.id}`}>
                        View Report
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}