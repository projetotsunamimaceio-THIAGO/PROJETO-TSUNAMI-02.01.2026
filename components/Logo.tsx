
import React from 'react';

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className = "w-32 h-32" }) => {
  return (
    <div className={`relative flex items-center justify-center rounded-full bg-[#00CEFF] border-[5px] border-[#000033] shadow-xl overflow-hidden select-none ${className}`}>
      {/* Faixa central escura (Azul Marinho Profundo) */}
      <div className="absolute w-full h-[32%] bg-[#000033] top-1/2 -translate-y-1/2 z-0"></div>
      
      {/* Gráfico da Onda (SVG mais preciso) */}
      <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
        <svg viewBox="0 0 100 100" className="w-[88%] h-[88%]">
           {/* Onda principal no fundo escuro */}
           <path 
             d="M10,50 C15,35 30,30 50,50 C70,70 85,65 90,50" 
             fill="none" 
             stroke="#00CEFF" 
             strokeWidth="8"
             strokeLinecap="round"
           />
           {/* Linha branca de brilho */}
           <path 
             d="M15,50 Q30,38 50,50 T85,50" 
             fill="none" 
             stroke="white" 
             strokeWidth="1.5" 
           />
        </svg>
      </div>

      {/* Elementos de Texto com tamanhos refinados */}
      <div className="relative z-20 flex flex-col items-center justify-between text-center w-full h-full py-3 px-1">
        {/* Texto 'Frequência' reduzido como solicitado */}
        <span className="text-[7px] md:text-[8px] font-black text-black uppercase leading-none mt-2 tracking-tighter">
          Frequência
        </span>
        
        {/* Bloco Central TSUNAMI */}
        <div className="flex flex-col items-center">
          <h1 className="text-[20px] md:text-[24px] font-[1000] text-white italic tracking-tighter leading-none drop-shadow-[0_2px_2px_rgba(0,0,0,1)]">
            TSUNAMI
          </h1>
          <span className="text-[6px] md:text-[7px] text-[#FFD700] font-bold self-end mr-3 -mt-0.5 italic">
            Isaías 51:15
          </span>
        </div>

        {/* Rodapé da Logo */}
        <div className="flex flex-col items-center mb-1 leading-none">
          <span className="text-[9px] md:text-[10px] font-black text-black tracking-widest">ESPORTE</span>
          <span className="text-[9px] md:text-[10px] font-black text-black tracking-widest">CRISTO</span>
        </div>
      </div>
    </div>
  );
};

export default Logo;
