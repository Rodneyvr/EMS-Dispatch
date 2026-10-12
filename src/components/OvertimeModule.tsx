import React, { useState, useMemo } from 'react';
import { OvertimeRecord, UserRole, CrewMember } from '../types';
import {
  calculateMinutesBetween,
  crossesMidnight,
  formatMinutesToHMM,
  formatDateSA,
  getCurrentTimeHHMM,
  getTodayDateYYYYMMDD,
} from '../utils/timeCalculations';
import { Storage } from '../utils/storage';
import { Clock, CheckCircle2, XCircle, Plus, AlertCircle, FileSpreadsheet } from 'lucide-react';

interface OvertimeModuleProps {
  userRole: UserRole;
  currentUsername: string;
  onRefresh: () => void;
}

export const OvertimeModule: React.FC<OvertimeModuleProps> = ({
  userRole,
  currentUsername,
  onRefresh,
}) => {
  const settings = Storage.getSettings();
  const [records, setRecords] = useState<OvertimeRecord[]>(Storage.getOvertime());

  // Form state
  const [date, setDate] = useState<string>(getTodayDateYYYYMMDD());
  const [selectedCrewId, setSelectedCrewId] = useState<string>(
    settings.crewMembers[0]?.id || ''
  );
  const [eprfOrReason, setEprfOrReason] = useState<string>('');
  const [timeStarted, setTimeStarted] = useState<string>('18:00');
  const [timeEnded, setTimeEnded] = useState<string>('21:00');
  const [callType, setCallType] = useState<string>('PRIM');
  const [baseWorked, setBaseWorked] = useState<string>(settings.bases[0] || 'Main Base');
  const [description, setDescription] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  // Approval modal state
  const [actionRecord, setActionRecord] = useState<OvertimeRecord | null>(null);
  const [actionType, setActionType] = useState<'Approved' | 'Rejected'>('Approved');
  const [actionComment, setActionComment] = useState<string>('');

  // Find selected crew member
  const currentCrew = useMemo(() => {
    return settings.crewMembers.find((c) => c.id === selectedCrewId);
  }, [settings.crewMembers, selectedCrewId]);

  // Auto-calculated minutes & formatted H:MM across midnight
  const minutesWorked = useMemo(() => {
    return calculateMinutesBetween(timeStarted, timeEnded);
  }, [timeStarted, timeEnded]);

  const timeWorkedFormatted = useMemo(() => {
    return formatMinutesToHMM(minutesWorked);
  }, [minutesWorked]);

  // Handle format of ePRF / Reason: if user typed digits, make it EPRF####
  const handleReasonBlur = () => {
    const trimmed = eprfOrReason.trim();
    if (/^\d+$/.test(trimmed)) {
      setEprfOrReason(`EPRF${trimmed}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!currentCrew) {
      setFormError('Please select a crew member.');
      return;
    }
    if (!eprfOrReason.trim()) {
      setFormError('Please enter an ePRF or Reason (e.g. 4210 or OT VDV Standby).');
      return;
    }
    if (minutesWorked === 0) {
      setFormError('Time worked cannot be 0 minutes.');
      return;
    }

    const isMidnightOverrun = crossesMidnight(timeStarted, timeEnded);

    const newRecord: OvertimeRecord = {
      id: `ot-${Date.now()}`,
      date,
      crewMemberId: currentCrew.id,
      crewName: currentCrew.name,
      qualification: currentCrew.qualification,
      hpcsaNo: currentCrew.hpcsaNo,
      eprfOrReason: eprfOrReason.trim(),
      timeStarted,
      timeEnded,
      minutesWorked,
      timeWorkedFormatted,
      crossesMidnight: isMidnightOverrun,
      callType,
      baseWorked,
      description: description.trim(),
      status: 'Pending',
      createdAt: new Date().toISOString(),
    };

    Storage.saveOvertime(newRecord, currentUsername);
    setRecords(Storage.getOvertime());
    setEprfOrReason('');
    setDescription('');
    onRefresh();
  };

  const handleApprovalSubmit = () => {
    if (!actionRecord) return;
    Storage.approveRejectOvertime(
      actionRecord.id,
      actionType,
      currentUsername,
      actionComment.trim() || undefined
    );
    setRecords(Storage.getOvertime());
    setActionRecord(null);
    setActionComment('');
    onRefresh();
  };

  // Calculations for summary totals
  const totalApprovedMinutes = useMemo(() => {
    return records
      .filter((r) => r.status === 'Approved')
      .reduce((acc, cur) => acc + cur.minutesWorked, 0);
  }, [records]);

  const totalPendingMinutes = useMemo(() => {
    return records
      .filter((r) => r.status === 'Pending')
      .reduce((acc, cur) => acc + cur.minutesWorked, 0);
  }, [records]);

  // Totals per crew member
  const crewTotals = useMemo(() => {
    const map: { [name: string]: { approvedMin: number; pendingMin: number } } = {};
    for (const r of records) {
      if (!map[r.crewName]) map[r.crewName] = { approvedMin: 0, pendingMin: 0 };
      if (r.status === 'Approved') map[r.crewName].approvedMin += r.minutesWorked;
      if (r.status === 'Pending') map[r.crewName].pendingMin += r.minutesWorked;
    }
    return map;
  }, [records]);

  // Totals per base
  const baseTotals = useMemo(() => {
    const map: { [base: string]: number } = {};
    for (const r of records) {
      if (r.status === 'Approved') {
        map[r.baseWorked] = (map[r.baseWorked] || 0) + r.minutesWorked;
      }
    }
    return map;
  }, [records]);

  const canApprove = userRole === 'Management' || userRole === 'Admin';

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <span className="text-xs font-bold text-slate-500 uppercase block">Approved Overtime</span>
          <div className="text-2xl font-black font-mono-data text-emerald-600 mt-1">
            {formatMinutesToHMM(totalApprovedMinutes)} <span className="text-sm font-normal text-slate-500">hrs</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Total authenticated overtime</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <span className="text-xs font-bold text-slate-500 uppercase block">Pending Approval</span>
          <div className="text-2xl font-black font-mono-data text-amber-500 mt-1">
            {formatMinutesToHMM(totalPendingMinutes)} <span className="text-sm font-normal text-slate-500">hrs</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Awaiting Management review</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <span className="text-xs font-bold text-slate-500 uppercase block">Total Claims</span>
          <div className="text-2xl font-black font-mono-data text-slate-800 mt-1">
            {records.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Logged shift extensions</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <span className="text-xs font-bold text-slate-500 uppercase block">Bases Covered</span>
          <div className="text-xs font-semibold text-slate-700 mt-2 space-y-0.5 font-mono-data">
            {Object.entries(baseTotals).map(([b, m]) => (
              <div key={b} className="flex justify-between">
                <span>{b}:</span>
                <span className="font-bold text-slate-900">{formatMinutesToHMM(m)} hrs</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Overtime Capture Form (Visible to Dispatcher, Management, Admin) */}
      {(userRole === 'Dispatcher' || userRole === 'Management' || userRole === 'Admin') && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-900 text-white px-5 py-3 border-b border-red-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-red-500" />
              <h3 className="font-bold text-base font-heading tracking-wide uppercase">
                Capture Overtime Claim
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono-data">
              Calculates across midnight automatically
            </span>
          </div>

          {formError && (
            <div className="mx-5 mt-4 p-3 bg-red-50 border-l-4 border-red-600 text-red-700 text-xs font-semibold">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-medium"
                  required
                />
              </div>

              {/* Crew Member (Dropdown auto-fills qualification & HPCSA number) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Crew Member <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedCrewId}
                  onChange={(e) => setSelectedCrewId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-semibold"
                  required
                >
                  {settings.crewMembers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.qualification})
                    </option>
                  ))}
                </select>
                {currentCrew && (
                  <div className="mt-1 text-[11px] text-slate-500 font-mono-data">
                    HPCSA: <strong>{currentCrew.hpcsaNo}</strong> · Base: {currentCrew.base}
                  </div>
                )}
              </div>

              {/* ePRF / Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  ePRF / Reason <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 4210 or OT VDV Standby"
                  value={eprfOrReason}
                  onChange={(e) => setEprfOrReason(e.target.value)}
                  onBlur={handleReasonBlur}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono-data font-bold"
                  required
                />
                <span className="text-[10px] text-slate-400">Typing digits converts to EPRF####</span>
              </div>

              {/* Base Worked */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Base Worked <span className="text-red-500">*</span>
                </label>
                <select
                  value={baseWorked}
                  onChange={(e) => setBaseWorked(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-semibold"
                >
                  {settings.bases.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded border border-slate-200">
              {/* Time Started */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-700 uppercase">Time Started</label>
                  <button
                    type="button"
                    onClick={() => setTimeStarted(getCurrentTimeHHMM())}
                    className="text-[10px] bg-slate-200 px-1 rounded hover:bg-slate-300"
                  >
                    Now
                  </button>
                </div>
                <input
                  type="time"
                  value={timeStarted}
                  onChange={(e) => setTimeStarted(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono-data font-bold"
                  required
                />
              </div>

              {/* Time Ended */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-700 uppercase">Time Ended</label>
                  <button
                    type="button"
                    onClick={() => setTimeEnded(getCurrentTimeHHMM())}
                    className="text-[10px] bg-slate-200 px-1 rounded hover:bg-slate-300"
                  >
                    Now
                  </button>
                </div>
                <input
                  type="time"
                  value={timeEnded}
                  onChange={(e) => setTimeEnded(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono-data font-bold"
                  required
                />
              </div>

              {/* Time Worked (Auto-Calculated) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Time Worked (Auto-Calculated)
                </label>
                <div className={`border rounded px-3 py-1.5 font-mono-data font-black text-sm transition ${
                  crossesMidnight(timeStarted, timeEnded)
                    ? 'bg-red-50 border-red-500 text-red-700 shadow-sm'
                    : 'bg-slate-100 border-slate-300 text-slate-900'
                }`}>
                  <div className="flex items-center justify-between">
                    <span>{timeWorkedFormatted} hrs</span>
                    <span className="text-xs font-semibold text-slate-500 font-sans">({minutesWorked} min)</span>
                  </div>
                  {crossesMidnight(timeStarted, timeEnded) && (
                    <div className="text-[11px] text-red-600 font-sans font-extrabold flex items-center gap-1 mt-1 pt-1 border-t border-red-200">
                      <span>🌙 Crosses Midnight (+1 Day rollover auto-calculated)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Call Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Call Type
                </label>
                <select
                  value={callType}
                  onChange={(e) => setCallType(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-semibold"
                >
                  <option value="PRIM">PRIM (Scene)</option>
                  <option value="IHT">IHT (Transfer)</option>
                  <option value="IFT">IFT</option>
                  <option value="STANDBY">STANDBY</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Reason &amp; Clinical Operational Description
              </label>
              <input
                type="text"
                placeholder="e.g. Delayed hospital handover at Life Midmed / Extended resuscitation on scene..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs"
                required
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-xs shadow cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Submit Overtime Claim</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Overtime Claims Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-red-700">
          <h3 className="font-bold text-sm uppercase tracking-wide font-heading">
            Overtime Log &amp; Claims History
          </h3>
          <span className="text-xs text-slate-400">
            {records.length} records total
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Crew Member</th>
                <th className="py-2.5 px-3">ePRF / Reason</th>
                <th className="py-2.5 px-3">Hours (Start - End)</th>
                <th className="py-2.5 px-3">Time Worked</th>
                <th className="py-2.5 px-3">Base</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3">Status</th>
                {canApprove && <th className="py-2.5 px-3 text-right">Approval Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-slate-400">
                    No overtime records logged.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      {formatDateSA(r.date)}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900">{r.crewName}</div>
                      <div className="text-[10px] text-slate-500 font-mono-data">
                        {r.qualification} · {r.hpcsaNo}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono-data font-bold text-slate-800">
                      {r.eprfOrReason}
                    </td>
                    <td className="py-2.5 px-3 font-mono-data text-slate-700">
                      <div>{r.timeStarted} – {r.timeEnded}</div>
                      {(r.crossesMidnight || crossesMidnight(r.timeStarted, r.timeEnded)) && (
                        <span className="text-[10px] bg-red-600 text-white font-extrabold px-1.5 py-0.5 rounded inline-flex items-center gap-1 mt-0.5 shadow-xs">
                          🌙 Crosses Midnight (+1 Day)
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono-data font-black text-slate-900">
                      {r.timeWorkedFormatted} hrs
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">{r.baseWorked}</td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-[200px] truncate" title={r.description}>
                      {r.description}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          r.status === 'Approved'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : r.status === 'Rejected'
                            ? 'bg-red-100 text-red-800 border border-red-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        {r.status}
                      </span>
                      {r.approvedBy && (
                        <div className="text-[9px] text-slate-400 mt-0.5">
                          By: {r.approvedBy}
                        </div>
                      )}
                    </td>
                    {canApprove && (
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        {r.status === 'Pending' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setActionRecord(r);
                                setActionType('Approved');
                                setActionComment('');
                              }}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[10px] transition cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setActionRecord(r);
                                setActionType('Rejected');
                                setActionComment('');
                              }}
                              className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-[10px] transition cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setActionRecord(r);
                              setActionType(r.status === 'Approved' ? 'Rejected' : 'Approved');
                              setActionComment('');
                            }}
                            className="text-[10px] text-slate-500 hover:underline cursor-pointer"
                          >
                            Change Status
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* APPROVE / REJECT MODAL */}
      {actionRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full shadow-2xl p-5 border border-slate-300 space-y-4">
            <h3 className="font-bold text-base text-slate-900 font-heading">
              {actionType} Overtime Claim
            </h3>
            <p className="text-xs text-slate-600">
              Crew: <strong>{actionRecord.crewName}</strong> · Duration:{' '}
              <strong>{actionRecord.timeWorkedFormatted} hrs</strong> ({actionRecord.eprfOrReason})
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Management Comments / Reason
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Validated with CAD trip EPRF4210 log..."
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-xs text-slate-800 focus:bg-white focus:outline-none"
              ></textarea>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setActionRecord(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleApprovalSubmit}
                className={`px-4 py-1.5 text-xs font-bold text-white rounded cursor-pointer shadow ${
                  actionType === 'Approved'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                Confirm {actionType}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
