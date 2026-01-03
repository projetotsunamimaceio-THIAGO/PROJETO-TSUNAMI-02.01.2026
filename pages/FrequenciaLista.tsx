
import React, { useState, useMemo, useEffect } from 'react';
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

const YEARS = [2024, 2025, 2026];
const WEEK_DAYS_SHORT = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

const FrequenciaLista: React.FC<FrequenciaListaProps> = ({ title, onBack, students, attendance, onSyncAttendance, onSyncBatchAttendance, classes }) => {
  const isProjeto = title.toLowerCase().includes('projeto');
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  
  // ESTADO DE RASCUNHO: Armazena as alterações locais antes de enviar para o banco
  const [draftAttendance, setDraftAttendance] = useState<Record<string, { status: AttendanceStatus, note: string }>>({});
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [justifyingCell, setJustifyingCell] = useState<{ studentId: string, isoDate: string, studentName: string } | null>(null);
  const [tempNote, setTempNote] = useState('');

  // Sincroniza o rascunho com os dados do banco quando o mês/turma muda
  useEffect(() => {
    setDraftAttendance({});
  }, [selectedMonth, selectedYear, selectedClassId]);

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
    const key = `${studentId}_${isoDate}`;
    // Se houver no rascunho, prioriza o rascunho
    if (draftAttendance[key]) return draftAttendance[key];
    // Se não, busca no banco
    return attendance.find(a => a.student_id === studentId && a.attendance_date === isoDate);
  };

  const isDirty = (studentId: string, isoDate: string) => {
    return !!draftAttendance[`${studentId}_${isoDate}`];
  };

  const getDayAttendanceCount = (isoDate: string) => {
    return filteredStudents.reduce((acc, s) => {
      const d = getCellData(s.id, isoDate);
      return (d?.status === 'P' || d?.status === 'A') ? acc + 1 : acc;
    }, 0);
  };

  const getStudentAbsences = (studentId: string) => {
    return attendanceDays.reduce((acc, day) => {
      const data = getCellData(studentId, day.iso);
      return (data?.status === 'F' || data?.status === 'J') ? acc + 1 : acc;
    }, 0);
  };

  const isLocked = (student: Student, isoDate: string) => {
    if (!student.registrationDate || student.registrationDate.trim() === '') return false;
    try {
      const checkDate = isoDate.split('T')[0];
      const regDate = student.registrationDate.split('T')[0];
      return checkDate < regDate;
    } catch (e) { return false; }
  };

  const handleMarkAll = (isoDate: string, status: AttendanceStatus) => {
    const aptStudents = filteredStudents.filter(s => !isLocked(s, isoDate));
    if (aptStudents.length === 0) return;

    const newDraft = { ...draftAttendance };
    aptStudents.forEach(s => {
      newDraft[`${s.id}_${isoDate}`] = { status, note: '' };
    });
    setDraftAttendance(newDraft);
  };

  const handleSaveToCloud = async () => {
    const updates = Object.entries(draftAttendance).map(([key, data]) => {
      const [studentId, date] = key.split('_');
      const itemData = data as { status: AttendanceStatus; note: string };
      return { studentId, date, status: itemData.status, note: itemData.note };
    });

    if (updates.length === 0) {
      alert("NENHUMA ALTERAÇÃO PARA SALVAR.");
      return;
    }

    setIsSavingAll(true);
    try {
      await onSyncBatchAttendance(updates);
      setDraftAttendance({}); // Limpa rascunho após sucesso
      alert("✅ FREQUÊNCIA SALVA COM SUCESSO NO BANCO DE DADOS!");
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingAll(false);
    }
  };

  const handleExportDay = async (isoDate: string, mode: 'share' | 'download') => {
    const presentOnes = filteredStudents.filter(s => {
      const data = getCellData(s.id, isoDate);
      return data?.status === 'P' || data?.status === 'A';
    });

    if (presentOnes.length === 0) {
      alert("SEM PRESENÇAS PARA EXPORTAR.");
      return;
    }

    const grouped: Record<string, string[]> = {};
    presentOnes.forEach(s => {
      const className = classes.find(c => c.id === s.classId)?.name || 'SEM TURMA';
      if (!grouped[className]) grouped[className] = [];
      grouped[className].push(s.name.toUpperCase());
    });

    const dateFormatted = isoDate.split('-').reverse().join('/');
    let message = `🌊 TSUNAMI - FREQUÊNCIA (${dateFormatted})\n\n`;
    Object.entries(grouped).forEach(([turma, nomes]) => {
      message += `${turma.toUpperCase()}\n${nomes.join('\n')}\n\n`;
    });
    message += `TOTAL: ${presentOnes.length} PESSOAS.`;

    if (mode === 'share') {
      if (navigator.share) {
        try { await navigator.share({ title: 'Frequência Tsunami', text: message }); return; } catch (e) {}
      }
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
    } else {
      const blob = new Blob([message], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Frequencia_Tsunami_${dateFormatted.replace(/\//g, '-')}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const toggleStatus = (student: Student, isoDate: string, locked: boolean) => {
    if (locked || isSavingAll) return;
    const currentData = getCellData(student.id, isoDate);
    const statusCycle: AttendanceStatus[] = [null, 'F', 'P', 'A', 'J'];
    const nextStatus = statusCycle[(statusCycle.indexOf(currentData?.status || null) + 1) % statusCycle.length];

    if (nextStatus === 'J') {
      setJustifyingCell({ studentId: student.id, isoDate, studentName: student.name });
      setTempNote(currentData?.note || '');
    } else {
      const key = `${student.id}_${isoDate}`;
      setDraftAttendance(prev => ({
        ...prev,
        [key]: { status: nextStatus, note: currentData?.note || '' }
      }));
    }
  };

  const renderStatusIcon = (student: Student, isoDate: string, locked: boolean) => {
    const data = getCellData(student.id, isoDate);
    const dirty = isDirty(student.id, isoDate);
    
    if (locked) return <div className="w-10 h-10 border border-white/5 rounded-xl opacity-5"></div>;
    
    const base = `w-10 h-10 rounded-xl flex items-center justify-center transition-all border-2 shadow-sm active:scale-90 ${dirty ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[#050510]' : ''}`;
    
    switch (data?.status) {
      case 'P': return <div className={`${base} border-[#10b981] bg-[#10b981]/20 text-[#10b981]`}><Icons.Check /></div>;
      case 'F': return <div className={`${base} border-[#ef4444] bg-[#ef4444]/20 text-[#ef4444]`}><Icons.X /></div>;
      case 'A': return <div className={`${base} border-yellow-500 bg-yellow-500/20 text-yellow-500`}><Icons.AlertTriangle /></div>;
      case 'J': return <div className={`${base} border-blue-500 bg-blue-500/20 text-blue-400`}><Icons.Speaker /></div>;
      default: return <div className={`w-10 h-10 border-2 ${dirty ? 'border-blue-500/50 bg-blue-500/10' : 'border-white/10 bg-black/20'} rounded-xl`}></div>;
    }
  };

  const hasUnsavedChanges = Object.keys(draftAttendance).length > 0;

  return (
    <div className="w-full flex flex-col items-center gap-4 py-2 md:py-8 md:px-4 max-w-5xl mx-auto pb-48">
      <div className="w-full flex items-center justify-between px-4">
        <button onClick={() => {
          if (hasUnsavedChanges && !confirm("EXISTEM ALTERAÇÕES NÃO SALVAS! DESEJA REALMENTE SAIR?")) return;
          onBack();
        }} type="button" className="bg-[#0a101f] p-3 rounded-xl border border-white/10 text-white active:scale-95 transition-all"><Icons.Back /></button>
        <div className="flex flex-col items-end">
           <h2 className="text-xs font-black uppercase text-white tracking-[0.2em] opacity-50 italic">{title}</h2>
           {hasUnsavedChanges && <span className="text-[9px] text-blue-400 font-bold animate-pulse">ALTERAÇÕES PENDENTES DE SALVAMENTO</span>}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 w-full px-4 justify-center">
         <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="flex-1 min-w-[120px] bg-[#0a101f] border border-white/10 text-white font-black uppercase text-[11px] py-4 px-5 rounded-2xl outline-none cursor-pointer hover:border-blue-500/50 transition-all">
           {MONTHS.map((m, i) => <option key={m} value={i} className="bg-[#0a101f]">{m}</option>)}
         </select>
         <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="flex-none w-[100px] bg-[#0a101f] border border-white/10 text-white font-black uppercase text-[11px] py-4 px-5 rounded-2xl outline-none cursor-pointer text-center hover:border-blue-500/50 transition-all">
           {YEARS.map(y => <option key={y} value={y} className="bg-[#0a101f]">{y}</option>)}
         </select>
         <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className="flex-1 min-w-[160px] bg-[#0a101f] border border-white/10 text-white font-black uppercase text-[11px] py-4 px-5 rounded-2xl outline-none cursor-pointer hover:border-blue-500/50 transition-all">
           <option value="all" className="bg-[#0a101f]">TODAS AS TURMAS</option>
           {classes.map(cls => <option key={cls.id} value={cls.id} className="bg-[#0a101f]">{cls.name}</option>)}
         </select>
      </div>

      <div className="w-full px-2 mt-2">
        <div className="bg-[#050510] rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03]">
                  <th className="p-5 text-left text-[10px] font-black uppercase tracking-widest text-white/40 sticky left-0 bg-[#0c1221] z-30 w-52 shadow-xl">ATLETA</th>
                  <th className="p-4 text-center text-[10px] font-black uppercase tracking-widest text-white/40 border-l border-white/5">FALTAS</th>
                  {attendanceDays.map(day => (
                    <th key={day.iso} className="p-3 text-center border-l border-white/5 min-w-[140px] bg-white/[0.01]">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-blue-500 font-black text-2xl leading-none drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]">{day.day}</span>
                        <span className="text-[8px] font-black text-white/30 uppercase mb-2">{day.weekDayName}</span>
                        
                        <div className="flex gap-1.5 justify-center">
                           <button onClick={() => handleMarkAll(day.iso, 'P')} type="button" className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center justify-center text-green-500 hover:bg-green-500 hover:text-white transition-all shadow-md active:scale-90" title="Presente Geral">
                             <div className="scale-[0.55]"><Icons.Check /></div>
                           </button>
                           <button onClick={() => handleMarkAll(day.iso, 'F')} type="button" className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-md active:scale-90" title="Falta Geral">
                             <div className="scale-[0.55]"><Icons.X /></div>
                           </button>
                           <button onClick={() => handleExportDay(day.iso, 'share')} type="button" className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400 hover:bg-blue-600 hover:text-white transition-all shadow-md active:scale-90" title="Compartilhar">
                             <div className="scale-[0.55]"><Icons.Share /></div>
                           </button>
                           <button onClick={() => handleMarkAll(day.iso, null)} type="button" className="w-8 h-8 rounded-lg bg-white/5 border border-white/20 flex items-center justify-center text-white/40 hover:bg-white/20 hover:text-white transition-all shadow-md active:scale-90" title="Limpar Tudo no Dia">
                             <div className="scale-[0.55]"><Icons.RotateCcw /></div>
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
                    <tr key={student.id} className="hover:bg-white/[0.02] group transition-colors">
                      <td className="p-5 font-black uppercase sticky left-0 bg-[#050510] z-20 border-r border-white/5">
                        <div className="flex flex-col">
                          <span className="text-[11px] text-white tracking-tight leading-tight group-hover:text-blue-400 transition-colors">{student.name}</span>
                          <span className="text-[8px] text-white/30 font-bold mt-1 tracking-widest">{classes.find(c => c.id === student.classId)?.name || 'S/ TURMA'}</span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center">
                          {abs > 0 ? (
                            <div className="w-8 h-8 rounded-full flex items-center justify-center border border-red-600/50 text-red-500 bg-red-600/10 font-black text-[11px] shadow-sm">
                              {abs}
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full border border-white/5"></div>
                          )}
                        </div>
                      </td>
                      {attendanceDays.map(day => {
                        const locked = isLocked(student, day.iso);
                        return (
                          <td key={day.iso} className="p-2 text-center border-l border-white/5">
                            <button onClick={() => toggleStatus(student, day.iso, locked)} type="button" className="block mx-auto outline-none">
                              {renderStatusIcon(student, day.iso, locked)}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t border-white/10 bg-white/[0.03]">
                <tr>
                   <td colSpan={2} className="p-5 text-right text-[9px] font-black uppercase text-blue-400 tracking-widest sticky left-0 bg-[#0c1221] z-20 shadow-xl">PRESENÇAS NO DIA</td>
                   {attendanceDays.map(day => (
                     <td key={day.iso} className="p-4 text-center border-l border-white/5">
                        <span className="text-white font-black text-base drop-shadow-md">{getDayAttendanceCount(day.iso)}</span>
                     </td>
                   ))}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* BOTÃO SALVAR FIXO NO FINAL */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 z-[90] animate-in slide-in-from-bottom-10">
          <button 
            onClick={handleSaveToCloud}
            disabled={isSavingAll}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-6 rounded-[2rem] shadow-[0_20px_50px_rgba(37,99,235,0.4)] border-b-8 border-blue-900 flex items-center justify-center gap-4 group transition-all active:scale-95 active:border-b-0 uppercase tracking-widest italic"
          >
            {isSavingAll ? (
              <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <Icons.CheckCircle />
                <span>Salvar Alterações na Nuvem</span>
              </>
            )}
          </button>
        </div>
      )}

      {justifyingCell && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-6">
           <div className="bg-[#0a101f] w-full max-w-sm rounded-[2.5rem] p-10 border border-white/10 shadow-2xl animate-in zoom-in duration-200">
              <h3 className="text-xl font-black uppercase text-white mb-8 text-center italic tracking-tight">Justificar: {justifyingCell.studentName}</h3>
              <textarea autoFocus placeholder="MOTIVO DA FALTA..." className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none h-32 mb-8 focus:border-blue-500/50 text-xs resize-none uppercase tracking-wider" value={tempNote} onChange={e => setTempNote(e.target.value)} />
              <div className="flex gap-4">
                <button onClick={() => setJustifyingCell(null)} type="button" className="flex-1 bg-white/5 text-white/40 font-black py-5 rounded-2xl uppercase text-[10px] hover:text-white transition-all">SAIR</button>
                <button onClick={() => {
                  const key = `${justifyingCell.studentId}_${justifyingCell.isoDate}`;
                  setDraftAttendance(prev => ({ ...prev, [key]: { status: 'J', note: tempNote } }));
                  setJustifyingCell(null);
                }} type="button" className="flex-1 bg-blue-600 text-white font-black py-5 rounded-2xl uppercase text-[10px] shadow-lg hover:bg-blue-500 transition-all">CONFIRMAR</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
export default FrequenciaLista;
