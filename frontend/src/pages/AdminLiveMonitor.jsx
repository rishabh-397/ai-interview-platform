import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import api from '../services/api';

export default function AdminLiveMonitor() {
  const [liveSessions, setLiveSessions] = useState([]);
  const [typingMap, setTypingMap] = useState({});
  const [alertsMap, setAlertsMap] = useState({});
  const socketRef = useRef(null);
  const joinedRoomsRef = useRef(new Set());

  const loadLiveSessions = () => {
    api.get('/dashboard/admin/live-sessions')
      .then(({ data }) => setLiveSessions(data.liveSessions))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    loadLiveSessions();
    const interval = setInterval(loadLiveSessions, 5000);

    socketRef.current = io('/', { path: '/socket.io' });

    socketRef.current.on('typing-status', ({ sessionId, isTyping }) => {
      setTypingMap((prev) => ({ ...prev, [sessionId]: isTyping }));
    });

    socketRef.current.on('proctor-alert', ({ sessionId, eventType }) => {
      setAlertsMap((prev) => {
        const existing = prev[sessionId] || [];
        return { ...prev, [sessionId]: [eventType, ...existing].slice(0, 5) };
      });
    });

    return () => {
      clearInterval(interval);
      socketRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    liveSessions.forEach((session) => {
      if (!joinedRoomsRef.current.has(session.id)) {
        socketRef.current?.emit('join-session', session.id);
        joinedRoomsRef.current.add(session.id);
      }
    });
  }, [liveSessions]);

  return (
    <div className="page-container">
      <h2>Live Session Monitor</h2>
      <p style={{ color: '#888', marginBottom: 20 }}>
        Real-time view of candidates currently taking mock interviews. Refreshes every 5 seconds.
      </p>

      {liveSessions.length === 0 ? (
        <p>No active interview sessions right now.</p>
      ) : (
        liveSessions.map((session) => (
          <div key={session.id} className="answer-card">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>{session.candidate_name}</strong>
              <span className="category-tag">{session.company_name || 'General'}</span>
            </div>
            <p style={{ color: '#888', fontSize: 13, margin: '4px 0' }}>
              Started: {new Date(session.started_at).toLocaleTimeString()}
              {session.last_activity && ` · Last answer: ${new Date(session.last_activity).toLocaleTimeString()}`}
              {typingMap[session.id] && <span style={{ color: 'var(--accent)' }}> · ✍ typing now...</span>}
            </p>

            {alertsMap[session.id]?.length > 0 && (
              <div style={{ marginTop: 8 }}>
                {alertsMap[session.id].map((eventType, idx) => (
                  <span key={idx} style={{ display: 'inline-block', background: '#3a2020', color: '#f5a5a5', fontSize: 11, padding: '2px 8px', borderRadius: 10, marginRight: 6 }}>
                    ⚠ {eventType}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}