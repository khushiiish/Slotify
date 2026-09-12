import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Sparkles,
  CalendarCheck,
} from 'lucide-react';
import { getPublicAppointment, cancelPublicAppointment } from '../services/public.service.js';

export default function CustomerAppointmentView({ appointmentId, token, onNavigate }) {
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cancellation modal state
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState('');

  useEffect(() => {
    let isMounted = true;
    const fetchAppointment = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getPublicAppointment(appointmentId, token);
        if (isMounted) {
          setAppointment(res.data);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err.response?.data?.message ||
              err.message ||
              'Unable to load appointment. The link or token may be invalid.'
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (appointmentId && token) {
      fetchAppointment();
    } else {
      setError('Appointment access token is missing. Please check your confirmation link.');
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [appointmentId, token]);

  const handleCancelConfirm = async () => {
    setCancelling(true);
    try {
      const res = await cancelPublicAppointment(appointmentId, token);
      setAppointment((prev) => ({
        ...prev,
        status: 'CANCELLED',
      }));
      setCancelSuccessMsg('Your appointment has been cancelled and your time slot has been freed.');
      setIsCancelModalOpen(false);
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to cancel appointment.');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.2)', borderTopColor: 'var(--accent)', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ fontSize: '15px' }}>Loading your appointment details...</p>
        </div>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div style={{ maxWidth: '600px', margin: '80px auto', padding: '0 20px', textAlign: 'center' }}>
        <div style={{ background: 'var(--code-bg)', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px 24px', boxShadow: 'var(--shadow)' }}>
          <AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '22px', color: 'var(--text-h)', margin: '0 0 10px' }}>Appointment Not Found</h2>
          <p style={{ color: 'var(--text)', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
            {error || 'The requested appointment could not be retrieved.'}
          </p>
          <button
            type="button"
            onClick={() => onNavigate('/')}
            style={{ padding: '10px 20px', borderRadius: '8px', background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}
          >
            Return to Homepage
          </button>
        </div>
      </div>
    );
  }

  const isCancelled = appointment.status === 'CANCELLED';
  const apptDate = new Date(appointment.startTime);
  const timeStr = apptDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateFormatted = apptDate.toLocaleDateString([], {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div style={{ maxWidth: '680px', margin: '40px auto', padding: '0 20px 80px' }}>
      {/* Back Button */}
      <button
        type="button"
        id="back-to-booking-btn"
        onClick={() => onNavigate(`/book/${appointment.business?.slug || ''}`)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'none',
          border: 'none',
          color: 'var(--text)',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: '20px',
        }}
      >
        <ArrowLeft size={16} />
        Back to {appointment.business?.name || 'Booking Page'}
      </button>

      {/* Main Card */}
      <div
        id="appointment-details-card"
        style={{
          background: 'var(--code-bg)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: 'var(--shadow)',
        }}
      >
        {/* Status Header Banner */}
        <div
          style={{
            textAlign: 'center',
            paddingBottom: '24px',
            borderBottom: '1px solid var(--border)',
            marginBottom: '24px',
          }}
        >
          {isCancelled ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', marginBottom: '14px' }}>
              <XCircle size={32} />
            </div>
          ) : (
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', marginBottom: '14px' }}>
              <CheckCircle2 size={32} />
            </div>
          )}

          <h1 style={{ margin: '0 0 8px', fontSize: '24px', color: 'var(--text-h)', fontWeight: 700 }}>
            {isCancelled ? 'Appointment Cancelled' : 'Appointment Confirmed'}
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text)' }}>
            {isCancelled
              ? 'This reservation has been cancelled. The time slot has been returned to the schedule.'
              : 'Your booking has been secured. Below are your appointment details.'}
          </p>

          <div style={{ marginTop: '14px' }}>
            <span
              id="appointment-status-badge"
              style={{
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                backgroundColor: isCancelled ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                color: isCancelled ? '#ef4444' : '#22c55e',
                border: `1px solid ${isCancelled ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
              }}
            >
              {appointment.status}
            </span>
          </div>
        </div>

        {/* Cancellation Notice Banner */}
        {cancelSuccessMsg && (
          <div
            id="cancel-success-alert"
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              background: 'rgba(34, 197, 94, 0.12)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              color: '#22c55e',
              fontSize: '13px',
              marginBottom: '20px',
              textAlign: 'center',
            }}
          >
            {cancelSuccessMsg}
          </div>
        )}

        {/* Appointment Details Grid */}
        <div style={{ display: 'grid', gap: '18px', fontSize: '14px' }}>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '8px' }}>
              Service & Schedule
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
              <span style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-h)' }}>
                {appointment.service?.name}
              </span>
              <span style={{ fontSize: '13px', color: 'var(--accent)', fontWeight: 600 }}>
                {appointment.service?.durationMinutes} mins
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)', fontSize: '13px', marginBottom: '4px' }}>
              <Calendar size={15} color="var(--accent)" />
              <strong>{dateFormatted}</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)', fontSize: '13px' }}>
              <Clock size={15} color="var(--accent)" />
              <span>
                {timeStr} ({appointment.business?.timezone})
              </span>
            </div>
          </div>

          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '8px' }}>
              Location & Provider
            </div>
            <div style={{ fontWeight: 600, color: 'var(--text-h)', fontSize: '15px', marginBottom: '6px' }}>
              {appointment.business?.name}
            </div>
            {appointment.business?.address && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)', fontSize: '13px', marginBottom: '4px' }}>
                <MapPin size={15} color="var(--accent)" />
                {appointment.business.address}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)', fontSize: '13px' }}>
              <Users size={15} color="var(--accent)" />
              Staff: <strong>{appointment.staff?.name || 'Assigned Staff'}</strong>
            </div>
          </div>

          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '8px' }}>
              Customer Information
            </div>
            <div style={{ fontWeight: 600, color: 'var(--text-h)', fontSize: '14px', marginBottom: '4px' }}>
              {appointment.customerName}
            </div>
            <div style={{ color: 'var(--text)', fontSize: '13px', marginBottom: '4px' }}>
              {appointment.customerEmail}
            </div>
            {appointment.customerPhone && (
              <div style={{ color: 'var(--text)', fontSize: '13px' }}>
                Phone: {appointment.customerPhone}
              </div>
            )}
            {appointment.notes && (
              <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed var(--border)', fontSize: '12px', color: 'var(--text)' }}>
                <strong>Notes:</strong> {appointment.notes}
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ marginTop: '28px', display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          {!isCancelled && (
            <button
              id="customer-cancel-appt-btn"
              type="button"
              onClick={() => setIsCancelModalOpen(true)}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel Appointment
            </button>
          )}

          <button
            id="book-another-appt-btn"
            type="button"
            onClick={() => onNavigate(`/book/${appointment.business?.slug || ''}`)}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--accent)',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Book Another Appointment
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {isCancelModalOpen && (
        <div
          id="cancel-confirmation-modal"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--code-bg)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              padding: '24px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)',
            }}
          >
            <h3 style={{ margin: '0 0 10px', fontSize: '18px', color: 'var(--text-h)', fontWeight: 600 }}>
              Cancel this Appointment?
            </h3>
            <p style={{ margin: '0 0 20px', color: 'var(--text)', fontSize: '14px', lineHeight: 1.5 }}>
              Are you sure you want to cancel your appointment for{' '}
              <strong>{appointment.service?.name}</strong> on <strong>{dateFormatted}</strong>? This slot will immediately become available for other customers.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                disabled={cancelling}
                style={{
                  padding: '9px 16px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--text-h)',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Keep Appointment
              </button>
              <button
                id="confirm-cancel-appointment-btn"
                type="button"
                onClick={handleCancelConfirm}
                disabled={cancelling}
                style={{
                  padding: '9px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#ef4444',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: cancelling ? 'not-allowed' : 'pointer',
                }}
              >
                {cancelling ? 'Cancelling...' : 'Yes, Cancel Appointment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
