import { useState, useEffect, useCallback } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Calendar,
  TrendingUp,
  CheckCircle2,
  XCircle,
  UserX,
  Clock,
  RefreshCw,
  AlertCircle,
  Scissors,
  Users,
  Activity,
  CalendarDays,
  Percent,
} from 'lucide-react';
import { getAnalyticsOverview } from '../services/analytics.service.js';

export default function AnalyticsView({ business }) {
  const [range, setRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAnalyticsOverview({ range });
      if (res.success && res.data) {
        setAnalyticsData(res.data);
      } else {
        throw new Error(res.message || 'Failed to load analytics.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch analytics.');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const summary = analyticsData?.summary || {
    total: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
    noShow: 0,
    cancellationRate: 0,
    completionRate: 0,
  };

  const trendData = analyticsData?.trend || [];
  const statusBreakdown = analyticsData?.statusBreakdown || [];
  const serviceStats = analyticsData?.servicePerformance || [];
  const staffStats = analyticsData?.staffPerformance || [];
  const dateRange = analyticsData?.dateRange;

  // Custom Tooltip for Trend AreaChart
  const CustomTrendTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '10px 14px',
          boxShadow: 'var(--shadow)',
          color: 'var(--text-h)',
          fontSize: '13px',
        }}>
          <div style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--text-h)' }}>
            {data.date}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '3px' }}>
            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Total:</span>
            <span style={{ fontWeight: 700, color: 'var(--text-h)' }}>{data.count}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '3px' }}>
            <span style={{ color: '#16a34a' }}>Completed:</span>
            <span style={{ color: 'var(--text-h)' }}>{data.completed}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '3px' }}>
            <span style={{ color: '#dc2626' }}>Cancelled:</span>
            <span style={{ color: 'var(--text-h)' }}>{data.cancelled}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
            <span style={{ color: '#d97706' }}>No-Show:</span>
            <span style={{ color: 'var(--text-h)' }}>{data.noShow}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Analytics Header & Controls */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        background: 'var(--code-bg)',
        padding: '16px 20px',
        borderRadius: '12px',
        border: '1px solid var(--border)',
      }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Activity size={20} color="var(--accent)" />
            Business Performance & Analytics
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text)', margin: '4px 0 0 0' }}>
            Authoritative scheduling metrics and operational insights for {business?.name || 'your business'} ({business?.timezone || 'Asia/Kolkata'})
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Preset Range Selector */}
          <div style={{
            display: 'inline-flex',
            borderRadius: '8px',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            padding: '3px',
          }}>
            {[
              { id: '7d', label: 'Last 7 Days' },
              { id: '30d', label: 'Last 30 Days' },
              { id: '90d', label: 'Last 90 Days' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setRange(p.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: range === p.id ? 700 : 500,
                  cursor: 'pointer',
                  backgroundColor: range === p.id ? 'var(--accent)' : 'transparent',
                  color: range === p.id ? '#ffffff' : 'var(--text)',
                  transition: 'all 0.15s ease',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={fetchAnalytics}
            disabled={loading}
            title="Refresh Analytics"
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          color: '#f87171',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '14px',
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Date Range Badge */}
      {dateRange && (
        <div style={{ fontSize: '13px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CalendarDays size={15} color="var(--accent)" />
          <span>Reporting window: <strong>{dateRange.startDate}</strong> through <strong>{dateRange.endDate}</strong> ({range})</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '16px',
      }}>
        {/* Total Appointments */}
        <div style={{
          background: 'var(--code-bg)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text)' }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Total Bookings</span>
            <Calendar size={18} color="#60a5fa" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-h)' }}>
            {loading ? '...' : summary.total}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text)' }}>
            Scheduled in selected range
          </span>
        </div>

        {/* Confirmed */}
        <div style={{
          background: 'var(--code-bg)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text)' }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Confirmed</span>
            <Clock size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#10b981' }}>
            {loading ? '...' : summary.confirmed}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text)' }}>
            Upcoming active slots
          </span>
        </div>

        {/* Completed + Completion Rate */}
        <div style={{
          background: 'var(--code-bg)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text)' }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Completed</span>
            <CheckCircle2 size={18} color="#3b82f6" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '28px', fontWeight: 800, color: '#3b82f6' }}>
              {loading ? '...' : summary.completed}
            </span>
            <span style={{
              fontSize: '12px',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '6px',
              background: 'rgba(59, 130, 246, 0.15)',
              color: '#60a5fa',
            }}>
              {summary.completionRate}%
            </span>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text)' }}>
            Completion rate
          </span>
        </div>

        {/* Cancelled + Cancellation Rate */}
        <div style={{
          background: 'var(--code-bg)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text)' }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Cancelled</span>
            <XCircle size={18} color="#ef4444" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '28px', fontWeight: 800, color: '#ef4444' }}>
              {loading ? '...' : summary.cancelled}
            </span>
            <span style={{
              fontSize: '12px',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '6px',
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#f87171',
            }}>
              {summary.cancellationRate}%
            </span>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text)' }}>
            Cancellation rate
          </span>
        </div>

        {/* No-Shows */}
        <div style={{
          background: 'var(--code-bg)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text)' }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>No-Shows</span>
            <UserX size={18} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#f59e0b' }}>
            {loading ? '...' : summary.noShow}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text)' }}>
            Unattended appointments
          </span>
        </div>
      </div>

      {/* Main Charts Row: Appointment Volume Trend & Status Breakdown */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: '20px',
      }}>
        {/* Trend AreaChart */}
        <div style={{
          background: 'var(--code-bg)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-h)', margin: 0 }}>
                Booking Volume Trend
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text)', margin: '2px 0 0 0' }}>
                Appointments per day across the selected {range} window
              </p>
            </div>
            <TrendingUp size={18} color="var(--accent)" />
          </div>

          <div style={{ height: '260px', width: '100%' }}>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#A633FF" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#A633FF" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E7E4DC" opacity={0.8} />
                  <XAxis
                    dataKey="date"
                    stroke="#667085"
                    fontSize={11}
                    tickFormatter={(val) => {
                      const parts = val.split('-');
                      return `${parts[1]}/${parts[2]}`;
                    }}
                  />
                  <YAxis stroke="#667085" fontSize={11} allowDecimals={false} />
                  <Tooltip content={<CustomTrendTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#A633FF"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorCount)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)' }}>
                No appointment trends found.
              </div>
            )}
          </div>
        </div>

        {/* Status Breakdown Donut */}
        <div style={{
          background: 'var(--code-bg)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-h)', margin: 0 }}>
              Status Distribution
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text)', margin: '2px 0 0 0' }}>
              Breakdown of appointment outcomes
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', height: '260px', width: '100%' }}>
            {summary.total > 0 ? (
              <>
                <div style={{ width: '55%', height: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusBreakdown}
                        dataKey="count"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={3}
                      >
                        {statusBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ width: '45%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {statusBreakdown.map((item) => (
                    <div key={item.status} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: item.color }} />
                        <span style={{ color: 'var(--text-h)', fontWeight: 500 }}>{item.label}</span>
                      </div>
                      <span style={{ fontWeight: 700, color: 'var(--text)' }}>
                        {item.count} ({item.percentage}%)
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text)', gap: '8px' }}>
                <AlertCircle size={28} opacity={0.5} />
                <span style={{ fontSize: '14px' }}>No status distribution recorded in this window.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Performance Tables Row: Service & Staff Performance */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: '20px',
      }}>
        {/* Service Performance */}
        <div style={{
          background: 'var(--code-bg)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <Scissors size={18} color="var(--accent)" />
              Service Performance
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text)' }}>Sorted by bookings</span>
          </div>

          {serviceStats.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text)' }}>
                    <th style={{ padding: '8px 4px', fontWeight: 600 }}>Service</th>
                    <th style={{ padding: '8px 4px', fontWeight: 600, textAlign: 'center' }}>Total</th>
                    <th style={{ padding: '8px 4px', fontWeight: 600, textAlign: 'center' }}>Completed</th>
                    <th style={{ padding: '8px 4px', fontWeight: 600, textAlign: 'center' }}>Cancelled</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceStats.map((srv) => (
                    <tr key={srv.serviceId} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 4px', color: 'var(--text-h)', fontWeight: 600 }}>
                        {srv.serviceName}
                      </td>
                      <td style={{ padding: '10px 4px', textAlign: 'center', fontWeight: 700 }}>
                        {srv.total}
                      </td>
                      <td style={{ padding: '10px 4px', textAlign: 'center', color: '#16a34a' }}>
                        {srv.completed}
                      </td>
                      <td style={{ padding: '10px 4px', textAlign: 'center', color: '#dc2626' }}>
                        {srv.cancelled}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text)', fontSize: '13px' }}>
              No service bookings recorded in this timeframe.
            </div>
          )}
        </div>

        {/* Staff Performance */}
        <div style={{
          background: 'var(--code-bg)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <Users size={18} color="var(--accent)" />
              Staff Activity & Delivery
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text)' }}>Assigned providers</span>
          </div>

          {staffStats.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text)' }}>
                    <th style={{ padding: '8px 4px', fontWeight: 600 }}>Staff Member</th>
                    <th style={{ padding: '8px 4px', fontWeight: 600, textAlign: 'center' }}>Total</th>
                    <th style={{ padding: '8px 4px', fontWeight: 600, textAlign: 'center' }}>Completed</th>
                    <th style={{ padding: '8px 4px', fontWeight: 600, textAlign: 'center' }}>No-Show</th>
                  </tr>
                </thead>
                <tbody>
                  {staffStats.map((st) => (
                    <tr key={st.staffId} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 4px', color: 'var(--text-h)', fontWeight: 600 }}>
                        {st.staffName}
                      </td>
                      <td style={{ padding: '10px 4px', textAlign: 'center', fontWeight: 700 }}>
                        {st.total}
                      </td>
                      <td style={{ padding: '10px 4px', textAlign: 'center', color: '#16a34a' }}>
                        {st.completed}
                      </td>
                      <td style={{ padding: '10px 4px', textAlign: 'center', color: '#d97706' }}>
                        {st.noShow}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text)', fontSize: '13px' }}>
              No staff appointments recorded in this timeframe.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
