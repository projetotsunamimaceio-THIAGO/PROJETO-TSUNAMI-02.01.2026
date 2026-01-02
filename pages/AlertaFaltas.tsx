
import React, { useMemo, useState } from 'react';
import { Icons } from '../constants';
import { Student, Class } from '../types';
import { supabase } from '../lib/supabase';

interface AlertaFaltasProps {
  onBack: () => void;
  students: Student[];
  setStudents: () => Promise<void>;
  classes: Class[];
  attendance: any[];
}

const MONTHS = [
  "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO",
  "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"
];

const AlertaFaltas: React.FC<AlertaFaltasProps> = ({ onBack, students, setStudents, classes, attendance }) => {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [reactivatingStudent, setReactivatingStudent] = useState<Student | null>(null);
  const [deactivatingDate, setDeactivatingDate] = useState(new Date().toISOString().split('T')[0]);
  const [newRegistrationDate, setNewRegistrationDate] = useState(new Date().toISOString().split('T')[0]);
  const [confirmingDeactivateId, setConfirmingDeactivateId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Calcula as faltas em tempo real usando o array de attendance vindo do Supabase
  const realTimeAbsences = useMemo(() => {
    const absenceCounts: Record<string, number> = {};

    students.forEach(student => {
      if (student.status !== 'ativo') return;
      
      const studentAbsences = attendance.filter(a => 
        a.student_id === student.id && 
        (a.status === 'F' || a.status === 'J') &&
        (a.attendance_date >= student.registrationDate)
      );

      absenceCounts[student.id] = studentAbsences.length;
    });

    return absenceCounts;
  }, [students, attendance]);

  const alerts = useMemo(() => {
    return students
      .filter(s => s.status === 'ativo' && (realTimeAbsences[s.id] || 0) > 0)
      .map(s => ({ ...s, currentAbsences: realTimeAbsences[s.id] || 0 }))
      .sort((a, b) => b.currentAbsences - a.currentAbsences);
  }, [students, realTimeAbsences]);

  const inactives = useMemo(() => {
    return students
      .filter(s => s.status === 'inativo')
      .sort((a, b) => (b.deactivationDate || '').localeCompare(a.deactivationDate || ''));
  }, [students]);

  const executeDeactivate = async (id: string) => {
    setLoading(true);
    try {
      // Atualiza o status do aluno no Supabase para inativo
      const { error } = await supabase
        .from('students')
        .update({ 
          status: 'inativo', 
          deactivation_date: deactivatingDate 
        })
        .eq('id', id);
      
      if (error) throw error;
      
      setConfirmingDeactivateId(null);
      await setStudents();
    } catch (err: any) {
      alert("ERRO AO BLOQUEAR ATLETA: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReactivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reactivatingStudent) return;

    setLoading(true);
    try {
      // Libera o aluno e inicia um novo ciclo de frequência no Supabase
      const { error } = await supabase
        .from('students')
        .update({ 
          status: 'ativo', 
          registration_date: newRegistrationDate,
          deactivation_date: null 
        })
        .eq('id', reactivatingStudent.id);
      
      if (error) throw error;

      setReactivatingStudent(null);
      await setStudents();
    } catch (err: any) {
      alert("ERRO AO LIBERAR ATLETA: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "---";
    return dateStr.split('-').reverse().join('/');
  };

  return (
    <div className="w-full max-w-6xl flex flex-col p-4 md:p-8 gap-8 mt-12 md:mt-0 text-white">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="bg-white/10 p-3 rounded-2xl transition-all active:scale-90"><Icons.Back /></button>
          <div className="bg-[#aa0000] px-8 py-5 rounded-[1.5rem] flex items-center gap-4 shadow-2xl border-b-8 border-red-900">
             <Icons.AlertTriangle />
             <span className="font-black text-2xl uppercase italic">Controle Disciplinar</span>
          </div>
        </div>
        
        <div className="flex bg-[#0a0a1a] border border-white/20 rounded-xl p-1">
           <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="bg-transparent text-white font-black uppercase text-xs px-4 py-2 outline-none">
             {MONTHS.map((m, i) => <option key={m} value={i} className="bg-[#0a0a1a]">{m}</option>)}
           </select>
           <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="bg-transparent text-white font-black text-xs px-4 py-2 outline-none border-l border-white/10">
             {[2024, 2025, 2026].map(y => <option key={y} value={y} className="bg-[#0a0a1a]">{y}</option>)}
           </select>
        </div>
      </div>

      <div className="bg-white/5 rounded-[3rem] border border-white/10 overflow-hidden shadow-2xl">
        <div className="p-8 bg-white/5 border-b border-white/10 flex items-center justify-between">
           <h3 className="text-xl font-black uppercase italic">Monitoramento Global</h3>
           <span className="text-[10px] font-black uppercase tracking-widest text-red-500 opacity-60 italic">Arena + Projeto Unificados</span>
        </div>

        <div className="divide-y divide-white/5">
          {alerts.length > 0 ? alerts.map(student => {
            const isLimit = student.currentAbsences >= 4;
            const isConfirming = confirmingDeactivateId === student.id;
            
            return (
              <div key={student.id} className={`p-8 flex flex-col md:flex-row items-center justify-between gap-8 ${isLimit ? 'bg-red-900/10' : ''}`}>
                <div className="flex items-center gap-8">
                  <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center font-black text-3xl shadow-xl ${isLimit ? 'bg-red-600 text-white animate-pulse' : 'bg-yellow-500 text-black'}`}>
                    {student.currentAbsences}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-black text-xl uppercase tracking-tighter">{student.name}</span>
                    <span className="text-[9px] font-black text-white/20 uppercase mt-1 tracking-widest italic">Ciclo atual desde: {formatDate(student.registrationDate)}</span>
                  </div>
                </div>
                
                <div className="flex gap-3">
                   {isConfirming ? (
                     <div className="flex flex-col md:flex-row gap-3 bg-red-900/40 p-4 rounded-2xl border border-red-500/30 animate-in slide-in-from-right-4">
                        <div className="flex flex-col gap-1">
                           <span className="text-[8px] font-black uppercase text-white/40 px-1">Data</span>
                           <input type="date" className="bg-black/50 border border-white/10 rounded-lg p-2 text-xs font-black outline-none" value={deactivatingDate} onChange={e => setDeactivatingDate(e.target.value)} />
                        </div>
                        <div className="flex gap-2 items-end">
                           <button onClick={() => setConfirmingDeactivateId(null)} className="bg-white/10 px-6 py-2 rounded-xl text-[10px] font-black uppercase">Sair</button>
                           <button onClick={() => executeDeactivate(student.id)} disabled={loading} className="bg-red-600 px-6 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg flex items-center gap-2">
                             {loading && <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
                             Confirmar
                           </button>
                        </div>
                     </div>
                   ) : (
                     <button onClick={() => { setConfirmingDeactivateId(student.id); setDeactivatingDate(new Date().toISOString().split('T')[0]); }} className={`px-10 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest border-b-4 ${isLimit ? 'bg-red-600 border-red-800 hover:brightness-110' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10 transition-all'}`}>
                       Bloquear Atleta
                     </button>
                   )}
                </div>
              </div>
            );
          }) : (
            <div className="p-12 text-center opacity-30 font-black uppercase tracking-[0.3em]">
              Nenhum registro de falta encontrado no ciclo atual
            </div>
          )}
        </div>
      </div>

      {inactives.length > 0 && (
        <div className="bg-black/40 rounded-[3rem] border border-red-500/20 overflow-hidden shadow-2xl">
          <div className="p-8 bg-red-900/10 border-b border-red-500/20">
             <h3 className="text-xl font-black text-red-400 uppercase italic">Arquivo de Suspensos</h3>
          </div>
          <div className="divide-y divide-white/5">
            {inactives.map(student => (
              <div key={student.id} className="p-8 flex flex-col md:flex-row items-center justify-between gap-8 group">
                <div className="flex items-center gap-8 opacity-40 group-hover:opacity-100 transition-opacity">
                   <div className="w-16 h-16 rounded-[1.5rem] bg-white/5 flex items-center justify-center text-red-500">
                     <Icons.X />
                   </div>
                   <div className="flex flex-col">
                      <span className="font-black text-xl uppercase tracking-tighter">{student.name}</span>
                      <span className="text-[9px] font-black text-red-500/50 uppercase tracking-widest">Bloqueado em: {formatDate(student.deactivationDate)}</span>
                   </div>
                </div>
                <button 
                  onClick={() => { setReactivatingStudent(student); setNewRegistrationDate(new Date().toISOString().split('T')[0]); }}
                  className="bg-green-600 hover:bg-green-500 text-white px-10 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl border-b-4 border-green-800 transition-all active:scale-95"
                >
                  Liberar & Iniciar Novo Ciclo
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {reactivatingStudent && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
           <div className="bg-[#050b1a] w-full max-w-md rounded-[3.5rem] border border-white/10 p-12 shadow-2xl animate-in zoom-in duration-200">
              <div className="w-24 h-24 bg-green-500/20 rounded-[2rem] flex items-center justify-center text-green-500 mb-8 mx-auto border border-green-500/30">
                <Icons.CheckCircle />
              </div>
              <h3 className="text-2xl font-black uppercase italic text-white text-center mb-10 tracking-tighter">Ativar: {reactivatingStudent.name}</h3>
              <form onSubmit={handleReactivate} className="flex flex-col gap-8">
                <div className="flex flex-col gap-3">
                   <label className="text-[10px] font-black uppercase text-white/40 tracking-widest px-4">Data da Nova Ativação</label>
                   <input required type="date" className="w-full bg-white/5 border-2 border-white/10 rounded-[1.5rem] p-6 text-white font-black text-center text-lg outline-none focus:border-green-500" value={newRegistrationDate} onChange={e => setNewRegistrationDate(e.target.value)} />
                   <p className="text-[9px] text-white/30 text-center uppercase tracking-widest px-4 italic leading-relaxed">
                     As faltas anteriores a este dia não serão mais contadas no alerta.
                   </p>
                </div>
                <div className="flex gap-4">
                   <button type="button" onClick={() => setReactivatingStudent(null)} className="flex-1 bg-white/5 text-white/60 font-black py-6 rounded-2xl uppercase text-[10px]">Sair</button>
                   <button type="submit" disabled={loading} className="flex-[1.5] bg-green-600 text-white font-black py-6 rounded-2xl uppercase text-[10px] border-b-4 border-green-800 flex items-center justify-center gap-2">
                     {loading && <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
                     Ativar Novo Ciclo
                   </button>
                </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default AlertaFaltas;
