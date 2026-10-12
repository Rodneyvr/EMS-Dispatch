import React, { useState } from 'react';
import { User } from '../types';
import { Storage, playAlertSound } from '../utils/storage';
import {
  AlertOctagon,
  Trash2,
  RotateCcw,
  ShieldAlert,
  X,
  CheckCircle2,
  Lock,
  Flame,
  Info,
} from 'lucide-react';

interface DevResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onResetComplete: () => void;
}

export const DevResetModal: React.FC<DevResetModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onResetComplete,
}) => {
  const [resetMode, setResetMode] = useState<'wipe_all' | 'reseed'>('wipe_all');
  const [confirmText, setConfirmText] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const isDev = Storage.isDevUser(currentUser);

  if (!isDev) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-red-600 rounded-xl max-w-md w-full p-6 text-center text-white space-y-4 shadow-2xl">
          <div className="w-14 h-14 mx-auto rounded-full bg-red-600/20 border border-red-500 flex items-center justify-center text-red-500">
            <Lock className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold">Access Denied: Developer Clearance Required</h3>
          <p className="text-xs text-slate-300">
            The System Data Reset tool is strictly restricted to accounts with Developer role or Dev privileges ({currentUser.fullName} is currently logged in as {currentUser.role}).
          </p>
          <div className="p-3 bg-slate-950 rounded border border-slate-800 text-xs text-slate-400">
            To use this reset feature, log in with the Developer profile (<span className="text-amber-400 font-mono">dev</span> / PIN: <span className="text-amber-400 font-mono">9999</span>).
          </div>
          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded text-xs transition cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  const expectedConfirmWord = resetMode === 'wipe_all' ? 'WIPE ALL' : 'RESEED';
  const isConfirmValid = confirmText.trim().toUpperCase() === expectedConfirmWord;

  const handleExecuteReset = () => {
    if (!isConfirmValid) return;
    setIsProcessing(true);
    setFeedback(null);

    setTimeout(() => {
      const result = Storage.resetSystemData(resetMode, currentUser);
      setIsProcessing(false);

      if (result.success) {
        playAlertSound('success');
        setFeedback({ type: 'success', message: result.message });
        setTimeout(() => {
          onResetComplete();
          onClose();
        }, 1400);
      } else {
        playAlertSound('urgent');
        setFeedback({ type: 'error', message: result.message });
      }
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-red-600/80 rounded-xl max-w-lg w-full text-slate-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-950 to-slate-950 p-4 border-b border-red-800/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center text-white shadow-md">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white tracking-wide font-heading">
                  Developer System Reset Console
                </h3>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-purple-600 text-white uppercase tracking-wider">
                  DEV ONLY
                </span>
              </div>
              <p className="text-xs text-red-200">
                Authenticated Operator: <strong className="text-white">{currentUser.fullName}</strong> ({currentUser.role})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {feedback && (
            <div
              className={`p-3 rounded-lg border flex items-start gap-2.5 ${
                feedback.type === 'success'
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
                  : 'bg-red-950/80 border-red-500 text-red-200'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertOctagon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              )}
              <span className="font-semibold">{feedback.message}</span>
            </div>
          )}

          {/* Mode Selector */}
          <div>
            <label className="block font-bold text-slate-300 uppercase tracking-wider mb-2 text-[11px]">
              Select Reset Operation:
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setResetMode('wipe_all');
                  setConfirmText('');
                }}
                className={`p-3 rounded-lg border text-left transition cursor-pointer flex flex-col gap-1 ${
                  resetMode === 'wipe_all'
                    ? 'bg-red-950/60 border-red-500 ring-2 ring-red-500/30 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 text-red-400 font-bold text-sm">
                  <Flame className="w-4 h-4" />
                  <span>Factory Clean Slate</span>
                </div>
                <span className="text-[11px] leading-snug">
                  Wipe all operational data (0 records). Leaves system clean for live entries.
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setResetMode('reseed');
                  setConfirmText('');
                }}
                className={`p-3 rounded-lg border text-left transition cursor-pointer flex flex-col gap-1 ${
                  resetMode === 'reseed'
                    ? 'bg-amber-950/60 border-amber-500 ring-2 ring-amber-500/30 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 text-amber-400 font-bold text-sm">
                  <RotateCcw className="w-4 h-4" />
                  <span>Re-seed Pristine Data</span>
                </div>
                <span className="text-[11px] leading-snug">
                  Restore default Brackenfell/Paarl trips, IHT schedules, and stock items.
                </span>
              </button>
            </div>
          </div>

          {/* Operation Explanations */}
          {resetMode === 'wipe_all' ? (
            <div className="p-3 bg-red-950/30 border border-red-900/60 rounded-lg space-y-1.5 text-red-200">
              <div className="flex items-center gap-1.5 font-bold text-red-400">
                <Trash2 className="w-4 h-4" />
                <span>What will be wiped to 0 records:</span>
              </div>
              <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                <li>All active and historical CAD Trips &amp; ePRFs</li>
                <li>All scheduled upfront patient bookings &amp; IHT transfers</li>
                <li>All overtime claims &amp; approval histories</li>
                <li>All active vehicle stock requests &amp; pharmacy drafts</li>
              </ul>
              <p className="text-[10px] text-slate-400 pt-1">
                Note: Core settings (Brackenfell &amp; Paarl hospital lists, ambulances MR001–MR005, X1 colour codes, user accounts) remain safely intact.
              </p>
            </div>
          ) : (
            <div className="p-3 bg-amber-950/30 border border-amber-900/60 rounded-lg space-y-1.5 text-amber-200">
              <div className="flex items-center gap-1.5 font-bold text-amber-400">
                <RotateCcw className="w-4 h-4" />
                <span>What will be restored:</span>
              </div>
              <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                <li>Initial test trips with Brackenfell &amp; Paarl hospitals (EPRF4211–4215)</li>
                <li>Pre-booked IHT transfers for MC Cape Gate, Tygerberg, MC Paarl, etc.</li>
                <li>South African Ambulance stock catalogue (Appendix A items)</li>
                <li>Standard employee crew profiles and access PINs</li>
              </ul>
            </div>
          )}

          {/* Safety Confirmation Input */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                Type <span className="text-red-400 font-mono font-black">"{expectedConfirmWord}"</span> to confirm:
              </label>
              {isConfirmValid && (
                <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirmed</span>
                </span>
              )}
            </div>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={`Type ${expectedConfirmWord} here`}
              className="w-full bg-slate-950 border border-slate-700 focus:border-red-500 rounded-lg px-3 py-2 text-sm font-mono font-bold text-white uppercase tracking-wider focus:outline-none"
            />
          </div>

          <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex items-center gap-2 text-[11px] text-slate-400">
            <Info className="w-4 h-4 text-purple-400 shrink-0" />
            <span>This action will be stamped permanently into the POPIA audit log under your Developer credentials.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-bold transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExecuteReset}
            disabled={!isConfirmValid || isProcessing}
            className={`flex items-center gap-2 px-5 py-2.5 rounded font-bold uppercase tracking-wider transition cursor-pointer shadow-lg ${
              isConfirmValid && !isProcessing
                ? resetMode === 'wipe_all'
                  ? 'bg-red-600 hover:bg-red-700 text-white active:scale-95'
                  : 'bg-amber-600 hover:bg-amber-700 text-white active:scale-95'
                : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'
            }`}
          >
            {isProcessing ? (
              <span>Resetting Database...</span>
            ) : resetMode === 'wipe_all' ? (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Execute Complete Wipe</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4" />
                <span>Execute Factory Re-seed</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
