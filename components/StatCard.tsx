import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  subValue?: string;
  icon: LucideIcon;
  colorClass?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, subValue, icon: Icon, colorClass = "text-cupra-copper" }) => {
  return (
    <div className="bg-cupra-card border border-gray-800 rounded-xl p-4 flex items-center justify-between shadow-lg">
      <div>
        <p className="text-cupra-muted text-xs font-semibold uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-white mt-1">{value}</p>
        {subValue && <p className="text-xs text-gray-400 mt-1">{subValue}</p>}
      </div>
      <div className={`p-3 rounded-full bg-opacity-10 bg-gray-700 ${colorClass}`}>
        <Icon size={24} />
      </div>
    </div>
  );
};

export default StatCard;