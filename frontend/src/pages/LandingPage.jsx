import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Calendar,
  Clock,
  ShieldCheck,
  ChevronRight,
  UserCheck,
  Building2,
  BarChart3,
  CheckCircle2,
  Lock,
  Search,
  MapPin,
  Mail,
  Phone,
  Globe,
  AlertCircle,
  RefreshCw,
  X,
} from 'lucide-react';
import { getPublicBusinesses } from '../services/public.service.js';

export default function LandingPage({ onNavigate }) {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadBusinesses = async (query = '') => {
    setLoading(true);
    setError(null);
    try {
      const params = query && query.trim() ? { search: query.trim() } : {};
      const res = await getPublicBusinesses(params);
      setBusinesses(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load available businesses. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadBusinesses(searchTerm);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const features = [
    {
      icon: <Building2 size={20} color="var(--accent)" />,
      title: 'Multi-Tenant Isolation',
      desc: 'Strict zero-trust tenant boundaries enforced by JWT cookie context with complete anti-IDOR security.',
    },
    {
      icon: <Clock size={20} color="#10b981" />,
      title: 'Timezone-Aware Slots',
      desc: '15-minute interval scheduling dynamically calculated in each business’s authoritative local timezone.',
    },
    {
      icon: <Lock size={20} color="#6366f1" />,
      title: 'Conflict Prevention Engine',
      desc: 'Concurrency-protected booking engine with staff locks and database indexes preventing double-booking.',
    },
    {
      icon: <BarChart3 size={20} color="#f59e0b" />,
      title: 'Operational Analytics',
      desc: 'Real-time KPIs including booking volume trends, completion rates, cancellation rates, and provider metrics.',
    },
  ];

  return (
    <div style={{ maxWidth: '960px', margin: '40px auto', padding: '0 20px 80px', textAlign: 'center' }}>
      {/* Platform Badge */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 16px',
        borderRadius: '9999px',
        background: 'var(--accent-bg)',
        color: 'var(--accent)',
        fontSize: '13px',
        fontWeight: 600,
        letterSpacing: '0.5px',
        marginBottom: '20px',
        border: '1px solid var(--accent-border)',
      }}>
        <Sparkles size={14} />
        B2B Multi-Tenant Appointment Booking Platform
      </div>

      <h1 style={{ margin: '0 0 18px', fontSize: '46px', color: 'var(--text-h)', fontWeight: 800, letterSpacing: '-0.75px', lineHeight: 1.15 }}>
        Smart, Conflict-Free <br />
        <span style={{ color: 'var(--accent)' }}>Appointment Scheduling</span>
      </h1>
      <p style={{ margin: '0 auto 40px', fontSize: '18px', color: 'var(--text)', maxWidth: '660px', lineHeight: 1.6 }}>
        Slotify enables service businesses to publish live booking portals, manage staff availability across timezones, and monitor appointment analytics with zero double-booking.
      </p>

      {/* Feature Highlights Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '16px',
        textAlign: 'left',
        marginBottom: '48px',
      }}>
        {features.map((f, i) => (
          <div
            key={i}
            style={{
              background: 'var(--code-bg)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {f.icon}
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-h)', margin: 0 }}>
              {f.title}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text)', margin: 0, lineHeight: 1.5 }}>
              {f.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Public Business Discovery Section */}
      <div id="discover-businesses" style={{ textAlign: 'left', marginBottom: '48px' }}>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Building2 size={20} color="var(--accent)" />
            <h2 style={{ fontSize: '24px', color: 'var(--text-h)', margin: 0, fontWeight: 700 }}>
              Find a Business
            </h2>
          </div>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text)' }}>
            Book an appointment with one of our available businesses.
          </p>
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: '24px', position: 'relative', maxWidth: '480px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--code-bg)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '4px 12px',
            transition: 'border-color 0.2s',
          }}>
            <Search size={18} color="var(--text)" style={{ opacity: 0.7, marginRight: '8px', flexShrink: 0 }} />
            <input
              id="business-search-input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search businesses..."
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-h)',
                fontSize: '14px',
                padding: '8px 0',
              }}
            />
            {searchTerm && (
              <button
                type="button"
                id="clear-search-btn"
                onClick={() => setSearchTerm('')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  opacity: 0.7,
                }}
                title="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Loading Skeletons */}
        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {[1, 2].map((i) => (
              <div
                key={i}
                style={{
                  background: 'var(--code-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '14px',
                  padding: '24px',
                  minHeight: '200px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  opacity: 0.6,
                }}
              >
                <div>
                  <div style={{ height: '14px', width: '80px', background: 'var(--border)', borderRadius: '4px', marginBottom: '12px' }} />
                  <div style={{ height: '22px', width: '200px', background: 'var(--border)', borderRadius: '4px', marginBottom: '14px' }} />
                  <div style={{ height: '14px', width: '150px', background: 'var(--border)', borderRadius: '4px', marginBottom: '10px' }} />
                  <div style={{ height: '14px', width: '180px', background: 'var(--border)', borderRadius: '4px' }} />
                </div>
                <div style={{ height: '40px', width: '100%', background: 'var(--border)', borderRadius: '8px', marginTop: '20px' }} />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div
            id="business-discovery-error"
            style={{
              background: 'var(--code-bg)',
              border: '1px solid #ef444433',
              borderRadius: '12px',
              padding: '24px',
              textAlign: 'center',
              color: 'var(--text)',
            }}
          >
            <AlertCircle size={28} color="#ef4444" style={{ marginBottom: '8px' }} />
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-h)', marginBottom: '4px' }}>
              Unable to load businesses
            </div>
            <p style={{ margin: '0 0 16px', fontSize: '13px' }}>
              {error}
            </p>
            <button
              type="button"
              id="retry-fetch-businesses-btn"
              onClick={() => loadBusinesses(searchTerm)}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <RefreshCw size={14} />
              Retry
            </button>
          </div>
        )}

        {/* Empty States */}
        {!loading && !error && businesses.length === 0 && (
          <div
            id="business-discovery-empty"
            style={{
              background: 'var(--code-bg)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '36px 20px',
              textAlign: 'center',
            }}
          >
            <Building2 size={32} color="var(--accent)" style={{ opacity: 0.5, marginBottom: '12px' }} />
            <h3 style={{ margin: '0 0 6px', fontSize: '16px', color: 'var(--text-h)' }}>
              {searchTerm.trim() ? 'No businesses found.' : 'No businesses are currently available for booking.'}
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text)' }}>
              {searchTerm.trim()
                ? `We couldn't find any businesses matching "${searchTerm}". Try a different keyword.`
                : 'Please check back soon as new businesses join our scheduling network.'}
            </p>
            {searchTerm.trim() && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{
                  marginTop: '16px',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text-h)',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Clear Search
              </button>
            )}
          </div>
        )}

        {/* Business Cards Grid */}
        {!loading && !error && businesses.length > 0 && (
          <div
            id="business-cards-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '20px',
            }}
          >
            {businesses.map((b) => (
              <div
                key={b.slug}
                id={`business-card-${b.slug}`}
                style={{
                  background: 'var(--code-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '14px',
                  padding: '24px',
                  boxShadow: 'var(--shadow)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  textAlign: 'left',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#10b981',
                        background: '#10b98115',
                        border: '1px solid #10b98130',
                        borderRadius: '9999px',
                        padding: '2px 8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                      ACTIVE
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        color: 'var(--text)',
                        background: 'var(--bg)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        padding: '2px 8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Globe size={11} />
                      {b.timezone || 'Asia/Kolkata'}
                    </span>
                  </div>

                  <h3 style={{ margin: '0 0 10px', fontSize: '20px', color: 'var(--text-h)', fontWeight: 700 }}>
                    {b.name}
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px', fontSize: '13px', color: 'var(--text)' }}>
                    {b.address && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                        <MapPin size={14} style={{ marginTop: '3px', flexShrink: 0, opacity: 0.7 }} />
                        <span style={{ lineHeight: 1.4 }}>{b.address}</span>
                      </div>
                    )}
                    {b.contactEmail && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Mail size={14} style={{ flexShrink: 0, opacity: 0.7 }} />
                        <span>{b.contactEmail}</span>
                      </div>
                    )}
                    {b.contactPhone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Phone size={14} style={{ flexShrink: 0, opacity: 0.7 }} />
                        <span>{b.contactPhone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  id={`book-appointment-btn-${b.slug}`}
                  onClick={() => onNavigate(`/book/${b.slug}`)}
                  style={{
                    padding: '11px 18px',
                    borderRadius: '8px',
                    background: 'var(--accent)',
                    color: '#fff',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    width: '100%',
                    boxShadow: 'var(--shadow)',
                  }}
                >
                  Book Appointment
                  <ChevronRight size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Admin Sign In Section */}
      <div
        style={{
          background: 'var(--code-bg)',
          border: '1px solid var(--border)',
          borderRadius: '14px',
          padding: '24px 28px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          textAlign: 'left',
        }}
      >
        <div>
          <div style={{ fontWeight: 700, color: 'var(--text-h)', fontSize: '16px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserCheck size={18} color="var(--accent)" />
            Business Admin & System Owner Portal
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text)' }}>
            Sign in to manage catalog services, staff rosters, availability operating hours, appointments calendar, and business analytics.
          </p>
        </div>

        <button
          type="button"
          id="admin-signin-btn"
          onClick={() => onNavigate('/login')}
          style={{
            padding: '11px 22px',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            background: 'var(--bg)',
            color: 'var(--text-h)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: 'var(--shadow)',
          }}
        >
          Portal Login
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
