
import React, { useState, useMemo } from 'react';
import { Icons } from '../constants';
import { Class } from '../types';
import { supabase } from '../lib/supabase';

interface TurmasAtivasProps {
  onBack: () => void;
  classes: Class[];
  setClasses: () => Promise<void>;
}

const TurmasAtivas: React.FC<TurmasAtivasProps> = ({ onBack, classes, setClasses }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    batchNames: '',
    category: '',
    startTime: '',
    endTime: '',
    day: '',
    capacity: 25
  });

  const sortedClasses = useMemo(() => {
    return [...classes].sort((a, b) => a.name.trim().localeCompare(b.name.trim(), undefined, { sensitivity: 'base' }));
  }, [classes]);

  const handleOpenModal = (cls?: Class) => {
    if (cls) {
      setEditingClass(cls);
      setIsBatchMode(false);
      setFormData({
        name: cls.name,
        batchNames: '',
        category: cls.category,
        startTime: cls.startTime,
        endTime: cls.endTime,
        day: cls.day,
        capacity: cls.capacity
      });
    } else {
      setEditingClass(null);
      setIsBatchMode(false);
      setFormData({ 
        name: '', 
        batchNames: '', 
        category: '', 
        startTime: '', 
        endTime: '', 
        day: '', 
        capacity: 25 
      });
    }
    setIsModalOpen(true);
  };

  const executeDelete = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('classes').delete().eq('id', id);
      if (error) throw error;
      setConfirmDeleteId(null);
      await setClasses();
    } catch (err: any) {
      alert("ERRO AO EXCLUIR TURMA: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");

      if (isBatchMode) {
        const names = formData.batchNames.split(/[\n,]+/).filter(n => n.trim() !== '');
        const payload = names.map(name => ({
          name: name.trim().toUpperCase(),
          category: formData.category,
          start_time: formData.startTime,
          end_time: formData.endTime,
          day: formData.day,
          capacity: formData.capacity,
          user_id: session.user.id
        }));
        const { error } = await supabase.from('classes').insert(payload);
        if (error) throw error;
      } else {
        const payload: any = {
          name: formData.name.toUpperCase(),
          category: formData.category,
          start_time: formData.startTime,
          end_time: formData.endTime,
          day: formData.day,
          capacity: formData.capacity,
          user_id: session.user.id
        };

        if (editingClass) {
          const { error } = await supabase.from('classes').update(payload).eq('id', editingClass.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('classes').insert([payload]);
          if (error) throw error;
        }
      }
      setIsModalOpen(false);
      await setClasses();
    } catch (err: any) {
      alert("ERRO AO SALVAR TURMA: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-6xl flex flex-col p-4 md:p-8 gap-6 md:gap-8 mt-12 md:mt-0">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
        <div className="flex items-center gap-4 md:gap-6">
          <button onClick={onBack} className="bg-white/10 hover:bg-white/20 p-3 md:p-4 rounded-2xl transition-all border border-white/5 active:scale-90"><Icons.Back /></button>
          <div className="bg-white text-[#002244] rounded-2xl px-6 md:px-10 py-3 md:py-5 flex items-center gap-3 md:gap-5 shadow-2xl border-b-4 md:border-b-8 border-blue-400">
             <div className="scale-100 md:scale-125"><Icons.Users /></div>
             <span className="font-black text-xl md:text-3xl uppercase tracking-tighter">Turmas Ativas</span>
          </div>
        </div>
        <button onClick={() => handleOpenModal()} className="w-full md:w-auto bg-blue-500 hover:bg-blue-400 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 text-sm md:text-base">Gerenciar Turmas +</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 md:gap-6 pb-20 md:pb-0">
        {sortedClasses.map((cls) => (
          <div key={cls.id} className={`bg-gradient-to-r from-[#003366] to-[#001122] rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 border shadow-xl flex flex-col gap-4 md:gap-6 group relative overflow-hidden transition-all duration-300 ${confirmDeleteId === cls.id ? 'border-red-500 scale-[0.98]' : 'border-white/10'}`}>
            {confirmDeleteId === cls.id && (
              <div className="absolute inset-0 z-10 bg-red-600/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
                <span className="text-white font-black uppercase tracking-tighter text-xl mb-4">EXCLUIR ESTA TURMA?</span>
                <div className="flex gap-4 w-full">
                  <button onClick={() => setConfirmDeleteId(null)} className="flex-1 bg-white text-red-600 font-black py-3 rounded-xl uppercase text-xs">Não</button>
                  <button onClick={() => executeDelete(cls.id)} disabled={loading} className="flex-1 bg-black text-white font-black py-3 rounded-xl uppercase text-xs">Sim, Excluir</button>
                </div>
              </div>
            )}
            <div className="flex justify-between items-start">
              <div className="flex flex-col">
                <span className="text-3xl md:text-5xl font-black text-white italic tracking-tighter leading-none">{cls.name}</span>
                <span className="text-blue-400 font-bold uppercase tracking-widest text-[10px] md:text-sm mt-1">{cls.category}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleOpenModal(cls)} className="bg-white/10 hover:bg-blue-500 p-2 md:p-3 rounded-xl transition-all active:scale-90"><Icons.Calendar /></button>
                <button onClick={() => setConfirmDeleteId(cls.id)} className="bg-white/10 hover:bg-red-600 p-2 md:p-3 rounded-xl transition-all text-white/50 hover:text-white active:scale-90"><Icons.X /></button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 md:gap-4 border-t border-white/5 pt-4 md:pt-6">
              <div className="flex flex-col">
                <span className="text-white/40 text-[8px] md:text-[10px] uppercase font-black tracking-widest">Dia</span>
                <span className="text-white font-bold text-[10px] md:text-sm truncate">{cls.day}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-white/40 text-[8px] md:text-[10px] uppercase font-black tracking-widest">Horário</span>
                <span className="text-white font-bold text-[10px] md:text-sm">{cls.startTime} - {cls.endTime}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-white/40 text-[8px] md:text-[10px] uppercase font-black tracking-widest">Alunos</span>
                <span className="text-white font-bold text-[10px] md:text-sm">{cls.studentCount}/{cls.capacity}</span>
              </div>
            </div>
            <div className="w-full bg-white/5 h-1.5 md:h-2 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min((cls.studentCount / cls.capacity) * 100, 100)}%` }} />
            </div>
          </div>
        ))}
        {sortedClasses.length === 0 && (
          <div className="col-span-full py-20 text-center opacity-30 font-black uppercase tracking-[0.5em]">Nenhuma turma encontrada</div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#002244] w-full max-w-lg rounded-t-[2rem] md:rounded-[2.5rem] p-6 md:p-10 border-t md:border border-white/10 shadow-2xl animate-in slide-in-from-bottom md:zoom-in duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl md:text-3xl font-black uppercase text-white tracking-tighter">{editingClass ? 'Editar' : 'Nova Turma'}</h3>
              {!editingClass && (
                <div className="flex bg-black/30 p-1 rounded-xl">
                  <button type="button" onClick={() => setIsBatchMode(false)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase ${!isBatchMode ? 'bg-blue-500 text-white' : 'text-white/40'}`}>Unic.</button>
                  <button type="button" onClick={() => setIsBatchMode(true)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase ${isBatchMode ? 'bg-blue-500 text-white' : 'text-white/40'}`}>Lote</button>
                </div>
              )}
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {isBatchMode ? (
                <textarea required placeholder="SUB-07, SUB-09, SUB-11" className="bg-white/5 border border-white/10 rounded-xl p-4 font-bold uppercase focus:border-blue-500 outline-none h-24 resize-none text-sm text-white" value={formData.batchNames} onChange={e => setFormData({...formData, batchNames: e.target.value})} />
              ) : (
                <input required type="text" placeholder="Nome da Turma" className="bg-white/5 border border-white/10 rounded-xl p-4 font-bold uppercase focus:border-blue-500 outline-none text-sm text-white" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              )}
              <input required type="text" placeholder="Categoria" className="bg-white/5 border border-white/10 rounded-xl p-4 font-bold uppercase focus:border-blue-500 outline-none text-sm text-white" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
              <input required type="text" placeholder="Dias (Ex: SEG/QUA)" className="bg-white/5 border border-white/10 rounded-xl p-4 font-bold uppercase focus:border-blue-500 outline-none text-sm text-white" value={formData.day} onChange={e => setFormData({...formData, day: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <input required type="time" className="bg-white/5 border border-white/10 rounded-xl p-4 font-bold text-white text-sm" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
                <input required type="time" className="bg-white/5 border border-white/10 rounded-xl p-4 font-bold text-white text-sm" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} />
              </div>
              <input required type="number" placeholder="Capacidade" className="bg-white/5 border border-white/10 rounded-xl p-4 font-bold text-white text-sm" value={formData.capacity} onChange={e => setFormData({...formData, capacity: parseInt(e.target.value) || 0})} />
              <div className="flex gap-4 mt-4 pb-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-white/5 text-white font-black py-4 rounded-xl uppercase text-xs">Cancelar</button>
                <button type="submit" disabled={loading} className="flex-1 bg-blue-500 text-white font-black py-4 rounded-xl uppercase text-xs flex items-center justify-center">
                  {loading ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TurmasAtivas;
