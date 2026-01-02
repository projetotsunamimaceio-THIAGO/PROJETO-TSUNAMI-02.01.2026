
import React from 'react';

interface DashboardCardProps {
  title: string;
  icon: React.ReactNode;
  colorClass: string;
  onClick: () => void;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, icon, colorClass, onClick }) => {
  return (
    <button 
      onClick={onClick}
      className={`${colorClass} glass-card w-full h-44 md:h-52 rounded-[2rem] flex flex-col items-center justify-center p-4 gap-3 text-white shadow-2xl group border border-white/10`}
    >
      <span className="text-xl md:text-2xl font-black tracking-tight text-center uppercase leading-tight drop-shadow-lg">
        {title}
      </span>
      <div className="group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
    </button>
  );
};

export default DashboardCard;
