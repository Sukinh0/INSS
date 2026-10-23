import type { Attempt } from '../types';
import type { CozyProgress } from './cozy';

/**
 * Um dia de estudo segue o calendário de São Paulo (não a meia-noite UTC
 * nem o fuso configurado pelo aparelho). Assim a mesma conta tem o mesmo
 * histórico em dispositivos diferentes.
 */
export const STUDY_TIME_ZONE = 'America/Sao_Paulo';
const formatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: STUDY_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit'
});

export type StreakDay = { date: string; label: string; studied: boolean; today: boolean };
export type StudyStreak = {
  current: number;
  best: number;
  totalDays: number;
  studiedToday: boolean;
  days: StreakDay[];
  nextMilestone: number;
  latestDate?: string;
};

export function dayKey(value: Date | string | number): string | null {
  const d = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(d.getTime())) return null;
  const components = formatter.formatToParts(d);
  const part = (name: string) => components.find(x => x.type === name)?.value;
  const y = part('year'), m = part('month'), day = part('day');
  return y && m && day ? `${y}-${m}-${day}` : null;
}

export function shiftDay(key: string, days: number): string {
  const [year, month, date] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month-1, date + days)).toISOString().slice(0, 10);
}
const milestones = [3,7,14,30,60,100,180,365];

/** Registros concretos de aprendizagem. Apenas abrir o app não conta. */
export function computeStudyStreak(attempts: Attempt[], cozy: CozyProgress, now: Date = new Date()): StudyStreak {
  const today = dayKey(now)!;
  const study = new Set<string>();
  const remember = (value: string) => {
    const timestamp = Date.parse(value);
    if (!Number.isFinite(timestamp) || timestamp > now.getTime() + 60_000) return;
    const date = dayKey(timestamp);
    if (date && date <= today) study.add(date);
  };
  for (const attempt of attempts) {
    // Um simulado precisa ter sido finalizado. Erros e nota negativa também contam.
    if (attempt.finishedAt && Array.isArray(attempt.snapshots) && attempt.snapshots.length) remember(attempt.finishedAt);
  }
  for (const event of cozy.events) {
    // Girassol: microaula concluída (petal) ou sessão concluída;
    // Cartinhas: cartão estudado + avaliação conhecida/revisar.
    if ((event.kind === 'petal' || event.kind === 'session' || (event.kind === 'card' && (event.rating === 'known' || event.rating === 'review')))) remember(event.at);
  }
  const sorted = [...study].sort();
  const studiedToday = study.has(today);
  const yesterday = shiftDay(today, -1);
  let cursor = studiedToday ? today : yesterday;
  let current = 0;
  while (study.has(cursor)) {
    current++;
    cursor = shiftDay(cursor, -1);
  }
  let best = 0, run = 0, last: string | undefined;
  for (const date of sorted) {
    run = last && shiftDay(last,1) === date ? run+1 : 1;
    best = Math.max(best, run);
    last = date;
  }
  const days = Array.from({length:7}, (_,i) => {
    const date=shiftDay(today,i-6);
    const d=new Date(`${date}T12:00:00Z`);
    const label = new Intl.DateTimeFormat('pt-BR',{weekday:'short',timeZone:'UTC'}).format(d).replace('.','');
    return {date,label,studied:study.has(date),today:date===today};
  });
  return {
    current,best,totalDays:study.size,studiedToday,days,
    nextMilestone: milestones.find(m=>m>current) ?? Math.ceil((current+1)/100)*100,
    latestDate:sorted.at(-1)
  };
}

export function streakMessage(streak: StudyStreak): string {
  if (!streak.totalDays) return 'Sua primeira sementinha começa com um pequeno estudo. 🌱';
  if (streak.studiedToday && streak.current === 1) return 'Hoje você plantou sua sementinha. Que bom te ver por aqui! 🌱';
  if (streak.studiedToday) return `${streak.current} dias cultivando conhecimento. Seu girassol está feliz! 🌻`;
  if (streak.current) return 'Sua sequência continua! Um pequeno estudo hoje mantém a flor crescendo. 💛';
  return 'Seu jardim continua aqui. Recomeçar também faz parte do crescimento. 🌱';
}
