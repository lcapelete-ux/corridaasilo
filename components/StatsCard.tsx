import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  description?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon: Icon, color, description }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100 flex items-start justify-between transition-transform hover:scale-[1.02]">
      <div>
        <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-slate-800">{value}</h3>
        {description && <p className="text-slate-400 text-xs mt-2">{description}</p>}
      </div>
      <div className={`p-3 rounded-lg ${color} text-white shadow-md`}>
        <Icon size={24} />
      </div>
    </div>
  );
};
