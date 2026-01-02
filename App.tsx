
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
    birthDate: db.birth_date,
    registrationDate: db.registration_date,
    deactivationDate: db.deactivation_date,
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
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const fetchData = async () => {
    try {
      const [clsRes, stdRes, attRes] = await Promise.all([
        supabase.from('classes').select('*'),
        supabase.from('students').select('*'),
        supabase.from('attendance').select('*')
      ]);

      if (clsRes.data) setClasses(clsRes.data.map(mapClassFromDB));
      if (stdRes.data) setStudents(stdRes.data.map(mapStudentFromDB));
      
      if (attRes.data) {
        const normalized = attRes.data.map(a => ({
          ...a,
          attendance_date: a.attendance_date.includes('T') ? a.attendance_date.split('T')[0] : a.attendance_date
        }));
        setAttendance(normalized);
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    }
  };

  const syncAttendance = async (studentId: string, date: string, status: string | null, note: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const currentUid = session?.user?.id || userId;

    if (!currentUid) return;

    const previousAttendance = [...attendance];
    
    setAttendance(prev => {
      const filtered = prev.filter(a => !(a.student_id === studentId && a.attendance_date === date));
      if (!status) return filtered;
      return [...filtered, { student_id: studentId, attendance_date: date, status, note }];
    });

    try {
      if (!status) {
        await supabase.from('attendance').delete().match({ student_id: studentId, attendance_date: date });
      } else {
        await supabase.from('attendance').upsert({
          student_id: studentId,
          attendance_date: date,
          status,
          note: note || '',
          user_id: currentUid
        }, { onConflict: 'student_id,attendance_date' });
      }
    } catch (err: any) {
      setAttendance(previousAttendance);
      console.error("Erro sync individual:", err);
    }
  };

  const syncBatchAttendance = async (updates: { studentId: string, date: string, status: string | null, note: string }[]) => {
    const { data: { session } } = await supabase.auth.getSession();
    const currentUid = session?.user?.id || userId;

    if (!currentUid || updates.length === 0) return;

    const previousAttendance = [...attendance];

    // ATUALIZAÇÃO OTIMISTA: Remove o que já existe nessas datas para esses alunos e insere os novos estados
    setAttendance(prev => {
      const updatedKeys = new Set(updates.map(u => `${u.studentId}-${u.date}`));
      const filtered = prev.filter(a => !updatedKeys.has(`${a.student_id}-${a.attendance_date}`));
      
      const newEntries = updates
        .filter(u => u.status)
        .map(u => ({
          student_id: u.studentId,
          attendance_date: u.date,
          status: u.status,
          note: u.note
        }));
        
      return [...filtered, ...newEntries];
    });

    try {
      const toUpsert = updates.filter(u => u.status).map(u => ({
        student_id: u.studentId,
        attendance_date: u.date,
        status: u.status,
        note: u.note || '',
        user_id: currentUid
      }));

      if (toUpsert.length > 0) {
        // Enviar para o Supabase em lote usando a constraint correta
        const { error } = await supabase
          .from('attendance')
          .upsert(toUpsert, { onConflict: 'student_id,attendance_date' });
        
        if (error) throw error;
      }

      // Recarregar para garantir sincronia total
      await fetchData();
    } catch (err: any) {
      console.error("Erro no batch sync:", err);
      setAttendance(previousAttendance);
      alert("ERRO AO SALVAR EM LOTE: " + (err.message || "Erro de conexão"));
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const navigateTo = (page: Page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-tsunami flex items-center justify-center text-white font-black uppercase tracking-widest opacity-40">
        Iniciando Sistema...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <Layout>
      <div className="w-full flex justify-between items-center mb-6 px-4 py-2 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-sm">
        <div className="flex items-center gap-3">
           <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]"></div>
           <span className="text-[10px] font-black uppercase text-white/60 tracking-widest">{userEmail}</span>
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
      {currentPage === Page.ALERTA_FALTAS && (
        <AlertaFaltas 
          onBack={() => navigateTo(Page.DASHBOARD)} 
          students={students} 
          setStudents={fetchData} 
          classes={enrichedClasses}
          attendance={attendance}
        />
      )}
    </Layout>
  );
};

export default App;
