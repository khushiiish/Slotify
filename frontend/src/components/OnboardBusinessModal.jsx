import { useState } from 'react';
import { X, Building2, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { onboardBusiness } from '../services/business.service.js';

const TIMEZONES = [
  'Asia/Kolkata',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'UTC',
];

export default function OnboardBusinessModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    timezone: 'Asia/Kolkata',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const errors = {};
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      errors.name = 'Business name must be at least 2 characters';
    }
    if (!formData.adminName.trim() || formData.adminName.trim().length < 2) {
      errors.adminName = 'Admin name must be at least 2 characters';
    }
    if (!formData.adminEmail.trim() || !/\S+@\S+\.\S+/.test(formData.adminEmail)) {
      errors.adminEmail = 'Please provide a valid admin email';
    }
    if (!formData.adminPassword || formData.adminPassword.length < 8) {
      errors.adminPassword = 'Password must be at least 8 characters';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        slug: formData.slug.trim() || undefined,
        contactEmail: formData.contactEmail.trim() || undefined,
        contactPhone: formData.contactPhone.trim() || undefined,
        address: formData.address.trim() || undefined,
        timezone: formData.timezone,
        adminName: formData.adminName.trim(),
        adminEmail: formData.adminEmail.trim().toLowerCase(),
        adminPassword: formData.adminPassword,
      };

      const result = await onboardBusiness(payload);
      onSuccess(result.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to onboard business');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(8, 8, 12, 0.35)',
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
        maxWidth: '680px',
        width: '100%',
        maxHeight: '90vh',
        boxShadow: 'var(--shadow)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        textAlign: 'left',
      }}>
        {/* Modal Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '18px 24px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--code-bg)',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--text-h)', fontWeight: 700 }}>
              Onboard New Business
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text)' }}>
              Register a new tenant organization and provision its initial Business Admin credentials.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
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

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 16px',
              borderRadius: '6px',
              background: '#fee2e2',
              border: '1px solid #fca5a5',
              color: '#991b1b',
              fontSize: '13px',
              fontWeight: 500,
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Business Profile */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              <Building2 size={16} color="var(--accent)" />
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-h)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                1. Business Information
              </h4>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 600, color: 'var(--text-h)' }}>
                  Business Name *
                </label>
                <input
                  type="text"
                  id="biz-name-input"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Apex Dental Care"
                  required
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${fieldErrors.name ? '#ef4444' : 'var(--border)'}`,
                    background: 'var(--bg)',
                    color: 'var(--text-h)',
                    fontSize: '13px',
                  }}
                />
                {fieldErrors.name && <span style={{ color: '#ef4444', fontSize: '11px' }}>{fieldErrors.name}</span>}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 600, color: 'var(--text-h)' }}>
                  Custom Slug (Optional)
                </label>
                <input
                  type="text"
                  id="biz-slug-input"
                  name="slug"
                  value={formData.slug}
                  onChange={handleChange}
                  placeholder="auto-generated if blank"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text-h)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 600, color: 'var(--text-h)' }}>
                  Timezone *
                </label>
                <select
                  name="timezone"
                  id="biz-timezone-select"
                  value={formData.timezone}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text-h)',
                    fontSize: '13px',
                  }}
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 600, color: 'var(--text-h)' }}>
                  Contact Email
                </label>
                <input
                  type="email"
                  id="biz-email-input"
                  name="contactEmail"
                  value={formData.contactEmail}
                  onChange={handleChange}
                  placeholder="contact@example.com"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text-h)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 600, color: 'var(--text-h)' }}>
                  Contact Phone
                </label>
                <input
                  type="text"
                  id="biz-phone-input"
                  name="contactPhone"
                  value={formData.contactPhone}
                  onChange={handleChange}
                  placeholder="+1-555-0100"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text-h)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 600, color: 'var(--text-h)' }}>
                  Business Address
                </label>
                <input
                  type="text"
                  id="biz-address-input"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="e.g. 104 MG Road, Indiranagar, Bengaluru"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text-h)',
                    fontSize: '13px',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Initial Admin Account */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              <UserPlus size={16} color="var(--accent)" />
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-h)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                2. Initial Business Admin Credentials
              </h4>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 600, color: 'var(--text-h)' }}>
                  Admin Full Name *
                </label>
                <input
                  type="text"
                  id="admin-name-input"
                  name="adminName"
                  value={formData.adminName}
                  onChange={handleChange}
                  placeholder="e.g. Dr. Marcus Vance"
                  required
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${fieldErrors.adminName ? '#ef4444' : 'var(--border)'}`,
                    background: 'var(--bg)',
                    color: 'var(--text-h)',
                    fontSize: '13px',
                  }}
                />
                {fieldErrors.adminName && <span style={{ color: '#ef4444', fontSize: '11px' }}>{fieldErrors.adminName}</span>}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 600, color: 'var(--text-h)' }}>
                  Admin Login Email *
                </label>
                <input
                  type="email"
                  id="admin-email-input"
                  name="adminEmail"
                  value={formData.adminEmail}
                  onChange={handleChange}
                  placeholder="admin@apexdental.com"
                  required
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${fieldErrors.adminEmail ? '#ef4444' : 'var(--border)'}`,
                    background: 'var(--bg)',
                    color: 'var(--text-h)',
                    fontSize: '13px',
                  }}
                />
                {fieldErrors.adminEmail && <span style={{ color: '#ef4444', fontSize: '11px' }}>{fieldErrors.adminEmail}</span>}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 600, color: 'var(--text-h)' }}>
                  Temporary Password *
                </label>
                <input
                  type="password"
                  id="admin-password-input"
                  name="adminPassword"
                  value={formData.adminPassword}
                  onChange={handleChange}
                  placeholder="Min. 8 characters"
                  required
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${fieldErrors.adminPassword ? '#ef4444' : 'var(--border)'}`,
                    background: 'var(--bg)',
                    color: 'var(--text-h)',
                    fontSize: '13px',
                  }}
                />
                {fieldErrors.adminPassword && <span style={{ color: '#ef4444', fontSize: '11px' }}>{fieldErrors.adminPassword}</span>}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            marginTop: '8px',
            paddingTop: '16px',
            borderTop: '1px solid var(--border)',
          }}>
            <button
              type="button"
              id="cancel-onboard-btn"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '10px 18px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text-h)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              id="submit-onboard-btn"
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 22px',
                borderRadius: '6px',
                border: 'none',
                background: 'var(--accent)',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                'Onboarding Tenant...'
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  Complete Onboarding
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
