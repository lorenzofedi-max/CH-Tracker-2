
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Zap, Fuel, Plus, TrendingUp, History, Euro, Gauge, Calendar, Download, Filter, Pencil, Trash2, Check, X } from 'lucide-react';
import { getLogs, addLog, deleteLog, updateLog, calculateStats, calculateMonthlyStats } from './services/storageService';
import { LogEntry, Stats, MonthlyStats } from './types';
import StatCard from './components/StatCard';
import InputModal from './components/InputModal';
import Charts from './components/Charts';
import * as XLSX from 'xlsx';

const App: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<LogEntry | null>(null);
  
  // FILTER STATE
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]); // Empty array = ALL

  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadedLogs = getLogs();
    setLogs(loadedLogs);
  }, []);

  // Close filter when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSaveEntry = (entry: LogEntry) => {
    if (editingLog) {
      const updated = updateLog(entry);
      setLogs(updated);
      setEditingLog(null);
    } else {
      const updated = addLog(entry);
      setLogs(updated);
    }
  };

  const handleEdit = (log: LogEntry) => {
    setEditingLog(log);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingLog(null); // Reset editing state when closed without saving
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Sei sicuro di voler eliminare questa voce?")) {
      const updated = deleteLog(id);
      setLogs(updated);
    }
  };

  const toggleMonth = (monthKey: string) => {
    setSelectedMonths(prev => {
      if (prev.includes(monthKey)) {
        return prev.filter(m => m !== monthKey);
      } else {
        return [...prev, monthKey];
      }
    });
  };

  const resetFilter = () => {
    setSelectedMonths([]);
    setIsFilterOpen(false);
  };

  // --- CALCULATION LOGIC ---

  // 1. Get all available months for the dropdown
  const availableMonths = useMemo(() => {
    return Array.from(new Set(logs.map(log => log.date.substring(0, 7)))).sort().reverse();
  }, [logs]);

  // 2. Compute the "view" based on the filter
  const { viewStats, viewMonthlyStats, viewLogs } = useMemo(() => {
    // A. Always calculate full monthly stats first (to get accurate distances per month)
    const allMonthlyStats = calculateMonthlyStats(logs);
    
    // B. Default: ALL DATA (If selectedMonths is empty)
    if (selectedMonths.length === 0) {
      return {
        viewStats: calculateStats(logs),
        viewMonthlyStats: allMonthlyStats,
        viewLogs: logs
      };
    } 

    // C. Filtered: MULTIPLE MONTHS
    // 1. Get the MonthlyStats objects for the selected months
    const filteredMonthlyStats = allMonthlyStats.filter(m => selectedMonths.includes(m.monthKey));
    
    // 2. Filter raw logs just for the list view and export
    const filteredLogs = logs.filter(log => selectedMonths.includes(log.date.substring(0, 7)));

    if (filteredMonthlyStats.length === 0) {
       return { viewStats: null, viewMonthlyStats: [], viewLogs: [] };
    }

    // 3. Aggregate stats from the monthly buckets
    // We sum the monthly distances/costs instead of raw logs to preserve the correct distance calculations per month
    const totalDistance = filteredMonthlyStats.reduce((sum, m) => sum + m.totalDistance, 0);
    const totalCost = filteredMonthlyStats.reduce((sum, m) => sum + m.totalCost, 0);
    const totalGasVolume = filteredMonthlyStats.reduce((sum, m) => sum + m.gasVolume, 0);
    const totalElecVolume = filteredMonthlyStats.reduce((sum, m) => sum + m.elecVolume, 0);

    // Calculate the portion of cost that is electric from the raw logs of these months
    const rawElecCost = filteredLogs.filter(l => l.type === 'electric').reduce((acc, l) => acc + l.cost, 0);

    const aggregatedStats: Stats = {
      totalDistance,
      totalCost,
      totalGasVolume,
      totalElecVolume,
      costPer100Km: totalDistance > 0 ? (totalCost / totalDistance) * 100 : 0,
      costPerKm: totalDistance > 0 ? totalCost / totalDistance : 0,
      gasConsumption: totalDistance > 0 ? (totalGasVolume / totalDistance) * 100 : 0,
      elecConsumption: totalDistance > 0 ? (totalElecVolume / totalDistance) * 100 : 0,
      percentageElectricCost: totalCost > 0 ? (rawElecCost / totalCost) * 100 : 0
    };

    return {
      viewStats: aggregatedStats,
      viewMonthlyStats: filteredMonthlyStats, // Show chart only for selected months
      viewLogs: filteredLogs
    };

  }, [logs, selectedMonths]);


  const handleExport = () => {
    if (viewLogs.length === 0) return;

    // Create a copy and sort chronologically (oldest first)
    const sortedLogsForExport = [...viewLogs].sort((a, b) => {
        const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return a.odometer - b.odometer;
    });

    const data = sortedLogsForExport.map(log => ({
      "Data": log.date.split('-').reverse().join('/'), 
      "Tipo": log.type === 'gas' ? 'Benzina' : 'Elettrico',
      "Odometro (km)": log.odometer,
      "Quantità": log.amount,
      "Unità": log.type === 'gas' ? 'Litri' : 'kWh',
      "Costo Totale (€)": Number(log.cost.toFixed(2)),
      "Prezzo Unitario (€)": Number(log.pricePerUnit.toFixed(3))
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const wscols = [{ wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 8 }, { wch: 15 }, { wch: 18 }];
    worksheet['!cols'] = wscols;

    const workbook = XLSX.utils.book_new();
    
    let fileName = `Cupra_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
    let sheetName = "Report";
    
    if (selectedMonths.length === 1) {
       const dateObj = new Date(selectedMonths[0] + "-01");
       const monthName = dateObj.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
       fileName = `Cupra_Report_${monthName.replace(' ', '_')}.xlsx`;
       sheetName = monthName.substring(0, 31);
    } else if (selectedMonths.length > 0) {
        fileName = `Cupra_Report_Multi_${new Date().toISOString().split('T')[0]}.xlsx`;
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, fileName);
  };

  const lastOdometer = logs.length > 0 ? logs[0].odometer : 0;

  // Values for the new bar
  const elecPct = viewStats ? Math.round(viewStats.percentageElectricCost) : 50;
  const gasPct = 100 - elecPct;

  return (
    <div className="min-h-screen bg-cupra-dark text-cupra-text font-sans pb-24 selection:bg-cupra-copper selection:text-white">
      
      {/* Header - Solid */}
      <header className="fixed top-0 w-full z-40 bg-cupra-dark border-b border-gray-800 transition-all duration-300">
        <div className="max-w-3xl mx-auto px-4 py-3 flex justify-between items-center">
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cupra-copper to-orange-700 flex items-center justify-center shadow-lg shadow-orange-900/20">
              <span className="font-bold text-white text-xs">C</span>
            </div>
            <div className="leading-tight">
              <h1 className="font-bold text-base tracking-tight text-white">Formentor<span className="text-cupra-copper">Hybrid</span></h1>
              <p className="text-[10px] text-gray-500 font-mono">
                {viewStats ? `${viewStats.totalDistance.toLocaleString()} km` : 'Start tracking'}
              </p>
            </div>
          </div>

          {/* CUSTOM MULTI-SELECT DROPDOWN */}
          <div className="relative" ref={filterRef}>
            <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`flex items-center gap-2 text-xs font-bold rounded-full pl-4 pr-3 py-2 border transition-all ${
                    isFilterOpen || selectedMonths.length > 0
                    ? 'bg-gray-800 border-cupra-copper text-cupra-copper' 
                    : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
            >
              <span>
                {selectedMonths.length === 0 
                    ? 'Tutto lo storico' 
                    : selectedMonths.length === 1 
                        ? new Date(selectedMonths[0] + '-01').toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
                        : `${selectedMonths.length} Mesi Selez.`}
              </span>
              <Filter size={14} className={selectedMonths.length > 0 ? "fill-current" : ""} />
            </button>

            {/* Dropdown Menu */}
            {isFilterOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-cupra-card border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in">
                    <div className="p-2 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-2">Filtra Periodo</span>
                        {selectedMonths.length > 0 && (
                            <button onClick={resetFilter} className="text-[10px] text-cupra-copper hover:text-white underline">
                                Resetta
                            </button>
                        )}
                    </div>
                    <div className="max-h-64 overflow-y-auto p-1 custom-scrollbar">
                        <button 
                            onClick={() => setSelectedMonths([])}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between mb-1 ${
                                selectedMonths.length === 0 ? 'bg-cupra-copper/20 text-cupra-copper font-bold' : 'text-gray-300 hover:bg-gray-800'
                            }`}
                        >
                            <span>Tutto lo storico</span>
                            {selectedMonths.length === 0 && <Check size={14} />}
                        </button>
                        
                        <div className="h-px bg-gray-800 my-1 mx-2"></div>

                        {availableMonths.map(month => {
                            const isSelected = selectedMonths.includes(month);
                            const label = new Date(month + '-01').toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
                            return (
                                <button
                                    key={month}
                                    onClick={() => toggleMonth(month)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between mb-1 transition-colors ${
                                        isSelected ? 'bg-gray-800 text-white font-medium' : 'text-gray-400 hover:bg-gray-800/50'
                                    }`}
                                >
                                    <span className="capitalize">{label}</span>
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                                        isSelected ? 'bg-cupra-copper border-cupra-copper' : 'border-gray-600'
                                    }`}>
                                        {isSelected && <Check size={10} className="text-black" />}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
          </div>

        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 pt-20">
        
        {/* Cost per Km HERO CARD */}
        <div className="relative overflow-hidden bg-gradient-to-br from-gray-800 to-cupra-dark border border-gray-700 rounded-2xl p-4 shadow-2xl mb-4">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cupra-copper opacity-10 blur-3xl rounded-full translate-x-10 -translate-y-10 pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col items-center justify-center py-2">
            <span className="text-cupra-muted text-[10px] font-semibold uppercase tracking-widest mb-1">
              {selectedMonths.length === 0 ? 'Costo Effettivo Globale' : 'Costo Effettivo Periodo'}
            </span>
            <div className="flex items-baseline gap-1 animate-fade-in">
              <span className="text-4xl font-black text-white tracking-tighter">
                {viewStats ? viewStats.costPerKm.toFixed(3) : '--'}
              </span>
              <span className="text-xl text-cupra-copper font-medium">€/km</span>
            </div>
          </div>
        </div>

        {/* --- NEW LINEAR ENERGY MONITOR --- */}
        <div className="bg-[#181b21] border border-gray-800 rounded-xl p-4 shadow-lg mb-6">
            
            {/* Title Bar */}
            <div className="flex justify-between items-end mb-3 px-1">
                <div className="flex items-center gap-1.5 text-emerald-500">
                    <Fuel size={14} />
                    <span className="text-[10px] font-bold tracking-widest uppercase">Benzina</span>
                </div>
                
                {/* Center Label for Split */}
                <span className="text-[10px] text-gray-500 font-mono tracking-wider">MIX SPESA</span>

                <div className="flex items-center gap-1.5 text-blue-500">
                    <span className="text-[10px] font-bold tracking-widest uppercase">Elettrico</span>
                    <Zap size={14} />
                </div>
            </div>

            {/* The Bars */}
            <div className="flex h-3 w-full bg-gray-900 rounded-full overflow-hidden mb-4 relative">
                {/* Gas Segment */}
                <div 
                    style={{ width: `${gasPct}%` }} 
                    className="h-full bg-gradient-to-r from-emerald-700 to-emerald-500 relative transition-all duration-700"
                ></div>
                
                {/* Gap/Divider */}
                <div className="w-1 h-full bg-[#181b21] z-10"></div>
                
                {/* Elec Segment */}
                <div 
                    style={{ width: `${elecPct}%` }} 
                    className="h-full bg-gradient-to-l from-blue-700 to-blue-500 relative transition-all duration-700"
                ></div>

                {/* Percentage Overlay (Optional: only if stats exist) */}
                 {viewStats && (
                    <div className="absolute inset-0 flex justify-between px-2 items-center text-[9px] font-bold text-black/40 pointer-events-none">
                        <span className={gasPct < 15 ? 'hidden' : ''}>{gasPct}%</span>
                        <span className={elecPct < 15 ? 'hidden' : ''}>{elecPct}%</span>
                    </div>
                )}
            </div>

            {/* The Values */}
            <div className="flex justify-between items-end px-1">
                {/* Left Value */}
                <div>
                    <div className="flex items-baseline gap-1">
                         <span className="text-2xl font-bold text-white tabular-nums tracking-tighter">
                            {viewStats ? viewStats.gasConsumption.toFixed(1) : '-'}
                         </span>
                         <span className="text-xs text-gray-500 font-medium">L/100km</span>
                    </div>
                </div>

                {/* Right Value */}
                <div className="text-right">
                    <div className="flex items-baseline gap-1 justify-end">
                         <span className="text-2xl font-bold text-white tabular-nums tracking-tighter">
                            {viewStats ? viewStats.elecConsumption.toFixed(1) : '-'}
                         </span>
                         <span className="text-xs text-gray-500 font-medium">kWh/100km</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <StatCard 
            label="Spesa Periodo" 
            value={viewStats ? `€${Math.floor(viewStats.totalCost)}` : '€0'} 
            subValue={selectedMonths.length === 0 ? "Totale Storico" : "Totale Selezionato"}
            icon={Euro}
            colorClass="text-purple-400"
          />
          <StatCard 
            label="Distanza" 
            value={viewStats ? `${(viewStats.totalDistance / 1000).toFixed(1)}k` : '0'} 
            subValue="Km percorsi"
            icon={TrendingUp}
            colorClass="text-gray-200"
          />
        </div>

        {/* Charts */}
        <Charts monthlyStats={viewMonthlyStats} />

        {/* Monthly Breakdown List (Only visible if showing 'All' or multiple months selected) */}
        {viewMonthlyStats.length > 0 && (
          <div className="mb-6">
             <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Calendar className="text-cupra-copper" size={20} /> Report Mensile
             </h3>
             <div className="space-y-3">
               {viewMonthlyStats.map((m) => (
                 <div key={m.monthKey} className="bg-cupra-card border border-gray-800 rounded-lg p-4 flex justify-between items-center hover:bg-gray-800/50 transition-colors">
                    <div>
                      <p className="font-bold text-white capitalize">{m.label}</p>
                      <p className="text-xs text-gray-500">{m.totalDistance} km percorsi</p>
                    </div>
                    <div className="text-right">
                       <p className="font-bold text-white">€{m.totalCost.toFixed(2)}</p>
                       <p className="text-xs text-cupra-copper">€{m.costPer100Km.toFixed(2)} /100km</p>
                    </div>
                 </div>
               ))}
             </div>
          </div>
        )}

        {/* History List */}
        <div className="pb-12">
          
          <div className="flex justify-between items-center gap-4 mb-6">
             <h3 className="text-lg font-bold text-white flex items-center gap-2">
               <History className="text-gray-500" size={20} /> 
               {selectedMonths.length === 0 ? 'Storico Completo' : 'Dettaglio Periodo'}
             </h3>
             
             {viewLogs.length > 0 && (
               <button 
                 onClick={handleExport}
                 className="flex items-center gap-2 text-xs font-medium text-cupra-copper hover:text-white transition-colors bg-cupra-card border border-gray-800 hover:bg-gray-800 px-3 py-1.5 rounded-lg active:scale-95"
               >
                 <Download size={14} /> <span className="hidden sm:inline">Esporta</span> Excel
               </button>
             )}
          </div>
          
          {viewLogs.length === 0 ? (
            <div className="text-center py-12 text-gray-600 border border-dashed border-gray-800 rounded-xl">
              <Gauge size={48} className="mx-auto mb-2 opacity-50" />
              <p>Nessun dato trovato per il periodo selezionato.</p>
            </div>
          ) : (
            <div className="space-y-3 opacity-90">
              {viewLogs.map((log) => (
                <div key={log.id} className="group bg-cupra-card border border-gray-800 rounded-lg p-3 flex justify-between items-center hover:border-gray-600 transition-colors animate-fade-in">
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${log.type === 'gas' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                      {log.type === 'gas' ? <Fuel size={16} /> : <Zap size={16} />}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-gray-300">{log.amount.toFixed(2)} {log.type === 'gas' ? 'L' : 'kWh'}</p>
                      <p className="text-[10px] text-gray-500">{new Date(log.date).toLocaleDateString()} • {log.odometer} km</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <p className="font-mono text-sm text-gray-300">€{log.cost.toFixed(2)}</p>
                    
                    <div className='flex items-center gap-3 mt-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                        <button onClick={() => handleEdit(log)} className="text-amber-500 hover:text-amber-400">
                             <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(log.id)} className="text-red-900 hover:text-red-500">
                             <Trash2 size={14} />
                        </button>
                    </div>

                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => {
            setEditingLog(null); // Ensure we are adding new, not editing
            setIsModalOpen(true);
          }}
          className="w-14 h-14 bg-cupra-copper hover:bg-cupra-copperHover text-white rounded-full shadow-2xl shadow-orange-900/50 flex items-center justify-center transition-transform active:scale-90"
        >
          <Plus size={28} />
        </button>
      </div>

      <InputModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        onSave={handleSaveEntry}
        lastOdometer={lastOdometer}
        initialData={editingLog}
      />
    </div>
  );
};

export default App;
