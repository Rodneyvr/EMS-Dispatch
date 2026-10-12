import React, { useState, useEffect } from 'react';
import { User, StockRequest } from '../types';
import { Storage, playAlertSound } from '../utils/storage';
import {
  Volume2,
  VolumeX,
  Smartphone,
  AlertCircle,
  LogOut,
  User as UserIcon,
  ShieldAlert,
  Terminal,
} from 'lucide-react';
import { GlobalSearchBar, SearchResultItem } from './GlobalSearchBar';

interface MastheadProps {
  currentUser: User;
  onUserChange: (user: User) => void;
  onLogout?: () => void;
  onOpenMobilePwa: () => void;
  openStockRequestsCount: number;
  onGoToStockTab: () => void;
  onSelectSearchResult?: (result: SearchResultItem) => void;
  onOpenDevReset?: () => void;
  onOpenAiPrompt?: () => void;
}

export const Masthead: React.FC<MastheadProps> = ({
  currentUser,
  onUserChange,
  onLogout,
  onOpenMobilePwa,
  openStockRequestsCount,
  onGoToStockTab,
  onSelectSearchResult,
  onOpenDevReset,
  onOpenAiPrompt,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [bpm] = useState<number>(72);
  const settings = Storage.getSettings();

  useEffect(() => {
    setUsers(Storage.getUsers());

    const updateClock = () => {
      const now = new Date();
      // Africa/Johannesburg SAST format
      const timeStr = now.toLocaleTimeString('en-ZA', {
        timeZone: 'Africa/Johannesburg',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      const dateStr = now.toLocaleDateString('en-ZA', {
        timeZone: 'Africa/Johannesburg',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      setCurrentTime(timeStr);
      setCurrentDate(dateStr);
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRoleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = users.find((u) => u.id === e.target.value);
    if (selected) {
      Storage.setCurrentUser(selected.id);
      onUserChange(selected);
    }
  };

  const testAlertSound = () => {
    if (soundEnabled) {
      playAlertSound('urgent');
    }
  };

  return (
    <header className="bg-slate-900 border-b-2 border-red-700 text-white shadow-xl sticky top-0 z-40 select-none">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Branding & Animated Ambulance & ECG */}
        <div className="flex items-center gap-3 sm:gap-5">
          {/* Emergency Cross / Crest or Uploaded Company Logo */}
          {settings.companyLogoUrl ? (
            <div className="relative flex items-center justify-center h-11 max-w-[120px] bg-black rounded-lg p-1 border border-neutral-700 shadow-md">
              <img
                src={settings.companyLogoUrl}
                alt={settings.companyName || 'ResQ EMS'}
                className="h-full object-contain"
              />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-600 rounded-full animate-ping"></div>
            </div>
          ) : (
            <div className="relative flex items-center justify-center w-11 h-11 bg-red-600 rounded-lg shadow-md border border-red-400">
              <svg viewBox="0 0 24 24" className="w-7 h-7 text-white fill-current">
                <path d="M10 3h4v6h6v4h-6v8h-4v-8H4V9h6V3z" />
              </svg>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-ping"></div>
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white font-heading">
                {settings.appName ? (
                  settings.appName
                ) : (
                  <>
                    RES<span className="text-red-500">Q</span> EMS
                  </>
                )}
              </span>
              <span className="hidden sm:inline-block text-[11px] uppercase tracking-wider bg-red-950/80 text-red-300 font-semibold px-2 py-0.5 rounded border border-red-800">
                South Africa
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              {settings.companyName || 'Dispatch, Trip Log & Mobile Stock Management'}
            </p>
          </div>

          {/* Pure SVG Animated Ambulance with alternating flashing beacons */}
          <div className="hidden lg:flex items-center pl-3 pr-2 border-l border-slate-700/80">
            <div className="relative w-28 h-10 flex items-center">
              <svg viewBox="0 0 140 50" className="w-full h-full">
                {/* Flashing light beacons on roof */}
                <ellipse cx="64" cy="9" rx="7" ry="4" className="beacon-red fill-red-500" />
                <ellipse cx="78" cy="9" rx="7" ry="4" className="beacon-blue fill-blue-500" />
                <rect x="62" y="8" width="4" height="2" fill="#ffffff" />
                <rect x="76" y="8" width="4" height="2" fill="#ffffff" />

                {/* Ambulance Body */}
                <path
                  d="M10 38 L10 18 Q10 14 14 14 L86 14 Q90 14 94 18 L104 22 L120 23 Q126 23 126 30 L126 38 Z"
                  fill="#f8fafc"
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                />
                {/* Windshield & Windows */}
                <polygon points="95,17 103,23 120,24 116,17" fill="#0284c7" fillOpacity="0.85" />
                <rect x="70" y="17" width="18" height="9" rx="1" fill="#0284c7" fillOpacity="0.85" />
                <rect x="36" y="17" width="28" height="9" rx="1" fill="#0284c7" fillOpacity="0.85" />

                {/* Emergency Red & Yellow Battenburg Pattern Side Stripes */}
                <polygon points="12,28 32,28 26,33 12,33" fill="#dc2626" />
                <polygon points="32,28 52,28 46,33 26,33" fill="#facc15" />
                <polygon points="52,28 72,28 66,33 46,33" fill="#dc2626" />
                <polygon points="72,28 92,28 86,33 66,33" fill="#facc15" />
                <polygon points="92,28 112,28 106,33 86,33" fill="#dc2626" />
                <polygon points="112,28 124,28 124,33 106,33" fill="#facc15" />

                {/* Green Star of Life logo */}
                <circle cx="24" cy="22" r="4.5" fill="#16a34a" />
                <path d="M22 22 h4 M24 20 v4" stroke="#ffffff" strokeWidth="1.2" />

                {/* Wheels */}
                <circle cx="34" cy="38" r="7.5" fill="#1e293b" />
                <circle cx="34" cy="38" r="3.5" fill="#94a3b8" />
                <circle cx="106" cy="38" r="7.5" fill="#1e293b" />
                <circle cx="106" cy="38" r="3.5" fill="#94a3b8" />
              </svg>
            </div>
          </div>

          {/* Pure SVG Animated ECG Heart-rate monitor line + BPM readout */}
          <div className="hidden 2xl:flex items-center gap-2 pl-3 border-l border-slate-700/80">
            <div className="w-28 h-7 bg-slate-950/80 rounded border border-slate-800 px-1 py-0.5 flex items-center overflow-hidden">
              <svg viewBox="0 0 120 24" className="w-full h-full">
                <path
                  d="M0 12 L25 12 L30 12 L33 5 L36 19 L39 2 L42 22 L45 12 L50 12 L60 12 L85 12 L90 12 L93 5 L96 19 L99 2 L102 22 L105 12 L120 12"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="ecg-path"
                />
              </svg>
            </div>
            <div className="text-[10px] leading-tight font-mono-data text-emerald-400 font-medium">
              <div>{bpm} BPM</div>
              <div className="text-slate-400 text-[9px]">SINUS</div>
            </div>
          </div>
        </div>

        {/* Center: Global Omnisearch Bar */}
        {onSelectSearchResult && (
          <div className="flex-1 max-w-sm xl:max-w-md mx-2 hidden sm:block">
            <GlobalSearchBar onSelectResult={onSelectSearchResult} />
          </div>
        )}

        {/* Right: Live Clock, Stock Alert Badge, Sound, Role Switcher */}
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          {/* SAST Live Clock */}
          <div className="text-right hidden sm:block bg-slate-950/60 px-3 py-1 rounded border border-slate-800 font-mono-data">
            <div className="text-xs font-bold text-slate-100 tracking-wider">{currentTime || '--:--:--'}</div>
            <div className="text-[10px] text-slate-400">{currentDate || 'DD/MM/YYYY'} SAST</div>
          </div>

          {/* Open Stock Requests Badge & Audio */}
          {openStockRequestsCount > 0 && (
            <button
              onClick={onGoToStockTab}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/50 rounded hover:bg-amber-500/30 transition text-xs font-medium animate-pulse cursor-pointer"
              title="Click to view open stock requests"
            >
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>{openStockRequestsCount} Stock Req</span>
            </button>
          )}

          {/* Sound Mute Toggle */}
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) testAlertSound();
            }}
            className="p-1.5 rounded bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
            title={soundEnabled ? 'Mute emergency audio alerts' : 'Enable emergency audio alerts'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>

          {/* Mobile Stock PWA Shortcut Button */}
          <button
            onClick={onOpenMobilePwa}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white font-medium text-xs shadow-sm transition active:scale-95 cursor-pointer"
            title="Open Mobile-First Stock Request App for Paramedics"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Mobile</span> Stock
          </button>

          {/* User Profile Badge & Role Switcher */}
          <div className="flex items-center gap-2 bg-slate-800/90 rounded-md p-1 pl-2 border border-slate-700">
            <div className="w-6 h-6 rounded-full bg-red-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
              {currentUser.fullName.split(' ').map((n) => n[0]).join('')}
            </div>

            <div className="hidden lg:flex flex-col text-left leading-tight pr-1">
              <span className="text-xs font-bold text-slate-100 max-w-[110px] truncate" title={currentUser.fullName}>
                {currentUser.fullName}
              </span>
              <span className="text-[10px] font-mono text-red-400 font-semibold">
                {currentUser.role} · {currentUser.base}
              </span>
            </div>

            <select
              value={currentUser.id}
              onChange={handleRoleSelect}
              className="bg-slate-900 text-xs font-semibold text-white px-2 py-1 rounded border border-slate-600 focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer"
              aria-label="Switch active test user or role"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.role.toUpperCase()} — {u.fullName.split(' ')[0]}
                </option>
              ))}
            </select>
          </div>

          {/* AI Master Blueprint / Prompt Button */}
          {onOpenAiPrompt && (
            <button
              onClick={onOpenAiPrompt}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold transition shadow-sm cursor-pointer"
              title="View & copy complete AI master prompt to build this system"
            >
              <Terminal className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden xl:inline">AI Prompt</span>
            </button>
          )}

          {/* DEVELOPER RESET BUTTON (Strictly visible only when dev is logged in) */}
          {Storage.isDevUser(currentUser) && onOpenDevReset && (
            <button
              onClick={onOpenDevReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-purple-900/90 hover:bg-purple-700 text-white border border-purple-400/80 text-xs font-black shadow-lg transition active:scale-95 cursor-pointer ring-2 ring-purple-500/30"
              title="DEVELOPER ONLY: Factory wipe all operational data or re-seed database"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>DEV RESET</span>
            </button>
          )}

          {/* Secure Log Out Button */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-red-950/80 hover:bg-red-600 text-red-200 hover:text-white border border-red-700/80 hover:border-red-500 text-xs font-bold transition shadow-sm active:scale-95 cursor-pointer"
              title="Securely log out of your EMS profile"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Log Out</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
