import React, { useState, useMemo } from 'react';
import { ShiftScheduleEntry, ShiftDutyType, UserRole, CrewMember } from '../types';
import { Storage, playAlertSound } from '../utils/storage';
import { DEFAULT_CREW } from '../data/seedData';
import {
  Calendar,
  Clock,
  PlusCircle,
  Search,
  Filter,
  CheckCircle2,
  Trash2,
  Edit2,
  Download,
  Building,
  Truck,
  Shield,
  Activity,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  X,
  Send,
  CalendarDays,
} from 'lucide-react';

interface ShiftScheduleViewProps {
  userRole: UserRole;
  currentUsername: string;
  onRefresh: () => void;
}

export const ShiftScheduleView: React.FC<ShiftScheduleViewProps> = ({
  userRole,
  currentUsername,
  onRefresh,
}) => {
  const [schedules, setSchedules] = useState<ShiftScheduleEntry[]>(() => Storage.getShiftSchedules());
  const settings = Storage.getSettings();
  const crewList: CrewMember[] = settings.crewMembers && settings.crewMembers.length > 0 ? settings.crewMembers : DEFAULT_CREW;
  const bases = settings.bases && settings.bases.length > 0 ? settings.bases : ['Brackenfell Base', 'Cape Gate Station', 'Bellville Base', 'Paarl Base'];
  const ambulances = settings.ambulances && settings.ambulances.length > 0 ? settings.ambulances : [];

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [baseFilter, setBaseFilter] = useState('ALL');
  const [shiftTypeFilter, setShiftTypeFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'list' | 'week'>('list');

  // Selected date range (defaults around today)
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ShiftScheduleEntry | null>(null);

  // Form State
  const [crewMemberId, setCrewMemberId] = useState('');
  const [shiftDate, setShiftDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [shiftType, setShiftType] = useState<ShiftDutyType>('Day');
  const [startTime, setStartTime] = useState('06:00');
  const [endTime, setEndTime] = useState('18:00');
  const [base, setBase] = useState(bases[0] || 'Brackenfell Base');
  const [assignedAmbulance, setAssignedAmbulance] = useState('MR001');
  const [partnerCrewName, setPartnerCrewName] = useState('');
  const [shiftStatus, setShiftStatus] = useState<'Scheduled' | 'On Duty' | 'Completed' | 'Absent'>('Scheduled');
  const [notes, setNotes] = useState('');

  const refreshList = () => {
    setSchedules(Storage.getShiftSchedules());
    onRefresh();
  };

  const isDispatcherOrAdmin = userRole === 'Admin' || userRole === 'Dispatcher' || userRole === 'Developer' || userRole === 'Management';

  // Handle Shift Type change presets
  const handleShiftTypeChange = (type: ShiftDutyType) => {
    setShiftType(type);
    if (type === 'Day') {
      setStartTime('06:00');
      setEndTime('18:00');
    } else if (type === 'Night') {
      setStartTime('18:00');
      setEndTime('06:00');
    } else if (type === 'Off') {
      setStartTime('00:00');
      setEndTime('23:59');
      setAssignedAmbulance('');
    } else if (type === 'Standby') {
      setStartTime('08:00');
      setEndTime('18:00');
    }
  };

  const handleOpenAddModal = () => {
    setEditingEntry(null);
    const defaultCrew = crewList[0];
    setCrewMemberId(defaultCrew?.id || '');
    setShiftDate(selectedDate);
    setShiftType('Day');
    setStartTime('06:00');
    setEndTime('18:00');
    setBase(defaultCrew?.base || bases[0]);
    setAssignedAmbulance('MR001');
    setPartnerCrewName(crewList[1] ? `${crewList[1].name} (${crewList[1].qualification})` : '');
    setShiftStatus('Scheduled');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (entry: ShiftScheduleEntry) => {
    setEditingEntry(entry);
    setCrewMemberId(entry.crewMemberId);
    setShiftDate(entry.date);
    setShiftType(entry.shiftType);
    setStartTime(entry.startTime);
    setEndTime(entry.endTime);
    setBase(entry.base);
    setAssignedAmbulance(entry.assignedAmbulance || '');
    setPartnerCrewName(entry.partnerCrewName || '');
    setShiftStatus(entry.status);
    setNotes(entry.notes || '');
    setIsModalOpen(true);
  };

  const handleSaveShift = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedCrew = crewList.find((c) => c.id === crewMemberId) || {
      name: 'Paramedic',
      qualification: 'ILS',
    };

    if (editingEntry) {
      const updated: ShiftScheduleEntry = {
        ...editingEntry,
        date: shiftDate,
        crewMemberId,
        crewName: selectedCrew.name,
        qualification: selectedCrew.qualification,
        base,
        shiftType,
        startTime,
        endTime,
        assignedAmbulance: assignedAmbulance || undefined,
        partnerCrewName: partnerCrewName.trim() || undefined,
        status: shiftStatus,
        notes: notes.trim() || undefined,
        updatedAt: new Date().toISOString(),
      };
      Storage.updateShiftSchedule(updated, currentUsername);
    } else {
      const newEntry: ShiftScheduleEntry = {
        id: `shift-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        date: shiftDate,
        crewMemberId,
        crewName: selectedCrew.name,
        qualification: selectedCrew.qualification,
        base,
        shiftType,
        startTime,
        endTime,
        assignedAmbulance: assignedAmbulance || undefined,
        partnerCrewName: partnerCrewName.trim() || undefined,
        status: shiftStatus,
        notes: notes.trim() || undefined,
        createdBy: currentUsername,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      Storage.addShiftSchedule(newEntry, currentUsername);
    }

    playAlertSound('success');
    setIsModalOpen(false);
    refreshList();
  };

  const handleDeleteShift = (id: string) => {
    if (confirm('Delete this crew member shift schedule entry?')) {
      Storage.deleteShiftSchedule(id, currentUsername);
      refreshList();
    }
  };

  const handleToggleStatus = (entry: ShiftScheduleEntry) => {
    if (!isDispatcherOrAdmin) return;
    const nextStatus: Record<ShiftScheduleEntry['status'], ShiftScheduleEntry['status']> = {
      Scheduled: 'On Duty',
      'On Duty': 'Completed',
      Completed: 'Scheduled',
      Absent: 'Scheduled',
    };
    const updated: ShiftScheduleEntry = {
      ...entry,
      status: nextStatus[entry.status],
      updatedAt: new Date().toISOString(),
    };
    Storage.updateShiftSchedule(updated, currentUsername);
    refreshList();
  };

  // Filtered schedules
  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      if (baseFilter !== 'ALL' && s.base !== baseFilter) return false;
      if (shiftTypeFilter !== 'ALL' && s.shiftType !== shiftTypeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          s.crewName.toLowerCase().includes(q) ||
          s.qualification.toLowerCase().includes(q) ||
          (s.assignedAmbulance && s.assignedAmbulance.toLowerCase().includes(q)) ||
          (s.partnerCrewName && s.partnerCrewName.toLowerCase().includes(q)) ||
          s.base.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [schedules, baseFilter, shiftTypeFilter, searchQuery]);

  // Export Roster to CSV
  const handleExportCSV = () => {
    if (filteredSchedules.length === 0) {
      alert('No shift schedule records to export.');
      return;
    }

    const headers = [
      'Shift ID',
      'Date',
      'Crew Member',
      'Qualification',
      'Base Station',
      'Shift Type',
      'Start Time',
      'End Time',
      'Assigned Vehicle',
      'Partner Crew',
      'Duty Status',
      'Notes',
    ];

    const rows = filteredSchedules.map((s) => [
      s.id,
      s.date,
      `"${s.crewName.replace(/"/g, '""')}"`,
      s.qualification,
      `"${s.base.replace(/"/g, '""')}"`,
      s.shiftType,
      s.startTime,
      s.endTime,
      s.assignedAmbulance || 'N/A',
      `"${(s.partnerCrewName || 'None').replace(/"/g, '""')}"`,
      s.status,
      `"${(s.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ResQ_Shift_Roster_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    playAlertSound('chime');
  };

  // KPIs
  const todayStr = new Date().toISOString().slice(0, 10);
  const onDutyCount = schedules.filter((s) => s.date === todayStr && s.status === 'On Duty').length;
  const todayScheduledCount = schedules.filter((s) => s.date === todayStr).length;
  const alsCoverageCount = schedules.filter(
    (s) => s.date === todayStr && s.qualification === 'ALS' && (s.status === 'On Duty' || s.status === 'Scheduled')
  ).length;

  return (
    <div className="space-y-4">
      {/* Top Banner & Action Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 sm:p-5 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-red-500" />
            <h2 className="text-lg sm:text-xl font-bold font-heading uppercase tracking-wide">
              Crew &amp; Fleet Shift Roster Scheduling
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-600/30 text-red-300 border border-red-500/40">
              LAN DUTY MATRIX
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Paramedic shifts, vehicle pairings, and station allocations across Brackenfell, Cape Gate, Bellville &amp; Paarl bases.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {isDispatcherOrAdmin && (
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded font-bold text-xs uppercase tracking-wider transition shadow-sm cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Add Shift Duty</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded font-bold text-xs transition cursor-pointer"
            title="Download shift roster as CSV"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export Roster (CSV)</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm">
          <div className="text-[11px] font-bold text-slate-500 uppercase flex items-center justify-between">
            <span>Today's Total Shifts</span>
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-black mt-1">{todayScheduledCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Allocated for {todayStr}</div>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-emerald-200 shadow-sm bg-gradient-to-br from-white to-emerald-50/30">
          <div className="text-[11px] font-bold text-emerald-800 uppercase flex items-center justify-between">
            <span>Currently On Duty</span>
            <Activity className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">{onDutyCount}</div>
          <div className="text-[10px] text-emerald-600 mt-0.5">Active responder crews</div>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-red-200 shadow-sm bg-gradient-to-br from-white to-red-50/30">
          <div className="text-[11px] font-bold text-red-800 uppercase flex items-center justify-between">
            <span>ALS Specialist Coverage</span>
            <Shield className="w-3.5 h-3.5 text-red-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-red-600 mt-1">{alsCoverageCount}</div>
          <div className="text-[10px] text-red-600 mt-0.5">Advanced Life Support leads</div>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm">
          <div className="text-[11px] font-bold text-slate-500 uppercase flex items-center justify-between">
            <span>Fleet Active Pairs</span>
            <Truck className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-black mt-1">
            {new Set(schedules.filter((s) => s.date === todayStr && s.assignedAmbulance).map((s) => s.assignedAmbulance)).size}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">MR units staffed today</div>
        </div>
      </div>

      {/* Filter and View Toolbar */}
      <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search medic, qualification, vehicle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs focus:outline-none focus:border-red-600 font-medium"
            />
          </div>

          {/* Base Filter */}
          <select
            value={baseFilter}
            onChange={(e) => setBaseFilter(e.target.value)}
            className="py-1.5 px-2 bg-slate-50 border border-slate-300 rounded font-bold text-slate-700 focus:outline-none focus:border-red-600"
          >
            <option value="ALL">All Bases ({schedules.length})</option>
            {bases.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          {/* Shift Type Filter */}
          <select
            value={shiftTypeFilter}
            onChange={(e) => setShiftTypeFilter(e.target.value)}
            className="py-1.5 px-2 bg-slate-50 border border-slate-300 rounded font-bold text-slate-700 focus:outline-none focus:border-red-600"
          >
            <option value="ALL">All Shift Types</option>
            <option value="Day">Day Shift (06:00 - 18:00)</option>
            <option value="Night">Night Shift (18:00 - 06:00)</option>
            <option value="Standby">Standby Duty</option>
            <option value="Off">Scheduled Off</option>
            <option value="Training">Training</option>
            <option value="Leave">Leave</option>
          </select>
        </div>

        <div className="flex items-center gap-2 text-slate-500 font-mono-data text-[11px]">
          <span>
            Showing <strong>{filteredSchedules.length}</strong> of <strong>{schedules.length}</strong> shift records
          </span>
        </div>
      </div>

      {/* Roster Duty Cards / Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-900 text-white uppercase text-[10px] tracking-wider font-heading">
              <tr>
                <th className="p-3">Shift Date</th>
                <th className="p-3">Medic &amp; Qualification</th>
                <th className="p-3">Base Station</th>
                <th className="p-3">Shift Hours</th>
                <th className="p-3">Vehicle &amp; Partner</th>
                <th className="p-3">Status</th>
                <th className="p-3">Notes</th>
                {isDispatcherOrAdmin && <th className="p-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredSchedules.length === 0 ? (
                <tr>
                  <td colSpan={isDispatcherOrAdmin ? 8 : 7} className="p-8 text-center text-slate-400 italic">
                    No shift schedule records match your search or filter.
                  </td>
                </tr>
              ) : (
                filteredSchedules.map((entry) => {
                  const isToday = entry.date === todayStr;
                  return (
                    <tr
                      key={entry.id}
                      className={`hover:bg-slate-50 transition ${isToday ? 'bg-amber-50/40' : ''}`}
                    >
                      <td className="p-3 whitespace-nowrap">
                        <div className="font-bold text-slate-900 font-mono flex items-center gap-1.5">
                          <span>{entry.date}</span>
                          {isToday && (
                            <span className="px-1.5 py-0.2 bg-amber-400 text-black text-[9px] font-bold rounded uppercase">
                              Today
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{entry.crewName}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-black uppercase ${
                              entry.qualification === 'ALS'
                                ? 'bg-red-600 text-white'
                                : entry.qualification === 'ILS'
                                ? 'bg-blue-600 text-white'
                                : 'bg-emerald-600 text-white'
                            }`}
                          >
                            {entry.qualification}
                          </span>
                        </div>
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{entry.base}</span>
                        </div>
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              entry.shiftType === 'Day'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : entry.shiftType === 'Night'
                                ? 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                                : entry.shiftType === 'Standby'
                                ? 'bg-purple-100 text-purple-900 border border-purple-300'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {entry.shiftType}
                          </span>
                          <span className="font-mono text-slate-600 text-[11px]">
                            {entry.startTime} – {entry.endTime}
                          </span>
                        </div>
                      </td>

                      <td className="p-3">
                        {entry.assignedAmbulance ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 text-white font-mono text-[10px] font-bold">
                              <Truck className="w-3 h-3 text-red-500" />
                              {entry.assignedAmbulance}
                            </span>
                            {entry.partnerCrewName && (
                              <div className="text-[10px] text-slate-500 italic">
                                w/ {entry.partnerCrewName}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">No vehicle assigned</span>
                        )}
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleStatus(entry)}
                          disabled={!isDispatcherOrAdmin}
                          title={isDispatcherOrAdmin ? 'Click to cycle status' : undefined}
                          className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition flex items-center gap-1.5 ${
                            isDispatcherOrAdmin ? 'cursor-pointer hover:opacity-85' : 'cursor-default'
                          } ${
                            entry.status === 'On Duty'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : entry.status === 'Completed'
                              ? 'bg-slate-600 text-white'
                              : entry.status === 'Absent'
                              ? 'bg-red-600 text-white'
                              : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}
                        >
                          {entry.status === 'On Duty' && (
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                          )}
                          <span>{entry.status}</span>
                        </button>
                      </td>

                      <td className="p-3 text-slate-600 text-[11px] max-w-xs truncate">
                        {entry.notes || '—'}
                      </td>

                      {isDispatcherOrAdmin && (
                        <td className="p-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditModal(entry)}
                              className="p-1 text-slate-600 hover:text-black rounded hover:bg-slate-200 cursor-pointer"
                              title="Edit Shift"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteShift(entry.id)}
                              className="p-1 text-red-600 hover:text-red-700 rounded hover:bg-red-50 cursor-pointer"
                              title="Delete Shift"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Shift Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full overflow-hidden border border-slate-300 my-8">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-red-600">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-red-500" />
                <h3 className="font-bold text-sm uppercase font-heading tracking-wide">
                  {editingEntry ? 'Edit Shift Schedule Entry' : 'Schedule Crew Member Shift'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveShift} className="p-5 space-y-4 text-xs">
              {/* Crew Member & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 uppercase mb-1 text-[10px]">
                    Crew Member *
                  </label>
                  <select
                    value={crewMemberId}
                    onChange={(e) => {
                      setCrewMemberId(e.target.value);
                      const member = crewList.find((c) => c.id === e.target.value);
                      if (member) setBase(member.base);
                    }}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded p-2 font-bold focus:outline-none focus:border-red-600"
                  >
                    {crewList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.qualification}) - {c.base}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 uppercase mb-1 text-[10px]">
                    Shift Date *
                  </label>
                  <input
                    type="date"
                    value={shiftDate}
                    onChange={(e) => setShiftDate(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded p-2 font-mono font-bold focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>

              {/* Shift Type & Base */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 uppercase mb-1 text-[10px]">
                    Shift Type *
                  </label>
                  <select
                    value={shiftType}
                    onChange={(e) => handleShiftTypeChange(e.target.value as ShiftDutyType)}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-2 font-bold focus:outline-none focus:border-red-600"
                  >
                    <option value="Day">Day Shift (06:00 – 18:00)</option>
                    <option value="Night">Night Shift (18:00 – 06:00)</option>
                    <option value="Standby">Standby Duty</option>
                    <option value="Off">Scheduled Off / Rest</option>
                    <option value="Training">Training / HPCSA CPD</option>
                    <option value="Leave">Annual / Sick Leave</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 uppercase mb-1 text-[10px]">
                    Station Base *
                  </label>
                  <select
                    value={base}
                    onChange={(e) => setBase(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-2 font-bold focus:outline-none focus:border-red-600"
                  >
                    {bases.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Start & End Times */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 uppercase mb-1 text-[10px]">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded p-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 uppercase mb-1 text-[10px]">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded p-2 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Assigned Vehicle & Partner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 uppercase mb-1 text-[10px]">
                    Assigned Ambulance Unit
                  </label>
                  <select
                    value={assignedAmbulance}
                    onChange={(e) => setAssignedAmbulance(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-2 font-bold"
                  >
                    <option value="">No Vehicle Assigned</option>
                    {ambulances.map((amb) => (
                      <option key={amb.id} value={amb.fleetNo}>
                        {amb.fleetNo} ({amb.registration}) - {amb.base}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 uppercase mb-1 text-[10px]">
                    Partner Crew Member
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Thabo Molefe (ILS)"
                    value={partnerCrewName}
                    onChange={(e) => setPartnerCrewName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-2 font-bold"
                  />
                </div>
              </div>

              {/* Duty Status */}
              <div>
                <label className="block font-bold text-slate-800 uppercase mb-1 text-[10px]">
                  Duty Status *
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['Scheduled', 'On Duty', 'Completed', 'Absent'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setShiftStatus(st)}
                      className={`py-1.5 px-2 rounded text-center font-bold text-[10px] uppercase transition cursor-pointer border ${
                        shiftStatus === st
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Shift Notes */}
              <div>
                <label className="block font-bold text-slate-800 uppercase mb-1 text-[10px]">
                  Operational Notes &amp; Handover Instructions
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Primary ALS cover, vehicle check completed, handover from C-Shift..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-xs"
                />
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded font-bold uppercase tracking-wider transition shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{editingEntry ? 'Update Shift Entry' : 'Save Shift Schedule'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
