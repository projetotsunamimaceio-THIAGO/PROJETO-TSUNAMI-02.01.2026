
import React, { useState, useMemo } from 'react';
import { Icons } from '../constants';
import { Student, Class } from '../types';

interface FrequenciaListaProps {
  title: string;
  onBack: () => void;
  students: Student[];
  attendance: any[];
  onSyncAttendance: (studentId: string, date: string, status: string | null, note: string) => Promise<void>;
  onSyncBatchAttendance: (updates: { studentId: string, date: string, status: string | null, note: string }[]) => Promise<void>;
  classes: Class[];
}

type AttendanceStatus = 'P' | 'F' | 'A' | 'J' | null;

const MONTHS = [
  "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO",
  "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"
];

const WEEK_DAYS_SHORT = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

const FrequenciaLista: React.FC<FrequenciaListaProps> = ({ title, onBack, students, attendance, onSyncAttendance, onSyncBatchAttendance, classes }) => {
  const isProjeto = title.toLowerCase().includes('projeto');
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [isSaving, setIsSaving] = useState<string | null>(null); 
  const [batchLoadingDay, setBatchLoadingDay] = useState<string | null>(null);
  const [justifyingCell, setJustifyingCell] = useState<{ studentId: string, isoDate: string, studentName: string } | null>(null);
  const [tempNote, setTempNote] = useState('');
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  const attendanceDays = useMemo(() => {
    const dates: { day: string; weekDayName: string; iso: string }[] = [];
    const date = new Date(selectedYear, selectedMonth, 1);
    const allowedDays = isProjeto ? [2, 5, 6] : [6];

    while (date.getMonth() === selectedMonth) {
      if (allowedDays.includes(date.getDay())) {
        const y = date.getFullYear();
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        const d = date.getDate().toString().padStart(2, '0');
        dates.push({
          day: d,
          weekDayName: WEEK_DAYS_SHORT[date.getDay()],
          iso: `${y}-${m}-${d}`
        });
      }
      date.setDate(date.getDate() + 1);
    }
    return dates;
  }, [selectedMonth, selectedYear, isProjeto]);

  const filteredStudents = useMemo(() => {
    let list = students.filter(s => s.status === 'ativo');
    if (selectedClassId !== 'all') {
      list = list.filter(s => s.classId === selectedClassId);
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [students, selectedClassId]);

  const getCellData = (studentId: string, isoDate: string) => {
    return attendance.find(a => 
      a.student_id === studentId && 
      (a.attendance_date?.split('T')[0] === isoDate)
    );
  };

  const getDayAttendanceCount = (isoDate: string) => {
    return filteredStudents.reduce((acc, s) => {
      const d = getCellData(s.id, isoDate);
      if (d?.status === 'P' || d?.status === 'A') return acc + 1;
      return acc;
    }, 0);
  };

  const getStudentAbsences = (studentId: string) => {
    return attendanceDays.reduce((acc, day) => {
      const data = getCellData(studentId, day.iso);
      if (data?.status === 'F' || data?.status === 'J') return acc + 1;
      return acc;
    }, 0);
  };

  const handleMarkAll = async (isoDate: string, status: AttendanceStatus) => {
    const aptStudents = filteredStudents.filter(s => isoDate >= s.registrationDate);
    if (aptStudents.length === 0) return;
    setBatchLoadingDay(isoDate);
    const updates = aptStudents.map(s => ({ studentId: s.id, date: isoDate, status, note: '' }));
    try { await onSyncBatchAttendance(updates); } finally { setBatchLoadingDay(null); }
  };

  const handleExportDay = (isoDate: string) => {
    const presentOnes = filteredStudents
      .filter(s => {
        const data = getCellData(s.id, isoDate);
        return data?.status === 'P' || data?.status === 'A';
      })
      .map(s => s.name.toUpperCase());

    if (presentOnes.length === 0) {
      alert("NENHUMA PRESENÇA REGISTRADA NESTA DATA.");
      return;
    }

    const dateFormatted = isoDate.split('-').reverse().join('/');
    const text = `🌊 TSUNAMI - FREQUÊNCIA\n🗓️ DATA: ${dateFormatted}\n👥 TOTAL: ${presentOnes.length}\n\n${presentOnes.join('\n')}`;

    navigator.clipboard.writeText(text).then(() => {
      setExportFeedback(isoDate);
      setTimeout(() => setExportFeedback(null), 2000);
    });
  };

  const toggleStatus = async (studentId: string, isoDate: string, studentName: string, isLocked: boolean) => {
    if (isLocked || isSaving === `${studentId}-${isoDate}` || !!batchLoadingDay) return;
    const currentData = getCellData(studentId, isoDate);
    const statusCycle: AttendanceStatus[] = [null, 'F', 'P', 'A', 'J'];
    const nextStatus = statusCycle[(statusCycle.indexOf(currentData?.status || null) + 1) % statusCycle.length];

    if (nextStatus === 'J') {
      setJustifyingCell({ studentId, isoDate, studentName });
      setTempNote(currentData?.note || '');
    } else {
      setIsSaving(`${studentId}-${isoDate}`);
      try { await onSyncAttendance(studentId, isoDate, nextStatus, currentData?.note || ''); } 
      finally { setIsSaving(null); }
    }
  };

  const renderStatusIcon = (studentId: string, isoDate: string, isLocked: boolean) => {
    const data = getCellData(studentId, isoDate);
    const saving = isSaving === `${studentId}-${isoDate}` || batchLoadingDay === isoDate;
    if (isLocked) return <div className="w-8 h-8 border border-white/5 rounded-lg opacity-10"></div>;
    if (saving) return <div className="w-8 h-8 flex items-center justify-center"><div className="w-4 h-4 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div></div>;

    const base = "w-8 h-8 rounded-lg flex items-center justify-center transition-all border-2 shadow-sm";
    switch (data?.status) {
      case 'P': return <div className={`${base} border-[#10b981] bg-[#10b981]/10 text-[#10b981] scale-90`}><Icons.Check /></div>;
      case 'F': return <div className={`${base} border-[#ef4444] bg-[#ef4444]/10 text-[#ef4444] scale-90`}><Icons.X /></div>;
      case 'A': return <div className={`${base} border-yellow-500 bg-yellow-500/10 text-yellow-500 scale-90`}><Icons.AlertTriangle /></div>;
      case 'J': return <div className={`${base} border-blue-500 bg-blue-500/10 text-blue-400 scale-90`}><Icons.Speaker /></div>;
      default: return <div className="w-8 h-8 border-2 border-white/10 rounded-lg"></div>;
    }
  };

  return (
    <div className="w-full flex flex-col items-center gap-4 py-2 md:py-8 md:px-4 max-w-5xl mx-auto pb-32">
      <div className="w-full flex items-center justify-between px-4">
        <button onClick={onBack} className="bg-[#0a101f] p-3 rounded-xl border border-white/10 text-white active:scale-95">
          <Icons.Back />
        </button>
        <h2 className="text-sm font-black uppercase text-white tracking-widest opacity-50 italic">{title}</h2>
      </div>

      <div className="flex gap-2 w-full px-4 justify-center">
         <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="flex-1 max-w-[140px] bg-[#0a101f] border border-white/10 text-white font-black uppercase text-[10px] py-3 px-4 rounded-xl outline-none appearance-none cursor-pointer">
           {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
         </select>
         <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className="flex-1 max-w-[180px] bg-[#0a101f] border border-white/10 text-white font-black uppercase text-[10px] py-3 px-4 rounded-xl outline-none appearance-none cursor-pointer">
           <option value="all">TODAS AS TURMAS</option>
           {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
         </select>
      </div>

      <div className="w-full px-2 mt-2">
        <div className="bg-[#050510] rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/5">
                  <th className="p-4 text-left text-[9px] font-black uppercase tracking-widest text-white/30 sticky left-0 bg-[#0c1221] z-30 w-44">ATLETA</th>
                  <th className="p-3 text-center text-[9px] font-black uppercase tracking-widest text-white/30 border-l border-white/5">FALTAS</th>
                  {attendanceDays.map(day => (
                    <th key={day.iso} className="p-2 text-center border-l border-white/5 min-w-[100px]">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-blue-500 font-black text-xl leading-none">{day.day}</span>
                        <span className="text-[7px] font-black text-white/20 uppercase">{day.weekDayName}</span>
                        
                        {/* AÇÕES DA DATA: MARCAR TODOS E EXPORTAR */}
                        <div className="flex gap-1 mt-1">
                           <button onClick={() => handleMarkAll(day.iso, 'P')} title="Presença Geral" className="w-5 h-5 rounded bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-500 hover:bg-green-500 hover:text-white transition-all">
                             <div className="scale-[0.3]"><Icons.Check /></div>
                           </button>
                           <button onClick={() => handleMarkAll(day.iso, 'F')} title="Falta Geral" className="w-5 h-5 rounded bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all">
                             <div className="scale-[0.3]"><Icons.X /></div>
                           </button>
                           <button onClick={() => handleExportDay(day.iso)} title="Exportar Lista" className={`w-5 h-5 rounded flex items-center justify-center transition-all ${exportFeedback === day.iso ? 'bg-blue-500 text-white' : 'bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white'}`}>
                             <div className="scale-[0.3]">{exportFeedback === day.iso ? <Icons.Check /> : <Icons.Share />}</div>
                           </button>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredStudents.map(student => {
                  const abs = getStudentAbsences(student.id);
                  return (
                    <tr key={student.id} className="hover:bg-white/[0.02]">
                      <td className="p-4 font-black uppercase sticky left-0 bg-[#050510] z-20 border-r border-white/5">
                        <div className="flex flex-col">
                          <span className="text-xs text-white tracking-tight leading-tight">{student.name}</span>
                          <span className="text-[8px] text-blue-400/60 font-bold mt-0.5 tracking-widest">
                            {classes.find(c => c.id === student.classId)?.name || 'S/ TURMA'}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                         <div className="flex justify-center">
                           {abs > 0 ? (
                             <div className="w-7 h-7 rounded-full flex items-center justify-center border border-red-600 text-red-500 bg-red-600/10 font-black text-[10px]">
                               {abs}
                             </div>
                           ) : (
                             <div className="w-7 h-7 rounded-full border border-white/5"></div>
                           )}
                         </div>
                      </td>
                      {attendanceDays.map(day => (
                        <td key={day.iso} className="p-1 text-center border-l border-white/5">
                          <button onClick={() => toggleStatus(student.id, day.iso, student.name, day.iso < student.registrationDate)} className="block mx-auto">
                            {renderStatusIcon(student.id, day.iso, day.iso < student.registrationDate)}
                          </button>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t border-white/10 bg-white/5">
                <tr>
                   <td colSpan={2} className="p-4 text-right text-[8px] font-black uppercase text-blue-400 tracking-widest sticky left-0 bg-[#0c1221] z-20">PRESENÇAS NO DIA</td>
                   {attendanceDays.map(day => (
                     <td key={day.iso} className="p-3 text-center border-l border-white/5">
                        <span className="text-white font-black text-sm">{getDayAttendanceCount(day.iso)}</span>
                     </td>
                   ))}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {justifyingCell && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
           <div className="bg-[#0a101f] w-full max-w-sm rounded-[2rem] p-8 border border-white/10 shadow-2xl animate-in zoom-in duration-200">
              <h3 className="text-lg font-black uppercase text-white mb-6 text-center italic">Justificar Atleta</h3>
              <textarea autoFocus placeholder="..." className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-bold outline-none h-24 mb-6 focus:border-blue-500/40 text-xs resize-none uppercase" value={tempNote} onChange={e => setTempNote(e.target.value)} />
              <div className="flex gap-3">
                <button onClick={() => setJustifyingCell(null)} className="flex-1 bg-white/5 text-white/40 font-black py-4 rounded-xl uppercase text-[10px]">SAIR</button>
                <button onClick={async () => {
                  setIsSaving(`${justifyingCell.studentId}-${justifyingCell.isoDate}`);
                  try { await onSyncAttendance(justifyingCell.studentId, justifyingCell.isoDate, 'J', tempNote); setJustifyingCell(null); } 
                  finally { setIsSaving(null); }
                }} className="flex-1 bg-blue-600 text-white font-black py-4 rounded-xl uppercase text-[10px] shadow-lg">SALVAR</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default FrequenciaLista;
