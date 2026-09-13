import { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Edit2,
  CalendarX,
  Sparkles,
  Globe,
  User,
  Building2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  Info,
} from 'lucide-react';

const DAYS_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon, Tue, Wed, Thu, Fri, Sat, Sun

const DAYS_MAP = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

const SHORT_DAYS_MAP = {
  0: 'Sun',
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
};

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

export default function AvailabilityManager({
  user,
  businessInfo,
  services = [],
  staff = [],
  availabilityList = [],
  blockedDates = [],
  onRefresh,
  showSuccess,
  setError,
  handleOpenCreateAvailability,
  handleOpenEditAvailability,
  handleDeleteAvailability,
  handleOpenCreateBlockedDate,
  handleOpenEditBlockedDate,
  handleDeleteBlockedDate,
  updateAvailability,
  createAvailability,
  createBlockedDate,
  deleteBlockedDate,
  getAvailableSlots,
}) {
  // Filter state for schedules
  const [scheduleScopeFilter, setScheduleScopeFilter] = useState('ALL'); // 'ALL' | 'BUSINESS' | staffId

  // Quick inline blocked date form state
  const [inlineBlockDate, setInlineBlockDate] = useState('');
  const [inlineBlockStaffId, setInlineBlockStaffId] = useState('');
  const [inlineBlockReason, setInlineBlockReason] = useState('');
  const [inlineBlockLoading, setInlineBlockLoading] = useState(false);
  const [inlineBlockError, setInlineBlockError] = useState(null);

  // Slot preview form state
  const [previewServiceId, setPreviewServiceId] = useState(
    services.find((s) => s.status === 'ACTIVE')?._id || services[0]?._id || ''
  );
  const [previewDate, setPreviewDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [previewStaffId, setPreviewStaffId] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [previewSlotsResult, setPreviewSlotsResult] = useState(null);

  // Toggle active status directly
  const [togglingId, setTogglingId] = useState(null);

  const handleToggleActive = async (win) => {
    setTogglingId(win._id);
    try {
      await updateAvailability(win._id, { isActive: !win.isActive });
      if (showSuccess) {
        showSuccess(
          `Window for ${DAYS_MAP[win.dayOfWeek]} set to ${!win.isActive ? 'Active' : 'Inactive'}.`
        );
      }
      if (onRefresh) await onRefresh();
    } catch (err) {
      if (setError) {
        setError(err.response?.data?.message || err.message || 'Failed to update window status.');
      }
    } finally {
      setTogglingId(null);
    }
  };

  // Quick inline add blocked date
  const handleInlineAddBlockedDate = async (e) => {
    e.preventDefault();
    if (!inlineBlockDate) {
      setInlineBlockError('Please select a date to block.');
      return;
    }
    setInlineBlockLoading(true);
    setInlineBlockError(null);
    try {
      await createBlockedDate({
        date: inlineBlockDate,
        staffId: inlineBlockStaffId ? inlineBlockStaffId : null,
        reason: inlineBlockReason.trim() || undefined,
      });
      if (showSuccess) {
        showSuccess(`Date ${inlineBlockDate} blocked successfully.`);
      }
      setInlineBlockDate('');
      setInlineBlockReason('');
      setInlineBlockStaffId('');
      if (onRefresh) await onRefresh();
    } catch (err) {
      setInlineBlockError(
        err.response?.data?.message || err.message || 'Failed to block date.'
      );
    } finally {
      setInlineBlockLoading(false);
    }
  };

  // Slot preview calculation
  const handleExecuteSlotPreview = async (e) => {
    if (e) e.preventDefault();
    if (!previewServiceId || !previewDate) return;

    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const data = await getAvailableSlots({
        serviceId: previewServiceId,
        date: previewDate,
        staffId: previewStaffId || undefined,
      });
      setPreviewSlotsResult(data);
    } catch (err) {
      setPreviewError(
        err.response?.data?.message || err.message || 'Failed to calculate slots.'
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  // Filtered availability by scope
  const filteredAvailability = useMemo(() => {
    if (scheduleScopeFilter === 'ALL') {
      return availabilityList;
    }
    if (scheduleScopeFilter === 'BUSINESS') {
      return availabilityList.filter((a) => !a.staffId);
    }
    return availabilityList.filter(
      (a) => (a.staffId?._id || a.staffId) === scheduleScopeFilter
    );
  }, [availabilityList, scheduleScopeFilter]);

  // Counts for scope filter pills
  const businessWideCount = useMemo(
    () => availabilityList.filter((a) => !a.staffId).length,
    [availabilityList]
  );
  const staffOverridesCount = useMemo(
    () => availabilityList.filter((a) => a.staffId).length,
    [availabilityList]
  );

  const timezone = businessInfo?.timezone || 'Asia/Kolkata';

  return (
    <div id="availability-manager" className="space-y-8 animate-in fade-in duration-200">
      {/* ======================================================== */}
      {/* 1. HEADER & TIMEZONE CONTEXT                             */}
      {/* ======================================================== */}
      <div
        style={{
          background: 'var(--code-bg)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'rgba(99, 102, 241, 0.15)',
                  color: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Calendar size={20} />
              </div>
              <h1
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  color: 'var(--text-h)',
                  margin: 0,
                  letterSpacing: '-0.3px',
                }}
              >
                Availability & Hours
              </h1>
            </div>
            <p
              style={{
                fontSize: '13px',
                color: 'var(--text)',
                margin: '6px 0 0',
                maxWidth: '620px',
                lineHeight: 1.5,
              }}
            >
              Set when your business and staff are available for appointments. Manage recurring weekly
              hours, individual staff overrides, and holiday closures.
            </p>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              id="add-availability-btn"
              onClick={handleOpenCreateAvailability}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 16px',
                borderRadius: '8px',
                border: 'none',
                background: 'var(--accent)',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.25)',
                transition: 'all 0.15s ease',
              }}
            >
              <Plus size={16} />
              Add Working Window
            </button>
            <button
              type="button"
              id="add-blocked-date-btn"
              onClick={handleOpenCreateBlockedDate}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(244, 63, 94, 0.35)',
                background: 'rgba(244, 63, 94, 0.08)',
                color: '#fb7185',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <CalendarX size={15} />
              Block Date
            </button>
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
                title="Refresh availability data"
              >
                <RefreshCw size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Timezone banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '10px 14px',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            fontSize: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-h)' }}>
            <Globe size={15} color="var(--accent)" />
            <span style={{ fontWeight: 600 }}>Business Timezone:</span>
            <code
              style={{
                padding: '2px 8px',
                borderRadius: '4px',
                background: 'rgba(99, 102, 241, 0.1)',
                color: 'var(--accent)',
                fontWeight: 700,
                fontSize: '12px',
              }}
            >
              {timezone}
            </code>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text)' }}>
            <Info size={13} style={{ opacity: 0.7 }} />
            <span>Availability and appointment slot times are calculated strictly in the business timezone.</span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. SCHEDULE SCOPE FILTER BAR                             */}
      {/* ======================================================== */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: 'var(--text)',
              marginRight: '4px',
            }}
          >
            Filter By Scope:
          </span>

          {/* All schedules */}
          <button
            type="button"
            onClick={() => setScheduleScopeFilter('ALL')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '20px',
              border: '1px solid',
              borderColor: scheduleScopeFilter === 'ALL' ? 'var(--accent)' : 'var(--border)',
              background: scheduleScopeFilter === 'ALL' ? 'rgba(99, 102, 241, 0.15)' : 'var(--code-bg)',
              color: scheduleScopeFilter === 'ALL' ? 'var(--accent)' : 'var(--text)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            All Schedules
            <span
              style={{
                padding: '1px 6px',
                borderRadius: '10px',
                background: scheduleScopeFilter === 'ALL' ? 'var(--accent)' : 'var(--border)',
                color: '#fff',
                fontSize: '11px',
              }}
            >
              {availabilityList.length}
            </span>
          </button>

          {/* Business Default */}
          <button
            type="button"
            onClick={() => setScheduleScopeFilter('BUSINESS')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '20px',
              border: '1px solid',
              borderColor: scheduleScopeFilter === 'BUSINESS' ? '#10b981' : 'var(--border)',
              background:
                scheduleScopeFilter === 'BUSINESS' ? 'rgba(16, 185, 129, 0.15)' : 'var(--code-bg)',
              color: scheduleScopeFilter === 'BUSINESS' ? '#10b981' : 'var(--text)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Building2 size={13} />
            Business Default
            <span
              style={{
                padding: '1px 6px',
                borderRadius: '10px',
                background: scheduleScopeFilter === 'BUSINESS' ? '#10b981' : 'var(--border)',
                color: '#fff',
                fontSize: '11px',
              }}
            >
              {businessWideCount}
            </span>
          </button>

          {/* Individual Staff Overrides */}
          {staff.map((st) => {
            const count = availabilityList.filter(
              (a) => (a.staffId?._id || a.staffId) === st._id
            ).length;
            const isSelected = scheduleScopeFilter === st._id;
            return (
              <button
                key={st._id}
                type="button"
                onClick={() => setScheduleScopeFilter(st._id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: '1px solid',
                  borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
                  background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'var(--code-bg)',
                  color: isSelected ? 'var(--accent)' : 'var(--text)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <User size={13} />
                {st.name}
                <span
                  style={{
                    padding: '1px 6px',
                    borderRadius: '10px',
                    background: isSelected ? 'var(--accent)' : 'var(--border)',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Override rule explanation note */}
        <div style={{ fontSize: '11px', color: 'var(--text)', fontStyle: 'italic' }}>
          Staff-specific hours override business default for that weekday.
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. WEEKLY RECURRING SCHEDULE                             */}
      {/* ======================================================== */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '14px',
          }}
        >
          <div>
            <h2
              style={{
                fontSize: '17px',
                fontWeight: 700,
                color: 'var(--text-h)',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Clock size={18} color="var(--accent)" />
              Weekly Operating Hours
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text)', margin: '2px 0 0' }}>
              Recurring working windows mapped to each day of the week.
            </p>
          </div>

          <span style={{ fontSize: '12px', color: 'var(--text)' }}>
            Showing <strong>{filteredAvailability.length}</strong> active & scheduled windows
          </span>
        </div>

        {/* Days Container */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {DAYS_ORDER.map((dayNum) => {
            const dayName = DAYS_MAP[dayNum];
            const shortDay = SHORT_DAYS_MAP[dayNum];
            const dayWindows = filteredAvailability.filter((a) => a.dayOfWeek === dayNum);
            const hasActive = dayWindows.some((w) => w.isActive);
            const isClosed = dayWindows.length === 0;

            return (
              <div
                key={dayNum}
                id={`availability-day-card-${dayNum}`}
                style={{
                  background: 'var(--code-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '14px 18px',
                  transition: 'all 0.15s ease',
                }}
              >
                {/* Day Header Row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                    borderBottom: dayWindows.length > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                    paddingBottom: dayWindows.length > 0 ? '12px' : '0',
                    marginBottom: dayWindows.length > 0 ? '12px' : '0',
                  }}
                >
                  {/* Left: Day Badge & Status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '8px',
                        background: isClosed
                          ? 'rgba(100, 116, 139, 0.15)'
                          : hasActive
                          ? 'rgba(16, 185, 129, 0.12)'
                          : 'rgba(234, 179, 8, 0.12)',
                        color: isClosed
                          ? '#94a3b8'
                          : hasActive
                          ? '#10b981'
                          : '#eab308',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '13px',
                        flexShrink: 0,
                      }}
                    >
                      <span>{shortDay}</span>
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-h)' }}>
                          {dayName}
                        </span>

                        {isClosed ? (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: 'rgba(148, 163, 184, 0.15)',
                              color: '#94a3b8',
                              letterSpacing: '0.4px',
                            }}
                          >
                            CLOSED
                          </span>
                        ) : hasActive ? (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: 'rgba(16, 185, 129, 0.15)',
                              color: '#10b981',
                              letterSpacing: '0.4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: '#10b981',
                              }}
                            />
                            OPEN
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: 'rgba(234, 179, 8, 0.15)',
                              color: '#eab308',
                              letterSpacing: '0.4px',
                            }}
                          >
                            PAUSED / INACTIVE
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '12px', color: 'var(--text)', marginTop: '2px' }}>
                        {isClosed
                          ? 'No working windows configured. Bookings blocked for this day.'
                          : `${dayWindows.length} working ${
                              dayWindows.length === 1 ? 'window' : 'windows'
                            } configured`}
                      </div>
                    </div>
                  </div>

                  {/* Right: Quick Add Window for this specific day */}
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        handleOpenCreateAvailability();
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        background: 'var(--bg)',
                        color: 'var(--text-h)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      title={`Add working window for ${dayName}`}
                    >
                      <Plus size={13} color="var(--accent)" />
                      Add Window
                    </button>
                  </div>
                </div>

                {/* Day Working Windows List */}
                {dayWindows.length === 0 ? (
                  <div
                    style={{
                      padding: '12px 14px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: 'var(--text)',
                      fontStyle: 'italic',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>Closed — No hours configured for {dayName}.</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {dayWindows.map((win) => {
                      const isStaffWindow = Boolean(win.staffId);
                      const staffName = win.staffId?.name || 'Assigned Staff';
                      const isToggling = togglingId === win._id;

                      return (
                        <div
                          key={win._id}
                          id={`availability-item-${win._id}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '12px',
                            background: 'var(--bg)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            padding: '10px 14px',
                            opacity: win.isActive ? 1 : 0.65,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {/* Time & Scope details */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                            {/* Formatted Hours */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Clock size={15} color="var(--accent)" />
                              <span
                                style={{
                                  fontWeight: 700,
                                  fontSize: '14px',
                                  color: 'var(--text-h)',
                                  letterSpacing: '-0.2px',
                                }}
                              >
                                {formatTime12(win.startTime)} &mdash; {formatTime12(win.endTime)}
                              </span>
                              <span
                                style={{
                                  fontSize: '11px',
                                  color: 'var(--text)',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  background: 'rgba(255, 255, 255, 0.05)',
                                }}
                              >
                                ({win.startTime} &mdash; {win.endTime})
                              </span>
                            </div>

                            {/* Scope Badge */}
                            <div>
                              {isStaffWindow ? (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    padding: '3px 9px',
                                    borderRadius: '6px',
                                    background: 'rgba(99, 102, 241, 0.15)',
                                    color: 'var(--accent)',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                  }}
                                >
                                  <User size={13} />
                                  Staff: {staffName}
                                </span>
                              ) : (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    padding: '3px 9px',
                                    borderRadius: '6px',
                                    background: 'rgba(16, 185, 129, 0.12)',
                                    color: '#10b981',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                  }}
                                >
                                  <Building2 size={13} />
                                  Business Default
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Interactive Toggle Switch & Actions */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {/* Toggle Button */}
                            <button
                              type="button"
                              onClick={() => handleToggleActive(win)}
                              disabled={isToggling}
                              title={win.isActive ? 'Click to disable window' : 'Click to enable window'}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '5px 10px',
                                borderRadius: '6px',
                                border: '1px solid',
                                borderColor: win.isActive
                                  ? 'rgba(16, 185, 129, 0.4)'
                                  : 'rgba(234, 179, 8, 0.4)',
                                background: win.isActive
                                  ? 'rgba(16, 185, 129, 0.1)'
                                  : 'rgba(234, 179, 8, 0.1)',
                                color: win.isActive ? '#10b981' : '#eab308',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: isToggling ? 'not-allowed' : 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              {isToggling ? (
                                <RefreshCw size={12} className="spin" />
                              ) : win.isActive ? (
                                <CheckCircle2 size={12} />
                              ) : (
                                <XCircle size={12} />
                              )}
                              <span>{win.isActive ? 'ACTIVE' : 'PAUSED'}</span>
                            </button>

                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditAvailability(win)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: '1px solid var(--border)',
                                background: 'transparent',
                                color: 'var(--text-h)',
                                fontSize: '12px',
                                fontWeight: 500,
                                cursor: 'pointer',
                              }}
                              title="Edit window hours or staff"
                            >
                              <Edit2 size={13} />
                              <span className="hidden sm:inline">Edit</span>
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteAvailability(win)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                background: 'rgba(239, 68, 68, 0.06)',
                                color: '#ef4444',
                                fontSize: '12px',
                                fontWeight: 500,
                                cursor: 'pointer',
                              }}
                              title="Delete window"
                            >
                              <Trash2 size={13} />
                              <span className="hidden sm:inline">Delete</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. BLOCKED DATES & HOLIDAYS                              */}
      {/* ======================================================== */}
      <div
        id="blocked-dates-section"
        style={{
          background: 'var(--code-bg)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '20px 24px',
        }}
      >
        <div style={{ marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarX size={20} color="#fb7185" />
            <h2
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: 'var(--text-h)',
                margin: 0,
              }}
            >
              Blocked Dates & Holidays
            </h2>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text)', margin: '4px 0 0' }}>
            Prevent appointments from being booked on specific dates (Business-wide closures, holidays, or staff leave).
          </p>
        </div>

        {/* Inline Quick Block Form */}
        <form
          onSubmit={handleInlineAddBlockedDate}
          style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '16px',
            marginBottom: '20px',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-h)', marginBottom: '12px' }}>
            Quick Block a Date:
          </div>

          {inlineBlockError && (
            <div
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#ef4444',
                fontSize: '12px',
                marginBottom: '12px',
              }}
            >
              {inlineBlockError}
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
              gap: '12px',
              alignItems: 'flex-end',
            }}
          >
            {/* Date Input */}
            <div>
              <label
                htmlFor="inline-block-date"
                style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}
              >
                Date (Required)
              </label>
              <input
                id="inline-block-date"
                type="date"
                value={inlineBlockDate}
                onChange={(e) => setInlineBlockDate(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--code-bg)',
                  color: 'var(--text-h)',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Scope / Staff */}
            <div>
              <label
                htmlFor="inline-block-staff"
                style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}
              >
                Scope
              </label>
              <select
                id="inline-block-staff"
                value={inlineBlockStaffId}
                onChange={(e) => setInlineBlockStaffId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--code-bg)',
                  color: 'var(--text-h)',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              >
                <option value="">🏢 Entire Business (All Staff)</option>
                {staff.map((st) => (
                  <option key={st._id} value={st._id}>
                    👤 Staff: {st.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Reason */}
            <div>
              <label
                htmlFor="inline-block-reason"
                style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}
              >
                Reason (Optional)
              </label>
              <input
                id="inline-block-reason"
                type="text"
                placeholder="e.g. National Holiday, Studio Renovation"
                value={inlineBlockReason}
                onChange={(e) => setInlineBlockReason(e.target.value)}
                maxLength={200}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--code-bg)',
                  color: 'var(--text-h)',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                id="inline-submit-block-date-btn"
                disabled={inlineBlockLoading || !inlineBlockDate}
                style={{
                  width: '100%',
                  padding: '9px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#fb7185',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: inlineBlockLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                {inlineBlockLoading ? (
                  <>
                    <RefreshCw size={14} className="spin" /> Blocking...
                  </>
                ) : (
                  <>
                    <CalendarX size={14} /> Block Date
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Existing Blocked Dates Table / Cards */}
        {blockedDates.length === 0 ? (
          <div
            id="empty-blocked-dates-view"
            style={{
              padding: '36px 20px',
              textAlign: 'center',
              background: 'var(--bg)',
              border: '1px dashed var(--border)',
              borderRadius: '8px',
            }}
          >
            <CalendarX size={32} color="var(--text)" style={{ opacity: 0.3, marginBottom: '8px' }} />
            <h3 style={{ margin: '0 0 4px', fontSize: '15px', color: 'var(--text-h)' }}>
              No blocked dates configured
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text)' }}>
              All regular working days are open for appointments. Add a blocked date above when you need to temporarily close availability.
            </p>
          </div>
        ) : (
          <div
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table
                id="blocked-dates-table"
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  textAlign: 'left',
                  fontSize: '13px',
                }}
              >
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-h)' }}>
                      DATE
                    </th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-h)' }}>
                      SCOPE
                    </th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-h)' }}>
                      REASON
                    </th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-h)', textAlign: 'right' }}>
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {blockedDates.map((b) => {
                    const rawDate = b.date ? new Date(b.date) : null;
                    const dateFormatted = rawDate ? rawDate.toISOString().split('T')[0] : '';
                    const dateReadable = rawDate
                      ? rawDate.toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : '';
                    const isStaff = Boolean(b.staffId);
                    const staffName = b.staffId?.name || 'Staff Member';

                    return (
                      <tr
                        key={b._id}
                        id={`blocked-date-row-${b._id}`}
                        style={{ borderBottom: '1px solid var(--border)' }}
                      >
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-h)', whiteSpace: 'nowrap' }}>
                          <div>{dateReadable}</div>
                          <span style={{ fontSize: '11px', color: 'var(--text)', fontWeight: 400 }}>
                            {dateFormatted}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          {isStaff ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                background: 'rgba(99, 102, 241, 0.15)',
                                color: 'var(--accent)',
                                fontSize: '12px',
                                fontWeight: 600,
                              }}
                            >
                              <User size={12} /> Staff: {staffName}
                            </span>
                          ) : (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                background: 'rgba(244, 63, 94, 0.12)',
                                color: '#fb7185',
                                fontSize: '12px',
                                fontWeight: 600,
                              }}
                            >
                              <Building2 size={12} /> Entire Business
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text)' }}>
                          {b.reason || <span style={{ opacity: 0.4 }}>- No reason provided -</span>}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            id={`delete-blocked-btn-${b._id}`}
                            onClick={() => handleDeleteBlockedDate(b)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '5px 10px',
                              borderRadius: '5px',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              background: 'rgba(239, 68, 68, 0.08)',
                              color: '#ef4444',
                              fontSize: '12px',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                            title="Remove blocked date"
                          >
                            <Trash2 size={12} />
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 5. SLOT GENERATION ENGINE PREVIEW                        */}
      {/* ======================================================== */}
      <div
        id="slot-preview-section"
        style={{
          background: 'var(--code-bg)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '20px 24px',
        }}
      >
        <div style={{ marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} color="var(--accent)" />
            <h2
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: 'var(--text-h)',
                margin: 0,
              }}
            >
              Slot Preview
            </h2>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text)', margin: '4px 0 0' }}>
            Preview available appointment slots before customers book. Tests real-time engine calculation
            with 15-minute start intervals, service durations, working hours, and conflict checks.
          </p>
        </div>

        {/* Controls Form */}
        <form
          onSubmit={handleExecuteSlotPreview}
          style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '16px',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '14px',
              alignItems: 'flex-end',
            }}
          >
            {/* Service */}
            <div>
              <label
                htmlFor="preview-service-select"
                style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-h)', marginBottom: '4px' }}
              >
                Service (Required)
              </label>
              <select
                id="preview-service-select"
                value={previewServiceId}
                onChange={(e) => setPreviewServiceId(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--code-bg)',
                  color: 'var(--text-h)',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              >
                <option value="">-- Select a Service --</option>
                {services.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.durationMinutes}m) {s.status !== 'ACTIVE' ? `[${s.status}]` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label
                htmlFor="preview-date-input"
                style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-h)', marginBottom: '4px' }}
              >
                Date (Required)
              </label>
              <input
                id="preview-date-input"
                type="date"
                value={previewDate}
                onChange={(e) => setPreviewDate(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--code-bg)',
                  color: 'var(--text-h)',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Staff */}
            <div>
              <label
                htmlFor="preview-staff-select"
                style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-h)', marginBottom: '4px' }}
              >
                Staff Member (Optional)
              </label>
              <select
                id="preview-staff-select"
                value={previewStaffId}
                onChange={(e) => setPreviewStaffId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--code-bg)',
                  color: 'var(--text-h)',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              >
                <option value="">👥 Any Eligible Staff</option>
                {staff
                  .filter((st) => st.status === 'ACTIVE')
                  .map((st) => (
                    <option key={st._id} value={st._id}>
                      👤 {st.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Submit */}
            <div>
              <button
                type="submit"
                id="preview-slots-btn"
                disabled={previewLoading || !previewServiceId || !previewDate}
                style={{
                  width: '100%',
                  padding: '10px 18px',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'var(--accent)',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: previewLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease',
                }}
              >
                {previewLoading ? (
                  <>
                    <RefreshCw size={14} className="spin" /> Calculating...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} /> Calculate Available Slots
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Results Area */}
        {previewError && (
          <div
            id="slot-preview-error"
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#ef4444',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} />
            <span>{previewError}</span>
          </div>
        )}

        {previewSlotsResult && !previewError && (
          <div id="slot-preview-results" style={{ marginTop: '16px' }}>
            {/* Header info badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                padding: '12px 16px',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '13px' }}>
                <div>
                  <span style={{ color: 'var(--text)', fontSize: '11px', display: 'block' }}>SERVICE</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-h)' }}>
                    {previewSlotsResult.service?.name} ({previewSlotsResult.service?.durationMinutes}m)
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--text)', fontSize: '11px', display: 'block' }}>DATE</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-h)' }}>
                    {previewSlotsResult.date}
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--text)', fontSize: '11px', display: 'block' }}>TIMEZONE</span>
                  <span style={{ fontWeight: 700, color: 'var(--accent)' }}>
                    {previewSlotsResult.timezone || timezone}
                  </span>
                </div>
              </div>

              <div>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    background:
                      (previewSlotsResult.slots || []).length > 0
                        ? 'rgba(16, 185, 129, 0.15)'
                        : 'rgba(239, 68, 68, 0.15)',
                    color: (previewSlotsResult.slots || []).length > 0 ? '#10b981' : '#ef4444',
                    fontWeight: 700,
                    fontSize: '12px',
                  }}
                >
                  {(previewSlotsResult.slots || []).length > 0 ? (
                    <CheckCircle2 size={13} />
                  ) : (
                    <XCircle size={13} />
                  )}
                  {(previewSlotsResult.slots || []).length} Slots Available
                </span>
              </div>
            </div>

            {/* Generated Slots Grid */}
            {(previewSlotsResult.slots || []).length === 0 ? (
              <div
                style={{
                  padding: '36px 20px',
                  textAlign: 'center',
                  background: 'var(--bg)',
                  border: '1px dashed var(--border)',
                  borderRadius: '8px',
                }}
              >
                <CalendarX size={32} color="var(--text)" style={{ opacity: 0.3, marginBottom: '8px' }} />
                <h4 style={{ margin: '0 0 6px', color: 'var(--text-h)', fontSize: '15px' }}>
                  No available slots for this date
                </h4>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text)', maxWidth: '480px', marginInline: 'auto' }}>
                  The business may be closed on this day, working hours might be paused, the date might be blocked, or staff schedules are fully booked.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                  gap: '8px',
                }}
              >
                {(previewSlotsResult.slots || []).map((slotTime, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-h)',
                      fontSize: '13px',
                      fontWeight: 600,
                      textAlign: 'center',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Clock size={12} color="var(--accent)" />
                    <span>{formatTime12(slotTime)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
