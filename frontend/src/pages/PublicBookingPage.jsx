import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  Globe,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronRight,
  ArrowLeft,
  CalendarCheck,
} from 'lucide-react';
import { getPublicBusiness, getPublicSlots, createPublicAppointment } from '../services/public.service.js';

export default function PublicBookingPage({ slug, onNavigate }) {
  const [business, setBusiness] = useState(null);
  const [loadingBusiness, setLoadingBusiness] = useState(true);
  const [businessError, setBusinessError] = useState(null);

  // Booking selections
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0] // Tomorrow
  );
  const [selectedSlot, setSelectedSlot] = useState('');

  // Slots state
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState(null);

  // Customer form
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [staleSlotConflict, setStaleSlotConflict] = useState(false);

  // 1. Fetch business on mount or slug change
  useEffect(() => {
    let isMounted = true;
    const loadBusiness = async () => {
      setLoadingBusiness(true);
      setBusinessError(null);
      try {
        const res = await getPublicBusiness(slug);
        if (isMounted) {
          setBusiness(res.data);
          if (res.data.services?.length > 0) {
            setSelectedService(res.data.services[0]);
          }
        }
      } catch (err) {
        if (isMounted) {
          setBusinessError(err.response?.data?.message || err.message || 'Business not found.');
        }
      } finally {
        if (isMounted) setLoadingBusiness(false);
      }
    };

    if (slug) {
      loadBusiness();
    }
    return () => {
      isMounted = false;
    };
  }, [slug]);

  // 2. Fetch slots when service or date changes
  const fetchSlots = async () => {
    if (!selectedService || !selectedDate || !slug || business?.isBookingDisabled) {
      return;
    }
    setLoadingSlots(true);
    setSlotsError(null);
    try {
      const res = await getPublicSlots(slug, {
        serviceId: selectedService._id,
        date: selectedDate,
      });
      setSlots(res.data?.slots || []);
      // Reset selected slot if it's no longer in the list
      if (selectedSlot && !res.data?.slots?.some((s) => (s.localStartTime || s.time) === selectedSlot)) {
        setSelectedSlot('');
      }
    } catch (err) {
      setSlotsError(err.response?.data?.message || err.message || 'Failed to load available slots.');
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, [selectedService?._id, selectedDate, business?.isBookingDisabled]);

  // 3. Handle appointment submission
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!selectedService || !selectedSlot) {
      setSubmitError('Please select a service, date, and available time slot.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setStaleSlotConflict(false);

    try {
      const payload = {
        serviceId: selectedService._id,
        date: selectedDate,
        startTime: selectedSlot,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      const res = await createPublicAppointment(slug, payload);

      if (res.data?.appointment?._id && res.data?.customerToken) {
        // Navigate to customer appointment view with customer access token
        onNavigate(`/appointments/${res.data.appointment._id}?token=${res.data.customerToken}`);
      }
    } catch (err) {
      if (err.response?.status === 409) {
        // STALE SLOT CONFLICT: Slot was taken while customer was on the page
        setStaleSlotConflict(true);
        setSubmitError('This time slot was just booked by another customer. We have refreshed the available slots for you.');
        setSelectedSlot('');
        await fetchSlots();
      } else {
        setSubmitError(err.response?.data?.message || err.message || 'Failed to book appointment. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Format 24-hour time "14:30" to readable "02:30 PM"
  const formatTimeDisplay = (time24) => {
    if (!time24) return '';
    const [hStr, mStr] = time24.split(':');
    const h = parseInt(hStr, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${String(h12).padStart(2, '0')}:${mStr} ${ampm}`;
  };

  if (loadingBusiness) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.2)', borderTopColor: 'var(--accent)', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ fontSize: '15px' }}>Loading business schedule...</p>
        </div>
      </div>
    );
  }

  if (businessError || !business) {
    return (
      <div style={{ maxWidth: '600px', margin: '80px auto', padding: '0 20px', textAlign: 'center' }}>
        <div style={{ background: 'var(--code-bg)', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px 24px', boxShadow: 'var(--shadow)' }}>
          <AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '24px', color: 'var(--text-h)', margin: '0 0 10px' }}>Business Not Found</h2>
          <p style={{ color: 'var(--text)', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
            {businessError || `The business with slug '${slug}' could not be located.`}
          </p>
          <button
            type="button"
            onClick={() => onNavigate('/')}
            style={{ padding: '10px 20px', borderRadius: '8px', background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '960px', margin: '30px auto', padding: '0 20px 80px' }}>
      {/* Business Branding Card */}
      <header
        id="public-business-header"
        style={{
          background: 'var(--code-bg)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '28px',
          marginBottom: '24px',
          boxShadow: 'var(--shadow)',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <h1 id="business-name-heading" style={{ margin: 0, fontSize: '28px', color: 'var(--text-h)', fontWeight: 700 }}>
                {business.name}
              </h1>
              <span
                id="business-status-badge"
                style={{
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  background: business.status === 'ACTIVE' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: business.status === 'ACTIVE' ? '#22c55e' : '#ef4444',
                  border: `1px solid ${business.status === 'ACTIVE' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                }}
              >
                {business.status}
              </span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', color: 'var(--text)', fontSize: '13px', marginTop: '10px' }}>
              {business.address && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <MapPin size={14} color="var(--accent)" />
                  {business.address}
                </span>
              )}
              {business.contactPhone && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <Phone size={14} color="var(--accent)" />
                  {business.contactPhone}
                </span>
              )}
              {business.contactEmail && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <Mail size={14} color="var(--accent)" />
                  {business.contactEmail}
                </span>
              )}
            </div>
          </div>

          <div
            id="timezone-chip"
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-h)',
            }}
          >
            <Globe size={14} color="var(--accent)" />
            Timezone: {business.timezone}
          </div>
        </div>

        {/* Disabled Business Banner */}
        {business.isBookingDisabled && (
          <div
            id="disabled-business-alert"
            style={{
              marginTop: '20px',
              padding: '14px 18px',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <AlertCircle size={20} />
            <span>
              <strong>Notice:</strong> This business is currently unavailable for bookings. Existing appointments remain on file.
            </span>
          </div>
        )}
      </header>

      {/* Main Scheduling Flow */}
      {!business.isBookingDisabled && (
        <form onSubmit={handleBookingSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            {/* Left Column: Service & Date Selection */}
            <div>
              {/* 1. Select Service */}
              <section
                id="service-selection-section"
                style={{
                  background: 'var(--code-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '14px',
                  padding: '22px',
                  marginBottom: '20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <Sparkles size={18} color="var(--accent)" />
                  <h2 style={{ margin: 0, fontSize: '17px', color: 'var(--text-h)', fontWeight: 600 }}>
                    1. Select Service
                  </h2>
                </div>

                {business.services?.length === 0 ? (
                  <p style={{ color: 'var(--text)', fontSize: '13px' }}>No active services are currently offered.</p>
                ) : (
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {business.services.map((svc) => {
                      const isSelected = selectedService?._id === svc._id;
                      return (
                        <div
                          key={svc._id}
                          id={`service-card-${svc._id}`}
                          onClick={() => setSelectedService(svc)}
                          style={{
                            padding: '14px 16px',
                            borderRadius: '10px',
                            border: `1.5px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                            background: isSelected ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-h)', fontSize: '15px' }}>
                              {svc.name}
                            </div>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '12px',
                                fontWeight: 700,
                                color: 'var(--accent)',
                                background: 'rgba(59, 130, 246, 0.15)',
                                padding: '3px 8px',
                                borderRadius: '6px',
                              }}
                            >
                              <Clock size={12} />
                              {svc.durationMinutes} mins
                            </span>
                          </div>
                          {svc.description && (
                            <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--text)', lineHeight: 1.4 }}>
                              {svc.description}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* 2. Select Date */}
              <section
                id="date-selection-section"
                style={{
                  background: 'var(--code-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '14px',
                  padding: '22px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <Calendar size={18} color="var(--accent)" />
                  <h2 style={{ margin: 0, fontSize: '17px', color: 'var(--text-h)', fontWeight: 600 }}>
                    2. Select Date
                  </h2>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--text)', marginBottom: '8px' }}>
                    Choose Appointment Date
                  </label>
                  <input
                    id="booking-date-input"
                    type="date"
                    value={selectedDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-h)',
                      fontSize: '14px',
                      fontWeight: 500,
                    }}
                  />
                  <span style={{ display: 'block', marginTop: '6px', fontSize: '11px', color: 'var(--text)', opacity: 0.7 }}>
                    Operating times evaluated according to {business.timezone} timezone.
                  </span>
                </div>
              </section>
            </div>

            {/* Right Column: Time Slot Selection & Customer Details */}
            <div>
              {/* 3. Choose Time Slot */}
              <section
                id="slot-selection-section"
                style={{
                  background: 'var(--code-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '14px',
                  padding: '22px',
                  marginBottom: '20px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={18} color="var(--accent)" />
                    <h2 style={{ margin: 0, fontSize: '17px', color: 'var(--text-h)', fontWeight: 600 }}>
                      3. Available Time Slots
                    </h2>
                  </div>
                  {slots.length > 0 && (
                    <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 600 }}>
                      {slots.length} available
                    </span>
                  )}
                </div>

                {/* Stale Slot Alert */}
                {staleSlotConflict && (
                  <div
                    id="stale-slot-conflict-alert"
                    style={{
                      padding: '10px 14px',
                      marginBottom: '16px',
                      borderRadius: '8px',
                      background: 'rgba(234, 179, 8, 0.15)',
                      border: '1px solid rgba(234, 179, 8, 0.4)',
                      color: '#facc15',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <AlertCircle size={16} />
                    <span>Selected slot was just booked. Available slots have been updated below.</span>
                  </div>
                )}

                {loadingSlots ? (
                  <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text)' }}>
                    <div className="spinner" style={{ width: '28px', height: '28px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'var(--accent)', borderRadius: '50%', margin: '0 auto 10px', animation: 'spin 0.8s linear infinite' }} />
                    <span style={{ fontSize: '13px' }}>Calculating 15-min booking slots...</span>
                  </div>
                ) : slotsError ? (
                  <div style={{ padding: '12px', background: 'rgba(239,68,68,0.1)', color: '#f87171', borderRadius: '8px', fontSize: '13px' }}>
                    {slotsError}
                  </div>
                ) : slots.length === 0 ? (
                  <div id="no-slots-notice" style={{ textAlign: 'center', padding: '30px 20px', background: 'var(--bg)', borderRadius: '10px', border: '1px dashed var(--border)' }}>
                    <CalendarCheck size={28} color="var(--text)" style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                    <div style={{ color: 'var(--text-h)', fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>
                      No available slots on this date
                    </div>
                    <p style={{ margin: 0, color: 'var(--text)', fontSize: '12px' }}>
                      The business may be closed, fully booked, or scheduled for a holiday. Please select another date.
                    </p>
                  </div>
                ) : (
                  <div
                    id="slots-grid"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(95px, 1fr))',
                      gap: '8px',
                      maxHeight: '220px',
                      overflowY: 'auto',
                      padding: '4px',
                    }}
                  >
                    {slots.map((s) => {
                      const slotTime = s.localStartTime || s.time;
                      const isChosen = selectedSlot === slotTime;
                      return (
                        <button
                          type="button"
                          key={slotTime}
                          id={`slot-btn-${slotTime.replace(':', '-')}`}
                          onClick={() => setSelectedSlot(slotTime)}
                          style={{
                            padding: '9px 6px',
                            borderRadius: '8px',
                            border: `1.5px solid ${isChosen ? 'var(--accent)' : 'var(--border)'}`,
                            background: isChosen ? 'var(--accent)' : 'var(--bg)',
                            color: isChosen ? '#fff' : 'var(--text-h)',
                            fontWeight: 600,
                            fontSize: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {formatTimeDisplay(slotTime)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* 4. Customer Information Form */}
              <section
                id="customer-info-section"
                style={{
                  background: 'var(--code-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '14px',
                  padding: '22px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <CheckCircle2 size={18} color="var(--accent)" />
                  <h2 style={{ margin: 0, fontSize: '17px', color: 'var(--text-h)', fontWeight: 600 }}>
                    4. Your Information
                  </h2>
                </div>

                {submitError && !staleSlotConflict && (
                  <div
                    id="booking-submit-error"
                    style={{
                      padding: '10px 14px',
                      marginBottom: '16px',
                      borderRadius: '8px',
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#f87171',
                      fontSize: '13px',
                    }}
                  >
                    {submitError}
                  </div>
                )}

                <div style={{ display: 'grid', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--text)', marginBottom: '5px' }}>
                      Full Name *
                    </label>
                    <input
                      id="customer-name-input"
                      type="text"
                      placeholder="e.g. Sarah Jenkins"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: 'var(--bg)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-h)',
                        fontSize: '13px',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--text)', marginBottom: '5px' }}>
                      Email Address *
                    </label>
                    <input
                      id="customer-email-input"
                      type="email"
                      placeholder="sarah@example.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: 'var(--bg)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-h)',
                        fontSize: '13px',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--text)', marginBottom: '5px' }}>
                      Phone Number (Optional)
                    </label>
                    <input
                      id="customer-phone-input"
                      type="tel"
                      placeholder="+1-555-0144"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: 'var(--bg)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-h)',
                        fontSize: '13px',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--text)', marginBottom: '5px' }}>
                      Appointment Notes (Optional)
                    </label>
                    <textarea
                      id="customer-notes-input"
                      rows={2}
                      placeholder="Any special requests or instructions..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: 'var(--bg)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-h)',
                        fontSize: '13px',
                        resize: 'none',
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '20px' }}>
                  <button
                    id="submit-public-booking-btn"
                    type="submit"
                    disabled={submitting || !selectedSlot}
                    style={{
                      width: '100%',
                      padding: '13px',
                      borderRadius: '10px',
                      background: 'var(--accent)',
                      color: '#fff',
                      border: 'none',
                      fontSize: '15px',
                      fontWeight: 700,
                      cursor: submitting || !selectedSlot ? 'not-allowed' : 'pointer',
                      opacity: submitting || !selectedSlot ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(59, 130, 246, 0.3)',
                    }}
                  >
                    {submitting ? (
                      <>
                        <div className="spinner" style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        Securing Appointment...
                      </>
                    ) : (
                      <>
                        Confirm & Book Appointment
                        <ChevronRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              </section>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
