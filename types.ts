export type EntryType = 'gas' | 'electric';

export interface LogEntry {
  id: string;
  date: string;
  type: EntryType;
  odometer: number; // Km totali al momento del rifornimento
  amount: number; // Litri o kWh
  cost: number; // Costo totale in Euro
  pricePerUnit: number; // €/L o €/kWh
  note?: string;
}

export interface Stats {
  totalDistance: number;
  totalCost: number;
  totalGasVolume: number;
  totalElecVolume: number;
  costPer100Km: number;
  costPerKm: number; // New metric: €/km
  gasConsumption: number; // L/100km
  elecConsumption: number; // kWh/100km
  percentageElectricCost: number;
}

export interface MonthlyStats {
  monthKey: string; // YYYY-MM
  label: string; // "Novembre 2023"
  totalCost: number;
  totalDistance: number;
  costPer100Km: number;
  gasVolume: number;
  elecVolume: number;
}

export interface ChartDataPoint {
  date: string;
  costPer100: number;
  type: string;
}