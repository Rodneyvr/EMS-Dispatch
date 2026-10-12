import React, { useState } from 'react';
import { UserRole } from '../types';
import { IhtScheduleView } from './IhtScheduleView';
import { ShiftScheduleView } from './ShiftScheduleView';
import { Storage } from '../utils/storage';
import { CalendarCheck, Users, Calendar, Clock, Ambulance } from 'lucide-react';

interface SchedulingHubProps {
  userRole: UserRole;
  currentUsername: string;
  onRefresh: () => void;
  onNavigateToTripLog?: () => void;
}

export const SchedulingHub: React.FC<SchedulingHubProps> = ({
  userRole,
  currentUsername,
  onRefresh,
  onNavigateToTripLog,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'iht_bookings' | 'crew_shifts'>('iht_bookings');

  const preBookedCount = Storage.getPreBookedTrips().filter(
    (b) => b.status === 'Scheduled' || b.status === 'Confirmed'
  ).length;

  const todayStr = new Date().toISOString().slice(0, 10);
  const activeShiftsCount = Storage.getShiftSchedules().filter(
    (s) => s.date === todayStr && s.status === 'On Duty'
  ).length;

  return (
    <div className="space-y-4">
      {/* Scheduling Hub Mode Switcher */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shadow-sm">
        <div className="flex items-center gap-1.5 p-1 bg-slate-950/60 rounded-md border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveSubTab('iht_bookings')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-md font-bold text-xs uppercase tracking-wide transition cursor-pointer ${
              activeSubTab === 'iht_bookings'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Patient Upfront Bookings &amp; IHT</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                activeSubTab === 'iht_bookings' ? 'bg-black/40 text-red-100' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {preBookedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('crew_shifts')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-md font-bold text-xs uppercase tracking-wide transition cursor-pointer ${
              activeSubTab === 'crew_shifts'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Crew &amp; Fleet Shift Roster</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                activeSubTab === 'crew_shifts' ? 'bg-black/40 text-red-100' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {activeShiftsCount} On Duty
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 px-2 text-[11px] text-slate-400 font-mono-data hidden sm:flex">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>SAST Live Scheduling Hub · 24/7 Operations</span>
        </div>
      </div>

      {/* Active Sub-Tab View */}
      {activeSubTab === 'iht_bookings' ? (
        <IhtScheduleView
          userRole={userRole}
          currentUsername={currentUsername}
          onRefresh={onRefresh}
          onNavigateToTripLog={onNavigateToTripLog}
        />
      ) : (
        <ShiftScheduleView
          userRole={userRole}
          currentUsername={currentUsername}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
};
