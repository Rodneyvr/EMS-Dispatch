import React, { useState } from 'react';
import {
  StockRequest,
  StockRequestStatus,
  UserRole,
  StockItem,
} from '../types';
import { Storage, playAlertSound } from '../utils/storage';
import { formatDateSA } from '../utils/timeCalculations';
import {
  Package,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Edit,
  ShieldAlert,
  Search,
  Filter,
  Check,
  X,
  FileText,
} from 'lucide-react';

interface StockBackOfficeProps {
  userRole: UserRole;
  currentUsername: string;
  onRefresh: () => void;
}

export const StockBackOffice: React.FC<StockBackOfficeProps> = ({
  userRole,
  currentUsername,
  onRefresh,
}) => {
  const [requests, setRequests] = useState<StockRequest[]>(Storage.getStockRequests());
  const [activeTab, setActiveTab] = useState<'requests' | 'catalogue'>('requests');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Issue / Action Modal State
  const [selectedRequest, setSelectedRequest] = useState<StockRequest | null>(null);
  const [issuedQuantities, setIssuedQuantities] = useState<Record<string, number>>({});
  const [actionNotes, setActionNotes] = useState<string>('');

  // Picking Slip Print Modal
  const [printRequest, setPrintRequest] = useState<StockRequest | null>(null);

  // Stock Catalogue State
  const [stockCatalogue, setStockCatalogue] = useState<StockItem[]>(Storage.getStockItems());
  const [newCatName, setNewCatName] = useState('Airway & breathing');
  const [newItemName, setNewItemName] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('each');
  const [newItemControlled, setNewItemControlled] = useState(false);
  const [newItemMin, setNewItemMin] = useState('5');

  // Filter requests
  const filteredRequests = requests.filter((r) => {
    if (filterStatus !== 'ALL' && r.status !== filterStatus) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const match =
        r.id.toLowerCase().includes(q) ||
        r.ambulance.toLowerCase().includes(q) ||
        r.requesterName.toLowerCase().includes(q) ||
        (r.linkedEprf && r.linkedEprf.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const openActionModal = (req: StockRequest) => {
    setSelectedRequest(req);
    setActionNotes('');
    const initialQtys: Record<string, number> = {};
    req.lines.forEach((l) => {
      initialQtys[l.itemId] = l.issuedQty !== undefined ? l.issuedQty : l.requestedQty;
    });
    setIssuedQuantities(initialQtys);
  };

  const handleExecuteAction = (status: StockRequestStatus) => {
    if (!selectedRequest) return;

    // Check line quantities
    const updatedLines = selectedRequest.lines.map((l) => ({
      ...l,
      issuedQty: status === 'Issued' ? issuedQuantities[l.itemId] ?? l.requestedQty : l.issuedQty,
    }));

    const updated: StockRequest = {
      ...selectedRequest,
      status,
      lines: updatedLines,
      issuedBy: status === 'Issued' ? currentUsername : selectedRequest.issuedBy,
      issuedAt: status === 'Issued' ? new Date().toISOString() : selectedRequest.issuedAt,
      notes: actionNotes.trim() || selectedRequest.notes,
      actionHistory: [
        ...selectedRequest.actionHistory,
        {
          action: `Status set to ${status} by ${currentUsername}`,
          byUser: currentUsername,
          timestamp: new Date().toISOString(),
          notes: actionNotes.trim() || undefined,
        },
      ],
    };

    Storage.saveStockRequest(updated, currentUsername);
    setRequests(Storage.getStockRequests());
    setSelectedRequest(null);
    playAlertSound('success');
    onRefresh();
  };

  // Add item to stock catalogue
  const handleAddCatalogueItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    const newItem: StockItem = {
      id: `custom-item-${Date.now()}`,
      category: newCatName,
      name: newItemName.trim(),
      unit: newItemUnit,
      isControlled: newItemControlled,
      requiresALS: newItemControlled,
      minLevel: parseInt(newItemMin, 10) || 5,
      currentStock: 20,
    };
    const updated = [...stockCatalogue, newItem];
    Storage.saveStockItems(updated);
    setStockCatalogue(updated);
    setNewItemName('');
    alert(`Item "${newItem.name}" added to stock catalogue.`);
  };

  return (
    <div className="space-y-4">
      {/* Top Navigation between Requests and Catalogue */}
      <div className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm border border-slate-200">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 rounded-md font-bold text-xs uppercase tracking-wide transition cursor-pointer ${
              activeTab === 'requests'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Requisition Orders ({requests.filter((r) => r.status === 'Submitted').length} Pending)
          </button>
          <button
            onClick={() => setActiveTab('catalogue')}
            className={`px-4 py-2 rounded-md font-bold text-xs uppercase tracking-wide transition cursor-pointer ${
              activeTab === 'catalogue'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Stock Catalogue &amp; Par Levels
          </button>
        </div>

        <span className="text-xs text-slate-500 font-medium">
          Logged in: <strong>{currentUsername}</strong> ({userRole})
        </span>
      </div>

      {activeTab === 'requests' ? (
        <>
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 flex-1 min-w-[240px]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by SR number, ambulance, paramedic..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none"
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="py-1.5 px-3 bg-slate-50 border border-slate-300 rounded font-semibold"
              >
                <option value="ALL">All Statuses</option>
                <option value="Submitted">Submitted (Pending)</option>
                <option value="Approved">Approved</option>
                <option value="Issued">Issued (Restocked)</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div className="text-slate-500">
              Showing <strong>{filteredRequests.length}</strong> requisitions
            </div>
          </div>

          {/* Requests Table */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900 text-slate-200 uppercase tracking-wider font-semibold text-[11px]">
                  <tr>
                    <th className="py-3 px-3">Req #</th>
                    <th className="py-3 px-3">Ambulance</th>
                    <th className="py-3 px-3">Requester</th>
                    <th className="py-3 px-3">Date / Urgency</th>
                    <th className="py-3 px-3">Linked ePRF</th>
                    <th className="py-3 px-3">Items Summary</th>
                    <th className="py-3 px-3">Controlled</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 font-medium">
                        No stock requests found.
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((req) => {
                      const hasControlled = req.lines.some((l) => l.isControlled);
                      const isPending = req.status === 'Submitted';

                      return (
                        <tr
                          key={req.id}
                          className={`hover:bg-slate-50 transition ${
                            isPending ? 'bg-amber-50/40' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 font-mono font-bold text-red-600">
                            {req.id}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900">{req.ambulance}</div>
                            <div className="text-[10px] text-slate-500">{req.base}</div>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-800">
                            {req.requesterName}
                          </td>
                          <td className="py-2.5 px-3">
                            <div>{formatDateSA(req.requestedAt.split('T')[0])}</div>
                            <span
                              className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                req.urgency.includes('Urgent')
                                  ? 'bg-red-600 text-white animate-pulse'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {req.urgency}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                            {req.linkedEprf || '—'}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-slate-800">
                              {req.lines.length} items
                            </span>
                            <div className="text-[10px] text-slate-500 truncate max-w-[160px]">
                              {req.lines.map((l) => `${l.requestedQty}x ${l.itemName}`).join(', ')}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            {hasControlled ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-700 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded">
                                <ShieldAlert className="w-3 h-3 text-amber-600" />
                                <span>SCHED 5/6</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">No</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                req.status === 'Issued'
                                  ? 'bg-emerald-600 text-white'
                                  : req.status === 'Approved'
                                  ? 'bg-blue-600 text-white'
                                  : req.status === 'Rejected'
                                  ? 'bg-red-600 text-white'
                                  : 'bg-amber-400 text-slate-900 animate-pulse'
                              }`}
                            >
                              {req.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Print Picking Slip */}
                              <button
                                onClick={() => setPrintRequest(req)}
                                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition cursor-pointer"
                                title="Print / PDF Picking Slip"
                              >
                                <Printer className="w-4 h-4" />
                              </button>

                              {/* Manage / Issue Button */}
                              <button
                                onClick={() => openActionModal(req)}
                                className="px-2.5 py-1 bg-slate-900 hover:bg-red-600 text-white rounded font-bold text-[11px] transition shadow cursor-pointer"
                              >
                                Process Order
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* STOCK CATALOGUE & MINIMUM LEVELS TAB */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm uppercase tracking-wide font-heading">
                South African Ambulance Stock Catalogue ({stockCatalogue.length} Items)
              </h3>
              <span className="text-xs text-slate-400">Appendix A Pre-loaded Master</span>
            </div>

            <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-200 text-xs">
              {stockCatalogue.map((item) => (
                <div key={item.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                  <div>
                    <div className="font-bold text-slate-900">{item.name}</div>
                    <div className="text-[11px] text-slate-500">
                      Category: {item.category} · Unit: <strong>{item.unit}</strong>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {item.isControlled && (
                      <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded border border-amber-300">
                        Controlled S5/6
                      </span>
                    )}
                    <span className="text-slate-600 font-mono-data font-semibold">
                      Min Par: {item.minLevel}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add New Catalogue Item Form */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 h-fit space-y-3 text-xs">
            <h3 className="font-bold text-sm uppercase tracking-wide text-slate-800 font-heading">
              Add New Catalogue Item
            </h3>
            <p className="text-slate-500 text-[11px]">
              Add a new item to the master list. It will immediately appear in the paramedic mobile app.
            </p>
            <form onSubmit={handleAddCatalogueItem} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1 text-[10px]">
                  Category
                </label>
                <select
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded p-1.5"
                >
                  <option value="Airway & breathing">Airway &amp; breathing</option>
                  <option value="Cardiac & monitoring">Cardiac &amp; monitoring</option>
                  <option value="IV access & fluids">IV access &amp; fluids</option>
                  <option value="Medication — basic/ILS">Medication — basic/ILS</option>
                  <option value="Medication — ALS">Medication — ALS</option>
                  <option value="Medication — controlled (Schedule 5/6)">
                    Medication — controlled (Schedule 5/6)
                  </option>
                  <option value="Trauma & wound care">Trauma &amp; wound care</option>
                  <option value="Immobilisation">Immobilisation</option>
                  <option value="Maternity & neonatal">Maternity &amp; neonatal</option>
                  <option value="PPE & infection control">PPE &amp; infection control</option>
                  <option value="Patient comfort & general">Patient comfort &amp; general</option>
                  <option value="Vehicle & equipment">Vehicle &amp; equipment</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1 text-[10px]">
                  Item Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Chest Seal Vented 2-Pack"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded p-1.5"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1 text-[10px]">
                    Unit
                  </label>
                  <input
                    type="text"
                    placeholder="each, box, vial"
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-1.5"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1 text-[10px]">
                    Min Level (Par)
                  </label>
                  <input
                    type="number"
                    value={newItemMin}
                    onChange={(e) => setNewItemMin(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="ctrl-cb"
                  checked={newItemControlled}
                  onChange={(e) => setNewItemControlled(e.target.checked)}
                  className="rounded text-red-600 focus:ring-red-500"
                />
                <label htmlFor="ctrl-cb" className="font-bold text-slate-700 cursor-pointer">
                  Schedule 5/6 Controlled Drug
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded shadow transition cursor-pointer"
              >
                + Add Item to Master Catalogue
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PROCESS / ISSUE REQUISITION MODAL */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full shadow-2xl border border-slate-300 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-red-700">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-red-500" />
                <h3 className="font-bold text-base font-heading">
                  Process Order — {selectedRequest.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-slate-300 hover:text-white text-lg font-bold px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded border border-slate-200">
                <div>
                  <span className="text-slate-500 block">Ambulance</span>
                  <span className="font-bold text-slate-900 font-mono text-sm">
                    {selectedRequest.ambulance}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Requester</span>
                  <span className="font-semibold text-slate-800">
                    {selectedRequest.requesterName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Base / Shift</span>
                  <span className="font-semibold text-slate-800">
                    {selectedRequest.base} ({selectedRequest.shift})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Urgency</span>
                  <span className="font-bold text-red-600">{selectedRequest.urgency}</span>
                </div>
              </div>

              {selectedRequest.controlledReason && (
                <div className="bg-amber-50 border-2 border-amber-400 p-3 rounded text-amber-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span>Controlled Drug Requisition Verification</span>
                  </div>
                  <p>
                    HPCSA Number: <strong>{selectedRequest.hpcsaNumber}</strong>
                  </p>
                  <p>
                    Clinical Reason: <em>"{selectedRequest.controlledReason}"</em>
                  </p>
                  <span className="text-[10px] text-amber-700 block font-semibold">
                    Ensure physical safe register page is counter-signed before handing over keys/ampoules.
                  </span>
                </div>
              )}

              {/* Items Table with Quantity Issued inputs */}
              <div className="border border-slate-200 rounded overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2 px-3">Item Description</th>
                      <th className="py-2 px-3 text-center">Requested</th>
                      <th className="py-2 px-3 text-center">Issued Qty</th>
                      <th className="py-2 px-3">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {selectedRequest.lines.map((line) => (
                      <tr key={line.itemId}>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-slate-900">{line.itemName}</span>
                          {line.isControlled && (
                            <span className="ml-1 text-[10px] bg-amber-100 text-amber-800 font-bold px-1 rounded">
                              Schedule 5/6
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">
                          {line.requestedQty}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max={line.requestedQty * 2}
                            value={issuedQuantities[line.itemId] ?? line.requestedQty}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10) || 0;
                              setIssuedQuantities({
                                ...issuedQuantities,
                                [line.itemId]: val,
                              });
                            }}
                            className="w-16 px-2 py-1 border border-slate-300 rounded text-center font-mono font-bold text-slate-900 bg-amber-50 focus:bg-white"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 font-medium">{line.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedRequest.customItemsNote && (
                <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                  <span className="font-bold text-slate-600 block mb-0.5">Custom Unlisted Items:</span>
                  <p className="text-slate-800 italic">{selectedRequest.customItemsNote}</p>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Stock Controller Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Issued from Main Base safe, restocked into vehicle jump kit..."
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-xs"
                />
              </div>

              {/* History trail */}
              <div className="bg-slate-100 p-2.5 rounded text-[11px] space-y-1">
                <span className="font-bold text-slate-600 block uppercase text-[10px]">
                  Audit Workflow History:
                </span>
                {selectedRequest.actionHistory.map((h, i) => (
                  <div key={i} className="text-slate-600 flex justify-between">
                    <span>• {h.action}</span>
                    <span className="text-slate-400">{new Date(h.timestamp).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-100 p-3 flex items-center justify-between border-t border-slate-200">
              <button
                onClick={() => setPrintRequest(selectedRequest)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Picking Slip</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExecuteAction('Rejected')}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold transition cursor-pointer"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleExecuteAction('Approved')}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold transition cursor-pointer"
                >
                  Approve Order
                </button>
                <button
                  onClick={() => handleExecuteAction('Issued')}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold shadow transition cursor-pointer"
                >
                  Issue Stock to Vehicle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE PICKING SLIP VIEW */}
      {printRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-xl w-full shadow-2xl p-6 border border-slate-300 overflow-y-auto max-h-[90vh]">
            {/* Header */}
            <div className="border-b-2 border-slate-900 pb-3 mb-4 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-black font-heading tracking-wide uppercase text-slate-900">
                  ResQ EMS — Warehouse Picking Slip
                </h2>
                <div className="text-xs text-slate-600">
                  Vehicle Restock &amp; Drug Requisition Log
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono font-black text-lg text-red-600">{printRequest.id}</div>
                <div className="text-xs text-slate-500">
                  {formatDateSA(printRequest.requestedAt.split('T')[0])}
                </div>
              </div>
            </div>

            {/* Slip Meta */}
            <div className="grid grid-cols-2 gap-3 text-xs mb-4 p-3 bg-slate-50 rounded border border-slate-200">
              <div>
                <span className="text-slate-500 block">Ambulance Unit:</span>
                <span className="font-black text-slate-900 text-sm font-mono">
                  {printRequest.ambulance}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Station Base:</span>
                <span className="font-bold text-slate-800">{printRequest.base}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Requester:</span>
                <span className="font-semibold text-slate-800">{printRequest.requesterName}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Linked ePRF:</span>
                <span className="font-bold font-mono text-slate-900">
                  {printRequest.linkedEprf || 'None (Routine)'}
                </span>
              </div>
            </div>

            {/* Picking Checklist */}
            <table className="w-full text-left text-xs border border-slate-300 mb-4">
              <thead className="bg-slate-800 text-white font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-1.5 px-2 w-8 text-center">Pick</th>
                  <th className="py-1.5 px-2">Item Description</th>
                  <th className="py-1.5 px-2 text-center">Req</th>
                  <th className="py-1.5 px-2 text-center">Issued</th>
                  <th className="py-1.5 px-2">Unit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {printRequest.lines.map((l, idx) => (
                  <tr key={idx}>
                    <td className="py-2 px-2 text-center">
                      <div className="w-4 h-4 border border-slate-400 rounded-xs mx-auto"></div>
                    </td>
                    <td className="py-2 px-2 font-medium">
                      {l.itemName}
                      {l.isControlled && ' (⚠️ SCHED 5/6 CONTROLLED)'}
                    </td>
                    <td className="py-2 px-2 text-center font-mono font-bold">
                      {l.requestedQty}
                    </td>
                    <td className="py-2 px-2 text-center font-mono font-bold">
                      {l.issuedQty ?? '___'}
                    </td>
                    <td className="py-2 px-2 text-slate-500">{l.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {printRequest.controlledReason && (
              <div className="mb-4 p-2.5 bg-amber-50 border border-amber-300 rounded text-xs text-amber-900">
                <strong>Controlled Drug Protocol:</strong> HPCSA #{printRequest.hpcsaNumber} ·
                Reason: {printRequest.controlledReason}
              </div>
            )}

            {/* Sign-off Boxes */}
            <div className="grid grid-cols-2 gap-4 text-xs pt-4 border-t border-slate-300 mt-6">
              <div className="border border-slate-300 p-3 rounded">
                <span className="text-[10px] text-slate-500 uppercase block mb-6">
                  Issued By (Warehouse Controller):
                </span>
                <div className="border-b border-slate-400 mb-1"></div>
                <div className="text-[10px] text-slate-400">Signature &amp; Date</div>
              </div>
              <div className="border border-slate-300 p-3 rounded">
                <span className="text-[10px] text-slate-500 uppercase block mb-6">
                  Received By (Paramedic / Crew):
                </span>
                <div className="border-b border-slate-400 mb-1"></div>
                <div className="text-[10px] text-slate-400">Signature &amp; HPCSA #</div>
              </div>
            </div>

            <div className="mt-6 flex justify-between items-center no-print">
              <button
                onClick={() => setPrintRequest(null)}
                className="px-4 py-2 border border-slate-300 rounded text-slate-700 font-semibold text-xs cursor-pointer"
              >
                Close Slip
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-xs shadow cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Slip (Ctrl+P)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
