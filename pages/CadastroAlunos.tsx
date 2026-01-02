
import React, { useState, useMemo } from 'react';
import { Icons } from '../constants';
import { Student, Class } from '../types';
import { supabase } from '../lib/supabase';

interface CadastroAlunosProps {
  onBack: () => void;
  students: Student[];
  setStudents: () => Promise<void>; // Agora é uma função de recarregamento
  classes: Class[];
}

const CadastroAlunos: React.FC<CadastroAlunosProps> = ({ onBack, students, setStudents, classes }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    batchNames: '',
    classId: classes[0]?.id || '',
    birthDate: '',
    registrationDate: new Date().toISOString().split('T')[0]
  });

  const filteredStudents = useMemo(() => {
    return students
      .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students, searchTerm]);

  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredStudents.map(s => s.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const executeBulkDelete = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from('students').delete().in('id', Array.from(selectedIds));
      if (error) throw error;
      setSelectedIds(new Set());
      setShowBulkDeleteConfirm(false);
      await setStudents();
    } catch (err: any) {
      alert("ERRO AO EXCLUIR: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const executeSingleDelete = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) throw error;
      setConfirmDeleteId(null);
      await setStudents();
    } catch (err: any) {
      alert("ERRO AO EXCLUIR: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (student?: Student) => {
    if (student) {
      setEditingStudent(student);
      setIsBatchMode(false);
      setFormData({
        name: student.name,
        batchNames: '',
        classId: student.classId,
        birthDate: student.birthDate || '',
        registrationDate: student.registrationDate
      });
    } else {
      setEditingStudent(null);
      setFormData({ 
        name: '', 
        batchNames: '',
        classId: classes[0]?.id || '', 
        birthDate: '', 
        registrationDate: new Date().toISOString().split('T')[0] 
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");

      if (isBatchMode) {
        const names = formData.batchNames.split('\n').filter(n => n.trim() !== '');
        const payload = names.map(name => ({
          name: name.trim().toUpperCase(),
          class_id: formData.classId,
          birth_date: formData.birthDate || null,
          registration_date: formData.registrationDate,
          status: 'ativo',
          user_id: session.user.id
        }));
        const { error } = await supabase.from('students').insert(payload);
        if (error) throw error;
      } else {
        const payload: any = {
          name: formData.name.toUpperCase(),
          class_id: formData.classId,
          birth_date: formData.birthDate || null,
          registration_date: formData.registrationDate,
          status: 'ativo',
          user_id: session.user.id
        };

        if (editingStudent) {
          const { error } = await supabase.from('students').update(payload).eq('id', editingStudent.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('students').insert([payload]);
          if (error) throw error;
        }
      }
      setIsModalOpen(false);
      await setStudents();
    } catch (err: any) {
      alert("ERRO AO SALVAR NO BANCO: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-6xl flex flex-col p-4 md:p-8 gap-6 md:gap-8 mt-12 md:mt-0">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="bg-white/10 hover:bg-white/20 p-3 rounded-2xl transition-all active:scale-90"><Icons.Back /></button>
          <div className="bg-[#4d6ec8] text-white rounded-2xl px-6 py-4 flex items-center gap-4 shadow-xl border-b-4 border-blue-900">
             <Icons.UserPlus />
             <span className="font-black text-xl md:text-2xl uppercase tracking-tighter">Gestão de Alunos</span>
          </div>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 bg-red-600 p-1 rounded-2xl animate-in zoom-in">
              {showBulkDeleteConfirm ? (
                <>
                  <button onClick={() => setShowBulkDeleteConfirm(false)} className="bg-white text-red-600 px-4 py-3 rounded-xl font-black uppercase text-[10px]">Não</button>
                  <button onClick={executeBulkDelete} disabled={loading} className="bg-black text-white px-4 py-3 rounded-xl font-black uppercase text-[10px]">Sim, Apagar {selectedIds.size}</button>
                </>
              ) : (
                <button onClick={() => setShowBulkDeleteConfirm(true)} className="bg-transparent text-white px-6 py-3 rounded-xl font-black uppercase text-xs transition-all">Apagar Selecionados ({selectedIds.size})</button>
              )}
            </div>
          )}
          <button onClick={() => handleOpenModal()} className="flex-1 md:flex-none bg-white text-[#4d6ec8] px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:brightness-110 active:scale-95 transition-all text-xs">Novo Aluno +</button>
        </div>
      </div>

      <div className="relative group">
        <input type="text" placeholder="BUSCAR NOME DO ALUNO..." className="w-full bg-white/5 border-2 border-white/10 rounded-2xl py-5 px-10 text-xl font-bold uppercase tracking-widest focus:outline-none focus:border-blue-400 transition-all placeholder:text-white/20 text-white" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <div className="hidden md:block bg-white/5 backdrop-blur-md rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl">
        <table className="w-full text-left">
          <thead className="bg-white/10 border-b border-white/10">
            <tr>
              <th className="px-6 py-5 w-16"><input type="checkbox" className="w-5 h-5 accent-blue-500 cursor-pointer" checked={selectedIds.size === filteredStudents.length && filteredStudents.length > 0} onChange={handleToggleSelectAll} /></th>
              <th className="px-6 py-5 text-blue-400 font-black uppercase tracking-widest text-xs">Nome Completo</th>
              <th className="px-6 py-5 text-blue-400 font-black uppercase tracking-widest text-xs">Turma</th>
              <th className="px-6 py-5 text-blue-400 font-black uppercase tracking-widest text-xs text-center">Matrícula</th>
              <th className="px-6 py-5 text-blue-400 font-black uppercase tracking-widest text-xs text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredStudents.map((student) => (
              <tr key={student.id} className={`hover:bg-white/5 transition-colors group relative ${selectedIds.has(student.id) ? 'bg-blue-500/10' : ''}`}>
                <td className="px-6 py-5"><input type="checkbox" className="w-5 h-5 accent-blue-500 cursor-pointer" checked={selectedIds.has(student.id)} onChange={() => handleToggleSelect(student.id)} /></td>
                <td className="px-6 py-5 font-bold uppercase text-white">{student.name}</td>
                <td className="px-6 py-5 text-white/70 font-bold"><span className="bg-white/10 px-3 py-1 rounded-full text-[10px] uppercase">{classes.find(c => c.id === student.classId)?.name || 'S/ TURMA'}</span></td>
                <td className="px-6 py-5 text-center font-mono text-xs opacity-60 text-white">{student.registrationDate.split('-').reverse().join('/')}</td>
                <td className="px-6 py-5 text-right relative text-white">
                  {confirmDeleteId === student.id ? (
                    <div className="flex gap-2 justify-end"><button onClick={() => setConfirmDeleteId(null)} className="bg-white/20 px-2 py-1 rounded-lg text-[9px] font-black uppercase">Não</button><button onClick={() => executeSingleDelete(student.id)} className="bg-red-600 px-2 py-1 rounded-lg text-[9px] font-black uppercase">Sim</button></div>
                  ) : (
                    <div className="flex gap-2 justify-end"><button onClick={() => handleOpenModal(student)} className="p-2 hover:bg-blue-500 rounded-lg opacity-40 group-hover:opacity-100"><Icons.Calendar /></button><button onClick={() => setConfirmDeleteId(student.id)} className="p-2 hover:bg-red-600 rounded-lg opacity-40 group-hover:opacity-100"><Icons.X /></button></div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden flex flex-col gap-4 pb-20">
        {filteredStudents.map(student => (
          <div key={student.id} className={`bg-white/5 rounded-3xl p-6 border border-white/10 flex flex-col gap-4 relative ${selectedIds.has(student.id) ? 'border-blue-500/50 bg-blue-500/5' : ''}`}>
             <input type="checkbox" className="absolute top-4 right-4 w-6 h-6 accent-blue-500" checked={selectedIds.has(student.id)} onChange={() => handleToggleSelect(student.id)} />
             <div className="flex flex-col"><h4 className="font-black text-lg uppercase text-white">{student.name}</h4><div className="mt-2 flex gap-2"><span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-[9px] font-black uppercase border border-blue-500/30">{classes.find(c => c.id === student.classId)?.name || 'S/ TURMA'}</span></div></div>
             <div className="flex gap-2 mt-2 pt-4 border-t border-white/5 text-white"><button onClick={() => handleOpenModal(student)} className="flex-1 bg-white/10 py-3 rounded-xl font-black uppercase text-[10px]">Editar</button><button onClick={() => setConfirmDeleteId(student.id)} className="flex-1 bg-red-600/20 text-red-400 py-3 rounded-xl font-black uppercase text-[10px]">Apagar</button></div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1a2e63] w-full max-w-lg rounded-t-[2rem] md:rounded-[2.5rem] p-6 md:p-10 border border-white/10 shadow-2xl">
            <h3 className="text-2xl font-black uppercase text-white mb-8 tracking-tighter">{editingStudent ? 'Editar Aluno' : 'Novo Aluno'}</h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex bg-black/30 p-1 rounded-xl w-fit mb-2">
                <button type="button" onClick={() => setIsBatchMode(false)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase ${!isBatchMode ? 'bg-blue-500 text-white' : 'text-white/40'}`}>Único</button>
                <button type="button" onClick={() => setIsBatchMode(true)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase ${isBatchMode ? 'bg-blue-500 text-white' : 'text-white/40'}`}>Lote</button>
              </div>
              
              {isBatchMode ? (
                <textarea required placeholder="JOÃO DA SILVA, MARIA SOUZA (um por linha)" className="bg-white/5 border border-white/10 rounded-xl p-4 font-bold uppercase focus:border-blue-400 outline-none h-32 text-sm text-white" value={formData.batchNames} onChange={e => setFormData({...formData, batchNames: e.target.value})} />
              ) : (
                <input required type="text" placeholder="Nome Completo" className="bg-white/5 border border-white/10 rounded-xl p-4 font-bold uppercase focus:border-blue-400 outline-none text-white" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[8px] font-black uppercase text-white/30 px-2">Nascimento</label>
                  <input type="date" className="bg-white/5 border border-white/10 rounded-xl p-4 font-bold text-white text-xs" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[8px] font-black uppercase text-white/30 px-2">Matrícula</label>
                  <input required type="date" className="bg-white/5 border border-white/10 rounded-xl p-4 font-bold text-white text-xs" value={formData.registrationDate} onChange={e => setFormData({...formData, registrationDate: e.target.value})} />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[8px] font-black uppercase text-white/30 px-2">Selecionar Turma</label>
                <select required className="bg-white/5 border border-white/10 rounded-xl p-4 font-bold uppercase focus:border-blue-400 outline-none text-white" value={formData.classId} onChange={e => setFormData({...formData, classId: e.target.value})}>
                  {classes.map(cls => <option key={cls.id} value={cls.id} className="bg-[#1a2e63]">{cls.name}</option>)}
                </select>
              </div>
              <div className="flex gap-4 mt-4 pb-8">
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

export default CadastroAlunos;
