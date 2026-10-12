import React, { useMemo } from 'react';
import { Trip, OvertimeRecord, StockRequest, AppSettings, PreBookedTrip } from '../types';
import { Storage } from '../utils/storage';
import { BILLING_COLORS } from './TripForm';
import { getTodayDateYYYYMMDD, formatMinutesToHMM } from '../utils/timeCalculations';
import {
  Activity,
  Ambulance,
  Building,
  Clock,
  Package,
  FileCheck,
  TrendingUp,
  AlertCircle,
  CalendarCheck,
} from 'lucide-react';

interface DashboardViewProps {
  trips: Trip[];
  overtime: OvertimeRecord[];
  stockRequests: StockRequest[];
  settings: AppSettings;
  preBookedTrips?: PreBookedTrip[];
  onNavigateTab: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  trips,
  overtime,
  stockRequests,
  settings,
  preBookedTrips,
  onNavigateTab,
}) => {
  const today = getTodayDateYYYYMMDD();
  const allBookings = useMemo(
    () => preBookedTrips || Storage.getPreBookedTrips(),
    [preBookedTrips]
  );
  const todayBookings = useMemo(
    () => allBookings.filter((b) => b.scheduledDate === today),
    [allBookings, today]
  );

  // Filter today's trips
  const todayTrips = useMemo(() => {
    return trips.filter((t) => !t.isDeleted && t.date === today);
  }, [trips, today]);

  // Overall active trips (all dates)
  const activeTrips = useMemo(() => {
    return trips.filter((t) => !t.isDeleted);
  }, [trips]);

  // Averages for today
  const avgResponseTime = useMemo(() => {
    if (todayTrips.length === 0) return 0;
    const sum = todayTrips.reduce((acc, t) => acc + t.calculatedTimes.responseMinutes, 0);
    return Math.round(sum / todayTrips.length);
  }, [todayTrips]);

  const avgTurnaroundTime = useMemo(() => {
    if (todayTrips.length === 0) return 0;
    const sum = todayTrips.reduce((acc, t) => acc + t.calculatedTimes.turnaroundMinutes, 0);
    return Math.round(sum / todayTrips.length);
  }, [todayTrips]);

  // Breakdown by Ambulance
  const tripsByAmbulance = useMemo(() => {
    const map: Record<string, number> = {};
    settings.ambulances.forEach((a) => (map[a.fleetNo] = 0));
    todayTrips.forEach((t) => {
      map[t.ambulance] = (map[t.ambulance] || 0) + 1;
    });
    return map;
  }, [todayTrips, settings.ambulances]);

  // Breakdown by Base
  const tripsByBase = useMemo(() => {
    const map: Record<string, number> = {};
    settings.bases.forEach((b) => (map[b] = 0));
    todayTrips.forEach((t) => {
      map[t.base] = (map[t.base] || 0) + 1;
    });
    return map;
  }, [todayTrips, settings.bases]);

  // Breakdown by Call Type
  const tripsByCallType = useMemo(() => {
    const map: Record<string, number> = { PRIM: 0, IHT: 0, IFT: 0, DISCHARGE: 0 };
    todayTrips.forEach((t) => {
      map[t.callType] = (map[t.callType] || 0) + 1;
    });
    return map;
  }, [todayTrips]);

  // Breakdown by Level of Care
  const tripsByLevel = useMemo(() => {
    const map: Record<string, number> = { BLS: 0, ILS: 0, ALS: 0 };
    todayTrips.forEach((t) => {
      map[t.levelOfCare] = (map[t.levelOfCare] || 0) + 1;
    });
    return map;
  }, [todayTrips]);

  // Breakdown by Billing Type
  const tripsByBilling = useMemo(() => {
    const map: Record<string, number> = {
      'MED AID': 0,
      PRIVATE: 0,
      WCA: 0,
      'RAF DOA': 0,
      INDIGENT: 0,
      NSR: 0,
      RHT: 0,
    };
    todayTrips.forEach((t) => {
      map[t.billingType] = (map[t.billingType] || 0) + 1;
    });
    return map;
  }, [todayTrips]);

  // Pending overtime & open stock
  const openStockCount = stockRequests.filter((r) => r.status === 'Submitted').length;
  const pendingOtCount = overtime.filter((o) => o.status === 'Pending').length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Live Status */}
      <div className="bg-slate-900 rounded-lg p-5 text-white shadow-md border-b-2 border-red-700 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="text-xs uppercase tracking-wider text-emerald-400 font-bold font-mono">
              Live Dispatch Operations Hub
            </span>
          </div>
          <h2 className="text-2xl font-bold font-heading tracking-wide uppercase mt-1">
            Emergency Command &amp; Operations Dashboard
          </h2>
          <p className="text-xs text-slate-300">
            Real-time telemetry for Brackenfell Base, Cape Gate Station, Bellville and Paarl dispatch stations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateTab('iht_schedule')}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded font-bold text-xs uppercase tracking-wider border border-slate-700 shadow-sm transition cursor-pointer"
          >
            <CalendarCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Pre-Book IHT</span>
          </button>
          <button
            onClick={() => onNavigateTab('new_trip')}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-xs uppercase tracking-wider shadow-md transition cursor-pointer"
          >
            + Dispatch Call
          </button>
        </div>
      </div>

      {/* Main KPI Counter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {/* Today's Trips */}
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">Today's Trips</span>
          <div className="text-2xl font-black font-mono-data text-red-600 mt-0.5">
            {todayTrips.length}
          </div>
          <span className="text-[10px] text-slate-400">({activeTrips.length} total logged)</span>
        </div>

        {/* Scheduled IHT / Upfront Transfers */}
        <div
          onClick={() => onNavigateTab('iht_schedule')}
          className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs hover:border-blue-500 cursor-pointer transition"
        >
          <span className="text-[10px] font-bold text-slate-500 uppercase block">Scheduled IHT</span>
          <div className="text-2xl font-black font-mono-data text-blue-600 mt-0.5">
            {todayBookings.length}
          </div>
          <span className="text-[10px] text-slate-400">({allBookings.length} bookings)</span>
        </div>

        {/* Avg Response Time */}
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">Avg Response</span>
          <div className="text-2xl font-black font-mono-data text-blue-600 mt-0.5">
            {avgResponseTime} <span className="text-xs font-normal text-slate-500">min</span>
          </div>
          <span className="text-[10px] text-slate-400">Dispatch → Mobile</span>
        </div>

        {/* Avg Turnaround Time */}
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">Avg Turnaround</span>
          <div className="text-2xl font-black font-mono-data text-amber-600 mt-0.5">
            {avgTurnaroundTime} <span className="text-xs font-normal text-slate-500">min</span>
          </div>
          <span className="text-[10px] text-slate-400">Hospital → Available</span>
        </div>

        {/* Active Ambulances */}
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">Active Fleet</span>
          <div className="text-2xl font-black font-mono-data text-slate-900 mt-0.5">
            {settings.ambulances.filter((a) => a.active).length} / {settings.ambulances.length}
          </div>
          <span className="text-[10px] text-slate-400">Vehicles in service</span>
        </div>

        {/* Open Stock Requests */}
        <div
          onClick={() => onNavigateTab('stock_requests')}
          className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs hover:border-amber-400 cursor-pointer transition"
        >
          <span className="text-[10px] font-bold text-slate-500 uppercase block">Stock Orders</span>
          <div className="text-2xl font-black font-mono-data text-amber-500 mt-0.5">
            {openStockCount}
          </div>
          <span className="text-[10px] text-slate-400">Pending restock</span>
        </div>

        {/* Pending Overtime */}
        <div
          onClick={() => onNavigateTab('overtime')}
          className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs hover:border-red-400 cursor-pointer transition"
        >
          <span className="text-[10px] font-bold text-slate-500 uppercase block">Pending OT</span>
          <div className="text-2xl font-black font-mono-data text-purple-600 mt-0.5">
            {pendingOtCount}
          </div>
          <span className="text-[10px] text-slate-400">Requires review</span>
        </div>
      </div>

      {/* Grid: Breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* By Ambulance */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-heading mb-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Ambulance className="w-4 h-4 text-red-600" />
              <span>Calls per Vehicle (Today)</span>
            </span>
            <span className="text-[10px] font-mono text-slate-500 font-normal">Fleet Units</span>
          </h3>
          <div className="space-y-2.5">
            {Object.entries(tripsByAmbulance).map(([fleet, count]) => {
              const max = Math.max(...Object.values(tripsByAmbulance), 1);
              const pct = (count / max) * 100;
              return (
                <div key={fleet} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono font-bold text-slate-800">
                    <span>{fleet}</span>
                    <span>{count} calls</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-red-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* By Base */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-heading mb-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Building className="w-4 h-4 text-blue-600" />
              <span>Calls by Station Base</span>
            </span>
            <span className="text-[10px] font-mono text-slate-500 font-normal">Locations</span>
          </h3>
          <div className="space-y-2.5">
            {Object.entries(tripsByBase).map(([baseName, count]) => {
              const max = Math.max(...Object.values(tripsByBase), 1);
              const pct = (count / max) * 100;
              return (
                <div key={baseName} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-slate-800">
                    <span>{baseName}</span>
                    <span className="font-mono font-bold">{count} calls</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* By Call Type */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-heading mb-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span>Call Types &amp; Nature</span>
            </span>
            <span className="text-[10px] font-mono text-slate-500 font-normal">Classification</span>
          </h3>
          <div className="grid grid-cols-2 gap-2 text-center">
            {Object.entries(tripsByCallType).map(([ctype, count]) => (
              <div key={ctype} className="bg-slate-50 p-2.5 rounded border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">
                  {ctype === 'PRIM' ? 'Primary / Scene' : ctype === 'IHT' ? 'Inter-Hospital' : ctype}
                </span>
                <span className="text-xl font-black font-mono-data text-slate-900 mt-1 block">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row: Level of Care & Billing Type Badges */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Level of Care */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-heading mb-3">
            Level of Clinical Care (Today)
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center">
              <span className="text-xs font-bold text-slate-600 block">BLS (Basic)</span>
              <span className="text-2xl font-black font-mono-data text-slate-800 mt-1 block">
                {tripsByLevel.BLS}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-center">
              <span className="text-xs font-bold text-blue-700 block">ILS (Interm)</span>
              <span className="text-2xl font-black font-mono-data text-blue-800 mt-1 block">
                {tripsByLevel.ILS}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-center">
              <span className="text-xs font-bold text-red-700 block">ALS (Advanced)</span>
              <span className="text-2xl font-black font-mono-data text-red-800 mt-1 block">
                {tripsByLevel.ALS}
              </span>
            </div>
          </div>
        </div>

        {/* Billing Type Breakdown with Official Colors */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-heading mb-3">
            Today's Billing Types Breakdown
          </h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(tripsByBilling).map(([btype, count]) => {
              const style = BILLING_COLORS[btype as keyof typeof BILLING_COLORS] || {
                bg: 'bg-slate-700',
                text: 'text-white',
              };
              return (
                <div
                  key={btype}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded shadow-xs ${style.bg} ${style.text}`}
                >
                  <span className="text-[11px] font-black uppercase tracking-wider">{btype}</span>
                  <span className="px-1.5 py-0.2 bg-black/25 rounded font-mono font-bold text-xs">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Trips Stream */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-3.5 bg-slate-900 text-white flex justify-between items-center border-b border-red-700">
          <h3 className="font-bold text-xs uppercase tracking-wide font-heading">
            Active Call Log Stream (Latest 5 Dispatched Calls)
          </h3>
          <button
            onClick={() => onNavigateTab('trip_log')}
            className="text-xs text-red-400 hover:underline font-bold cursor-pointer"
          >
            Open Full Trip Log →
          </button>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {activeTrips.slice(0, 5).map((t) => (
            <div key={t.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                  {t.eprfFormatted}
                </span>
                <div>
                  <div className="font-bold text-slate-900">
                    {t.ambulance} · {t.hospital}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {t.pickupLocation} ({t.priority} Priority)
                  </div>
                </div>
              </div>

              <div className="text-right font-mono-data">
                <span className="text-slate-800 font-bold">{t.times.timeReceived}</span>
                <div className="text-[10px] text-slate-500">{t.outcome}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
