import React, { useState, useMemo, useRef } from 'react';
import {
  AppSettings,
  AmbulanceUnit,
  CrewMember,
  AuditLogEntry,
  User,
  UserRole,
  StockItem,
} from '../types';
import { Storage, playAlertSound } from '../utils/storage';
import { formatDateSA } from '../utils/timeCalculations';
import { exportAuditLogCSV } from '../utils/excelExport';
import {
  DEFAULT_COLOUR_CODES,
  DEFAULT_HOSPITALS,
  PRELOADED_STOCK_ITEMS,
  DEFAULT_AMBULANCES,
  DEFAULT_CREW,
  DEFAULT_USERS,
  DEFAULT_SETTINGS,
} from '../data/seedData';
import {
  Settings,
  Shield,
  Ambulance,
  Users,
  Building,
  Database,
  Save,
  Plus,
  Trash2,
  Download,
  Upload,
  Edit2,
  Image,
  Key,
  CheckCircle2,
  RotateCcw,
  Palette,
  Lock,
  UserPlus,
  X,
  FileText,
  Tag,
  LogIn,
  Package,
  Search,
  ShieldAlert,
  Terminal,
  Copy,
  Check,
  FileSpreadsheet,
} from 'lucide-react';
import { MASTER_AI_PROMPT } from './AiMasterPromptModal';

interface SettingsViewProps {
  currentUsername: string;
  currentUser?: User;
  onRefresh: () => void;
  onOpenDevReset?: () => void;
  onOpenAiPrompt?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUsername,
  currentUser,
  onRefresh,
  onOpenDevReset,
  onOpenAiPrompt,
}) => {
  const [settings, setSettings] = useState<AppSettings>(Storage.getSettings());
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(Storage.getAuditLog());
  const [users, setUsers] = useState<User[]>(Storage.getUsers());
  const [stockItems, setStockItems] = useState<StockItem[]>(Storage.getStockItems());
  const [promptCopied, setPromptCopied] = useState(false);

  const activeUser = currentUser || Storage.getCurrentUser();
  const isDev = Storage.isDevUser(activeUser);

  const [activeTab, setActiveTab] = useState<
    'general' | 'employees' | 'fleet' | 'crew' | 'colour_codes' | 'preloaded' | 'audit' | 'backup' | 'ai_prompt' | 'dev_reset'
  >('general');

  // General settings state
  const [companyName, setCompanyName] = useState(settings.companyName);
  const [appName, setAppName] = useState(settings.appName);
  const [workbookName, setWorkbookName] = useState(settings.workbookName);
  const [companyLogoUrl, setCompanyLogoUrl] = useState(settings.companyLogoUrl || '');
  const [theme, setTheme] = useState<'black_red_white' | 'clinical_dark' | 'clean_white'>(
    settings.theme || 'black_red_white'
  );
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Crew view mode: 'surname' or 'qualification'
  const [crewSortMode, setCrewSortMode] = useState<'surname' | 'qualification'>('surname');

  // Modal / Editing states
  const [editingAmbulance, setEditingAmbulance] = useState<AmbulanceUnit | null>(null);
  const [newFleetNo, setNewFleetNo] = useState('');
  const [newReg, setNewReg] = useState('');
  const [newAmbBase, setNewAmbBase] = useState(settings.bases[0] || 'Main Base');

  const [editingCrew, setEditingCrew] = useState<CrewMember | null>(null);
  const [newCrewName, setNewCrewName] = useState('');
  const [newCrewQual, setNewCrewQual] = useState<'BLS' | 'ECA' | 'AEA' | 'ILS' | 'ECT' | 'ALS' | 'Paramedic'>('ILS');
  const [newCrewHpcsa, setNewCrewHpcsa] = useState('');
  const [newCrewMobile, setNewCrewMobile] = useState('');
  const [newCrewBase, setNewCrewBase] = useState(settings.bases[0] || 'Main Base');

  // Employee Modal / Add State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newEmpFullName, setNewEmpFullName] = useState('');
  const [newEmpSurname, setNewEmpSurname] = useState('');
  const [newEmpUsername, setNewEmpUsername] = useState('');
  const [newEmpPassword, setNewEmpPassword] = useState('');
  const [newEmpRole, setNewEmpRole] = useState<UserRole>('Dispatcher');
  const [newEmpBase, setNewEmpBase] = useState(settings.bases[0] || 'Main Base');
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpMobile, setNewEmpMobile] = useState('');
  const [newEmpPin, setNewEmpPin] = useState('');
  const [newEmpQual, setNewEmpQual] = useState('');

  // Colour Codes / Preloaded state
  const [newColourCode, setNewColourCode] = useState('');
  const [editingColourCodeIndex, setEditingColourCodeIndex] = useState<number | null>(null);
  const [editingColourCodeValue, setEditingColourCodeValue] = useState('');

  // Hospital state
  const [newHospitalName, setNewHospitalName] = useState('');
  const [editingHospitalIndex, setEditingHospitalIndex] = useState<number | null>(null);
  const [editingHospitalValue, setEditingHospitalValue] = useState('');

  // Station Base State
  const [newBaseName, setNewBaseName] = useState('');

  // Preloaded Stock Catalogue Management state
  const [stockSearch, setStockSearch] = useState('');
  const [stockCatFilter, setStockCatFilter] = useState('ALL');
  const [editingStockItem, setEditingStockItem] = useState<StockItem | null>(null);
  const [newStockCategory, setNewStockCategory] = useState('Airway & breathing');
  const [newStockName, setNewStockName] = useState('');
  const [newStockUnit, setNewStockUnit] = useState('each');
  const [newStockControlled, setNewStockControlled] = useState(false);
  const [newStockRequiresALS, setNewStockRequiresALS] = useState(false);
  const [newStockMinLevel, setNewStockMinLevel] = useState('4');
  const [newStockCurrentStock, setNewStockCurrentStock] = useState('10');

  // Backup restore file state
  const [restoreFeedback, setRestoreFeedback] = useState<string | null>(null);

  // Audit Log Search & Filter state
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('ALL');
  const [auditExportFeedback, setAuditExportFeedback] = useState<string | null>(null);

  // Handle Logo Upload
  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Logo file size must be less than 2 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      setCompanyLogoUrl(dataUrl);
      const updated = { ...settings, companyLogoUrl: dataUrl, theme };
      Storage.saveSettings(updated, currentUsername);
      setSettings(updated);
      onRefresh();
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setCompanyLogoUrl('');
    const updated = { ...settings, companyLogoUrl: '', theme };
    Storage.saveSettings(updated, currentUsername);
    setSettings(updated);
    onRefresh();
  };

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...settings,
      companyName,
      appName,
      workbookName,
      companyLogoUrl,
      theme,
    };
    Storage.saveSettings(updated, currentUsername);
    setSettings(updated);
    alert('General settings & theme livery saved successfully.');
    onRefresh();
  };

  // AMBULANCE FLEET ACTIONS
  const handleAddAmbulance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFleetNo.trim() || !newReg.trim()) return;
    const newUnit: AmbulanceUnit = {
      id: `amb-${Date.now()}`,
      fleetNo: newFleetNo.trim().toUpperCase(),
      registration: newReg.trim().toUpperCase(),
      base: newAmbBase,
      active: true,
    };
    const updated = {
      ...settings,
      ambulances: [...settings.ambulances, newUnit],
    };
    Storage.saveSettings(updated, currentUsername);
    setSettings(updated);
    setNewFleetNo('');
    setNewReg('');
    onRefresh();
  };

  const handleSaveEditAmbulance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAmbulance) return;
    const updatedAmbs = settings.ambulances.map((a) =>
      a.id === editingAmbulance.id ? editingAmbulance : a
    );
    const updated = { ...settings, ambulances: updatedAmbs };
    Storage.saveSettings(updated, currentUsername);
    setSettings(updated);
    setEditingAmbulance(null);
    onRefresh();
  };

  const handleDeleteAmbulance = (id: string) => {
    if (confirm('Are you sure you want to remove this ambulance unit from the fleet?')) {
      const updated = {
        ...settings,
        ambulances: settings.ambulances.filter((a) => a.id !== id),
      };
      Storage.saveSettings(updated, currentUsername);
      setSettings(updated);
      onRefresh();
    }
  };

  // CREW ACTIONS
  const handleAddCrew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCrewName.trim() || !newCrewHpcsa.trim()) return;
    const newMember: CrewMember = {
      id: `c-${Date.now()}`,
      name: newCrewName.trim(),
      qualification: newCrewQual,
      hpcsaNo: newCrewHpcsa.trim().toUpperCase(),
      mobile: newCrewMobile.trim(),
      base: newCrewBase,
      active: true,
    };
    const updated = {
      ...settings,
      crewMembers: [...settings.crewMembers, newMember],
    };
    Storage.saveSettings(updated, currentUsername);
    setSettings(updated);
    setNewCrewName('');
    setNewCrewHpcsa('');
    setNewCrewMobile('');
    onRefresh();
  };

  const handleSaveEditCrew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCrew) return;
    const updatedCrew = settings.crewMembers.map((c) =>
      c.id === editingCrew.id ? editingCrew : c
    );
    const updated = { ...settings, crewMembers: updatedCrew };
    Storage.saveSettings(updated, currentUsername);
    setSettings(updated);
    setEditingCrew(null);
    onRefresh();
  };

  const handleDeleteCrew = (id: string) => {
    if (confirm('Are you sure you want to remove this crew member record?')) {
      const updated = {
        ...settings,
        crewMembers: settings.crewMembers.filter((c) => c.id !== id),
      };
      Storage.saveSettings(updated, currentUsername);
      setSettings(updated);
      onRefresh();
    }
  };

  // Sorted Crew list
  const sortedCrewMembers = useMemo(() => {
    return [...settings.crewMembers].sort((a, b) => {
      const surA = (a.name || '').trim().split(' ').slice(-1)[0];
      const surB = (b.name || '').trim().split(' ').slice(-1)[0];
      return surA.localeCompare(surB);
    });
  }, [settings.crewMembers]);

  // Grouped Crew list by Qualification (ALS, ILS, BLS, ECA/Other)
  const groupedCrewMembers = useMemo(() => {
    const qualCategories: { title: string; qual: string; badge: string; members: CrewMember[] }[] = [
      {
        title: 'Advanced Life Support (ALS)',
        qual: 'ALS',
        badge: 'bg-red-600 text-white',
        members: settings.crewMembers.filter(
          (c) => c.qualification === 'ALS' || c.qualification === 'Paramedic' || (c as any).qualification === 'ECP'
        ),
      },
      {
        title: 'Intermediate Life Support (ILS)',
        qual: 'ILS',
        badge: 'bg-black text-white',
        members: settings.crewMembers.filter(
          (c) => c.qualification === 'ILS' || c.qualification === 'AEA'
        ),
      },
      {
        title: 'Basic Life Support (BLS)',
        qual: 'BLS',
        badge: 'bg-neutral-800 text-white',
        members: settings.crewMembers.filter((c) => c.qualification === 'BLS'),
      },
      {
        title: 'Ambulance Assistant / Other (ECA / ECT)',
        qual: 'OTHER',
        badge: 'bg-neutral-600 text-white',
        members: settings.crewMembers.filter(
          (c) => !['ALS', 'Paramedic', 'ECP', 'ILS', 'AEA', 'BLS'].includes(c.qualification)
        ),
      },
    ];

    return qualCategories
      .map((cat) => ({
        ...cat,
        members: [...cat.members].sort((a, b) => {
          const surA = (a.name || '').trim().split(' ').slice(-1)[0];
          const surB = (b.name || '').trim().split(' ').slice(-1)[0];
          return surA.localeCompare(surB);
        }),
      }))
      .filter((cat) => cat.members.length > 0);
  }, [settings.crewMembers]);

  // Filtered Stock Catalogue for Preloaded Master Lists
  const filteredStockItems = useMemo(() => {
    return stockItems.filter((item) => {
      if (stockCatFilter !== 'ALL' && item.category !== stockCatFilter) return false;
      if (stockSearch.trim()) {
        const q = stockSearch.toLowerCase();
        return item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
      }
      return true;
    });
  }, [stockItems, stockCatFilter, stockSearch]);

  // EMPLOYEE / USER ACTIONS
  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpFullName.trim() || !newEmpUsername.trim()) return;

    const newEmp: User = {
      id: `u-${Date.now()}`,
      username: newEmpUsername.trim().toLowerCase(),
      fullName: newEmpFullName.trim(),
      surname: newEmpSurname.trim() || newEmpFullName.trim().split(' ').slice(-1)[0],
      password: newEmpPassword.trim() || 'Password123!',
      role: newEmpRole,
      base: newEmpBase,
      email: newEmpEmail.trim() || undefined,
      mobile: newEmpMobile.trim() || undefined,
      pin: newEmpPin.trim() || undefined,
      qualification: newEmpQual.trim() || undefined,
      active: true,
    };

    Storage.addEmployee(newEmp, currentUsername);
    setUsers(Storage.getUsers());
    setNewEmpFullName('');
    setNewEmpSurname('');
    setNewEmpUsername('');
    setNewEmpPassword('');
    setNewEmpEmail('');
    setNewEmpMobile('');
    setNewEmpPin('');
    onRefresh();
  };

  const handleSaveEditEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    Storage.updateEmployee(editingUser, currentUsername);
    setUsers(Storage.getUsers());
    setEditingUser(null);
    onRefresh();
  };

  const handleDeleteEmployee = (userId: string) => {
    const active = Storage.getCurrentUser();
    if (active.id === userId) {
      alert('Cannot delete the currently logged-in employee account.');
      return;
    }
    if (confirm('Are you sure you want to remove this employee account?')) {
      Storage.deleteEmployee(userId, currentUsername);
      setUsers(Storage.getUsers());
      onRefresh();
    }
  };

  // PRELOADED STOCK CATALOGUE ACTIONS
  const handleAddStockItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStockName.trim()) return;
    const newItem: StockItem = {
      id: `stock-${Date.now()}`,
      category: newStockCategory,
      name: newStockName.trim(),
      unit: newStockUnit.trim() || 'each',
      isControlled: newStockControlled,
      requiresALS: newStockRequiresALS,
      minLevel: parseInt(newStockMinLevel, 10) || 4,
      currentStock: parseInt(newStockCurrentStock, 10) || 10,
    };
    Storage.addStockItem(newItem, currentUsername);
    setStockItems(Storage.getStockItems());
    setNewStockName('');
    alert(`Added "${newItem.name}" to preloaded stock catalogue.`);
    onRefresh();
  };

  const handleSaveEditStockItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStockItem) return;
    Storage.updateStockItem(editingStockItem, currentUsername);
    setStockItems(Storage.getStockItems());
    setEditingStockItem(null);
    onRefresh();
  };

  const handleDeleteStockItem = (itemId: string, itemName: string) => {
    if (confirm(`Remove "${itemName}" from preloaded stock catalogue?`)) {
      Storage.deleteStockItem(itemId, currentUsername);
      setStockItems(Storage.getStockItems());
      onRefresh();
    }
  };

  // COLOUR CODES (PRELOADED DATA) ACTIONS
  const colourCodes = settings.colourCodes && settings.colourCodes.length > 0
    ? settings.colourCodes
    : DEFAULT_COLOUR_CODES;

  const handleAddColourCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColourCode.trim() || colourCodes.includes(newColourCode.trim())) return;
    const updatedCodes = [...colourCodes, newColourCode.trim()];
    const updated = { ...settings, colourCodes: updatedCodes };
    Storage.saveSettings(updated, currentUsername);
    setSettings(updated);
    setNewColourCode('');
    onRefresh();
  };

  const handleSaveEditColourCode = (index: number) => {
    if (!editingColourCodeValue.trim()) return;
    const updatedCodes = [...colourCodes];
    updatedCodes[index] = editingColourCodeValue.trim();
    const updated = { ...settings, colourCodes: updatedCodes };
    Storage.saveSettings(updated, currentUsername);
    setSettings(updated);
    setEditingColourCodeIndex(null);
    setEditingColourCodeValue('');
    onRefresh();
  };

  const handleDeleteColourCode = (index: number) => {
    if (confirm('Delete this colour code from dropdown selections?')) {
      const updatedCodes = colourCodes.filter((_, i) => i !== index);
      const updated = { ...settings, colourCodes: updatedCodes };
      Storage.saveSettings(updated, currentUsername);
      setSettings(updated);
      onRefresh();
    }
  };

  // HOSPITALS (PRELOADED DATA) ACTIONS
  const hospitals = settings.hospitals && settings.hospitals.length > 0
    ? settings.hospitals
    : DEFAULT_HOSPITALS;

  const handleAddHospital = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHospitalName.trim() || hospitals.includes(newHospitalName.trim())) return;
    const updatedHospitals = [...hospitals, newHospitalName.trim()];
    const updated = { ...settings, hospitals: updatedHospitals };
    Storage.saveSettings(updated, currentUsername);
    setSettings(updated);
    setNewHospitalName('');
    onRefresh();
  };

  const handleSaveEditHospital = (index: number) => {
    if (!editingHospitalValue.trim()) return;
    const updatedHospitals = [...hospitals];
    updatedHospitals[index] = editingHospitalValue.trim();
    const updated = { ...settings, hospitals: updatedHospitals };
    Storage.saveSettings(updated, currentUsername);
    setSettings(updated);
    setEditingHospitalIndex(null);
    setEditingHospitalValue('');
    onRefresh();
  };

  const handleDeleteHospital = (index: number) => {
    if (confirm('Delete this hospital from destination facility dropdown list?')) {
      const updatedHospitals = hospitals.filter((_, i) => i !== index);
      const updated = { ...settings, hospitals: updatedHospitals };
      Storage.saveSettings(updated, currentUsername);
      setSettings(updated);
      onRefresh();
    }
  };

  // STATION BASES ACTIONS
  const handleAddBase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBaseName.trim() || settings.bases.includes(newBaseName.trim())) return;
    const updatedBases = [...settings.bases, newBaseName.trim()];
    const updated = { ...settings, bases: updatedBases };
    Storage.saveSettings(updated, currentUsername);
    setSettings(updated);
    setNewBaseName('');
    onRefresh();
  };

  const handleDeleteBase = (baseName: string) => {
    if (settings.bases.length <= 1) {
      alert('At least one station base must remain active.');
      return;
    }
    if (confirm(`Remove station base "${baseName}"?`)) {
      const updatedBases = settings.bases.filter((b) => b !== baseName);
      const updated = { ...settings, bases: updatedBases };
      Storage.saveSettings(updated, currentUsername);
      setSettings(updated);
      onRefresh();
    }
  };

  // RESET TO FACTORY PRELOADED DATA
  const handleResetPreloadedData = () => {
    if (
      confirm(
        'Reset master lists to factory preloaded South African ambulance defaults? (Ambulances MR001–MR005, X1 Colour Codes only, Brackenfell & Paarl hospitals, full Appendix A stock catalogue, regional bases)'
      )
    ) {
      const resetSettings: AppSettings = {
        ...settings,
        ambulances: DEFAULT_AMBULANCES,
        crewMembers: DEFAULT_CREW,
        colourCodes: DEFAULT_COLOUR_CODES,
        bases: DEFAULT_SETTINGS.bases,
        hospitals: DEFAULT_HOSPITALS,
        pickupSuggestions: [],
      };
      Storage.saveSettings(resetSettings, currentUsername);
      Storage.saveStockItems(PRELOADED_STOCK_ITEMS);
      Storage.saveUsers(DEFAULT_USERS);
      setSettings(resetSettings);
      setStockItems(PRELOADED_STOCK_ITEMS);
      setUsers(DEFAULT_USERS);
      alert('Master lists and preloaded catalogue reset to Brackenfell & Paarl defaults.');
      onRefresh();
    }
  };

  // BACKUP EXPORT / RESTORE
  const handleExportBackup = () => {
    const json = Storage.exportFullBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `resq_ems_backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      const success = Storage.restoreBackup(content, currentUsername);
      if (success) {
        setRestoreFeedback('Database successfully restored from backup file.');
        setSettings(Storage.getSettings());
        setAuditLogs(Storage.getAuditLog());
        setUsers(Storage.getUsers());
        onRefresh();
      } else {
        setRestoreFeedback('Failed to restore backup: Invalid JSON structure.');
      }
    };
    reader.readAsText(file);
  };

  // Filtered Audit Logs
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      if (auditActionFilter !== 'ALL' && log.action !== auditActionFilter) {
        return false;
      }
      if (auditSearch.trim()) {
        const q = auditSearch.toLowerCase();
        const matches =
          log.user.toLowerCase().includes(q) ||
          log.action.toLowerCase().includes(q) ||
          log.table.toLowerCase().includes(q) ||
          log.recordId.toLowerCase().includes(q) ||
          log.details.toLowerCase().includes(q) ||
          (log.ip && log.ip.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [auditLogs, auditActionFilter, auditSearch]);

  // Export Audit Log to CSV for long-term record-keeping
  const handleExportAuditCSV = (onlyFiltered = false) => {
    const logsToExport = onlyFiltered ? filteredAuditLogs : auditLogs;
    if (logsToExport.length === 0) {
      alert('No audit trail records found to export.');
      return;
    }

    const todayDateStr = new Date().toISOString().slice(0, 10);
    const filename = `resq_ems_audit_log_popia_${todayDateStr}.csv`;
    exportAuditLogCSV(logsToExport, filename);
    playAlertSound('success');

    // Record export in audit trail
    Storage.addAuditLog({
      user: currentUsername,
      action: 'SETTINGS',
      table: 'audit_log',
      recordId: 'export_csv',
      details: `Admin downloaded POPIA audit history (${logsToExport.length} entries) as CSV file`,
    });

    setAuditLogs(Storage.getAuditLog());
    setAuditExportFeedback(
      `Audit history successfully exported as CSV (${logsToExport.length} records downloaded).`
    );
    setTimeout(() => setAuditExportFeedback(null), 5000);
    onRefresh();
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Black, Red & White Theme Navigation Bar */}
      <div className="bg-black text-white p-3 rounded-lg shadow-md border-b-2 border-red-600 flex flex-wrap items-center gap-1.5 text-xs font-bold">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded transition cursor-pointer ${
            activeTab === 'general'
              ? 'bg-red-600 text-white shadow-sm'
              : 'text-neutral-300 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>General &amp; Logo</span>
        </button>

        <button
          onClick={() => setActiveTab('employees')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded transition cursor-pointer ${
            activeTab === 'employees'
              ? 'bg-red-600 text-white shadow-sm'
              : 'text-neutral-300 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>Employees &amp; Logins ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('fleet')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded transition cursor-pointer ${
            activeTab === 'fleet'
              ? 'bg-red-600 text-white shadow-sm'
              : 'text-neutral-300 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <Ambulance className="w-4 h-4" />
          <span>Ambulances ({settings.ambulances.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('crew')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded transition cursor-pointer ${
            activeTab === 'crew'
              ? 'bg-red-600 text-white shadow-sm'
              : 'text-neutral-300 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Crew &amp; HPCSA ({settings.crewMembers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('colour_codes')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded transition cursor-pointer ${
            activeTab === 'colour_codes'
              ? 'bg-red-600 text-white shadow-sm'
              : 'text-neutral-300 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Colour Codes ({colourCodes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('preloaded')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded transition cursor-pointer ${
            activeTab === 'preloaded'
              ? 'bg-red-600 text-white shadow-sm'
              : 'text-neutral-300 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Preloaded Master Lists</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded transition cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-red-600 text-white shadow-sm'
              : 'text-neutral-300 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>POPIA Audit Log ({auditLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded transition cursor-pointer ${
            activeTab === 'backup'
              ? 'bg-red-600 text-white shadow-sm'
              : 'text-neutral-300 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Backup &amp; Restore</span>
        </button>

        <button
          onClick={() => setActiveTab('ai_prompt')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded transition cursor-pointer ${
            activeTab === 'ai_prompt'
              ? 'bg-red-600 text-white shadow-sm'
              : 'text-neutral-300 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <Terminal className="w-4 h-4 text-red-400" />
          <span>AI Master Prompt</span>
        </button>

        {isDev && (
          <button
            onClick={() => setActiveTab('dev_reset')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded transition cursor-pointer ${
              activeTab === 'dev_reset'
                ? 'bg-purple-700 text-white shadow-sm ring-2 ring-purple-400'
                : 'text-purple-300 hover:text-white hover:bg-purple-950/80 border border-purple-500/50'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-amber-300" />
            <span>Developer Reset</span>
          </button>
        )}
      </div>

      {/* 1. GENERAL & LOGO UPLOAD TAB */}
      {activeTab === 'general' && (
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6 space-y-6 max-w-3xl text-xs">
          <div className="border-b border-neutral-200 pb-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg font-heading text-black uppercase tracking-wide">
                Company Details &amp; Logo Branding
              </h3>
              <p className="text-neutral-500 text-xs">
                Theme: <strong>Black, Red and White Clinical Livery</strong> · Active throughout the system
              </p>
            </div>
            <span className="px-2.5 py-1 bg-black text-red-500 font-mono font-bold text-xs rounded border border-red-600">
              BLACK / RED / WHITE
            </span>
          </div>

          {/* Logo Upload Section */}
          <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200 space-y-3">
            <h4 className="font-bold uppercase text-black text-xs flex items-center gap-2">
              <Image className="w-4 h-4 text-red-600" />
              <span>Company Logo</span>
            </h4>
            <p className="text-neutral-600 text-xs">
              Upload company emblem or crest (PNG, JPG, or SVG, max 2 MB). The logo appears in the dark clinical masthead and picking slips.
            </p>

            <div className="flex items-center gap-4 flex-wrap">
              {companyLogoUrl ? (
                <div className="relative p-2 bg-black rounded-lg border-2 border-red-600 shadow-md">
                  <img
                    src={companyLogoUrl}
                    alt="Company Logo"
                    className="h-16 max-w-[200px] object-contain"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 shadow hover:bg-red-700 cursor-pointer"
                    title="Remove custom logo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="w-24 h-16 bg-neutral-200 border-2 border-dashed border-neutral-400 rounded-lg flex items-center justify-center text-neutral-500 font-bold text-xs">
                  No Logo
                </div>
              )}

              <div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml"
                  onChange={handleLogoFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-black hover:bg-neutral-800 text-white rounded font-bold transition shadow cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-red-500" />
                  <span>{companyLogoUrl ? 'Replace Logo' : 'Upload Company Logo'}</span>
                </button>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveGeneral} className="space-y-4">
            <div>
              <label className="block font-bold text-black uppercase mb-1">
                Company Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-300 rounded p-2 text-black font-bold focus:bg-white focus:ring-2 focus:ring-red-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-black uppercase mb-1">
                Web Application Name
              </label>
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-300 rounded p-2 text-black focus:bg-white focus:ring-2 focus:ring-red-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-black uppercase mb-1">
                Annual Excel Workbook Name
              </label>
              <input
                type="text"
                value={workbookName}
                onChange={(e) => setWorkbookName(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-300 rounded p-2 text-black font-mono focus:bg-white focus:ring-2 focus:ring-red-600 focus:outline-none"
              />
              <span className="text-[11px] text-neutral-500">
                Exports will save with this filename (e.g. Ambulance Trips 2026.xlsx)
              </span>
            </div>

            {/* Visual Theme Livery Selector */}
            <div className="p-3 bg-neutral-100 rounded-lg border border-neutral-300 space-y-1.5">
              <label className="block font-bold text-black uppercase mb-1 flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-red-600" />
                <span>Theme Livery</span>
              </label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as any)}
                className="w-full bg-white border border-neutral-300 rounded p-2 text-black font-bold focus:ring-2 focus:ring-red-600 focus:outline-none"
              >
                <option value="black_red_white">Black, Red and White (South African EMS Emergency Livery)</option>
                <option value="clinical_dark">Clinical Dark Slate</option>
                <option value="clean_white">Clean White &amp; Red</option>
              </select>
              <span className="text-[11px] text-neutral-600 block">
                Select system theme style. Black, Red and White applies high-contrast emergency styling across all dispatch and stock interfaces.
              </span>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded shadow transition cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Company Configuration</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. EMPLOYEES & ROLE-BASED LOGINS TAB */}
      {activeTab === 'employees' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
            <div className="p-4 bg-black text-white flex justify-between items-center border-b border-red-600">
              <div>
                <h3 className="font-bold text-sm uppercase font-heading tracking-wide">
                  Employees &amp; Role-Based User Accounts ({users.length})
                </h3>
                <span className="text-[11px] text-neutral-400">
                  Role permissions enforced for each login
                </span>
              </div>
            </div>

            <div className="divide-y divide-neutral-200 text-xs overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-neutral-100 text-black uppercase font-bold text-[10px]">
                  <tr>
                    <th className="p-2.5">Employee</th>
                    <th className="p-2.5">Username / Role</th>
                    <th className="p-2.5">Base</th>
                    <th className="p-2.5">Password / PIN</th>
                    <th className="p-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-neutral-50">
                      <td className="p-2.5 font-bold text-black">
                        {u.fullName} {u.surname && u.fullName !== u.surname && `(${u.surname})`}
                        {u.qualification && (
                          <span className="block text-[10px] text-neutral-500 font-normal">
                            Qual: {u.qualification} {u.hpcsaNo && `· HPCSA: ${u.hpcsaNo}`}
                          </span>
                        )}
                      </td>
                      <td className="p-2.5">
                        <span className="font-mono font-semibold text-neutral-800 block">
                          @{u.username}
                        </span>
                        <span
                          className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                            u.role === 'Admin'
                              ? 'bg-black text-white'
                              : u.role === 'Dispatcher'
                              ? 'bg-red-600 text-white'
                              : u.role === 'Management'
                              ? 'bg-red-900 text-white'
                              : 'bg-neutral-200 text-neutral-800'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="p-2.5 font-semibold text-neutral-700">{u.base}</td>
                      <td className="p-2.5 font-mono text-[11px] text-neutral-600">
                        <div>Pwd: {u.password || '••••••••'}</div>
                        {u.pin && <div className="text-red-600 font-bold">PIN: {u.pin}</div>}
                      </td>
                      <td className="p-2.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              Storage.setCurrentUser(u.id);
                              alert(`Active session switched to @${u.username} (${u.role}: ${u.fullName}). Role permissions are now active.`);
                              onRefresh();
                            }}
                            className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition cursor-pointer"
                            title={`Switch / Login as @${u.username} (${u.role})`}
                          >
                            <LogIn className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingUser(u)}
                            className="p-1 text-black hover:text-red-600 hover:bg-neutral-100 rounded transition cursor-pointer"
                            title="Edit Employee Credentials"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteEmployee(u.id)}
                            className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition cursor-pointer"
                            title="Remove Employee"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Employee Form */}
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4 text-xs h-fit space-y-3">
            <h3 className="font-bold text-sm uppercase font-heading text-black border-b pb-2 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-red-600" />
              <span>Add New Employee</span>
            </h3>
            <form onSubmit={handleAddEmployee} className="space-y-3">
              <div>
                <label className="block font-bold text-black uppercase mb-1 text-[10px]">
                  Full First Name &amp; Surname <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. David Nel"
                  value={newEmpFullName}
                  onChange={(e) => setNewEmpFullName(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded p-1.5"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-black uppercase mb-1 text-[10px]">
                  Surname (for alphabetical sorting)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Nel"
                  value={newEmpSurname}
                  onChange={(e) => setNewEmpSurname(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded p-1.5"
                />
              </div>

              <div>
                <label className="block font-bold text-black uppercase mb-1 text-[10px]">
                  Login Username <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. david.nel"
                  value={newEmpUsername}
                  onChange={(e) => setNewEmpUsername(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded p-1.5 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-black uppercase mb-1 text-[10px]">
                  Password <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Password123!"
                  value={newEmpPassword}
                  onChange={(e) => setNewEmpPassword(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded p-1.5 font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-black uppercase mb-1 text-[10px]">
                    Role <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={newEmpRole}
                    onChange={(e) => setNewEmpRole(e.target.value as UserRole)}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded p-1.5 font-bold"
                  >
                    <option value="Admin">Admin</option>
                    <option value="Dispatcher">Dispatcher</option>
                    <option value="Management">Management</option>
                    <option value="Office">Office / Billing</option>
                    <option value="StockController">Stock Controller</option>
                    <option value="Paramedic">Paramedic (Mobile)</option>
                    <option value="ReadOnly">Read-Only</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-black uppercase mb-1 text-[10px]">
                    Base Station
                  </label>
                  <select
                    value={newEmpBase}
                    onChange={(e) => setNewEmpBase(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded p-1.5"
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
                  <label className="block font-bold text-black uppercase mb-1 text-[10px]">
                    4-6 Digit Phone PIN
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="1234"
                    value={newEmpPin}
                    onChange={(e) => setNewEmpPin(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded p-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-black uppercase mb-1 text-[10px]">
                    Qualification
                  </label>
                  <input
                    type="text"
                    placeholder="BLS / ILS / ALS"
                    value={newEmpQual}
                    onChange={(e) => setNewEmpQual(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded p-1.5"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded shadow transition cursor-pointer"
              >
                + Create Employee Account
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. AMBULANCES (ADD / EDIT / DELETE) TAB */}
      {activeTab === 'fleet' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
            <div className="p-4 bg-black text-white flex justify-between items-center border-b border-red-600">
              <h3 className="font-bold text-sm uppercase font-heading tracking-wide">
                Ambulance Fleet Details ({settings.ambulances.length} Units)
              </h3>
              <span className="text-xs text-neutral-400">MR001, MR002...</span>
            </div>

            <div className="divide-y divide-neutral-200 text-xs">
              {settings.ambulances.map((amb) => (
                <div key={amb.id} className="p-3 flex items-center justify-between hover:bg-neutral-50">
                  <div>
                    <span className="font-black font-mono text-base text-red-600 mr-2">
                      {amb.fleetNo}
                    </span>
                    <span className="font-mono text-black font-bold bg-neutral-100 px-2 py-0.5 rounded border border-neutral-300">
                      {amb.registration}
                    </span>
                    <div className="text-[11px] text-neutral-600 mt-1">
                      Assigned Base: <strong>{amb.base}</strong> {amb.model && `· Model: ${amb.model}`}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingAmbulance(amb)}
                      className="p-1.5 text-black hover:text-red-600 hover:bg-neutral-100 rounded transition cursor-pointer"
                      title="Edit Ambulance Details"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteAmbulance(amb.id)}
                      className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition cursor-pointer"
                      title="Delete Ambulance"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add Ambulance Form */}
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4 text-xs h-fit space-y-3">
            <h3 className="font-bold text-sm uppercase font-heading text-black border-b pb-2">
              Add New Ambulance
            </h3>
            <form onSubmit={handleAddAmbulance} className="space-y-3">
              <div>
                <label className="block font-bold text-black uppercase mb-1 text-[10px]">
                  Fleet Number (e.g. MR006) <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  placeholder="MR006"
                  value={newFleetNo}
                  onChange={(e) => setNewFleetNo(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded p-1.5 font-mono uppercase"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-black uppercase mb-1 text-[10px]">
                  Registration Plate <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. JV 99 BR GP"
                  value={newReg}
                  onChange={(e) => setNewReg(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded p-1.5 font-mono uppercase"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-black uppercase mb-1 text-[10px]">
                  Assigned Station Base
                </label>
                <select
                  value={newAmbBase}
                  onChange={(e) => setNewAmbBase(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded p-1.5"
                >
                  {settings.bases.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded shadow transition cursor-pointer"
              >
                + Add Ambulance to Fleet
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 4. CREW DETAILS (SORTED BY SURNAME / QUALIFICATION + ADD/EDIT/DELETE) TAB */}
      {activeTab === 'crew' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
            <div className="p-4 bg-black text-white flex flex-wrap justify-between items-center gap-2 border-b border-red-600">
              <div>
                <h3 className="font-bold text-sm uppercase font-heading tracking-wide">
                  Crew Details &amp; HPCSA Credentials ({settings.crewMembers.length})
                </h3>
                <span className="text-xs text-neutral-400">Master Crew Registry</span>
              </div>

              {/* Toggle: Alphabetical by Surname OR Grouped by Qualification */}
              <div className="flex items-center gap-1 bg-neutral-900 p-0.5 rounded border border-neutral-700 text-[10px]">
                <button
                  onClick={() => setCrewSortMode('surname')}
                  className={`px-2.5 py-1 rounded font-bold transition cursor-pointer ${
                    crewSortMode === 'surname' ? 'bg-red-600 text-white' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Alphabetical by Surname
                </button>
                <button
                  onClick={() => setCrewSortMode('qualification')}
                  className={`px-2.5 py-1 rounded font-bold transition cursor-pointer ${
                    crewSortMode === 'qualification' ? 'bg-red-600 text-white' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Grouped by Qualification (ALS/ILS/BLS)
                </button>
              </div>
            </div>

            {crewSortMode === 'qualification' ? (
              <div className="divide-y-2 divide-neutral-300 text-xs">
                {groupedCrewMembers.map((group) => (
                  <div key={group.qual} className="bg-white">
                    {/* Qualification Group Header */}
                    <div className="bg-neutral-100 px-4 py-2 border-b border-neutral-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase shadow-2xs ${group.badge}`}>
                          {group.qual}
                        </span>
                        <span className="font-bold text-black uppercase tracking-wide">
                          {group.title}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-neutral-600 bg-neutral-200 px-2 py-0.5 rounded text-[10px]">
                        {group.members.length} {group.members.length === 1 ? 'member' : 'members'}
                      </span>
                    </div>

                    {/* Members in this group */}
                    <div className="divide-y divide-neutral-200">
                      {group.members.map((c) => {
                        const surname = (c.name || '').trim().split(' ').slice(-1)[0];
                        return (
                          <div key={c.id} className="p-3 flex items-center justify-between hover:bg-neutral-50">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-black text-sm">{c.name}</span>
                                <span className="text-[10px] text-neutral-500 font-mono">
                                  Surname: <strong>{surname}</strong>
                                </span>
                              </div>
                              <div className="text-[11px] text-neutral-600 font-mono-data mt-1">
                                HPCSA: <strong>{c.hpcsaNo}</strong> · Mobile: {c.mobile || 'None'} · Base:{' '}
                                {c.base}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setEditingCrew(c)}
                                className="p-1.5 text-black hover:text-red-600 hover:bg-neutral-100 rounded transition cursor-pointer"
                                title="Edit Crew Member"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteCrew(c.id)}
                                className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition cursor-pointer"
                                title="Delete Crew Member"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-neutral-200 text-xs">
                {sortedCrewMembers.map((c) => {
                  const surname = (c.name || '').trim().split(' ').slice(-1)[0];
                  return (
                    <div key={c.id} className="p-3 flex items-center justify-between hover:bg-neutral-50">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-black text-sm">{c.name}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              c.qualification === 'ALS'
                                ? 'bg-red-600 text-white'
                                : c.qualification === 'ILS'
                                ? 'bg-black text-white'
                                : 'bg-neutral-200 text-black'
                            }`}
                          >
                            {c.qualification}
                          </span>
                          <span className="text-[10px] text-neutral-500 font-mono bg-neutral-100 px-1.5 py-0.5 rounded">
                            Surname: <strong>{surname}</strong>
                          </span>
                        </div>
                        <div className="text-[11px] text-neutral-600 font-mono-data mt-1">
                          HPCSA: <strong>{c.hpcsaNo}</strong> · Mobile: {c.mobile || 'None'} · Base:{' '}
                          {c.base}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingCrew(c)}
                          className="p-1.5 text-black hover:text-red-600 hover:bg-neutral-100 rounded transition cursor-pointer"
                          title="Edit Crew Member"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCrew(c.id)}
                          className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition cursor-pointer"
                          title="Delete Crew Member"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add Crew Form */}
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4 text-xs h-fit space-y-3">
            <h3 className="font-bold text-sm uppercase font-heading text-black border-b pb-2">
              Add New Crew Member
            </h3>
            <form onSubmit={handleAddCrew} className="space-y-3">
              <div>
                <label className="block font-bold text-black uppercase mb-1 text-[10px]">
                  Full Name (First &amp; Surname) <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Stephan Rossouw"
                  value={newCrewName}
                  onChange={(e) => setNewCrewName(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded p-1.5"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-black uppercase mb-1 text-[10px]">
                  Qualification <span className="text-red-600">*</span>
                </label>
                <select
                  value={newCrewQual}
                  onChange={(e) => setNewCrewQual(e.target.value as any)}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded p-1.5 font-bold"
                >
                  <option value="BLS">BLS (Basic Life Support)</option>
                  <option value="ILS">ILS (Intermediate Life Support)</option>
                  <option value="ALS">ALS (Advanced Life Support)</option>
                  <option value="ECA">ECA (Ambulance Assistant)</option>
                  <option value="Paramedic">Paramedic</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-black uppercase mb-1 text-[10px]">
                  HPCSA Registration # <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. ANT0009841"
                  value={newCrewHpcsa}
                  onChange={(e) => setNewCrewHpcsa(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded p-1.5 font-mono uppercase"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-black uppercase mb-1 text-[10px]">
                  Mobile Contact
                </label>
                <input
                  type="text"
                  placeholder="082 555 1234"
                  value={newCrewMobile}
                  onChange={(e) => setNewCrewMobile(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded p-1.5"
                />
              </div>

              <div>
                <label className="block font-bold text-black uppercase mb-1 text-[10px]">
                  Assigned Base
                </label>
                <select
                  value={newCrewBase}
                  onChange={(e) => setNewCrewBase(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded p-1.5"
                >
                  {settings.bases.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded shadow transition cursor-pointer"
              >
                + Register Crew Member
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 5. COLOUR CODES & DESTINATION HOSPITALS (PRELOADED DATA) TAB */}
      {activeTab === 'colour_codes' && (
        <div className="space-y-6">
          {/* Top Section: Colour Codes (X1 Only) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
              <div className="p-4 bg-black text-white flex justify-between items-center border-b border-red-600">
                <div>
                  <h3 className="font-bold text-sm uppercase font-heading tracking-wide">
                    Triage Colour Codes (X1 Only) ({colourCodes.length})
                  </h3>
                  <span className="text-xs text-neutral-400">
                    Strictly X1 triage priority codes for EMS dispatch
                  </span>
                </div>
              </div>

              <div className="divide-y divide-neutral-200 text-xs">
                {colourCodes.map((code, index) => (
                  <div key={index} className="p-3 flex items-center justify-between hover:bg-neutral-50">
                    {editingColourCodeIndex === index ? (
                      <div className="flex items-center gap-2 flex-1 mr-4">
                        <input
                          type="text"
                          value={editingColourCodeValue}
                          onChange={(e) => setEditingColourCodeValue(e.target.value)}
                          className="flex-1 p-1.5 border border-neutral-300 rounded font-bold"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveEditColourCode(index)}
                          className="px-3 py-1 bg-black text-white font-bold rounded cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingColourCodeIndex(null)}
                          className="px-2 py-1 text-neutral-500 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className={`w-3 h-3 rounded-full ${
                          code.includes('Green') ? 'bg-emerald-500' :
                          code.includes('Yellow') ? 'bg-amber-400' :
                          code.includes('Red') ? 'bg-red-600' :
                          code.includes('Orange') ? 'bg-orange-500' : 'bg-blue-600'
                        }`}></span>
                        <span className="font-mono font-bold text-black text-sm">{code}</span>
                      </div>
                    )}

                    {editingColourCodeIndex !== index && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingColourCodeIndex(index);
                            setEditingColourCodeValue(code);
                          }}
                          className="p-1 text-black hover:text-red-600 rounded cursor-pointer"
                          title="Edit Code"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteColourCode(index)}
                          className="p-1 text-red-600 hover:text-red-700 rounded cursor-pointer"
                          title="Delete Code"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Add Colour Code */}
            <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4 text-xs h-fit space-y-3">
              <h3 className="font-bold text-sm uppercase font-heading text-black border-b pb-2">
                Add New Colour Code
              </h3>
              <form onSubmit={handleAddColourCode} className="space-y-3">
                <div>
                  <label className="block font-bold text-black uppercase mb-1 text-[10px]">
                    Colour Code (Must start with X1)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. X1 Green"
                    value={newColourCode}
                    onChange={(e) => setNewColourCode(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded p-2 font-bold font-mono"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded shadow transition cursor-pointer"
                >
                  + Add Colour Code
                </button>
              </form>
            </div>
          </div>

          {/* Bottom Section: Destination Hospitals (Brackenfell, Cape Town & Paarl) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
              <div className="p-4 bg-black text-white flex justify-between items-center border-b border-red-600">
                <div>
                  <h3 className="font-bold text-sm uppercase font-heading tracking-wide">
                    Destination Hospitals ({hospitals.length})
                  </h3>
                  <span className="text-xs text-neutral-400">
                    Mediclinics, Netcare &amp; State Hospitals in &amp; around Brackenfell, Cape Town &amp; Paarl
                  </span>
                </div>
              </div>

              <div className="divide-y divide-neutral-200 text-xs max-h-[480px] overflow-y-auto">
                {hospitals.map((hosp, index) => (
                  <div key={index} className="p-3 flex items-center justify-between hover:bg-neutral-50">
                    {editingHospitalIndex === index ? (
                      <div className="flex items-center gap-2 flex-1 mr-4">
                        <input
                          type="text"
                          value={editingHospitalValue}
                          onChange={(e) => setEditingHospitalValue(e.target.value)}
                          className="flex-1 p-1.5 border border-neutral-300 rounded font-bold"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveEditHospital(index)}
                          className="px-3 py-1 bg-black text-white font-bold rounded cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingHospitalIndex(null)}
                          className="px-2 py-1 text-neutral-500 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          hosp.startsWith('MC') ? 'bg-blue-600' :
                          hosp.startsWith('NC') ? 'bg-red-600' : 'bg-emerald-600'
                        }`}></span>
                        <span className="font-bold text-black text-sm">{hosp}</span>
                        <span className="text-[10px] text-neutral-500 font-mono">
                          {hosp.startsWith('MC') ? 'Mediclinic' : hosp.startsWith('NC') ? 'Netcare' : 'State Facility'}
                        </span>
                      </div>
                    )}

                    {editingHospitalIndex !== index && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingHospitalIndex(index);
                            setEditingHospitalValue(hosp);
                          }}
                          className="p-1 text-black hover:text-red-600 rounded cursor-pointer"
                          title="Edit Hospital Name"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteHospital(index)}
                          className="p-1 text-red-600 hover:text-red-700 rounded cursor-pointer"
                          title="Delete Hospital"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Add Hospital Form */}
            <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4 text-xs h-fit space-y-3">
              <h3 className="font-bold text-sm uppercase font-heading text-black border-b pb-2">
                Add Destination Hospital
              </h3>
              <form onSubmit={handleAddHospital} className="space-y-3">
                <div>
                  <label className="block font-bold text-black uppercase mb-1 text-[10px]">
                    Hospital Name / Prefix
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MC Cape Gate or NC Kuilsrivier"
                    value={newHospitalName}
                    onChange={(e) => setNewHospitalName(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded p-2 font-bold"
                    required
                  />
                  <span className="text-[10px] text-neutral-500 mt-1 block">
                    Use EMS abbreviation convention: MC (Mediclinic), NC (Netcare), or Hospital Name.
                  </span>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded shadow transition cursor-pointer"
                >
                  + Add Hospital to List
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 6. PRELOADED MASTER LISTS & BASES TAB */}
      {activeTab === 'preloaded' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-5 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base font-heading text-black uppercase">
                Preloaded Data &amp; Master Lists Control
              </h3>
              <p className="text-neutral-500 text-xs">
                Manage station bases, call types, and restore factory preloaded master lists
              </p>
            </div>
            <button
              onClick={handleResetPreloadedData}
              className="flex items-center gap-1.5 px-4 py-2 bg-black hover:bg-neutral-800 text-red-500 rounded font-bold text-xs border border-red-600 transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset to Preloaded SA Defaults</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Station Bases */}
            <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4 space-y-3 text-xs">
              <h4 className="font-bold uppercase text-black font-heading text-sm">
                Station Bases ({settings.bases.length})
              </h4>
              <form onSubmit={handleAddBase} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add new base name..."
                  value={newBaseName}
                  onChange={(e) => setNewBaseName(e.target.value)}
                  className="flex-1 bg-neutral-50 border border-neutral-300 rounded p-1.5"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-black text-white font-bold rounded hover:bg-neutral-800"
                >
                  + Add Base
                </button>
              </form>

              <div className="divide-y divide-neutral-200">
                {settings.bases.map((base, i) => (
                  <div key={i} className="py-2 flex items-center justify-between">
                    <span className="font-bold text-black">{base}</span>
                    <button
                      onClick={() => handleDeleteBase(base)}
                      className="text-red-600 hover:text-red-800 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Call Types */}
            <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4 space-y-3 text-xs">
              <h4 className="font-bold uppercase text-black font-heading text-sm">
                Call Types ({settings.callTypes.length})
              </h4>
              <div className="divide-y divide-neutral-200">
                {settings.callTypes.map((ctype, i) => (
                  <div key={i} className="py-2 flex items-center justify-between font-bold text-black">
                    <span>{ctype}</span>
                    <span className="text-[10px] text-neutral-400">Preloaded Core</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Preloaded Stock Items (Appendix A Full Catalogue) */}
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4 space-y-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-3">
              <div>
                <h4 className="font-bold uppercase text-black font-heading text-base flex items-center gap-2">
                  <Package className="w-5 h-5 text-red-600" />
                  <span>Preloaded Stock Items &amp; Medical Catalogue ({stockItems.length} items)</span>
                </h4>
                <p className="text-neutral-500 text-xs">
                  Full South African Ambulance stock inventory (Appendix A). Add, edit, or remove preloaded items.
                </p>
              </div>

              {/* Search & Filter */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    placeholder="Search stock catalogue..."
                    value={stockSearch}
                    onChange={(e) => setStockSearch(e.target.value)}
                    className="pl-8 pr-3 py-1 bg-neutral-50 border border-neutral-300 rounded text-xs w-48 focus:bg-white focus:outline-none"
                  />
                </div>

                <select
                  value={stockCatFilter}
                  onChange={(e) => setStockCatFilter(e.target.value)}
                  className="py-1 px-2 bg-neutral-50 border border-neutral-300 rounded text-xs font-semibold"
                >
                  <option value="ALL">All Categories</option>
                  <option value="Airway & breathing">Airway &amp; breathing</option>
                  <option value="Cardiac & monitoring">Cardiac &amp; monitoring</option>
                  <option value="IV access & fluids">IV access &amp; fluids</option>
                  <option value="Basic / ILS medication">Basic / ILS medication</option>
                  <option value="ALS medication">ALS medication</option>
                  <option value="Controlled substances (Schedule 5/6)">Controlled substances (Sch 5/6)</option>
                  <option value="Trauma & wound care">Trauma &amp; wound care</option>
                  <option value="Vehicle & equipment">Vehicle &amp; equipment</option>
                </select>
              </div>
            </div>

            {/* Quick Add Stock Item Form */}
            <form onSubmit={handleAddStockItem} className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 space-y-3">
              <span className="font-bold uppercase text-[11px] text-black block">
                + Add New Stock Item To Catalogue
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                <div>
                  <label className="block font-bold text-neutral-700 text-[10px] uppercase mb-0.5">Category</label>
                  <select
                    value={newStockCategory}
                    onChange={(e) => setNewStockCategory(e.target.value)}
                    className="w-full p-1.5 bg-white border border-neutral-300 rounded font-medium text-xs"
                  >
                    <option value="Airway & breathing">Airway &amp; breathing</option>
                    <option value="Cardiac & monitoring">Cardiac &amp; monitoring</option>
                    <option value="IV access & fluids">IV access &amp; fluids</option>
                    <option value="Basic / ILS medication">Basic / ILS medication</option>
                    <option value="ALS medication">ALS medication</option>
                    <option value="Controlled substances (Schedule 5/6)">Controlled substances (Sch 5/6)</option>
                    <option value="Trauma & wound care">Trauma &amp; wound care</option>
                    <option value="Vehicle & equipment">Vehicle &amp; equipment</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 text-[10px] uppercase mb-0.5">Item Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Endotracheal tube size 7.0"
                    value={newStockName}
                    onChange={(e) => setNewStockName(e.target.value)}
                    className="w-full p-1.5 bg-white border border-neutral-300 rounded text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 text-[10px] uppercase mb-0.5">Unit (each/box/ampoule)</label>
                  <input
                    type="text"
                    placeholder="each, ampoule, box..."
                    value={newStockUnit}
                    onChange={(e) => setNewStockUnit(e.target.value)}
                    className="w-full p-1.5 bg-white border border-neutral-300 rounded text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 text-[10px] uppercase mb-0.5">Min Level / Stock</label>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      placeholder="Min"
                      value={newStockMinLevel}
                      onChange={(e) => setNewStockMinLevel(e.target.value)}
                      className="w-1/2 p-1.5 bg-white border border-neutral-300 rounded text-xs font-mono"
                    />
                    <input
                      type="number"
                      placeholder="Stock"
                      value={newStockCurrentStock}
                      onChange={(e) => setNewStockCurrentStock(e.target.value)}
                      className="w-1/2 p-1.5 bg-white border border-neutral-300 rounded text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 text-neutral-700 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newStockControlled}
                      onChange={(e) => setNewStockControlled(e.target.checked)}
                      className="rounded text-red-600 focus:ring-red-500"
                    />
                    <span>Schedule 5/6 Controlled</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-neutral-700 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newStockRequiresALS}
                      onChange={(e) => setNewStockRequiresALS(e.target.checked)}
                      className="rounded text-red-600 focus:ring-red-500"
                    />
                    <span>Requires ALS Qualification</span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded shadow transition cursor-pointer"
                >
                  + Add Stock Item
                </button>
              </div>
            </form>

            {/* Stock Items Table */}
            <div className="max-h-[380px] overflow-y-auto border border-neutral-200 rounded">
              <table className="w-full text-left">
                <thead className="bg-neutral-100 uppercase text-[10px] text-black font-bold sticky top-0">
                  <tr>
                    <th className="p-2">Item Name</th>
                    <th className="p-2">Category</th>
                    <th className="p-2">Unit</th>
                    <th className="p-2">Controls</th>
                    <th className="p-2 text-center">Min / Stock</th>
                    <th className="p-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 text-xs">
                  {filteredStockItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-neutral-400">
                        No stock items match your search.
                      </td>
                    </tr>
                  ) : (
                    filteredStockItems.map((item) => (
                      <tr key={item.id} className="hover:bg-neutral-50">
                        <td className="p-2 font-bold text-black">{item.name}</td>
                        <td className="p-2 text-neutral-600">{item.category}</td>
                        <td className="p-2 font-mono text-neutral-500">{item.unit}</td>
                        <td className="p-2">
                          <div className="flex gap-1">
                            {item.isControlled && (
                              <span className="px-1.5 py-0.2 bg-red-100 text-red-700 rounded font-bold text-[9px]">
                                Sch 5/6
                              </span>
                            )}
                            {item.requiresALS && (
                              <span className="px-1.5 py-0.2 bg-black text-white rounded font-bold text-[9px]">
                                ALS Only
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-2 text-center font-mono">
                          <span className="text-neutral-500">{item.minLevel}</span> /{' '}
                          <strong className="text-black">{item.currentStock ?? '—'}</strong>
                        </td>
                        <td className="p-2 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setEditingStockItem(item)}
                              className="p-1 text-black hover:text-red-600 hover:bg-neutral-100 rounded"
                              title="Edit Item"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteStockItem(item.id, item.name)}
                              className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                              title="Delete Item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 7. POPIA AUDIT LOG */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden text-xs">
          {/* Header with Export CSV Action */}
          <div className="p-4 bg-black text-white flex flex-wrap justify-between items-center gap-3 border-b border-red-600">
            <div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-red-500" />
                <h3 className="font-bold text-sm uppercase font-heading tracking-wide">
                  POPIA Compliance Audit Log (Immutable History)
                </h3>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                All records, deletions, overtime approvals, stock allocations and system modifications are tracked.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* PRIMARY USER REQUIREMENT: Export Audit Log as CSV button */}
              <button
                type="button"
                onClick={() => handleExportAuditCSV(false)}
                className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded font-bold text-xs uppercase tracking-wider transition shadow-sm cursor-pointer"
                title="Download full audit history as a CSV file for long-term record-keeping"
              >
                <Download className="w-3.5 h-3.5 text-white" />
                <span>Export Audit Log (CSV)</span>
                <span className="px-1.5 py-0.2 bg-black/40 rounded text-[10px] font-mono font-bold text-emerald-100">
                  {auditLogs.length}
                </span>
              </button>

              <span className="font-mono text-red-400 font-bold bg-neutral-900 px-2 py-1 rounded text-[11px] border border-neutral-800">
                READ-ONLY
              </span>
            </div>
          </div>

          {/* Export Success Notification Banner */}
          {auditExportFeedback && (
            <div className="p-3 bg-emerald-50 border-b border-emerald-200 text-emerald-900 font-bold flex items-center justify-between text-xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{auditExportFeedback}</span>
              </div>
              <button
                type="button"
                onClick={() => setAuditExportFeedback(null)}
                className="text-emerald-700 hover:text-emerald-950 font-bold text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Search, Filter & Quick Export Toolbar */}
          <div className="p-3 bg-neutral-50 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter audit log by operator, action, table, details, IP..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-neutral-300 rounded text-xs focus:outline-none focus:border-red-600 font-medium"
                />
              </div>

              <select
                value={auditActionFilter}
                onChange={(e) => setAuditActionFilter(e.target.value)}
                className="py-1.5 px-2 bg-white border border-neutral-300 rounded text-xs font-semibold focus:outline-none"
              >
                <option value="ALL">All Actions ({auditLogs.length})</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
                <option value="APPROVE">APPROVE</option>
                <option value="ISSUE">ISSUE</option>
                <option value="LOGIN">LOGIN</option>
                <option value="SETTINGS">SETTINGS</option>
              </select>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-neutral-600">
              <span>
                Showing <strong>{filteredAuditLogs.length}</strong> of <strong>{auditLogs.length}</strong> entries
              </span>
              {(auditSearch.trim() || auditActionFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => handleExportAuditCSV(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-800 rounded font-bold transition cursor-pointer"
                  title="Export only currently filtered results as CSV"
                >
                  <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                  <span>Export Filtered ({filteredAuditLogs.length})</span>
                </button>
              )}
            </div>
          </div>

          {/* Audit Records Table */}
          <div className="max-h-[600px] overflow-y-auto">
            <table className="w-full text-left">
              <thead className="bg-neutral-100 uppercase text-[10px] text-black font-bold sticky top-0 z-10">
                <tr>
                  <th className="p-2.5">Timestamp (SAST)</th>
                  <th className="p-2.5">Operator</th>
                  <th className="p-2.5">Action</th>
                  <th className="p-2.5">Target Entity</th>
                  <th className="p-2.5">Audit Trail Details</th>
                  <th className="p-2.5">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 font-mono-data text-[11px]">
                {filteredAuditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-neutral-400 italic font-sans">
                      No audit log entries match your filter or search query.
                    </td>
                  </tr>
                ) : (
                  filteredAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-neutral-50">
                      <td className="p-2 text-neutral-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })}
                      </td>
                      <td className="p-2 font-bold text-black whitespace-nowrap">{log.user}</td>
                      <td className="p-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            log.action === 'DELETE'
                              ? 'bg-red-600 text-white'
                              : log.action === 'APPROVE'
                              ? 'bg-emerald-600 text-white'
                              : log.action === 'ISSUE'
                              ? 'bg-blue-600 text-white'
                              : log.action === 'LOGIN'
                              ? 'bg-purple-600 text-white'
                              : log.action === 'CREATE'
                              ? 'bg-teal-700 text-white'
                              : log.action === 'SETTINGS'
                              ? 'bg-amber-500 text-black'
                              : 'bg-neutral-200 text-black'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="p-2 text-neutral-600 font-semibold uppercase text-[10px]">{log.table}</td>
                      <td className="p-2 text-black font-sans">{log.details}</td>
                      <td className="p-2 text-neutral-400 font-mono text-[10px]">{log.ip || '192.168.1.100'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 8. BACKUP & RESTORE */}
      {activeTab === 'backup' && (
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6 space-y-4 max-w-xl text-xs">
          <div className="border-b border-neutral-200 pb-3">
            <h3 className="font-bold text-base font-heading text-black uppercase tracking-wide">
              Data Backups &amp; Disaster Recovery
            </h3>
            <p className="text-neutral-500 text-xs">
              Dump entire database into encrypted JSON archive or restore.
            </p>
          </div>

          {restoreFeedback && (
            <div className="p-3 bg-red-50 border border-red-600 rounded text-red-900 font-semibold">
              {restoreFeedback}
            </div>
          )}

          <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200 space-y-3">
            <h4 className="font-bold uppercase text-black text-[11px]">
              Export System Snapshot:
            </h4>
            <p className="text-neutral-600">
              Generate a full backup archive of all active trips, logs, and user settings.
            </p>
            <button
              onClick={handleExportBackup}
              className="flex items-center gap-2 px-5 py-2.5 bg-black hover:bg-neutral-800 text-white rounded font-bold shadow cursor-pointer"
            >
              <Download className="w-4 h-4 text-red-500" />
              <span>Download Full Backup Archive (.json)</span>
            </button>
          </div>

          <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200 space-y-3">
            <h4 className="font-bold uppercase text-black text-[11px]">
              Restore Database from File:
            </h4>
            <p className="text-neutral-600">
              Restore previous configuration or imported backup file.
            </p>
            <input
              type="file"
              accept=".json"
              onChange={handleRestoreFile}
              className="text-xs text-neutral-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-red-600 file:text-white cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* 9. AI MASTER PROMPT TAB */}
      {activeTab === 'ai_prompt' && (
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6 space-y-4 max-w-4xl text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-3">
            <div>
              <h3 className="font-bold text-base font-heading text-black uppercase tracking-wide flex items-center gap-2">
                <Terminal className="w-5 h-5 text-red-600" />
                <span>Comprehensive AI Master Prompt Specification</span>
              </h3>
              <p className="text-neutral-500 text-xs">
                Complete, detailed prompt instructions to build this application from scratch with all Brackenfell/Paarl data, X1 colour codes, IHT scheduling, and dev reset capabilities.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(MASTER_AI_PROMPT);
                  setPromptCopied(true);
                  setTimeout(() => setPromptCopied(false), 2000);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-bold transition cursor-pointer ${
                  promptCopied ? 'bg-emerald-600 text-white' : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {promptCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{promptCopied ? 'Copied!' : 'Copy Full Prompt'}</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-slate-200 font-mono text-[11px] max-h-[500px] overflow-y-auto leading-relaxed">
            <pre className="whitespace-pre-wrap font-sans text-xs">
              {MASTER_AI_PROMPT}
            </pre>
          </div>
        </div>
      )}

      {/* 10. DEVELOPER RESET CONSOLE (STRICTLY DEV ACCESS ONLY) */}
      {activeTab === 'dev_reset' && isDev && (
        <div className="bg-white rounded-lg shadow-sm border border-purple-300 p-6 space-y-4 max-w-xl text-xs">
          <div className="border-b border-purple-200 pb-3 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-purple-700" />
                <h3 className="font-bold text-base font-heading text-black uppercase tracking-wide">
                  Developer System Reset &amp; Clean Slate Console
                </h3>
              </div>
              <p className="text-neutral-500 text-xs mt-0.5">
                Authorized developer commands for wiping captured data or re-seeding the database.
              </p>
            </div>
            <span className="px-2 py-0.5 bg-purple-700 text-white text-[10px] font-black rounded uppercase">
              DEV PRIVILEGE
            </span>
          </div>

          <div className="p-4 bg-red-50 border border-red-300 rounded-lg space-y-3">
            <h4 className="font-bold text-red-900 uppercase text-xs">
              Option 1: Complete Factory Clean Slate (Purge All Data)
            </h4>
            <p className="text-red-700">
              Wipes all captured operational data to 0 records (Trips, Overtime, Stock requests, Scheduled IHT bookings). Leaves the core system intact (Brackenfell/Paarl hospitals, user logins, fleet setup) ready for pristine production use.
            </p>
            <button
              onClick={() => {
                if (onOpenDevReset) onOpenDevReset();
                else {
                  const res = Storage.resetSystemData('wipe_all', activeUser);
                  alert(res.message);
                  onRefresh();
                }
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded shadow transition cursor-pointer flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Launch Clean Slate Data Wipe</span>
            </button>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg space-y-3">
            <h4 className="font-bold text-amber-900 uppercase text-xs">
              Option 2: Factory Re-seed (Default Brackenfell/Paarl Dataset)
            </h4>
            <p className="text-amber-700">
              Restores initial demonstration records: Brackenfell &amp; Paarl initial trips (EPRF4211–EPRF4215), seed IHT bookings, stock requests, and full ambulance medical inventory.
            </p>
            <button
              onClick={() => {
                if (onOpenDevReset) onOpenDevReset();
                else {
                  const res = Storage.resetSystemData('reseed', activeUser);
                  alert(res.message);
                  onRefresh();
                }
              }}
              className="px-4 py-2 bg-black hover:bg-neutral-800 text-amber-400 font-bold rounded shadow transition cursor-pointer flex items-center gap-2 border border-amber-500"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Launch Factory Re-seed</span>
            </button>
          </div>
        </div>
      )}

      {/* EDIT AMBULANCE MODAL */}
      {editingAmbulance && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full shadow-2xl p-5 border border-neutral-300 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-base text-black font-heading">
                Edit Ambulance — {editingAmbulance.fleetNo}
              </h3>
              <button onClick={() => setEditingAmbulance(null)} className="text-neutral-500 hover:text-black">
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveEditAmbulance} className="space-y-3">
              <div>
                <label className="block font-bold text-black uppercase mb-1">Fleet Number</label>
                <input
                  type="text"
                  value={editingAmbulance.fleetNo}
                  onChange={(e) =>
                    setEditingAmbulance({ ...editingAmbulance, fleetNo: e.target.value.toUpperCase() })
                  }
                  className="w-full p-2 border border-neutral-300 rounded font-mono font-bold"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-black uppercase mb-1">Registration Plate</label>
                <input
                  type="text"
                  value={editingAmbulance.registration}
                  onChange={(e) =>
                    setEditingAmbulance({ ...editingAmbulance, registration: e.target.value.toUpperCase() })
                  }
                  className="w-full p-2 border border-neutral-300 rounded font-mono font-bold"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-black uppercase mb-1">Assigned Base</label>
                <select
                  value={editingAmbulance.base}
                  onChange={(e) =>
                    setEditingAmbulance({ ...editingAmbulance, base: e.target.value })
                  }
                  className="w-full p-2 border border-neutral-300 rounded"
                >
                  {settings.bases.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingAmbulance(null)}
                  className="px-3 py-1.5 text-neutral-600 hover:bg-neutral-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-red-600 text-white font-bold rounded hover:bg-red-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CREW MODAL */}
      {editingCrew && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full shadow-2xl p-5 border border-neutral-300 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-base text-black font-heading">
                Edit Crew Member — {editingCrew.name}
              </h3>
              <button onClick={() => setEditingCrew(null)} className="text-neutral-500 hover:text-black">
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveEditCrew} className="space-y-3">
              <div>
                <label className="block font-bold text-black uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  value={editingCrew.name}
                  onChange={(e) => setEditingCrew({ ...editingCrew, name: e.target.value })}
                  className="w-full p-2 border border-neutral-300 rounded font-bold"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-black uppercase mb-1">Qualification</label>
                <select
                  value={editingCrew.qualification}
                  onChange={(e) => setEditingCrew({ ...editingCrew, qualification: e.target.value as any })}
                  className="w-full p-2 border border-neutral-300 rounded font-bold"
                >
                  <option value="BLS">BLS (Basic Life Support)</option>
                  <option value="ILS">ILS (Intermediate Life Support)</option>
                  <option value="ALS">ALS (Advanced Life Support)</option>
                  <option value="ECA">ECA (Ambulance Assistant)</option>
                  <option value="Paramedic">Paramedic</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-black uppercase mb-1">HPCSA Registration #</label>
                <input
                  type="text"
                  value={editingCrew.hpcsaNo}
                  onChange={(e) => setEditingCrew({ ...editingCrew, hpcsaNo: e.target.value.toUpperCase() })}
                  className="w-full p-2 border border-neutral-300 rounded font-mono"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-black uppercase mb-1">Mobile Contact</label>
                <input
                  type="text"
                  value={editingCrew.mobile}
                  onChange={(e) => setEditingCrew({ ...editingCrew, mobile: e.target.value })}
                  className="w-full p-2 border border-neutral-300 rounded"
                />
              </div>
              <div>
                <label className="block font-bold text-black uppercase mb-1">Base</label>
                <select
                  value={editingCrew.base}
                  onChange={(e) => setEditingCrew({ ...editingCrew, base: e.target.value })}
                  className="w-full p-2 border border-neutral-300 rounded"
                >
                  {settings.bases.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCrew(null)}
                  className="px-3 py-1.5 text-neutral-600 hover:bg-neutral-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-red-600 text-white font-bold rounded hover:bg-red-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT EMPLOYEE / USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full shadow-2xl p-5 border border-neutral-300 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-base text-black font-heading">
                Edit Employee Credentials — @{editingUser.username}
              </h3>
              <button onClick={() => setEditingUser(null)} className="text-neutral-500 hover:text-black">
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveEditEmployee} className="space-y-3">
              <div>
                <label className="block font-bold text-black uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  value={editingUser.fullName}
                  onChange={(e) => setEditingUser({ ...editingUser, fullName: e.target.value })}
                  className="w-full p-2 border border-neutral-300 rounded font-bold"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-black uppercase mb-1">Surname</label>
                <input
                  type="text"
                  value={editingUser.surname || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, surname: e.target.value })}
                  className="w-full p-2 border border-neutral-300 rounded"
                />
              </div>
              <div>
                <label className="block font-bold text-black uppercase mb-1">Password</label>
                <input
                  type="text"
                  value={editingUser.password || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                  className="w-full p-2 border border-neutral-300 rounded font-mono"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-black uppercase mb-1">Role</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                    className="w-full p-2 border border-neutral-300 rounded font-bold"
                  >
                    <option value="Admin">Admin</option>
                    <option value="Dispatcher">Dispatcher</option>
                    <option value="Management">Management</option>
                    <option value="Office">Office / Billing</option>
                    <option value="StockController">Stock Controller</option>
                    <option value="Paramedic">Paramedic</option>
                    <option value="ReadOnly">Read-Only</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-black uppercase mb-1">4-6 Digit PIN</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={editingUser.pin || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, pin: e.target.value })}
                    className="w-full p-2 border border-neutral-300 rounded font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3 py-1.5 text-neutral-600 hover:bg-neutral-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-red-600 text-white font-bold rounded hover:bg-red-700"
                >
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PRELOADED STOCK ITEM MODAL */}
      {editingStockItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full shadow-2xl p-5 border border-neutral-300 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-base text-black font-heading">
                Edit Stock Item — {editingStockItem.name}
              </h3>
              <button onClick={() => setEditingStockItem(null)} className="text-neutral-500 hover:text-black">
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveEditStockItem} className="space-y-3">
              <div>
                <label className="block font-bold text-black uppercase mb-1">Item Name</label>
                <input
                  type="text"
                  value={editingStockItem.name}
                  onChange={(e) => setEditingStockItem({ ...editingStockItem, name: e.target.value })}
                  className="w-full p-2 border border-neutral-300 rounded font-bold"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-black uppercase mb-1">Category</label>
                <select
                  value={editingStockItem.category}
                  onChange={(e) => setEditingStockItem({ ...editingStockItem, category: e.target.value })}
                  className="w-full p-2 border border-neutral-300 rounded"
                >
                  <option value="Airway & breathing">Airway &amp; breathing</option>
                  <option value="Cardiac & monitoring">Cardiac &amp; monitoring</option>
                  <option value="IV access & fluids">IV access &amp; fluids</option>
                  <option value="Basic / ILS medication">Basic / ILS medication</option>
                  <option value="ALS medication">ALS medication</option>
                  <option value="Controlled substances (Schedule 5/6)">Controlled substances (Sch 5/6)</option>
                  <option value="Trauma & wound care">Trauma &amp; wound care</option>
                  <option value="Vehicle & equipment">Vehicle &amp; equipment</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-black uppercase mb-1">Unit</label>
                  <input
                    type="text"
                    value={editingStockItem.unit}
                    onChange={(e) => setEditingStockItem({ ...editingStockItem, unit: e.target.value })}
                    className="w-full p-2 border border-neutral-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-bold text-black uppercase mb-1">Min Level</label>
                  <input
                    type="number"
                    value={editingStockItem.minLevel}
                    onChange={(e) =>
                      setEditingStockItem({
                        ...editingStockItem,
                        minLevel: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full p-2 border border-neutral-300 rounded font-mono"
                  />
                </div>
              </div>
              <div className="flex items-center gap-4 py-1">
                <label className="flex items-center gap-1.5 text-neutral-700 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingStockItem.isControlled}
                    onChange={(e) =>
                      setEditingStockItem({ ...editingStockItem, isControlled: e.target.checked })
                    }
                    className="rounded text-red-600 focus:ring-red-500"
                  />
                  <span>Schedule 5/6</span>
                </label>
                <label className="flex items-center gap-1.5 text-neutral-700 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingStockItem.requiresALS}
                    onChange={(e) =>
                      setEditingStockItem({ ...editingStockItem, requiresALS: e.target.checked })
                    }
                    className="rounded text-red-600 focus:ring-red-500"
                  />
                  <span>Requires ALS</span>
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingStockItem(null)}
                  className="px-3 py-1.5 text-neutral-600 hover:bg-neutral-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-red-600 text-white font-bold rounded hover:bg-red-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
