
import React, { useMemo } from 'react';
import DashboardCard from '../components/DashboardCard';
import Logo from '../components/Logo';
import { Page, Student } from '../types';
import { Icons } from '../constants';

interface DashboardProps {
  onNavigate: (page: Page) => void;
  students: Student[];
  attendance: any[];
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate, students, attendance }) => {
  const stats = useMemo(() => {
    const activeStudents = students.filter(s => s.status === 'ativo');
    const activeCount = activeStudents.length;
    
    // Cálculo de alertas críticos baseados no array de attendance do Supabase
    let criticalAlerts = 0;
    activeStudents.forEach(student => {
      const studentAbsences = attendance.filter(a => 
        a.student_id === student.id && 
        (a.status === 'F' || a.status === 'J') &&
        (a.attendance_date >= student.registrationDate)
      ).length;

      if (studentAbsences >= 4) criticalAlerts++;
    });

    return { activeCount, criticalAlerts };
  }, [students, attendance]);

  return (
    <div className="w-full flex flex-col items-center gap-8 pt-4 md:pt-10">
      <div className="w-full flex flex-col md:flex-row items-center justify-center gap-3 md:gap-12 mb-4 px-4 text-center md:text-left">
        <div className="shrink-0 drop-shadow-2xl">
          <Logo className="w-24 h-24 sm:w-28 sm:h-28 md:w-40 md:h-40 lg:w-48 lg:h-48" />
        </div>

        <div className="flex flex-col items-center md:items-start">
          <div className="border-b-2 sm:border-b-[4px] md:border-b-[6px] lg:border-b-[8px] border-white pb-2">
            <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black text-white tracking-[0.4em] md:tracking-[0.6em] leading-none select-none uppercase mr-[-0.4em] md:mr-[-0.6em]">
              TSUNAMI
            </h1>
          </div>
          <h2 className="text-sm sm:text-base md:text-2xl lg:text-3xl font-bold text-white mt-3 md:mt-5 uppercase select-none tracking-[0.2em] opacity-90 italic">
            FREQUÊNCIA - GESTÃO
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 w-full px-4 md:px-10 py-6">
        <div className="relative">
          <DashboardCard 
            title="TURMAS ATIVAS" 
            icon={<div className="grid grid-cols-2 gap-2 text-white scale-90"><Icons.Users /><Icons.Users /><Icons.Users /><Icons.Users /></div>} 
            colorClass="bg-gradient-to-b from-[#0088cc] to-[#004488]"
            onClick={() => onNavigate(Page.TURMAS_ATIVAS)}
          />
        </div>

        <div className="relative">
          <DashboardCard 
            title="ALUNOS ATIVOS" 
            icon={<div className="grid grid-cols-2 gap-2 text-white scale-90"><Icons.Users /><Icons.Users /><Icons.Users /><Icons.Users /></div>} 
            colorClass="bg-gradient-to-b from-[#4d6ec8] to-[#2c4481]"
            onClick={() => onNavigate(Page.CADASTRO_ALUNOS)}
          />
          <div className="absolute top-4 right-4 bg-white text-blue-900 px-3 py-1 rounded-full font-black text-xs shadow-xl">{stats.activeCount}</div>
        </div>

        <div className="relative">
          <DashboardCard 
            title="ALERTA DE FALTAS" 
            icon={<div className="scale-150 text-white mt-2"><Icons.AlertTriangle /></div>} 
            colorClass="bg-gradient-to-b from-[#aa0000] to-[#660000]"
            onClick={() => onNavigate(Page.ALERTA_FALTAS)}
          />
          {stats.criticalAlerts > 0 && (
            <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full font-black text-xs shadow-xl animate-bounce border-2 border-white">
              {stats.criticalAlerts} CRÍTICOS
            </div>
          )}
        </div>

        <DashboardCard 
          title="FREQUÊNCIA ARENA" 
          icon={<div className="flex gap-2 text-white scale-110 mt-2"><Icons.Check /><Icons.AlertTriangle /><Icons.X /><Icons.Speaker /></div>} 
          colorClass="bg-gradient-to-b from-[#0088cc] to-[#004488]"
          onClick={() => onNavigate(Page.FREQUENCIA_ARENA)}
        />
        <DashboardCard 
          title="FREQUÊNCIA PROJETO" 
          icon={<div className="flex gap-2 text-white scale-110 mt-2"><Icons.Check /><Icons.AlertTriangle /><Icons.X /><Icons.Speaker /></div>} 
          colorClass="bg-gradient-to-b from-[#4d6ec8] to-[#2c4481]"
          onClick={() => onNavigate(Page.FREQUENCIA_PROJETO)}
        />
        <DashboardCard 
          title="RELATÓRIOS" 
          icon={<div className="scale-150 text-black mt-2"><Icons.Calendar /></div>} 
          colorClass="bg-gradient-to-b from-[#f2b705] to-[#cc9900] !text-black"
          onClick={() => onNavigate(Page.RELATORIOS)}
        />
      </div>

      <footer className="opacity-40 text-[10px] md:text-xs uppercase tracking-[0.3em] mt-8 pb-12 text-center w-full">
        TSUNAMI ESPORTE CRISTO • ISAÍAS 51:15
      </footer>
    </div>
  );
};

export default Dashboard;
