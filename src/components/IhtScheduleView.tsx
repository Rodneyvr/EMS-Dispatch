import React, { useState, useMemo } from 'react';
import { PreBookedTrip, UserRole, BookingStatus, LevelOfCare, CallType, BillingType } from '../types';
import { Storage, playAlertSound } from '../utils/storage';
import { formatDateSA } from '../utils/timeCalculations';
import { DEFAULT_HOSPITALS, DEFAULT_COLOUR_CODES } from '../data/seedData';
import {
  Calendar,
  Clock,
  PlusCircle,
  Search,
  Filter,
  CheckCircle,
  Truck,
  FileText,
  AlertTriangle,
  User as UserIcon,
  Phone,
  Building,
  Activity,
  CheckCircle2,
  Trash2,
  Edit2,
  Printer,
  X,
  Send,
  Shield,
  Layers,
  ChevronRight,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface IhtScheduleViewProps {
  userRole: UserRole;
  currentUsername: string;
  onRefresh: () => void;
  onNavigateToTripLog?: () => void;
}

export const IhtScheduleView: React.FC<IhtScheduleViewProps> = ({
  userRole,
  currentUsername,
  onRefresh,
  onNavigateToTripLog,
}) => {
  const [bookings, setBookings] = useState<PreBookedTrip[]>(() => Storage.getPreBookedTrips());
  const settings = Storage.getSettings();
  const availableHospitals = settings.hospitals && settings.hospitals.length > 0 ? settings.hospitals : DEFAULT_HOSPITALS;
  const availableColourCodes = settings.colourCodes && settings.colourCodes.length > 0 ? settings.colourCodes : DEFAULT_COLOUR_CODES;

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'tomorrow' | 'upcoming'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<PreBookedTrip | null>(null);
  const [viewingVoucher, setViewingVoucher] = useState<PreBookedTrip | null>(null);

  // Form State
  const [patientName, setPatientName] = useState('');
  const [patientIdOrDob, setPatientIdOrDob] = useState('');
  const [medicalAidName, setMedicalAidName] = useState('Discovery Health');
  const [medicalAidNumber, setMedicalAidNumber] = useState('');
  const [authorisationNumber, setAuthorisationNumber] = useState('');
  const [billingType, setBillingType] = useState<BillingType>('MED AID');
  const [callType, setCallType] = useState<CallType>('IHT');
  const [scheduledDate, setScheduledDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [scheduledTime, setScheduledTime] = useState('10:00');
  const [pickupLocation, setPickupLocation] = useState(availableHospitals[0] || 'MC Cape Gate');
  const [pickupWardRoom, setPickupWardRoom] = useState('Ward 2A Bed 4');
  const [destinationHospital, setDestinationHospital] = useState(availableHospitals[1] || 'NC Kuilsrivier');
  const [destinationWardRoom, setDestinationWardRoom] = useState('ICU Bed 2');
  const [colourCode, setColourCode] = useState(availableColourCodes[0] || 'X1 Green');
  const [levelOfCare, setLevelOfCare] = useState<LevelOfCare>('ILS');
  const [transportReason, setTransportReason] = useState('Specialist consultation & planned procedure transfer');
  const [oxygenRequired, setOxygenRequired] = useState(false);
  const [o2FlowLpm, setO2FlowLpm] = useState(4);
  const [stretcher, setStretcher] = useState(true);
  const [wheelchair, setWheelchair] = useState(false);
  const [isolation, setIsolation] = useState(false);
  const [icuMonitor, setIcuMonitor] = useState(false);
  const [ventilator, setVentilator] = useState(false);
  const [companionAllowed, setCompanionAllowed] = useState(false);
  const [contactPerson, setContactPerson] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [assignedAmbulance, setAssignedAmbulance] = useState('MR001');
  const [status, setStatus] = useState<BookingStatus>('Confirmed');
  const [notes, setNotes] = useState('');

  // Refresh bookings list
  const refreshList = () => {
    setBookings(Storage.getPreBookedTrips());
    onRefresh();
  };

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, []);

  // Filtered Bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          b.patientName.toLowerCase().includes(q) ||
          b.bookingRef.toLowerCase().includes(q) ||
          b.destinationHospital.toLowerCase().includes(q) ||
          b.pickupLocation.toLowerCase().includes(q) ||
          (b.medicalAidName && b.medicalAidName.toLowerCase().includes(q)) ||
          (b.authorisationNumber && b.authorisationNumber.toLowerCase().includes(q)) ||
          b.transportReason.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // Date Filter
      if (dateFilter === 'today' && b.scheduledDate !== todayStr) return false;
      if (dateFilter === 'tomorrow' && b.scheduledDate !== tomorrowStr) return false;
      if (dateFilter === 'upcoming' && b.scheduledDate < todayStr) return false;

      // Status
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;

      // Level of Care
      if (levelFilter !== 'all' && b.levelOfCare !== levelFilter) return false;

      return true;
    });
  }, [bookings, searchQuery, dateFilter, statusFilter, levelFilter, todayStr, tomorrowStr]);

  // Statistics
  const stats = useMemo(() => {
    const total = bookings.length;
    const todayCount = bookings.filter((b) => b.scheduledDate === todayStr).length;
    const pendingDispatch = bookings.filter(
      (b) => (b.status === 'Confirmed' || b.status === 'Scheduled') && b.scheduledDate === todayStr
    ).length;
    const dispatchedCount = bookings.filter((b) => b.status === 'Dispatched').length;
    return { total, todayCount, pendingDispatch, dispatchedCount };
  }, [bookings, todayStr]);

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingBooking(null);
    setPatientName('');
    setPatientIdOrDob('');
    setMedicalAidName('Discovery Health');
    setMedicalAidNumber('');
    setAuthorisationNumber('');
    setBillingType('MED AID');
    setCallType('IHT');
    setScheduledDate(todayStr);
    setScheduledTime('14:00');
    setPickupLocation(availableHospitals[0] || 'MC Cape Gate');
    setPickupWardRoom('Ward 3B Bed 12');
    setDestinationHospital(availableHospitals[5] || 'MC Paarl');
    setDestinationWardRoom('Specialist Unit');
    setColourCode(availableColourCodes[1] || 'X1 Yellow');
    setLevelOfCare('ILS');
    setTransportReason('Elective specialist consultation & transfer');
    setOxygenRequired(false);
    setO2FlowLpm(4);
    setStretcher(true);
    setWheelchair(false);
    setIsolation(false);
    setIcuMonitor(false);
    setVentilator(false);
    setCompanionAllowed(false);
    setContactPerson('Dr. van Zyl');
    setContactNumber('021 983 5600');
    setAssignedAmbulance('MR001');
    setStatus('Confirmed');
    setNotes('');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (b: PreBookedTrip) => {
    setEditingBooking(b);
    setPatientName(b.patientName);
    setPatientIdOrDob(b.patientIdOrDob || '');
    setMedicalAidName(b.medicalAidName || '');
    setMedicalAidNumber(b.medicalAidNumber || '');
    setAuthorisationNumber(b.authorisationNumber || '');
    setBillingType(b.billingType);
    setCallType(b.callType);
    setScheduledDate(b.scheduledDate);
    setScheduledTime(b.scheduledTime);
    setPickupLocation(b.pickupLocation);
    setPickupWardRoom(b.pickupWardRoom || '');
    setDestinationHospital(b.destinationHospital);
    setDestinationWardRoom(b.destinationWardRoom || '');
    setColourCode(b.colourCode);
    setLevelOfCare(b.levelOfCare);
    setTransportReason(b.transportReason);
    setOxygenRequired(b.specialRequirements.oxygenRequired || false);
    setO2FlowLpm(b.specialRequirements.o2FlowLpm || 4);
    setStretcher(b.specialRequirements.stretcher);
    setWheelchair(b.specialRequirements.wheelchair);
    setIsolation(b.specialRequirements.isolation);
    setIcuMonitor(b.specialRequirements.icuMonitor);
    setVentilator(b.specialRequirements.ventilator);
    setCompanionAllowed(b.specialRequirements.companionAllowed);
    setContactPerson(b.contactPerson || '');
    setContactNumber(b.contactNumber || '');
    setAssignedAmbulance(b.assignedAmbulance || 'MR001');
    setStatus(b.status);
    setNotes(b.notes || '');
    setIsModalOpen(true);
  };

  // Handle Save
  const handleSaveBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) {
      alert('Patient full name is required.');
      return;
    }

    const now = new Date().toISOString();

    if (editingBooking) {
      const updated: PreBookedTrip = {
        ...editingBooking,
        patientName: patientName.trim(),
        patientIdOrDob: patientIdOrDob.trim(),
        medicalAidName: medicalAidName.trim(),
        medicalAidNumber: medicalAidNumber.trim(),
        authorisationNumber: authorisationNumber.trim(),
        billingType,
        callType,
        scheduledDate,
        scheduledTime,
        pickupLocation,
        pickupWardRoom: pickupWardRoom.trim(),
        destinationHospital,
        destinationWardRoom: destinationWardRoom.trim(),
        colourCode,
        levelOfCare,
        transportReason: transportReason.trim(),
        specialRequirements: {
          oxygenRequired,
          o2FlowLpm: oxygenRequired ? o2FlowLpm : undefined,
          stretcher,
          wheelchair,
          isolation,
          icuMonitor,
          ventilator,
          companionAllowed,
        },
        contactPerson: contactPerson.trim(),
        contactNumber: contactNumber.trim(),
        assignedAmbulance,
        status,
        notes: notes.trim(),
        updatedAt: now,
      };

      Storage.updatePreBookedTrip(updated, currentUsername);
      playAlertSound('success');
    } else {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const newRef = `BK-26-${randomSuffix}`;
      const newBooking: PreBookedTrip = {
        id: `iht-${Date.now()}`,
        bookingRef: newRef,
        patientName: patientName.trim(),
        patientIdOrDob: patientIdOrDob.trim(),
        medicalAidName: medicalAidName.trim(),
        medicalAidNumber: medicalAidNumber.trim(),
        authorisationNumber: authorisationNumber.trim(),
        billingType,
        callType,
        scheduledDate,
        scheduledTime,
        pickupLocation,
        pickupWardRoom: pickupWardRoom.trim(),
        destinationHospital,
        destinationWardRoom: destinationWardRoom.trim(),
        colourCode,
        levelOfCare,
        transportReason: transportReason.trim(),
        specialRequirements: {
          oxygenRequired,
          o2FlowLpm: oxygenRequired ? o2FlowLpm : undefined,
          stretcher,
          wheelchair,
          isolation,
          icuMonitor,
          ventilator,
          companionAllowed,
        },
        contactPerson: contactPerson.trim(),
        contactNumber: contactNumber.trim(),
        assignedAmbulance,
        status,
        notes: notes.trim(),
        createdBy: currentUsername,
        createdAt: now,
        updatedAt: now,
      };

      Storage.addPreBookedTrip(newBooking, currentUsername);
      playAlertSound('success');
    }

    setIsModalOpen(false);
    refreshList();
  };

  // Dispatch Now
  const handleDispatchBooking = (booking: PreBookedTrip) => {
    if (booking.status === 'Dispatched') {
      alert(`Booking ${booking.bookingRef} has already been dispatched to an active trip.`);
      return;
    }

    if (
      confirm(
        `DISPATCH NOW: Convert pre-booked transfer for ${booking.patientName} into a live active CAD trip on ${booking.assignedAmbulance || 'MR001'}?`
      )
    ) {
      const res = Storage.dispatchPreBookedTrip(
        booking.id,
        currentUsername,
        booking.assignedAmbulance || 'MR001'
      );
      if (res.success && res.trip) {
        playAlertSound('urgent');
        alert(
          `SUCCESS: Pre-booked transfer dispatched!\n\nLinked ePRF: ${res.trip.eprfFormatted}\nAmbulance: ${res.trip.ambulance}\nPriority: ${res.trip.colourCodeOrHospital}\nDestination: ${res.trip.hospital}\n\nThis call is now actively tracked in the Trip Log.`
        );
        refreshList();
        if (onNavigateToTripLog) {
          onNavigateToTripLog();
        }
      } else {
        alert(`Dispatch failed: ${res.error || 'Unknown error'}`);
      }
    }
  };

  // Delete Booking
  const handleDeleteBooking = (id: string, ref: string, name: string) => {
    if (confirm(`Are you sure you want to delete pre-booking ${ref} for ${name}?`)) {
      Storage.deletePreBookedTrip(id, currentUsername);
      refreshList();
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Stats */}
      <div className="bg-black text-white p-4 sm:p-5 rounded-lg border-b-2 border-red-600 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-bold font-heading uppercase tracking-wide">
              Pre-Booked Patient Schedule &amp; IHT Transfers
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-600 text-white uppercase tracking-wider">
              Upfront Bookings
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Schedule elective inter-hospital transfers (IHT/IFT), discharges, and clinic transfers with pre-authorization and one-click CAD dispatch.
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2">
          {(userRole === 'Admin' || userRole === 'Dispatcher' || userRole === 'Management' || userRole === 'Office') && (
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded shadow transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Schedule Upfront Patient</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-lg border border-neutral-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
              Total Bookings
            </div>
            <div className="text-2xl font-black font-mono text-black">{stats.total}</div>
          </div>
          <div className="w-9 h-9 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-700">
            <Layers className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-neutral-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
              Today's Transfers
            </div>
            <div className="text-2xl font-black font-mono text-blue-600">{stats.todayCount}</div>
          </div>
          <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <Calendar className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-neutral-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
              Ready for Dispatch
            </div>
            <div className="text-2xl font-black font-mono text-amber-600">{stats.pendingDispatch}</div>
          </div>
          <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-neutral-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
              Dispatched to CAD
            </div>
            <div className="text-2xl font-black font-mono text-emerald-600">{stats.dispatchedCount}</div>
          </div>
          <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Truck className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-lg border border-neutral-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search patient name, booking ref, medical aid, hospital..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-300 rounded focus:bg-white focus:outline-none focus:border-red-600 font-medium"
          />
        </div>

        {/* Date Filter Tabs */}
        <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded border border-neutral-200">
          <button
            onClick={() => setDateFilter('all')}
            className={`px-3 py-1 font-bold rounded transition cursor-pointer ${
              dateFilter === 'all' ? 'bg-black text-white' : 'text-neutral-700 hover:text-black'
            }`}
          >
            All Dates
          </button>
          <button
            onClick={() => setDateFilter('today')}
            className={`px-3 py-1 font-bold rounded transition cursor-pointer ${
              dateFilter === 'today' ? 'bg-red-600 text-white' : 'text-neutral-700 hover:text-black'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setDateFilter('tomorrow')}
            className={`px-3 py-1 font-bold rounded transition cursor-pointer ${
              dateFilter === 'tomorrow' ? 'bg-black text-white' : 'text-neutral-700 hover:text-black'
            }`}
          >
            Tomorrow
          </button>
          <button
            onClick={() => setDateFilter('upcoming')}
            className={`px-3 py-1 font-bold rounded transition cursor-pointer ${
              dateFilter === 'upcoming' ? 'bg-black text-white' : 'text-neutral-700 hover:text-black'
            }`}
          >
            Upcoming
          </button>
        </div>

        {/* Status Dropdown */}
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2 bg-neutral-50 border border-neutral-300 rounded font-semibold focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Dispatched">Dispatched</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="p-2 bg-neutral-50 border border-neutral-300 rounded font-semibold focus:outline-none"
          >
            <option value="all">All Care Levels</option>
            <option value="BLS">BLS</option>
            <option value="ILS">ILS</option>
            <option value="ALS">ALS</option>
          </select>
        </div>
      </div>

      {/* Bookings List / Cards */}
      <div className="space-y-3">
        {filteredBookings.length === 0 ? (
          <div className="bg-white p-8 rounded-lg border border-neutral-200 text-center space-y-3">
            <Calendar className="w-10 h-10 text-neutral-300 mx-auto" />
            <h3 className="text-sm font-bold text-neutral-700 uppercase">
              No Scheduled Transfers Match Your Filter
            </h3>
            <p className="text-xs text-neutral-500 max-w-md mx-auto">
              There are no upfront patient bookings matching the current search parameters. Click below to add an upfront booking.
            </p>
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded transition cursor-pointer"
            >
              + Schedule Upfront Patient
            </button>
          </div>
        ) : (
          filteredBookings.map((b) => {
            const isToday = b.scheduledDate === todayStr;
            const isDispatched = b.status === 'Dispatched';

            // Colour code badge styling
            const badgeBg = b.colourCode.includes('Red')
              ? 'bg-red-600 text-white'
              : b.colourCode.includes('Orange')
              ? 'bg-orange-500 text-white'
              : b.colourCode.includes('Yellow')
              ? 'bg-amber-400 text-slate-900 font-black'
              : b.colourCode.includes('Blue')
              ? 'bg-blue-600 text-white'
              : 'bg-emerald-600 text-white';

            return (
              <div
                key={b.id}
                className={`bg-white rounded-lg border transition shadow-xs hover:shadow-md overflow-hidden ${
                  isToday
                    ? 'border-l-4 border-l-red-600 border-neutral-200'
                    : 'border-neutral-200'
                }`}
              >
                {/* Header Strip */}
                <div className="bg-neutral-50 px-4 py-2.5 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-black text-sm">{b.bookingRef}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-200 text-neutral-800">
                      {b.callType}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${badgeBg}`}>
                      {b.colourCode}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-black text-white">
                      {b.levelOfCare}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status Badge */}
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        b.status === 'Dispatched'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : b.status === 'Confirmed'
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : b.status === 'Completed'
                          ? 'bg-neutral-100 text-neutral-700'
                          : b.status === 'Cancelled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      ● {b.status}
                    </span>

                    {/* Schedule Date & Time */}
                    <div className="flex items-center gap-1.5 text-neutral-700 font-bold bg-white px-2 py-0.5 rounded border border-neutral-200">
                      <Clock className="w-3.5 h-3.5 text-red-600" />
                      <span>{formatDateSA(b.scheduledDate)} @ {b.scheduledTime}</span>
                    </div>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4 text-xs">
                  {/* Left Column: Patient & Clinical */}
                  <div className="md:col-span-5 space-y-2">
                    <div>
                      <div className="font-bold text-base text-black flex items-center gap-2">
                        <UserIcon className="w-4 h-4 text-neutral-400" />
                        <span>{b.patientName}</span>
                      </div>
                      {b.patientIdOrDob && (
                        <div className="text-[11px] text-neutral-500 font-mono pl-6">
                          {b.patientIdOrDob}
                        </div>
                      )}
                    </div>

                    <div className="p-2.5 bg-neutral-50 rounded border border-neutral-200 space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-neutral-500">Medical Scheme:</span>
                        <strong className="text-black">{b.medicalAidName || 'Private / Unspecified'}</strong>
                      </div>
                      {b.medicalAidNumber && (
                        <div className="flex justify-between text-[11px]">
                          <span className="text-neutral-500">Member #:</span>
                          <span className="font-mono font-bold text-black">{b.medicalAidNumber}</span>
                        </div>
                      )}
                      {b.authorisationNumber && (
                        <div className="flex justify-between text-[11px]">
                          <span className="text-neutral-500">Pre-Auth Ref:</span>
                          <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1 rounded">
                            {b.authorisationNumber}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-[11px]">
                        <span className="text-neutral-500">Billing Type:</span>
                        <strong className="text-neutral-700">{b.billingType}</strong>
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] font-bold text-neutral-500 uppercase block mb-0.5">
                        Clinical Reason:
                      </span>
                      <p className="text-neutral-800 font-medium bg-neutral-50/50 p-2 rounded border border-neutral-100">
                        {b.transportReason}
                      </p>
                    </div>
                  </div>

                  {/* Middle Column: Route & Requirements */}
                  <div className="md:col-span-4 space-y-2 border-l border-neutral-100 pl-0 md:pl-4">
                    {/* Route */}
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 mt-1 shrink-0"></div>
                        <div>
                          <span className="text-[10px] text-neutral-500 uppercase font-bold block">
                            Pickup Hospital / Location:
                          </span>
                          <strong className="text-black text-sm">{b.pickupLocation}</strong>
                          {b.pickupWardRoom && (
                            <span className="block text-[11px] text-neutral-600">
                              {b.pickupWardRoom}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-600 mt-1 shrink-0"></div>
                        <div>
                          <span className="text-[10px] text-neutral-500 uppercase font-bold block">
                            Destination Hospital:
                          </span>
                          <strong className="text-black text-sm">{b.destinationHospital}</strong>
                          {b.destinationWardRoom && (
                            <span className="block text-[11px] text-neutral-600">
                              {b.destinationWardRoom}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Equipment Tags */}
                    <div className="pt-2">
                      <span className="text-[10px] text-neutral-500 uppercase font-bold block mb-1">
                        Equipment &amp; Special Needs:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {b.specialRequirements.oxygenRequired && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold text-[10px]">
                            O₂ ({b.specialRequirements.o2FlowLpm || 4}L/min)
                          </span>
                        )}
                        {b.specialRequirements.stretcher && (
                          <span className="px-2 py-0.5 bg-neutral-200 text-black rounded font-bold text-[10px]">
                            Stretcher
                          </span>
                        )}
                        {b.specialRequirements.wheelchair && (
                          <span className="px-2 py-0.5 bg-neutral-200 text-black rounded font-bold text-[10px]">
                            Wheelchair
                          </span>
                        )}
                        {b.specialRequirements.icuMonitor && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded font-bold text-[10px]">
                            ICU Monitor
                          </span>
                        )}
                        {b.specialRequirements.ventilator && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded font-bold text-[10px]">
                            Ventilator
                          </span>
                        )}
                        {b.specialRequirements.isolation && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-[10px]">
                            Isolation
                          </span>
                        )}
                        {b.specialRequirements.companionAllowed && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                            Companion
                          </span>
                        )}
                      </div>
                    </div>

                    {b.contactPerson && (
                      <div className="text-[11px] text-neutral-600 pt-1 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-neutral-400" />
                        <span>
                          {b.contactPerson} ({b.contactNumber || 'No phone'})
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Fleet Assignment & Dispatch Actions */}
                  <div className="md:col-span-3 flex flex-col justify-between border-l border-neutral-100 pl-0 md:pl-4 space-y-3">
                    <div className="space-y-2">
                      <div>
                        <span className="text-[10px] text-neutral-500 uppercase font-bold block">
                          Assigned Ambulance:
                        </span>
                        <div className="flex items-center gap-1.5 font-bold font-mono text-black text-sm bg-neutral-50 p-1.5 rounded border border-neutral-200">
                          <Truck className="w-4 h-4 text-red-600" />
                          <span>{b.assignedAmbulance || 'MR001 (Unassigned)'}</span>
                        </div>
                      </div>

                      {b.notes && (
                        <div>
                          <span className="text-[10px] text-neutral-500 uppercase font-bold block">
                            Notes:
                          </span>
                          <p className="text-[11px] text-neutral-600 italic line-clamp-2">
                            "{b.notes}"
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-1.5 pt-2">
                      {!isDispatched ? (
                        <button
                          onClick={() => handleDispatchBooking(b)}
                          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-red-600 hover:bg-red-700 text-white rounded font-bold uppercase text-[11px] tracking-wider transition shadow-sm cursor-pointer active:scale-95"
                          title="Convert this pre-booking into an active CAD trip"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Dispatch to Active Trip</span>
                        </button>
                      ) : (
                        <div className="p-2 bg-emerald-50 border border-emerald-200 rounded text-center text-[11px] text-emerald-800 font-bold flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Dispatched to Active CAD</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setViewingVoucher(b)}
                          className="flex-1 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded font-bold text-[11px] flex items-center justify-center gap-1 transition cursor-pointer"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Voucher</span>
                        </button>

                        <button
                          onClick={() => handleOpenEditModal(b)}
                          className="p-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded transition cursor-pointer"
                          title="Edit Booking"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteBooking(b.id, b.bookingRef, b.patientName)}
                          className="p-1.5 bg-neutral-100 hover:bg-red-100 text-red-600 rounded transition cursor-pointer"
                          title="Delete Booking"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* SCHEDULE UPFRONT / EDIT PATIENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-3xl w-full shadow-2xl border border-neutral-300 text-xs text-neutral-900 my-6 overflow-hidden animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="bg-black text-white p-4 border-b border-red-600 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-5 h-5 text-red-500" />
                <div>
                  <h3 className="font-bold text-base uppercase font-heading tracking-wide">
                    {editingBooking ? `Edit Upfront Booking — ${editingBooking.bookingRef}` : 'Pre-Book Patient / Schedule Upfront IHT'}
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Inter-Hospital Transfer &amp; Scheduled Ambulance Transport Booking
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveBooking} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Row 1: Patient Particulars */}
              <div className="p-3.5 bg-neutral-50 rounded-lg border border-neutral-200 space-y-3">
                <h4 className="font-bold text-black uppercase font-heading text-xs flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-red-600" />
                  <span>1. Patient &amp; Medical Scheme Particulars</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-neutral-700 uppercase mb-1 text-[11px]">
                      Patient Full Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Willem de Klerk"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      className="w-full p-2 bg-white border border-neutral-300 rounded font-bold text-sm focus:border-red-600 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 uppercase mb-1 text-[11px]">
                      SA ID Number or Date of Birth
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 6804125029088 or 1968-04-12"
                      value={patientIdOrDob}
                      onChange={(e) => setPatientIdOrDob(e.target.value)}
                      className="w-full p-2 bg-white border border-neutral-300 rounded font-mono text-xs focus:border-red-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-neutral-700 uppercase mb-1 text-[11px]">
                      Billing Type
                    </label>
                    <select
                      value={billingType}
                      onChange={(e) => setBillingType(e.target.value as BillingType)}
                      className="w-full p-2 bg-white border border-neutral-300 rounded font-bold"
                    >
                      <option value="MED AID">MED AID</option>
                      <option value="PRIVATE">PRIVATE</option>
                      <option value="WCA">WCA (Workmans Comp)</option>
                      <option value="RAF DOA">RAF DOA</option>
                      <option value="INDIGENT">INDIGENT</option>
                      <option value="RHT">RHT</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 uppercase mb-1 text-[11px]">
                      Medical Aid / Scheme Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Discovery Health, Bonitas"
                      value={medicalAidName}
                      onChange={(e) => setMedicalAidName(e.target.value)}
                      className="w-full p-2 bg-white border border-neutral-300 rounded font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 uppercase mb-1 text-[11px]">
                      Pre-Authorisation Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. AUTH-DH-77129"
                      value={authorisationNumber}
                      onChange={(e) => setAuthorisationNumber(e.target.value.toUpperCase())}
                      className="w-full p-2 bg-white border border-neutral-300 rounded font-mono font-bold text-blue-700"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Date, Time & Priority */}
              <div className="p-3.5 bg-neutral-50 rounded-lg border border-neutral-200 space-y-3">
                <h4 className="font-bold text-black uppercase font-heading text-xs flex items-center gap-2">
                  <Clock className="w-4 h-4 text-red-600" />
                  <span>2. Schedule Date, Time &amp; Triage Priority (X1 Only)</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-bold text-neutral-700 uppercase mb-1 text-[11px]">
                      Scheduled Date *
                    </label>
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full p-2 bg-white border border-neutral-300 rounded font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 uppercase mb-1 text-[11px]">
                      Pickup Time (HH:mm) *
                    </label>
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full p-2 bg-white border border-neutral-300 rounded font-mono font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 uppercase mb-1 text-[11px]">
                      Call Type
                    </label>
                    <select
                      value={callType}
                      onChange={(e) => setCallType(e.target.value as CallType)}
                      className="w-full p-2 bg-white border border-neutral-300 rounded font-bold"
                    >
                      <option value="IHT">IHT (Inter-Hospital)</option>
                      <option value="IFT">IFT (Inter-Facility)</option>
                      <option value="DISCHARGE">DISCHARGE</option>
                      <option value="PRIM">PRIM (Primary)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 uppercase mb-1 text-[11px]">
                      Colour Code (X1 Only) *
                    </label>
                    <select
                      value={colourCode}
                      onChange={(e) => setColourCode(e.target.value)}
                      className="w-full p-2 bg-white border border-neutral-300 rounded font-bold text-red-700"
                    >
                      {availableColourCodes.map((code) => (
                        <option key={code} value={code}>
                          {code}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-neutral-700 uppercase mb-1 text-[11px]">
                      Level of Care *
                    </label>
                    <select
                      value={levelOfCare}
                      onChange={(e) => setLevelOfCare(e.target.value as LevelOfCare)}
                      className="w-full p-2 bg-white border border-neutral-300 rounded font-bold"
                    >
                      <option value="BLS">BLS (Basic Life Support)</option>
                      <option value="ILS">ILS (Intermediate Life Support)</option>
                      <option value="ALS">ALS (Advanced Life Support)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 uppercase mb-1 text-[11px]">
                      Assigned Ambulance
                    </label>
                    <select
                      value={assignedAmbulance}
                      onChange={(e) => setAssignedAmbulance(e.target.value)}
                      className="w-full p-2 bg-white border border-neutral-300 rounded font-mono font-bold"
                    >
                      {settings.ambulances.map((a) => (
                        <option key={a.id} value={a.fleetNo}>
                          {a.fleetNo} ({a.registration} — {a.base})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 uppercase mb-1 text-[11px]">
                      Booking Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as BookingStatus)}
                      className="w-full p-2 bg-white border border-neutral-300 rounded font-bold"
                    >
                      <option value="Scheduled">Scheduled</option>
                      <option value="Confirmed">Confirmed</option>
                      <option value="En Route">En Route</option>
                      <option value="Dispatched">Dispatched</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Row 3: Pickup & Destination Facilities */}
              <div className="p-3.5 bg-neutral-50 rounded-lg border border-neutral-200 space-y-3">
                <h4 className="font-bold text-black uppercase font-heading text-xs flex items-center gap-2">
                  <Building className="w-4 h-4 text-red-600" />
                  <span>3. Pickup Facility &amp; Destination Hospital (Brackenfell, Cape Town &amp; Paarl)</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-neutral-700 uppercase mb-1 text-[11px]">
                      Pickup Facility / Hospital *
                    </label>
                    <select
                      value={pickupLocation}
                      onChange={(e) => setPickupLocation(e.target.value)}
                      className="w-full p-2 bg-white border border-neutral-300 rounded font-bold"
                    >
                      {availableHospitals.map((hosp) => (
                        <option key={hosp} value={hosp}>
                          {hosp}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 uppercase mb-1 text-[11px]">
                      Pickup Ward / Room / Unit
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ward 3B, Bed 14"
                      value={pickupWardRoom}
                      onChange={(e) => setPickupWardRoom(e.target.value)}
                      className="w-full p-2 bg-white border border-neutral-300 rounded font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-neutral-700 uppercase mb-1 text-[11px]">
                      Destination Hospital (Brackenfell / Cape Town / Paarl) *
                    </label>
                    <select
                      value={destinationHospital}
                      onChange={(e) => setDestinationHospital(e.target.value)}
                      className="w-full p-2 bg-white border border-neutral-300 rounded font-bold text-black"
                    >
                      {availableHospitals.map((hosp) => (
                        <option key={hosp} value={hosp}>
                          {hosp}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 uppercase mb-1 text-[11px]">
                      Destination Ward / Department
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Cardiac Cath Lab / ICU Bed 4"
                      value={destinationWardRoom}
                      onChange={(e) => setDestinationWardRoom(e.target.value)}
                      className="w-full p-2 bg-white border border-neutral-300 rounded font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Row 4: Clinical Indication & Equipment */}
              <div className="p-3.5 bg-neutral-50 rounded-lg border border-neutral-200 space-y-3">
                <h4 className="font-bold text-black uppercase font-heading text-xs flex items-center gap-2">
                  <Activity className="w-4 h-4 text-red-600" />
                  <span>4. Clinical Diagnosis &amp; Special Equipment Needs</span>
                </h4>

                <div>
                  <label className="block font-bold text-neutral-700 uppercase mb-1 text-[11px]">
                    Clinical Diagnosis / Reason for Transfer *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Planned elective cardiac angiogram & stent placement"
                    value={transportReason}
                    onChange={(e) => setTransportReason(e.target.value)}
                    className="w-full p-2 bg-white border border-neutral-300 rounded font-medium"
                    required
                  />
                </div>

                {/* Equipment Checkboxes */}
                <div>
                  <span className="block font-bold text-neutral-700 uppercase mb-1.5 text-[11px]">
                    Special Equipment &amp; Protocol Requirements:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <label className="flex items-center gap-2 font-semibold text-neutral-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={oxygenRequired}
                        onChange={(e) => setOxygenRequired(e.target.checked)}
                        className="rounded text-red-600 focus:ring-red-500"
                      />
                      <span>Oxygen Therapy</span>
                    </label>

                    <label className="flex items-center gap-2 font-semibold text-neutral-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={stretcher}
                        onChange={(e) => setStretcher(e.target.checked)}
                        className="rounded text-red-600 focus:ring-red-500"
                      />
                      <span>Stretcher Patient</span>
                    </label>

                    <label className="flex items-center gap-2 font-semibold text-neutral-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={wheelchair}
                        onChange={(e) => setWheelchair(e.target.checked)}
                        className="rounded text-red-600 focus:ring-red-500"
                      />
                      <span>Wheelchair Patient</span>
                    </label>

                    <label className="flex items-center gap-2 font-semibold text-neutral-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={icuMonitor}
                        onChange={(e) => setIcuMonitor(e.target.checked)}
                        className="rounded text-red-600 focus:ring-red-500"
                      />
                      <span>ICU Multi-Monitor</span>
                    </label>

                    <label className="flex items-center gap-2 font-semibold text-neutral-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ventilator}
                        onChange={(e) => setVentilator(e.target.checked)}
                        className="rounded text-red-600 focus:ring-red-500"
                      />
                      <span>Transport Ventilator</span>
                    </label>

                    <label className="flex items-center gap-2 font-semibold text-neutral-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isolation}
                        onChange={(e) => setIsolation(e.target.checked)}
                        className="rounded text-red-600 focus:ring-red-500"
                      />
                      <span>Infection Isolation</span>
                    </label>

                    <label className="flex items-center gap-2 font-semibold text-neutral-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={companionAllowed}
                        onChange={(e) => setCompanionAllowed(e.target.checked)}
                        className="rounded text-red-600 focus:ring-red-500"
                      />
                      <span>Family Companion</span>
                    </label>
                  </div>

                  {oxygenRequired && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[11px] font-bold text-neutral-600">O₂ Flow Rate:</span>
                      <input
                        type="number"
                        min={1}
                        max={15}
                        value={o2FlowLpm}
                        onChange={(e) => setO2FlowLpm(parseInt(e.target.value, 10) || 4)}
                        className="w-16 p-1 border border-neutral-300 rounded font-mono font-bold"
                      />
                      <span className="text-[11px] text-neutral-500">Liters per minute (L/min)</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-neutral-700 uppercase mb-1 text-[11px]">
                      Contact Doctor / Sister
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Dr. J. van der Merwe"
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      className="w-full p-2 bg-white border border-neutral-300 rounded font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 uppercase mb-1 text-[11px]">
                      Contact Mobile / Telephone
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 021 983 5600"
                      value={contactNumber}
                      onChange={(e) => setContactNumber(e.target.value)}
                      className="w-full p-2 bg-white border border-neutral-300 rounded font-mono font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 uppercase mb-1 text-[11px]">
                    Special Instructions &amp; Crew Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Patient pre-fasted from 06:00. Pre-authorisation code verified with Discovery. Transport documentation prepared."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-2 bg-white border border-neutral-300 rounded font-medium"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 rounded font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold uppercase tracking-wider transition shadow-sm cursor-pointer"
                >
                  {editingBooking ? 'Save Changes' : 'Confirm & Schedule Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE TRANSFER VOUCHER MODAL */}
      {viewingVoucher && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl border border-neutral-300 text-xs text-neutral-900 p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-neutral-200">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-red-600" />
                <h3 className="font-bold text-base font-heading uppercase">
                  IHT Transfer Voucher Slip
                </h3>
              </div>
              <button
                onClick={() => setViewingVoucher(null)}
                className="text-neutral-500 hover:text-black"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200 space-y-3 font-mono">
              <div className="flex justify-between border-b pb-2 border-neutral-200">
                <span>BOOKING REF:</span>
                <strong className="text-black">{viewingVoucher.bookingRef}</strong>
              </div>
              <div className="flex justify-between">
                <span>SCHEDULED:</span>
                <strong>{viewingVoucher.scheduledDate} @ {viewingVoucher.scheduledTime}</strong>
              </div>
              <div className="flex justify-between">
                <span>PATIENT:</span>
                <strong className="text-black uppercase">{viewingVoucher.patientName}</strong>
              </div>
              <div className="flex justify-between">
                <span>ID/DOB:</span>
                <span>{viewingVoucher.patientIdOrDob || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span>MEDICAL AID:</span>
                <span>{viewingVoucher.medicalAidName} ({viewingVoucher.authorisationNumber || 'No Auth'})</span>
              </div>
              <div className="flex justify-between">
                <span>PRIORITY / CODE:</span>
                <strong className="text-red-600">{viewingVoucher.colourCode} · {viewingVoucher.levelOfCare}</strong>
              </div>
              <div className="border-t pt-2 space-y-1">
                <div>PICKUP: {viewingVoucher.pickupLocation} ({viewingVoucher.pickupWardRoom})</div>
                <div>DESTINATION: {viewingVoucher.destinationHospital} ({viewingVoucher.destinationWardRoom})</div>
              </div>
              <div className="border-t pt-2">
                <div>DIAGNOSIS: {viewingVoucher.transportReason}</div>
              </div>
              <div className="border-t pt-2 text-[10px] text-neutral-500">
                CREW CLIPBOARD VOUCHER · ISSUED BY RESQ EMS DISPATCH SYSTEM
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-black text-white rounded font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Slip</span>
              </button>
              <button
                onClick={() => setViewingVoucher(null)}
                className="px-4 py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 rounded font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
