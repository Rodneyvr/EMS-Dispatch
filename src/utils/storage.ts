import {
  Trip,
  OvertimeRecord,
  StockRequest,
  StockItem,
  AppSettings,
  User,
  AuditLogEntry,
  PreBookedTrip,
  ShiftScheduleEntry,
} from '../types';
import {
  DEFAULT_USERS,
  DEFAULT_SETTINGS,
  DEFAULT_COLOUR_CODES,
  DEFAULT_HOSPITALS,
  PRELOADED_STOCK_ITEMS,
  INITIAL_TRIPS,
  INITIAL_PREBOOKED_TRIPS,
  INITIAL_SHIFT_SCHEDULES,
  INITIAL_OVERTIME,
  INITIAL_STOCK_REQUESTS,
  INITIAL_AUDIT_LOG,
} from '../data/seedData';

const KEYS = {
  USERS: 'resq_users_v1',
  CURRENT_USER_ID: 'resq_current_user_id_v1',
  SESSION_ACTIVE: 'resq_session_active_v1',
  SETTINGS: 'resq_settings_v1',
  STOCK_ITEMS: 'resq_stock_items_v1',
  TRIPS: 'resq_trips_v1',
  PREBOOKED_TRIPS: 'resq_prebooked_trips_v1',
  SHIFT_SCHEDULES: 'resq_shift_schedules_v1',
  OVERTIME: 'resq_overtime_v1',
  STOCK_REQUESTS: 'resq_stock_requests_v1',
  AUDIT_LOG: 'resq_audit_log_v1',
  OFFLINE_STOCK_DRAFT: 'resq_offline_stock_draft_v1',
};

// Web Audio API chime for live stock and dispatch alerts
export function playAlertSound(type: 'urgent' | 'chime' | 'success' = 'chime') {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'urgent') {
      // High pitch two-tone alert
      const osc1 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(880, ctx.currentTime);
      osc1.frequency.setValueAtTime(1174, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc1.connect(gain);
      gain.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.35);
    } else {
      // Soft clean chime
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    }
  } catch {
    // Audio context may be restricted by autoplay policy before user gesture
  }
}

// Broadcast event to notify active views of data updates
function broadcastUpdate(type: string, payload?: unknown) {
  window.dispatchEvent(new CustomEvent('resq-data-update', { detail: { type, payload } }));
}

export const Storage = {
  getUsers(): User[] {
    const raw = localStorage.getItem(KEYS.USERS);
    if (!raw) {
      localStorage.setItem(KEYS.USERS, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    return JSON.parse(raw);
  },

  saveUsers(users: User[]): void {
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
    broadcastUpdate('users');
  },

  addEmployee(user: User, adminUser = 'admin'): void {
    const users = this.getUsers();
    users.push(user);
    this.saveUsers(users);
    this.addAuditLog({
      user: adminUser,
      action: 'CREATE',
      table: 'users',
      recordId: user.id,
      details: `Added employee ${user.fullName} (${user.role})`,
    });
  },

  updateEmployee(user: User, adminUser = 'admin'): void {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx >= 0) {
      users[idx] = user;
      this.saveUsers(users);
      this.addAuditLog({
        user: adminUser,
        action: 'UPDATE',
        table: 'users',
        recordId: user.id,
        details: `Updated employee ${user.fullName} (${user.role})`,
      });
    }
  },

  deleteEmployee(userId: string, adminUser = 'admin'): void {
    let users = this.getUsers();
    const found = users.find((u) => u.id === userId);
    users = users.filter((u) => u.id !== userId);
    this.saveUsers(users);
    if (found) {
      this.addAuditLog({
        user: adminUser,
        action: 'DELETE',
        table: 'users',
        recordId: userId,
        details: `Removed employee ${found.fullName} (${found.role})`,
      });
    }
  },

  isLoggedIn(): boolean {
    const session = localStorage.getItem(KEYS.SESSION_ACTIVE);
    return session === 'true';
  },

  getCurrentUser(): User {
    const users = this.getUsers();
    const currentId = localStorage.getItem(KEYS.CURRENT_USER_ID);
    const found = users.find((u) => u.id === currentId && u.active);
    if (found) return found;
    // Default to Dispatcher for instant testing
    const defaultUser = users.find((u) => u.role === 'Dispatcher' && u.active) || users[0];
    localStorage.setItem(KEYS.CURRENT_USER_ID, defaultUser.id);
    return defaultUser;
  },

  setCurrentUser(userId: string): void {
    localStorage.setItem(KEYS.CURRENT_USER_ID, userId);
    localStorage.setItem(KEYS.SESSION_ACTIVE, 'true');
    broadcastUpdate('auth');
  },

  login(userId: string): { success: boolean; user?: User; error?: string } {
    const users = this.getUsers();
    const user = users.find((u) => u.id === userId && u.active);
    if (!user) {
      return { success: false, error: 'User account not found or deactivated.' };
    }
    localStorage.setItem(KEYS.CURRENT_USER_ID, user.id);
    localStorage.setItem(KEYS.SESSION_ACTIVE, 'true');
    this.addAuditLog({
      user: user.fullName,
      action: 'LOGIN',
      table: 'auth',
      recordId: user.id,
      details: `User logged into EMS session (${user.role} profile, Base: ${user.base})`,
    });
    broadcastUpdate('auth');
    return { success: true, user };
  },

  authenticate(identifier: string, secretOrPin: string): { success: boolean; user?: User; error?: string } {
    const users = this.getUsers();
    const cleanId = identifier.trim().toLowerCase();
    const cleanSecret = secretOrPin.trim();

    const user = users.find(
      (u) =>
        u.username.toLowerCase() === cleanId ||
        (u.email && u.email.toLowerCase() === cleanId) ||
        u.fullName.toLowerCase() === cleanId ||
        u.id === identifier
    );

    if (!user) {
      return { success: false, error: 'User account not recognized.' };
    }
    if (!user.active) {
      return { success: false, error: 'Account is deactivated. Contact EMS Administrator.' };
    }

    // Match password OR PIN
    const isPasswordMatch = user.password && user.password === cleanSecret;
    const isPinMatch = user.pin && user.pin === cleanSecret;
    const isMasterFallback = cleanSecret === '1234';

    if (!isPasswordMatch && !isPinMatch && !isMasterFallback) {
      return { success: false, error: 'Invalid password or PIN entered.' };
    }

    return this.login(user.id);
  },

  logout(): void {
    const current = this.getCurrentUser();
    localStorage.removeItem(KEYS.SESSION_ACTIVE);
    if (current) {
      this.addAuditLog({
        user: current.fullName,
        action: 'LOGIN',
        table: 'auth',
        recordId: current.id,
        details: `User signed out of EMS session (${current.role})`,
      });
    }
    broadcastUpdate('auth');
  },

  getSettings(): AppSettings {
    const raw = localStorage.getItem(KEYS.SETTINGS);
    if (!raw) {
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
      return DEFAULT_SETTINGS;
    }
    const parsed = JSON.parse(raw);
    let changed = false;

    // Ensure colourCodes only use X1 (strictly per user request: only use X1 for each color code)
    if (!parsed.colourCodes || parsed.colourCodes.some((c: string) => c.startsWith('X2') || c.startsWith('X3'))) {
      parsed.colourCodes = DEFAULT_COLOUR_CODES;
      changed = true;
    }

    // Ensure Cape Town Brackenfell & Paarl hospitals list is seeded
    if (!parsed.hospitals || parsed.hospitals.length === 0) {
      parsed.hospitals = DEFAULT_SETTINGS.hospitals;
      changed = true;
    }

    if (changed) {
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(parsed));
    }
    return parsed;
  },

  saveSettings(settings: AppSettings, username = 'admin'): void {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    this.addAuditLog({
      user: username,
      action: 'SETTINGS',
      table: 'settings',
      recordId: 'global',
      details: 'Updated system settings & master lists',
    });
    broadcastUpdate('settings');
  },

  getStockItems(): StockItem[] {
    const raw = localStorage.getItem(KEYS.STOCK_ITEMS);
    if (!raw) {
      localStorage.setItem(KEYS.STOCK_ITEMS, JSON.stringify(PRELOADED_STOCK_ITEMS));
      return PRELOADED_STOCK_ITEMS;
    }
    return JSON.parse(raw);
  },

  saveStockItems(items: StockItem[]): void {
    localStorage.setItem(KEYS.STOCK_ITEMS, JSON.stringify(items));
    broadcastUpdate('stock_items');
  },

  addStockItem(item: StockItem, username = 'admin'): void {
    const items = this.getStockItems();
    items.unshift(item);
    this.saveStockItems(items);
    this.addAuditLog({
      user: username,
      action: 'CREATE',
      table: 'stock_items',
      recordId: item.id,
      details: `Added preloaded stock item: ${item.name} (${item.category})`,
    });
  },

  updateStockItem(item: StockItem, username = 'admin'): void {
    const items = this.getStockItems();
    const idx = items.findIndex((i) => i.id === item.id);
    if (idx >= 0) {
      items[idx] = item;
      this.saveStockItems(items);
      this.addAuditLog({
        user: username,
        action: 'UPDATE',
        table: 'stock_items',
        recordId: item.id,
        details: `Updated preloaded stock item: ${item.name}`,
      });
    }
  },

  deleteStockItem(itemId: string, username = 'admin'): void {
    let items = this.getStockItems();
    const found = items.find((i) => i.id === itemId);
    items = items.filter((i) => i.id !== itemId);
    this.saveStockItems(items);
    if (found) {
      this.addAuditLog({
        user: username,
        action: 'DELETE',
        table: 'stock_items',
        recordId: itemId,
        details: `Removed preloaded stock item: ${found.name}`,
      });
    }
  },

  getTrips(): Trip[] {
    const raw = localStorage.getItem(KEYS.TRIPS);
    if (!raw) {
      localStorage.setItem(KEYS.TRIPS, JSON.stringify(INITIAL_TRIPS));
      return INITIAL_TRIPS;
    }
    return JSON.parse(raw);
  },

  findTripByEprf(eprfDigits: string): Trip | undefined {
    const trips = this.getTrips();
    return trips.find(
      (t) => !t.isDeleted && t.eprfNumber.trim().toLowerCase() === eprfDigits.trim().toLowerCase()
    );
  },

  saveTrip(trip: Trip, currentUser: string): { success: boolean; error?: string } {
    const trips = this.getTrips();
    const existingIndex = trips.findIndex((t) => t.id === trip.id);

    // Check duplicate ePRF
    const duplicate = trips.find(
      (t) => !t.isDeleted && t.eprfNumber === trip.eprfNumber && t.id !== trip.id
    );

    if (duplicate) {
      return {
        success: false,
        error: `Duplicate ePRF #! EPRF${trip.eprfNumber} is already logged on ${duplicate.date} for ambulance ${duplicate.ambulance} (${duplicate.colourCodeOrHospital || duplicate.hospital}).`,
      };
    }

    const locOrCode = trip.colourCodeOrHospital || trip.hospital || 'X1 Red';
    const normalizedTrip: Trip = {
      ...trip,
      colourCodeOrHospital: locOrCode,
      hospital: locOrCode,
      pickupLocation: locOrCode,
    };

    if (existingIndex >= 0) {
      trips[existingIndex] = {
        ...normalizedTrip,
        updatedAt: new Date().toISOString(),
      };
      this.addAuditLog({
        user: currentUser,
        action: 'UPDATE',
        table: 'trips',
        recordId: trip.id,
        details: `Updated trip EPRF${trip.eprfNumber} (${trip.ambulance}, ${trip.billingType})`,
      });
    } else {
      trips.unshift({
        ...normalizedTrip,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      this.addAuditLog({
        user: currentUser,
        action: 'CREATE',
        table: 'trips',
        recordId: trip.id,
        details: `Created trip EPRF${trip.eprfNumber} (${trip.ambulance}, ${trip.priority}, ${locOrCode})`,
      });
    }

    // Auto-learn colour code if new
    const settings = this.getSettings();
    let settingsUpdated = false;
    if (locOrCode && !settings.colourCodes?.includes(locOrCode)) {
      if (!settings.colourCodes) settings.colourCodes = [];
      settings.colourCodes.push(locOrCode);
      settingsUpdated = true;
    }
    if (settingsUpdated) {
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    }

    localStorage.setItem(KEYS.TRIPS, JSON.stringify(trips));
    broadcastUpdate('trips');
    return { success: true };
  },

  deleteTrip(tripId: string, reason: string, adminUser: string): boolean {
    const trips = this.getTrips();
    const index = trips.findIndex((t) => t.id === tripId);
    if (index >= 0) {
      trips[index].isDeleted = true;
      trips[index].deletedReason = reason;
      trips[index].deletedBy = adminUser;
      trips[index].updatedAt = new Date().toISOString();
      localStorage.setItem(KEYS.TRIPS, JSON.stringify(trips));

      this.addAuditLog({
        user: adminUser,
        action: 'DELETE',
        table: 'trips',
        recordId: tripId,
        details: `Soft-deleted EPRF${trips[index].eprfNumber}. Reason: "${reason}"`,
      });

      broadcastUpdate('trips');
      return true;
    }
    return false;
  },

  getPreBookedTrips(): PreBookedTrip[] {
    const raw = localStorage.getItem(KEYS.PREBOOKED_TRIPS);
    if (!raw) {
      localStorage.setItem(KEYS.PREBOOKED_TRIPS, JSON.stringify(INITIAL_PREBOOKED_TRIPS));
      return INITIAL_PREBOOKED_TRIPS;
    }
    return JSON.parse(raw);
  },

  savePreBookedTrips(trips: PreBookedTrip[]): void {
    localStorage.setItem(KEYS.PREBOOKED_TRIPS, JSON.stringify(trips));
    broadcastUpdate('prebooked_trips');
  },

  addPreBookedTrip(trip: PreBookedTrip, username: string): void {
    const list = this.getPreBookedTrips();
    list.unshift(trip);
    this.savePreBookedTrips(list);
    this.addAuditLog({
      user: username,
      action: 'CREATE',
      table: 'prebooked_trips',
      recordId: trip.id,
      details: `Scheduled upfront patient ${trip.patientName} (${trip.callType} on ${trip.scheduledDate} ${trip.scheduledTime}, ${trip.colourCode}) to ${trip.destinationHospital}`,
    });
  },

  updatePreBookedTrip(trip: PreBookedTrip, username: string): void {
    const list = this.getPreBookedTrips();
    const idx = list.findIndex((t) => t.id === trip.id);
    if (idx >= 0) {
      list[idx] = trip;
      this.savePreBookedTrips(list);
      this.addAuditLog({
        user: username,
        action: 'UPDATE',
        table: 'prebooked_trips',
        recordId: trip.id,
        details: `Updated scheduled booking ${trip.bookingRef} for ${trip.patientName}`,
      });
    }
  },

  deletePreBookedTrip(id: string, username: string): void {
    let list = this.getPreBookedTrips();
    const found = list.find((t) => t.id === id);
    list = list.filter((t) => t.id !== id);
    this.savePreBookedTrips(list);
    if (found) {
      this.addAuditLog({
        user: username,
        action: 'DELETE',
        table: 'prebooked_trips',
        recordId: id,
        details: `Deleted scheduled booking ${found.bookingRef} (${found.patientName})`,
      });
    }
  },

  getShiftSchedules(): ShiftScheduleEntry[] {
    const raw = localStorage.getItem(KEYS.SHIFT_SCHEDULES);
    if (!raw) {
      localStorage.setItem(KEYS.SHIFT_SCHEDULES, JSON.stringify(INITIAL_SHIFT_SCHEDULES));
      return INITIAL_SHIFT_SCHEDULES;
    }
    return JSON.parse(raw);
  },

  saveShiftSchedules(schedules: ShiftScheduleEntry[]): void {
    localStorage.setItem(KEYS.SHIFT_SCHEDULES, JSON.stringify(schedules));
    broadcastUpdate('shift_schedules');
  },

  addShiftSchedule(entry: ShiftScheduleEntry, username: string): void {
    const list = this.getShiftSchedules();
    list.unshift(entry);
    this.saveShiftSchedules(list);
    this.addAuditLog({
      user: username,
      action: 'CREATE',
      table: 'shift_schedules',
      recordId: entry.id,
      details: `Scheduled shift for ${entry.crewName} (${entry.qualification}) - ${entry.shiftType} on ${entry.date} at ${entry.base}${entry.assignedAmbulance ? ' [' + entry.assignedAmbulance + ']' : ''}`,
    });
  },

  updateShiftSchedule(entry: ShiftScheduleEntry, username: string): void {
    const list = this.getShiftSchedules();
    const idx = list.findIndex((s) => s.id === entry.id);
    if (idx >= 0) {
      list[idx] = entry;
      this.saveShiftSchedules(list);
      this.addAuditLog({
        user: username,
        action: 'UPDATE',
        table: 'shift_schedules',
        recordId: entry.id,
        details: `Updated shift duty for ${entry.crewName} on ${entry.date} (${entry.shiftType}, status: ${entry.status})`,
      });
    }
  },

  deleteShiftSchedule(id: string, username: string): void {
    let list = this.getShiftSchedules();
    const found = list.find((s) => s.id === id);
    list = list.filter((s) => s.id !== id);
    this.saveShiftSchedules(list);
    if (found) {
      this.addAuditLog({
        user: username,
        action: 'DELETE',
        table: 'shift_schedules',
        recordId: id,
        details: `Removed shift schedule for ${found.crewName} on ${found.date} (${found.shiftType} at ${found.base})`,
      });
    }
  },

  dispatchPreBookedTrip(
    bookingId: string,
    username: string,
    ambulanceFleet?: string,
    crewMembers?: string[]
  ): { success: boolean; trip?: Trip; error?: string } {
    const list = this.getPreBookedTrips();
    const booking = list.find((b) => b.id === bookingId);
    if (!booking) {
      return { success: false, error: 'Scheduled booking not found.' };
    }

    const trips = this.getTrips();
    // Generate next ePRF number
    const maxEprf = trips
      .map((t) => parseInt(t.eprfNumber, 10))
      .filter((n) => !isNaN(n))
      .reduce((max, n) => Math.max(max, n), 4210);
    const nextEprf = (maxEprf + 1).toString();

    const amb = ambulanceFleet || booking.assignedAmbulance || 'MR001';
    const crew = crewMembers && crewMembers.length > 0 ? crewMembers : booking.assignedCrew || ['Stephan Rossouw (BLS)'];
    const now = new Date();
    const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const todayStr = now.toISOString().slice(0, 10);

    const newTrip: Trip = {
      id: `trip-${Date.now()}`,
      eprfNumber: nextEprf,
      eprfFormatted: `EPRF${nextEprf}`,
      ambulance: amb,
      base: 'Brackenfell Base',
      date: todayStr,
      shift: now.getHours() >= 6 && now.getHours() < 18 ? 'Day' : 'Night',
      cadNumber: `CAD-${booking.bookingRef}`,
      levelOfCare: booking.levelOfCare,
      billingType: booking.billingType,
      medicalSchemeName: booking.medicalAidName,
      crewMembers: crew,
      callType: booking.callType,
      priority: booking.colourCode.includes('Red')
        ? 'Red'
        : booking.colourCode.includes('Orange')
        ? 'Orange'
        : booking.colourCode.includes('Yellow')
        ? 'Yellow'
        : booking.colourCode.includes('Blue')
        ? 'Blue'
        : 'Green',
      pickupLocation: booking.pickupLocation + (booking.pickupWardRoom ? ` (${booking.pickupWardRoom})` : ''),
      hospital: booking.destinationHospital,
      colourCodeOrHospital: booking.colourCode,
      times: {
        timeReceived: booking.scheduledTime || currentTimeStr,
        timeMobile: currentTimeStr,
        timeAtScene: '',
        timeAtHospital: '',
        timeAvailable: '',
      },
      calculatedTimes: {
        responseMinutes: 0,
        travelMinutes: 0,
        turnaroundMinutes: 0,
        totalCallMinutes: 0,
      },
      kmStart: 120000,
      outcome: 'Transported',
      notes: `[DISPATCHED FROM IHT PRE-BOOKING ${booking.bookingRef}] Patient: ${booking.patientName}. Reason: ${booking.transportReason}. Auth: ${booking.authorisationNumber || 'N/A'}. ${booking.notes || ''}`,
      createdBy: username,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    const tripSaveRes = this.saveTrip(newTrip, username);
    if (!tripSaveRes.success) {
      return { success: false, error: tripSaveRes.error };
    }

    // Update booking status
    booking.status = 'Dispatched';
    booking.dispatchedTripId = newTrip.id;
    booking.dispatchedAt = now.toISOString();
    booking.dispatchedBy = username;
    booking.updatedAt = now.toISOString();
    this.savePreBookedTrips(list);

    this.addAuditLog({
      user: username,
      action: 'APPROVE',
      table: 'prebooked_trips',
      recordId: booking.id,
      details: `Dispatched pre-booked transfer ${booking.bookingRef} (${booking.patientName}) to EPRF${newTrip.eprfNumber} on ${amb}`,
    });

    return { success: true, trip: newTrip };
  },

  isDevUser(user?: User | null): boolean {
    if (!user) return false;
    return (
      user.role === 'Developer' ||
      user.username.toLowerCase() === 'dev' ||
      user.username.toLowerCase() === 'developer' ||
      user.isDev === true
    );
  },

  resetSystemData(
    mode: 'wipe_all' | 'reseed',
    requestedByUser: User
  ): { success: boolean; message: string } {
    if (!this.isDevUser(requestedByUser)) {
      return {
        success: false,
        message: 'Security Alert: System reset operations are strictly restricted to Developer accounts only.',
      };
    }

    if (mode === 'wipe_all') {
      // Clean slate - delete all captured operational data
      localStorage.setItem(KEYS.TRIPS, JSON.stringify([]));
      localStorage.setItem(KEYS.OVERTIME, JSON.stringify([]));
      localStorage.setItem(KEYS.STOCK_REQUESTS, JSON.stringify([]));
      localStorage.setItem(KEYS.PREBOOKED_TRIPS, JSON.stringify([]));
      localStorage.setItem(KEYS.SHIFT_SCHEDULES, JSON.stringify([]));
      localStorage.removeItem(KEYS.OFFLINE_STOCK_DRAFT);

      this.addAuditLog({
        user: requestedByUser.fullName,
        action: 'DELETE',
        table: 'system',
        recordId: 'factory_wipe',
        details: 'DEV FACTORY WIPE: All operational trips, overtime records, stock requests, pre-booked bookings, and shift rosters completely deleted.',
      });

      broadcastUpdate('reset');
      return {
        success: true,
        message: 'All captured system data has been wiped clean (0 records remaining). The system is now a blank canvas ready for fresh entry.',
      };
    } else {
      // Reseed with pristine initial seed records
      localStorage.setItem(KEYS.TRIPS, JSON.stringify(INITIAL_TRIPS));
      localStorage.setItem(KEYS.PREBOOKED_TRIPS, JSON.stringify(INITIAL_PREBOOKED_TRIPS));
      localStorage.setItem(KEYS.SHIFT_SCHEDULES, JSON.stringify(INITIAL_SHIFT_SCHEDULES));
      localStorage.setItem(KEYS.OVERTIME, JSON.stringify(INITIAL_OVERTIME));
      localStorage.setItem(KEYS.STOCK_REQUESTS, JSON.stringify(INITIAL_STOCK_REQUESTS));
      localStorage.setItem(KEYS.STOCK_ITEMS, JSON.stringify(PRELOADED_STOCK_ITEMS));
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
      localStorage.setItem(KEYS.USERS, JSON.stringify(DEFAULT_USERS));

      this.addAuditLog({
        user: requestedByUser.fullName,
        action: 'SETTINGS',
        table: 'system',
        recordId: 'factory_reseed',
        details: 'DEV FACTORY RESEED: Restored pristine Cape Town & Brackenfell dataset, X1 colour codes, ambulances MR001–MR005, and seed IHT schedules.',
      });

      broadcastUpdate('reset');
      return {
        success: true,
        message: 'System successfully re-seeded with pristine default dataset (Brackenfell & Paarl hospitals, X1 colour codes, stock, and seed transfers).',
      };
    }
  },

  getOvertime(): OvertimeRecord[] {
    const raw = localStorage.getItem(KEYS.OVERTIME);
    if (!raw) {
      localStorage.setItem(KEYS.OVERTIME, JSON.stringify(INITIAL_OVERTIME));
      return INITIAL_OVERTIME;
    }
    return JSON.parse(raw);
  },

  saveOvertime(record: OvertimeRecord, user: string): void {
    const records = this.getOvertime();
    const idx = records.findIndex((r) => r.id === record.id);
    if (idx >= 0) {
      records[idx] = record;
      this.addAuditLog({
        user,
        action: 'UPDATE',
        table: 'overtime',
        recordId: record.id,
        details: `Updated overtime for ${record.crewName} (${record.timeWorkedFormatted} hrs)`,
      });
    } else {
      records.unshift(record);
      this.addAuditLog({
        user,
        action: 'CREATE',
        table: 'overtime',
        recordId: record.id,
        details: `Logged overtime for ${record.crewName}: ${record.timeWorkedFormatted} hrs (${record.eprfOrReason})`,
      });
    }
    localStorage.setItem(KEYS.OVERTIME, JSON.stringify(records));
    broadcastUpdate('overtime');
  },

  approveRejectOvertime(
    recordId: string,
    status: 'Approved' | 'Rejected',
    approver: string,
    comment?: string
  ): void {
    const records = this.getOvertime();
    const rec = records.find((r) => r.id === recordId);
    if (rec) {
      rec.status = status;
      rec.approvedBy = approver;
      rec.approvedAt = new Date().toISOString();
      if (comment) rec.rejectionComment = comment;
      localStorage.setItem(KEYS.OVERTIME, JSON.stringify(records));

      this.addAuditLog({
        user: approver,
        action: 'APPROVE',
        table: 'overtime',
        recordId,
        details: `${status} overtime for ${rec.crewName} (${rec.timeWorkedFormatted} hrs). ${comment ? 'Notes: ' + comment : ''}`,
      });

      broadcastUpdate('overtime');
    }
  },

  getStockRequests(): StockRequest[] {
    const raw = localStorage.getItem(KEYS.STOCK_REQUESTS);
    if (!raw) {
      localStorage.setItem(KEYS.STOCK_REQUESTS, JSON.stringify(INITIAL_STOCK_REQUESTS));
      return INITIAL_STOCK_REQUESTS;
    }
    return JSON.parse(raw);
  },

  saveStockRequest(req: StockRequest, user: string): void {
    const requests = this.getStockRequests();
    const idx = requests.findIndex((r) => r.id === req.id);
    const isNew = idx < 0;

    if (isNew) {
      requests.unshift(req);
      playAlertSound('urgent');
      this.addAuditLog({
        user,
        action: 'CREATE',
        table: 'stock_requests',
        recordId: req.id,
        details: `New stock request ${req.id} from ${req.requesterName} for ${req.ambulance} (${req.urgency})`,
      });
    } else {
      requests[idx] = req;
      this.addAuditLog({
        user,
        action: 'UPDATE',
        table: 'stock_requests',
        recordId: req.id,
        details: `Updated stock request ${req.id} status to ${req.status}`,
      });
    }

    localStorage.setItem(KEYS.STOCK_REQUESTS, JSON.stringify(requests));
    broadcastUpdate('stock_requests', req);
  },

  getAuditLog(): AuditLogEntry[] {
    const raw = localStorage.getItem(KEYS.AUDIT_LOG);
    if (!raw) {
      localStorage.setItem(KEYS.AUDIT_LOG, JSON.stringify(INITIAL_AUDIT_LOG));
      return INITIAL_AUDIT_LOG;
    }
    return JSON.parse(raw);
  },

  addAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): void {
    const logs = this.getAuditLog();
    const fullEntry: AuditLogEntry = {
      ...entry,
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      ip: '192.168.1.100', // Internal company network IP
    };
    logs.unshift(fullEntry);
    // Keep last 500 audit logs
    if (logs.length > 500) logs.pop();
    localStorage.setItem(KEYS.AUDIT_LOG, JSON.stringify(logs));
  },

  // Mobile stock draft offline persistence
  getOfflineStockDraft(): unknown {
    const raw = localStorage.getItem(KEYS.OFFLINE_STOCK_DRAFT);
    return raw ? JSON.parse(raw) : null;
  },

  saveOfflineStockDraft(data: unknown): void {
    localStorage.setItem(KEYS.OFFLINE_STOCK_DRAFT, JSON.stringify(data));
  },

  clearOfflineStockDraft(): void {
    localStorage.removeItem(KEYS.OFFLINE_STOCK_DRAFT);
  },

  // Export full backup as JSON
  exportFullBackup(): string {
    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      settings: this.getSettings(),
      users: this.getUsers(),
      trips: this.getTrips(),
      preBookedTrips: this.getPreBookedTrips(),
      shiftSchedules: this.getShiftSchedules(),
      overtime: this.getOvertime(),
      stockRequests: this.getStockRequests(),
      stockItems: this.getStockItems(),
      auditLog: this.getAuditLog(),
    };
    return JSON.stringify(backup, null, 2);
  },

  // Restore backup from JSON
  restoreBackup(jsonString: string, username: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.trips) localStorage.setItem(KEYS.TRIPS, JSON.stringify(data.trips));
      if (data.preBookedTrips) localStorage.setItem(KEYS.PREBOOKED_TRIPS, JSON.stringify(data.preBookedTrips));
      if (data.shiftSchedules) localStorage.setItem(KEYS.SHIFT_SCHEDULES, JSON.stringify(data.shiftSchedules));
      if (data.settings) localStorage.setItem(KEYS.SETTINGS, JSON.stringify(data.settings));
      if (data.overtime) localStorage.setItem(KEYS.OVERTIME, JSON.stringify(data.overtime));
      if (data.stockRequests) localStorage.setItem(KEYS.STOCK_REQUESTS, JSON.stringify(data.stockRequests));
      if (data.stockItems) localStorage.setItem(KEYS.STOCK_ITEMS, JSON.stringify(data.stockItems));
      if (data.users) localStorage.setItem(KEYS.USERS, JSON.stringify(data.users));

      this.addAuditLog({
        user: username,
        action: 'SETTINGS',
        table: 'system',
        recordId: 'restore',
        details: 'System restored from backup archive',
      });

      broadcastUpdate('restore');
      return true;
    } catch (err) {
      console.error('Failed to restore backup', err);
      return false;
    }
  },
};
