import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import ThemeToggle from './ThemeToggle.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const levelFor = (path) => {
    const mapping = {
      '/dashboard': 'level-beginner',
      '/leaderboard': 'level-advanced',
      '/chatbot': 'level-intermediate',
      '/resume-match': 'level-advanced',
      '/question-bank': 'level-intermediate',
      '/schedule': 'level-beginner',
      '/admin-dashboard': 'level-advanced',
      '/admin-live': 'level-advanced',
    };
    return mapping[path] || '';
  };

  return (
    <nav className="navbar">
      <Link to="/dashboard" className="brand">AI Interview Platform</Link>
      <div className="nav-links">
        <Link to="/dashboard" className={levelFor('/dashboard')}>Dashboard</Link>
        <Link to="/leaderboard" className={levelFor('/leaderboard')}>Leaderboard</Link>
        <Link to="/chatbot" className={levelFor('/chatbot')}>AI Coach</Link>
        <Link to="/resume-match" className={levelFor('/resume-match')}>Resume Match</Link>
        <Link to="/question-bank" className={levelFor('/question-bank')}>Question Bank</Link>
        <Link to="/schedule" className={levelFor('/schedule')}>Schedule</Link>
        {user?.role === 'admin' && <Link to="/admin-dashboard" className={levelFor('/admin-dashboard')}>Admin</Link>}
        {user?.role === 'admin' && <Link to="/admin-live" className={levelFor('/admin-live')}>Live Monitor</Link>}
        {user ? (
          <>
            <li>
              <Link to="/settings" className="nav-avatar" title="Account Settings">
                {user.name?.charAt(0).toUpperCase()}
              </Link>
            </li>
            <li>
              <button onClick={handleLogout} className="nav-cta">Logout</button>
            </li>
          </>
        ) : (
          <Link to="/login" className="nav-cta">Login</Link>
        )}
        <ThemeToggle />
      </div>
    </nav>
  );
}