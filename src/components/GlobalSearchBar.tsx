import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Trip,
  StockRequest,
  StockItem,
  OvertimeRecord,
  CrewMember,
  AmbulanceUnit,
} from '../types';
import { Storage } from '../utils/storage';
import { formatDateSA } from '../utils/timeCalculations';
import {
  Search,
  X,
  Ambulance,
  FileText,
  Package,
  Clock,
  UserCheck,
  ShieldAlert,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export type SearchCategoryFilter = 'all' | 'trips' | 'stock' | 'catalogue' | 'overtime' | 'crew';

export interface SearchResultItem {
  id: string;
  category: 'trips' | 'stock' | 'catalogue' | 'overtime' | 'crew' | 'fleet';
  title: string;
  subtitle: string;
  badge?: string;
  badgeColor?: string;
  metadata?: string;
  rawItem: any;
  targetTab: string;
}

interface GlobalSearchBarProps {
  onSelectResult: (result: SearchResultItem) => void;
  className?: string;
}

export const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({
  onSelectResult,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<SearchCategoryFilter>('all');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Global hotkey: Ctrl+K or '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in another input/textarea
      const activeEl = document.activeElement;
      const isInput =
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        activeEl?.tagName === 'SELECT';

      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      } else if (e.key === '/' && !isInput) {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch live collections
  const trips = Storage.getTrips().filter((t) => !t.isDeleted);
  const stockRequests = Storage.getStockRequests();
  const stockCatalogue = Storage.getStockItems();
  const overtime = Storage.getOvertime();
  const settings = Storage.getSettings();

  // Search indexing and multi-category filtering
  const allResults = useMemo<SearchResultItem[]>(() => {
    if (!query.trim()) return [];

    const keywords = query
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter((k) => k.length > 0);

    const matchText = (text: string | undefined | null) => {
      if (!text) return false;
      const lower = text.toLowerCase();
      return keywords.every((kw) => lower.includes(kw));
    };

    const results: SearchResultItem[] = [];

    // 1. Search Trips
    trips.forEach((t) => {
      const fullText = [
        t.eprfFormatted,
        t.eprfNumber,
        t.ambulance,
        t.base,
        t.cadNumber,
        t.colourCodeOrHospital,
        t.billingType,
        t.medicalSchemeName,
        t.levelOfCare,
        t.outcome,
        t.notes,
        ...t.crewMembers,
      ].join(' ');

      if (matchText(fullText)) {
        results.push({
          id: t.id,
          category: 'trips',
          title: `${t.eprfFormatted} · ${t.ambulance} (${t.colourCodeOrHospital || 'Colour Code'})`,
          subtitle: `Destination: ${t.colourCodeOrHospital || 'Code'} | Crew: ${t.crewMembers.join(', ')}`,
          badge: `${t.billingType} · ${t.priority} Priority`,
          badgeColor: 'bg-red-900/60 text-red-200 border-red-700',
          metadata: `${formatDateSA(t.date)} (${t.shift}) · Call: ${t.calculatedTimes.totalCallMinutes} min`,
          rawItem: t,
          targetTab: 'trip_log',
        });
      }
    });

    // 2. Search Stock Requests
    stockRequests.forEach((sr) => {
      const itemsList = sr.lines.map((l) => `${l.requestedQty}x ${l.itemName}`).join(' ');
      const fullText = [
        sr.id,
        sr.ambulance,
        sr.base,
        sr.requesterName,
        sr.linkedEprf,
        sr.urgency,
        sr.status,
        sr.notes,
        sr.customItemsNote,
        itemsList,
      ].join(' ');

      if (matchText(fullText)) {
        results.push({
          id: sr.id,
          category: 'stock',
          title: `${sr.id} · Vehicle ${sr.ambulance} (${sr.requesterName})`,
          subtitle: `Items: ${itemsList}`,
          badge: sr.status.toUpperCase(),
          badgeColor:
            sr.status === 'Issued'
              ? 'bg-emerald-900/60 text-emerald-200 border-emerald-700'
              : 'bg-amber-900/60 text-amber-200 border-amber-700',
          metadata: `Urgency: ${sr.urgency} · Base: ${sr.base} · ${formatDateSA(sr.requestedAt.split('T')[0])}`,
          rawItem: sr,
          targetTab: 'stock_requests',
        });
      }
    });

    // 3. Search Stock Catalogue
    stockCatalogue.forEach((item) => {
      const fullText = [item.name, item.category, item.unit, item.isControlled ? 'controlled schedule 5 6' : ''].join(
        ' '
      );

      if (matchText(fullText)) {
        results.push({
          id: item.id,
          category: 'catalogue',
          title: item.name,
          subtitle: `Category: ${item.category} · Unit: ${item.unit} · Par Level: ${item.minLevel}`,
          badge: item.isControlled ? '⚠️ SCHED 5/6 CONTROLLED' : 'Standard Stock',
          badgeColor: item.isControlled
            ? 'bg-amber-900/80 text-amber-200 border-amber-600'
            : 'bg-slate-800 text-slate-300 border-slate-700',
          metadata: item.requiresALS ? 'ALS Credential Required' : 'All Scopes of Practice',
          rawItem: item,
          targetTab: 'stock_requests',
        });
      }
    });

    // 4. Search Overtime
    overtime.forEach((ot) => {
      const fullText = [
        ot.crewName,
        ot.qualification,
        ot.hpcsaNo,
        ot.eprfOrReason,
        ot.baseWorked,
        ot.description,
        ot.status,
      ].join(' ');

      if (matchText(fullText)) {
        results.push({
          id: ot.id,
          category: 'overtime',
          title: `Overtime: ${ot.crewName} (${ot.timeWorkedFormatted} hrs)`,
          subtitle: `Reason: ${ot.eprfOrReason} · Base: ${ot.baseWorked} — "${ot.description}"`,
          badge: ot.status.toUpperCase(),
          badgeColor:
            ot.status === 'Approved'
              ? 'bg-emerald-900/60 text-emerald-200 border-emerald-700'
              : ot.status === 'Rejected'
              ? 'bg-red-900/60 text-red-200 border-red-700'
              : 'bg-amber-900/60 text-amber-200 border-amber-700',
          metadata: `${formatDateSA(ot.date)} · ${ot.timeStarted} to ${ot.timeEnded}`,
          rawItem: ot,
          targetTab: 'overtime',
        });
      }
    });

    // 5. Search Crew Members
    settings.crewMembers.forEach((crew) => {
      const fullText = [crew.name, crew.qualification, crew.hpcsaNo, crew.base, crew.mobile].join(' ');

      if (matchText(fullText)) {
        results.push({
          id: crew.id,
          category: 'crew',
          title: `${crew.name} (${crew.qualification})`,
          subtitle: `HPCSA Reg: ${crew.hpcsaNo} · Base: ${crew.base} · Mobile: ${crew.mobile || 'None'}`,
          badge: `${crew.qualification} PRACTITIONER`,
          badgeColor: 'bg-blue-900/60 text-blue-200 border-blue-700',
          metadata: `Active Station: ${crew.base}`,
          rawItem: crew,
          targetTab: 'settings',
        });
      }
    });

    return results;
  }, [query, trips, stockRequests, stockCatalogue, overtime, settings]);

  // Filter results by active tab
  const filteredResults = useMemo(() => {
    if (activeCategory === 'all') return allResults;
    return allResults.filter((r) => r.category === activeCategory);
  }, [allResults, activeCategory]);

  // Counts per category
  const categoryCounts = useMemo(() => {
    const counts = {
      all: allResults.length,
      trips: 0,
      stock: 0,
      catalogue: 0,
      overtime: 0,
      crew: 0,
    };
    allResults.forEach((r) => {
      if (r.category in counts) {
        counts[r.category as keyof typeof counts]++;
      }
    });
    return counts;
  }, [allResults]);

  const handleSelect = (item: SearchResultItem) => {
    onSelectResult(item);
    setIsOpen(false);
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'trips':
        return <Ambulance className="w-3.5 h-3.5 text-red-400" />;
      case 'stock':
        return <Package className="w-3.5 h-3.5 text-amber-400" />;
      case 'catalogue':
        return <FileText className="w-3.5 h-3.5 text-blue-400" />;
      case 'overtime':
        return <Clock className="w-3.5 h-3.5 text-purple-400" />;
      case 'crew':
        return <UserCheck className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <Search className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  // Highlight matching keyword strings in title/subtitle
  const highlightMatches = (text: string) => {
    if (!query.trim()) return text;
    const parts = query.trim().split(/\s+/).filter(Boolean);
    const regex = new RegExp(`(${parts.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');

    const split = text.split(regex);
    return split.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-400/30 text-yellow-200 px-0.5 rounded font-semibold">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Search Input Box */}
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search trips, ePRF, drugs, crew, fleet... (Ctrl+K)"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          className="w-full sm:w-80 md:w-96 pl-9 pr-14 py-1.5 text-xs bg-slate-950/70 border border-slate-700/80 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-slate-950 focus:border-red-500 transition shadow-inner font-sans"
        />

        {query ? (
          <button
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="absolute right-3 text-slate-400 hover:text-white p-0.5 rounded transition cursor-pointer"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="absolute right-2 flex items-center gap-1 pointer-events-none">
            <kbd className="hidden sm:inline-block text-[10px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
              /
            </kbd>
          </div>
        )}
      </div>

      {/* Dropdown Results Box */}
      {isOpen && (
        <div className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-screen max-w-xl sm:w-[580px] bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-50 overflow-hidden flex flex-col max-h-[82vh]">
          {/* Top Filter Chips */}
          <div className="p-2.5 bg-slate-950 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[11px] scrollbar-none">
            <span className="text-slate-400 font-bold uppercase text-[10px] mr-1">Filter:</span>

            <button
              onClick={() => setActiveCategory('all')}
              className={`px-2.5 py-1 rounded font-semibold transition cursor-pointer ${
                activeCategory === 'all'
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              All ({categoryCounts.all})
            </button>

            <button
              onClick={() => setActiveCategory('trips')}
              className={`px-2.5 py-1 rounded font-semibold transition flex items-center gap-1 cursor-pointer ${
                activeCategory === 'trips'
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Ambulance className="w-3 h-3 text-red-400" />
              <span>Trips ({categoryCounts.trips})</span>
            </button>

            <button
              onClick={() => setActiveCategory('stock')}
              className={`px-2.5 py-1 rounded font-semibold transition flex items-center gap-1 cursor-pointer ${
                activeCategory === 'stock'
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Package className="w-3 h-3 text-amber-400" />
              <span>Stock Orders ({categoryCounts.stock})</span>
            </button>

            <button
              onClick={() => setActiveCategory('catalogue')}
              className={`px-2.5 py-1 rounded font-semibold transition flex items-center gap-1 cursor-pointer ${
                activeCategory === 'catalogue'
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <FileText className="w-3 h-3 text-blue-400" />
              <span>Catalogue ({categoryCounts.catalogue})</span>
            </button>

            <button
              onClick={() => setActiveCategory('overtime')}
              className={`px-2.5 py-1 rounded font-semibold transition flex items-center gap-1 cursor-pointer ${
                activeCategory === 'overtime'
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Clock className="w-3 h-3 text-purple-400" />
              <span>Overtime ({categoryCounts.overtime})</span>
            </button>

            <button
              onClick={() => setActiveCategory('crew')}
              className={`px-2.5 py-1 rounded font-semibold transition flex items-center gap-1 cursor-pointer ${
                activeCategory === 'crew'
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <UserCheck className="w-3 h-3 text-emerald-400" />
              <span>Crew ({categoryCounts.crew})</span>
            </button>
          </div>

          {/* Results List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80 p-1 text-xs">
            {!query.trim() ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <Search className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="font-semibold text-slate-300">Type keywords to search across the entire EMS system</p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Try searching by: ePRF number (e.g. <span className="text-red-400 font-mono">4211</span>), ambulance (
                  <span className="text-red-400 font-mono">MR001</span>), hospital (<span className="text-slate-300">Midmed</span>), medication (<span className="text-amber-400">Morphine</span>, <span className="text-slate-300">Cannula</span>), or paramedic name.
                </p>
              </div>
            ) : filteredResults.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-1">
                <p className="font-bold text-slate-300">No matching results found for "{query}"</p>
                <p className="text-[11px] text-slate-500">
                  Try broader keywords or clear the category filter above.
                </p>
              </div>
            ) : (
              filteredResults.map((item) => (
                <div
                  key={`${item.category}-${item.id}`}
                  onClick={() => handleSelect(item)}
                  className="p-3 hover:bg-slate-800/90 transition cursor-pointer flex items-start justify-between gap-3 group rounded"
                >
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <div className="p-1.5 bg-slate-800 rounded border border-slate-700 shrink-0 mt-0.5">
                      {getCategoryIcon(item.category)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-100 group-hover:text-red-400 transition truncate">
                          {highlightMatches(item.title)}
                        </span>
                        {item.badge && (
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'}`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-300 mt-0.5 truncate">
                        {highlightMatches(item.subtitle)}
                      </p>

                      {item.metadata && (
                        <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">
                          {item.metadata}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 group-hover:text-red-400 shrink-0 self-center">
                    <span>Jump</span>
                    <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition" />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Bar */}
          <div className="p-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
            <span>
              {filteredResults.length} {filteredResults.length === 1 ? 'match' : 'matches'} found
            </span>
            <div className="flex items-center gap-2">
              <span>Press <kbd className="bg-slate-800 px-1 py-0.5 rounded text-slate-300">Esc</kbd> to close</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
