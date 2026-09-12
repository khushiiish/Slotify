import { useState, useEffect } from 'react';
import { getHealthStatus } from './services/health.service.js';
import { useAuthStore } from './store/authStore.js';
import SystemOwnerDashboard from './pages/SystemOwnerDashboard.jsx';
import BusinessAdminDashboard from './pages/BusinessAdminDashboard.jsx';
import PublicBookingPage from './pages/PublicBookingPage.jsx';
import CustomerAppointmentView from './pages/CustomerAppointmentView.jsx';
import LandingPage from './pages/LandingPage.jsx';
import { Calendar, UserCheck, LogOut, LayoutDashboard, Globe } from 'lucide-react';
import './App.css';

function App() {
  // Backend health status
  const [healthData, setHealthData] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState(null);

  // Auth store
  const { user, isAuthenticated, isLoading: authLoading, error: authError, login, logout, checkAuth, clearError } = useAuthStore();

  // Form state for login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Path routing
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [searchParams, setSearchParams] = useState(window.location.search);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
      setSearchParams(window.location.search);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (url) => {
    window.history.pushState({}, '', url);
    setCurrentPath(window.location.pathname);
    setSearchParams(window.location.search);
    window.scrollTo(0, 0);
  };

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
    const success = await login({ email, password });
    setSubmitting(false);
    if (success) {
      navigateTo('/');
    }
  };

  const handleQuickFill = (demoEmail) => {
    setEmail(demoEmail);
    clearError();
  };

  // 1. Check if on public booking page /book/:slug
  if (currentPath.startsWith('/book/')) {
    const slug = currentPath.replace('/book/', '').split('/')[0];
    return (
      <div>
        <nav style={{
          borderBottom: '1px solid var(--border)',
          background: 'var(--code-bg)',
          padding: '12px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <button
            type="button"
            onClick={() => navigateTo('/')}
            style={{ background: 'none', border: 'none', color: 'var(--text-h)', fontSize: '18px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Calendar size={20} color="var(--accent)" />
            Slotify
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={() => navigateTo('/')}
              style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: '13px', cursor: 'pointer' }}
            >
              All Portals
            </button>
            <button
              type="button"
              id="header-signin-btn"
              onClick={() => navigateTo(isAuthenticated ? '/' : '/login')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text-h)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {isAuthenticated ? 'Dashboard' : 'Sign In'}
            </button>
          </div>
        </nav>
        <PublicBookingPage slug={slug} onNavigate={navigateTo} />
      </div>
    );
  }

  // 2. Check if on customer appointment view /appointments/:id or /customer/appointments/:id
  if (currentPath.startsWith('/customer/appointments/') || currentPath.startsWith('/appointments/')) {
    const appointmentId = currentPath.startsWith('/customer/appointments/')
      ? currentPath.replace('/customer/appointments/', '').split('/')[0]
      : currentPath.replace('/appointments/', '').split('/')[0];
    const token = new URLSearchParams(searchParams).get('token') || '';
    return (
      <div>
        <nav style={{
          borderBottom: '1px solid var(--border)',
          background: 'var(--code-bg)',
          padding: '12px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <button
            type="button"
            onClick={() => navigateTo('/')}
            style={{ background: 'none', border: 'none', color: 'var(--text-h)', fontSize: '18px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Calendar size={20} color="var(--accent)" />
            Slotify
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={() => navigateTo('/')}
              style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: '13px', cursor: 'pointer' }}
            >
              Home
            </button>
          </div>
        </nav>
        <CustomerAppointmentView appointmentId={appointmentId} token={token} onNavigate={navigateTo} />
      </div>
    );
  }

  // 3. Authenticated Dashboards on root route '/', '/owner', or '/admin'
  if ((currentPath === '/' || currentPath === '/owner' || currentPath === '/admin') && isAuthenticated) {
    if (user?.role === 'SYSTEM_OWNER') {
      return <SystemOwnerDashboard user={user} onLogout={logout} />;
    }
    if (user?.role === 'BUSINESS_ADMIN') {
      return <BusinessAdminDashboard user={user} onLogout={logout} />;
    }
  }

  // 4. Landing Page on root route '/' when unauthenticated
  if (currentPath === '/' && !isAuthenticated) {
    return (
      <div>
        <nav style={{
          borderBottom: '1px solid var(--border)',
          background: 'var(--code-bg)',
          padding: '12px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-h)', fontSize: '18px', fontWeight: 800 }}>
            <Calendar size={20} color="var(--accent)" />
            Slotify
          </div>
          <button
            type="button"
            id="nav-login-btn"
            onClick={() => navigateTo('/login')}
            style={{
              padding: '7px 16px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--accent)',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Admin Sign In
          </button>
        </nav>
        <LandingPage onNavigate={navigateTo} />
      </div>
    );
  }

  // 5. Explicit Login Route '/login'
  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px', textAlign: 'center' }}>
      <header style={{ marginBottom: '28px' }}>
        <button
          type="button"
          onClick={() => navigateTo('/')}
          style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: '13px', cursor: 'pointer', marginBottom: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          ← Return to Public Home
        </button>
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
          Slotify Platform Console
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
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  background: '#dcfce7',
                  color: '#166534',
                  letterSpacing: '0.5px',
                }}>
                  {user.role}
                </span>
                <h2 style={{ margin: '8px 0 0 0', fontSize: '24px', color: 'var(--text-h)' }}>
                  Welcome, {user.name}
                </h2>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => navigateTo('/')}
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: 'none',
                    background: 'var(--accent)',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  Open Dashboard
                </button>
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
                  }}
                >
                  Log Out
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', color: 'var(--text-h)' }}>
              Sign In to Slotify
            </h2>
            <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: 'var(--text)' }}>
              Sign in as System Owner or Business Admin.
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
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: 'var(--text-h)', marginBottom: '6px' }}>
                  Email Address
                </label>
                <input
                  id="login-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@urbanwellness.slotify.dev"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text-h)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: 'var(--text-h)', marginBottom: '6px' }}>
                  Password
                </label>
                <input
                  id="login-password-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text-h)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <button
                id="login-submit-btn"
                type="submit"
                disabled={submitting}
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '15px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: 'none',
                  background: 'var(--accent)',
                  color: '#fff',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.7 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                {submitting ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>

            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
              <p style={{ fontSize: '13px', color: 'var(--text)', margin: '0 0 10px 0', fontWeight: 500 }}>
                Evaluator Accounts (Quick-Fill Email):
              </p>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  id="quickfill-owner-btn"
                  onClick={() => handleQuickFill('superadmin@gmail.com')}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    cursor: 'pointer',
                  }}
                >
                  Super Admin
                </button>
                <button
                  type="button"
                  id="quickfill-admin-a-btn"
                  onClick={() => handleQuickFill('admin1@gmail.com')}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    cursor: 'pointer',
                  }}
                >
                  Admin 1 (Urban Wellness)
                </button>
                <button
                  type="button"
                  id="quickfill-admin-b-btn"
                  onClick={() => handleQuickFill('admin2@gmail.com')}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    cursor: 'pointer',
                  }}
                >
                  Admin 2 (TechFix)
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Backend Health Connection Banner */}
      <section style={{
        background: 'var(--code-bg)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '20px',
        textAlign: 'left',
        boxShadow: 'var(--shadow)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--text-h)' }}>
            System Connectivity Status
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
