import React from 'react';
import { UserRole } from '../types';
import {
  PlusCircle,
  FileText,
  Clock,
  Package,
  LayoutDashboard,
  BarChart3,
  Settings,
  Smartphone,
  CalendarCheck,
} from 'lucide-react';

export type TabId =
  | 'new_trip'
  | 'iht_schedule'
  | 'trip_log'
  | 'overtime'
  | 'stock_requests'
  | 'dashboard'
  | 'reports'
  | 'settings'
  | 'mobile_stock';

interface TabsNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  userRole: UserRole;
  openStockCount: number;
}

export const TabsNav: React.FC<TabsNavProps> = ({
  activeTab,
  onTabChange,
  userRole,
  openStockCount,
}) => {
  // Determine tab availability based on user role
  const isTabVisible = (tab: TabId): boolean => {
    switch (tab) {
      case 'dashboard':
        return true; // Dashboard is the main operational screen for all users
      case 'new_trip':
        return userRole === 'Admin' || userRole === 'Dispatcher' || userRole === 'Developer';
      case 'iht_schedule':
        return userRole !== 'Paramedic';
      case 'trip_log':
        return userRole !== 'Paramedic';
      case 'overtime':
        return userRole !== 'Paramedic' && userRole !== 'StockController';
      case 'stock_requests':
        return userRole !== 'Paramedic' && userRole !== 'Office' && userRole !== 'ReadOnly';
      case 'reports':
        return userRole === 'Admin' || userRole === 'Management' || userRole === 'Office' || userRole === 'ReadOnly' || userRole === 'Developer';
      case 'settings':
        return userRole === 'Admin' || userRole === 'Developer';
      case 'mobile_stock':
        return true; // accessible for test preview anytime
      default:
        return false;
    }
  };

  const tabs: { id: TabId; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'new_trip', label: 'New Trip', icon: <PlusCircle className="w-4 h-4" /> },
    { id: 'iht_schedule', label: 'Scheduling', icon: <CalendarCheck className="w-4 h-4" /> },
    { id: 'trip_log', label: 'Trip Log', icon: <FileText className="w-4 h-4" /> },
    { id: 'overtime', label: 'Overtime', icon: <Clock className="w-4 h-4" /> },
    {
      id: 'stock_requests',
      label: 'Stock Requests',
      icon: <Package className="w-4 h-4" />,
      badge: openStockCount > 0 ? openStockCount : undefined,
    },
    { id: 'reports', label: 'Reports & Exports', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <nav className="bg-slate-800 border-b border-slate-700 shadow-sm sticky top-[60px] z-30">
      <div className="max-w-7xl mx-auto px-2 sm:px-6">
        <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto py-1 scrollbar-none">
          {tabs
            .filter((t) => isTabVisible(t.id))
            .map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-semibold rounded-md transition whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-red-600 text-white shadow-sm font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/70'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className="ml-1 px-1.5 py-0.2 bg-amber-400 text-slate-900 rounded-full text-[10px] font-black">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}

          {/* Quick Param Mobile PWA button inside tab bar */}
          <div className="ml-auto pl-2 flex items-center">
            <button
              onClick={() => onTabChange('mobile_stock')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-md border transition cursor-pointer ${
                activeTab === 'mobile_stock'
                  ? 'bg-slate-900 text-red-400 border-red-500 shadow-inner'
                  : 'text-slate-300 border-slate-600 hover:bg-slate-700 hover:text-white'
              }`}
              title="Switch to Paramedic Mobile Stock App view"
            >
              <Smartphone className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden sm:inline">Paramedic PWA Mode</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
