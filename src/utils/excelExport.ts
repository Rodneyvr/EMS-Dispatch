import * as XLSX from 'xlsx';
import { Trip, OvertimeRecord, AppSettings, AuditLogEntry } from '../types';
import { formatDateSA } from './timeCalculations';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Returns month tab name in format "Jan 26", "Feb 26", etc.
 */
export function getMonthSheetName(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Trips';
  const m = MONTH_NAMES[d.getMonth()];
  const y = d.getFullYear().toString().slice(-2);
  return `${m} ${y}`;
}

export function getOtSheetName(dateStr: string): string {
  return `OT ${getMonthSheetName(dateStr)}`;
}

/**
 * Generates the official multi-sheet Month-end workbook with exact column structure and Excel formulas.
 */
export function exportMonthEndWorkbook(
  trips: Trip[],
  overtime: OvertimeRecord[],
  settings: AppSettings,
  year = 2026
): void {
  const wb = XLSX.utils.book_new();

  // Filter non-deleted trips
  const activeTrips = trips.filter((t) => !t.isDeleted);

  // Group trips by month
  const tripsByMonth: { [monthKey: string]: Trip[] } = {};
  for (const trip of activeTrips) {
    const key = getMonthSheetName(trip.date);
    if (!tripsByMonth[key]) tripsByMonth[key] = [];
    tripsByMonth[key].push(trip);
  }

  // Group overtime by month
  const otByMonth: { [monthKey: string]: OvertimeRecord[] } = {};
  for (const ot of overtime) {
    const key = getOtSheetName(ot.date);
    if (!otByMonth[key]) otByMonth[key] = [];
    otByMonth[key].push(ot);
  }

  // Ensure current month exists if empty
  const currentMonthKey = `${MONTH_NAMES[new Date().getMonth()]} ${year.toString().slice(-2)}`;
  if (!tripsByMonth[currentMonthKey]) {
    tripsByMonth[currentMonthKey] = [];
  }

  // Create Trip Sheets
  for (const [sheetName, monthTrips] of Object.entries(tripsByMonth)) {
    // Sort chronologically
    monthTrips.sort((a, b) => a.date.localeCompare(b.date) || a.times.timeReceived.localeCompare(b.times.timeReceived));

    const rows: unknown[][] = [
      [
        'Ambulance',
        'Date',
        'ePRF #',
        'Level of Care',
        'Billing Type',
        'Crew',
        'Call Type',
        'Time Received/Dispatched',
        'Time Mobile',
        'Time At Hospital',
        'Available',
        'Colour Code / Which Hospital',
        'Shift Type',
      ],
    ];

    for (const trip of monthTrips) {
      rows.push([
        trip.ambulance,
        formatDateSA(trip.date),
        // Prompt formula: ePRF cells use the formula ="EPRF"&"4211"
        `="EPRF"&"${trip.eprfNumber}"`,
        trip.levelOfCare,
        trip.billingType,
        trip.crewMembers.join(', '),
        trip.callType,
        trip.times.timeReceived,
        trip.times.timeMobile,
        trip.times.timeAtHospital,
        trip.times.timeAvailable,
        trip.colourCodeOrHospital || trip.hospital || '—',
        trip.shift,
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Apply column widths
    ws['!cols'] = [
      { wch: 12 }, // Ambulance
      { wch: 12 }, // Date
      { wch: 15 }, // ePRF #
      { wch: 14 }, // Level of Care
      { wch: 14 }, // Billing Type
      { wch: 30 }, // Crew
      { wch: 12 }, // Call Type
      { wch: 22 }, // Time Received/Dispatched
      { wch: 14 }, // Time Mobile
      { wch: 16 }, // Time At Hospital
      { wch: 12 }, // Available
      { wch: 32 }, // Hospital
      { wch: 12 }, // Shift Type
    ];

    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  // Create Overtime Sheets
  for (const [otSheetName, monthOt] of Object.entries(otByMonth)) {
    const otRows: unknown[][] = [
      [
        'Date',
        'Crew Member Details',
        'EPRF / Reason',
        'Time Started',
        'Time End',
        'Time Worked',
        'Call Type',
        'Base Worked',
        'Status',
      ],
    ];

    let rowIdx = 2;
    for (const ot of monthOt) {
      otRows.push([
        formatDateSA(ot.date),
        `${ot.crewName} (${ot.qualification} - ${ot.hpcsaNo})`,
        ot.eprfOrReason,
        ot.timeStarted,
        ot.timeEnded,
        // Formula per prompt: =IF(E2>=D2,E2-D2,1+E2-D2) or formatted duration
        `=IF(E${rowIdx}>=D${rowIdx},E${rowIdx}-D${rowIdx},1+E${rowIdx}-D${rowIdx})`,
        ot.callType,
        ot.baseWorked,
        ot.status,
      ]);
      rowIdx++;
    }

    const wsOt = XLSX.utils.aoa_to_sheet(otRows);
    wsOt['!cols'] = [
      { wch: 12 }, // Date
      { wch: 34 }, // Crew Member
      { wch: 18 }, // Reason
      { wch: 14 }, // Time Started
      { wch: 14 }, // Time End
      { wch: 16 }, // Time Worked
      { wch: 12 }, // Call Type
      { wch: 14 }, // Base
      { wch: 12 }, // Status
    ];

    XLSX.utils.book_append_sheet(wb, wsOt, otSheetName);
  }

  const filename = `${settings.workbookName || 'Ambulance Trips 2026'}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * Exports currently filtered trips to CSV.
 */
export function exportTripsToCsv(trips: Trip[], filename = 'resq_trips_export.csv'): void {
  const activeTrips = trips.filter((t) => !t.isDeleted);
  const rows = [
    [
      'Ambulance',
      'Base',
      'Date',
      'ePRF #',
      'CAD Number',
      'Level of Care',
      'Billing Type',
      'Medical Scheme',
      'Crew Members',
      'Call Type',
      'Priority',
      'Colour Code / Which Hospital',
      'Time Received',
      'Time Mobile',
      'Time At Scene',
      'Time At Hospital',
      'Time Available',
      'Response Min',
      'Travel Min',
      'Turnaround Min',
      'Total Call Min',
      'Distance KM',
      'Outcome',
      'Notes',
    ],
  ];

  for (const t of activeTrips) {
    rows.push([
      t.ambulance,
      t.base,
      formatDateSA(t.date),
      t.eprfFormatted,
      t.cadNumber || '',
      t.levelOfCare,
      t.billingType,
      t.medicalSchemeName || '',
      t.crewMembers.join('; '),
      t.callType,
      t.priority,
      t.colourCodeOrHospital || t.hospital || '',
      t.times.timeReceived,
      t.times.timeMobile,
      t.times.timeAtScene || '',
      t.times.timeAtHospital,
      t.times.timeAvailable,
      t.calculatedTimes.responseMinutes.toString(),
      t.calculatedTimes.travelMinutes.toString(),
      t.calculatedTimes.turnaroundMinutes.toString(),
      t.calculatedTimes.totalCallMinutes.toString(),
      t.distanceKm ? t.distanceKm.toString() : '',
      t.outcome,
      (t.notes || '').replace(/[\r\n]+/g, ' '),
    ]);
  }

  const csvContent = rows
    .map((r) => r.map((c) => `"${(c || '').replace(/"/g, '""')}"`).join(','))
    .join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exports full POPIA audit trail log entries as a CSV file for long-term record-keeping.
 */
export function exportAuditLogCSV(
  logs: AuditLogEntry[],
  filename = `resq_ems_audit_log_popia_${new Date().toISOString().slice(0, 10)}.csv`
): void {
  const headers = [
    'Audit ID',
    'Timestamp (ISO)',
    'Date (SAST)',
    'Time (SAST)',
    'Operator / User',
    'Action',
    'Target Entity / Table',
    'Record ID',
    'Audit Trail Details',
    'IP Address',
  ];

  const rows: string[][] = [headers];

  for (const log of logs) {
    const d = new Date(log.timestamp);
    const dateSAST = !isNaN(d.getTime())
      ? d.toLocaleDateString('en-ZA', { timeZone: 'Africa/Johannesburg' })
      : '';
    const timeSAST = !isNaN(d.getTime())
      ? d.toLocaleTimeString('en-ZA', { timeZone: 'Africa/Johannesburg', hour12: false })
      : '';

    rows.push([
      log.id,
      log.timestamp,
      dateSAST,
      timeSAST,
      log.user,
      log.action,
      log.table,
      log.recordId,
      (log.details || '').replace(/[\r\n]+/g, ' '),
      log.ip || '192.168.1.100',
    ]);
  }

  // Prepend UTF-8 BOM so spreadsheet programs (Excel, LibreOffice) handle encoding seamlessly
  const csvContent =
    '\uFEFF' +
    rows
      .map((r) => r.map((c) => `"${(c ?? '').toString().replace(/"/g, '""')}"`).join(','))
      .join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

