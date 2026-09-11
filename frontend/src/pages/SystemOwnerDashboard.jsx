import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Building2,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Power,
  RefreshCw,
  ExternalLink,
  Shield,
  Activity,
} from 'lucide-react';
import Header from '../components/Header.jsx';
import OnboardBusinessModal from '../components/OnboardBusinessModal.jsx';
import BusinessDetailsModal from '../components/BusinessDetailsModal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import {
  getPlatformBusinesses,
  updateBusinessStatus,
} from '../services/business.service.js';

export default function SystemOwnerDashboard({ user, onLogout }) {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState(null);

  // Modals state
  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    business: null,
    targetStatus: null,
    isLoading: false,
  });

  const fetchBusinesses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPlatformBusinesses();
      setBusinesses(data.data?.businesses || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch businesses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Filtered businesses based on search
  const filteredBusinesses = useMemo(() => {
    if (!searchQuery.trim()) return businesses;
    const query = searchQuery.toLowerCase().trim();
    return businesses.filter(
      (b) =>
        b.name?.toLowerCase().includes(query) ||
        b.slug?.toLowerCase().includes(query) ||
        b.contactEmail?.toLowerCase().includes(query) ||
        b.admin?.email?.toLowerCase().includes(query)
    );
  }, [businesses, searchQuery]);

  // Metrics
  const stats = useMemo(() => {
    const total = businesses.length;
    const active = businesses.filter((b) => b.status === 'ACTIVE').length;
    const disabled = businesses.filter((b) => b.status === 'DISABLED').length;
    return { total, active, disabled };
  }, [businesses]);

  const handleOpenDetails = (business) => {
    setSelectedBusiness(business);
    setIsDetailsModalOpen(true);
  };

  const handlePromptToggleStatus = (business) => {
    const targetStatus = business.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    setConfirmDialog({
      isOpen: true,
      business,
      targetStatus,
      isLoading: false,
    });
  };

  const handleConfirmStatusToggle = async () => {
    const { business, targetStatus } = confirmDialog;
    if (!business || !targetStatus) return;

    setConfirmDialog((prev) => ({ ...prev, isLoading: true }));
    try {
      const res = await updateBusinessStatus(business._id || business.id, targetStatus);
      const updated = res.data?.business;

      // Update state in place
      setBusinesses((prev) =>
        prev.map((b) =>
          (b._id || b.id) === (updated._id || updated.id)
            ? { ...b, status: updated.status }
            : b
        )
      );

      if (selectedBusiness && (selectedBusiness._id || selectedBusiness.id) === (updated._id || updated.id)) {
        setSelectedBusiness((prev) => ({ ...prev, status: updated.status }));
      }

      showNotification(
        `Business "${business.name}" has been ${targetStatus === 'ACTIVE' ? 'enabled' : 'disabled'}.`
      );
      setConfirmDialog({ isOpen: false, business: null, targetStatus: null, isLoading: false });
    } catch (err) {
      showNotification(
        err.response?.data?.message || err.message || 'Failed to update business status',
        'error'
      );
      setConfirmDialog((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const handleOnboardSuccess = (createdData) => {
    showNotification(`Successfully onboarded "${createdData.business.name}"!`);
    fetchBusinesses();
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <Header user={user} onLogout={onLogout} />

      <main style={{ maxWidth: '1120px', width: '100%', margin: '0 auto', padding: '28px 20px', boxSizing: 'border-box' }}>
        {/* Notification Banner */}
        {notification && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 18px',
            borderRadius: '8px',
            marginBottom: '20px',
            background: notification.type === 'error' ? '#fee2e2' : '#dcfce7',
            border: `1px solid ${notification.type === 'error' ? '#fca5a5' : '#bbf7d0'}`,
            color: notification.type === 'error' ? '#991b1b' : '#166534',
            fontSize: '14px',
            fontWeight: 500,
            textAlign: 'left',
          }}>
            {notification.type === 'error' ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
            <span>{notification.message}</span>
          </div>
        )}

        {/* Dashboard Title & Quick Stats */}
        <div style={{ textAlign: 'left', marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ margin: '0 0 6px 0', fontSize: '28px', color: 'var(--text-h)', fontWeight: 700 }}>
                Platform Business Overview
              </h1>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--text)' }}>
                Onboard, inspect, and manage tenant organizations registered on Slotify.
              </p>
            </div>

            <button
              type="button"
              id="onboard-business-btn"
              onClick={() => setIsOnboardModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: 'var(--accent)',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: 'var(--shadow)',
                transition: 'transform 0.1s ease',
              }}
            >
              <Plus size={18} />
              Onboard Business
            </button>
          </div>

          {/* Metric Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            marginTop: '22px',
          }}>
            <div style={{
              background: 'var(--code-bg)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '16px 20px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text)', fontSize: '13px', fontWeight: 600 }}>
                <span>TOTAL REGISTERED</span>
                <Building2 size={18} color="var(--accent)" />
              </div>
              <div style={{ fontSize: '30px', fontWeight: 800, color: 'var(--text-h)', marginTop: '6px' }}>
                {stats.total}
              </div>
            </div>

            <div style={{
              background: 'var(--code-bg)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '16px 20px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text)', fontSize: '13px', fontWeight: 600 }}>
                <span>ACTIVE TENANTS</span>
                <Activity size={18} color="#16a34a" />
              </div>
              <div style={{ fontSize: '30px', fontWeight: 800, color: '#16a34a', marginTop: '6px' }}>
                {stats.active}
              </div>
            </div>

            <div style={{
              background: 'var(--code-bg)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '16px 20px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text)', fontSize: '13px', fontWeight: 600 }}>
                <span>DISABLED TENANTS</span>
                <Shield size={18} color="#dc2626" />
              </div>
              <div style={{ fontSize: '30px', fontWeight: 800, color: stats.disabled > 0 ? '#dc2626' : 'var(--text)', marginTop: '6px' }}>
                {stats.disabled}
              </div>
            </div>
          </div>
        </div>

        {/* Search & Actions Filter Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px',
          flexWrap: 'wrap',
        }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '260px', maxWidth: '420px' }}>
            <Search
              size={16}
              color="var(--text)"
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              id="search-input"
              placeholder="Search by name, slug, email, or admin..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '9px 12px 9px 36px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--code-bg)',
                color: 'var(--text-h)',
                fontSize: '13px',
              }}
            />
          </div>

          <button
            type="button"
            id="refresh-btn"
            onClick={fetchBusinesses}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: '6px',
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--text)',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Businesses Table */}
        <div style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          boxShadow: 'var(--shadow)',
          overflow: 'hidden',
          textAlign: 'left',
        }}>
          {loading && businesses.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text)' }}>
              Loading platform businesses...
            </div>
          ) : error ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#dc2626' }}>
              Error: {error}
            </div>
          ) : filteredBusinesses.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text)' }}>
              <Building2 size={36} color="var(--text)" style={{ opacity: 0.4, marginBottom: '8px' }} />
              <p style={{ fontWeight: 600, color: 'var(--text-h)', margin: '0 0 4px 0' }}>
                {searchQuery ? 'No matching businesses found' : 'No businesses registered yet'}
              </p>
              <p style={{ fontSize: '13px' }}>
                {searchQuery
                  ? 'Try searching with a different term.'
                  : 'Click "Onboard Business" above to register your first tenant organization.'}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--code-bg)', borderBottom: '1px solid var(--border)', color: 'var(--text)', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.4px' }}>
                    <th style={{ padding: '12px 18px', textAlign: 'left' }}>Business & Slug</th>
                    <th style={{ padding: '12px 18px', textAlign: 'left' }}>Status</th>
                    <th style={{ padding: '12px 18px', textAlign: 'left' }}>Initial Admin</th>
                    <th style={{ padding: '12px 18px', textAlign: 'left' }}>Timezone</th>
                    <th style={{ padding: '12px 18px', textAlign: 'left' }}>Created</th>
                    <th style={{ padding: '12px 18px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBusinesses.map((biz) => {
                    const isActive = biz.status === 'ACTIVE';
                    return (
                      <tr
                        key={biz._id || biz.id}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          transition: 'background 0.15s ease',
                        }}
                      >
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-h)', fontSize: '14px' }}>
                            {biz.name}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text)', marginTop: '2px' }}>
                            <code>{biz.slug}</code>
                          </div>
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '9999px',
                            background: isActive ? '#dcfce7' : '#fee2e2',
                            color: isActive ? '#166534' : '#991b1b',
                            fontSize: '11px',
                            fontWeight: 700,
                            letterSpacing: '0.3px',
                          }}>
                            {isActive ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                            {biz.status}
                          </span>
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          {biz.admin ? (
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text-h)' }}>
                                {biz.admin.name}
                              </div>
                              <div style={{ fontSize: '12px', color: 'var(--text)' }}>
                                {biz.admin.email}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text)', fontStyle: 'italic' }}>None assigned</span>
                          )}
                        </td>

                        <td style={{ padding: '14px 18px', color: 'var(--text)' }}>
                          {biz.timezone}
                        </td>

                        <td style={{ padding: '14px 18px', color: 'var(--text)', fontSize: '12px' }}>
                          {biz.createdAt ? new Date(biz.createdAt).toLocaleDateString() : '—'}
                        </td>

                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                            <button
                              type="button"
                              id={`details-btn-${biz.slug}`}
                              onClick={() => handleOpenDetails(biz)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '6px 12px',
                                fontSize: '12px',
                                fontWeight: 600,
                                borderRadius: '5px',
                                border: '1px solid var(--border)',
                                background: 'var(--bg)',
                                color: 'var(--text-h)',
                                cursor: 'pointer',
                              }}
                              title="Inspect full business details"
                            >
                              <ExternalLink size={13} />
                              Details
                            </button>

                            <button
                              type="button"
                              id={`toggle-status-btn-${biz.slug}`}
                              onClick={() => handlePromptToggleStatus(biz)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '6px 12px',
                                fontSize: '12px',
                                fontWeight: 600,
                                borderRadius: '5px',
                                border: '1px solid var(--border)',
                                background: 'var(--bg)',
                                color: isActive ? '#dc2626' : '#16a34a',
                                cursor: 'pointer',
                              }}
                              title={isActive ? 'Disable this tenant' : 'Re-enable this tenant'}
                            >
                              <Power size={13} />
                              {isActive ? 'Disable' : 'Enable'}
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
      </main>

      {/* Modals & Dialogs */}
      <OnboardBusinessModal
        isOpen={isOnboardModalOpen}
        onClose={() => setIsOnboardModalOpen(false)}
        onSuccess={handleOnboardSuccess}
      />

      <BusinessDetailsModal
        isOpen={isDetailsModalOpen}
        business={selectedBusiness}
        onClose={() => setIsDetailsModalOpen(false)}
        onToggleStatus={handlePromptToggleStatus}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.targetStatus === 'DISABLED' ? 'Disable Business Tenant?' : 'Enable Business Tenant?'}
        message={
          confirmDialog.targetStatus === 'DISABLED' ? (
            <div>
              <p style={{ margin: '0 0 10px 0' }}>
                Are you sure you want to disable <strong>{confirmDialog.business?.name}</strong>?
              </p>
              <p style={{ margin: 0, fontSize: '13px', color: '#b91c1c' }}>
                Warning: Once disabled, its Business Admin and operations will be immediately halted at the authentication gateway until re-enabled.
              </p>
            </div>
          ) : (
            <p style={{ margin: 0 }}>
              Enable <strong>{confirmDialog.business?.name}</strong>? The business and its administrator will immediately regain access to platform operations.
            </p>
          )
        }
        confirmLabel={confirmDialog.targetStatus === 'DISABLED' ? 'Disable Tenant' : 'Enable Tenant'}
        isDestructive={confirmDialog.targetStatus === 'DISABLED'}
        isLoading={confirmDialog.isLoading}
        onConfirm={handleConfirmStatusToggle}
        onCancel={() => setConfirmDialog({ isOpen: false, business: null, targetStatus: null, isLoading: false })}
      />
    </div>
  );
}
