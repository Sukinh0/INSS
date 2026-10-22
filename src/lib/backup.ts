import { calculateResult } from './engine';
import { parseQuestions } from './import';
import { normalizeQuestion } from './origin';
import type { ActiveQuiz, Attempt, GradeMode, OriginFilter, Question, Selection } from '../types';

export type BackupContent = { attempts: Attempt[]; custom: Question[] };

/** Backup importado nunca altera a conta ativa nem confia em notas declaradas pelo arquivo. */
export function parseBackup(raw: string, targetProfileId: string, targetName: string): BackupContent {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error('Backup inválido: não é um JSON válido.'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Backup inválido.');
  const data = value as Record<string, unknown>;
  if (data.app !== 'Rumo ao INSS' || (data.version !== 1 && data.version !== 2) || !Array.isArray(data.attempts) || !Array.isArray(data.custom)) {
    throw new Error('Arquivo não é um backup reconhecido do Rumo ao INSS.');
  }
  if (data.attempts.length > 1000 || data.custom.length > 400) throw new Error('Backup ultrapassa os limites de importação.');
  const custom = data.custom.length ? parseQuestions(JSON.stringify(data.custom), 'backup.json') : [];
  const seen = new Set<string>();
  const attempts = data.attempts.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error(`Simulado ${index + 1}: formato inválido.`);
    const entry = item as Record<string, unknown>;
    if (!Array.isArray(entry.snapshots) || !entry.snapshots.length || entry.snapshots.length > 400) throw new Error(`Simulado ${index + 1}: questões inválidas.`);
    const parsedSnapshots = parseQuestions(JSON.stringify(entry.snapshots),'backup.json');
    const snapshots = parsedSnapshots.map(normalizeQuestion);
    if (!entry.answers || typeof entry.answers !== 'object' || Array.isArray(entry.answers)) throw new Error(`Simulado ${index + 1}: respostas inválidas.`);
    const savedAnswers = entry.answers as Record<string, unknown>;
    const answers: Record<string, Selection> = {};
    for (const q of snapshots) {
      const answer = savedAnswers[q.id];
      if (answer !== null && answer !== undefined && !(q.options?.length ? 'ABCDE'.slice(0,q.options.length).includes(String(answer)) : answer === 'C' || answer === 'E')) throw new Error(`Simulado ${index + 1}: resposta inválida.`);
      answers[q.id] = (answer ?? null) as Selection;
    }
    const startedAt = String(entry.startedAt ?? '');
    const finishedAt = String(entry.finishedAt ?? '');
    const start = Date.parse(startedAt), finish = Date.parse(finishedAt);
    if (!Number.isFinite(start) || !Number.isFinite(finish) || finish < start || finish > Date.now() + 86_400_000) throw new Error(`Simulado ${index + 1}: datas inválidas.`);
    const gradeMode: GradeMode = entry.gradeMode === 'cebraspe' ? 'cebraspe' : 'normal';
    const originFilter: OriginFilter | undefined = (entry.originFilter === 'official' || entry.originFilter === 'authorial' || entry.originFilter === 'mixed' || entry.originFilter === 'all')
      ? entry.originFilter
      : undefined;
    const exerciseFormat = entry.exerciseFormat === 'alternatives' ? 'alternatives' : 'ce';
    const quiz: ActiveQuiz = { profileId: targetProfileId, startedAt, gradeMode: exerciseFormat === 'alternatives' ? 'normal' : gradeMode, exerciseFormat, originFilter, snapshots, answers, current: 0 };
    const calculated = calculateResult(quiz, finishedAt);
    const originalId = typeof entry.id === 'string' && entry.id.length < 120 && entry.id.trim() ? entry.id : crypto.randomUUID();
    const uniqueId = seen.has(originalId) ? crypto.randomUUID() : originalId;
    seen.add(uniqueId);
    return { ...calculated, id: uniqueId, profileId: targetProfileId, profileName: targetName, originFilter };
  });
  return { attempts, custom };
}
