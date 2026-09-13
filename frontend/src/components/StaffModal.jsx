import { useState, useEffect } from 'react';
import { X, User, Mail, Phone, Briefcase } from 'lucide-react';

export default function StaffModal({ isOpen, onClose, onSuccess, staffToEdit, availableServices = [] }) {
  const isEditing = Boolean(staffToEdit);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    status: 'ACTIVE',
    serviceIds: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (staffToEdit) {
      // serviceIds may be an array of objects (if populated) or array of strings
      const assignedIds = (staffToEdit.serviceIds || []).map((s) => (typeof s === 'object' ? s._id : s));
      setFormData({
        name: staffToEdit.name || '',
        email: staffToEdit.email || '',
        phone: staffToEdit.phone || '',
        status: staffToEdit.status || 'ACTIVE',
        serviceIds: assignedIds,
      });
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        status: 'ACTIVE',
        serviceIds: [],
      });
    }
    setError(null);
  }, [staffToEdit, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleToggleService = (serviceId) => {
    setFormData((prev) => {
      const current = prev.serviceIds;
      if (current.includes(serviceId)) {
        return { ...prev, serviceIds: current.filter((id) => id !== serviceId) };
      } else {
        return { ...prev, serviceIds: [...current, serviceId] };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Staff name is required.');
      return;
    }

    setLoading(true);
    try {
      await onSuccess(formData, staffToEdit?._id);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save staff member.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="staff-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(8, 8, 12, 0.35)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
    >
      <div
        id="staff-modal"
        style={{
          background: 'var(--bg)',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          width: '100%',
          maxWidth: '540px',
          boxShadow: '0 20px 25px -5px rgba(8, 8, 12, 0.1), 0 8px 10px -6px rgba(8, 8, 12, 0.05)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--code-bg)',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-h)' }}>
              {isEditing ? 'Edit Staff Member' : 'Add Staff Member'}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text)' }}>
              {isEditing ? 'Update team member information & assigned services' : 'Register a staff member to deliver business services'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', overflowY: 'auto' }}>
          {error && (
            <div
              id="staff-modal-error"
              style={{
                marginBottom: '18px',
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                fontSize: '13px',
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label
                htmlFor="staff-name-input"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-h)',
                  marginBottom: '6px',
                }}
              >
                <User size={14} /> Full Name *
              </label>
              <input
                id="staff-name-input"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Dr. Maya Patel"
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--code-bg)',
                  color: 'var(--text-h)',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label
                htmlFor="staff-email-input"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-h)',
                  marginBottom: '6px',
                }}
              >
                <Mail size={14} /> Email Address
              </label>
              <input
                id="staff-email-input"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="e.g. maya@urbanwellness.com"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--code-bg)',
                  color: 'var(--text-h)',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label
                htmlFor="staff-phone-input"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-h)',
                  marginBottom: '6px',
                }}
              >
                <Phone size={14} /> Phone Number
              </label>
              <input
                id="staff-phone-input"
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="e.g. +1-555-0199"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--code-bg)',
                  color: 'var(--text-h)',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label
                htmlFor="staff-status-select"
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-h)',
                  marginBottom: '6px',
                }}
              >
                Status
              </label>
              <select
                id="staff-status-select"
                name="status"
                value={formData.status}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--code-bg)',
                  color: 'var(--text-h)',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>

            {/* Service Assignment Multi-Select */}
            <div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-h)',
                  marginBottom: '6px',
                }}
              >
                <Briefcase size={14} /> Assign Services
              </label>
              <p style={{ margin: '0 0 10px', fontSize: '12px', color: 'var(--text)' }}>
                Select the services this staff member is qualified to perform:
              </p>

              {availableServices.length === 0 ? (
                <div
                  style={{
                    padding: '14px',
                    borderRadius: '6px',
                    background: 'var(--code-bg)',
                    border: '1px dashed var(--border)',
                    fontSize: '13px',
                    color: 'var(--text)',
                    textAlign: 'center',
                  }}
                >
                  No active services found. Create services first to assign them to staff.
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    maxHeight: '180px',
                    overflowY: 'auto',
                    padding: '10px',
                    borderRadius: '6px',
                    background: 'var(--code-bg)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {availableServices.map((svc) => {
                    const isChecked = formData.serviceIds.includes(svc._id);
                    return (
                      <label
                        key={svc._id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          fontSize: '13px',
                          color: 'var(--text-h)',
                          cursor: 'pointer',
                          padding: '6px 8px',
                          borderRadius: '4px',
                          backgroundColor: isChecked ? 'var(--accent-bg)' : 'transparent',
                          transition: 'background-color 0.15s',
                        }}
                      >
                        <input
                          id={`staff-service-checkbox-${svc._id}`}
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleService(svc._id)}
                          style={{
                            cursor: 'pointer',
                            accentColor: 'var(--accent)',
                            width: '16px',
                            height: '16px',
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <span style={{ fontWeight: 600 }}>{svc.name}</span>
                          <span style={{ fontSize: '12px', color: 'var(--text)', marginLeft: '8px' }}>
                            ({svc.durationMinutes}m)
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div
            style={{
              marginTop: '24px',
              paddingTop: '16px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
            }}
          >
            <button
              id="cancel-staff-btn"
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '9px 18px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              id="submit-staff-btn"
              type="submit"
              disabled={loading}
              style={{
                padding: '9px 20px',
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
              {loading ? 'Saving...' : isEditing ? 'Update Staff' : 'Create Staff'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
