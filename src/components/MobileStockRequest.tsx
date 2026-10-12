import React, { useState, useEffect, useMemo } from 'react';
import {
  User,
  StockRequest,
  StockItem,
  StockRequestLine,
  StockUrgency,
  ShiftType,
} from '../types';
import { Storage } from '../utils/storage';
import {
  getCurrentTimeHHMM,
  getTodayDateYYYYMMDD,
  formatDateSA,
} from '../utils/timeCalculations';
import {
  Search,
  Plus,
  Minus,
  Check,
  AlertTriangle,
  Send,
  Trash2,
  ShieldAlert,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Package,
} from 'lucide-react';

interface MobileStockRequestProps {
  currentUser: User;
  onSubmitted?: () => void;
  onClose?: () => void;
}

export const MobileStockRequest: React.FC<MobileStockRequestProps> = ({
  currentUser,
  onSubmitted,
  onClose,
}) => {
  const settings = Storage.getSettings();
  const allStockItems = Storage.getStockItems();

  // Mode: 'form' | 'review' | 'history'
  const [viewMode, setViewMode] = useState<'form' | 'review' | 'history'>('form');

  // Request Header State
  const [ambulance, setAmbulance] = useState<string>(
    settings.ambulances[0]?.fleetNo || 'MR001'
  );
  const [base, setBase] = useState<string>(currentUser.base || settings.bases[0] || 'Main Base');
  const [shift, setShift] = useState<ShiftType>('Day');
  const [linkedEprf, setLinkedEprf] = useState<string>('');
  const [urgency, setUrgency] = useState<StockUrgency>('Routine');

  // Selected items map: { [itemId: string]: number }
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});

  // Controlled drugs extra requirements
  const [controlledReason, setControlledReason] = useState<string>('');
  const [hpcsaNumber, setHpcsaNumber] = useState<string>(currentUser.hpcsaNo || '');

  // Custom "Add other item"
  const [customItemName, setCustomItemName] = useState<string>('');
  const [customItemQty, setCustomItemQty] = useState<string>('1');
  const [customItemUnit, setCustomItemUnit] = useState<string>('each');
  const [customItems, setCustomItems] = useState<
    { name: string; qty: number; unit: string }[]
  >([]);

  // Search & Accordion
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'Airway & breathing': true,
    'IV access & fluids': true,
    'Medication — basic/ILS': true,
    'Medication — controlled (Schedule 5/6)': true,
    'Trauma & wound care': true,
  });

  // Offline status & draft saving notification
  const [isDraftSaved, setIsDraftSaved] = useState<boolean>(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<string | null>(null);

  // Load existing offline draft if available
  useEffect(() => {
    const draft = Storage.getOfflineStockDraft() as {
      ambulance?: string;
      base?: string;
      selectedQuantities?: Record<string, number>;
      customItems?: { name: string; qty: number; unit: string }[];
      controlledReason?: string;
      linkedEprf?: string;
    } | null;

    if (draft && draft.selectedQuantities && Object.keys(draft.selectedQuantities).length > 0) {
      if (draft.ambulance) setAmbulance(draft.ambulance);
      if (draft.base) setBase(draft.base);
      if (draft.selectedQuantities) setSelectedQuantities(draft.selectedQuantities);
      if (draft.customItems) setCustomItems(draft.customItems);
      if (draft.controlledReason) setControlledReason(draft.controlledReason);
      if (draft.linkedEprf) setLinkedEprf(draft.linkedEprf);
    }
  }, []);

  // Auto-save draft on changes to localStorage so dropped cellular connection never loses form
  useEffect(() => {
    const hasItems = Object.keys(selectedQuantities).length > 0 || customItems.length > 0;
    if (hasItems) {
      Storage.saveOfflineStockDraft({
        ambulance,
        base,
        selectedQuantities,
        customItems,
        controlledReason,
        linkedEprf,
      });
      setIsDraftSaved(true);
      const timer = setTimeout(() => setIsDraftSaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [ambulance, base, selectedQuantities, customItems, controlledReason, linkedEprf]);

  // Group items by category
  const categories = useMemo(() => {
    const cats: { [category: string]: StockItem[] } = {};
    for (const item of allStockItems) {
      if (!cats[item.category]) cats[item.category] = [];
      cats[item.category].push(item);
    }
    return cats;
  }, [allStockItems]);

  // Filtered categories according to search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const query = searchQuery.toLowerCase();
    const result: { [cat: string]: StockItem[] } = {};

    for (const [catName, items] of Object.entries(categories)) {
      const matchingItems = items.filter(
        (i) => i.name.toLowerCase().includes(query) || i.category.toLowerCase().includes(query)
      );
      if (matchingItems.length > 0) {
        result[catName] = matchingItems;
      }
    }
    return result;
  }, [categories, searchQuery]);

  // Increment/Decrement quantity
  const updateQty = (itemId: string, delta: number) => {
    setSelectedQuantities((prev) => {
      const current = prev[itemId] || 0;
      const next = current + delta;
      const copy = { ...prev };
      if (next <= 0) {
        delete copy[itemId];
      } else {
        copy[itemId] = next;
      }
      return copy;
    });
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [cat]: !prev[cat],
    }));
  };

  // Check if any controlled medicine was selected
  const hasControlledDrugs = useMemo(() => {
    return Object.entries(selectedQuantities).some(([id, qty]) => {
      if (qty <= 0) return false;
      const item = allStockItems.find((i) => i.id === id);
      return item?.isControlled;
    });
  }, [selectedQuantities, allStockItems]);

  // Add custom unlisted item
  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customItemName.trim()) return;
    const qty = parseInt(customItemQty, 10) || 1;
    setCustomItems([
      ...customItems,
      { name: customItemName.trim(), qty, unit: customItemUnit },
    ]);
    setCustomItemName('');
    setCustomItemQty('1');
  };

  const removeCustomItem = (index: number) => {
    setCustomItems(customItems.filter((_, i) => i !== index));
  };

  // Compile final selected lines
  const selectedLines: StockRequestLine[] = useMemo(() => {
    const lines: StockRequestLine[] = [];
    for (const [itemId, qty] of Object.entries(selectedQuantities)) {
      if (qty > 0) {
        const item = allStockItems.find((i) => i.id === itemId);
        if (item) {
          lines.push({
            itemId: item.id,
            itemName: item.name,
            unit: item.unit,
            isControlled: item.isControlled,
            requestedQty: qty,
          });
        }
      }
    }
    return lines;
  }, [selectedQuantities, allStockItems]);

  const totalItemCount = selectedLines.reduce((acc, l) => acc + l.requestedQty, 0) + customItems.length;

  const handleSubmitRequest = () => {
    if (selectedLines.length === 0 && customItems.length === 0) {
      alert('Please select at least one stock item to request.');
      return;
    }

    if (hasControlledDrugs && !controlledReason.trim() && !linkedEprf.trim()) {
      alert('Controlled medicines (Schedule 5/6) require a linked ePRF number or clinical usage reason.');
      return;
    }

    // Generate unique serial number SR-YYYY-XXXXXX
    const randomSeq = Math.floor(100000 + Math.random() * 900000);
    const requestId = `SR-2026-${randomSeq}`;

    // Format custom items note if any
    const customNotes =
      customItems.length > 0
        ? customItems.map((c) => `${c.qty}x ${c.name} (${c.unit})`).join('; ')
        : undefined;

    const request: StockRequest = {
      id: requestId,
      requesterId: currentUser.id,
      requesterName: `${currentUser.fullName} (${currentUser.qualification || 'Paramedic'})`,
      ambulance,
      base,
      shift,
      requestedAt: new Date().toISOString(),
      linkedEprf: linkedEprf.trim() || undefined,
      urgency,
      lines: selectedLines,
      controlledReason: hasControlledDrugs ? controlledReason.trim() : undefined,
      hpcsaNumber: hasControlledDrugs ? hpcsaNumber.trim() : undefined,
      customItemsNote: customNotes,
      status: 'Submitted',
      actionHistory: [
        {
          action: `Submitted by ${currentUser.fullName}`,
          byUser: currentUser.username,
          timestamp: new Date().toISOString(),
        },
      ],
    };

    Storage.saveStockRequest(request, currentUser.username);
    Storage.clearOfflineStockDraft();

    setSubmissionSuccess(requestId);
    setSelectedQuantities({});
    setCustomItems([]);
    setControlledReason('');
    setViewMode('history');

    if (onSubmitted) {
      onSubmitted();
    }
  };

  // Paramedic's own requests
  const ownRequests = useMemo(() => {
    return Storage.getStockRequests().filter((r) => r.requesterId === currentUser.id);
  }, [currentUser.id]);

  return (
    <div className="max-w-md mx-auto bg-slate-900 text-white min-h-[92vh] flex flex-col rounded-xl shadow-2xl overflow-hidden border-2 border-red-700">
      {/* Red Ambulance Livery Top Bar */}
      <div className="bg-red-700 p-3 flex items-center justify-between text-white shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-white text-red-700 flex items-center justify-center font-black">
            🚑
          </div>
          <div>
            <h1 className="font-heading font-black text-base uppercase tracking-wider leading-none">
              ResQ Stock App
            </h1>
            <span className="text-[10px] text-red-200">Vehicle Restock &amp; Drug Requisition</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="text-white hover:bg-red-800 text-xs px-2 py-1 rounded cursor-pointer"
            >
              Exit
            </button>
          )}
        </div>
      </div>

      {/* Mode Navigation Tabs */}
      <div className="grid grid-cols-2 bg-slate-800 border-b border-slate-700 text-xs font-bold">
        <button
          onClick={() => setViewMode('form')}
          className={`py-3 text-center transition flex items-center justify-center gap-1.5 cursor-pointer ${
            viewMode === 'form' || viewMode === 'review'
              ? 'bg-slate-900 text-red-400 border-b-2 border-red-500'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>New Requisition {totalItemCount > 0 && `(${totalItemCount})`}</span>
        </button>

        <button
          onClick={() => setViewMode('history')}
          className={`py-3 text-center transition flex items-center justify-center gap-1.5 cursor-pointer ${
            viewMode === 'history'
              ? 'bg-slate-900 text-red-400 border-b-2 border-red-500'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>My Requests ({ownRequests.length})</span>
        </button>
      </div>

      {/* VIEW: MY REQUESTS HISTORY */}
      {viewMode === 'history' ? (
        <div className="p-4 flex-1 overflow-y-auto space-y-3 bg-slate-950">
          {submissionSuccess && (
            <div className="p-3 bg-emerald-900/60 border border-emerald-500 rounded-lg text-emerald-200 text-xs">
              <div className="flex items-center gap-2 font-bold mb-1 text-sm text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Requisition Submitted!</span>
              </div>
              Your order <strong>{submissionSuccess}</strong> has been transmitted to the Base Stock Controller.
            </div>
          )}

          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Recent Submissions for {currentUser.fullName}
          </h2>

          {ownRequests.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No stock requests submitted yet.
            </div>
          ) : (
            ownRequests.map((req) => (
              <div
                key={req.id}
                className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs space-y-2 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-red-400">{req.id}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                      req.status === 'Issued'
                        ? 'bg-emerald-600 text-white'
                        : req.status === 'Approved'
                        ? 'bg-blue-600 text-white'
                        : req.status === 'Rejected'
                        ? 'bg-red-600 text-white'
                        : 'bg-amber-500 text-slate-900'
                    }`}
                  >
                    {req.status}
                  </span>
                </div>

                <div className="text-slate-300 text-[11px] flex justify-between">
                  <span>
                    Ambulance: <strong>{req.ambulance}</strong> ({req.base})
                  </span>
                  <span className="text-slate-400">{new Date(req.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                <div className="bg-slate-950 p-2 rounded text-[11px] text-slate-300 space-y-1">
                  <span className="text-slate-500 font-bold block text-[10px] uppercase">Requested Items:</span>
                  {req.lines.map((l, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span className={l.isControlled ? 'text-amber-400 font-medium' : ''}>
                        {l.itemName} {l.isControlled && '⚠️'}
                      </span>
                      <span className="font-mono font-bold text-slate-100">
                        {l.requestedQty} {l.unit}
                        {l.issuedQty !== undefined && ` (Issued: ${l.issuedQty})`}
                      </span>
                    </div>
                  ))}
                  {req.customItemsNote && (
                    <div className="text-amber-300 italic pt-1 border-t border-slate-800">
                      Other: {req.customItemsNote}
                    </div>
                  )}
                </div>

                {req.notes && (
                  <div className="text-[10px] text-slate-400 italic">
                    Controller notes: {req.notes}
                  </div>
                )}
              </div>
            ))
          )}

          <div className="pt-2">
            <button
              onClick={() => {
                setSubmissionSuccess(null);
                setViewMode('form');
              }}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs uppercase tracking-wider transition cursor-pointer"
            >
              Start New Stock Request
            </button>
          </div>
        </div>
      ) : viewMode === 'review' ? (
        /* VIEW: REVIEW & CONFIRM SCREEN */
        <div className="p-4 flex-1 overflow-y-auto space-y-4 bg-slate-950 text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h2 className="text-sm font-bold font-heading text-white uppercase tracking-wider">
              Review Requisition Order
            </h2>
            <button
              onClick={() => setViewMode('form')}
              className="text-red-400 hover:underline font-semibold cursor-pointer"
            >
              ← Edit Items
            </button>
          </div>

          <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-400">Requester:</span>
              <span className="font-bold text-white">{currentUser.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Vehicle / Ambulance:</span>
              <span className="font-bold text-red-400 font-mono">{ambulance}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Base / Shift:</span>
              <span>{base} · {shift} Shift</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Urgency:</span>
              <span className="font-bold text-amber-400">{urgency}</span>
            </div>
            {linkedEprf && (
              <div className="flex justify-between">
                <span className="text-slate-400">Linked ePRF #:</span>
                <span className="font-bold font-mono text-slate-200">{linkedEprf}</span>
              </div>
            )}
          </div>

          {/* Controlled Medication Compliance Banner */}
          {hasControlledDrugs && (
            <div className="bg-amber-950/80 border-2 border-amber-600 p-3 rounded-lg space-y-2 text-amber-200">
              <div className="flex items-center gap-2 font-bold text-amber-400">
                <ShieldAlert className="w-5 h-5 shrink-0" />
                <span>Schedule 5/6 Controlled Substance Warning</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                South African Medicine Control Council regulations: Requester must hold valid HPCSA ALS/ILS credential.
                Physical controlled-drug register in safe must be counter-signed at time of handover.
              </p>
              <div>
                <label className="block text-[10px] font-bold uppercase text-amber-300 mb-1">
                  HPCSA Registration # <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. ANT0009841"
                  value={hpcsaNumber}
                  onChange={(e) => setHpcsaNumber(e.target.value)}
                  className="w-full bg-slate-900 border border-amber-500 rounded p-2 text-white font-mono font-bold"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-amber-300 mb-1">
                  Usage Clinical Justification / ePRF # <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Used on EPRF4213 inter-hospital cardiac transfer"
                  value={controlledReason}
                  onChange={(e) => setControlledReason(e.target.value)}
                  className="w-full bg-slate-900 border border-amber-500 rounded p-2 text-white"
                  required
                />
              </div>
            </div>
          )}

          {/* Chosen Items List */}
          <div className="space-y-2">
            <h3 className="font-bold uppercase tracking-wider text-slate-400 text-[11px]">
              Chosen Requisition Items ({selectedLines.length + customItems.length})
            </h3>
            <div className="space-y-1.5">
              {selectedLines.map((line) => (
                <div
                  key={line.itemId}
                  className="flex items-center justify-between p-2.5 bg-slate-900 rounded border border-slate-800"
                >
                  <div>
                    <div className="font-semibold text-white">
                      {line.itemName}
                      {line.isControlled && (
                        <span className="ml-1 text-[10px] bg-amber-600/50 text-amber-300 px-1 rounded">
                          Sched 5/6
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400">Unit: {line.unit}</div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-base text-red-400">
                      {line.requestedQty}
                    </span>{' '}
                    <span className="text-[10px] text-slate-400">{line.unit}</span>
                  </div>
                </div>
              ))}

              {customItems.map((c, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2.5 bg-slate-900/80 rounded border border-slate-800"
                >
                  <div className="text-amber-200">
                    <div className="font-semibold">{c.name} (Custom)</div>
                    <div className="text-[10px] text-slate-400">Unit: {c.unit}</div>
                  </div>
                  <div className="font-mono font-bold text-base text-amber-400">
                    {c.qty} {c.unit}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3">
            <button
              onClick={handleSubmitRequest}
              className="w-full py-3.5 bg-red-600 hover:bg-red-700 active:scale-98 text-white font-bold rounded-lg text-sm uppercase tracking-wider shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Confirm &amp; Send to Stock Controller</span>
            </button>
          </div>
        </div>
      ) : (
        /* VIEW: FORM - CATALOGUE & QUANTITIES */
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
          {/* Draft autosave indicator */}
          {isDraftSaved && (
            <div className="bg-emerald-950 text-emerald-400 text-[10px] py-1 text-center font-bold">
              ✓ Draft saved locally on phone
            </div>
          )}

          {/* Vehicle & Urgency selectors */}
          <div className="p-3 bg-slate-900 border-b border-slate-800 space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Ambulance</label>
                <select
                  value={ambulance}
                  onChange={(e) => setAmbulance(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-white font-bold"
                >
                  {settings.ambulances.map((a) => (
                    <option key={a.id} value={a.fleetNo}>
                      {a.fleetNo} ({a.registration})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Base</label>
                <select
                  value={base}
                  onChange={(e) => setBase(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-white"
                >
                  {settings.bases.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Urgency</label>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value as StockUrgency)}
                  className={`w-full border rounded p-1.5 font-bold ${
                    urgency.includes('Urgent')
                      ? 'bg-red-950 border-red-500 text-red-200'
                      : 'bg-slate-800 border-slate-700 text-white'
                  }`}
                >
                  <option value="Routine">Routine Restock</option>
                  <option value="Before next shift">Before Next Shift</option>
                  <option value="Urgent — vehicle off-road">🚨 Urgent (Vehicle Off-Road)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Linked ePRF #</label>
                <input
                  type="text"
                  placeholder="e.g. 4211"
                  value={linkedEprf}
                  onChange={(e) => setLinkedEprf(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Search Box */}
          <div className="p-2.5 bg-slate-900/60 border-b border-slate-800">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search South African stock catalogue..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
          </div>

          {/* Catalogue List with Accordion & Large 48px Steppers */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {Object.entries(filteredCategories).map(([catName, items]) => {
              const isExpanded = expandedCategories[catName] !== false;
              const isControlledCat = catName.includes('controlled');

              return (
                <div
                  key={catName}
                  className={`rounded-lg border overflow-hidden ${
                    isControlledCat
                      ? 'border-amber-700/70 bg-amber-950/20'
                      : 'border-slate-800 bg-slate-900/80'
                  }`}
                >
                  <button
                    onClick={() => toggleCategory(catName)}
                    className="w-full p-2.5 flex items-center justify-between text-left text-xs font-bold uppercase tracking-wider text-slate-200 bg-slate-800/80 hover:bg-slate-800 cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      {isControlledCat && <span>⚠️</span>}
                      <span>{catName}</span>
                      <span className="text-[10px] font-normal text-slate-400">({items.length})</span>
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {isExpanded && (
                    <div className="divide-y divide-slate-800/80">
                      {items.map((item) => {
                        const qty = selectedQuantities[item.id] || 0;
                        return (
                          <div
                            key={item.id}
                            className={`p-3 flex items-center justify-between gap-2 ${
                              qty > 0 ? 'bg-red-950/30' : ''
                            }`}
                          >
                            <div className="flex-1 pr-2">
                              <div className="text-xs font-semibold text-white leading-snug">
                                {item.name}
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                <span>Unit: {item.unit}</span>
                                {item.isControlled && (
                                  <span className="text-amber-400 font-bold">Schedule 5/6 (Controlled)</span>
                                )}
                              </div>
                            </div>

                            {/* Large Touch Stepper (Minimum 48px touch targets for mobile) */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => updateQty(item.id, -1)}
                                disabled={qty === 0}
                                className={`w-11 h-11 flex items-center justify-center rounded-lg font-bold text-lg transition active:scale-95 cursor-pointer ${
                                  qty === 0
                                    ? 'bg-slate-800 text-slate-600 opacity-40'
                                    : 'bg-slate-700 text-white hover:bg-slate-600'
                                }`}
                                aria-label={`Decrease ${item.name}`}
                              >
                                <Minus className="w-4 h-4" />
                              </button>

                              <span className="w-8 text-center font-mono font-bold text-base text-white">
                                {qty}
                              </span>

                              <button
                                type="button"
                                onClick={() => updateQty(item.id, 1)}
                                className="w-11 h-11 flex items-center justify-center rounded-lg font-bold text-lg bg-red-600 text-white hover:bg-red-500 active:scale-95 shadow-md cursor-pointer"
                                aria-label={`Increase ${item.name}`}
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* "Add other item" free-text section */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs space-y-2">
              <h3 className="font-bold text-slate-300 uppercase tracking-wide text-[11px]">
                Add Unlisted / Other Item
              </h3>
              <p className="text-[10px] text-slate-400">
                Item not in the catalogue? Enter it here and the Stock Controller can issue and promote it.
              </p>
              <form onSubmit={handleAddCustomItem} className="space-y-2">
                <input
                  type="text"
                  placeholder="Item description &amp; size (e.g. Chest tube 28FR)..."
                  value={customItemName}
                  onChange={(e) => setCustomItemName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-xs"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={customItemQty}
                    onChange={(e) => setCustomItemQty(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-xs font-mono"
                  />
                  <input
                    type="text"
                    placeholder="Unit (each, box)"
                    value={customItemUnit}
                    onChange={(e) => setCustomItemUnit(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-xs"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-slate-700 hover:bg-slate-600 rounded font-bold text-white text-xs transition cursor-pointer"
                >
                  + Add Custom Item
                </button>
              </form>

              {customItems.length > 0 && (
                <div className="pt-2 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Added:</span>
                  {customItems.map((c, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-slate-800 p-2 rounded text-slate-200"
                    >
                      <span>
                        {c.qty}x {c.name} ({c.unit})
                      </span>
                      <button
                        onClick={() => removeCustomItem(i)}
                        className="text-red-400 hover:text-red-300 p-1 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sticky Bottom Review & Submit Trigger Bar */}
          <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Selected:</span>
              <span className="font-bold text-sm text-white font-mono">
                {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
              </span>
            </div>

            <button
              onClick={() => setViewMode('review')}
              disabled={totalItemCount === 0}
              className={`px-6 py-3 rounded-lg font-bold text-xs uppercase tracking-wider transition shadow-md flex items-center gap-2 cursor-pointer ${
                totalItemCount > 0
                  ? 'bg-red-600 hover:bg-red-700 text-white active:scale-95'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <span>Review &amp; Submit</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
