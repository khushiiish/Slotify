import React, { useState } from 'react';

export const BookAppointmentModal = ({ isOpen, onClose, onSave, services = [], staff = [] }) => {
  const [formData, setFormData] = useState({
    serviceId: services[0]?._id || '',
    staffId: '',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
    startTime: '10:00',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  // Generate 15-minute time slots for select
  const timeSlots = [];
  for (let h = 8; h <= 20; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      timeSlots.push(`${hh}:${mm}`);
    }
  }

  const activeServices = services.filter((s) => s.status === 'ACTIVE');
  const activeStaff = staff.filter((s) => s.status === 'ACTIVE');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        serviceId: formData.serviceId,
        date: formData.date,
        startTime: formData.startTime,
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerPhone: formData.customerPhone || undefined,
        notes: formData.notes || undefined,
      };

      if (formData.staffId && formData.staffId !== 'any') {
        payload.staffId = formData.staffId;
      }

      await onSave(payload);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to book appointment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div className="modal-card" style={{
        backgroundColor: '#18181b',
        border: '1px solid #27272a',
        borderRadius: '12px',
        padding: '24px',
        width: '100%',
        maxWidth: '520px',
        color: '#f4f4f5',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Book Test Appointment</h3>
          <button
            id="close-booking-modal-btn"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', fontSize: '20px' }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div
            id="booking-modal-error"
            style={{
              padding: '10px 14px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '6px',
              color: '#f87171',
              fontSize: '14px',
              marginBottom: '16px',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#a1a1aa', marginBottom: '6px' }}>
              Service *
            </label>
            <select
              id="book-service-select"
              name="serviceId"
              value={formData.serviceId}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                backgroundColor: '#27272a',
                border: '1px solid #3f3f46',
                color: '#fff',
              }}
            >
              {activeServices.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} ({s.durationMinutes} mins)
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#a1a1aa', marginBottom: '6px' }}>
              Staff Provider
            </label>
            <select
              id="book-staff-select"
              name="staffId"
              value={formData.staffId}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                backgroundColor: '#27272a',
                border: '1px solid #3f3f46',
                color: '#fff',
              }}
            >
              <option value="">Any Eligible Staff</option>
              {activeStaff.map((st) => (
                <option key={st._id} value={st._id}>
                  {st.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#a1a1aa', marginBottom: '6px' }}>
                Date *
              </label>
              <input
                id="book-date-input"
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  backgroundColor: '#27272a',
                  border: '1px solid #3f3f46',
                  color: '#fff',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#a1a1aa', marginBottom: '6px' }}>
                Start Time * (15m intervals)
              </label>
              <select
                id="book-time-select"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  backgroundColor: '#27272a',
                  border: '1px solid #3f3f46',
                  color: '#fff',
                }}
              >
                {timeSlots.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#a1a1aa', marginBottom: '6px' }}>
                Customer Name *
              </label>
              <input
                id="book-customer-name-input"
                type="text"
                name="customerName"
                placeholder="e.g. Jane Doe"
                value={formData.customerName}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  backgroundColor: '#27272a',
                  border: '1px solid #3f3f46',
                  color: '#fff',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#a1a1aa', marginBottom: '6px' }}>
                Customer Email *
              </label>
              <input
                id="book-customer-email-input"
                type="email"
                name="customerEmail"
                placeholder="e.g. jane@example.com"
                value={formData.customerEmail}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  backgroundColor: '#27272a',
                  border: '1px solid #3f3f46',
                  color: '#fff',
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#a1a1aa', marginBottom: '6px' }}>
              Customer Phone
            </label>
            <input
              id="book-customer-phone-input"
              type="text"
              name="customerPhone"
              placeholder="+1-555-0199"
              value={formData.customerPhone}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                backgroundColor: '#27272a',
                border: '1px solid #3f3f46',
                color: '#fff',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 16px',
                borderRadius: '6px',
                backgroundColor: 'transparent',
                border: '1px solid #3f3f46',
                color: '#e4e4e7',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              id="submit-booking-btn"
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 18px',
                borderRadius: '6px',
                backgroundColor: '#3b82f6',
                border: 'none',
                color: '#fff',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Booking...' : 'Confirm Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
