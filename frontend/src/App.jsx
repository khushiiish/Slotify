import { useState, useEffect } from 'react';
import { getHealthStatus } from './services/health.service.js';
import { useAuthStore } from './store/authStore.js';
import './App.css';

function App() {
  // Backend health status
  const [healthData, setHealthData] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState(null);

  // Auth store
  const { user, isAuthenticated, isLoading: authLoading, error: authError, login, logout, checkAuth, clearError } = useAuthStore();

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const checkConnection = async () => {
    setHealthLoading(true);
    setHealthError(null);
    try {
      const data = await getHealthStatus();
      setHealthData(data);
    } catch (err) {
      setHealthError(err.response?.data?.message || err.message || 'Unable to connect to backend');
      setHealthData(null);
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    checkConnection();
    checkAuth();
  }, [checkAuth]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setSubmitting(true);
    await login({ email, password });
    setSubmitting(false);
  };

  const handleQuickFill = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    clearError();
  };

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px', textAlign: 'center' }}>
      <header style={{ marginBottom: '28px' }}>
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
          Phase 2 Authentication Foundation
        </div>
        <h1 style={{ margin: '0 0 12px 0', fontSize: '40px', color: 'var(--text-h)', fontWeight: 700 }}>
          Slotify
        </h1>
        <p style={{ margin: 0, fontSize: '18px', color: 'var(--text)' }}>
          Multi-Tenant B2B Appointment Booking Platform
        </p>
      </header>

      {/* Authentication Card */}
      <section style={{
        background: 'var(--code-bg)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '28px',
        textAlign: 'left',
        boxShadow: 'var(--shadow)',
        marginBottom: '28px'
      }}>
        {authLoading ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text)' }}>
            <p>Checking authentication session...</p>
          </div>
        ) : isAuthenticated && user ? (
          /* Authenticated User View */
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  background: user.role === 'SYSTEM_OWNER' ? '#e0e7ff' : '#dcfce7',
                  color: user.role === 'SYSTEM_OWNER' ? '#3730a3' : '#166534',
                  letterSpacing: '0.5px',
                }}>
                  {user.role}
                </span>
                <h2 style={{ margin: '8px 0 0 0', fontSize: '24px', color: 'var(--text-h)' }}>
                  Welcome, {user.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={logout}
                style={{
                  padding: '8px 18px',
                  fontSize: '14px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: '#dc2626',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                Log Out
              </button>
            </div>

            <div style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '16px',
              fontSize: '14px',
              lineHeight: 1.8,
              color: 'var(--text)'
            }}>
              <div><strong>Email:</strong> {user.email}</div>
              <div><strong>User ID:</strong> <code>{user.id}</code></div>
              <div><strong>Status:</strong> <span style={{ color: '#16a34a', fontWeight: 600 }}>{user.status}</span></div>
              <div>
                <strong>Tenant Association:</strong>{' '}
                {user.businessId ? (
                  <code>Business ID: {user.businessId}</code>
                ) : (
                  <em>None (Platform System Owner)</em>
                )}
              </div>
              <div style={{ marginTop: '8px', fontSize: '13px', color: '#6b7280' }}>
                Session secured via HTTP-only cookie (<code>slotify_token</code>). Token is never exposed to JavaScript.
              </div>
            </div>
          </div>
        ) : (
          /* Unauthenticated Login View */
          <div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', color: 'var(--text-h)' }}>
              Sign In to Slotify
            </h2>
            <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: 'var(--text)' }}>
              Sign in as System Owner or Business Admin to verify Phase 2 authentication.
            </p>

            {authError && (
              <div style={{
                background: '#fee2e2',
                border: '1px solid #fca5a5',
                color: '#991b1b',
                padding: '12px',
                borderRadius: '6px',
                marginBottom: '16px',
                fontSize: '14px',
              }}>
                {authError}
              </div>
            )}

            <form onSubmit={handleLoginSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--text-h)' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text-h)',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--text-h)' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text-h)',
                    fontSize: '14px',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'var(--accent)',
                  color: '#fff',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  transition: 'opacity 0.2s ease',
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>

            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>
                Development Quick-Fill Credentials:
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => handleQuickFill('owner@slotify.dev', 'DevPassword123!')}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    borderRadius: '4px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    cursor: 'pointer',
                  }}
                >
                  System Owner Demo
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('admin@urbanwellness.slotify.dev', 'DevPassword123!')}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    borderRadius: '4px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    cursor: 'pointer',
                  }}
                >
                  Urban Wellness Admin Demo
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Backend API Health Status Card (Preserved from Phase 0) */}
      <section style={{
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '24px',
        textAlign: 'left',
        marginBottom: '28px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-h)' }}>
            System Health Monitoring
          </h3>
          <button
            type="button"
            onClick={checkConnection}
            disabled={healthLoading}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 500,
              borderRadius: '6px',
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--text-h)',
              cursor: healthLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {healthLoading ? 'Pinging...' : 'Ping API'}
          </button>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 14px',
          borderRadius: '6px',
          background: healthLoading ? '#fef3c7' : healthError ? '#fee2e2' : '#dcfce7',
          color: healthLoading ? '#92400e' : healthError ? '#991b1b' : '#166534',
          fontSize: '14px',
          fontWeight: 600,
        }}>
          <span style={{
            display: 'inline-block',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: healthLoading ? '#f59e0b' : healthError ? '#ef4444' : '#22c55e',
          }}></span>
          <span>
            {healthLoading
              ? 'Connecting to backend...'
              : healthError
              ? `Backend: Not connected (${healthError})`
              : 'Backend: Connected & Operational'}
          </span>
        </div>
      </section>
    </div>
  );
}

export default App;
