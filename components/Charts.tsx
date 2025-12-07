import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { MonthlyStats } from '../types';

interface ChartsProps {
  monthlyStats: MonthlyStats[];
}

const Charts: React.FC<ChartsProps> = ({ monthlyStats }) => {
  if (monthlyStats.length < 2) return null;

  // Recharts wants data chronological (oldest to newest) usually for XAxis left-to-right
  const data = [...monthlyStats].reverse().map(stat => ({
    name: stat.label.split(' ')[0].substring(0, 3), // "Nov"
    cost: stat.totalCost,
    distance: stat.totalDistance,
    fullLabel: stat.label,
    // Calculate consumptions for chart 2
    gasCons: stat.totalDistance > 0 ? (stat.gasVolume / stat.totalDistance) * 100 : 0,
    elecCons: stat.totalDistance > 0 ? (stat.elecVolume / stat.totalDistance) * 100 : 0,
  }));

  const CustomTooltipCost = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-cupra-card border border-gray-700 p-3 rounded-lg shadow-xl">
          <p className="text-cupra-copper font-bold mb-1">{payload[0].payload.fullLabel}</p>
          <p className="text-gray-200 text-sm">
            Spesa: <span className="font-bold">€{payload[0].value.toFixed(2)}</span>
          </p>
          <p className="text-gray-400 text-xs">
            Distanza: {payload[0].payload.distance} km
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomTooltipCons = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-cupra-card border border-gray-700 p-3 rounded-lg shadow-xl">
          <p className="text-cupra-copper font-bold mb-1">{payload[0].payload.fullLabel}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: <span className="font-bold">{entry.value.toFixed(1)}</span> {entry.dataKey === 'gasCons' ? 'L/100km' : 'kWh/100km'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 mb-6">
      
      {/* CHART 1: Monthly Cost */}
      <div className="bg-cupra-card border border-gray-800 rounded-xl p-4 shadow-lg">
        <h3 className="text-cupra-muted text-xs font-semibold uppercase tracking-wider mb-4">Spesa Mensile (€)</h3>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <defs>
                <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#cf8e55" stopOpacity={1}/>
                  <stop offset="100%" stopColor="#b07542" stopOpacity={0.8}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 12 }} 
              />
              <YAxis hide domain={[0, 'auto']} />
              <Tooltip content={<CustomTooltipCost />} cursor={{ fill: '#1f2937', opacity: 0.4 }} />
              <Bar 
                dataKey="cost" 
                fill="url(#colorBar)" 
                radius={[4, 4, 0, 0]} 
                barSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* CHART 2: Consumption Breakdown */}
      <div className="bg-cupra-card border border-gray-800 rounded-xl p-4 shadow-lg">
        <h3 className="text-cupra-muted text-xs font-semibold uppercase tracking-wider mb-4">Consumi Medi / 100km</h3>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 12 }} 
              />
              <YAxis hide domain={[0, 'auto']} />
              <Tooltip content={<CustomTooltipCons />} cursor={{ fill: '#1f2937', opacity: 0.4 }} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Bar 
                dataKey="gasCons" 
                name="Benzina" 
                fill="#10b981" 
                radius={[4, 4, 0, 0]} 
                barSize={12}
              />
              <Bar 
                dataKey="elecCons" 
                name="Elettrico" 
                fill="#3b82f6" 
                radius={[4, 4, 0, 0]} 
                barSize={12}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};

export default Charts;