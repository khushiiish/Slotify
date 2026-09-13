import React from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  Scissors,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  UserX,
  FileText,
  Globe,
} from 'lucide-react';

export default function AppointmentDetailsModal({
  isOpen,
  appointment,
  timezone = 'Asia/Kolkata',
  onClose,
  onStatusUpdate,
  loading = false,
}) {
  if (!isOpen || !appointment) return null;

  // Format date and time in the authoritative business timezone
  const formatTimezoneDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(d);
    } catch {
      return new Date(dateStr).toLocaleDateString();
    }
  };

  const formatTimezoneTime = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(d);
    } catch {
      return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    }
  };

  const localDate = formatTimezoneDate(appointment.startTime);
  const localStartTime = formatTimezoneTime(appointment.startTime);
  const localEndTime = formatTimezoneTime(appointment.endTime);

  const isConfirmed = appointment.status === 'CONFIRMED';
  const isCompleted = appointment.status === 'COMPLETED';
  const isCancelled = appointment.status === 'CANCELLED';
  const isNoShow = appointment.status === 'NO_SHOW';

  const getStatusBadgeStyle = () => {
    switch (appointment.status) {
      case 'CONFIRMED':
        return { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e', border: 'rgba(34, 197, 94, 0.3)' };
      case 'COMPLETED':
        return { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6', border: 'rgba(59, 130, 246, 0.3)' };
      case 'CANCELLED':
        return { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' };
      case 'NO_SHOW':
        return { bg: 'rgba(234, 179, 8, 0.15)', text: '#eab308', border: 'rgba(234, 179, 8, 0.3)' };
      default:
        return { bg: 'rgba(148, 163, 184, 0.15)', text: 'var(--text)', border: 'var(--border)' };
    }
  };

  const badge = getStatusBadgeStyle();

  return (
    <div
      id="appointment-details-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(8, 8, 12, 0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
        backdropFilter: 'blur(3px)',
      }}
      onClick={onClose}
    >
      <div
        id="appointment-details-modal"
        style={{
          backgroundColor: 'var(--bg)',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(8, 8, 12, 0.1), 0 8px 10px -6px rgba(8, 8, 12, 0.05)',
          padding: '24px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--text-h)' }}>
                Appointment Details
              </h2>
              <span
                id="appointment-details-status-badge"
                style={{
                  display: 'inline-block',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 800,
                  backgroundColor: badge.bg,
                  color: badge.text,
                  border: `1px solid ${badge.border}`,
                  letterSpacing: '0.5px',
                }}
              >
                {appointment.status}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--accent)', marginTop: '4px' }}>
              <Globe size={13} />
              <span>Timezone: <strong>{timezone}</strong></span>
            </div>
          </div>
          <button
            type="button"
            id="close-appointment-details-btn"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Section: Scheduled Time Card */}
        <div
          style={{
            background: 'var(--code-bg)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '16px',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <Calendar size={18} color="var(--accent)" />
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-h)' }}>
              {localDate}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-h)', fontSize: '14px', fontWeight: 600 }}>
            <Clock size={16} color="var(--accent)" />
            <span>
              {localStartTime} – {localEndTime} ({appointment.serviceId?.durationMinutes || 60} mins)
            </span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text)', opacity: 0.6, marginTop: '8px', fontFamily: 'monospace' }}>
            UTC: {new Date(appointment.startTime).toISOString()}
          </div>
        </div>

        {/* Section: Service & Staff */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          <div style={{ background: 'var(--code-bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text)', textTransform: 'uppercase', fontWeight: 600 }}>
              Service
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
              <Scissors size={16} color="var(--accent)" />
              <span style={{ fontWeight: 700, color: 'var(--text-h)', fontSize: '14px' }}>
                {appointment.serviceId?.name || 'Service'}
              </span>
            </div>
            {appointment.serviceId?.price != null && (
              <div style={{ fontSize: '12px', color: 'var(--text)', marginTop: '4px' }}>
                Price: ${appointment.serviceId.price}
              </div>
            )}
          </div>

          <div style={{ background: 'var(--code-bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text)', textTransform: 'uppercase', fontWeight: 600 }}>
              Assigned Staff
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
              <User size={16} color="var(--accent)" />
              <span style={{ fontWeight: 700, color: 'var(--text-h)', fontSize: '14px' }}>
                {appointment.staffId?.name || 'Unassigned'}
              </span>
            </div>
            {appointment.staffId?.email && (
              <div style={{ fontSize: '12px', color: 'var(--text)', marginTop: '4px', opacity: 0.8 }}>
                {appointment.staffId.email}
              </div>
            )}
          </div>
        </div>

        {/* Section: Customer Information */}
        <div
          style={{
            background: 'var(--code-bg)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '16px',
            marginBottom: '16px',
          }}
        >
          <span style={{ fontSize: '11px', color: 'var(--text)', textTransform: 'uppercase', fontWeight: 600 }}>
            Customer Information
          </span>
          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={14} color="var(--text)" style={{ opacity: 0.7 }} />
              <span style={{ fontWeight: 700, color: 'var(--text-h)', fontSize: '14px' }}>
                {appointment.customerName}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Mail size={14} color="var(--text)" style={{ opacity: 0.7 }} />
              <a
                href={`mailto:${appointment.customerEmail}`}
                style={{ color: 'var(--accent)', fontSize: '13px', textDecoration: 'none' }}
              >
                {appointment.customerEmail}
              </a>
            </div>
            {appointment.customerPhone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Phone size={14} color="var(--text)" style={{ opacity: 0.7 }} />
                <a
                  href={`tel:${appointment.customerPhone}`}
                  style={{ color: 'var(--text)', fontSize: '13px', textDecoration: 'none' }}
                >
                  {appointment.customerPhone}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Section: Notes (if any) */}
        {appointment.notes && (
          <div
            style={{
              background: 'var(--code-bg)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '14px',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '6px' }}>
              <FileText size={13} />
              <span>Customer Notes</span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-h)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              {appointment.notes}
            </div>
          </div>
        )}

        {/* Section: Status Actions */}
        <div style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '18px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', marginBottom: '10px' }}>
            STATUS MANAGEMENT
          </div>

          {isConfirmed ? (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                id="btn-mark-completed"
                disabled={loading}
                onClick={() => onStatusUpdate('COMPLETED')}
                style={{
                  flex: 1,
                  minWidth: '130px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '9px 14px',
                  borderRadius: '8px',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  background: 'rgba(59, 130, 246, 0.15)',
                  color: '#3b82f6',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                <CheckCircle2 size={15} />
                Mark Completed
              </button>

              <button
                type="button"
                id="btn-mark-noshow"
                disabled={loading}
                onClick={() => onStatusUpdate('NO_SHOW')}
                style={{
                  flex: 1,
                  minWidth: '130px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '9px 14px',
                  borderRadius: '8px',
                  border: '1px solid rgba(234, 179, 8, 0.4)',
                  background: 'rgba(234, 179, 8, 0.15)',
                  color: '#eab308',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                <UserX size={15} />
                Mark No-Show
              </button>

              <button
                type="button"
                id="btn-cancel-appointment"
                disabled={loading}
                onClick={() => onStatusUpdate('CANCELLED')}
                style={{
                  flex: 1,
                  minWidth: '130px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '9px 14px',
                  borderRadius: '8px',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#ef4444',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                <XCircle size={15} />
                Cancel
              </button>
            </div>
          ) : (
            <div
              style={{
                padding: '12px',
                borderRadius: '8px',
                background: 'var(--code-bg)',
                border: '1px solid var(--border)',
                fontSize: '13px',
                color: 'var(--text)',
                textAlign: 'center',
              }}
            >
              This appointment is in terminal status (<strong>{appointment.status}</strong>). Further state transitions are disallowed.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
