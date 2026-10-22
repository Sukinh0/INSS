export type Answer = 'A' | 'B' | 'C' | 'D' | 'E';
export type Selection = Answer | null;
export type GradeMode = 'normal' | 'cebraspe';
export type Question = {
  id: string;
  subject: string;
  topic: string;
  statement: string;
  correct: Answer;
  options?: string[]; // Se presente, questão de múltipla escolha (A–D/E). Sem options, Certo/Errado.
  explanation: string;
  origin: string;
  sourceUrl?: string;
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
