import { useState, useEffect } from 'react';
import { getHealthStatus } from './services/health.service';
import './App.css';

function App() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkConnection = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getHealthStatus();
      setHealthData(data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to connect to backend');
      setHealthData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px', textAlign: 'center' }}>
      <header style={{ marginBottom: '32px' }}>
        <div style={{
          display: 'inline-block',
          padding: '6px 14px',
          borderRadius: '9999px',
          background: 'var(--accent-bg)',
          color: 'var(--accent)',
          fontSize: '13px',
          fontWeight: 600,
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          marginBottom: '16px',
          border: '1px solid var(--accent-border)'
        }}>
          Phase 0 Foundation
        </div>
        <h1 style={{ margin: '0 0 12px 0', fontSize: '42px', color: 'var(--text-h)', fontWeight: 700 }}>
          Slotify
        </h1>
        <p style={{ margin: 0, fontSize: '18px', color: 'var(--text)' }}>
          Multi-Tenant B2B Appointment Booking Platform
        </p>
      </header>

      <section style={{
        background: 'var(--code-bg)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '28px',
        textAlign: 'left',
        boxShadow: 'var(--shadow)',
        marginBottom: '28px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--text-h)' }}>
            Backend API Connection
          </h2>
          <button
            type="button"
            onClick={checkConnection}
            disabled={loading}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 500,
              borderRadius: '6px',
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--text-h)',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {loading ? 'Checking...' : 'Ping Health API'}
          </button>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px',
          borderRadius: '8px',
          background: loading ? '#fef3c7' : error ? '#fee2e2' : '#dcfce7',
          color: loading ? '#92400e' : error ? '#991b1b' : '#166534',
          marginBottom: '20px',
          fontWeight: 600,
        }}>
          <span style={{
            display: 'inline-block',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: loading ? '#f59e0b' : error ? '#ef4444' : '#22c55e',
          }}></span>
          <span>
            {loading
              ? 'Connecting to backend...'
              : error
              ? `Backend: Not connected (${error})`
              : 'Backend: Connected'}
          </span>
        </div>

        {healthData && (
          <div style={{ fontSize: '14px', color: 'var(--text)' }}>
            <p style={{ margin: '4px 0' }}>
              <strong>API Message:</strong> {healthData.message}
            </p>
            <p style={{ margin: '4px 0' }}>
              <strong>Environment:</strong> <code>{healthData.data?.environment}</code>
            </p>
            <p style={{ margin: '4px 0' }}>
              <strong>Target URL:</strong> <code>{import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/health</code>
            </p>
          </div>
        )}
      </section>

      <section style={{
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '24px',
        textAlign: 'left'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: 'var(--text-h)' }}>
          Phase 0 Foundation Checklist
        </h3>
        <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text)', lineHeight: 1.8, fontSize: '14px' }}>
          <li>Express Backend architecture initialized (ES Modules)</li>
          <li>Environment configuration centralized & validated</li>
          <li>Security middleware active (Helmet, CORS with credentials, Rate Limiting)</li>
          <li>Centralized 404 and Error handling configured</li>
          <li>Health check endpoint operational (<code>/api/health</code>)</li>
          <li>Frontend Axios client configured with environment variables</li>
          <li>Vitest automated test suite passing</li>
        </ul>
      </section>
    </div>
  );
}

export default App;
