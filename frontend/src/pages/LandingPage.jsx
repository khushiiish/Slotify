import React from 'react';
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
} from 'lucide-react';

export default function LandingPage({ onNavigate }) {
  const demoBusinesses = [
    {
      name: 'Urban Wellness Studio',
      slug: 'urban-wellness-studio',
      category: 'Health & Wellness',
      location: 'Bengaluru, India (Asia/Kolkata)',
      desc: 'Massage therapy, acupuncture, and holistic wellness sessions.',
    },
    {
      name: 'TechFix Services',
      slug: 'techfix-services',
      category: 'Repair & Electronics',
      location: 'San Francisco, USA (America/Los_Angeles)',
      desc: 'Diagnostic consultations, hardware repairs, and technical support.',
    },
  ];

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

      {/* Demo Businesses Cards */}
      <div style={{ textAlign: 'left', marginBottom: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '19px', color: 'var(--text-h)', margin: 0, fontWeight: 700 }}>
            Live Tenant Booking Portals
          </h2>
          <span style={{ fontSize: '13px', color: 'var(--text)' }}>Try public scheduling as a customer</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {demoBusinesses.map((b) => (
            <div
              key={b.slug}
              id={`demo-card-${b.slug}`}
              style={{
                background: 'var(--code-bg)',
                border: '1px solid var(--border)',
                borderRadius: '14px',
                padding: '24px',
                boxShadow: 'var(--shadow)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  {b.category}
                </div>
                <h3 style={{ margin: '0 0 6px', fontSize: '20px', color: 'var(--text-h)' }}>
                  {b.name}
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--text)', marginBottom: '12px', opacity: 0.8 }}>
                  {b.location}
                </div>
                <p style={{ margin: '0 0 20px', fontSize: '13px', color: 'var(--text)', lineHeight: 1.5 }}>
                  {b.desc}
                </p>
              </div>

              <button
                type="button"
                id={`book-portal-btn-${b.slug}`}
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
                  transition: 'transform 0.1s ease',
                }}
              >
                Open Booking Portal
                <ChevronRight size={16} />
              </button>
            </div>
          ))}
        </div>
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
