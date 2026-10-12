import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  Trip,
  OvertimeRecord,
  StockRequest,
  AppSettings,
  UserRole,
} from '../types';
import { exportMonthEndWorkbook, exportTripsToCsv } from '../utils/excelExport';
import { formatDateSA, formatMinutesToHMM } from '../utils/timeCalculations';
import { Storage } from '../utils/storage';
import {
  FileSpreadsheet,
  Download,
  Upload,
  BarChart3,
  Users,
  Clock,
  Package,
  AlertCircle,
  FileCheck,
  CheckCircle2,
  Printer,
} from 'lucide-react';

interface ReportsViewProps {
  trips: Trip[];
  overtime: OvertimeRecord[];
  stockRequests: StockRequest[];
  settings: AppSettings;
  userRole: UserRole;
  currentUsername: string;
  onRefresh: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  trips,
  overtime,
  stockRequests,
  settings,
  userRole,
  currentUsername,
  onRefresh,
}) => {
  const [reportTab, setReportTab] = useState<
    'month_end' | 'slow_calls' | 'crew_stats' | 'eprf_audit' | 'stock_usage' | 'import_excel'
  >('month_end');

  // Excel Import state
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);

  const activeTrips = useMemo(() => trips.filter((t) => !t.isDeleted), [trips]);

  // 1. Slowest Calls Analysis
  const slowestCalls = useMemo(() => {
    return [...activeTrips]
      .sort((a, b) => b.calculatedTimes.totalCallMinutes - a.calculatedTimes.totalCallMinutes)
      .slice(0, 10);
  }, [activeTrips]);

  // 2. Crew statistics & pairings
  const crewStats = useMemo(() => {
    const stats: Record<string, { totalTrips: number; alsTrips: number; primaryTrips: number }> =
      {};
    for (const t of activeTrips) {
      for (const crew of t.crewMembers) {
        if (!stats[crew]) stats[crew] = { totalTrips: 0, alsTrips: 0, primaryTrips: 0 };
        stats[crew].totalTrips += 1;
        if (t.levelOfCare === 'ALS') stats[crew].alsTrips += 1;
        if (t.callType === 'PRIM') stats[crew].primaryTrips += 1;
      }
    }
    return stats;
  }, [activeTrips]);

  // 3. ePRF Register sequence gaps & duplicates analyzer
  const eprfAnalysis = useMemo(() => {
    const sorted = [...activeTrips]
      .map((t) => {
        const num = parseInt(t.eprfNumber, 10);
        return { trip: t, num: isNaN(num) ? 0 : num };
      })
      .filter((x) => x.num > 0)
      .sort((a, b) => a.num - b.num);

    const duplicates: { num: number; trips: Trip[] }[] = [];
    const gaps: { after: number; expected: number; missingCount: number }[] = [];

    const numMap: Record<number, Trip[]> = {};
    for (const item of sorted) {
      if (!numMap[item.num]) numMap[item.num] = [];
      numMap[item.num].push(item.trip);
    }

    for (const [n, tripList] of Object.entries(numMap)) {
      if (tripList.length > 1) {
        duplicates.push({ num: parseInt(n, 10), trips: tripList });
      }
    }

    // Gap detection
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i].num;
      const next = sorted[i + 1].num;
      if (next > current + 1) {
        gaps.push({
          after: current,
          expected: current + 1,
          missingCount: next - current - 1,
        });
      }
    }

    return { sorted, duplicates, gaps };
  }, [activeTrips]);

  // 4. Stock usage report per vehicle
  const stockVehicleUsage = useMemo(() => {
    const usage: Record<string, number> = {};
    for (const req of stockRequests) {
      usage[req.ambulance] = (usage[req.ambulance] || 0) + req.lines.length;
    }
    return usage;
  }, [stockRequests]);

  // Handle Excel file upload parsing
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportErrors([]);
    setImportSuccessMessage(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const wb = XLSX.read(data, { type: 'binary' });
        const firstSheetName = wb.SheetNames[0];
        const sheet = wb.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(sheet) as any[];

        const parsed: any[] = [];
        const errs: string[] = [];

        json.forEach((row, idx) => {
          const ambulance = row['Ambulance'] || row['ambulance'];
          const date = row['Date'] || row['date'];
          let eprf = row['ePRF #'] || row['eprf'] || row['EPRF #'];

          // Clean formula ="EPRF"&"4211" or text
          if (typeof eprf === 'string') {
            eprf = eprf.replace(/[^0-9]/g, '');
          }

          if (!ambulance || !date || !eprf) {
            errs.push(`Row ${idx + 2}: Missing required fields (Ambulance, Date, or ePRF).`);
          } else {
            // Check if already in system
            const existing = Storage.findTripByEprf(eprf.toString());
            parsed.push({
              ambulance,
              date,
              eprfNumber: eprf.toString(),
              levelOfCare: row['Level of Care'] || 'ILS',
              billingType: row['Billing Type'] || 'PRIVATE',
              crewMembers: [row['Crew'] || 'Stephan Rossouw (BLS)'],
              callType: row['Call Type'] || 'PRIM',
              hospital: row['Colour Code / Which Hospital'] || 'Middelburg Provincial Hospital',
              shift: row['Shift Type'] || 'Day',
              isDuplicate: !!existing,
              existingTrip: existing,
            });
          }
        });

        setImportRows(parsed);
        setImportErrors(errs);
      } catch (err) {
        setImportErrors(['Failed to parse Excel file. Ensure valid .xlsx format.']);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmImport = () => {
    let importedCount = 0;
    for (const r of importRows) {
      if (!r.isDuplicate) {
        const newTrip: Trip = {
          id: `trip-import-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          ambulance: r.ambulance,
          base: settings.bases[0],
          date: r.date,
          shift: r.shift,
          eprfNumber: r.eprfNumber,
          eprfFormatted: `EPRF${r.eprfNumber}`,
          levelOfCare: r.levelOfCare,
          billingType: r.billingType,
          crewMembers: r.crewMembers,
          callType: r.callType,
          priority: 'Yellow',
          pickupLocation: r.hospital || 'X1 Green',
          hospital: r.hospital || 'X1 Green',
          colourCodeOrHospital: r.hospital || 'X1 Green',
          times: {
            timeReceived: '08:00',
            timeMobile: '08:05',
            timeAtHospital: '08:45',
            timeAvailable: '09:15',
          },
          calculatedTimes: {
            responseMinutes: 5,
            travelMinutes: 40,
            turnaroundMinutes: 30,
            totalCallMinutes: 75,
          },
          outcome: 'Transported',
          createdBy: currentUsername,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        Storage.saveTrip(newTrip, currentUsername);
        importedCount++;
      }
    }

    setImportSuccessMessage(`Successfully imported ${importedCount} trips into the system!`);
    setImportRows([]);
    onRefresh();
  };

  return (
    <div className="space-y-4">
      {/* Subnavigation Bar */}
      <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setReportTab('month_end')}
            className={`px-3 py-2 rounded transition cursor-pointer ${
              reportTab === 'month_end'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Month-End Workbook
          </button>
          <button
            onClick={() => setReportTab('slow_calls')}
            className={`px-3 py-2 rounded transition cursor-pointer ${
              reportTab === 'slow_calls'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Response &amp; Slow Calls
          </button>
          <button
            onClick={() => setReportTab('crew_stats')}
            className={`px-3 py-2 rounded transition cursor-pointer ${
              reportTab === 'crew_stats'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Crew &amp; Pairings
          </button>
          <button
            onClick={() => setReportTab('eprf_audit')}
            className={`px-3 py-2 rounded transition cursor-pointer ${
              reportTab === 'eprf_audit'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            ePRF Sequence &amp; Gaps
          </button>
          <button
            onClick={() => setReportTab('stock_usage')}
            className={`px-3 py-2 rounded transition cursor-pointer ${
              reportTab === 'stock_usage'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Stock per Vehicle
          </button>
          <button
            onClick={() => setReportTab('import_excel')}
            className={`px-3 py-2 rounded transition cursor-pointer ${
              reportTab === 'import_excel'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Import Excel
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportMonthEndWorkbook(trips, overtime, settings)}
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold text-xs shadow transition cursor-pointer"
            title="Download multi-month Excel workbook with formulas"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Generate Year Workbook (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* TAB 1: MONTH-END WORKBOOK INFO & DOWNLOAD */}
      {reportTab === 'month_end' && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="border-b border-slate-200 pb-4">
            <h3 className="font-heading font-black text-xl uppercase tracking-wide text-slate-900">
              Annual Month-End Excel Master Workbook
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Complies with Section 8 specifications: Multi-sheet workbook named{' '}
              <strong className="text-slate-800 font-mono">
                "{settings.workbookName || 'Ambulance Trips 2026'}.xlsx"
              </strong>
              , monthly trip sheets (<span className="font-mono">"Jan 26"</span>,{' '}
              <span className="font-mono">"Feb 26"</span>...), and monthly overtime sheets (
              <span className="font-mono text-red-600">"OT Jan 26"</span>...).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
              <h4 className="font-bold text-slate-800 uppercase tracking-wide text-[11px]">
                Trip Sheets Architecture:
              </h4>
              <ul className="list-disc pl-4 space-y-1 text-slate-600">
                <li>Exact columns: Ambulance, Date, ePRF #, Level of Care, Billing Type, Crew, Call Type, Times, Hospital, Shift Type.</li>
                <li>ePRF cells injected with native formula <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">="EPRF"&amp;"4211"</code>.</li>
                <li>Billing cells formatted with official color badges and data-validation ready columns.</li>
              </ul>
            </div>

            <div className="bg-red-50/50 p-4 rounded-lg border border-red-200 space-y-2">
              <h4 className="font-bold text-red-800 uppercase tracking-wide text-[11px]">
                Overtime Sheets Architecture:
              </h4>
              <ul className="list-disc pl-4 space-y-1 text-slate-700">
                <li>Separate red overtime sheets for each month.</li>
                <li>Native midnight-safe time duration formula: <code className="bg-red-100 px-1 py-0.5 rounded font-mono">=IF(E2&gt;=D2,E2-D2,1+E2-D2)</code>.</li>
                <li>Summary totals per crew member and base worked.</li>
              </ul>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-slate-100">
            <span className="text-xs text-slate-500">
              Ready to export: <strong>{activeTrips.length}</strong> trips and{' '}
              <strong>{overtime.length}</strong> overtime entries
            </span>
            <button
              onClick={() => exportMonthEndWorkbook(trips, overtime, settings)}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs uppercase tracking-wider shadow-md transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Complete Excel Workbook</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: SLOW CALLS ANALYSIS */}
      {reportTab === 'slow_calls' && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
            <h3 className="font-bold text-sm uppercase font-heading tracking-wide">
              Slowest Calls &amp; Turnaround Times (Top 10 Longest Incidents)
            </h3>
            <span className="text-xs text-slate-400">Total Call Time Analysis</span>
          </div>

          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 uppercase font-semibold text-[10px]">
              <tr>
                <th className="py-2.5 px-3">ePRF #</th>
                <th className="py-2.5 px-3">Ambulance</th>
                <th className="py-2.5 px-3">Colour Code / Destination</th>
                <th className="py-2.5 px-3">Response</th>
                <th className="py-2.5 px-3">Travel</th>
                <th className="py-2.5 px-3">Turnaround</th>
                <th className="py-2.5 px-3 font-bold text-red-600">Total Call</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono-data">
              {slowestCalls.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="py-2 px-3 font-bold text-slate-900">{t.eprfFormatted}</td>
                  <td className="py-2 px-3 text-slate-800">{t.ambulance}</td>
                  <td className="py-2 px-3 text-slate-800 font-bold">{t.colourCodeOrHospital || t.hospital}</td>
                  <td className="py-2 px-3">{t.calculatedTimes.responseMinutes}m</td>
                  <td className="py-2 px-3">{t.calculatedTimes.travelMinutes}m</td>
                  <td className="py-2 px-3">{t.calculatedTimes.turnaroundMinutes}m</td>
                  <td className="py-2 px-3 font-black text-red-700">
                    {t.calculatedTimes.totalCallMinutes} min (
                    {formatMinutesToHMM(t.calculatedTimes.totalCallMinutes)})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: CREW STATS */}
      {reportTab === 'crew_stats' && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 space-y-4">
          <h3 className="font-bold text-sm uppercase font-heading tracking-wide text-slate-900">
            Trips Dispatched per Crew Member
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(crewStats).map(([crewName, data]) => (
              <div key={crewName} className="p-3 bg-slate-50 rounded border border-slate-200 text-xs">
                <span className="font-bold text-slate-900 block">{crewName}</span>
                <div className="mt-2 space-y-1 text-slate-600 font-mono-data">
                  <div className="flex justify-between">
                    <span>Total Calls:</span>
                    <span className="font-bold text-slate-900">{data.totalTrips}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ALS Resuscitation:</span>
                    <span className="font-bold text-red-600">{data.alsTrips}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Primary Scenes:</span>
                    <span className="font-bold text-blue-600">{data.primaryTrips}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: ePRF SEQUENCE & GAP CHECKER */}
      {reportTab === 'eprf_audit' && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 space-y-4 text-xs">
          <div>
            <h3 className="font-bold text-sm uppercase font-heading tracking-wide text-slate-900">
              ePRF Sequence Auditor (Gaps &amp; Duplicates Detector)
            </h3>
            <p className="text-slate-500 text-[11px]">
              Verifies continuous sequence in paper books and electronic PRF allocations to prevent missing clinical records.
            </p>
          </div>

          {/* Duplicates check */}
          <div>
            <h4 className="font-bold uppercase text-slate-700 text-[11px] mb-2">
              Duplicate ePRF Number Violations:
            </h4>
            {eprfAnalysis.duplicates.length === 0 ? (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded border border-emerald-200 font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Zero duplicate ePRFs detected across the entire database!</span>
              </div>
            ) : (
              <div className="space-y-2">
                {eprfAnalysis.duplicates.map((dup) => (
                  <div
                    key={dup.num}
                    className="p-3 bg-red-50 border border-red-300 rounded text-red-900"
                  >
                    <strong>Duplicate ePRF #{dup.num}</strong> found across {dup.trips.length} entries.
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Missing sequence gaps */}
          <div>
            <h4 className="font-bold uppercase text-slate-700 text-[11px] mb-2">
              Missing Sequence Gaps:
            </h4>
            {eprfAnalysis.gaps.length === 0 ? (
              <div className="p-3 bg-slate-50 text-slate-700 rounded border border-slate-200">
                Sequence is contiguous.
              </div>
            ) : (
              <div className="space-y-2">
                {eprfAnalysis.gaps.map((gap, i) => (
                  <div
                    key={i}
                    className="p-3 bg-amber-50 border border-amber-300 rounded text-amber-900 flex justify-between items-center"
                  >
                    <div>
                      <span>
                        Sequence gap after <strong>EPRF{gap.after}</strong>
                      </span>
                      <div className="text-[10px] text-amber-700">
                        Missing {gap.missingCount} ePRF number(s) starting from EPRF{gap.expected}
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-amber-200 rounded font-mono font-bold text-amber-950">
                      GAP
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: STOCK USAGE PER VEHICLE */}
      {reportTab === 'stock_usage' && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 space-y-4">
          <h3 className="font-bold text-sm uppercase font-heading tracking-wide text-slate-900">
            Stock Replenishment Frequency per Ambulance
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {settings.ambulances.map((amb) => (
              <div key={amb.id} className="p-4 bg-slate-50 rounded border border-slate-200 text-center">
                <span className="font-mono font-black text-lg text-slate-900 block">{amb.fleetNo}</span>
                <span className="text-[10px] text-slate-400 block">{amb.base}</span>
                <div className="mt-2 text-xl font-bold font-mono text-red-600">
                  {stockVehicleUsage[amb.fleetNo] || 0}
                </div>
                <span className="text-[10px] text-slate-500">items requisitions</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: IMPORT EXCEL */}
      {reportTab === 'import_excel' && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-4 text-xs">
          <div className="border-b border-slate-200 pb-3">
            <h3 className="font-bold text-base font-heading text-slate-900 uppercase tracking-wide">
              Import Trips Workbook (.xlsx)
            </h3>
            <p className="text-slate-500 text-xs">
              Upload an existing Excel workbook containing trip sheets. Previews rows, validates ePRF uniqueness, and imports active rows.
            </p>
          </div>

          <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center bg-slate-50 hover:bg-slate-100 transition">
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="text-xs text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white cursor-pointer"
            />
            <p className="text-[11px] text-slate-400 mt-2">
              Supports standard "Ambulance Trips 2026.xlsx" format
            </p>
          </div>

          {importSuccessMessage && (
            <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded font-semibold">
              ✓ {importSuccessMessage}
            </div>
          )}

          {importErrors.length > 0 && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-300 rounded space-y-1">
              <span className="font-bold block">Validation Warnings / Errors:</span>
              {importErrors.map((err, i) => (
                <div key={i}>• {err}</div>
              ))}
            </div>
          )}

          {importRows.length > 0 && (
            <div className="space-y-3 pt-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-800">
                  Preview ({importRows.length} parsed records):
                </span>
                <button
                  onClick={handleConfirmImport}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold uppercase shadow transition cursor-pointer"
                >
                  Confirm &amp; Import Non-Duplicate Trips
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 uppercase text-[10px]">
                    <tr>
                      <th className="p-2">Ambulance</th>
                      <th className="p-2">Date</th>
                      <th className="p-2">ePRF #</th>
                      <th className="p-2">Billing</th>
                      <th className="p-2">Hospital</th>
                      <th className="p-2">Duplicate Check</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {importRows.map((r, i) => (
                      <tr key={i} className={r.isDuplicate ? 'bg-red-50 text-red-700' : ''}>
                        <td className="p-2 font-mono">{r.ambulance}</td>
                        <td className="p-2">{r.date}</td>
                        <td className="p-2 font-mono font-bold">EPRF{r.eprfNumber}</td>
                        <td className="p-2">{r.billingType}</td>
                        <td className="p-2">{r.hospital}</td>
                        <td className="p-2">
                          {r.isDuplicate ? (
                            <span className="font-bold text-red-600">
                              ⚠️ Already in database (will skip)
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-semibold">✓ Valid</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
