
export enum Page {
  DASHBOARD = 'dashboard',
  TURMAS_ATIVAS = 'turmas_ativas',
  CADASTRO_ALUNOS = 'cadastro_alunos',
  ALERTA_FALTAS = 'alerta_faltas',
  FREQUENCIA_ARENA = 'frequencia_arena',
  FREQUENCIA_PROJETO = 'frequencia_projeto',
  RELATORIOS = 'relatorios'
}

export interface Student {
  id: string;
  name: string;
  classId: string;
  absences: number;
  birthDate?: string;
  registrationDate: string;
  deactivationDate?: string;
  status: 'ativo' | 'inativo';
}

export interface Class {
  id: string;
  name: string;
  category: string;
  studentCount: number;
  startTime: string;
  endTime: string;
  day: string;
  capacity: number;
}
