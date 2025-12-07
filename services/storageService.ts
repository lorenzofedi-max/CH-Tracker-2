import { LogEntry, MonthlyStats } from '../types';

const STORAGE_KEY = 'cupra_hybrid_logs_v1';

export const getLogs = (): LogEntry[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to load logs", e);
    return [];
  }
};

export const saveLogs = (logs: LogEntry[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch (e) {
    console.error("Failed to save logs", e);
  }
};

export const addLog = (entry: LogEntry): LogEntry[] => {
  const current = getLogs();
  const updated = [...current, entry].sort((a, b) => b.odometer - a.odometer); // Sort descending by odometer
  saveLogs(updated);
  return updated;
};

export const deleteLog = (id: string): LogEntry[] => {
  const current = getLogs();
  const updated = current.filter(log => log.id !== id);
  saveLogs(updated);
  return updated;
};

// Calculate stats based on a rolling average
export const calculateStats = (logs: LogEntry[]) => {
  if (logs.length < 2) return null;

  // Logs are sorted descending (newest first)
  const newest = logs[0];
  const oldest = logs[logs.length - 1];

  const totalDistance = newest.odometer - oldest.odometer;
  
  const activeLogs = logs.slice(0, logs.length - 1);

  const totalCost = activeLogs.reduce((sum, log) => sum + log.cost, 0);
  const totalGasVolume = activeLogs.filter(l => l.type === 'gas').reduce((sum, log) => sum + log.amount, 0);
  const totalElecVolume = activeLogs.filter(l => l.type === 'electric').reduce((sum, log) => sum + log.amount, 0);

  if (totalDistance <= 0) return null;

  return {
    totalDistance,
    totalCost,
    totalGasVolume,
    totalElecVolume,
    costPer100Km: (totalCost / totalDistance) * 100,
    costPerKm: totalCost / totalDistance,
    gasConsumption: (totalGasVolume / totalDistance) * 100,
    elecConsumption: (totalElecVolume / totalDistance) * 100,
    percentageElectricCost: totalCost > 0 ? (activeLogs.filter(l => l.type === 'electric').reduce((s, l) => s + l.cost, 0) / totalCost) * 100 : 0
  };
};

export const calculateMonthlyStats = (logs: LogEntry[]): MonthlyStats[] => {
  if (logs.length === 0) return [];

  // Group by Month (YYYY-MM)
  const groups: Record<string, LogEntry[]> = {};
  
  logs.forEach(log => {
    const monthKey = log.date.substring(0, 7); // "2023-11"
    if (!groups[monthKey]) groups[monthKey] = [];
    groups[monthKey].push(log);
  });

  // Sort month keys descending (newest month first)
  const sortedKeys = Object.keys(groups).sort().reverse();
  const stats: MonthlyStats[] = [];

  // We need to look ahead (which is back in time in the sortedKeys array) to find the odometer reading
  // at the end of the previous month to calculate accurate distance for the current month.
  
  // Since logs are global sorted descending by odometer, we can find the "previous max odometer" easily.
  // Actually, easier logic:
  // For a specific month M, Distance = (Max Odo in M) - (Max Odo in M-1).
  // If M-1 doesn't exist, Distance = (Max Odo in M) - (Min Odo in M).

  for (let i = 0; i < sortedKeys.length; i++) {
    const currentKey = sortedKeys[i];
    const currentLogs = groups[currentKey];
    
    // Calculate Costs and Volumes strictly from logs IN this month
    const totalCost = currentLogs.reduce((sum, l) => sum + l.cost, 0);
    const gasVolume = currentLogs.filter(l => l.type === 'gas').reduce((sum, l) => sum + l.amount, 0);
    const elecVolume = currentLogs.filter(l => l.type === 'electric').reduce((sum, l) => sum + l.amount, 0);

    // Calculate Distance
    const maxOdoCurrent = Math.max(...currentLogs.map(l => l.odometer));
    
    // Find the max odometer of the *previous* chronological month (which is at i + 1 in our reverse list)
    let previousMaxOdo = 0;
    
    if (i + 1 < sortedKeys.length) {
       const previousKey = sortedKeys[i + 1];
       const previousLogs = groups[previousKey];
       previousMaxOdo = Math.max(...previousLogs.map(l => l.odometer));
    } else {
       // This is the very first month recorded. Use the min odometer of this month as baseline.
       previousMaxOdo = Math.min(...currentLogs.map(l => l.odometer));
    }

    const distance = maxOdoCurrent - previousMaxOdo;
    
    // Create label
    const dateObj = new Date(currentKey + "-01");
    const label = dateObj.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
    const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);

    stats.push({
      monthKey: currentKey,
      label: capitalizedLabel,
      totalCost,
      totalDistance: distance,
      costPer100Km: distance > 0 ? (totalCost / distance) * 100 : 0,
      gasVolume,
      elecVolume
    });
  }

  return stats;
};