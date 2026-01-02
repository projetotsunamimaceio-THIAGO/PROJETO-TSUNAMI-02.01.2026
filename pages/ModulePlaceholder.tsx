
import React from 'react';
import { Icons } from '../constants';

interface ModulePlaceholderProps {
  title: string;
  icon: React.ReactNode;
  onBack: () => void;
}

const ModulePlaceholder: React.FC<ModulePlaceholderProps> = ({ title, icon, onBack }) => {
  return (
    <div className="w-full max-w-6xl h-full flex flex-col p-4 md:p-8 gap-8 mt-16 md:mt-0">
      <div className="flex items-center gap-6">
        <button 
          onClick={onBack} 
          className="bg-white/10 hover:bg-white/20 p-4 rounded-2xl transition-all active:scale-95 group flex items-center gap-2"
        >
          <Icons.Back />
          <span className="hidden md:inline font-bold uppercase tracking-wider">Voltar</span>
        </button>
        <div className="bg-white text-[#020230] rounded-2xl px-8 py-4 flex items-center gap-4 shadow-2xl">
           <span className="font-black text-2xl uppercase tracking-tighter">{title}</span>
           <div className="scale-110">{icon}</div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-white/5 backdrop-blur-md border-4 border-dashed border-white/10 rounded-[3rem] shadow-inner">
         <div className="scale-[3] mb-16 text-blue-400 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">
           {icon}
         </div>
         <h2 className="text-5xl font-black uppercase mb-6 tracking-tighter">Em Desenvolvimento</h2>
         <p className="text-2xl max-w-2xl opacity-60 font-light leading-relaxed">
           O módulo de <span className="font-bold text-white">{title}</span> está sendo finalizado para a temporada Tsunami 2026.
         </p>
         
         <button 
           onClick={onBack}
           className="mt-12 bg-white text-[#020230] font-black px-10 py-5 rounded-full uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl"
         >
           Retornar ao Painel
         </button>
      </div>
    </div>
  );
};

export default ModulePlaceholder;
