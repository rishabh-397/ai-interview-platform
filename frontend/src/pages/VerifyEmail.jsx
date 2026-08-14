import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../services/api';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('No verification token found in the link.');
      return;
    }

    api.get(`/auth/verify-email?token=${token}`)
      .then(({ data }) => {
        setStatus('success');
        setMessage(data.message);
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.error || 'Verification failed.');
      });
  }, [searchParams]);

  return (
    <div className="auth-container">
      <h2>Email Verification</h2>
      {status === 'verifying' && <p>Verifying your email...</p>}
      {status === 'success' && (
        <>
          <p style={{ color: '#4caf50' }}>{message}</p>
          <Link to="/dashboard">Go to Dashboard</Link>
        </>
      )}
      {status === 'error' && <p className="error">{message}</p>}
    </div>
  );
}