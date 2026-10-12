import React, { useState, useEffect, useRef } from 'react';
import {
  Trip,
  AmbulanceUnit,
  CrewMember,
  LevelOfCare,
  BillingType,
  CallType,
  PriorityColor,
  OutcomeType,
  ShiftType,
} from '../types';
import {
  calculateMinutesBetween,
  getShiftFromTime,
  getCurrentTimeHHMM,
  getTodayDateYYYYMMDD,
  formatMinutesToHMM,
} from '../utils/timeCalculations';
import { Storage } from '../utils/storage';
import { DEFAULT_COLOUR_CODES, DEFAULT_HOSPITALS } from '../data/seedData';
import { Clock, CheckCircle2, AlertTriangle, RotateCcw, Save, Plus } from 'lucide-react';

interface TripFormProps {
  initialTrip?: Trip | null;
  onSaved: (trip: Trip, saveAndNew: boolean) => void;
  onCancel?: () => void;
  currentUser: string;
}

export const BILLING_COLORS: Record<BillingType, { bg: string; text: string; border: string }> = {
  'MED AID': { bg: 'bg-red-600', text: 'text-white', border: 'border-red-700' },
  PRIVATE: { bg: 'bg-purple-600', text: 'text-white', border: 'border-purple-700' },
  WCA: { bg: 'bg-pink-500', text: 'text-white', border: 'border-pink-600' },
  'RAF DOA': { bg: 'bg-blue-600', text: 'text-white', border: 'border-blue-700' },
  INDIGENT: { bg: 'bg-amber-400', text: 'text-slate-900', border: 'border-amber-500' },
  NSR: { bg: 'bg-slate-500', text: 'text-white', border: 'border-slate-600' },
  RHT: { bg: 'bg-emerald-600', text: 'text-white', border: 'border-emerald-700' },
};

export const PRIORITY_COLORS: Record<PriorityColor, { bg: string; text: string }> = {
  Red: { bg: 'bg-red-600 text-white', text: 'Priority 1 (Red) Resuscitation' },
  Orange: { bg: 'bg-orange-500 text-white', text: 'Priority 2 (Orange) Emergent' },
  Yellow: { bg: 'bg-amber-400 text-slate-900', text: 'Priority 3 (Yellow) Urgent' },
  Green: { bg: 'bg-emerald-600 text-white', text: 'Priority 4 (Green) Non-urgent' },
  Blue: { bg: 'bg-blue-600 text-white', text: 'Priority 5 (Blue) Deceased / DOA' },
};

export const TripForm: React.FC<TripFormProps> = ({
  initialTrip,
  onSaved,
  onCancel,
  currentUser,
}) => {
  const settings = Storage.getSettings();
  // User prompt: "only use X1 For each color code"
  const colourCodesList = (settings.colourCodes && settings.colourCodes.length > 0
    ? settings.colourCodes.filter((c) => c.startsWith('X1'))
    : []
  );
  const effectiveColourCodes = colourCodesList.length > 0 ? colourCodesList : DEFAULT_COLOUR_CODES;

  // User prompt: "choose from the dropdown list for all Mediclinics, Netcare and state hospitals in and around Brackenfell Cape Town and also add Mediclinic Paarl use for example MC Cape Gate, NC Kuilsrivier etc."
  const hospitalsList = settings.hospitals && settings.hospitals.length > 0
    ? settings.hospitals
    : DEFAULT_HOSPITALS;

  const [ambulance, setAmbulance] = useState<string>(
    initialTrip?.ambulance || settings.ambulances[0]?.fleetNo || 'MR001'
  );
  const [base, setBase] = useState<string>(initialTrip?.base || settings.bases[0] || 'Brackenfell Base');
  const [date, setDate] = useState<string>(initialTrip?.date || getTodayDateYYYYMMDD());
  const [shift, setShift] = useState<ShiftType>(initialTrip?.shift || 'Day');
  const [cadNumber, setCadNumber] = useState<string>(initialTrip?.cadNumber || '');
  const [eprfDigits, setEprfDigits] = useState<string>(initialTrip?.eprfNumber || '');
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const [levelOfCare, setLevelOfCare] = useState<LevelOfCare>(initialTrip?.levelOfCare || 'ILS');
  const [billingType, setBillingType] = useState<BillingType>(initialTrip?.billingType || 'MED AID');
  const [medicalSchemeName, setMedicalSchemeName] = useState<string>(
    initialTrip?.medicalSchemeName || ''
  );

  // Crew sorting mode: by surname or by qualification
  const [crewSortMode, setCrewSortMode] = useState<'surname' | 'qualification'>('surname');

  // Selected crew member chips
  const [selectedCrew, setSelectedCrew] = useState<string[]>(
    initialTrip?.crewMembers || (settings.crewMembers.slice(0, 2).map((c) => `${c.name} (${c.qualification})`))
  );

  const [callType, setCallType] = useState<CallType>(initialTrip?.callType || 'PRIM');
  const [priority, setPriority] = useState<PriorityColor>(initialTrip?.priority || 'Red');

  // User prompt: "Colour Code / Which Hospital, only use X1 For each color code and next to that choose from the dropdown list for all Mediclinics, Netcare and state hospitals in and around Brackenfell Cape Town and also add Mediclinic Paarl"
  const [selectedColourCode, setSelectedColourCode] = useState<string>(() => {
    if (initialTrip?.colourCodeOrHospital) {
      const parts = initialTrip.colourCodeOrHospital.split(' · ');
      if (parts[0] && parts[0].startsWith('X1')) return parts[0];
    }
    return effectiveColourCodes[0] || 'X1 Green';
  });

  const [selectedHospital, setSelectedHospital] = useState<string>(() => {
    if (initialTrip?.hospital) return initialTrip.hospital;
    if (initialTrip?.colourCodeOrHospital) {
      const parts = initialTrip.colourCodeOrHospital.split(' · ');
      if (parts.length > 1) return parts[1];
    }
    return hospitalsList[0] || 'MC Cape Gate';
  });

  // Times
  const [timeReceived, setTimeReceived] = useState<string>(
    initialTrip?.times?.timeReceived || getCurrentTimeHHMM()
  );
  const [timeMobile, setTimeMobile] = useState<string>(initialTrip?.times?.timeMobile || '');
  const [timeAtScene, setTimeAtScene] = useState<string>(initialTrip?.times?.timeAtScene || '');
  const [timeAtHospital, setTimeAtHospital] = useState<string>(initialTrip?.times?.timeAtHospital || '');
  const [timeAvailable, setTimeAvailable] = useState<string>(initialTrip?.times?.timeAvailable || '');

  // Kilometres
  const [kmStart, setKmStart] = useState<string>(
    initialTrip?.kmStart !== undefined ? initialTrip.kmStart.toString() : ''
  );
  const [kmEnd, setKmEnd] = useState<string>(
    initialTrip?.kmEnd !== undefined ? initialTrip.kmEnd.toString() : ''
  );

  const [outcome, setOutcome] = useState<OutcomeType>(initialTrip?.outcome || 'Transported');
  const [notes, setNotes] = useState<string>(initialTrip?.notes || '');
  const [formError, setFormError] = useState<string | null>(null);

  const eprfInputRef = useRef<HTMLInputElement>(null);

  // Auto-suggest shift when timeReceived changes
  useEffect(() => {
    if (timeReceived) {
      setShift(getShiftFromTime(timeReceived));
    }
  }, [timeReceived]);

  // Check duplicate ePRF in real time
  useEffect(() => {
    if (!eprfDigits.trim()) {
      setDuplicateWarning(null);
      return;
    }
    const dup = Storage.findTripByEprf(eprfDigits.trim());
    if (dup && dup.id !== initialTrip?.id) {
      setDuplicateWarning(
        `Warning: EPRF${dup.eprfNumber} already logged on ${dup.date} for ambulance ${dup.ambulance} (${dup.colourCodeOrHospital || dup.hospital || 'Logged'})`
      );
    } else {
      setDuplicateWarning(null);
    }
  }, [eprfDigits, initialTrip]);

  // Calculate intervals
  const responseMinutes = calculateMinutesBetween(timeReceived, timeMobile || timeReceived);
  const travelMinutes = calculateMinutesBetween(timeMobile || timeReceived, timeAtHospital || timeMobile || timeReceived);
  const turnaroundMinutes = calculateMinutesBetween(timeAtHospital || timeReceived, timeAvailable || timeAtHospital || timeReceived);
  const totalCallMinutes = calculateMinutesBetween(timeReceived, timeAvailable || timeAtHospital || timeMobile || timeReceived);

  // Distance KM
  const startNum = parseFloat(kmStart);
  const endNum = parseFloat(kmEnd);
  const calculatedDistance = !isNaN(startNum) && !isNaN(endNum) && endNum >= startNum ? endNum - startNum : undefined;

  // Handle setting current time on focused field with 'N' key
  const handleTimeKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    setter: (val: string) => void
  ) => {
    if (e.key === 'n' || e.key === 'N') {
      e.preventDefault();
      setter(getCurrentTimeHHMM());
    }
  };

  const toggleCrewMember = (crewStr: string) => {
    if (selectedCrew.includes(crewStr)) {
      setSelectedCrew(selectedCrew.filter((c) => c !== crewStr));
    } else {
      setSelectedCrew([...selectedCrew, crewStr]);
    }
  };

  const handleSave = (saveAndNew = false) => {
    setFormError(null);

    if (!eprfDigits.trim()) {
      setFormError('Please enter the ePRF # (digits only).');
      eprfInputRef.current?.focus();
      return;
    }

    if (duplicateWarning) {
      setFormError('Cannot save: ePRF number is a duplicate of an existing trip.');
      return;
    }

    if (!ambulance) {
      setFormError('Please select an ambulance.');
      return;
    }

    if (!selectedColourCode || !selectedHospital) {
      setFormError('Please select both a Colour Code (X1) and Destination Hospital.');
      return;
    }

    if (selectedCrew.length === 0) {
      setFormError('Please select at least one crew member.');
      return;
    }

    const tripData: Trip = {
      id: initialTrip?.id || `trip-${Date.now()}`,
      eprfNumber: eprfDigits.trim(),
      eprfFormatted: `EPRF${eprfDigits.trim()}`,
      ambulance,
      base,
      date,
      shift,
      cadNumber: cadNumber.trim() || undefined,
      levelOfCare,
      billingType,
      medicalSchemeName: billingType === 'MED AID' ? medicalSchemeName.trim() : undefined,
      crewMembers: selectedCrew,
      callType,
      priority,
      pickupLocation: `${selectedColourCode} · ${selectedHospital}`,
      hospital: selectedHospital,
      colourCodeOrHospital: `${selectedColourCode} · ${selectedHospital}`,
      times: {
        timeReceived,
        timeMobile: timeMobile || timeReceived,
        timeAtScene: timeAtScene || undefined,
        timeAtHospital: timeAtHospital || timeMobile || timeReceived,
        timeAvailable: timeAvailable || timeAtHospital || timeReceived,
      },
      calculatedTimes: {
        responseMinutes,
        travelMinutes,
        turnaroundMinutes,
        totalCallMinutes,
      },
      kmStart: !isNaN(startNum) ? startNum : undefined,
      kmEnd: !isNaN(endNum) ? endNum : undefined,
      distanceKm: calculatedDistance,
      outcome,
      notes: notes.trim() || undefined,
      createdBy: initialTrip?.createdBy || currentUser,
      createdAt: initialTrip?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const res = Storage.saveTrip(tripData, currentUser);
    if (!res.success) {
      setFormError(res.error || 'Failed to save trip');
      return;
    }

    if (saveAndNew) {
      // Reset for next trip entry while preserving base, ambulance, and date
      setEprfDigits('');
      setCadNumber('');
      setTimeReceived(getCurrentTimeHHMM());
      setTimeMobile('');
      setTimeAtScene('');
      setTimeAtHospital('');
      setTimeAvailable('');
      setNotes('');
      setKmStart(kmEnd || '');
      setKmEnd('');
      onSaved(tripData, true);
    } else {
      onSaved(tripData, false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden">
      {/* Form Header */}
      <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-red-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-red-600 flex items-center justify-center font-bold text-white text-base">
            {initialTrip ? 'EDIT' : 'NEW'}
          </div>
          <div>
            <h2 className="text-lg font-bold font-heading tracking-wide uppercase">
              {initialTrip ? `Edit Trip — ${initialTrip.eprfFormatted}` : 'Dispatch New EMS Trip'}
            </h2>
            <p className="text-xs text-slate-300">
              Live trip capture form · Press <kbd className="px-1 py-0.5 bg-slate-800 rounded font-mono text-[10px]">N</kbd> on any time box for current time
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={() => handleSave(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-white rounded transition shadow-sm cursor-pointer"
            title="Save and prepare blank form for next call"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Save &amp; New</span>
          </button>
          <button
            type="button"
            onClick={() => handleSave(false)}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded transition shadow-md cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Trip</span>
          </button>
        </div>
      </div>

      {formError && (
        <div className="mx-5 mt-4 p-3 bg-red-50 border-l-4 border-red-600 rounded-r text-red-800 text-xs font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{formError}</span>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSave(false);
        }}
        className="p-5 space-y-5"
      >
        {/* ROW 1: Ambulance, Base, Date, CAD #, ePRF # */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Ambulance */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Ambulance <span className="text-red-500">*</span>
            </label>
            <select
              value={ambulance}
              onChange={(e) => setAmbulance(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
              required
            >
              {settings.ambulances.map((amb) => (
                <option key={amb.id} value={amb.fleetNo}>
                  {amb.fleetNo} ({amb.registration})
                </option>
              ))}
            </select>
          </div>

          {/* Base */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Base <span className="text-red-500">*</span>
            </label>
            <select
              value={base}
              onChange={(e) => setBase(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
              required
            >
              {settings.bases.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
              required
            />
          </div>

          {/* CAD / Call Number */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              CAD / Call #
            </label>
            <input
              type="text"
              placeholder="e.g. CAD-26-8901"
              value={cadNumber}
              onChange={(e) => setCadNumber(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none font-mono-data"
            />
          </div>

          {/* ePRF # with FIXED non-editable prefix "EPRF" */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              ePRF # <span className="text-red-500">*</span>
            </label>
            <div className="flex rounded shadow-sm border border-slate-300 focus-within:ring-2 focus-within:ring-red-500 overflow-hidden">
              <span className="inline-flex items-center px-2.5 bg-slate-800 text-red-400 font-mono-data font-bold text-xs select-none">
                EPRF
              </span>
              <input
                ref={eprfInputRef}
                type="text"
                pattern="[0-9]*"
                inputMode="numeric"
                placeholder="4211"
                value={eprfDigits}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, ''); // digits only
                  setEprfDigits(val);
                }}
                className="w-full px-2.5 py-1.5 text-sm font-mono-data font-bold text-slate-900 bg-amber-50 focus:bg-white focus:outline-none"
                required
              />
            </div>
            {duplicateWarning && (
              <p className="mt-1 text-[11px] font-semibold text-red-600 leading-tight">
                {duplicateWarning}
              </p>
            )}
          </div>
        </div>

        {/* ROW 2: Level of Care, Billing Type (with official colors), Scheme Name, Call Type, Priority */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2 border-t border-slate-100">
          {/* Level of Care */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Level of Care <span className="text-red-500">*</span>
            </label>
            <select
              value={levelOfCare}
              onChange={(e) => setLevelOfCare(e.target.value as LevelOfCare)}
              className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
            >
              <option value="BLS">BLS (Basic Life Support)</option>
              <option value="ILS">ILS (Intermediate Life Support)</option>
              <option value="ALS">ALS (Advanced Life Support)</option>
            </select>
          </div>

          {/* Billing Type with badge color indicator */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Billing Type <span className="text-red-500">*</span>
            </label>
            <select
              value={billingType}
              onChange={(e) => setBillingType(e.target.value as BillingType)}
              className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-sm font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
            >
              <option value="MED AID">MED AID (Red)</option>
              <option value="PRIVATE">PRIVATE (Purple)</option>
              <option value="WCA">WCA (Pink)</option>
              <option value="RAF DOA">RAF DOA (Blue)</option>
              <option value="INDIGENT">INDIGENT (Yellow)</option>
              <option value="NSR">NSR (Grey)</option>
              <option value="RHT">RHT (Green)</option>
            </select>
            {/* Visual badge preview */}
            <div className="mt-1">
              <span
                className={`inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded shadow-xs ${BILLING_COLORS[billingType].bg} ${BILLING_COLORS[billingType].text}`}
              >
                {billingType}
              </span>
            </div>
          </div>

          {/* Medical Scheme Name (Shown only when Billing = MED AID) */}
          <div className={billingType === 'MED AID' ? 'block' : 'opacity-40 pointer-events-none'}>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Medical Aid / Scheme {billingType === 'MED AID' && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              placeholder="e.g. Discovery / GEMS / Bonitas"
              value={medicalSchemeName}
              onChange={(e) => setMedicalSchemeName(e.target.value)}
              disabled={billingType !== 'MED AID'}
              className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>

          {/* Call Type */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Call Type <span className="text-red-500">*</span>
            </label>
            <select
              value={callType}
              onChange={(e) => setCallType(e.target.value as CallType)}
              className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
            >
              <option value="PRIM">PRIM (Primary Response / Scene)</option>
              <option value="IHT">IHT (Inter-Hospital Transfer)</option>
              <option value="IFT">IFT (Inter-Facility Transfer)</option>
              <option value="DISCHARGE">DISCHARGE (Home Discharge)</option>
            </select>
          </div>

          {/* Priority / SATS Colour Code */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Priority (SATS) <span className="text-red-500">*</span>
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as PriorityColor)}
              className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-sm font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
            >
              <option value="Red">Red (P1 Resuscitation)</option>
              <option value="Orange">Orange (P2 Emergent)</option>
              <option value="Yellow">Yellow (P3 Urgent)</option>
              <option value="Green">Green (P4 Non-urgent)</option>
              <option value="Blue">Blue (P5 Deceased/DOA)</option>
            </select>
            <div className="mt-1">
              <span
                className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded shadow-xs ${PRIORITY_COLORS[priority].bg}`}
              >
                {priority} Priority
              </span>
            </div>
          </div>
        </div>

        {/* ROW 3: Crew Multi-select Chips */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
              Crew Members Assigned <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded border border-slate-200 text-[10px]">
              <span className="text-slate-500 font-semibold px-1">Sort:</span>
              <button
                type="button"
                onClick={() => setCrewSortMode('surname')}
                className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${
                  crewSortMode === 'surname' ? 'bg-black text-white' : 'text-slate-600 hover:text-black'
                }`}
              >
                Surname (A–Z)
              </button>
              <button
                type="button"
                onClick={() => setCrewSortMode('qualification')}
                className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${
                  crewSortMode === 'qualification' ? 'bg-red-600 text-white' : 'text-slate-600 hover:text-black'
                }`}
              >
                Qualification (ALS/ILS/BLS)
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {[...settings.crewMembers]
              .sort((a, b) => {
                if (crewSortMode === 'surname') {
                  const surA = (a.name || '').trim().split(' ').slice(-1)[0];
                  const surB = (b.name || '').trim().split(' ').slice(-1)[0];
                  return surA.localeCompare(surB);
                } else {
                  const order: Record<string, number> = { ALS: 1, ILS: 2, BLS: 3, ECA: 4, ECT: 5 };
                  return (order[a.qualification] || 9) - (order[b.qualification] || 9) || a.name.localeCompare(b.name);
                }
              })
              .map((c) => {
                const chipLabel = `${c.name} (${c.qualification})`;
                const isSelected = selectedCrew.includes(chipLabel);
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => toggleCrewMember(chipLabel)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition border cursor-pointer ${
                      isSelected
                        ? 'bg-black text-white border-black shadow-sm ring-2 ring-red-600'
                        : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {chipLabel}
                    {isSelected && <span className="ml-1.5 text-red-500 font-bold">✓</span>}
                  </button>
                );
              })}
          </div>
        </div>

        {/* ROW 4: Colour Code / Which Hospital (Side-by-side per user specifications) */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
              Colour Code / Which Hospital <span className="text-red-500">*</span>
            </label>
            <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
              Only X1 triage color codes · Brackenfell, Cape Town &amp; Paarl facilities
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
            {/* Control 1: Colour Code (Only X1 codes) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1 flex items-center justify-between">
                <span>1. Colour Code (X1 Only)</span>
                <span className="text-[10px] text-emerald-600 font-mono font-bold">X1 Priority</span>
              </label>
              <select
                value={selectedColourCode}
                onChange={(e) => setSelectedColourCode(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-red-600 focus:outline-none"
                required
              >
                {effectiveColourCodes.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Triage color code (e.g. X1 Green, X1 Yellow, X1 Red, X1 Orange, X1 Blue)
              </span>
            </div>

            {/* Control 2: Destination Hospital (Brackenfell, Cape Town & Paarl facilities) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1 flex items-center justify-between">
                <span>2. Which Hospital</span>
                <span className="text-[10px] text-slate-500 font-mono">Brackenfell &amp; Regional</span>
              </label>
              <select
                value={selectedHospital}
                onChange={(e) => setSelectedHospital(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-red-600 focus:outline-none"
                required
              >
                {hospitalsList.map((hosp) => (
                  <option key={hosp} value={hosp}>
                    {hosp}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Mediclinic, Netcare &amp; State (e.g. MC Cape Gate, NC Kuilsrivier, MC Paarl)
              </span>
            </div>
          </div>
        </div>

        {/* ROW 5: Clinical Times (with 'Now' buttons, 'N' shortcut, and live auto-calculated intervals) */}
        <div className="pt-2 border-t border-slate-100 bg-slate-50 p-4 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-red-600" />
              <span>Trip Timeline &amp; Call Intervals</span>
            </h3>
            <span className="text-[11px] text-slate-500">
              Midnight rollover supported · Press <strong>N</strong> on any input for current time
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {/* Time Received */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase">Received/Dispatched</label>
                <button
                  type="button"
                  onClick={() => setTimeReceived(getCurrentTimeHHMM())}
                  className="text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-800 px-1.5 py-0.5 rounded font-semibold cursor-pointer"
                >
                  Now
                </button>
              </div>
              <input
                type="time"
                value={timeReceived}
                onChange={(e) => setTimeReceived(e.target.value)}
                onKeyDown={(e) => handleTimeKeyDown(e, setTimeReceived)}
                className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-sm font-mono-data font-bold text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                required
              />
            </div>

            {/* Time Mobile */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase">Time Mobile</label>
                <button
                  type="button"
                  onClick={() => setTimeMobile(getCurrentTimeHHMM())}
                  className="text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-800 px-1.5 py-0.5 rounded font-semibold cursor-pointer"
                >
                  Now
                </button>
              </div>
              <input
                type="time"
                value={timeMobile}
                onChange={(e) => setTimeMobile(e.target.value)}
                onKeyDown={(e) => handleTimeKeyDown(e, setTimeMobile)}
                className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-sm font-mono-data font-bold text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>

            {/* Time At Scene */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase">At Scene</label>
                <button
                  type="button"
                  onClick={() => setTimeAtScene(getCurrentTimeHHMM())}
                  className="text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-800 px-1.5 py-0.5 rounded font-semibold cursor-pointer"
                >
                  Now
                </button>
              </div>
              <input
                type="time"
                value={timeAtScene}
                onChange={(e) => setTimeAtScene(e.target.value)}
                onKeyDown={(e) => handleTimeKeyDown(e, setTimeAtScene)}
                className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-sm font-mono-data font-bold text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>

            {/* Time At Hospital */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase">At Hospital</label>
                <button
                  type="button"
                  onClick={() => setTimeAtHospital(getCurrentTimeHHMM())}
                  className="text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-800 px-1.5 py-0.5 rounded font-semibold cursor-pointer"
                >
                  Now
                </button>
              </div>
              <input
                type="time"
                value={timeAtHospital}
                onChange={(e) => setTimeAtHospital(e.target.value)}
                onKeyDown={(e) => handleTimeKeyDown(e, setTimeAtHospital)}
                className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-sm font-mono-data font-bold text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>

            {/* Time Available */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase">Available</label>
                <button
                  type="button"
                  onClick={() => setTimeAvailable(getCurrentTimeHHMM())}
                  className="text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-800 px-1.5 py-0.5 rounded font-semibold cursor-pointer"
                >
                  Now
                </button>
              </div>
              <input
                type="time"
                value={timeAvailable}
                onChange={(e) => setTimeAvailable(e.target.value)}
                onKeyDown={(e) => handleTimeKeyDown(e, setTimeAvailable)}
                className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-sm font-mono-data font-bold text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Auto-calculated Intervals Bar */}
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200">
            <div className="bg-white p-2 rounded border border-slate-200 text-center">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Response Time</span>
              <span className="text-sm font-bold font-mono-data text-blue-700">
                {responseMinutes} min ({formatMinutesToHMM(responseMinutes)})
              </span>
            </div>
            <div className="bg-white p-2 rounded border border-slate-200 text-center">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Travel Time</span>
              <span className="text-sm font-bold font-mono-data text-slate-800">
                {travelMinutes} min ({formatMinutesToHMM(travelMinutes)})
              </span>
            </div>
            <div className="bg-white p-2 rounded border border-slate-200 text-center">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Turnaround Time</span>
              <span className="text-sm font-bold font-mono-data text-amber-600">
                {turnaroundMinutes} min ({formatMinutesToHMM(turnaroundMinutes)})
              </span>
            </div>
            <div className="bg-white p-2 rounded border border-slate-200 text-center bg-red-50/50">
              <span className="text-[10px] font-bold uppercase text-red-700 block">Total Call Duration</span>
              <span className="text-sm font-black font-mono-data text-red-700">
                {totalCallMinutes} min ({formatMinutesToHMM(totalCallMinutes)})
              </span>
            </div>
          </div>
        </div>

        {/* ROW 6: Kilometres (start/end) & Outcome */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Start Odometer (KM)
            </label>
            <input
              type="number"
              placeholder="e.g. 142350"
              value={kmStart}
              onChange={(e) => setKmStart(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-sm font-mono-data text-slate-800 focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              End Odometer (KM)
            </label>
            <input
              type="number"
              placeholder="e.g. 142388"
              value={kmEnd}
              onChange={(e) => setKmEnd(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-sm font-mono-data text-slate-800 focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Calculated Distance
            </label>
            <div className="px-3 py-1.5 bg-slate-100 border border-slate-300 rounded font-mono-data text-sm font-bold text-slate-800">
              {calculatedDistance !== undefined ? `${calculatedDistance} km` : '—'}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Trip Outcome <span className="text-red-500">*</span>
            </label>
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as OutcomeType)}
              className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-sm font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
            >
              <option value="Transported">Transported</option>
              <option value="Treated & released">Treated &amp; released</option>
              <option value="Refused">Refused treatment</option>
              <option value="Cancelled">Cancelled</option>
              <option value="DOA">DOA (Dead on Arrival)</option>
              <option value="Standby">Standby</option>
            </select>
          </div>
        </div>

        {/* ROW 7: Notes */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
            Dispatcher &amp; Clinical Handover Notes
          </label>
          <textarea
            rows={3}
            placeholder="Key clinical notes, interventions (e.g. Intubated, TXA, Fracture splinted), handover details..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
          ></textarea>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <div className="text-xs text-slate-500">
            Fields marked with <span className="text-red-500 font-bold">*</span> are required
          </div>

          <div className="flex items-center gap-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-100 text-sm font-semibold transition"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={() => handleSave(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded text-sm font-semibold transition shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Save &amp; New Trip</span>
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-bold shadow-md transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{initialTrip ? 'Update Trip Record' : 'Save Trip to Log'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
