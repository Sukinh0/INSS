export type Answer = 'A' | 'B' | 'C' | 'D' | 'E';
export type Selection = Answer | null;
export type GradeMode = 'normal' | 'cebraspe';

export type OriginKind = 'official' | 'authorial' | 'unverified';
export type Verification = 'verified' | 'pending';
export type PublicationStatus = 'active' | 'annulled' | 'outdated' | 'under_review';
export type OriginFilter = 'authorial' | 'official' | 'mixed' | 'all';

export type SourceInfo = {
  kind: OriginKind;
  verification: Verification;
  label: string; // ex.: "Autoral • estilo Cebraspe" ou "INSS 2022 • Cebraspe"
  author?: string; // ex.: "Gerada por IA, revisada para treino"
  organizer?: string; // ex.: "Cebraspe"
  institution?: string; // ex.: "INSS"
  job?: string; // ex.: "Técnico do Seguro Social"
  examYear?: number;
  applicationDate?: string; // YYYY-MM-DD
  examId?: string; // identifica a aplicação
  bookletCode?: string; // código exato do caderno
  itemNumber?: number; // número do item no caderno
  questionPaperUrl?: string; // URL HTTPS de fonte primária
  definitiveKeyUrl?: string; // URL HTTPS de gabarito definitivo
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNote?: string;
};

export type Question = {
  id: string;
  subject: string;
  topic: string;
  statement: string;
  correct: Answer | null; // null SOMENTE para itens anulados ou sem gabarito pontuável
  options?: string[]; // Se presente, questão de múltipla escolha (A–D/E). Sem options, Certo/Errado.
  explanation: string;
  origin?: string; // compatibilidade legada
  sourceUrl?: string; // compatibilidade legada
  source: SourceInfo;
  status: PublicationStatus;
  officialAnswer?: 'C' | 'E' | 'X'; // X para itens anulados em gabarito definitivo
  contextId?: string; // enunciado dependente de texto ou tabela compartilhada
};

export type QuizQuestion = Question & {
  correct: Answer;
  status: 'active';
};

export type Profile = { id: string; name: string; photo?: string; createdAt: string; cloud?: boolean };

export type Attempt = {
  id: string;
  profileId: string;
  profileName: string;
  startedAt: string;
  finishedAt: string;
  elapsedSeconds: number;
  gradeMode: GradeMode;
  originFilter?: OriginFilter;
  questionIds: string[];
  snapshots: Question[];
  answers: Record<string, Selection>;
  subjects: string[];
  correct: number;
  wrong: number;
  blank: number;
  score: number;
  accuracy: number;
};

export type ActiveQuiz = {
  profileId: string;
  startedAt: string;
  gradeMode: GradeMode;
  originFilter?: OriginFilter;
  snapshots: Question[];
  answers: Record<string, Selection>;
  current: number;
};

export type ProfileStats = {
  profileId: string;
  profileName: string;
  photo?: string;
  totalCorrect: number;
  totalAnswered: number;
  attempts: number;
  totalQuestions: number;
  bestAccuracy: number;
  accuracy: number;
  points: number;
  lastAt: string;
};

