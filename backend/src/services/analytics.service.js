import mongoose from 'mongoose';
import Appointment from '../models/appointment.model.js';
import Business from '../models/business.model.js';
import Service from '../models/service.model.js';
import Staff from '../models/staff.model.js';
import { localToUtc, formatDateInTimezone } from '../utils/timezone.js';

/**
 * Format a Date object in a specific timezone as YYYY-MM-DD.
 * @param {Date} date
 * @param {string} timeZone
 * @returns {string} YYYY-MM-DD
 */
const getDateStrInTimezone = (date, timeZone = 'UTC') => {
  if (typeof formatDateInTimezone === 'function') {
    return formatDateInTimezone(date, timeZone);
  }
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  let y = '', m = '', d = '';
  for (const p of parts) {
    if (p.type === 'year') y = p.value;
    if (p.type === 'month') m = p.value;
    if (p.type === 'day') d = p.value;
  }
  return `${y}-${m}-${d}`;
};

/**
 * Generates an array of all continuous YYYY-MM-DD date strings between start and end (inclusive).
 * @param {string} startStr - 'YYYY-MM-DD'
 * @param {string} endStr - 'YYYY-MM-DD'
 * @returns {string[]}
 */
const generateDateRangeList = (startStr, endStr) => {
  const dates = [];
  const [sy, sm, sd] = startStr.split('-').map(Number);
  const [ey, em, ed] = endStr.split('-').map(Number);

  let current = new Date(Date.UTC(sy, sm - 1, sd));
  const end = new Date(Date.UTC(ey, em - 1, ed));

  while (current <= end) {
    const y = current.getUTCFullYear();
    const m = String(current.getUTCMonth() + 1).padStart(2, '0');
    const d = String(current.getUTCDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
};

/**
 * Retrieve tenant-scoped analytics overview for Business Admin.
 *
 * @param {string|mongoose.Types.ObjectId} businessId - Tenant ID
 * @param {object} query - Query parameters (range, startDate, endDate)
 * @returns {Promise<object>} Structured analytics payload
 */
export const getTenantAnalytics = async (businessId, query = {}) => {
  if (!businessId) {
    const error = new Error('Business ID is required for analytics.');
    error.statusCode = 400;
    throw error;
  }

  const business = await Business.findById(businessId);
  if (!business) {
    const error = new Error('Business not found.');
    error.statusCode = 404;
    throw error;
  }

  if (business.status !== 'ACTIVE') {
    const error = new Error('Business account is inactive or disabled.');
    error.statusCode = 403;
    throw error;
  }

  const timezone = business.timezone || 'Asia/Kolkata';

  // 1. Resolve date boundaries
  let startDateStr = query.startDate;
  let endDateStr = query.endDate;

  if (!startDateStr || !endDateStr) {
    const now = new Date();
    const todayStr = getDateStrInTimezone(now, timezone);
    const rangePreset = query.range || '30d';

    const daysToSubtract = rangePreset === '7d' ? 6 : rangePreset === '90d' ? 89 : 29;

    const [ty, tm, td] = todayStr.split('-').map(Number);
    const targetStartDate = new Date(Date.UTC(ty, tm - 1, td));
    targetStartDate.setUTCDate(targetStartDate.getUTCDate() - daysToSubtract);

    const sy = targetStartDate.getUTCFullYear();
    const sm = String(targetStartDate.getUTCMonth() + 1).padStart(2, '0');
    const sd = String(targetStartDate.getUTCDate()).padStart(2, '0');

    startDateStr = `${sy}-${sm}-${sd}`;
    endDateStr = todayStr;
  }

  // Convert to UTC timestamps bounded by business timezone
  const startUtc = localToUtc(startDateStr, '00:00', timezone);
  const endDayStartUtc = localToUtc(endDateStr, '00:00', timezone);
  const endUtc = new Date(endDayStartUtc.getTime() + 24 * 60 * 60 * 1000);

  // 2. Fetch tenant-scoped appointments in range
  const appointments = await Appointment.find({
    businessId,
    startTime: { $gte: startUtc, $lt: endUtc },
  })
    .populate('serviceId', 'name durationMinutes price')
    .populate('staffId', 'name email')
    .lean();

  // 3. Core summary metrics
  const total = appointments.length;
  let confirmed = 0;
  let completed = 0;
  let cancelled = 0;
  let noShow = 0;

  // Trend mapping: dateStr -> counts
  const trendMap = new Map();
  const allDates = generateDateRangeList(startDateStr, endDateStr);
  for (const d of allDates) {
    trendMap.set(d, {
      date: d,
      count: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
      noShow: 0,
    });
  }

  // Service and Staff tracking maps
  const serviceStatsMap = new Map();
  const staffStatsMap = new Map();

  for (const appt of appointments) {
    const status = appt.status;
    if (status === 'CONFIRMED') confirmed++;
    else if (status === 'COMPLETED') completed++;
    else if (status === 'CANCELLED') cancelled++;
    else if (status === 'NO_SHOW') noShow++;

    // Trend accumulation by local date
    const localDate = getDateStrInTimezone(new Date(appt.startTime), timezone);
    if (trendMap.has(localDate)) {
      const dayData = trendMap.get(localDate);
      dayData.count++;
      if (status === 'CONFIRMED') dayData.confirmed++;
      else if (status === 'COMPLETED') dayData.completed++;
      else if (status === 'CANCELLED') dayData.cancelled++;
      else if (status === 'NO_SHOW') dayData.noShow++;
    }

    // Service performance accumulation
    const rawService = appt.serviceId;
    const serviceId = rawService?._id ? rawService._id.toString() : rawService ? rawService.toString() : 'unknown';
    const serviceName = rawService?.name || 'Unassigned Service';

    if (!serviceStatsMap.has(serviceId)) {
      serviceStatsMap.set(serviceId, {
        serviceId,
        serviceName,
        total: 0,
        confirmed: 0,
        completed: 0,
        cancelled: 0,
        noShow: 0,
      });
    }
    const servEntry = serviceStatsMap.get(serviceId);
    servEntry.total++;
    if (status === 'CONFIRMED') servEntry.confirmed++;
    else if (status === 'COMPLETED') servEntry.completed++;
    else if (status === 'CANCELLED') servEntry.cancelled++;
    else if (status === 'NO_SHOW') servEntry.noShow++;

    // Staff performance accumulation
    const rawStaff = appt.staffId;
    const staffId = rawStaff?._id ? rawStaff._id.toString() : rawStaff ? rawStaff.toString() : 'unassigned';
    const staffName = rawStaff?.name || 'Unassigned Staff';

    if (!staffStatsMap.has(staffId)) {
      staffStatsMap.set(staffId, {
        staffId,
        staffName,
        total: 0,
        confirmed: 0,
        completed: 0,
        cancelled: 0,
        noShow: 0,
      });
    }
    const staffEntry = staffStatsMap.get(staffId);
    staffEntry.total++;
    if (status === 'CONFIRMED') staffEntry.confirmed++;
    else if (status === 'COMPLETED') staffEntry.completed++;
    else if (status === 'CANCELLED') staffEntry.cancelled++;
    else if (status === 'NO_SHOW') staffEntry.noShow++;
  }

  // Safe percentage calculations preventing division by zero
  const cancellationRate = total > 0 ? Number(((cancelled / total) * 100).toFixed(1)) : 0;
  const completionRate = total > 0 ? Number(((completed / total) * 100).toFixed(1)) : 0;

  const summary = {
    total,
    confirmed,
    completed,
    cancelled,
    noShow,
    cancellationRate,
    completionRate,
  };

  // Status breakdown array
  const statusBreakdown = [
    {
      status: 'CONFIRMED',
      label: 'Confirmed',
      count: confirmed,
      percentage: total > 0 ? Number(((confirmed / total) * 100).toFixed(1)) : 0,
      color: '#10b981', // emerald
    },
    {
      status: 'COMPLETED',
      label: 'Completed',
      count: completed,
      percentage: total > 0 ? Number(((completed / total) * 100).toFixed(1)) : 0,
      color: '#3b82f6', // blue
    },
    {
      status: 'CANCELLED',
      label: 'Cancelled',
      count: cancelled,
      percentage: total > 0 ? Number(((cancelled / total) * 100).toFixed(1)) : 0,
      color: '#ef4444', // red
    },
    {
      status: 'NO_SHOW',
      label: 'No-Show',
      count: noShow,
      percentage: total > 0 ? Number(((noShow / total) * 100).toFixed(1)) : 0,
      color: '#f59e0b', // amber
    },
  ];

  // Convert maps to arrays
  const trend = Array.from(trendMap.values());
  const servicePerformance = Array.from(serviceStatsMap.values()).sort((a, b) => b.total - a.total);
  const staffPerformance = Array.from(staffStatsMap.values()).sort((a, b) => b.total - a.total);

  return {
    summary,
    trend,
    statusBreakdown,
    servicePerformance,
    staffPerformance,
    dateRange: {
      startDate: startDateStr,
      endDate: endDateStr,
      timezone,
    },
  };
};

/**
 * Retrieve high-level platform metrics for System Owner.
 *
 * @returns {Promise<object>} Platform-wide metrics
 */
export const getPlatformAnalytics = async () => {
  const [totalBusinesses, activeBusinesses, disabledBusinesses, totalAppointments] = await Promise.all([
    Business.countDocuments(),
    Business.countDocuments({ status: 'ACTIVE' }),
    Business.countDocuments({ status: 'DISABLED' }),
    Appointment.countDocuments(),
  ]);

  return {
    totalBusinesses,
    activeBusinesses,
    disabledBusinesses,
    totalAppointments,
  };
};
