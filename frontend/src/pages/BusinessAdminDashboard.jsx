import { useState, useEffect, useMemo } from 'react';
import Header from '../components/Header.jsx';
import ServiceModal from '../components/ServiceModal.jsx';
import StaffModal from '../components/StaffModal.jsx';
import AvailabilityModal from '../components/AvailabilityModal.jsx';
import BlockedDateModal from '../components/BlockedDateModal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { getServices, createService, updateService, deleteService } from '../services/service.service.js';
import { getStaffList, createStaff, updateStaff, deleteStaff } from '../services/staff.service.js';
import {
  getAvailabilityList,
  createAvailability,
  updateAvailability,
  deleteAvailability,
  getAvailableSlots,
} from '../services/availability.service.js';
import {
  getBlockedDates,
  createBlockedDate,
  updateBlockedDate,
  deleteBlockedDate,
} from '../services/blockedDate.service.js';
import {
  getAppointments,
  createAppointment,
  cancelAppointment,
  updateAppointmentStatus,
} from '../services/appointment.service.js';
import AppointmentCalendar from '../components/AppointmentCalendar.jsx';
import AppointmentDetailsModal from '../components/AppointmentDetailsModal.jsx';
import { BookAppointmentModal } from '../components/BookAppointmentModal.jsx';
import AnalyticsView from '../components/AnalyticsView.jsx';
import { getBusinessById } from '../services/business.service.js';
import {
  Scissors,
  Users,
  Plus,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Power,
  Mail,
  Phone,
  Briefcase,
  Building2,
  Calendar,
  CalendarX,
  CalendarCheck,
  CalendarDays,
  Sparkles,
  Layers,
  AlertCircle,
  ChevronRight,
  Globe,
  Eye,
  List,
  UserX,
  BarChart3,
} from 'lucide-react';


const DAYS_MAP = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

export default function BusinessAdminDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('services'); // 'services' | 'staff' | 'availability' | 'slots' | 'appointments'
  const [businessInfo, setBusinessInfo] = useState(null);

  // Data states
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [availabilityList, setAvailabilityList] = useState([]);
  const [blockedDates, setBlockedDates] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Search & Filter queries
  const [serviceSearch, setServiceSearch] = useState('');
  const [staffSearch, setStaffSearch] = useState('');
  const [appointmentSubView, setAppointmentSubView] = useState('list'); // 'list' | 'calendar'
  const [appointmentSearch, setAppointmentSearch] = useState('');
  const [appointmentFilterService, setAppointmentFilterService] = useState('');
  const [appointmentFilterStaff, setAppointmentFilterStaff] = useState('');
  const [appointmentFilterStatus, setAppointmentFilterStatus] = useState('');
  const [appointmentFilterDate, setAppointmentFilterDate] = useState('');

  // Appointment details modal state
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);


  // Modal states
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [serviceToEdit, setServiceToEdit] = useState(null);

  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [staffToEdit, setStaffToEdit] = useState(null);

  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [availabilityToEdit, setAvailabilityToEdit] = useState(null);

  const [isBlockedDateModalOpen, setIsBlockedDateModalOpen] = useState(false);
  const [blockedDateToEdit, setBlockedDateToEdit] = useState(null);

  const [isBookModalOpen, setIsBookModalOpen] = useState(false);

  // Slot Preview Engine State
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  const [previewServiceId, setPreviewServiceId] = useState('');
  const [previewDate, setPreviewDate] = useState(tomorrowStr);
  const [previewStaffId, setPreviewStaffId] = useState('');
  const [previewSlotsResult, setPreviewSlotsResult] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    confirmStyle: 'primary',
    onConfirm: () => {},
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (user?.businessId) {
        try {
          const bizData = await getBusinessById(user.businessId);
          setBusinessInfo(bizData);
        } catch {
          // Non-blocking fallback
        }
      }

      // Fetch all tenant operational data in parallel
      const [servicesData, staffData, availData, blockedData, appointmentsData] = await Promise.all([
        getServices(),
        getStaffList(),
        getAvailabilityList(),
        getBlockedDates(),
        getAppointments().catch(() => ({ data: [] })),
      ]);

      setServices(servicesData);
      setStaff(staffData);
      setAvailabilityList(availData);
      setBlockedDates(blockedData);
      setAppointments(appointmentsData?.data || []);

      // Initialize preview service if not set
      if (!previewServiceId && servicesData.length > 0) {
        const firstActive = servicesData.find((s) => s.status === 'ACTIVE') || servicesData[0];
        setPreviewServiceId(firstActive._id);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load business data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Real-time metric computations
  const metrics = useMemo(() => {
    const activeServices = services.filter((s) => s.status === 'ACTIVE').length;
    const inactiveServices = services.filter((s) => s.status === 'INACTIVE').length;
    const activeStaff = staff.filter((st) => st.status === 'ACTIVE').length;
    const inactiveStaff = staff.filter((st) => st.status === 'INACTIVE').length;
    const activeWindows = availabilityList.filter((a) => a.isActive).length;
    const totalBlocked = blockedDates.length;
    const confirmedAppointments = appointments.filter((a) => a.status === 'CONFIRMED').length;

    return {
      activeServices,
      inactiveServices,
      activeStaff,
      inactiveStaff,
      activeWindows,
      totalBlocked,
      confirmedAppointments,
    };
  }, [services, staff, availabilityList, blockedDates, appointments]);

  // Filtered lists
  const filteredServices = useMemo(() => {
    const query = serviceSearch.toLowerCase().trim();
    if (!query) return services;
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        (s.description && s.description.toLowerCase().includes(query)) ||
        s.status.toLowerCase().includes(query)
    );
  }, [services, serviceSearch]);

  const filteredStaff = useMemo(() => {
    const query = staffSearch.toLowerCase().trim();
    if (!query) return staff;
    return staff.filter(
      (st) =>
        st.name.toLowerCase().includes(query) ||
        (st.email && st.email.toLowerCase().includes(query)) ||
        (st.phone && st.phone.includes(query)) ||
        st.status.toLowerCase().includes(query)
    );
  }, [staff, staffSearch]);

  const showSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // --- Service Actions ---
  const handleOpenCreateService = () => {
    setServiceToEdit(null);
    setIsServiceModalOpen(true);
  };

  const handleOpenEditService = (srv) => {
    setServiceToEdit(srv);
    setIsServiceModalOpen(true);
  };

  const handleSaveService = async (formData, serviceId) => {
    if (serviceId) {
      await updateService(serviceId, formData);
      showSuccess('Service updated successfully.');
    } else {
      await createService(formData);
      showSuccess('Service created successfully.');
    }
    await fetchData();
  };

  const handleToggleServiceStatus = async (srv) => {
    const nextStatus = srv.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await updateService(srv._id, { status: nextStatus });
      showSuccess(`Service "${srv.name}" marked as ${nextStatus}.`);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to toggle service status.');
    }
  };

  const handleDeleteService = (srv) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Service',
      message: `Are you sure you want to permanently delete "${srv.name}"? If it is assigned to staff or appointments, deletion will be safely rejected.`,
      confirmText: 'Delete Service',
      confirmStyle: 'danger',
      onConfirm: async () => {
        try {
          await deleteService(srv._id);
          showSuccess(`Service "${srv.name}" deleted successfully.`);
          await fetchData();
        } catch (err) {
          setError(err.response?.data?.message || err.message || 'Failed to delete service.');
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // --- Staff Actions ---
  const handleOpenCreateStaff = () => {
    setStaffToEdit(null);
    setIsStaffModalOpen(true);
  };

  const handleOpenEditStaff = (st) => {
    setStaffToEdit(st);
    setIsStaffModalOpen(true);
  };

  const handleSaveStaff = async (formData, staffId) => {
    if (staffId) {
      await updateStaff(staffId, formData);
      showSuccess('Staff member updated successfully.');
    } else {
      await createStaff(formData);
      showSuccess('Staff member added successfully.');
    }
    await fetchData();
  };

  const handleToggleStaffStatus = async (st) => {
    const nextStatus = st.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await updateStaff(st._id, { status: nextStatus });
      showSuccess(`Staff member "${st.name}" marked as ${nextStatus}.`);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to toggle staff status.');
    }
  };

  const handleDeleteStaff = (st) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Staff Member',
      message: `Are you sure you want to permanently remove "${st.name}" from your staff roster?`,
      confirmText: 'Remove Staff',
      confirmStyle: 'danger',
      onConfirm: async () => {
        try {
          await deleteStaff(st._id);
          showSuccess(`Staff member "${st.name}" removed successfully.`);
          await fetchData();
        } catch (err) {
          setError(err.response?.data?.message || err.message || 'Failed to delete staff member.');
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // --- Availability Actions ---
  const handleOpenCreateAvailability = () => {
    setAvailabilityToEdit(null);
    setIsAvailabilityModalOpen(true);
  };

  const handleOpenEditAvailability = (avail) => {
    setAvailabilityToEdit(avail);
    setIsAvailabilityModalOpen(true);
  };

  const handleSaveAvailability = async (payload, id) => {
    if (id) {
      await updateAvailability(id, payload);
      showSuccess('Availability window updated successfully.');
    } else {
      await createAvailability(payload);
      showSuccess('Availability window added successfully.');
    }
    await fetchData();
  };

  const handleDeleteAvailability = (avail) => {
    const scope = avail.staffId ? `Staff: ${avail.staffId.name}` : 'Business-Wide';
    const day = DAYS_MAP[avail.dayOfWeek] || 'Day';
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Availability Window',
      message: `Delete availability window (${day} ${avail.startTime} - ${avail.endTime}) for ${scope}?`,
      confirmText: 'Delete Window',
      confirmStyle: 'danger',
      onConfirm: async () => {
        try {
          await deleteAvailability(avail._id);
          showSuccess('Availability window deleted successfully.');
          await fetchData();
        } catch (err) {
          setError(err.response?.data?.message || err.message || 'Failed to delete availability.');
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // --- Blocked Dates Actions ---
  const handleOpenCreateBlockedDate = () => {
    setBlockedDateToEdit(null);
    setIsBlockedDateModalOpen(true);
  };

  const handleOpenEditBlockedDate = (bDate) => {
    setBlockedDateToEdit(bDate);
    setIsBlockedDateModalOpen(true);
  };

  const handleSaveBlockedDate = async (payload, id) => {
    if (id) {
      await updateBlockedDate(id, payload);
      showSuccess('Blocked date updated successfully.');
    } else {
      await createBlockedDate(payload);
      showSuccess('Date blocked successfully.');
    }
    await fetchData();
  };

  const handleDeleteBlockedDate = (bDate) => {
    const dateStr = bDate.date ? new Date(bDate.date).toISOString().split('T')[0] : '';
    setConfirmDialog({
      isOpen: true,
      title: 'Remove Blocked Date',
      message: `Remove block on ${dateStr}? This will make the date available for slot generation again.`,
      confirmText: 'Remove Block',
      confirmStyle: 'primary',
      onConfirm: async () => {
        try {
          await deleteBlockedDate(bDate._id);
          showSuccess('Blocked date removed successfully.');
          await fetchData();
        } catch (err) {
          setError(err.response?.data?.message || err.message || 'Failed to remove blocked date.');
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // --- Slot Preview Action ---
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
      setPreviewError(err.response?.data?.message || err.message || 'Failed to calculate available slots.');
      setPreviewSlotsResult(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  // --- Appointment Actions ---
  const handleSaveAppointment = async (bookingPayload) => {
    await createAppointment(bookingPayload);
    showSuccess('Appointment booked successfully!');
    await fetchData();
  };

  const handleCancelAppointment = (appt) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Cancel Appointment',
      message: `Are you sure you want to cancel the appointment for ${appt.customerName}? The time slot will immediately become available for other customers.`,
      confirmText: 'Cancel Appointment',
      confirmStyle: 'danger',
      onConfirm: async () => {
        try {
          await cancelAppointment(appt._id);
          showSuccess('Appointment cancelled successfully.');
          await fetchData();
        } catch (err) {
          setError(err.response?.data?.message || err.message || 'Failed to cancel appointment.');
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const businessDisplayName = businessInfo?.name || 'Your Business';
  const businessTimezone = businessInfo?.timezone || 'Asia/Kolkata';

  const handleOpenAppointmentDetails = (appt) => {
    setSelectedAppointment(appt);
    setIsDetailsModalOpen(true);
  };

  const handleUpdateAppointmentStatus = (targetStatus) => {
    if (!selectedAppointment) return;

    let title = 'Update Appointment';
    let message = `Are you sure you want to mark this appointment as ${targetStatus}?`;
    let confirmStyle = 'primary';
    let confirmText = `Mark ${targetStatus}`;

    if (targetStatus === 'CANCELLED') {
      title = 'Cancel Appointment';
      message = `Are you sure you want to cancel the appointment for ${selectedAppointment.customerName}? The time slot will immediately become available for other customers.`;
      confirmStyle = 'danger';
      confirmText = 'Cancel Appointment';
    } else if (targetStatus === 'COMPLETED') {
      title = 'Complete Appointment';
      message = `Mark appointment for ${selectedAppointment.customerName} as COMPLETED?`;
      confirmText = 'Mark Completed';
    } else if (targetStatus === 'NO_SHOW') {
      title = 'Mark No-Show';
      message = `Mark appointment for ${selectedAppointment.customerName} as NO-SHOW?`;
      confirmStyle = 'danger';
      confirmText = 'Mark No-Show';
    }

    setConfirmDialog({
      isOpen: true,
      title,
      message,
      confirmText,
      confirmStyle,
      onConfirm: async () => {
        setDetailsLoading(true);
        try {
          await updateAppointmentStatus(selectedAppointment._id, targetStatus);
          showSuccess(`Appointment marked as ${targetStatus}.`);
          setIsDetailsModalOpen(false);
          setSelectedAppointment(null);
          await fetchData();
        } catch (err) {
          setError(err.response?.data?.message || err.message || `Failed to update status to ${targetStatus}.`);
        } finally {
          setDetailsLoading(false);
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const filteredAppointments = useMemo(() => {
    return appointments.filter((appt) => {
      if (appointmentFilterStatus && appt.status !== appointmentFilterStatus) {
        return false;
      }
      if (appointmentFilterService) {
        const sId = appt.serviceId?._id || appt.serviceId;
        if (sId !== appointmentFilterService) return false;
      }
      if (appointmentFilterStaff) {
        const stId = appt.staffId?._id || appt.staffId;
        if (stId !== appointmentFilterStaff) return false;
      }
      if (appointmentFilterDate) {
        try {
          const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: businessTimezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          });
          const parts = formatter.formatToParts(new Date(appt.startTime));
          const partMap = {};
          for (const p of parts) partMap[p.type] = p.value;
          const apptDateStr = `${partMap.year}-${partMap.month}-${partMap.day}`;
          if (apptDateStr !== appointmentFilterDate) return false;
        } catch {
          const apptDateStr = new Date(appt.startTime).toISOString().split('T')[0];
          if (apptDateStr !== appointmentFilterDate) return false;
        }
      }
      if (appointmentSearch && appointmentSearch.trim()) {
        const q = appointmentSearch.toLowerCase().trim();
        const name = (appt.customerName || '').toLowerCase();
        const email = (appt.customerEmail || '').toLowerCase();
        const phone = (appt.customerPhone || '').toLowerCase();
        if (!name.includes(q) && !email.includes(q) && !phone.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [
    appointments,
    appointmentFilterStatus,
    appointmentFilterService,
    appointmentFilterStaff,
    appointmentFilterDate,
    appointmentSearch,
    businessTimezone,
  ]);


  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <Header user={user} onLogout={onLogout} />

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 20px' }}>
        {/* Banner Feedback */}
        {error && (
          <div
            id="dashboard-error-banner"
            style={{
              marginBottom: '20px',
              padding: '12px 18px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '14px',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} /> {error}
            </span>
            <button
              type="button"
              onClick={() => setError(null)}
              style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
            >
              <XCircle size={16} />
            </button>
          </div>
        )}

        {successMessage && (
          <div
            id="dashboard-success-banner"
            style={{
              marginBottom: '20px',
              padding: '12px 18px',
              borderRadius: '8px',
              background: 'rgba(34, 197, 94, 0.12)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              color: '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '14px',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} /> {successMessage}
            </span>
            <button
              type="button"
              onClick={() => setSuccessMessage(null)}
              style={{ background: 'transparent', border: 'none', color: '#16a34a', cursor: 'pointer' }}
            >
              <XCircle size={16} />
            </button>
          </div>
        )}

        {/* Business Header Overview */}
        <div style={{ textAlign: 'left', marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Building2 size={20} color="var(--accent)" />
                <h1 style={{ margin: 0, fontSize: '26px', color: 'var(--text-h)', fontWeight: 700 }}>
                  {businessDisplayName}
                </h1>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: 'var(--text)' }}>
                <span>Tenant Administration</span>
                <span>&bull;</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Globe size={13} color="var(--accent)" /> Timezone: <strong>{businessTimezone}</strong>
                </span>
              </div>
            </div>

            {/* Quick Actions Top Bar */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                id="refresh-btn"
                onClick={fetchData}
                disabled={loading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--code-bg)',
                  color: 'var(--text-h)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                <RefreshCw size={15} className={loading ? 'spin' : ''} />
                Refresh
              </button>

              {activeTab === 'services' && (
                <button
                  type="button"
                  id="create-service-btn"
                  onClick={handleOpenCreateService}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '9px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'var(--accent)',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={16} />
                  Add Service
                </button>
              )}

              {activeTab === 'staff' && (
                <button
                  type="button"
                  id="create-staff-btn"
                  onClick={handleOpenCreateStaff}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '9px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'var(--accent)',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={16} />
                  Add Staff Member
                </button>
              )}

              {activeTab === 'availability' && (
                <div style={{ display: 'flex', gap: '8px' }}>
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
                    }}
                  >
                    <Plus size={16} />
                    Add Weekly Window
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
                      border: '1px solid rgba(244, 63, 94, 0.4)',
                      background: 'rgba(244, 63, 94, 0.1)',
                      color: '#fb7185',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <CalendarX size={15} />
                    Block Date
                  </button>
                </div>
              )}

              {activeTab === 'appointments' && (
                <button
                  type="button"
                  id="create-appointment-btn"
                  onClick={() => setIsBookModalOpen(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '9px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'var(--accent)',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={16} />
                  Book Test Appointment
                </button>
              )}
            </div>
          </div>

          {/* Metric Cards (Real backend counts) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              marginTop: '22px',
            }}
          >
            <div style={{ background: 'var(--code-bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text)', fontSize: '13px', fontWeight: 600 }}>
                <span>ACTIVE SERVICES</span>
                <Scissors size={18} color="#16a34a" />
              </div>
              <div style={{ fontSize: '30px', fontWeight: 800, color: '#16a34a', marginTop: '6px' }}>
                {metrics.activeServices}
              </div>
            </div>

            <div style={{ background: 'var(--code-bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text)', fontSize: '13px', fontWeight: 600 }}>
                <span>ACTIVE STAFF</span>
                <Users size={18} color="var(--accent)" />
              </div>
              <div style={{ fontSize: '30px', fontWeight: 800, color: 'var(--accent)', marginTop: '6px' }}>
                {metrics.activeStaff}
              </div>
            </div>

            <div style={{ background: 'var(--code-bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text)', fontSize: '13px', fontWeight: 600 }}>
                <span>WEEKLY WINDOWS</span>
                <Clock size={18} color="#818cf8" />
              </div>
              <div style={{ fontSize: '30px', fontWeight: 800, color: '#818cf8', marginTop: '6px' }}>
                {metrics.activeWindows}
              </div>
            </div>

            <div style={{ background: 'var(--code-bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text)', fontSize: '13px', fontWeight: 600 }}>
                <span>BLOCKED DATES</span>
                <CalendarX size={18} color="#f43f5e" />
              </div>
              <div style={{ fontSize: '30px', fontWeight: 800, color: '#f43f5e', marginTop: '6px' }}>
                {metrics.totalBlocked}
              </div>
            </div>

            <div style={{ background: 'var(--code-bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text)', fontSize: '13px', fontWeight: 600 }}>
                <span>APPOINTMENTS</span>
                <CalendarCheck size={18} color="#eab308" />
              </div>
              <div style={{ fontSize: '30px', fontWeight: 800, color: '#eab308', marginTop: '6px' }}>
                {metrics.confirmedAppointments}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', marginBottom: '20px', overflowX: 'auto' }}>
          <button
            type="button"
            id="tab-services-btn"
            onClick={() => setActiveTab('services')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              border: 'none',
              background: 'transparent',
              color: activeTab === 'services' ? 'var(--accent)' : 'var(--text)',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              borderBottom: activeTab === 'services' ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: '-1px',
              whiteSpace: 'nowrap',
            }}
          >
            <Scissors size={16} />
            Services ({services.length})
          </button>

          <button
            type="button"
            id="tab-staff-btn"
            onClick={() => setActiveTab('staff')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              border: 'none',
              background: 'transparent',
              color: activeTab === 'staff' ? 'var(--accent)' : 'var(--text)',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              borderBottom: activeTab === 'staff' ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: '-1px',
              whiteSpace: 'nowrap',
            }}
          >
            <Users size={16} />
            Staff ({staff.length})
          </button>

          <button
            type="button"
            id="tab-availability-btn"
            onClick={() => setActiveTab('availability')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              border: 'none',
              background: 'transparent',
              color: activeTab === 'availability' ? 'var(--accent)' : 'var(--text)',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              borderBottom: activeTab === 'availability' ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: '-1px',
              whiteSpace: 'nowrap',
            }}
          >
            <Calendar size={16} />
            Availability & Hours ({availabilityList.length})
          </button>

          <button
            type="button"
            id="tab-slots-btn"
            onClick={() => setActiveTab('slots')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              border: 'none',
              background: 'transparent',
              color: activeTab === 'slots' ? 'var(--accent)' : 'var(--text)',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              borderBottom: activeTab === 'slots' ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: '-1px',
              whiteSpace: 'nowrap',
            }}
          >
            <Sparkles size={16} />
            Slot Preview
          </button>

          <button
            type="button"
            id="tab-appointments-btn"
            onClick={() => setActiveTab('appointments')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              border: 'none',
              background: 'transparent',
              color: activeTab === 'appointments' ? 'var(--accent)' : 'var(--text)',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              borderBottom: activeTab === 'appointments' ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: '-1px',
              whiteSpace: 'nowrap',
            }}
          >
            <CalendarCheck size={16} />
            Appointments ({appointments.length})
          </button>

          <button
            type="button"
            id="tab-analytics-btn"
            onClick={() => setActiveTab('analytics')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              border: 'none',
              background: 'transparent',
              color: activeTab === 'analytics' ? 'var(--accent)' : 'var(--text)',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              borderBottom: activeTab === 'analytics' ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: '-1px',
              whiteSpace: 'nowrap',
            }}
          >
            <BarChart3 size={16} />
            Analytics & Insights
          </button>
        </div>

        {/* Tab 1: Services Catalog */}
        {activeTab === 'services' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px' }}>
              <div style={{ position: 'relative', flex: '1', maxWidth: '360px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text)', opacity: 0.6 }} />
                <input
                  type="text"
                  id="service-search-input"
                  placeholder="Search services by name or description..."
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px 9px 36px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--code-bg)',
                    color: 'var(--text-h)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {filteredServices.length === 0 ? (
              <div
                id="empty-services-view"
                style={{
                  padding: '60px 20px',
                  textAlign: 'center',
                  background: 'var(--code-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                }}
              >
                <Scissors size={40} color="var(--text)" style={{ opacity: 0.3, marginBottom: '12px' }} />
                <h3 style={{ margin: '0 0 6px', color: 'var(--text-h)', fontSize: '18px' }}>No services found</h3>
                <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--text)' }}>
                  {serviceSearch ? 'Try a different search query' : 'Create your first service to start offering appointments'}
                </p>
                {!serviceSearch && (
                  <button
                    type="button"
                    onClick={handleOpenCreateService}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'var(--accent)',
                      color: '#fff',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Plus size={15} /> Add Service
                  </button>
                )}
              </div>
            ) : (
              <div style={{ overflowX: 'auto', background: 'var(--code-bg)', border: '1px solid var(--border)', borderRadius: '10px' }}>
                <table id="services-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                      <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--text-h)' }}>SERVICE</th>
                      <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--text-h)' }}>DURATION</th>
                      <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--text-h)' }}>STATUS</th>
                      <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--text-h)', textAlign: 'right' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredServices.map((s) => (
                      <tr key={s._id} id={`service-row-${s._id}`} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-h)', fontSize: '14px' }}>{s.name}</div>
                          {s.description && (
                            <div style={{ fontSize: '12px', color: 'var(--text)', opacity: 0.8, marginTop: '2px' }}>
                              {s.description}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--text)' }}>
                            <Clock size={14} color="var(--accent)" /> {s.durationMinutes} mins
                          </span>
                        </td>
                        <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '3px 9px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: 700,
                              background: s.status === 'ACTIVE' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                              color: s.status === 'ACTIVE' ? '#16a34a' : 'var(--text)',
                            }}
                          >
                            {s.status}
                          </span>
                        </td>
                        <td style={{ padding: '14px 18px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              type="button"
                              id={`toggle-service-btn-${s._id}`}
                              onClick={() => handleToggleServiceStatus(s)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '6px 10px',
                                fontSize: '12px',
                                fontWeight: 600,
                                borderRadius: '5px',
                                border: '1px solid var(--border)',
                                background: 'var(--bg)',
                                color: s.status === 'ACTIVE' ? '#eab308' : '#16a34a',
                                cursor: 'pointer',
                              }}
                              title={s.status === 'ACTIVE' ? 'Deactivate service' : 'Activate service'}
                            >
                              <Power size={12} /> {s.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              type="button"
                              id={`edit-service-btn-${s._id}`}
                              onClick={() => handleOpenEditService(s)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '6px 10px',
                                fontSize: '12px',
                                fontWeight: 600,
                                borderRadius: '5px',
                                border: '1px solid var(--border)',
                                background: 'var(--bg)',
                                color: 'var(--text-h)',
                                cursor: 'pointer',
                              }}
                              title="Edit service"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              type="button"
                              id={`delete-service-btn-${s._id}`}
                              onClick={() => handleDeleteService(s)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '6px 10px',
                                fontSize: '12px',
                                fontWeight: 600,
                                borderRadius: '5px',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                background: 'var(--bg)',
                                color: '#ef4444',
                                cursor: 'pointer',
                              }}
                              title="Delete service"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Staff Roster */}
        {activeTab === 'staff' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px' }}>
              <div style={{ position: 'relative', flex: '1', maxWidth: '360px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text)', opacity: 0.6 }} />
                <input
                  type="text"
                  id="staff-search-input"
                  placeholder="Search staff by name, email, or phone..."
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px 9px 36px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--code-bg)',
                    color: 'var(--text-h)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {filteredStaff.length === 0 ? (
              <div
                id="empty-staff-view"
                style={{
                  padding: '60px 20px',
                  textAlign: 'center',
                  background: 'var(--code-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                }}
              >
                <Users size={40} color="var(--text)" style={{ opacity: 0.3, marginBottom: '12px' }} />
                <h3 style={{ margin: '0 0 6px', color: 'var(--text-h)', fontSize: '18px' }}>No staff members found</h3>
                <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--text)' }}>
                  {staffSearch ? 'Try a different search query' : 'Add team members and assign them to services'}
                </p>
                {!staffSearch && (
                  <button
                    type="button"
                    onClick={handleOpenCreateStaff}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'var(--accent)',
                      color: '#fff',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Plus size={15} /> Add Staff Member
                  </button>
                )}
              </div>
            ) : (
              <div style={{ overflowX: 'auto', background: 'var(--code-bg)', border: '1px solid var(--border)', borderRadius: '10px' }}>
                <table id="staff-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                      <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--text-h)' }}>STAFF MEMBER</th>
                      <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--text-h)' }}>CONTACT</th>
                      <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--text-h)' }}>ASSIGNED SERVICES</th>
                      <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--text-h)' }}>STATUS</th>
                      <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--text-h)', textAlign: 'right' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStaff.map((st) => (
                      <tr key={st._id} id={`staff-row-${st._id}`} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-h)', fontSize: '14px' }}>{st.name}</div>
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          {st.email && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--text)' }}>
                              <Mail size={12} color="var(--accent)" /> {st.email}
                            </div>
                          )}
                          {st.phone && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--text)', marginTop: '2px' }}>
                              <Phone size={12} color="#16a34a" /> {st.phone}
                            </div>
                          )}
                          {!st.email && !st.phone && <span style={{ color: 'var(--text)', opacity: 0.5 }}>-</span>}
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {st.serviceIds && st.serviceIds.length > 0 ? (
                              st.serviceIds.map((srv) => (
                                <span
                                  key={srv._id || srv}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    padding: '2px 7px',
                                    borderRadius: '10px',
                                    fontSize: '11px',
                                    background: 'var(--bg)',
                                    border: '1px solid var(--border)',
                                    color: 'var(--text-h)',
                                  }}
                                >
                                  <Scissors size={10} color="var(--accent)" />
                                  {srv.name || 'Service'}
                                </span>
                              ))
                            ) : (
                              <span style={{ fontSize: '12px', color: 'var(--text)', opacity: 0.6 }}>No services assigned</span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '3px 9px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: 700,
                              background: st.status === 'ACTIVE' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                              color: st.status === 'ACTIVE' ? '#16a34a' : 'var(--text)',
                            }}
                          >
                            {st.status}
                          </span>
                        </td>
                        <td style={{ padding: '14px 18px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              type="button"
                              id={`toggle-staff-btn-${st._id}`}
                              onClick={() => handleToggleStaffStatus(st)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '6px 10px',
                                fontSize: '12px',
                                fontWeight: 600,
                                borderRadius: '5px',
                                border: '1px solid var(--border)',
                                background: 'var(--bg)',
                                color: st.status === 'ACTIVE' ? '#eab308' : '#16a34a',
                                cursor: 'pointer',
                              }}
                              title={st.status === 'ACTIVE' ? 'Deactivate staff member' : 'Activate staff member'}
                            >
                              <Power size={12} /> {st.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              type="button"
                              id={`edit-staff-btn-${st._id}`}
                              onClick={() => handleOpenEditStaff(st)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '6px 10px',
                                fontSize: '12px',
                                fontWeight: 600,
                                borderRadius: '5px',
                                border: '1px solid var(--border)',
                                background: 'var(--bg)',
                                color: 'var(--text-h)',
                                cursor: 'pointer',
                              }}
                              title="Edit staff member"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              type="button"
                              id={`delete-staff-btn-${st._id}`}
                              onClick={() => handleDeleteStaff(st)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '6px 10px',
                                fontSize: '12px',
                                fontWeight: 600,
                                borderRadius: '5px',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                background: 'var(--bg)',
                                color: '#ef4444',
                                cursor: 'pointer',
                              }}
                              title="Delete staff member"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Availability & Hours */}
        {activeTab === 'availability' && (
          <div className="space-y-8">
            {/* Section A: Weekly Working Schedule */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-h)', margin: 0 }}>
                    Recurring Weekly Working Hours
                  </h2>
                  <p style={{ fontSize: '13px', color: 'var(--text)', margin: '4px 0 0' }}>
                    Staff-specific hours override business hours. Otherwise, staff fall back to business-wide schedule.
                  </p>
                </div>
              </div>

              {availabilityList.length === 0 ? (
                <div
                  id="empty-availability-view"
                  style={{
                    padding: '50px 20px',
                    textAlign: 'center',
                    background: 'var(--code-bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                  }}
                >
                  <Calendar size={36} color="var(--text)" style={{ opacity: 0.3, marginBottom: '12px' }} />
                  <h3 style={{ margin: '0 0 6px', color: 'var(--text-h)', fontSize: '16px' }}>No working hours set yet</h3>
                  <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--text)' }}>
                    Add business-wide working hours or staff-specific schedules to enable slot calculation.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenCreateAvailability}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'var(--accent)',
                      color: '#fff',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Plus size={15} /> Add Working Window
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
                  {[1, 2, 3, 4, 5, 6, 0].map((dayNum) => {
                    const dayName = DAYS_MAP[dayNum];
                    const dayWindows = availabilityList.filter((a) => a.dayOfWeek === dayNum);

                    return (
                      <div
                        key={dayNum}
                        id={`availability-day-card-${dayNum}`}
                        style={{
                          background: 'var(--code-bg)',
                          border: '1px solid var(--border)',
                          borderRadius: '10px',
                          padding: '16px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '10px' }}>
                          <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-h)' }}>
                            {dayName.toUpperCase()}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text)', opacity: 0.7 }}>
                            {dayWindows.length} {dayWindows.length === 1 ? 'window' : 'windows'}
                          </span>
                        </div>

                        {dayWindows.length === 0 ? (
                          <div style={{ fontSize: '12px', color: 'var(--text)', opacity: 0.5, fontStyle: 'italic', padding: '10px 0' }}>
                            Closed / No hours configured
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {dayWindows.map((win) => (
                              <div
                                key={win._id}
                                id={`availability-item-${win._id}`}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  background: 'var(--bg)',
                                  border: '1px solid var(--border)',
                                  borderRadius: '6px',
                                  padding: '8px 12px',
                                }}
                              >
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '13px', color: 'var(--text-h)' }}>
                                    <Clock size={13} color="var(--accent)" />
                                    <span>{win.startTime} &mdash; {win.endTime}</span>
                                    {!win.isActive && (
                                      <span style={{ fontSize: '10px', color: '#eab308', background: 'rgba(234, 179, 8, 0.15)', padding: '1px 5px', borderRadius: '4px' }}>
                                        Inactive
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '11px', color: 'var(--text)', marginTop: '2px' }}>
                                    {win.staffId ? (
                                      <span style={{ color: 'var(--accent)' }}>👤 Staff: {win.staffId.name}</span>
                                    ) : (
                                      <span style={{ color: '#16a34a' }}>🏢 Business-Wide (Default)</span>
                                    )}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditAvailability(win)}
                                    style={{
                                      padding: '4px 8px',
                                      borderRadius: '4px',
                                      border: '1px solid var(--border)',
                                      background: 'transparent',
                                      color: 'var(--text)',
                                      cursor: 'pointer',
                                    }}
                                    title="Edit window"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteAvailability(win)}
                                    style={{
                                      padding: '4px 8px',
                                      borderRadius: '4px',
                                      border: '1px solid rgba(239, 68, 68, 0.3)',
                                      background: 'transparent',
                                      color: '#ef4444',
                                      cursor: 'pointer',
                                    }}
                                    title="Delete window"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section B: Blocked Dates */}
            <div style={{ marginTop: '36px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-h)', margin: 0 }}>
                    Blocked Dates & Holidays
                  </h2>
                  <p style={{ fontSize: '13px', color: 'var(--text)', margin: '4px 0 0' }}>
                    Specific dates where bookings are halted (Business-wide holidays or staff vacation days).
                  </p>
                </div>
              </div>

              {blockedDates.length === 0 ? (
                <div
                  id="empty-blocked-dates-view"
                  style={{
                    padding: '40px 20px',
                    textAlign: 'center',
                    background: 'var(--code-bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                  }}
                >
                  <CalendarX size={32} color="var(--text)" style={{ opacity: 0.3, marginBottom: '8px' }} />
                  <p style={{ fontSize: '13px', color: 'var(--text)', margin: 0 }}>
                    No blocked dates configured. All regular working days are open for slots.
                  </p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto', background: 'var(--code-bg)', border: '1px solid var(--border)', borderRadius: '10px' }}>
                  <table id="blocked-dates-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                        <th style={{ padding: '12px 18px', fontWeight: 600, color: 'var(--text-h)' }}>DATE</th>
                        <th style={{ padding: '12px 18px', fontWeight: 600, color: 'var(--text-h)' }}>SCOPE</th>
                        <th style={{ padding: '12px 18px', fontWeight: 600, color: 'var(--text-h)' }}>REASON</th>
                        <th style={{ padding: '12px 18px', fontWeight: 600, color: 'var(--text-h)', textAlign: 'right' }}>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {blockedDates.map((b) => {
                        const dateFormatted = b.date ? new Date(b.date).toISOString().split('T')[0] : '';
                        return (
                          <tr key={b._id} id={`blocked-date-row-${b._id}`} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '12px 18px', fontWeight: 600, color: 'var(--text-h)' }}>
                              {dateFormatted}
                            </td>
                            <td style={{ padding: '12px 18px' }}>
                              {b.staffId ? (
                                <span style={{ color: 'var(--accent)' }}>👤 Staff: {b.staffId.name}</span>
                              ) : (
                                <span style={{ color: '#f43f5e', fontWeight: 600 }}>🏢 Entire Business</span>
                              )}
                            </td>
                            <td style={{ padding: '12px 18px', color: 'var(--text)' }}>
                              {b.reason || <span style={{ opacity: 0.5 }}>-</span>}
                            </td>
                            <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                              <button
                                type="button"
                                id={`delete-blocked-btn-${b._id}`}
                                onClick={() => handleDeleteBlockedDate(b)}
                                style={{
                                  padding: '5px 9px',
                                  borderRadius: '5px',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  background: 'transparent',
                                  color: '#ef4444',
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                }}
                                title="Remove blocked date"
                              >
                                <Trash2 size={12} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Slot Preview Engine */}
        {activeTab === 'slots' && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-h)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={20} color="var(--accent)" />
                Slot Generation Engine Preview
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text)', margin: '4px 0 0' }}>
                Calculates bookable appointment windows using 15-minute start intervals, active services, staff schedules, blocked dates, and conflict prevention.
              </p>
            </div>

            {/* Query Controls Card */}
            <div style={{ background: 'var(--code-bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
              <form onSubmit={handleExecuteSlotPreview} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
                {/* Service Selector */}
                <div>
                  <label htmlFor="preview-service-select" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-h)', marginBottom: '6px' }}>
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
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg)',
                      color: 'var(--text-h)',
                      fontSize: '13px',
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

                {/* Date Picker */}
                <div>
                  <label htmlFor="preview-date-input" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-h)', marginBottom: '6px' }}>
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
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg)',
                      color: 'var(--text-h)',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Staff Member (Optional) */}
                <div>
                  <label htmlFor="preview-staff-select" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-h)', marginBottom: '6px' }}>
                    Staff Member (Optional)
                  </label>
                  <select
                    id="preview-staff-select"
                    value={previewStaffId}
                    onChange={(e) => setPreviewStaffId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg)',
                      color: 'var(--text-h)',
                      fontSize: '13px',
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

                {/* Run Button */}
                <div>
                  <button
                    type="submit"
                    id="preview-slots-btn"
                    disabled={previewLoading || !previewServiceId || !previewDate}
                    style={{
                      width: '100%',
                      padding: '10px 18px',
                      borderRadius: '8px',
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
                    }}
                  >
                    {previewLoading ? (
                      <>
                        <RefreshCw size={15} className="spin" /> Calculating...
                      </>
                    ) : (
                      <>
                        <Sparkles size={15} /> Calculate Slots
                      </>
                    )}
                  </button>
                </div>
              </form>

              {previewError && (
                <div
                  id="preview-error-banner"
                  style={{
                    marginTop: '14px',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    color: '#ef4444',
                    fontSize: '13px',
                  }}
                >
                  {previewError}
                </div>
              )}
            </div>

            {/* Results Display */}
            {previewSlotsResult && (
              <div id="preview-results-container">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                    flexWrap: 'wrap',
                    gap: '12px',
                    background: 'var(--code-bg)',
                    padding: '14px 18px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text)', textTransform: 'uppercase' }}>Service</span>
                      <div style={{ fontWeight: 700, color: 'var(--text-h)' }}>
                        {previewSlotsResult.service?.name} ({previewSlotsResult.service?.durationMinutes}m)
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text)', textTransform: 'uppercase' }}>Date</span>
                      <div style={{ fontWeight: 700, color: 'var(--text-h)' }}>{previewSlotsResult.date}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text)', textTransform: 'uppercase' }}>Timezone</span>
                      <div style={{ fontWeight: 700, color: 'var(--accent)' }}>{previewSlotsResult.timezone}</div>
                    </div>
                  </div>

                  <div style={{ fontSize: '14px', fontWeight: 700, color: previewSlotsResult.slotsCount > 0 ? '#16a34a' : '#ef4444' }}>
                    {previewSlotsResult.slotsCount} {previewSlotsResult.slotsCount === 1 ? 'Slot Available' : 'Slots Available'}
                  </div>
                </div>

                {previewSlotsResult.slotsCount === 0 ? (
                  <div
                    id="no-slots-available-view"
                    style={{
                      padding: '60px 20px',
                      textAlign: 'center',
                      background: 'var(--code-bg)',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                    }}
                  >
                    <Clock size={40} color="var(--text)" style={{ opacity: 0.3, marginBottom: '10px' }} />
                    <h3 style={{ margin: '0 0 6px', color: 'var(--text-h)', fontSize: '16px' }}>
                      No available slots found for this date
                    </h3>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text)', maxWidth: '480px', marginInline: 'auto' }}>
                      This can occur if the date is blocked, the business/staff is closed on this day of the week, or all working windows are filled with appointments.
                    </p>
                  </div>
                ) : (
                  <div
                    id="slots-grid"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                      gap: '12px',
                    }}
                  >
                    {previewSlotsResult.slots.map((slot, idx) => (
                      <div
                        key={`${slot.startTime}-${slot.staffId}-${idx}`}
                        id={`slot-card-${idx}`}
                        style={{
                          background: 'var(--code-bg)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          padding: '14px',
                          transition: 'transform 0.15s ease, border-color 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-h)' }}>
                            {slot.localStartTime}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--text)', opacity: 0.7 }}>
                            to {slot.localEndTime}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--accent)', fontWeight: 600 }}>
                          <Users size={12} />
                          <span>{slot.staffName}</span>
                        </div>

                        <div style={{ fontSize: '10px', color: 'var(--text)', opacity: 0.5, marginTop: '6px', fontFamily: 'monospace' }}>
                          UTC: {slot.startTime.substring(11, 16)} &ndash; {slot.endTime.substring(11, 16)}Z
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Appointments Management */}
        {activeTab === 'appointments' && (
          <div id="appointments-tab-content">
            {/* Top Toolbar: Sub-view Switcher & Action */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '18px',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              {/* View Mode Toggle: List vs Calendar */}
              <div
                style={{
                  display: 'inline-flex',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--code-bg)',
                  padding: '3px',
                  gap: '4px',
                }}
              >
                <button
                  type="button"
                  id="view-mode-list-btn"
                  onClick={() => setAppointmentSubView('list')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    background: appointmentSubView === 'list' ? 'var(--accent)' : 'transparent',
                    color: appointmentSubView === 'list' ? '#fff' : 'var(--text)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <List size={15} />
                  List View
                </button>
                <button
                  type="button"
                  id="view-mode-calendar-btn"
                  onClick={() => setAppointmentSubView('calendar')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    background: appointmentSubView === 'calendar' ? 'var(--accent)' : 'transparent',
                    color: appointmentSubView === 'calendar' ? '#fff' : 'var(--text)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <CalendarDays size={15} />
                  Calendar View
                </button>
              </div>

              <div style={{ fontSize: '13px', color: 'var(--text)' }}>
                Showing <strong>{filteredAppointments.length}</strong> of {appointments.length} appointments
              </div>
            </div>

            {/* Comprehensive Filter & Search Bar */}
            <div
              id="appointments-filter-bar"
              style={{
                background: 'var(--code-bg)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '16px',
                marginBottom: '20px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
                alignItems: 'center',
              }}
            >
              {/* Customer Search Input */}
              <div style={{ position: 'relative' }}>
                <Search
                  size={15}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text)',
                    opacity: 0.6,
                  }}
                />
                <input
                  type="text"
                  id="appointment-search-input"
                  placeholder="Search customer name, email, phone..."
                  value={appointmentSearch}
                  onChange={(e) => setAppointmentSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text-h)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Status Filter */}
              <div>
                <select
                  id="appointment-status-filter"
                  value={appointmentFilterStatus}
                  onChange={(e) => setAppointmentFilterStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text-h)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="">All Statuses</option>
                  <option value="CONFIRMED">CONFIRMED</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="CANCELLED">CANCELLED</option>
                  <option value="NO_SHOW">NO_SHOW</option>
                </select>
              </div>

              {/* Service Filter */}
              <div>
                <select
                  id="appointment-service-filter"
                  value={appointmentFilterService}
                  onChange={(e) => setAppointmentFilterService(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text-h)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="">All Services</option>
                  {services.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Staff Filter */}
              <div>
                <select
                  id="appointment-staff-filter"
                  value={appointmentFilterStaff}
                  onChange={(e) => setAppointmentFilterStaff(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text-h)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="">All Staff</option>
                  {staff.map((st) => (
                    <option key={st._id} value={st._id}>
                      {st.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Filter */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="date"
                  id="appointment-date-filter"
                  value={appointmentFilterDate}
                  onChange={(e) => setAppointmentFilterDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text-h)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />

                {(appointmentSearch ||
                  appointmentFilterStatus ||
                  appointmentFilterService ||
                  appointmentFilterStaff ||
                  appointmentFilterDate) && (
                  <button
                    type="button"
                    id="clear-appointment-filters-btn"
                    onClick={() => {
                      setAppointmentSearch('');
                      setAppointmentFilterStatus('');
                      setAppointmentFilterService('');
                      setAppointmentFilterStaff('');
                      setAppointmentFilterDate('');
                    }}
                    style={{
                      padding: '7px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'transparent',
                      color: 'var(--text)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Sub-view: CALENDAR VIEW */}
            {appointmentSubView === 'calendar' && (
              <AppointmentCalendar
                appointments={filteredAppointments}
                timezone={businessTimezone}
                onSelectAppointment={handleOpenAppointmentDetails}
              />
            )}

            {/* Sub-view: LIST VIEW */}
            {appointmentSubView === 'list' && (
              <div>
                {filteredAppointments.length === 0 ? (
                  <div
                    id="no-appointments-view"
                    style={{
                      padding: '60px 20px',
                      textAlign: 'center',
                      background: 'var(--code-bg)',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                    }}
                  >
                    <CalendarCheck size={40} color="var(--text)" style={{ opacity: 0.3, marginBottom: '10px' }} />
                    <h3 style={{ margin: '0 0 6px', color: 'var(--text-h)', fontSize: '16px' }}>
                      No appointments found
                    </h3>
                    <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--text)', maxWidth: '480px', marginInline: 'auto' }}>
                      {appointmentSearch || appointmentFilterStatus || appointmentFilterDate
                        ? 'Try clearing filters to see more appointments.'
                        : 'Book an appointment to verify your schedule, services, and staff availability.'}
                    </p>
                    <button
                      type="button"
                      id="empty-state-book-btn"
                      onClick={() => setIsBookModalOpen(true)}
                      style={{
                        padding: '9px 18px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'var(--accent)',
                        color: '#fff',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <Plus size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
                      Book Test Appointment
                    </button>
                  </div>
                ) : (
                  <div
                    id="appointments-table-container"
                    style={{
                      background: 'var(--code-bg)',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      overflowX: 'auto',
                    }}
                  >
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text)', textTransform: 'uppercase', fontSize: '11px' }}>
                          <th style={{ padding: '14px 18px' }}>Customer</th>
                          <th style={{ padding: '14px 18px' }}>Service</th>
                          <th style={{ padding: '14px 18px' }}>Staff</th>
                          <th style={{ padding: '14px 18px' }}>Date & Time</th>
                          <th style={{ padding: '14px 18px' }}>Status</th>
                          <th style={{ padding: '14px 18px', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAppointments.map((appt) => {
                          // Format in business timezone
                          let dateFormatted = '';
                          let timeStr = '';
                          try {
                            const d = new Date(appt.startTime);
                            const formatter = new Intl.DateTimeFormat('en-US', {
                              timeZone: businessTimezone,
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false,
                            });
                            const parts = formatter.formatToParts(d);
                            const pMap = {};
                            for (const p of parts) pMap[p.type] = p.value;
                            dateFormatted = `${pMap.month} ${pMap.day}, ${pMap.year}`;
                            timeStr = `${pMap.hour}:${pMap.minute}`;
                          } catch {
                            const apptDate = new Date(appt.startTime);
                            timeStr = apptDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                            dateFormatted = apptDate.toISOString().split('T')[0];
                          }

                          const isConfirmed = appt.status === 'CONFIRMED';
                          const isCancelled = appt.status === 'CANCELLED';
                          const isCompleted = appt.status === 'COMPLETED';
                          const isNoShow = appt.status === 'NO_SHOW';

                          return (
                            <tr
                              key={appt._id}
                              id={`appointment-row-${appt._id}`}
                              style={{
                                borderBottom: '1px solid var(--border)',
                                opacity: isCancelled ? 0.6 : 1,
                              }}
                            >
                              <td style={{ padding: '14px 18px' }}>
                                <div style={{ fontWeight: 600, color: 'var(--text-h)' }}>{appt.customerName}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text)', opacity: 0.8 }}>{appt.customerEmail}</div>
                                {appt.customerPhone && (
                                  <div style={{ fontSize: '11px', color: 'var(--text)', opacity: 0.6 }}>{appt.customerPhone}</div>
                                )}
                              </td>
                              <td style={{ padding: '14px 18px' }}>
                                <span style={{ fontWeight: 600, color: 'var(--text-h)' }}>
                                  {appt.serviceId?.name || 'Service'}
                                </span>
                                <div style={{ fontSize: '11px', color: 'var(--accent)' }}>
                                  {appt.serviceId?.durationMinutes ? `${appt.serviceId.durationMinutes} mins` : ''}
                                </div>
                              </td>
                              <td style={{ padding: '14px 18px' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-h)' }}>
                                  <Users size={13} color="var(--accent)" />
                                  {appt.staffId?.name || 'Unassigned'}
                                </span>
                              </td>
                              <td style={{ padding: '14px 18px' }}>
                                <div style={{ fontWeight: 600, color: 'var(--text-h)' }}>{dateFormatted}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text)' }}>
                                  {timeStr} <span style={{ opacity: 0.6, fontSize: '10px' }}>({businessTimezone})</span>
                                </div>
                              </td>
                              <td style={{ padding: '14px 18px' }}>
                                <span
                                  style={{
                                    display: 'inline-block',
                                    padding: '3px 8px',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    backgroundColor:
                                      isConfirmed
                                        ? 'rgba(34, 197, 94, 0.15)'
                                        : isCompleted
                                        ? 'rgba(59, 130, 246, 0.15)'
                                        : isCancelled
                                        ? 'rgba(239, 68, 68, 0.15)'
                                        : 'rgba(234, 179, 8, 0.15)',
                                    color:
                                      isConfirmed
                                        ? '#22c55e'
                                        : isCompleted
                                        ? '#3b82f6'
                                        : isCancelled
                                        ? '#ef4444'
                                        : '#eab308',
                                  }}
                                >
                                  {appt.status}
                                </span>
                              </td>
                              <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', gap: '6px' }}>
                                  <button
                                    type="button"
                                    id={`view-details-${appt._id}-btn`}
                                    onClick={() => handleOpenAppointmentDetails(appt)}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '6px 10px',
                                      borderRadius: '6px',
                                      border: '1px solid var(--border)',
                                      background: 'var(--bg)',
                                      color: 'var(--text-h)',
                                      fontSize: '12px',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                    }}
                                    title="View Details"
                                  >
                                    <Eye size={13} />
                                    Details
                                  </button>

                                  {isConfirmed && (
                                    <>
                                      <button
                                        type="button"
                                        id={`complete-appointment-${appt._id}-btn`}
                                        onClick={() => {
                                          setSelectedAppointment(appt);
                                          handleUpdateAppointmentStatus('COMPLETED');
                                        }}
                                        style={{
                                          padding: '6px 10px',
                                          borderRadius: '6px',
                                          border: '1px solid rgba(59, 130, 246, 0.3)',
                                          backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                          color: '#3b82f6',
                                          fontSize: '12px',
                                          fontWeight: 600,
                                          cursor: 'pointer',
                                        }}
                                        title="Mark Completed"
                                      >
                                        Complete
                                      </button>

                                      <button
                                        type="button"
                                        id={`cancel-appointment-${appt._id}-btn`}
                                        onClick={() => handleCancelAppointment(appt)}
                                        style={{
                                          padding: '6px 10px',
                                          borderRadius: '6px',
                                          border: '1px solid rgba(239, 68, 68, 0.3)',
                                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                          color: '#ef4444',
                                          fontSize: '12px',
                                          fontWeight: 600,
                                          cursor: 'pointer',
                                        }}
                                        title="Cancel Appointment"
                                      >
                                        Cancel
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 6: Business Analytics & Insights */}
        {activeTab === 'analytics' && (
          <AnalyticsView business={businessInfo} />
        )}
      </main>

      {/* Modals & Dialogs */}
      <ServiceModal
        isOpen={isServiceModalOpen}
        serviceToEdit={serviceToEdit}
        onClose={() => setIsServiceModalOpen(false)}
        onSuccess={handleSaveService}
      />

      <StaffModal
        isOpen={isStaffModalOpen}
        staffToEdit={staffToEdit}
        availableServices={services.filter((s) => s.status === 'ACTIVE')}
        onClose={() => setIsStaffModalOpen(false)}
        onSuccess={handleSaveStaff}
      />

      <AvailabilityModal
        isOpen={isAvailabilityModalOpen}
        availabilityToEdit={availabilityToEdit}
        staffList={staff.filter((s) => s.status === 'ACTIVE')}
        onClose={() => setIsAvailabilityModalOpen(false)}
        onSuccess={handleSaveAvailability}
      />

      <BlockedDateModal
        isOpen={isBlockedDateModalOpen}
        blockedDateToEdit={blockedDateToEdit}
        staffList={staff.filter((s) => s.status === 'ACTIVE')}
        onClose={() => setIsBlockedDateModalOpen(false)}
        onSuccess={handleSaveBlockedDate}
      />

      <BookAppointmentModal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        onSave={handleSaveAppointment}
        services={services}
        staff={staff}
      />

      <AppointmentDetailsModal
        isOpen={isDetailsModalOpen}
        appointment={selectedAppointment}
        timezone={businessTimezone}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedAppointment(null);
        }}
        onStatusUpdate={handleUpdateAppointmentStatus}
        loading={detailsLoading}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        confirmStyle={confirmDialog.confirmStyle}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

