import type { ActiveQuiz, Answer, Attempt, GradeMode, ProfileStats, Question, Selection } from '../types';

export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function pickQuestions(pool: Question[], count: number, subjects: string[], random: () => number = Math.random): Question[] {
  const filtered = pool.filter(q => !subjects.length || subjects.includes(q.subject));
  const deduplicated = [...new Map(filtered.map(q => [q.id, q])).values()];
  return shuffle(deduplicated, random).slice(0, Math.max(0, Math.floor(count)));
}

export function calculateResult(quiz: ActiveQuiz, now: string): Attempt {
  let correct = 0, wrong = 0, blank = 0;
  for (const q of quiz.snapshots) {
    const answer = quiz.answers[q.id] ?? null;
    if (!answer) blank++;
    else if (q.correct === answer) correct++;
    else wrong++;
  }
  const dateDelta = Math.max(0, (Date.parse(now) - Date.parse(quiz.startedAt)) / 1000);
  return {
    id: crypto.randomUUID(), profileId: quiz.profileId, profileName: '',
    startedAt: quiz.startedAt, finishedAt: now, elapsedSeconds: Math.round(dateDelta),
    gradeMode: quiz.gradeMode, questionIds: quiz.snapshots.map(q => q.id),
    snapshots: quiz.snapshots, answers: quiz.answers,
    subjects: [...new Set(quiz.snapshots.map(q => q.subject))],
    correct, wrong, blank,
    score: quiz.gradeMode === 'cebraspe' ? correct - wrong : correct,
    accuracy: quiz.snapshots.length ? Math.round((10000 * correct) / quiz.snapshots.length) / 100 : 0
  };
}

export function subjectBreakdown(attempts: Attempt[]) {
  const data = new Map<string, {subject: string, correct: number, wrong: number, blank: number, total: number, accuracy: number}>();
  for (const attempt of attempts) for (const q of attempt.snapshots) {
    const record = data.get(q.subject) ?? { subject: q.subject, correct: 0, wrong: 0, blank: 0, total: 0, accuracy: 0 };
    const answer = attempt.answers[q.id];
    record.total++;
    if (!answer) record.blank++;
    else if (answer === q.correct) record.correct++;
    else record.wrong++;
    record.accuracy = Math.round((record.correct * 100) / record.total);
    data.set(q.subject, record);
  }
  return [...data.values()].sort((a, b) => a.accuracy - b.accuracy || b.total - a.total);
}

export function topicBreakdown(attempts: Attempt[]) {
  const data = new Map<string, {topic: string, subject: string, correct: number, wrong: number, blank: number, total: number, accuracy: number}>();
  for (const attempt of attempts) for (const q of attempt.snapshots) {
    const key = `${q.subject}||${q.topic}`;
    const record = data.get(key) ?? { topic: q.topic, subject: q.subject, correct: 0, wrong: 0, blank: 0, total: 0, accuracy: 0 };
    const answer = attempt.answers[q.id];
    record.total++;
    if (!answer) record.blank++;
    else if (answer === q.correct) record.correct++;
    else record.wrong++;
    record.accuracy = Math.round((record.correct * 100) / record.total);
    data.set(key, record);
  }
  return [...data.values()].sort((a, b) => a.accuracy - b.accuracy || b.total - a.total);
}

export function compileStats(profileId: string, name: string, attempts: Attempt[], photo?: string): ProfileStats {
  const sorted = [...attempts].sort((a,b) => b.finishedAt.localeCompare(a.finishedAt));
  const totalCorrect = attempts.reduce((sum, a) => sum + a.correct, 0);
  const totalAnswered = attempts.reduce((sum, a) => sum + a.correct + a.wrong, 0);
  const totalQuestions = attempts.reduce((sum, a) => sum + a.snapshots.length, 0);
  return {
    profileId, profileName: name, photo, totalCorrect, totalAnswered, totalQuestions,
    attempts: attempts.length,
    bestAccuracy: attempts.length ? Math.max(...attempts.map(a => a.accuracy)) : 0,
    accuracy: totalQuestions ? Math.round(100 * totalCorrect / totalQuestions) : 0,
    points: totalCorrect * 10,
    lastAt: sorted[0]?.finishedAt ?? ''
  };
}

export function getWrongQuestionIds(attempts: Attempt[]): Set<string> {
  const wrong = new Set<string>();
  for (const attempt of [...attempts].sort((a, b) => a.finishedAt.localeCompare(b.finishedAt))) {
    for (const q of attempt.snapshots) {
      const answer: Selection = attempt.answers[q.id] ?? null;
      if (answer === q.correct) wrong.delete(q.id);
      else if (answer && answer !== q.correct) wrong.add(q.id);
    }
  }
  return wrong;
}

export function summarizeMode(mode: GradeMode) { return mode === 'cebraspe' ? 'Cebraspe (+1/−1)' : 'Treino (acertos)'; }
export function formatAnswer(answer: Answer | null | undefined, options?: string[]) {
  if (!answer) return 'Em branco';
  if (options?.length) return `Alternativa ${answer}`;
  return answer === 'C' ? 'Certo' : answer === 'E' ? 'Errado' : 'Em branco';
}
