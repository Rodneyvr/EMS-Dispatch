/**
 * ResQ EMS Dispatch & Stock Management System
 * Production-ready South African EMS operations application.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  User,
  Trip,
  OvertimeRecord,
  StockRequest,
  AppSettings,
  PreBookedTrip,
} from './types';
import { Storage } from './utils/storage';
import { Masthead } from './components/Masthead';
import { TabsNav, TabId } from './components/TabsNav';
import { TripForm } from './components/TripForm';
import { TripLogTable } from './components/TripLogTable';
import { OvertimeModule } from './components/OvertimeModule';
import { MobileStockRequest } from './components/MobileStockRequest';
import { StockBackOffice } from './components/StockBackOffice';
import { DashboardView } from './components/DashboardView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { SearchResultItem, GlobalSearchBar } from './components/GlobalSearchBar';
import { LoginScreen } from './components/LoginScreen';
import { SchedulingHub } from './components/SchedulingHub';
import { DevResetModal } from './components/DevResetModal';
import { AiMasterPromptModal } from './components/AiMasterPromptModal';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => Storage.isLoggedIn());
  const [currentUser, setCurrentUser] = useState<User>(() => Storage.getCurrentUser());
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [trips, setTrips] = useState<Trip[]>(() => Storage.getTrips());
  const [preBookedTrips, setPreBookedTrips] = useState<PreBookedTrip[]>(() =>
    Storage.getPreBookedTrips()
  );
  const [overtime, setOvertime] = useState<OvertimeRecord[]>(() => Storage.getOvertime());
  const [stockRequests, setStockRequests] = useState<StockRequest[]>(() =>
    Storage.getStockRequests()
  );
  const [settings, setSettings] = useState<AppSettings>(() => Storage.getSettings());
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);

  // Modals state
  const [isDevResetOpen, setIsDevResetOpen] = useState<boolean>(false);
  const [isAiPromptOpen, setIsAiPromptOpen] = useState<boolean>(false);

  // Sync state from storage
  const refreshAllData = useCallback(() => {
    setTrips(Storage.getTrips());
    setPreBookedTrips(Storage.getPreBookedTrips());
    setOvertime(Storage.getOvertime());
    setStockRequests(Storage.getStockRequests());
    setSettings(Storage.getSettings());
    setCurrentUser(Storage.getCurrentUser());
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    // User request: "Let the dashboard be the first screen and main screen when logging in"
    setActiveTab('dashboard');
    refreshAllData();
  };

  const handleLogout = () => {
    Storage.logout();
    setIsAuthenticated(false);
    setActiveTab('dashboard');
  };

  // Handle Global Search Result Selection
  const handleSelectSearchResult = (result: SearchResultItem) => {
    if (result.category === 'trips') {
      setActiveTab('trip_log');
      // If user is Admin or Dispatcher, also allow opening/viewing
    } else if (result.category === 'stock' || result.category === 'catalogue') {
      setActiveTab('stock_requests');
    } else if (result.category === 'overtime') {
      setActiveTab('overtime');
    } else if (result.category === 'crew' || result.category === 'fleet') {
      setActiveTab('settings');
    }
  };

  // Listen to cross-module live updates
  useEffect(() => {
    const handleUpdate = () => {
      refreshAllData();
    };

    window.addEventListener('resq-data-update', handleUpdate);
    return () => window.removeEventListener('resq-data-update', handleUpdate);
  }, [refreshAllData]);

  // Adjust active tab when user role changes
  useEffect(() => {
    if (currentUser.role === 'Paramedic') {
      setActiveTab('mobile_stock');
    } else if (currentUser.role === 'StockController') {
      setActiveTab('stock_requests');
    } else if (currentUser.role === 'Management' || currentUser.role === 'ReadOnly') {
      if (activeTab === 'new_trip') setActiveTab('dashboard');
    } else if (currentUser.role === 'Office') {
      if (activeTab === 'new_trip') setActiveTab('trip_log');
    }
  }, [currentUser.role]);

  // Handle trip saved
  const handleTripSaved = (savedTrip: Trip, saveAndNew: boolean) => {
    refreshAllData();
    if (!saveAndNew) {
      setEditingTrip(null);
      setActiveTab('trip_log');
    }
  };

  const handleEditTrip = (trip: Trip) => {
    setEditingTrip(trip);
    setActiveTab('new_trip');
  };

  const openStockRequestsCount = stockRequests.filter((r) => r.status === 'Submitted').length;
  const activeTheme = settings.theme || 'black_red_white';
  const themeClass = activeTheme === 'black_red_white' ? 'theme-black-red-white' : '';

  // User requirement: "Use login screens for users to login and log out of their profiles, so all captured data gets logged with user information to prevent anyone from accessing or approving things their not supposed to."
  if (!isAuthenticated) {
    return <LoginScreen settings={settings} onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className={`min-h-screen bg-slate-100 flex flex-col text-slate-900 font-sans ${themeClass}`}>
      {/* Dark Clinical Masthead with animated ambulance, ECG, live SAST clock, role switcher */}
      <Masthead
        currentUser={currentUser}
        onUserChange={(newUser) => setCurrentUser(newUser)}
        onLogout={handleLogout}
        onOpenMobilePwa={() => setActiveTab('mobile_stock')}
        openStockRequestsCount={openStockRequestsCount}
        onGoToStockTab={() => setActiveTab('stock_requests')}
        onSelectSearchResult={handleSelectSearchResult}
        onOpenDevReset={() => setIsDevResetOpen(true)}
        onOpenAiPrompt={() => setIsAiPromptOpen(true)}
      />

      {/* Mobile-Only Search Bar (shown on smaller screens below masthead) */}
      <div className="sm:hidden bg-slate-900 px-3 py-2 border-b border-slate-800">
        <GlobalSearchBar onSelectResult={handleSelectSearchResult} className="w-full" />
      </div>

      {/* Tabs Navigation (hidden in pure mobile paramedic mode for screen real estate) */}
      {activeTab !== 'mobile_stock' ? (
        <TabsNav
          activeTab={activeTab}
          onTabChange={(tab) => {
            if (tab === 'new_trip') setEditingTrip(null);
            setActiveTab(tab);
          }}
          userRole={currentUser.role}
          openStockCount={openStockRequestsCount}
        />
      ) : (
        /* Top Banner when in Mobile Paramedic Mode */
        <div className="bg-slate-800 text-white px-4 py-2 flex items-center justify-between text-xs border-b border-slate-700">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            <span className="font-semibold text-slate-200">
              Paramedic Smartphone View · Touch Targets 48px+
            </span>
          </div>
          <button
            onClick={() => setActiveTab('trip_log')}
            className="text-xs text-red-400 hover:text-white underline font-semibold cursor-pointer"
          >
            ← Return to Desktop Dispatcher System
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6">
        {activeTab === 'new_trip' && (
          <TripForm
            initialTrip={editingTrip}
            onSaved={handleTripSaved}
            onCancel={() => {
              setEditingTrip(null);
              setActiveTab('trip_log');
            }}
            currentUser={currentUser.username}
          />
        )}

        {activeTab === 'iht_schedule' && (
          <SchedulingHub
            userRole={currentUser.role}
            currentUsername={currentUser.username}
            onRefresh={refreshAllData}
            onNavigateToTripLog={() => setActiveTab('trip_log')}
          />
        )}

        {activeTab === 'trip_log' && (
          <TripLogTable
            trips={trips}
            userRole={currentUser.role}
            currentUsername={currentUser.username}
            onEditTrip={handleEditTrip}
            onRefresh={refreshAllData}
          />
        )}

        {activeTab === 'overtime' && (
          <OvertimeModule
            userRole={currentUser.role}
            currentUsername={currentUser.username}
            onRefresh={refreshAllData}
          />
        )}

        {activeTab === 'stock_requests' && (
          <StockBackOffice
            userRole={currentUser.role}
            currentUsername={currentUser.username}
            onRefresh={refreshAllData}
          />
        )}

        {activeTab === 'dashboard' && (
          <DashboardView
            trips={trips}
            preBookedTrips={preBookedTrips}
            overtime={overtime}
            stockRequests={stockRequests}
            settings={settings}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView
            trips={trips}
            overtime={overtime}
            stockRequests={stockRequests}
            settings={settings}
            userRole={currentUser.role}
            currentUsername={currentUser.username}
            onRefresh={refreshAllData}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            currentUsername={currentUser.username}
            currentUser={currentUser}
            onRefresh={refreshAllData}
            onOpenDevReset={() => setIsDevResetOpen(true)}
            onOpenAiPrompt={() => setIsAiPromptOpen(true)}
          />
        )}

        {activeTab === 'mobile_stock' && (
          <div className="py-2">
            <MobileStockRequest
              currentUser={currentUser}
              onSubmitted={refreshAllData}
              onClose={() => setActiveTab('trip_log')}
            />
          </div>
        )}
      </main>

      {/* Developer Reset Modal (Security checked: only works when dev is logged in) */}
      <DevResetModal
        isOpen={isDevResetOpen}
        onClose={() => setIsDevResetOpen(false)}
        currentUser={currentUser}
        onResetComplete={refreshAllData}
      />

      {/* Master AI Prompt & Blueprint Modal */}
      <AiMasterPromptModal
        isOpen={isAiPromptOpen}
        onClose={() => setIsAiPromptOpen(false)}
      />

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 text-xs py-3 px-4 text-center">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <strong>ResQ EMS Dispatch, Trip Log &amp; Stock System</strong> · South African
            Regulations &amp; SATS Triage Compliant
          </div>
          <div className="text-[11px] text-slate-500 font-mono-data">
            Local LAN Deployment · Timezone: Africa/Johannesburg (SAST) · POPIA Audit Logging Active
          </div>
        </div>
      </footer>
    </div>
  );
}
