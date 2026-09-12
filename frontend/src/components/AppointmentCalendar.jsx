import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  User,
  Scissors,
  Globe,
} from 'lucide-react';

/**
 * Helper to convert UTC Date string to local date/time parts in the given timezone.
 */
function getZonedParts(dateStr, timeZone) {
  try {
    const d = new Date(dateStr);
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(d);
    const partMap = {};
    for (const p of parts) {
      partMap[p.type] = p.value;
    }
    const year = parseInt(partMap.year, 10);
    const month = parseInt(partMap.month, 10); // 1-12
    const day = parseInt(partMap.day, 10);
    const hour = partMap.hour || '00';
    const minute = partMap.minute || '00';
    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const timeKey = `${hour}:${minute}`;
    return { year, month, day, hour, minute, dateKey, timeKey };
  } catch {
    const d = new Date(dateStr);
    const dateKey = d.toISOString().split('T')[0];
    const timeKey = d.toISOString().substring(11, 16);
    return {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
      hour: timeKey.split(':')[0],
      minute: timeKey.split(':')[1],
      dateKey,
      timeKey,
    };
  }
}

export default function AppointmentCalendar({
  appointments = [],
  timezone = 'Asia/Kolkata',
  onSelectAppointment,
}) {
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'week' | 'day'
  const [currentDate, setCurrentDate] = useState(() => new Date());

  // Current year & month based on currentDate
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-indexed

  // Today key for highlighting
  const todayKey = useMemo(() => {
    return getZonedParts(new Date().toISOString(), timezone).dateKey;
  }, [timezone]);

  // Map appointments by dateKey in business timezone
  const appointmentsByDate = useMemo(() => {
    const map = new Map();
    for (const appt of appointments) {
      if (!appt.startTime) continue;
      const { dateKey, timeKey } = getZonedParts(appt.startTime, timezone);
      const apptWithZoned = { ...appt, _zonedDateKey: dateKey, _zonedTimeKey: timeKey };
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey).push(apptWithZoned);
    }
    // Sort each day's appointments chronologically
    for (const [, list] of map.entries()) {
      list.sort((a, b) => a._zonedTimeKey.localeCompare(b._zonedTimeKey));
    }
    return map;
  }, [appointments, timezone]);

  // Navigation handlers
  const handlePrev = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (viewMode === 'month') {
        d.setMonth(d.getMonth() - 1);
      } else if (viewMode === 'week') {
        d.setDate(d.getDate() - 7);
      } else {
        d.setDate(d.getDate() - 1);
      }
      return d;
    });
  };

  const handleNext = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (viewMode === 'month') {
        d.setMonth(d.getMonth() + 1);
      } else if (viewMode === 'week') {
        d.setDate(d.getDate() + 7);
      } else {
        d.setDate(d.getDate() + 1);
      }
      return d;
    });
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Header Title
  const headerTitle = useMemo(() => {
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    if (viewMode === 'week') {
      const d = new Date(currentDate);
      const day = d.getDay();
      const startOfWeek = new Date(d);
      startOfWeek.setDate(d.getDate() - day);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }, [currentDate, viewMode]);

  // Status color styles
  const getBadgeStyle = (status) => {
    switch (status) {
      case 'CONFIRMED':
        return { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e', border: 'rgba(34, 197, 94, 0.3)' };
      case 'COMPLETED':
        return { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6', border: 'rgba(59, 130, 246, 0.3)' };
      case 'CANCELLED':
        return { bg: 'rgba(239, 68, 68, 0.12)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.3)', lineThrough: true };
      case 'NO_SHOW':
        return { bg: 'rgba(234, 179, 8, 0.15)', text: '#eab308', border: 'rgba(234, 179, 8, 0.3)' };
      default:
        return { bg: 'rgba(148, 163, 184, 0.15)', text: 'var(--text)', border: 'var(--border)' };
    }
  };

  // --- MONTH VIEW DATA ---
  const monthDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const startDayIndex = firstDayOfMonth.getDay(); // 0 = Sunday
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const days = [];

    // Prev month padding
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const d = new Date(currentYear, currentMonth - 1, dayNum);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({ dayNum, dateKey, isCurrentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ dayNum: i, dateKey, isCurrentMonth: true });
    }

    // Next month padding to complete 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(currentYear, currentMonth + 1, i);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({ dayNum: i, dateKey, isCurrentMonth: false });
    }

    return days;
  }, [currentYear, currentMonth]);

  // --- WEEK VIEW DATA ---
  const weekDays = useMemo(() => {
    const d = new Date(currentDate);
    const dayOfWeek = d.getDay();
    const sunday = new Date(d);
    sunday.setDate(d.getDate() - dayOfWeek);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(sunday);
      dayDate.setDate(sunday.getDate() + i);
      const dateKey = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(dayDate.getDate()).padStart(2, '0')}`;
      days.push({
        date: dayDate,
        dateKey,
        dayName: dayDate.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: dayDate.getDate(),
      });
    }
    return days;
  }, [currentDate]);

  // --- DAY VIEW DATA ---
  const selectedDayKey = useMemo(() => {
    const d = currentDate;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, [currentDate]);

  const selectedDayAppointments = useMemo(() => {
    return appointmentsByDate.get(selectedDayKey) || [];
  }, [appointmentsByDate, selectedDayKey]);

  return (
    <div
      id="admin-calendar-container"
      style={{
        background: 'var(--code-bg)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        overflow: 'hidden',
      }}
    >
      {/* Calendar Header Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        {/* Navigation buttons + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              type="button"
              id="calendar-prev-btn"
              onClick={handlePrev}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text-h)',
                cursor: 'pointer',
              }}
              title="Previous"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              id="calendar-next-btn"
              onClick={handleNext}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text-h)',
                cursor: 'pointer',
              }}
              title="Next"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            type="button"
            id="calendar-today-btn"
            onClick={handleToday}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--text-h)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Today
          </button>

          <h3
            id="calendar-header-title"
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--text-h)',
            }}
          >
            {headerTitle}
          </h3>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              color: 'var(--accent)',
              padding: '3px 8px',
              borderRadius: '12px',
              background: 'rgba(99, 102, 241, 0.1)',
              fontWeight: 600,
            }}
          >
            <Globe size={11} />
            {timezone}
          </span>
        </div>

        {/* View mode switcher */}
        <div
          style={{
            display: 'inline-flex',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            background: 'var(--bg)',
            overflow: 'hidden',
          }}
        >
          {['month', 'week', 'day'].map((mode) => (
            <button
              key={mode}
              type="button"
              id={`calendar-view-${mode}-btn`}
              onClick={() => setViewMode(mode)}
              style={{
                padding: '7px 14px',
                border: 'none',
                background: viewMode === mode ? 'var(--accent)' : 'transparent',
                color: viewMode === mode ? '#fff' : 'var(--text)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* --- MONTH VIEW --- */}
      {viewMode === 'month' && (
        <div id="calendar-month-grid">
          {/* Day of Week Headers */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              textAlign: 'center',
              background: 'var(--bg)',
              borderBottom: '1px solid var(--border)',
            }}
          >
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div
                key={d}
                style={{
                  padding: '10px 4px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text)',
                }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Month Day Cells */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              minHeight: '480px',
            }}
          >
            {monthDays.map((dayObj, index) => {
              const dayAppts = appointmentsByDate.get(dayObj.dateKey) || [];
              const isToday = dayObj.dateKey === todayKey;

              return (
                <div
                  key={`${dayObj.dateKey}-${index}`}
                  id={`calendar-day-cell-${dayObj.dateKey}`}
                  style={{
                    borderRight: (index + 1) % 7 === 0 ? 'none' : '1px solid var(--border)',
                    borderBottom: '1px solid var(--border)',
                    padding: '8px',
                    minHeight: '90px',
                    background: isToday
                      ? 'rgba(99, 102, 241, 0.05)'
                      : dayObj.isCurrentMonth
                      ? 'transparent'
                      : 'rgba(0, 0, 0, 0.1)',
                    opacity: dayObj.isCurrentMonth ? 1 : 0.45,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  {/* Day Number */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: isToday ? 800 : 600,
                        color: isToday ? 'var(--accent)' : 'var(--text-h)',
                        padding: isToday ? '2px 6px' : '0',
                        borderRadius: isToday ? '10px' : '0',
                        background: isToday ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                      }}
                    >
                      {dayObj.dayNum}
                    </span>
                    {dayAppts.length > 0 && (
                      <span style={{ fontSize: '10px', color: 'var(--text)', opacity: 0.7 }}>
                        {dayAppts.length}
                      </span>
                    )}
                  </div>

                  {/* Appointment Chips */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '2px', overflowY: 'auto' }}>
                    {dayAppts.slice(0, 3).map((appt) => {
                      const badge = getBadgeStyle(appt.status);
                      return (
                        <button
                          key={appt._id}
                          type="button"
                          id={`calendar-chip-${appt._id}`}
                          onClick={() => onSelectAppointment?.(appt)}
                          style={{
                            padding: '3px 6px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            textAlign: 'left',
                            backgroundColor: badge.bg,
                            color: badge.text,
                            border: `1px solid ${badge.border}`,
                            textDecoration: badge.lineThrough ? 'line-through' : 'none',
                            cursor: 'pointer',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            display: 'block',
                            width: '100%',
                          }}
                          title={`${appt._zonedTimeKey} ${appt.customerName} - ${appt.serviceId?.name || 'Service'}`}
                        >
                          <strong>{appt._zonedTimeKey}</strong> {appt.customerName}
                        </button>
                      );
                    })}

                    {dayAppts.length > 3 && (
                      <div
                        onClick={() => {
                          const [y, m, d] = dayObj.dateKey.split('-').map(Number);
                          setCurrentDate(new Date(y, m - 1, d));
                          setViewMode('day');
                        }}
                        style={{
                          fontSize: '10px',
                          color: 'var(--accent)',
                          fontWeight: 700,
                          cursor: 'pointer',
                          padding: '2px',
                        }}
                      >
                        +{dayAppts.length - 3} more...
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- WEEK VIEW --- */}
      {viewMode === 'week' && (
        <div id="calendar-week-grid">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              background: 'var(--bg)',
              borderBottom: '1px solid var(--border)',
            }}
          >
            {weekDays.map((wDay) => {
              const isToday = wDay.dateKey === todayKey;
              return (
                <div
                  key={wDay.dateKey}
                  style={{
                    padding: '12px 8px',
                    textAlign: 'center',
                    borderRight: '1px solid var(--border)',
                  }}
                >
                  <div style={{ fontSize: '11px', color: 'var(--text)', textTransform: 'uppercase', fontWeight: 600 }}>
                    {wDay.dayName}
                  </div>
                  <div
                    style={{
                      fontSize: '18px',
                      fontWeight: isToday ? 800 : 700,
                      color: isToday ? 'var(--accent)' : 'var(--text-h)',
                      marginTop: '2px',
                    }}
                  >
                    {wDay.dayNum}
                  </div>
                </div>
              );
            })}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              minHeight: '400px',
            }}
          >
            {weekDays.map((wDay) => {
              const dayAppts = appointmentsByDate.get(wDay.dateKey) || [];
              const isToday = wDay.dateKey === todayKey;

              return (
                <div
                  key={wDay.dateKey}
                  id={`week-col-${wDay.dateKey}`}
                  style={{
                    borderRight: '1px solid var(--border)',
                    padding: '10px 8px',
                    background: isToday ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  {dayAppts.length === 0 ? (
                    <div style={{ fontSize: '11px', color: 'var(--text)', opacity: 0.4, textAlign: 'center', marginTop: '16px' }}>
                      No appts
                    </div>
                  ) : (
                    dayAppts.map((appt) => {
                      const badge = getBadgeStyle(appt.status);
                      return (
                        <div
                          key={appt._id}
                          id={`week-appt-card-${appt._id}`}
                          onClick={() => onSelectAppointment?.(appt)}
                          style={{
                            background: badge.bg,
                            border: `1px solid ${badge.border}`,
                            borderRadius: '6px',
                            padding: '8px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '3px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 800, color: badge.text }}>
                              {appt._zonedTimeKey}
                            </span>
                            <span
                              style={{
                                fontSize: '9px',
                                fontWeight: 700,
                                color: badge.text,
                                textTransform: 'uppercase',
                              }}
                            >
                              {appt.status}
                            </span>
                          </div>

                          <div style={{ fontWeight: 600, color: 'var(--text-h)' }}>
                            {appt.customerName}
                          </div>

                          <div style={{ fontSize: '11px', color: 'var(--text)', opacity: 0.8 }}>
                            {appt.serviceId?.name || 'Service'}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- DAY VIEW --- */}
      {viewMode === 'day' && (
        <div id="calendar-day-grid" style={{ padding: '20px' }}>
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-h)' }}>
              Schedule for {headerTitle}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--accent)', fontWeight: 700 }}>
              {selectedDayAppointments.length} Appointments
            </span>
          </div>

          {selectedDayAppointments.length === 0 ? (
            <div
              style={{
                padding: '50px 20px',
                textAlign: 'center',
                background: 'var(--bg)',
                borderRadius: '10px',
                border: '1px solid var(--border)',
              }}
            >
              <CalendarIcon size={36} color="var(--text)" style={{ opacity: 0.3, marginBottom: '8px' }} />
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-h)' }}>
                No appointments scheduled on this date
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text)', margin: '4px 0 0' }}>
                Use the navigation buttons above to view other dates.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {selectedDayAppointments.map((appt) => {
                const badge = getBadgeStyle(appt.status);
                return (
                  <div
                    key={appt._id}
                    id={`day-appt-card-${appt._id}`}
                    onClick={() => onSelectAppointment?.(appt)}
                    style={{
                      background: 'var(--bg)',
                      border: `1px solid ${badge.border}`,
                      borderLeft: `4px solid ${badge.text}`,
                      borderRadius: '8px',
                      padding: '14px 18px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ textAlign: 'center', minWidth: '60px' }}>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-h)' }}>
                          {appt._zonedTimeKey}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text)', opacity: 0.7 }}>
                          {appt.serviceId?.durationMinutes || 60}m
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-h)' }}>
                          {appt.customerName}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: 'var(--text)', marginTop: '2px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Scissors size={12} color="var(--accent)" />
                            {appt.serviceId?.name || 'Service'}
                          </span>
                          <span>&bull;</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <User size={12} color="var(--accent)" />
                            {appt.staffId?.name || 'Unassigned'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: badge.bg,
                          color: badge.text,
                        }}
                      >
                        {appt.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
