
import React, { useState, useEffect, useMemo } from 'react';
import { Page, Class, Student } from './types';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Relatorios from './pages/Relatorios';
import TurmasAtivas from './pages/TurmasAtivas';
import CadastroAlunos from './pages/CadastroAlunos';
import FrequenciaLista from './pages/FrequenciaLista';
import AlertaFaltas from './pages/AlertaFaltas';
import Login from './pages/Login';
import { supabase } from './lib/supabase';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(Page.DASHBOARD);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const normalizeDate = (dateStr: string | null | undefined) => {
    if (!dateStr || typeof dateStr !== 'string') return '';
    return dateStr.trim().split('T')[0];
  };

  const mapClassFromDB = (db: any): Class => ({
    id: db.id,
    name: db.name,
    category: db.category,
    studentCount: 0,
    startTime: db.start_time || '',
    endTime: db.end_time || '',
    day: db.day || '',
    capacity: db.capacity || 25
  });

  const mapStudentFromDB = (db: any): Student => ({
    id: db.id,
    name: db.name,
    classId: db.class_id,
    absences: 0,
    birthDate: normalizeDate(db.birth_date),
    registrationDate: normalizeDate(db.registration_date),
    deactivationDate: normalizeDate(db.deactivation_date),
    status: db.status || 'ativo'
  });

  const enrichedClasses = useMemo(() => {
    return classes.map(cls => ({
      ...cls,
      studentCount: students.filter(s => s.classId === cls.id && s.status === 'ativo').length
    }));
  }, [classes, students]);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsAuthenticated(true);
        setUserEmail(session.user.email || '');
        setUserId(session.user.id);
      }
      setLoading(false);
    };
    checkUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setIsAuthenticated(true);
        setUserEmail(session.user.email || '');
        setUserId(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setUserEmail('');
        setUserId('');
        setCurrentPage(Page.DASHBOARD);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchData();
  }, [isAuthenticated]);

  const fetchData = async () => {
    try {
      const [clsRes, stdRes, attRes] = await Promise.all([
        supabase.from('classes').select('*'),
        supabase.from('students').select('*'),
        supabase.from('attendance')
          .select('*')
          .order('attendance_date', { ascending: false })
          .limit(10000)
      ]);
      
      if (clsRes.data) setClasses(clsRes.data.map(mapClassFromDB));
      if (stdRes.data) setStudents(stdRes.data.map(mapStudentFromDB));
      if (attRes.data) {
        setAttendance(attRes.data.map(a => ({
          ...a,
          attendance_date: normalizeDate(a.attendance_date)
        })));
      }
    } catch (err) {
      console.error("Erro fetchData:", err);
    }
  };

  const syncAttendance = async (studentId: string, date: string, status: string | null, note: string) => {
    const session = await supabase.auth.getSession();
    const currentUid = session.data.session?.user?.id || userId;
    if (!currentUid) return;

    const normalizedDate = normalizeDate(date);
    const previousState = [...attendance];
    
    // Atualização Local Imediata
    setAttendance(prev => {
      const filtered = prev.filter(a => !(a.student_id === studentId && a.attendance_date === normalizedDate));
      if (!status) return filtered;
      return [...filtered, { student_id: studentId, attendance_date: normalizedDate, status, note }];
    });

    setIsSyncing(true);
    try {
      if (!status) {
        await supabase.from('attendance').delete().match({ student_id: studentId, attendance_date: normalizedDate });
      } else {
        await supabase.from('attendance').upsert({
          student_id: studentId,
          attendance_date: normalizedDate,
          status,
          note: note || '',
          user_id: currentUid
        }, { onConflict: 'student_id,attendance_date' });
      }
    } catch (err) {
      setAttendance(previousState);
      console.error("Erro sync individual:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const syncBatchAttendance = async (updates: { studentId: string, date: string, status: string | null, note: string }[]) => {
    const session = await supabase.auth.getSession();
    const currentUid = session.data.session?.user?.id || userId;
    if (!currentUid || updates.length === 0) return;

    const normalizedDate = normalizeDate(updates[0].date);
    const previousState = [...attendance];

    // Atualização Local Imediata (Crucial para não sumir)
    setAttendance(prev => {
      const studentIdsInUpdate = new Set(updates.map(u => u.studentId));
      const filtered = prev.filter(a => !(a.attendance_date === normalizedDate && studentIdsInUpdate.has(a.student_id)));
      const newEntries = updates
        .filter(u => u.status)
        .map(u => ({
          student_id: u.studentId,
          attendance_date: normalizedDate,
          status: u.status,
          note: u.note
        }));
      return [...filtered, ...newEntries];
    });

    setIsSyncing(true);
    try {
      const toUpsert = updates.filter(u => u.status).map(u => ({
        student_id: u.studentId,
        attendance_date: normalizedDate,
        status: u.status,
        note: u.note || '',
        user_id: currentUid
      }));

      // Executa deleções primeiro se necessário
      const toDeleteIds = updates.filter(u => !u.status).map(u => u.studentId);
      if (toDeleteIds.length > 0) {
        await supabase.from('attendance').delete().match({ attendance_date: normalizedDate }).in('student_id', toDeleteIds);
      }

      if (toUpsert.length > 0) {
        const { error } = await supabase.from('attendance').upsert(toUpsert, { onConflict: 'student_id,attendance_date' });
        if (error) throw error;
      }
      
      // NÃO chamamos fetchData aqui para evitar o bug de 'sumir' por delay de replicação do banco
    } catch (err: any) {
      console.error("Erro batch sync:", err);
      setAttendance(previousState); // Reverte se der erro real
      alert("ERRO AO SALVAR: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); };
  const navigateTo = (page: Page) => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  if (loading) return <div className="min-h-screen bg-tsunami flex items-center justify-center text-white font-black uppercase opacity-40 italic tracking-widest">Iniciando...</div>;
  if (!isAuthenticated) return <Login onLogin={() => setIsAuthenticated(true)} />;

  return (
    <Layout>
      <div className="w-full flex justify-between items-center mb-6 px-4 py-2 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-sm sticky top-2 z-[100]">
        <div className="flex items-center gap-3">
           <div className={`w-2 h-2 rounded-full shadow-[0_0_10px] ${isSyncing ? 'bg-blue-400 shadow-blue-500 animate-pulse' : 'bg-green-500 shadow-green-500'}`}></div>
           <span className="text-[10px] font-black uppercase text-white/60 tracking-widest">
             {isSyncing ? 'SINCRONIZANDO NUVEM...' : userEmail}
           </span>
        </div>
        <button onClick={handleLogout} className="text-[10px] font-black uppercase text-red-500/60 hover:text-red-500 tracking-[0.2em] transition-all bg-red-500/5 px-4 py-2 rounded-xl border border-red-500/10">Sair</button>
      </div>
      {currentPage === Page.DASHBOARD && <Dashboard onNavigate={navigateTo} students={students} attendance={attendance} />}
      {currentPage === Page.RELATORIOS && <Relatorios onBack={() => navigateTo(Page.DASHBOARD)} students={students} classes={enrichedClasses} attendance={attendance} />}
      {currentPage === Page.TURMAS_ATIVAS && <TurmasAtivas classes={enrichedClasses} setClasses={fetchData} onBack={() => navigateTo(Page.DASHBOARD)} />}
      {currentPage === Page.CADASTRO_ALUNOS && <CadastroAlunos students={students} setStudents={fetchData} classes={enrichedClasses} onBack={() => navigateTo(Page.DASHBOARD)} />}
      {(currentPage === Page.FREQUENCIA_ARENA || currentPage === Page.FREQUENCIA_PROJETO) && (
        <FrequenciaLista 
          title={currentPage === Page.FREQUENCIA_ARENA ? "Frequência Arena" : "Frequência Projeto"} 
          students={students} 
          attendance={attendance}
          onSyncAttendance={syncAttendance}
          onSyncBatchAttendance={syncBatchAttendance}
          classes={enrichedClasses}
          onBack={() => navigateTo(Page.DASHBOARD)}
        />
      )}
      {currentPage === Page.ALERTA_FALTAS && <AlertaFaltas onBack={() => navigateTo(Page.DASHBOARD)} students={students} setStudents={fetchData} classes={enrichedClasses} attendance={attendance} />}
    </Layout>
  );
};
export default App;
