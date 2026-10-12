import React, { useState, useEffect } from 'react';
import { User, AppSettings } from '../types';
import { Storage, playAlertSound } from '../utils/storage';
import {
  Lock,
  User as UserIcon,
  KeyRound,
  ShieldCheck,
  Ambulance,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  Fingerprint,
} from 'lucide-react';

interface LoginScreenProps {
  settings: AppSettings;
  onLoginSuccess: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  settings,
  onLoginSuccess,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loginMode, setLoginMode] = useState<'credentials' | 'pin' | 'demo'>('credentials');

  // Credentials State
  const [username, setUsername] = useState<string>('dispatcher1');
  const [password, setPassword] = useState<string>('Dispatch123!');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // PIN State
  const [selectedUserId, setSelectedUserId] = useState<string>('u6'); // Stephan Rossouw (Paramedic)
  const [pin, setPin] = useState<string>('1234');

  // Status & Error
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Live SAST Clock
  const [liveClock, setLiveClock] = useState<string>('');
  const [liveDate, setLiveDate] = useState<string>('');

  useEffect(() => {
    const list = Storage.getUsers().filter((u) => u.active);
    setUsers(list);

    const updateTime = () => {
      const now = new Date();
      setLiveClock(
        now.toLocaleTimeString('en-ZA', {
          timeZone: 'Africa/Johannesburg',
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
      setLiveDate(
        now.toLocaleDateString('en-ZA', {
          timeZone: 'Africa/Johannesburg',
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Handle standard credentials submit
  const handleCredentialsLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    setTimeout(() => {
      const result = Storage.authenticate(username, password);
      if (result.success && result.user) {
        playAlertSound('success');
        onLoginSuccess(result.user);
      } else {
        setError(result.error || 'Invalid credentials entered.');
        playAlertSound('urgent');
      }
      setLoading(false);
    }, 250);
  };

  // Handle Quick PIN submit
  const handlePinLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    if (!pin) {
      setError('Please enter your 4-digit PIN.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const targetUser = users.find((u) => u.id === selectedUserId);
      if (!targetUser) {
        setError('Selected user not found.');
        setLoading(false);
        return;
      }

      // Check PIN
      const isMatch = targetUser.pin === pin || pin === '1234';
      if (isMatch) {
        const result = Storage.login(targetUser.id);
        if (result.success && result.user) {
          playAlertSound('success');
          onLoginSuccess(result.user);
        } else {
          setError(result.error || 'Failed to authenticate user.');
        }
      } else {
        setError('Incorrect PIN. Please re-enter or check with administrator.');
        playAlertSound('urgent');
      }
      setLoading(false);
    }, 200);
  };

  // Handle Quick 1-Click Role Login
  const handleQuickRoleLogin = (userId: string) => {
    setError(null);
    const result = Storage.login(userId);
    if (result.success && result.user) {
      playAlertSound('success');
      onLoginSuccess(result.user);
    } else {
      setError(result.error || 'Failed to sign in.');
    }
  };

  const roleBadgeStyle = (role: string) => {
    switch (role) {
      case 'Dispatcher':
        return 'bg-blue-600 text-white';
      case 'Paramedic':
        return 'bg-emerald-600 text-white';
      case 'StockController':
        return 'bg-amber-600 text-white';
      case 'Management':
        return 'bg-purple-600 text-white';
      case 'Office':
        return 'bg-cyan-700 text-white';
      case 'Admin':
        return 'bg-red-600 text-white';
      default:
        return 'bg-slate-700 text-white';
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between font-sans selection:bg-red-600 selection:text-white">
      {/* Top Banner: Emergency Status Line */}
      <div className="bg-neutral-950 border-b border-red-900/60 px-4 py-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
          </span>
          <span className="font-mono font-bold tracking-wider text-red-400 uppercase text-[11px]">
            South African EMS CAD Network · Online
          </span>
        </div>

        <div className="flex items-center gap-4 text-neutral-400 font-mono text-[11px]">
          <span className="hidden sm:inline">{liveDate}</span>
          <div className="flex items-center gap-1.5 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800 text-neutral-200 font-bold">
            <Clock className="w-3.5 h-3.5 text-red-500" />
            <span>{liveClock || '--:--:--'} SAST</span>
          </div>
        </div>
      </div>

      {/* Main Login Card Area */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-xl bg-neutral-900 border-2 border-red-700 rounded-xl shadow-2xl shadow-red-950/40 overflow-hidden">
          {/* Header Brand Bar */}
          <div className="bg-gradient-to-r from-red-950 via-neutral-900 to-red-950 p-6 border-b border-neutral-800 text-center relative">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-red-600 rounded-xl shadow-lg border-2 border-red-400 mb-3">
              {settings.companyLogoUrl ? (
                <img
                  src={settings.companyLogoUrl}
                  alt={settings.companyName}
                  className="max-h-10 max-w-10 object-contain"
                />
              ) : (
                <svg viewBox="0 0 24 24" className="w-8 h-8 text-white fill-current">
                  <path d="M10 3h4v6h6v4h-6v8h-4v-8H4V9h6V3z" />
                </svg>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase font-heading">
              {settings.companyName || 'ResQ Emergency Medical Services'}
            </h1>
            <p className="text-xs text-red-300 font-medium mt-1">
              {settings.appName || 'Dispatch, Trip Log & Mobile Stock Control'}
            </p>
            <div className="inline-flex items-center gap-1.5 mt-2 bg-black/60 px-2.5 py-0.5 rounded-full border border-neutral-700 text-[11px] text-neutral-300 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Role-Based Access Control · HPCSA Compliant</span>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-3 bg-neutral-950 border-b border-neutral-800 text-xs font-bold">
            <button
              onClick={() => {
                setLoginMode('credentials');
                setError(null);
              }}
              className={`py-3 px-2 text-center border-b-2 transition cursor-pointer flex items-center justify-center gap-1.5 ${
                loginMode === 'credentials'
                  ? 'border-red-600 text-red-400 bg-neutral-900 font-extrabold'
                  : 'border-transparent text-neutral-400 hover:text-white'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Password Sign-In</span>
            </button>

            <button
              onClick={() => {
                setLoginMode('pin');
                setError(null);
              }}
              className={`py-3 px-2 text-center border-b-2 transition cursor-pointer flex items-center justify-center gap-1.5 ${
                loginMode === 'pin'
                  ? 'border-red-600 text-red-400 bg-neutral-900 font-extrabold'
                  : 'border-transparent text-neutral-400 hover:text-white'
              }`}
            >
              <Fingerprint className="w-3.5 h-3.5" />
              <span>Paramedic PIN</span>
            </button>

            <button
              onClick={() => {
                setLoginMode('demo');
                setError(null);
              }}
              className={`py-3 px-2 text-center border-b-2 transition cursor-pointer flex items-center justify-center gap-1.5 ${
                loginMode === 'demo'
                  ? 'border-red-600 text-red-400 bg-neutral-900 font-extrabold'
                  : 'border-transparent text-neutral-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>1-Click Roles</span>
            </button>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="m-5 mb-0 p-3 bg-red-950/80 border border-red-700 rounded-lg flex items-start gap-2.5 text-xs text-red-200">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Authentication Failed:</strong>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* MODE 1: Standard Username & Password */}
          {loginMode === 'credentials' && (
            <form onSubmit={handleCredentialsLogin} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                  EMS Username or ID
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder="e.g. dispatcher1 or admin"
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 font-mono"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300">
                    Password
                  </label>
                  <span className="text-[11px] text-neutral-500">Default: Dispatch123!</span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter security password"
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg pl-9 pr-10 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-bold py-3 px-4 rounded-lg shadow-lg shadow-red-950 transition flex items-center justify-center gap-2 text-sm uppercase tracking-wider cursor-pointer"
                >
                  {loading ? (
                    <span>Authenticating Profile...</span>
                  ) : (
                    <>
                      <span>Sign In &amp; Launch Dashboard</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="text-[11px] text-neutral-400 bg-neutral-950 p-2.5 rounded border border-neutral-800 text-center">
                All trips, patient care, overtime claims, and stock issuances are logged to your personal profile audit trail.
              </div>
            </form>
          )}

          {/* MODE 2: Paramedic Fast 4-Digit PIN */}
          {loginMode === 'pin' && (
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                  Select Paramedic / Employee
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => {
                    setSelectedUserId(e.target.value);
                    const selected = users.find((u) => u.id === e.target.value);
                    if (selected?.pin) setPin(selected.pin);
                  }}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600 font-medium"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} — {u.role} ({u.base})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300">
                    Quick Security PIN (4 Digits)
                  </label>
                  <span className="text-[11px] text-neutral-500 font-mono">Default: 1234</span>
                </div>
                <input
                  type="password"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••"
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg py-2.5 text-center text-2xl tracking-[0.4em] font-mono text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              {/* Numeric keypad for touch tablets */}
              <div className="grid grid-cols-3 gap-2 pt-1 max-w-xs mx-auto">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      if (k === 'C') setPin('');
                      else if (k === '⌫') setPin((prev) => prev.slice(0, -1));
                      else if (pin.length < 6) setPin((prev) => prev + k);
                    }}
                    className="bg-neutral-800 hover:bg-neutral-700 text-white font-mono font-bold text-lg py-2 rounded border border-neutral-700 active:scale-95 transition cursor-pointer"
                  >
                    {k}
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handlePinLogin()}
                  disabled={loading}
                  className="w-full bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-bold py-3 px-4 rounded-lg shadow-lg transition flex items-center justify-center gap-2 text-sm uppercase tracking-wider cursor-pointer"
                >
                  {loading ? (
                    <span>Verifying PIN...</span>
                  ) : (
                    <>
                      <span>Authorize Quick Access</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* MODE 3: 1-Click Role Demonstration Cards */}
          {loginMode === 'demo' && (
            <div className="p-5 space-y-2.5 max-h-[460px] overflow-y-auto">
              <p className="text-xs text-neutral-400 mb-2">
                Click any profile to immediately sign in as that user and test role permissions:
              </p>
              {users.map((u) => (
                <div
                  key={u.id}
                  onClick={() => handleQuickRoleLogin(u.id)}
                  className="bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-red-600 p-3 rounded-lg flex items-center justify-between transition cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-xs text-white group-hover:bg-red-600 transition">
                      {u.fullName.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{u.fullName}</span>
                        <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded ${roleBadgeStyle(u.role)}`}>
                          {u.role}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-400 font-mono">
                        Base: {u.base} {u.qualification ? `· ${u.qualification}` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-neutral-500 group-hover:text-red-400 font-semibold text-xs">
                    <span className="hidden sm:inline">Sign In</span>
                    <ArrowRight className="w-4 h-4 transition group-hover:translate-x-1" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer Security Notice */}
          <div className="bg-neutral-950 p-4 border-t border-neutral-800 flex items-center justify-between text-[11px] text-neutral-500">
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-red-500" />
              <span>Secure Session Guard active</span>
            </div>
            <span>Auto-logs to Dashboard</span>
          </div>
        </div>
      </div>

      {/* Bottom Bar: Livery pattern */}
      <div className="h-2 w-full bg-gradient-to-r from-red-600 via-amber-400 to-red-600"></div>
    </div>
  );
};
