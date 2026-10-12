import React, { useState, useMemo } from 'react';
import { Trip, UserRole, BillingType } from '../types';
import { formatDateSA, formatMinutesToHMM } from '../utils/timeCalculations';
import { Storage } from '../utils/storage';
import { BILLING_COLORS, PRIORITY_COLORS } from './TripForm';
import {
  Search,
  Filter,
  Edit2,
  Trash2,
  Eye,
  Download,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { exportTripsToCsv } from '../utils/excelExport';

interface TripLogTableProps {
  trips: Trip[];
  userRole: UserRole;
  currentUsername: string;
  onEditTrip: (trip: Trip) => void;
  onRefresh: () => void;
}

export const TripLogTable: React.FC<TripLogTableProps> = ({
  trips,
  userRole,
  currentUsername,
  onEditTrip,
  onRefresh,
}) => {
  const settings = Storage.getSettings();

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAmbulance, setFilterAmbulance] = useState('ALL');
  const [filterBase, setFilterBase] = useState('ALL');
  const [filterBilling, setFilterBilling] = useState('ALL');
  const [filterCallType, setFilterCallType] = useState('ALL');
  const [filterColourCode, setFilterColourCode] = useState('ALL');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Pagination & sorting
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;
  const [sortField, setSortField] = useState<keyof Trip>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modal states
  const [viewTrip, setViewTrip] = useState<Trip | null>(null);
  const [deleteTripId, setDeleteTripId] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Office inline edit modal
  const [billingEditTrip, setBillingEditTrip] = useState<Trip | null>(null);
  const [editBillingType, setEditBillingType] = useState<BillingType>('MED AID');
  const [editSchemeName, setEditSchemeName] = useState('');

  // Filter non-deleted trips
  const activeTrips = useMemo(() => {
    return trips.filter((t) => !t.isDeleted);
  }, [trips]);

  const filteredTrips = useMemo(() => {
    return activeTrips.filter((t) => {
      // Search text matches ePRF, ambulance, colour code, or crew
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesQuery =
          t.eprfFormatted.toLowerCase().includes(query) ||
          t.ambulance.toLowerCase().includes(query) ||
          (t.colourCodeOrHospital && t.colourCodeOrHospital.toLowerCase().includes(query)) ||
          t.crewMembers.some((c) => c.toLowerCase().includes(query)) ||
          (t.medicalSchemeName && t.medicalSchemeName.toLowerCase().includes(query));
        if (!matchesQuery) return false;
      }

      if (filterAmbulance !== 'ALL' && t.ambulance !== filterAmbulance) return false;
      if (filterBase !== 'ALL' && t.base !== filterBase) return false;
      if (filterBilling !== 'ALL' && t.billingType !== filterBilling) return false;
      if (filterCallType !== 'ALL' && t.callType !== filterCallType) return false;
      if (filterColourCode !== 'ALL' && t.colourCodeOrHospital !== filterColourCode) return false;
      if (filterDateFrom && t.date < filterDateFrom) return false;
      if (filterDateTo && t.date > filterDateTo) return false;

      return true;
    });
  }, [
    activeTrips,
    searchTerm,
    filterAmbulance,
    filterBase,
    filterBilling,
    filterCallType,
    filterColourCode,
    filterDateFrom,
    filterDateTo,
  ]);

  // Sort
  const sortedTrips = useMemo(() => {
    return [...filteredTrips].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === 'times') {
        valA = a.times.timeReceived;
        valB = b.times.timeReceived;
      }

      if (valA === undefined) return 1;
      if (valB === undefined) return -1;

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortOrder === 'asc' ? (valA > valB ? 1 : -1) : valA < valB ? 1 : -1;
    });
  }, [filteredTrips, sortField, sortOrder]);

  // Paginate
  const totalPages = Math.ceil(sortedTrips.length / pageSize) || 1;
  const paginatedTrips = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedTrips.slice(start, start + pageSize);
  }, [sortedTrips, currentPage]);

  const toggleSort = (field: keyof Trip) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleDeleteSubmit = () => {
    if (!deleteReason.trim()) {
      setDeleteError('Please provide a mandatory audit reason for deletion.');
      return;
    }
    if (deleteTripId) {
      Storage.deleteTrip(deleteTripId, deleteReason.trim(), currentUsername);
      setDeleteTripId(null);
      setDeleteReason('');
      setDeleteError(null);
      onRefresh();
    }
  };

  const handleSaveBillingUpdate = () => {
    if (!billingEditTrip) return;
    const updated: Trip = {
      ...billingEditTrip,
      billingType: editBillingType,
      medicalSchemeName: editBillingType === 'MED AID' ? editSchemeName : undefined,
      updatedAt: new Date().toISOString(),
    };
    Storage.saveTrip(updated, currentUsername);
    setBillingEditTrip(null);
    onRefresh();
  };

  return (
    <div className="space-y-4">
      {/* Top Filter Bar */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search ePRF, ambulance, colour code, crew..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>

          {/* Ambulance Filter */}
          <div>
            <select
              value={filterAmbulance}
              onChange={(e) => {
                setFilterAmbulance(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-1.5 px-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none"
            >
              <option value="ALL">All Ambulances</option>
              {settings.ambulances.map((amb) => (
                <option key={amb.id} value={amb.fleetNo}>
                  {amb.fleetNo} ({amb.registration})
                </option>
              ))}
            </select>
          </div>

          {/* Base Filter */}
          <div>
            <select
              value={filterBase}
              onChange={(e) => {
                setFilterBase(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-1.5 px-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none"
            >
              <option value="ALL">All Bases</option>
              {settings.bases.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Billing Type Filter */}
          <div>
            <select
              value={filterBilling}
              onChange={(e) => {
                setFilterBilling(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-1.5 px-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none"
            >
              <option value="ALL">All Billing Types</option>
              <option value="MED AID">MED AID (Red)</option>
              <option value="PRIVATE">PRIVATE (Purple)</option>
              <option value="WCA">WCA (Pink)</option>
              <option value="RAF DOA">RAF DOA (Blue)</option>
              <option value="INDIGENT">INDIGENT (Yellow)</option>
              <option value="NSR">NSR (Grey)</option>
              <option value="RHT">RHT (Green)</option>
            </select>
          </div>

          {/* Call Type Filter */}
          <div>
            <select
              value={filterCallType}
              onChange={(e) => {
                setFilterCallType(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-1.5 px-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none"
            >
              <option value="ALL">All Call Types</option>
              <option value="PRIM">PRIM (Scene)</option>
              <option value="IHT">IHT (Transfer)</option>
              <option value="IFT">IFT</option>
              <option value="DISCHARGE">DISCHARGE</option>
            </select>
          </div>

          {/* Colour Code / Destination Filter */}
          <div>
            <select
              value={filterColourCode}
              onChange={(e) => {
                setFilterColourCode(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-1.5 px-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none"
            >
              <option value="ALL">All Colour Codes</option>
              {settings.colourCodes?.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date range filter and quick action buttons */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600">Date Range:</span>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="px-2 py-1 bg-slate-50 border border-slate-300 rounded text-slate-800"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="px-2 py-1 bg-slate-50 border border-slate-300 rounded text-slate-800"
            />
            {(filterDateFrom || filterDateTo || searchTerm || filterAmbulance !== 'ALL' || filterBilling !== 'ALL' || filterColourCode !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterAmbulance('ALL');
                  setFilterBase('ALL');
                  setFilterBilling('ALL');
                  setFilterCallType('ALL');
                  setFilterColourCode('ALL');
                  setFilterDateFrom('');
                  setFilterDateTo('');
                  setCurrentPage(1);
                }}
                className="text-red-600 hover:text-red-700 font-semibold underline ml-2 cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-500 font-medium">
              Showing <strong>{filteredTrips.length}</strong> of <strong>{activeTrips.length}</strong> trips
            </span>
            <button
              onClick={() => exportTripsToCsv(filteredTrips)}
              className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-semibold border border-slate-300 transition cursor-pointer"
              title="Export current filtered view to CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Trip Log Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-900 text-slate-200 uppercase tracking-wider font-heading font-semibold text-[11px] border-b border-slate-700">
              <tr>
                <th
                  onClick={() => toggleSort('ambulance')}
                  className="py-3 px-3 cursor-pointer hover:text-white"
                >
                  Ambulance
                </th>
                <th
                  onClick={() => toggleSort('date')}
                  className="py-3 px-3 cursor-pointer hover:text-white"
                >
                  Date / Shift
                </th>
                <th
                  onClick={() => toggleSort('eprfNumber')}
                  className="py-3 px-3 cursor-pointer hover:text-white"
                >
                  ePRF #
                </th>
                <th className="py-3 px-3">Level</th>
                <th
                  onClick={() => toggleSort('billingType')}
                  className="py-3 px-3 cursor-pointer hover:text-white"
                >
                  Billing Type
                </th>
                <th className="py-3 px-3">Call / Priority</th>
                <th className="py-3 px-3">Colour Code / Which Hospital</th>
                <th className="py-3 px-3">Times &amp; Duration</th>
                <th className="py-3 px-3">Outcome</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginatedTrips.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400 font-medium">
                    No trips found matching the selected filters.
                  </td>
                </tr>
              ) : (
                paginatedTrips.map((trip) => {
                  const billStyle = BILLING_COLORS[trip.billingType] || BILLING_COLORS['MED AID'];
                  const prioStyle = PRIORITY_COLORS[trip.priority] || PRIORITY_COLORS.Red;

                  return (
                    <tr
                      key={trip.id}
                      className="hover:bg-slate-50 transition border-b border-slate-100 group"
                    >
                      {/* Ambulance */}
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 font-mono-data text-xs">
                          {trip.ambulance}
                        </div>
                        <div className="text-[10px] text-slate-500">{trip.base}</div>
                      </td>

                      {/* Date / Shift */}
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-800">{formatDateSA(trip.date)}</div>
                        <span className="inline-block text-[10px] text-slate-500 font-mono-data">
                          {trip.shift} Shift
                        </span>
                      </td>

                      {/* ePRF # */}
                      <td className="py-2.5 px-3">
                        <div className="font-mono-data font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300 inline-block">
                          {trip.eprfFormatted}
                        </div>
                        {trip.cadNumber && (
                          <div className="text-[10px] text-slate-400 font-mono-data">
                            {trip.cadNumber}
                          </div>
                        )}
                      </td>

                      {/* Level of Care */}
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-slate-700 bg-slate-200/80 px-1.5 py-0.5 rounded text-[10px]">
                          {trip.levelOfCare}
                        </span>
                      </td>

                      {/* Billing Type (Coloured Badge) */}
                      <td className="py-2.5 px-3">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase shadow-2xs ${billStyle.bg} ${billStyle.text}`}
                          >
                            {trip.billingType}
                          </span>
                          {trip.medicalSchemeName && (
                            <span className="text-[10px] text-slate-600 truncate max-w-[140px]" title={trip.medicalSchemeName}>
                              {trip.medicalSchemeName}
                            </span>
                          )}
                          {/* Office quick-edit link */}
                          {userRole === 'Office' && (
                            <button
                              onClick={() => {
                                setBillingEditTrip(trip);
                                setEditBillingType(trip.billingType);
                                setEditSchemeName(trip.medicalSchemeName || '');
                              }}
                              className="text-[10px] text-blue-600 hover:underline font-medium cursor-pointer"
                            >
                              Edit Billing
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Call Type & Priority */}
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-800 text-[11px]">{trip.callType}</div>
                        <span
                          className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold ${prioStyle.bg}`}
                        >
                          {trip.priority}
                        </span>
                      </td>

                      {/* Colour Code / Which Hospital */}
                      <td className="py-2.5 px-3 max-w-[200px]">
                        {(() => {
                          const raw = trip.colourCodeOrHospital || trip.hospital || '—';
                          const parts = raw.split(' · ');
                          const code = parts[0] || '';
                          const hosp = parts.length > 1 ? parts[1] : (trip.hospital && trip.hospital !== code ? trip.hospital : '');

                          const getCodeStyle = (c: string) => {
                            if (c.includes('Green')) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
                            if (c.includes('Yellow')) return 'bg-amber-100 text-amber-900 border-amber-300';
                            if (c.includes('Red')) return 'bg-red-100 text-red-800 border-red-300';
                            if (c.includes('Orange')) return 'bg-orange-100 text-orange-900 border-orange-300';
                            if (c.includes('Blue')) return 'bg-blue-100 text-blue-800 border-blue-300';
                            return 'bg-slate-100 text-slate-800 border-slate-300';
                          };

                          return (
                            <div className="space-y-1">
                              {code.startsWith('X1') ? (
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${getCodeStyle(code)}`}>
                                  {code}
                                </span>
                              ) : (
                                <span className="text-xs font-bold text-slate-900 font-mono-data">{code}</span>
                              )}
                              {hosp && (
                                <div className="text-xs font-bold text-slate-800 truncate" title={hosp}>
                                  {hosp}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* Times & Intervals */}
                      <td className="py-2.5 px-3 font-mono-data">
                        <div className="text-slate-800 text-[11px]">
                          {trip.times.timeReceived} → {trip.times.timeAtHospital}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Resp: {trip.calculatedTimes.responseMinutes}m | Call:{' '}
                          <strong>{trip.calculatedTimes.totalCallMinutes}m</strong>
                        </div>
                      </td>

                      {/* Outcome */}
                      <td className="py-2.5 px-3">
                        <span className="inline-block text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          {trip.outcome}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewTrip(trip)}
                            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition cursor-pointer"
                            title="View Trip Summary"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {(userRole === 'Admin' || userRole === 'Dispatcher') && (
                            <button
                              onClick={() => onEditTrip(trip)}
                              className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition cursor-pointer"
                              title="Edit Trip Details"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}

                          {userRole === 'Admin' && (
                            <button
                              onClick={() => {
                                setDeleteTripId(trip.id);
                                setDeleteReason('');
                                setDeleteError(null);
                              }}
                              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition cursor-pointer"
                              title="Soft Delete (Admin with Reason)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded font-medium disabled:opacity-40 hover:bg-slate-100 transition cursor-pointer"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded font-medium disabled:opacity-40 hover:bg-slate-100 transition cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* VIEW TRIP DETAILS MODAL */}
      {viewTrip && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full shadow-2xl border border-slate-300 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-red-700">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-red-600 rounded font-mono-data font-bold text-sm">
                  {viewTrip.eprfFormatted}
                </span>
                <h3 className="font-bold text-base font-heading">Trip Full Clinical Record</h3>
              </div>
              <button
                onClick={() => setViewTrip(null)}
                className="text-slate-300 hover:text-white text-lg font-bold px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded border border-slate-200">
                <div>
                  <span className="text-slate-500 block">Ambulance</span>
                  <span className="font-bold text-slate-900 text-sm">{viewTrip.ambulance}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Base</span>
                  <span className="font-semibold text-slate-800">{viewTrip.base}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Date &amp; Shift</span>
                  <span className="font-semibold text-slate-800">
                    {formatDateSA(viewTrip.date)} ({viewTrip.shift})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">CAD Call #</span>
                  <span className="font-mono-data font-semibold text-slate-800">
                    {viewTrip.cadNumber || '—'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-slate-500 block">Level of Care</span>
                  <span className="font-bold text-slate-800">{viewTrip.levelOfCare}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Billing Type</span>
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                      BILLING_COLORS[viewTrip.billingType]?.bg
                    } ${BILLING_COLORS[viewTrip.billingType]?.text}`}
                  >
                    {viewTrip.billingType}
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-500 block">Scheme / Claim Reference</span>
                  <span className="font-semibold text-slate-800">
                    {viewTrip.medicalSchemeName || 'Not specified'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-100 rounded border border-slate-200">
                <span className="text-slate-500 block mb-1 font-bold">Crew Members:</span>
                <div className="flex flex-wrap gap-1.5">
                  {viewTrip.crewMembers.map((c, i) => (
                    <span key={i} className="px-2 py-0.5 bg-white rounded border border-slate-300 font-semibold text-slate-800">
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-slate-500 block">Colour Code / Which Hospital</span>
                <p className="font-bold text-slate-900 text-sm mt-0.5">
                  {viewTrip.colourCodeOrHospital || viewTrip.hospital}
                </p>
              </div>

              {/* Timeline Table */}
              <div className="border border-slate-200 rounded overflow-hidden">
                <table className="w-full text-center">
                  <thead className="bg-slate-200 text-slate-700 font-bold text-[10px] uppercase">
                    <tr>
                      <th className="py-1 px-2">Dispatched</th>
                      <th className="py-1 px-2">Mobile</th>
                      <th className="py-1 px-2">At Scene</th>
                      <th className="py-1 px-2">At Hospital</th>
                      <th className="py-1 px-2">Available</th>
                    </tr>
                  </thead>
                  <tbody className="divide-x divide-slate-200 font-mono-data font-bold text-slate-900 bg-white">
                    <tr>
                      <td className="py-2">{viewTrip.times.timeReceived}</td>
                      <td className="py-2">{viewTrip.times.timeMobile}</td>
                      <td className="py-2">{viewTrip.times.timeAtScene || '—'}</td>
                      <td className="py-2">{viewTrip.times.timeAtHospital}</td>
                      <td className="py-2">{viewTrip.times.timeAvailable}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Calculated Intervals */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-slate-50 p-2 rounded border">
                  <span className="text-[10px] text-slate-500 block uppercase">Response</span>
                  <span className="font-bold font-mono-data text-blue-700">
                    {viewTrip.calculatedTimes.responseMinutes} min
                  </span>
                </div>
                <div className="bg-slate-50 p-2 rounded border">
                  <span className="text-[10px] text-slate-500 block uppercase">Travel</span>
                  <span className="font-bold font-mono-data text-slate-800">
                    {viewTrip.calculatedTimes.travelMinutes} min
                  </span>
                </div>
                <div className="bg-slate-50 p-2 rounded border">
                  <span className="text-[10px] text-slate-500 block uppercase">Turnaround</span>
                  <span className="font-bold font-mono-data text-amber-600">
                    {viewTrip.calculatedTimes.turnaroundMinutes} min
                  </span>
                </div>
                <div className="bg-red-50 p-2 rounded border border-red-200">
                  <span className="text-[10px] text-red-700 block uppercase">Total Call</span>
                  <span className="font-black font-mono-data text-red-700">
                    {viewTrip.calculatedTimes.totalCallMinutes} min ({formatMinutesToHMM(viewTrip.calculatedTimes.totalCallMinutes)})
                  </span>
                </div>
              </div>

              {/* Odometer & Outcome */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                <div>
                  <span className="text-slate-500 block">Distance Log</span>
                  <span className="font-medium text-slate-800">
                    {viewTrip.kmStart ? `${viewTrip.kmStart} km → ${viewTrip.kmEnd} km (${viewTrip.distanceKm} km travelled)` : 'No odometer logged'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Outcome</span>
                  <span className="font-bold text-slate-900">{viewTrip.outcome}</span>
                </div>
              </div>

              {viewTrip.notes && (
                <div className="bg-amber-50/70 p-3 rounded border border-amber-200">
                  <span className="text-slate-600 font-bold block mb-0.5">Clinical &amp; Dispatch Notes:</span>
                  <p className="text-slate-800 whitespace-pre-wrap">{viewTrip.notes}</p>
                </div>
              )}
            </div>

            <div className="bg-slate-100 p-3 text-right border-t">
              <button
                onClick={() => setViewTrip(null)}
                className="px-4 py-1.5 bg-slate-800 text-white rounded font-semibold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN SOFT DELETE MODAL WITH MANDATORY REASON */}
      {deleteTripId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full shadow-2xl p-5 border border-red-200 space-y-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-base">Soft Delete Trip Record</h3>
            </div>
            <p className="text-xs text-slate-600">
              In accordance with EMS regulations and POPIA compliance, trips are soft-deleted and an audit log entry will be permanently recorded.
            </p>

            {deleteError && (
              <div className="p-2 bg-red-50 text-red-700 text-xs font-semibold rounded">
                {deleteError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Mandatory Reason for Deletion <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Test duplicate call entered in error, confirmed with dispatcher..."
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
              ></textarea>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setDeleteTripId(null);
                  setDeleteReason('');
                  setDeleteError(null);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSubmit}
                className="px-4 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded transition shadow cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OFFICE BILLING QUICK EDIT MODAL */}
      {billingEditTrip && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full shadow-2xl p-5 border border-slate-300 space-y-4">
            <h3 className="font-bold text-base text-slate-900 font-heading">
              Update Billing Fields — {billingEditTrip.eprfFormatted}
            </h3>
            <p className="text-xs text-slate-500">
              Billing/Office role permission: Update billing category and scheme name without altering clinical times.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Billing Type
              </label>
              <select
                value={editBillingType}
                onChange={(e) => setEditBillingType(e.target.value as BillingType)}
                className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-xs font-bold text-slate-800"
              >
                <option value="MED AID">MED AID (Red)</option>
                <option value="PRIVATE">PRIVATE (Purple)</option>
                <option value="WCA">WCA (Pink)</option>
                <option value="RAF DOA">RAF DOA (Blue)</option>
                <option value="INDIGENT">INDIGENT (Yellow)</option>
                <option value="NSR">NSR (Grey)</option>
                <option value="RHT">RHT (Green)</option>
              </select>
            </div>

            {editBillingType === 'MED AID' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Medical Aid / Scheme
                </label>
                <input
                  type="text"
                  placeholder="e.g. Discovery Health / GEMS"
                  value={editSchemeName}
                  onChange={(e) => setEditSchemeName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-xs text-slate-800"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setBillingEditTrip(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBillingUpdate}
                className="px-4 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded cursor-pointer"
              >
                Save Billing Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
