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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: '18px', color: 'var(--text-h)' }}>
              Slotify
            </span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '9999px',
              background: user?.role === 'SYSTEM_OWNER' ? '#e0e7ff' : '#ecfdf5',
              color: user?.role === 'SYSTEM_OWNER' ? '#3730a3' : '#065f46',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.4px',
              textTransform: 'uppercase',
            }}>
              <ShieldCheck size={12} />
              {user?.role === 'SYSTEM_OWNER' ? 'Platform Owner' : 'Business Admin'}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text)' }}>
            {user?.role === 'SYSTEM_OWNER'
              ? 'B2B Multi-Tenant Platform Administration'
              : 'Business Management Console'}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-h)', whiteSpace: 'nowrap' }}>
            {user?.name || (user?.role === 'SYSTEM_OWNER' ? 'System Owner' : 'Business Admin')}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text)', whiteSpace: 'nowrap' }}>
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
            whiteSpace: 'nowrap',
            flexShrink: 0,
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
