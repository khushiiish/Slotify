import { useState, useEffect } from 'react';
import { X, CalendarX, User, AlignLeft, CheckCircle2, Calendar } from 'lucide-react';

export default function BlockedDateModal({
  isOpen,
  onClose,
  onSuccess,
  blockedDateToEdit,
  staffList = [],
}) {
  const isEditing = Boolean(blockedDateToEdit);

  const [formData, setFormData] = useState({
    staffId: '',
    date: '',
    reason: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (blockedDateToEdit) {
      const rawDate = blockedDateToEdit.date ? new Date(blockedDateToEdit.date) : null;
      const formattedDate = rawDate ? rawDate.toISOString().split('T')[0] : '';

      setFormData({
        staffId: blockedDateToEdit.staffId?._id || blockedDateToEdit.staffId || '',
        date: formattedDate,
        reason: blockedDateToEdit.reason || '',
      });
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setFormData({
        staffId: '',
        date: tomorrow.toISOString().split('T')[0],
        reason: '',
      });
    }
    setError(null);
  }, [blockedDateToEdit, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.date) {
      setError('Date is required.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        date: formData.date,
        reason: formData.reason.trim(),
        staffId: formData.staffId ? formData.staffId : null,
      };

      await onSuccess(payload, blockedDateToEdit?._id);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save blocked date.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="blocked-date-modal-backdrop"
      style={{
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
        padding: '16px',
        boxSizing: 'border-box',
      }}
    >
      <div
        id="blocked-date-modal-content"
        style={{
          background: 'var(--bg)',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          width: '100%',
          maxWidth: '520px',
          boxShadow: '0 20px 25px -5px rgba(8, 8, 12, 0.1), 0 8px 10px -6px rgba(8, 8, 12, 0.05)',
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
                background: 'rgba(244, 63, 94, 0.15)',
                color: '#fb7185',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <CalendarX size={20} />
            </div>
            <div>
              <h2
                id="blocked-date-modal-title"
                style={{
                  margin: 0,
                  fontSize: '17px',
                  fontWeight: 700,
                  color: 'var(--text-h)',
                  letterSpacing: '-0.2px',
                }}
              >
                {isEditing ? 'Edit Blocked Date' : 'Block a Date'}
              </h2>
              <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--text)' }}>
                Mark dates unavailable for booking platform-wide or for specific staff
              </p>
            </div>
          </div>
          <button
            type="button"
            id="blocked-date-close-btn"
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
              id="blocked-date-modal-error"
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
              htmlFor="blocked-date-staff-select"
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
              <User size={14} color="#fb7185" />
              Blocked Scope
            </label>
            <select
              id="blocked-date-staff-select"
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
              <option value="">🏢 Entire Business (All Staff Blocked)</option>
              {staffList.map((st) => (
                <option key={st._id} value={st._id}>
                  👤 Staff: {st.name} ({st.status})
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker */}
          <div style={{ marginBottom: '18px' }}>
            <label
              htmlFor="blocked-date-picker"
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
              <Calendar size={14} color="#fb7185" />
              Date to Block
            </label>
            <input
              id="blocked-date-picker"
              type="date"
              name="date"
              value={formData.date}
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
          </div>

          {/* Reason */}
          <div style={{ marginBottom: '22px' }}>
            <label
              htmlFor="blocked-date-reason"
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
              <AlignLeft size={14} color="#fb7185" />
              Reason (Optional)
            </label>
            <input
              id="blocked-date-reason"
              type="text"
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              placeholder="e.g. National Holiday, Studio Renovation, Staff Leave"
              maxLength={200}
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
              id="blocked-date-cancel-btn"
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
              }}
            >
              Cancel
            </button>
            <button
              id="blocked-date-submit-btn"
              type="submit"
              disabled={loading}
              style={{
                padding: '9px 20px',
                borderRadius: '8px',
                border: 'none',
                background: '#fb7185',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 8px rgba(244, 63, 94, 0.25)',
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
                  <span>{isEditing ? 'Update Blocked Date' : 'Confirm Block'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
