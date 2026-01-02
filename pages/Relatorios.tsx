
import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, ResponsiveContainer } from 'recharts';
import { Icons } from '../constants';
import { Student, Class } from '../types';

interface RelatoriosProps {
  onBack: () => void;
  students: Student[];
  classes: Class[];
  attendance: any[];
}

const MONTHS = [
  "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO",
  "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"
];

const PERIODS = [
  { label: "MENSAL", value: 1 },
  { label: "3 MESES", value: 3 },
  { label: "6 MESES", value: 6 },
  { label: "ANUAL", value: 12 }
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

const Relatorios: React.FC<RelatoriosProps> = ({ onBack, students, classes, attendance }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedPeriod, setSelectedPeriod] = useState(1);

  const stats = useMemo(() => {
    // Filtragem de dados pelo período selecionado
    const filteredAttendance = attendance.filter(a => {
      const date = new Date(a.attendance_date);
      const start = new Date(selectedYear, selectedMonth - selectedPeriod + 1, 1);
      const end = new Date(selectedYear, selectedMonth + 1, 0);
      return date >= start && date <= end;
    });

    // 1. Alunos Ativos por Turma
    const pieData = classes.map(cls => ({
      name: cls.name,
      value: students.filter(s => s.classId === cls.id && s.status === 'ativo').length
    })).filter(d => d.value > 0);

    // 2. Presença vs Faltas
    const barData = classes.map(cls => {
      let p = 0;
      let f = 0;
      const classStudentIds = students.filter(s => s.classId === cls.id).map(s => s.id);
      
      filteredAttendance.forEach(a => {
        if (classStudentIds.includes(a.student_id)) {
          if (a.status === 'P' || a.status === 'A') p++;
          if (a.status === 'F' || a.status === 'J') f++;
        }
      });

      return { name: cls.name, presenca: p, faltas: f };
    });

    // 3. Tendência (Linhas)
    let lineData: any[] = [];
    if (selectedPeriod === 1) {
      // Semanal
      const weeks = ["Sem. 1", "Sem. 2", "Sem. 3", "Sem. 4"];
      lineData = weeks.map((w, i) => {
        const dataPoint: any = { name: w };
        classes.forEach(cls => {
          const classStudentIds = students.filter(s => s.classId === cls.id).map(s => s.id);
          dataPoint[cls.name] = filteredAttendance.filter(a => {
            const d = new Date(a.attendance_date).getDate();
            return classStudentIds.includes(a.student_id) && 
                   d > i * 7 && d <= (i + 1) * 7 && 
                   (a.status === 'P' || a.status === 'A');
          }).length;
        });
        return dataPoint;
      });
    } else {
      // Mensal
      for (let i = selectedPeriod - 1; i >= 0; i--) {
        let m = selectedMonth - i;
        let y = selectedYear;
        while (m < 0) { m += 12; y -= 1; }
        
        const dataPoint: any = { name: `${MONTHS[m].substring(0, 3)}/${y.toString().slice(-2)}` };
        classes.forEach(cls => {
          const classStudentIds = students.filter(s => s.classId === cls.id).map(s => s.id);
          dataPoint[cls.name] = attendance.filter(a => {
            const date = new Date(a.attendance_date);
            return classStudentIds.includes(a.student_id) && 
                   date.getMonth() === m && date.getFullYear() === y &&
                   (a.status === 'P' || a.status === 'A');
          }).length;
        });
        lineData.push(dataPoint);
      }
    }

    return { pieData, barData, lineData };
  }, [students, classes, attendance, selectedMonth, selectedYear, selectedPeriod]);

  return (
    <div className="w-full max-w-7xl flex flex-col p-4 md:p-8 gap-8 mt-12 md:mt-0 text-white pb-32">
      <div className="flex flex-col xl:flex-row items-center justify-between gap-6 bg-white/5 p-6 rounded-[2.5rem] border border-white/10">
        <div className="flex items-center gap-4 w-full xl:w-auto">
          <button onClick={onBack} className="bg-white/10 hover:bg-white/20 p-4 rounded-2xl transition-all active:scale-95 shadow-lg"><Icons.Back /></button>
          <div>
            <h2 className="text-2xl md:text-4xl font-black uppercase italic tracking-tighter leading-none">Relatórios de Banco</h2>
            <p className="text-[10px] font-black uppercase text-blue-400 tracking-[0.2em] mt-1 opacity-60 italic">Dados Sincronizados Supabase</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-4 w-full xl:w-auto">
          <div className="flex bg-black/40 p-1 rounded-2xl border border-white/10">
            {PERIODS.map(p => (
              <button 
                key={p.value}
                onClick={() => setSelectedPeriod(p.value)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${selectedPeriod === p.value ? 'bg-blue-600 text-white shadow-lg' : 'text-white/30 hover:text-white/60'}`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center bg-black/40 border border-white/10 rounded-2xl overflow-hidden p-1 shadow-inner">
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="bg-transparent text-white font-black uppercase text-xs px-5 py-3 outline-none cursor-pointer">
              {MONTHS.map((m, i) => <option key={m} value={i} className="bg-[#05051a]">{m}</option>)}
            </select>
            <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="bg-transparent text-white font-black text-xs px-5 py-3 outline-none border-l border-white/10 cursor-pointer">
              {[2024, 2025, 2026].map(y => <option key={y} value={y} className="bg-[#05051a]">{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#0a0a20] rounded-[3rem] p-8 border border-white/5 shadow-2xl relative overflow-hidden group">
          <h3 className="text-xl font-black mb-8 uppercase tracking-widest text-blue-400 italic flex items-center gap-3">
             <span className="w-2 h-8 bg-blue-500 rounded-full"></span> Alunos por Turma
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.pieData} innerRadius={70} outerRadius={100} paddingAngle={8} dataKey="value" stroke="none">
                  {stats.pieData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '20px', background: '#020230', border: '1px solid rgba(255,255,255,0.1)', fontWeight: '900', textTransform: 'uppercase', fontSize: '10px' }} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#0a0a20] rounded-[3rem] p-8 border border-white/5 shadow-2xl relative overflow-hidden group">
          <h3 className="text-xl font-black mb-8 uppercase tracking-widest text-green-400 italic flex items-center gap-3">
             <span className="w-2 h-8 bg-green-500 rounded-full"></span> Presenças vs Faltas
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.barData} barGap={12}>
                <CartesianGrid strokeDasharray="5 5" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={10} axisLine={false} tickLine={false} dy={10} />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: 'rgba(255,255,255,0.02)'}} contentStyle={{ borderRadius: '20px', background: '#020230', border: '1px solid rgba(255,255,255,0.1)', fontWeight: '900' }} />
                <Bar dataKey="presenca" fill="#10b981" radius={[10, 10, 0, 0]} name="PRESENÇAS" />
                <Bar dataKey="faltas" fill="#ef4444" radius={[10, 10, 0, 0]} name="FALTAS" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#0a0a20] rounded-[3rem] p-8 border border-white/5 shadow-2xl lg:col-span-2 relative overflow-hidden group">
          <h3 className="text-xl font-black mb-8 uppercase tracking-widest text-yellow-400 italic flex items-center gap-3">
             <span className="w-2 h-8 bg-yellow-500 rounded-full"></span> Tendência de Atividade
          </h3>
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.lineData}>
                <CartesianGrid strokeDasharray="10 10" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={11} fontWeight="900" dy={10} />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: '20px', background: '#020230', border: '1px solid rgba(255,255,255,0.1)', fontWeight: '900', fontSize: '11px' }} />
                <Legend wrapperStyle={{ paddingTop: '30px', fontWeight: '900', fontSize: '10px' }} />
                {classes.map((cls, index) => (
                  <Line key={cls.id} type="monotone" dataKey={cls.name} stroke={COLORS[index % COLORS.length]} strokeWidth={4} dot={{ r: 6, strokeWidth: 2, fill: '#0a0a20' }} activeDot={{ r: 9, strokeWidth: 0 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Relatorios;
