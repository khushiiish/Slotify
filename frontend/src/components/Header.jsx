import { ShieldCheck, LogOut } from 'lucide-react';

export default function Header({ user, onLogout }) {
  return (
    <header style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 24px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--code-bg)',
      width: '100%',
      boxSizing: 'border-box',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          background: 'var(--accent)',
          color: '#fff',
          fontWeight: 800,
          fontSize: '18px',
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          S
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 700, fontSize: '18px', color: 'var(--text-h)' }}>
              Slotify
            </span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '9999px',
              background: '#e0e7ff',
              color: '#3730a3',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.4px',
              textTransform: 'uppercase',
            }}>
              <ShieldCheck size={12} />
              Platform Owner
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text)' }}>
            B2B Multi-Tenant Platform Administration
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-h)' }}>
            {user?.name || 'System Owner'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text)' }}>
            {user?.email}
          </div>
        </div>
        <button
          type="button"
          id="logout-btn"
          onClick={onLogout}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            fontSize: '13px',
            fontWeight: 600,
            borderRadius: '6px',
            border: '1px solid var(--border)',
            background: 'var(--bg)',
            color: '#dc2626',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          title="Sign out of platform console"
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </header>
  );
}
