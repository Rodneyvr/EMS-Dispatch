/**
 * Time utility functions for 24-hour South African EMS time calculations.
 * Handles midnight rollovers seamlessly.
 */

export function parseMinutesFromTimeStr(timeStr: string): number {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const parts = timeStr.trim().split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

export function formatMinutesToHMM(totalMinutes: number): string {
  if (isNaN(totalMinutes) || totalMinutes < 0) return '0:00';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.floor(totalMinutes % 60);
  return `${hours}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Calculates duration in minutes from start to end time.
 * If end time is earlier than start time (e.g., 23:30 to 01:15),
 * treats as passing midnight (+24 hours / 1440 minutes).
 */
export function calculateMinutesBetween(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;
  const startMin = parseMinutesFromTimeStr(startTime);
  const endMin = parseMinutesFromTimeStr(endTime);

  if (endMin >= startMin) {
    return endMin - startMin;
  } else {
    // Crosses midnight
    return (1440 - startMin) + endMin;
  }
}

export function crossesMidnight(startTime: string, endTime: string): boolean {
  if (!startTime || !endTime) return false;
  return parseMinutesFromTimeStr(endTime) < parseMinutesFromTimeStr(startTime);
}

/**
 * Determines whether a given time (HH:mm) belongs to Day (06:00 - 17:59) or Night (18:00 - 05:59) shift.
 */
export function getShiftFromTime(timeStr: string): 'Day' | 'Night' {
  if (!timeStr) return 'Day';
  const min = parseMinutesFromTimeStr(timeStr);
  const dayStart = 6 * 60; // 06:00
  const dayEnd = 18 * 60; // 18:00
  return min >= dayStart && min < dayEnd ? 'Day' : 'Night';
}

/**
 * Formats YYYY-MM-DD to South African standard DD/MM/YYYY.
 */
export function formatDateSA(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Returns current local time in HH:mm format.
 */
export function getCurrentTimeHHMM(): string {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, '0');
  const m = now.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Returns today's date in YYYY-MM-DD format.
 */
export function getTodayDateYYYYMMDD(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = (now.getMonth() + 1).toString().padStart(2, '0');
  const d = now.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}
