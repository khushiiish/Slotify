import { useState, useEffect, useMemo } from 'react';
import Header from '../components/Header.jsx';
import ServiceModal from '../components/ServiceModal.jsx';
import StaffModal from '../components/StaffModal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { getServices, createService, updateService, deleteService } from '../services/service.service.js';
import { getStaffList, createStaff, updateStaff, deleteStaff } from '../services/staff.service.js';
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
} from 'lucide-react';

export default function BusinessAdminDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('services'); // 'services' | 'staff'
  const [businessInfo, setBusinessInfo] = useState(null);

  // Data states
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Search queries
  const [serviceSearch, setServiceSearch] = useState('');
  const [staffSearch, setStaffSearch] = useState('');

  // Modal states
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [serviceToEdit, setServiceToEdit] = useState(null);

  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [staffToEdit, setStaffToEdit] = useState(null);

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
      // 1. Fetch Business metadata
      if (user?.businessId) {
        try {
          const bizData = await getBusinessById(user.businessId);
          setBusinessInfo(bizData);
        } catch {
          // Non-blocking fallback
        }
      }

      // 2. Fetch Services and Staff in parallel
      const [servicesData, staffData] = await Promise.all([
        getServices(),
        getStaffList(),
      ]);

      setServices(servicesData);
      setStaff(staffData);
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

    return {
      activeServices,
      inactiveServices,
      activeStaff,
      inactiveStaff,
    };
  }, [services, staff]);

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

  const handleOpenEditService = (service) => {
    setServiceToEdit(service);
    setIsServiceModalOpen(true);
  };

  const handleSaveService = async (serviceData, id) => {
    if (id) {
      await updateService(id, serviceData);
      showSuccess(`Service "${serviceData.name}" updated successfully.`);
    } else {
      await createService(serviceData);
      showSuccess(`Service "${serviceData.name}" created successfully.`);
    }
    await fetchData();
  };

  const handleToggleServiceStatus = (service) => {
    const newStatus = service.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setConfirmDialog({
      isOpen: true,
      title: `${newStatus === 'ACTIVE' ? 'Activate' : 'Deactivate'} Service`,
      message: `Are you sure you want to ${newStatus === 'ACTIVE' ? 'activate' : 'deactivate'} "${service.name}"?`,
      confirmText: newStatus === 'ACTIVE' ? 'Activate' : 'Deactivate',
      confirmStyle: newStatus === 'ACTIVE' ? 'primary' : 'danger',
      onConfirm: async () => {
        try {
          await updateService(service._id, { status: newStatus });
          showSuccess(`Service "${service.name}" is now ${newStatus}.`);
          await fetchData();
        } catch (err) {
          setError(err.response?.data?.message || err.message || 'Failed to update service status.');
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleDeleteService = (service) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Service',
      message: `Are you sure you want to permanently delete "${service.name}"? If it is assigned to staff or referenced by appointments, deletion will be blocked for safety.`,
      confirmText: 'Delete Permanently',
      confirmStyle: 'danger',
      onConfirm: async () => {
        try {
          await deleteService(service._id);
          showSuccess(`Service "${service.name}" deleted successfully.`);
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

  const handleSaveStaff = async (staffData, id) => {
    if (id) {
      await updateStaff(id, staffData);
      showSuccess(`Staff member "${staffData.name}" updated successfully.`);
    } else {
      await createStaff(staffData);
      showSuccess(`Staff member "${staffData.name}" added successfully.`);
    }
    await fetchData();
  };

  const handleToggleStaffStatus = (st) => {
    const newStatus = st.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setConfirmDialog({
      isOpen: true,
      title: `${newStatus === 'ACTIVE' ? 'Activate' : 'Deactivate'} Staff Member`,
      message: `Are you sure you want to ${newStatus === 'ACTIVE' ? 'activate' : 'deactivate'} "${st.name}"?`,
      confirmText: newStatus === 'ACTIVE' ? 'Activate' : 'Deactivate',
      confirmStyle: newStatus === 'ACTIVE' ? 'primary' : 'danger',
      onConfirm: async () => {
        try {
          await updateStaff(st._id, { status: newStatus });
          showSuccess(`Staff member "${st.name}" is now ${newStatus}.`);
          await fetchData();
        } catch (err) {
          setError(err.response?.data?.message || err.message || 'Failed to update staff status.');
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleDeleteStaff = (st) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Staff Member',
      message: `Are you sure you want to permanently delete "${st.name}"? If appointments or schedules exist, deletion will be blocked for safety.`,
      confirmText: 'Delete Permanently',
      confirmStyle: 'danger',
      onConfirm: async () => {
        try {
          await deleteStaff(st._id);
          showSuccess(`Staff member "${st.name}" deleted successfully.`);
          await fetchData();
        } catch (err) {
          setError(err.response?.data?.message || err.message || 'Failed to delete staff member.');
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const businessDisplayName = businessInfo?.name || 'Your Business';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      {/* Universal Header */}
      <Header user={user} onLogout={onLogout} />

      <main style={{ flex: 1, maxWidth: '1200px', width: '100%', margin: '0 auto', padding: '24px 20px 60px' }}>
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
            <span>{error}</span>
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
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--text)' }}>
                Tenant Administration &bull; Manage your catalog of services and team members.
              </p>
            </div>

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

              {activeTab === 'services' ? (
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
              ) : (
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
            </div>
          </div>

          {/* Metric Cards (Real backend counts) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
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
                <span>INACTIVE SERVICES</span>
                <Scissors size={18} color="var(--text)" style={{ opacity: 0.6 }} />
              </div>
              <div style={{ fontSize: '30px', fontWeight: 800, color: 'var(--text-h)', marginTop: '6px' }}>
                {metrics.inactiveServices}
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
                <span>INACTIVE STAFF</span>
                <Users size={18} color="var(--text)" style={{ opacity: 0.6 }} />
              </div>
              <div style={{ fontSize: '30px', fontWeight: 800, color: 'var(--text-h)', marginTop: '6px' }}>
                {metrics.inactiveStaff}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', marginBottom: '20px' }}>
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
            }}
          >
            <Users size={16} />
            Staff Members ({staff.length})
          </button>
        </div>

        {/* Content Container */}
        <div style={{ background: 'var(--code-bg)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          {activeTab === 'services' ? (
            /* =================== SERVICES VIEW =================== */
            <div>
              {/* Search Bar */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '12px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={16} color="var(--text)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                  <input
                    id="search-services-input"
                    type="text"
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                    placeholder="Search services by name, description, or status..."
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 36px',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg)',
                      color: 'var(--text-h)',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {loading && services.length === 0 ? (
                <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text)' }}>
                  <p>Loading services catalog...</p>
                </div>
              ) : filteredServices.length === 0 ? (
                <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text)' }}>
                  <Scissors size={36} color="var(--text)" style={{ opacity: 0.4, marginBottom: '8px' }} />
                  <p style={{ fontWeight: 600, color: 'var(--text-h)', margin: '0 0 4px 0' }}>
                    {serviceSearch ? 'No matching services found' : 'No services created yet'}
                  </p>
                  <p style={{ fontSize: '13px' }}>
                    {serviceSearch ? 'Try a different search term.' : 'Click "Add Service" above to create your first bookable offering.'}
                  </p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: 'var(--code-bg)', borderBottom: '1px solid var(--border)', color: 'var(--text)', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.4px' }}>
                        <th style={{ padding: '12px 18px', textAlign: 'left' }}>Service Name</th>
                        <th style={{ padding: '12px 18px', textAlign: 'left' }}>Duration</th>
                        <th style={{ padding: '12px 18px', textAlign: 'left' }}>Status</th>
                        <th style={{ padding: '12px 18px', textAlign: 'left' }}>Description</th>
                        <th style={{ padding: '12px 18px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredServices.map((svc) => {
                        const isActive = svc.status === 'ACTIVE';
                        return (
                          <tr key={svc._id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-h)' }}>
                              {svc.name}
                            </td>
                            <td style={{ padding: '14px 18px', color: 'var(--text)' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <Clock size={13} /> {svc.durationMinutes} mins
                              </span>
                            </td>
                            <td style={{ padding: '14px 18px' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '3px 8px',
                                  borderRadius: '9999px',
                                  background: isActive ? '#dcfce7' : '#fee2e2',
                                  color: isActive ? '#166534' : '#991b1b',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                }}
                              >
                                {isActive ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                {svc.status}
                              </span>
                            </td>
                            <td style={{ padding: '14px 18px', color: 'var(--text)', maxWidth: '300px' }}>
                              {svc.description || <span style={{ fontStyle: 'italic', opacity: 0.6 }}>None</span>}
                            </td>
                            <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                                <button
                                  type="button"
                                  id={`edit-service-btn-${svc._id}`}
                                  onClick={() => handleOpenEditService(svc)}
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
                                  <Edit2 size={12} /> Edit
                                </button>
                                <button
                                  type="button"
                                  id={`toggle-service-btn-${svc._id}`}
                                  onClick={() => handleToggleServiceStatus(svc)}
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
                                    color: isActive ? '#dc2626' : '#16a34a',
                                    cursor: 'pointer',
                                  }}
                                  title={isActive ? 'Deactivate service' : 'Activate service'}
                                >
                                  <Power size={12} /> {isActive ? 'Deactivate' : 'Activate'}
                                </button>
                                <button
                                  type="button"
                                  id={`delete-service-btn-${svc._id}`}
                                  onClick={() => handleDeleteService(svc)}
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
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* =================== STAFF VIEW =================== */
            <div>
              {/* Search Bar */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '12px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={16} color="var(--text)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                  <input
                    id="search-staff-input"
                    type="text"
                    value={staffSearch}
                    onChange={(e) => setStaffSearch(e.target.value)}
                    placeholder="Search staff by name, email, phone, or status..."
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 36px',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg)',
                      color: 'var(--text-h)',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {loading && staff.length === 0 ? (
                <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text)' }}>
                  <p>Loading staff roster...</p>
                </div>
              ) : filteredStaff.length === 0 ? (
                <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text)' }}>
                  <Users size={36} color="var(--text)" style={{ opacity: 0.4, marginBottom: '8px' }} />
                  <p style={{ fontWeight: 600, color: 'var(--text-h)', margin: '0 0 4px 0' }}>
                    {staffSearch ? 'No matching staff members found' : 'No staff registered yet'}
                  </p>
                  <p style={{ fontSize: '13px' }}>
                    {staffSearch ? 'Try a different search term.' : 'Click "Add Staff Member" above to register your team.'}
                  </p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: 'var(--code-bg)', borderBottom: '1px solid var(--border)', color: 'var(--text)', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.4px' }}>
                        <th style={{ padding: '12px 18px', textAlign: 'left' }}>Staff Member</th>
                        <th style={{ padding: '12px 18px', textAlign: 'left' }}>Contact</th>
                        <th style={{ padding: '12px 18px', textAlign: 'left' }}>Status</th>
                        <th style={{ padding: '12px 18px', textAlign: 'left' }}>Assigned Services</th>
                        <th style={{ padding: '12px 18px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStaff.map((st) => {
                        const isActive = st.status === 'ACTIVE';
                        const assignedList = st.serviceIds || [];
                        return (
                          <tr key={st._id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '14px 18px' }}>
                              <div style={{ fontWeight: 700, color: 'var(--text-h)' }}>{st.name}</div>
                            </td>
                            <td style={{ padding: '14px 18px', color: 'var(--text)' }}>
                              {st.email && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                                  <Mail size={12} /> {st.email}
                                </div>
                              )}
                              {st.phone && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', marginTop: '2px' }}>
                                  <Phone size={12} /> {st.phone}
                                </div>
                              )}
                              {!st.email && !st.phone && (
                                <span style={{ fontStyle: 'italic', opacity: 0.6 }}>No contact info</span>
                              )}
                            </td>
                            <td style={{ padding: '14px 18px' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '3px 8px',
                                  borderRadius: '9999px',
                                  background: isActive ? '#dcfce7' : '#fee2e2',
                                  color: isActive ? '#166534' : '#991b1b',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                }}
                              >
                                {isActive ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                {st.status}
                              </span>
                            </td>
                            <td style={{ padding: '14px 18px' }}>
                              {assignedList.length === 0 ? (
                                <span style={{ color: 'var(--text)', fontStyle: 'italic', fontSize: '12px' }}>
                                  Unassigned
                                </span>
                              ) : (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                  {assignedList.map((svc) => (
                                    <span
                                      key={svc._id || svc}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        background: 'var(--accent-bg)',
                                        color: 'var(--accent)',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                      }}
                                    >
                                      <Briefcase size={10} /> {svc.name || 'Service'}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
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
                                  <Edit2 size={12} /> Edit
                                </button>
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
                                    color: isActive ? '#dc2626' : '#16a34a',
                                    cursor: 'pointer',
                                  }}
                                  title={isActive ? 'Deactivate staff member' : 'Activate staff member'}
                                >
                                  <Power size={12} /> {isActive ? 'Deactivate' : 'Activate'}
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
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
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
