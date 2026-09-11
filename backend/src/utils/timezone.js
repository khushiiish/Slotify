/**
 * Timezone and date-time arithmetic utilities.
 * Leverages native Node.js Intl.DateTimeFormat (IANA timezones) with full DST awareness.
 */

/**
 * Converts a 24-hour time string "HH:mm" to total minutes since midnight.
 *
 * @param {string} timeStr - "HH:mm"
 * @returns {number} Minutes (0 to 1439)
 */
export const timeStrToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Converts minutes since midnight back to a padded "HH:mm" string.
 *
 * @param {number} totalMinutes - Minutes (0 to 1439)
 * @returns {string} "HH:mm"
 */
export const minutesToTimeStr = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

/**
 * Determines the weekday integer (0 = Sunday ... 6 = Saturday) for a calendar date "YYYY-MM-DD".
 * Calendar dates (YYYY-MM-DD) map deterministically to the day of week.
 *
 * @param {string} dateStr - "YYYY-MM-DD"
 * @returns {number} 0 to 6
 */
export const getDayOfWeekForDate = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  // Using Date.UTC to avoid local environment timezone skew
  const utcDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return utcDate.getUTCDay();
};

/**
 * Accurately converts a local wall-clock date and time in a target IANA timezone to an exact UTC Date.
 * Handles daylight saving time (DST spring forward / fall back) transitions accurately.
 *
 * @param {string} dateStr - "YYYY-MM-DD"
 * @param {string} timeStr - "HH:mm"
 * @param {string} [timeZone='UTC'] - IANA timezone identifier (e.g. 'America/New_York', 'Asia/Kolkata')
 * @returns {Date} JavaScript Date object representing the moment in UTC
 */
export const localToUtc = (dateStr, timeStr, timeZone = 'UTC') => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);

  // Initial estimate as UTC
  const utcEstimate = Date.UTC(year, month - 1, day, hours, minutes, 0);

  // Formatter configured for the target business timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });

  const getPartsAsUtc = (timestamp) => {
    const parts = formatter.formatToParts(new Date(timestamp));
    const map = {};
    for (const p of parts) {
      map[p.type] = p.value;
    }
    let h = parseInt(map.hour, 10);
    if (h === 24) h = 0; // Intl midnight normalization
    return Date.UTC(
      parseInt(map.year, 10),
      parseInt(map.month, 10) - 1,
      parseInt(map.day, 10),
      h,
      parseInt(map.minute, 10),
      parseInt(map.second, 10)
    );
  };

  const asLocal = getPartsAsUtc(utcEstimate);
  const offset = asLocal - utcEstimate;
  let correctUtc = utcEstimate - offset;

  // Secondary verification pass to guard against DST boundary jumps
  const recheckLocal = getPartsAsUtc(correctUtc);
  if (recheckLocal !== utcEstimate) {
    correctUtc = correctUtc - (recheckLocal - utcEstimate);
  }

  return new Date(correctUtc);
};

/**
 * Formats a Date object in the specified timezone as "HH:mm"
 *
 * @param {Date} date - Date object
 * @param {string} timeZone - IANA timezone
 * @returns {string} "HH:mm"
 */
export const formatTimeInTimezone = (date, timeZone = 'UTC') => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  let hour = '00';
  let minute = '00';
  for (const p of parts) {
    if (p.type === 'hour') hour = p.value === '24' ? '00' : p.value;
    if (p.type === 'minute') minute = p.value;
  }
  return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
};
