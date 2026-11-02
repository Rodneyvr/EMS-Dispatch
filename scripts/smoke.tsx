/**
 * Temporary runtime smoke test: renders every top-level view with a
 * localStorage/window shim to catch runtime render errors.
 */
import { renderToString } from 'react-dom/server';
import { createRequire } from 'node:module';
import React from 'react';

const requireModule = createRequire(import.meta.url);

const store = new Map<string, string>();
const localStorageShim = {
  getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: (i: number) => Array.from(store.keys())[i] ?? null,
  get length() {
    return store.size;
  },
};

const listeners: Record<string, Function[]> = {};
const windowShim: any = {
  localStorage: localStorageShim,
  sessionStorage: localStorageShim,
  addEventListener: (t: string, f: Function) => void (listeners[t] ||= []).push(f),
  removeEventListener: (t: string, f: Function) => {
    listeners[t] = (listeners[t] || []).filter((x) => x !== f);
  },
  dispatchEvent: () => true,
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  location: { href: 'http://localhost/', reload() {} },
};
(globalThis as any).window = windowShim;
(globalThis as any).localStorage = localStorageShim;
(globalThis as any).sessionStorage = localStorageShim;
try {
  (globalThis as any).navigator = { userAgent: 'node' };
} catch {
  /* Node 24 exposes a read-only navigator; that's fine */
}

const failures: string[] = [];

function check(name: string, fn: () => string) {
  try {
    const html = fn();
    if (!html || html.length < 20) {
      throw new Error(`suspiciously short output (${html.length} chars)`);
    }
    console.log(`PASS  ${name}  (${html.length} chars)`);
  } catch (e: any) {
    failures.push(`${name}: ${e?.stack || e?.message || e}`);
    console.log(`FAIL  ${name}: ${e?.message || e}`);
  }
}

const noop = () => {};

const App = requireModule('../src/App').default;
const { Storage } = requireModule('../src/utils/storage');
const { TripForm } = requireModule('../src/components/TripForm');
const { TripLogTable } = requireModule('../src/components/TripLogTable');
const { OvertimeModule } = requireModule('../src/components/OvertimeModule');
const { StockBackOffice } = requireModule('../src/components/StockBackOffice');
const { DashboardView } = requireModule('../src/components/DashboardView');
const { ReportsView } = requireModule('../src/components/ReportsView');
const { SettingsView } = requireModule('../src/components/SettingsView');
const { MobileStockRequest } = requireModule('../src/components/MobileStockRequest');
const { LoginScreen } = requireModule('../src/components/LoginScreen');
const { SchedulingHub } = requireModule('../src/components/SchedulingHub');
const { Masthead } = requireModule('../src/components/Masthead');
const { TabsNav } = requireModule('../src/components/TabsNav');
const { GlobalSearchBar } = requireModule('../src/components/GlobalSearchBar');

const user = Storage.getCurrentUser();
const trips = Storage.getTrips();
const preBooked = Storage.getPreBookedTrips();
const overtime = Storage.getOvertime();
const stockRequests = Storage.getStockRequests();
const settings = Storage.getSettings();


// 1. Whole app, unauthenticated -> LoginScreen
check('App (logged out)', () => renderToString(<App />));

// 2. Whole app, authenticated -> dashboard
Storage.login(user.id);
check('App (logged in, dashboard)', () => renderToString(<App />));

// 3. Individual views
check('LoginScreen', () => renderToString(<LoginScreen settings={settings} onLoginSuccess={noop} />));
check('Masthead', () =>
  renderToString(
    <Masthead
      currentUser={user}
      onUserChange={noop}
      onLogout={noop}
      onOpenMobilePwa={noop}
      openStockRequestsCount={1}
      onGoToStockTab={noop}
      onSelectSearchResult={noop}
      onOpenDevReset={noop}
      onOpenAiPrompt={noop}
    />
  )
);
check('TabsNav', () =>
  renderToString(
    <TabsNav activeTab="dashboard" onTabChange={noop} userRole="Admin" openStockCount={2} />
  )
);
check('GlobalSearchBar', () => renderToString(<GlobalSearchBar onSelectResult={noop} />));
check('DashboardView', () =>
  renderToString(
    <DashboardView
      trips={trips}
      preBookedTrips={preBooked}
      overtime={overtime}
      stockRequests={stockRequests}
      settings={settings}
      onNavigateTab={noop}
    />
  )
);
check('TripForm (new)', () =>
  renderToString(
    <TripForm initialTrip={null} onSaved={noop} onCancel={noop} currentUser={user.username} />
  )
);
check('TripForm (edit)', () =>
  renderToString(
    <TripForm
      initialTrip={trips[0] ?? null}
      onSaved={noop}
      onCancel={noop}
      currentUser={user.username}
    />
  )
);
check('TripLogTable', () =>
  renderToString(
    <TripLogTable
      trips={trips}
      userRole={user.role}
      currentUsername={user.username}
      onEditTrip={noop}
      onRefresh={noop}
    />
  )
);
check('OvertimeModule', () =>
  renderToString(
    <OvertimeModule userRole={user.role} currentUsername={user.username} onRefresh={noop} />
  )
);
check('StockBackOffice', () =>
  renderToString(
    <StockBackOffice userRole={user.role} currentUsername={user.username} onRefresh={noop} />
  )
);
check('ReportsView', () =>
  renderToString(
    <ReportsView
      trips={trips}
      overtime={overtime}
      stockRequests={stockRequests}
      settings={settings}
      userRole={user.role}
      currentUsername={user.username}
      onRefresh={noop}
    />
  )
);
check('SettingsView', () =>
  renderToString(
    <SettingsView
      currentUsername={user.username}
      currentUser={user}
      onRefresh={noop}
      onOpenDevReset={noop}
      onOpenAiPrompt={noop}
    />
  )
);
check('MobileStockRequest', () =>
  renderToString(<MobileStockRequest currentUser={user} onSubmitted={noop} onClose={noop} />)
);
check('SchedulingHub', () =>
  renderToString(
    <SchedulingHub
      userRole={user.role}
      currentUsername={user.username}
      onRefresh={noop}
      onNavigateToTripLog={noop}
    />
  )
);

console.log('\n--- storage round-trip checks ---');
function rt(name: string, fn: () => boolean) {
  try {
    console.log(`${fn() ? 'PASS' : 'FAIL'}  ${name}`);
  } catch (e: any) {
    failures.push(`storage ${name}: ${e?.stack || e?.message}`);
    console.log(`FAIL  ${name}: ${e?.message}`);
  }
}
rt('settings round-trip', () => {
  Storage.saveSettings(settings);
  return Storage.getSettings().bases.length === settings.bases.length;
});
rt('trips round-trip (update existing)', () => {
  const before = Storage.getTrips().length;
  const res = Storage.saveTrip({ ...trips[0] }, user.username);
  if (!res.success) throw new Error(res.error);
  return Storage.getTrips().length === before;
});
rt('trips duplicate ePRF rejected', () => {
  const dup = { ...trips[0], id: 'smoke-dup-id' };
  const res = Storage.saveTrip(dup, user.username);
  return res.success === false && !!res.error;
});
rt('users round-trip', () => {
  Storage.saveUsers(Storage.getUsers());
  return Storage.getUsers().length > 0;
});
rt('stock items round-trip', () => {
  Storage.saveStockItems(Storage.getStockItems());
  return Storage.getStockItems().length > 0;
});

// 4. Modals and scheduling sub-views
const { DevResetModal } = requireModule('../src/components/DevResetModal');
const { AiMasterPromptModal } = requireModule('../src/components/AiMasterPromptModal');
const { IhtScheduleView } = requireModule('../src/components/IhtScheduleView');
const { ShiftScheduleView } = requireModule('../src/components/ShiftScheduleView');

check('DevResetModal (open)', () =>
  renderToString(
    <DevResetModal isOpen onClose={noop} currentUser={user} onResetComplete={noop} />
  )
);
check('AiMasterPromptModal (open)', () =>
  renderToString(<AiMasterPromptModal isOpen onClose={noop} />)
);
check('IhtScheduleView', () =>
  renderToString(
    <IhtScheduleView
      userRole={user.role}
      currentUsername={user.username}
      onRefresh={noop}
      onNavigateToTripLog={noop}
    />
  )
);
check('ShiftScheduleView', () =>
  renderToString(
    <ShiftScheduleView userRole={user.role} currentUsername={user.username} onRefresh={noop} />
  )
);

// 5. Utility functions
console.log('\n--- utility checks ---');
const tc = requireModule('../src/utils/timeCalculations');
const { getMonthSheetName, getOtSheetName } = requireModule('../src/utils/excelExport');
const utils: [string, () => boolean][] = [
  ['parseMinutesFromTimeStr("06:30") === 390', () => tc.parseMinutesFromTimeStr('06:30') === 390],
  ['formatMinutesToHMM(390) === "6:30"', () => tc.formatMinutesToHMM(390) === '6:30'],
  ['formatMinutesToHMM(0) === "0:00"', () => tc.formatMinutesToHMM(0) === '0:00'],
  ['formatMinutesToHMM(-5) === "0:00"', () => tc.formatMinutesToHMM(-5) === '0:00'],
  ['formatDateSA("2026-02-15") === "15/02/2026"', () => tc.formatDateSA('2026-02-15') === '15/02/2026'],
  ['calculateMinutesBetween(23:00, 01:00) === 120', () => tc.calculateMinutesBetween('23:00', '01:00') === 120],
  ['crossesMidnight(23:00, 01:00)', () => tc.crossesMidnight('23:00', '01:00') === true],
  ['getShiftFromTime("20:00") === Night', () => tc.getShiftFromTime('20:00') === 'Night'],
  ['getShiftFromTime("08:00") === Day', () => tc.getShiftFromTime('08:00') === 'Day'],
  ['getMonthSheetName("2026-02-15")', () => typeof getMonthSheetName('2026-02-15') === 'string'],
  ['getOtSheetName("2026-02-15")', () => typeof getOtSheetName('2026-02-15') === 'string'],
];
for (const [name, fn] of utils) {
  try {
    const ok = fn();
    if (!ok) failures.push(`util ${name}`);
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  } catch (e: any) {
    failures.push(`util ${name}: ${e?.message}`);
    console.log(`FAIL  ${name}: ${e?.message}`);
  }
}

if (failures.length) {
  console.log(`\n${failures.length} FAILURE(S):\n\n` + failures.join('\n\n'));
  process.exit(1);
}
console.log('\nAll smoke checks passed.');
