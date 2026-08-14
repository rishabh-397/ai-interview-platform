import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext.jsx';

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Export / delete account
  const [password, setPassword] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  // API keys
  const [apiKeys, setApiKeys] = useState([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newlyCreatedKey, setNewlyCreatedKey] = useState(null);
  const [creatingKey, setCreatingKey] = useState(false);

  // Webhooks
  const [webhooks, setWebhooks] = useState([]);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [creatingWebhook, setCreatingWebhook] = useState(false);

  const loadApiKeys = () => {
    api.get('/api-keys').then(({ data }) => setApiKeys(data.keys)).catch((err) => console.error(err));
  };

  const loadWebhooks = () => {
    api.get('/webhooks').then(({ data }) => setWebhooks(data.webhooks)).catch((err) => console.error(err));
  };

  useEffect(() => {
    loadApiKeys();
    loadWebhooks();
  }, []);

  const handleExportData = async () => {
    setExporting(true);
    try {
      const { data } = await api.get('/user/export-data');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'my-data-export.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setError('');
    setDeleting(true);
    try {
      await api.delete('/user/account', { data: { password } });
      await logout();
      navigate('/signup');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete account.');
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateApiKey = async () => {
    setCreatingKey(true);
    setNewlyCreatedKey(null);
    try {
      const { data } = await api.post('/api-keys', { name: newKeyName || 'Unnamed key' });
      setNewlyCreatedKey(data.apiKey.api_key);
      setNewKeyName('');
      loadApiKeys();
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingKey(false);
    }
  };

  const handleRevokeApiKey = async (id) => {
    try {
      await api.delete(`/api-keys/${id}`);
      loadApiKeys();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateWebhook = async () => {
    if (!webhookUrl.trim()) return;
    setCreatingWebhook(true);
    try {
      await api.post('/webhooks', { targetUrl: webhookUrl, eventType: 'interview_completed' });
      setWebhookUrl('');
      loadWebhooks();
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingWebhook(false);
    }
  };

  const handleDeleteWebhook = async (id) => {
    try {
      await api.delete(`/webhooks/${id}`);
      loadWebhooks();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: 700 }}>
      <h2>Account Settings</h2>
      <p style={{ color: '#888' }}>Signed in as {user?.email}</p>

      <div className="answer-card" style={{ marginTop: 24 }}>
        <h3>Export My Data</h3>
        <p style={{ color: '#888', fontSize: 14 }}>
          Download a copy of your interview sessions, answers, badges, and progress as a JSON file.
        </p>
        <button onClick={handleExportData} disabled={exporting}>
          {exporting ? 'Preparing...' : '⬇ Download My Data'}
        </button>
      </div>

      <div className="answer-card" style={{ marginTop: 16 }}>
        <h3>API Keys</h3>
        <p style={{ color: '#888', fontSize: 14 }}>
          Generate a key to access your stats externally (e.g. <code>GET /api/public/my-stats</code> with header <code>X-API-Key</code>).
        </p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            type="text"
            placeholder="Key name (e.g. 'My Script')"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            style={{ flex: 1 }}
          />
          <button onClick={handleCreateApiKey} disabled={creatingKey}>
            {creatingKey ? 'Creating...' : '+ Generate Key'}
          </button>
        </div>

        {newlyCreatedKey && (
          <div style={{ background: '#182a1f', border: '1px solid #2e6b45', padding: 10, borderRadius: 8, marginBottom: 12, fontFamily: 'monospace', fontSize: 13, wordBreak: 'break-all' }}>
            ✅ New key (copy it now — you won't see it again): <br />
            <strong>{newlyCreatedKey}</strong>
          </div>
        )}

        {apiKeys.length === 0 ? (
          <p style={{ color: '#888', fontSize: 13 }}>No API keys yet.</p>
        ) : (
          apiKeys.map((k) => (
            <div key={k.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: '1px solid #262b36' }}>
              <div>
                <strong>{k.name}</strong>
                <p style={{ margin: 0, fontSize: 12, color: '#888', fontFamily: 'monospace' }}>{k.masked_key}</p>
              </div>
              <button onClick={() => handleRevokeApiKey(k.id)} style={{ background: '#a33', fontSize: 12 }}>Revoke</button>
            </div>
          ))
        )}
      </div>

      <div className="answer-card" style={{ marginTop: 16 }}>
        <h3>Webhooks</h3>
        <p style={{ color: '#888', fontSize: 14 }}>
          Get a POST request sent to a URL of your choice every time you complete an interview.
        </p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            type="text"
            placeholder="https://your-endpoint.com/webhook"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            style={{ flex: 1 }}
          />
          <button onClick={handleCreateWebhook} disabled={creatingWebhook}>
            {creatingWebhook ? 'Adding...' : '+ Add Webhook'}
          </button>
        </div>

        {webhooks.length === 0 ? (
          <p style={{ color: '#888', fontSize: 13 }}>No webhooks registered.</p>
        ) : (
          webhooks.map((w) => (
            <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: '1px solid #262b36' }}>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontFamily: 'monospace', wordBreak: 'break-all' }}>{w.target_url}</p>
                <p style={{ margin: 0, fontSize: 12, color: '#888' }}>Event: {w.event_type}</p>
              </div>
              <button onClick={() => handleDeleteWebhook(w.id)} style={{ background: '#a33', fontSize: 12 }}>Remove</button>
            </div>
          ))
        )}
      </div>

      <div className="answer-card" style={{ marginTop: 16, borderColor: '#a33' }}>
        <h3 style={{ color: '#f5a5a5' }}>Delete Account</h3>
        <p style={{ color: '#888', fontSize: 14 }}>
          This permanently deletes your account and all associated data. This cannot be undone.
        </p>
        {!confirming ? (
          <button onClick={() => setConfirming(true)} style={{ background: '#a33' }}>
            Delete My Account
          </button>
        ) : (
          <div style={{ marginTop: 8 }}>
            <input
              type="password"
              placeholder="Confirm your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ display: 'block', width: '100%', marginBottom: 8 }}
            />
            {error && <p className="error">{error}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleDeleteAccount} disabled={deleting || !password} style={{ background: '#a33' }}>
                {deleting ? 'Deleting...' : 'Confirm Permanent Deletion'}
              </button>
              <button onClick={() => { setConfirming(false); setPassword(''); setError(''); }} style={{ background: '#333' }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}