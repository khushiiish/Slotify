import { X, Building2, User, Globe, MapPin, Mail, Phone, Calendar, Power } from 'lucide-react';

export default function BusinessDetailsModal({
  isOpen,
  business,
  onClose,
  onToggleStatus,
}) {
  if (!isOpen || !business) return null;

  const isActive = business.status === 'ACTIVE';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.55)',
      backdropFilter: 'blur(3px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
      boxSizing: 'border-box',
    }}>
      <div style={{
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        maxWidth: '600px',
        width: '100%',
        boxShadow: 'var(--shadow)',
        overflow: 'hidden',
        textAlign: 'left',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '18px 24px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--code-bg)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Building2 size={20} color="var(--accent)" />
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-h)', fontWeight: 700 }}>
                {business.name}
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--text)' }}>
                Tenant Slug: <code>{business.slug}</code>
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text)',
              padding: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Status Banner */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            borderRadius: '8px',
            background: isActive ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${isActive ? '#bbf7d0' : '#fecaca'}`,
          }}>
            <div>
              <span style={{
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: '9999px',
                background: isActive ? '#dcfce7' : '#fee2e2',
                color: isActive ? '#166534' : '#991b1b',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                marginBottom: '4px',
              }}>
                {business.status}
              </span>
              <p style={{ margin: 0, fontSize: '13px', color: isActive ? '#166534' : '#991b1b' }}>
                {isActive
                  ? 'Tenant is active. Business Admin and booking services are operational.'
                  : 'Tenant is disabled. Business Admin access and operations are halted.'}
              </p>
            </div>
            <button
              type="button"
              id="toggle-details-status-btn"
              onClick={() => onToggleStatus(business)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: isActive ? '#dc2626' : '#16a34a',
                cursor: 'pointer',
              }}
            >
              <Power size={14} />
              {isActive ? 'Disable Tenant' : 'Enable Tenant'}
            </button>
          </div>

          {/* Business Details Grid */}
          <div>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 700, color: 'var(--text-h)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Business Profile
            </h4>
            <div style={{
              background: 'var(--code-bg)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '14px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              fontSize: '13px',
            }}>
              <div>
                <span style={{ color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={13} /> Contact Email:
                </span>
                <span style={{ fontWeight: 600, color: 'var(--text-h)' }}>
                  {business.contactEmail || 'None provided'}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Phone size={13} /> Contact Phone:
                </span>
                <span style={{ fontWeight: 600, color: 'var(--text-h)' }}>
                  {business.contactPhone || 'None provided'}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Globe size={13} /> Timezone:
                </span>
                <span style={{ fontWeight: 600, color: 'var(--text-h)' }}>
                  {business.timezone}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={13} /> Onboarded:
                </span>
                <span style={{ fontWeight: 600, color: 'var(--text-h)' }}>
                  {business.createdAt ? new Date(business.createdAt).toLocaleDateString() : '—'}
                </span>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={13} /> Address:
                </span>
                <span style={{ fontWeight: 600, color: 'var(--text-h)' }}>
                  {business.address || 'None provided'}
                </span>
              </div>
            </div>
          </div>

          {/* Initial Admin Details */}
          {business.admin && (
            <div>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 700, color: 'var(--text-h)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Initial Business Administrator
              </h4>
              <div style={{
                background: 'var(--code-bg)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '14px',
                fontSize: '13px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <User size={15} color="var(--accent)" />
                  <span style={{ fontWeight: 700, color: 'var(--text-h)' }}>{business.admin.name}</span>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: business.admin.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2',
                    color: business.admin.status === 'ACTIVE' ? '#166534' : '#991b1b',
                  }}>
                    {business.admin.status}
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--text)' }}>Email: </span>
                  <code style={{ fontSize: '12px' }}>{business.admin.email}</code>
                </div>
                <div>
                  <span style={{ color: 'var(--text)' }}>User ID: </span>
                  <code style={{ fontSize: '12px' }}>{business.admin.id}</code>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          padding: '14px 24px',
          background: 'var(--code-bg)',
          borderTop: '1px solid var(--border)',
        }}>
          <button
            type="button"
            id="close-details-btn"
            onClick={onClose}
            style={{
              padding: '8px 18px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--text-h)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
