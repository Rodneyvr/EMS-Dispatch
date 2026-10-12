export type UserRole =
  | 'Admin'
  | 'Dispatcher'
  | 'Management'
  | 'Office'
  | 'StockController'
  | 'Paramedic'
  | 'ReadOnly'
  | 'Developer';

export type LevelOfCare = 'BLS' | 'ILS' | 'ALS';

export type BillingType =
  | 'MED AID'
  | 'PRIVATE'
  | 'WCA'
  | 'RAF DOA'
  | 'INDIGENT'
  | 'NSR'
  | 'RHT';

export type CallType = 'PRIM' | 'IHT' | 'IFT' | 'DISCHARGE';

export type BookingStatus =
  | 'Scheduled'
  | 'Confirmed'
  | 'En Route'
  | 'Dispatched'
  | 'Completed'
  | 'Cancelled';

export type ShiftDutyType =
  | 'Day'
  | 'Night'
  | 'Off'
  | 'Standby'
  | 'Leave'
  | 'Sick'
  | 'Training';

export interface ShiftScheduleEntry {
  id: string;
  date: string; // YYYY-MM-DD
  crewMemberId: string;
  crewName: string;
  qualification: string;
  base: string;
  shiftType: ShiftDutyType; // Day (06:00-18:00), Night (18:00-06:00), etc.
  startTime: string; // "06:00"
  endTime: string; // "18:00"
  assignedAmbulance?: string; // e.g. "MR001"
  partnerCrewName?: string;
  status: 'Scheduled' | 'On Duty' | 'Completed' | 'Absent';
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PreBookedTrip {
  id: string; // e.g. "IHT-2026-001"
  bookingRef: string; // e.g. "BK-8901"
  patientName: string;
  patientIdOrDob?: string;
  medicalAidName?: string;
  medicalAidNumber?: string;
  authorisationNumber?: string; // Pre-auth code from medical aid
  billingType: BillingType;
  callType: CallType; // 'IHT' | 'IFT' | 'DISCHARGE' | 'PRIM'
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:mm
  pickupLocation: string; // Facility / Hospital / Address e.g. "MC Cape Gate"
  pickupWardRoom?: string; // e.g. "Ward 3B, Bed 12"
  destinationHospital: string; // Hospital from dropdown e.g. "MC Paarl"
  destinationWardRoom?: string; // e.g. "Cardiac ICU, Bed 4"
  colourCode: string; // "X1 Green", "X1 Yellow", "X1 Red", "X1 Orange", "X1 Blue"
  levelOfCare: LevelOfCare; // BLS | ILS | ALS
  transportReason: string; // e.g. "Specialist Cardiac Consultation & Cath Lab Transfer"
  specialRequirements: {
    oxygenRequired: boolean;
    o2FlowLpm?: number;
    stretcher: boolean;
    wheelchair: boolean;
    isolation: boolean;
    icuMonitor: boolean;
    ventilator: boolean;
    companionAllowed: boolean;
  };
  contactPerson?: string;
  contactNumber?: string;
  assignedAmbulance?: string; // e.g. "MR001"
  assignedCrew?: string[]; // e.g. ["Pieter van der Merwe (ALS)"]
  status: BookingStatus;
  dispatchedTripId?: string; // linked to Trip if converted
  dispatchedAt?: string;
  dispatchedBy?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type PriorityColor = 'Red' | 'Orange' | 'Yellow' | 'Green' | 'Blue';

export type OutcomeType =
  | 'Transported'
  | 'Treated & released'
  | 'Refused'
  | 'Cancelled'
  | 'DOA'
  | 'Standby';

export type ShiftType = 'Day' | 'Night';

export type OvertimeStatus = 'Pending' | 'Approved' | 'Rejected';

export type StockUrgency = 'Routine' | 'Before next shift' | 'Urgent — vehicle off-road';

export type StockRequestStatus =
  | 'Submitted'
  | 'Approved'
  | 'Partially approved'
  | 'Rejected'
  | 'Issued'
  | 'Closed';

export interface User {
  id: string;
  username: string;
  fullName: string;
  surname?: string;
  password?: string;
  email?: string;
  mobile?: string;
  role: UserRole;
  base: string;
  qualification?: string;
  hpcsaNo?: string;
  pin?: string; // 4-6 digit quick PIN
  active: boolean;
  isDev?: boolean; // System developer / engineering access
  forcePasswordChange?: boolean;
}

export interface AmbulanceUnit {
  id: string;
  fleetNo: string; // e.g. MR001
  registration: string;
  base: string;
  active: boolean;
  model?: string;
}

export interface CrewMember {
  id: string;
  name: string;
  qualification: 'BLS' | 'ECA' | 'AEA' | 'ILS' | 'ECT' | 'ALS' | 'ECP' | 'Paramedic';
  hpcsaNo: string;
  mobile: string;
  base: string;
  active: boolean;
}

export interface TripTimes {
  timeReceived: string; // HH:mm
  timeMobile: string; // HH:mm
  timeAtScene?: string; // HH:mm
  timeAtHospital: string; // HH:mm
  timeAvailable: string; // HH:mm
}

export interface CalculatedTimes {
  responseMinutes: number; // dispatch -> mobile
  travelMinutes: number; // mobile -> hospital
  turnaroundMinutes: number; // hospital -> available
  totalCallMinutes: number; // dispatch -> available
}

export interface Trip {
  id: string;
  eprfNumber: string; // digits only e.g. "4211"
  eprfFormatted: string; // "EPRF4211"
  ambulance: string; // e.g. "MR001"
  base: string; // "Main Base", "VdV", "Middelburg"
  date: string; // YYYY-MM-DD
  shift: ShiftType;
  cadNumber?: string;
  levelOfCare: LevelOfCare;
  billingType: BillingType;
  medicalSchemeName?: string;
  crewMembers: string[]; // e.g. ["Stephan Rossouw (BLS)", "Thabo Molefe (ILS)"]
  callType: CallType;
  priority: PriorityColor;
  pickupLocation?: string;
  hospital?: string;
  colourCodeOrHospital: string; // e.g. "X1 Green", "X1 Yellow", "X1 Red", etc.
  times: TripTimes;
  calculatedTimes: CalculatedTimes;
  kmStart?: number;
  kmEnd?: number;
  distanceKm?: number;
  outcome: OutcomeType;
  notes?: string;
  isDeleted?: boolean;
  deletedReason?: string;
  deletedBy?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface OvertimeRecord {
  id: string;
  date: string; // YYYY-MM-DD
  crewMemberId: string;
  crewName: string;
  qualification: string;
  hpcsaNo: string;
  eprfOrReason: string; // digits become EPRF#### or "OT VDV"
  timeStarted: string; // HH:mm
  timeEnded: string; // HH:mm
  minutesWorked: number;
  timeWorkedFormatted: string; // H:MM
  crossesMidnight?: boolean;
  callType: string;
  baseWorked: string;
  description: string;
  status: OvertimeStatus;
  approvedBy?: string;
  approvedAt?: string;
  rejectionComment?: string;
  createdAt: string;
}

export interface StockItem {
  id: string;
  category: string;
  name: string;
  unit: string; // each, box, ampoule, swap, pack, roll
  isControlled: boolean; // Schedule 5/6
  requiresALS: boolean;
  minLevel: number;
  currentStock?: number;
}

export interface StockRequestLine {
  itemId: string;
  itemName: string;
  unit: string;
  isControlled: boolean;
  requestedQty: number;
  issuedQty?: number;
  notes?: string;
}

export interface StockRequest {
  id: string; // SR-2026-000123
  requesterId: string;
  requesterName: string;
  ambulance: string;
  base: string;
  shift: ShiftType;
  requestedAt: string; // ISO
  linkedEprf?: string;
  urgency: StockUrgency;
  lines: StockRequestLine[];
  controlledReason?: string;
  hpcsaNumber?: string;
  customItemsNote?: string;
  status: StockRequestStatus;
  issuedBy?: string;
  issuedAt?: string;
  notes?: string;
  actionHistory: {
    action: string;
    byUser: string;
    timestamp: string;
    notes?: string;
  }[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'ISSUE' | 'LOGIN' | 'SETTINGS';
  table: string;
  recordId: string;
  details: string;
  ip?: string;
}

export interface AppSettings {
  companyName: string;
  appName: string;
  workbookName: string;
  companyLogoUrl: string;
  theme?: 'black_red_white' | 'clinical_dark' | 'clean_white';
  timezone: string;
  currency: string;
  bases: string[];
  ambulances: AmbulanceUnit[];
  crewMembers: CrewMember[];
  callTypes: CallType[];
  colourCodes: string[]; // e.g. ["X1 Green", "X1 Yellow", "X1 Red", "X1 Orange", "X1 Blue", "X2 Green", ...]
  hospitals?: string[];
  pickupSuggestions?: string[];
  msGraphConnected: boolean;
  googleSheetsConnected: boolean;
}
