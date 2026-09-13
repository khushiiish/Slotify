import { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, CheckCircle2, Building2 } from 'lucide-react';

const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
];

/**
 * Converts 24-hour time "HH:mm" to 12-hour "hh:mm AM/PM"
 */
const formatTime12 = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  const h = parseInt(parts[0], 10);
  const m = parts[1];
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${m} ${period}`;
};

export default function AvailabilityModal({
  isOpen,
  onClose,
  onSuccess,
  availabilityToEdit,
  staffList = [],
}) {
  const isEditing = Boolean(availabilityToEdit);

  const [formData, setFormData] = useState({
    staffId: '',
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '17:00',
    isActive: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (availabilityToEdit) {
      setFormData({
        staffId: availabilityToEdit.staffId?._id || availabilityToEdit.staffId || '',
        dayOfWeek: availabilityToEdit.dayOfWeek !== undefined ? availabilityToEdit.dayOfWeek : 1,
        startTime: availabilityToEdit.startTime || '09:00',
        endTime: availabilityToEdit.endTime || '17:00',
        isActive: availabilityToEdit.isActive !== undefined ? availabilityToEdit.isActive : true,
      });
    } else {
      setFormData({
        staffId: '',
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '17:00',
        isActive: true,
      });
    }
    setError(null);
  }, [availabilityToEdit, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? checked
          : name === 'dayOfWeek'
          ? parseInt(value, 10)
          : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (formData.startTime >= formData.endTime) {
      setError('Start time must be strictly before end time.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        dayOfWeek: formData.dayOfWeek,
        startTime: formData.startTime,
        endTime: formData.endTime,
        staffId: formData.staffId ? formData.staffId : null,
        isActive: formData.isActive,
      };

      await onSuccess(payload, availabilityToEdit?._id);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save availability window.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="availability-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
        boxSizing: 'border-box',
      }}
    >
      <div
        id="availability-modal-content"
        style={{
          background: 'var(--bg)',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          width: '100%',
          maxWidth: '520px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          textAlign: 'left',
          boxSizing: 'border-box',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: 'rgba(99, 102, 241, 0.15)',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Calendar size={20} />
            </div>
            <div>
              <h2
                id="availability-modal-title"
                style={{
                  margin: 0,
                  fontSize: '17px',
                  fontWeight: 700,
                  color: 'var(--text-h)',
                  letterSpacing: '-0.2px',
                }}
              >
                {isEditing ? 'Edit Availability Window' : 'Add Availability Window'}
              </h2>
              <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--text)' }}>
                Configure weekly working hours for the business or specific staff
              </p>
            </div>
          </div>
          <button
            type="button"
            id="availability-close-btn"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
            title="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', overflowY: 'auto' }}>
          {error && (
            <div
              id="availability-modal-error"
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

          {/* Scope: Business vs Staff */}
          <div style={{ marginBottom: '18px' }}>
            <label
              htmlFor="availability-staff-select"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-h)',
                marginBottom: '6px',
              }}
            >
              <User size={14} color="var(--accent)" />
              Schedule Scope
            </label>
            <select
              id="availability-staff-select"
              name="staffId"
              value={formData.staffId}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text-h)',
                fontSize: '13px',
                boxSizing: 'border-box',
              }}
            >
              <option value="">🏢 Business-Wide (Default Fallback)</option>
              {staffList.map((st) => (
                <option key={st._id} value={st._id}>
                  👤 {st.name} ({st.status})
                </option>
              ))}
            </select>
            <p style={{ margin: '5px 0 0', fontSize: '11px', color: 'var(--text)' }}>
              Staff-specific schedules override business working hours for that weekday.
            </p>
          </div>

          {/* Day of Week */}
          <div style={{ marginBottom: '18px' }}>
            <label
              htmlFor="availability-day-select"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-h)',
                marginBottom: '6px',
              }}
            >
              <Calendar size={14} color="var(--accent)" />
              Day of Week
            </label>
            <select
              id="availability-day-select"
              name="dayOfWeek"
              value={formData.dayOfWeek}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text-h)',
                fontSize: '13px',
                boxSizing: 'border-box',
              }}
            >
              {DAYS_OF_WEEK.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          {/* Start and End Times */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              marginBottom: '18px',
            }}
          >
            <div>
              <label
                htmlFor="availability-start-time"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-h)',
                  marginBottom: '6px',
                }}
              >
                <Clock size={14} color="var(--accent)" />
                Start Time (24h)
              </label>
              <input
                id="availability-start-time"
                type="time"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text-h)',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
              <span style={{ display: 'block', fontSize: '11px', color: 'var(--text)', marginTop: '4px' }}>
                {formatTime12(formData.startTime)}
              </span>
            </div>

            <div>
              <label
                htmlFor="availability-end-time"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-h)',
                  marginBottom: '6px',
                }}
              >
                <Clock size={14} color="var(--accent)" />
                End Time (24h)
              </label>
              <input
                id="availability-end-time"
                type="time"
                name="endTime"
                value={formData.endTime}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text-h)',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
              <span style={{ display: 'block', fontSize: '11px', color: 'var(--text)', marginTop: '4px' }}>
                {formatTime12(formData.endTime)}
              </span>
            </div>
          </div>

          {/* Active Status */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 14px',
              background: 'var(--code-bg)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              marginBottom: '20px',
            }}
          >
            <input
              id="availability-active-checkbox"
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              style={{
                width: '18px',
                height: '18px',
                accentColor: 'var(--accent)',
                cursor: 'pointer',
              }}
            />
            <label
              htmlFor="availability-active-checkbox"
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-h)',
                cursor: 'pointer',
              }}
            >
              Window is active and open for slot calculation
            </label>
          </div>

          {/* Modal Actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
              paddingTop: '16px',
              borderTop: '1px solid var(--border)',
            }}
          >
            <button
              id="availability-cancel-btn"
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--code-bg)',
                color: 'var(--text-h)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Cancel
            </button>
            <button
              id="availability-submit-btn"
              type="submit"
              disabled={loading}
              style={{
                padding: '9px 20px',
                borderRadius: '8px',
                border: 'none',
                background: 'var(--accent)',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.25)',
                transition: 'all 0.15s ease',
              }}
            >
              {loading ? (
                <>
                  <div
                    style={{
                      width: '14px',
                      height: '14px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                    }}
                  />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>{isEditing ? 'Update Window' : 'Create Window'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
