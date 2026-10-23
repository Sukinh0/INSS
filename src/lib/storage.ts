import type { ActiveQuiz, Attempt, Profile, Question } from '../types';
import { sanitizeCozy, type CozyProgress, type CozySession } from './cozy';

function get<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; }
  catch { return fallback; }
}
function put<T>(key: string, value: T) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } }
export const storage = {
  profiles: () => get<Profile[]>('inss:profiles:v1', []),
  saveProfiles: (data: Profile[]) => put('inss:profiles:v1', data),
  activeId: () => get<string>('inss:active-id:v1', ''),
  saveActiveId: (id: string) => put('inss:active-id:v1', id),
  attempts: (profileId: string) => get<Attempt[]>(`inss:attempts:${profileId}:v1`, []),
  saveAttempts: (profileId: string, data: Attempt[]) => put(`inss:attempts:${profileId}:v1`, data),
  quiz: (profileId: string) => get<ActiveQuiz | null>(`inss:quiz:${profileId}:v1`, null),
  saveQuiz: (profileId: string, quiz: ActiveQuiz | null) => put(`inss:quiz:${profileId}:v1`, quiz),
  custom: (profileId: string) => get<Question[]>(`inss:custom:${profileId}:v1`, []),
  saveCustom: (profileId: string, data: Question[]) => put(`inss:custom:${profileId}:v1`, data),
  cozy: (profileId: string): CozyProgress => sanitizeCozy(get<unknown>(`inss:cozy:${profileId}:v1`,null)),
  saveCozy: (profileId: string, data: CozyProgress) => put(`inss:cozy:${profileId}:v1`, sanitizeCozy(data)),
  cozySession: (profileId: string): CozySession | null => {
    const value=get<unknown>(`inss:cozy-session:${profileId}:v1`,null);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const s=value as Partial<CozySession>;
    if ((s.mode!=='sunflower' && s.mode!=='cards') || !Array.isArray(s.ids) || !s.ids.length || s.ids.length>20 || !s.ids.every(id=>typeof id==='string' && id.length<200)) return null;
    if (!Number.isInteger(s.index) || (s.index ?? -1)<0 || (s.index ?? 0)>=s.ids.length) return null;
    if (s.mode==='sunflower' && (s.phase!=='learn' && s.phase!=='ask' && s.phase!=='feedback')) return null;
    if (s.mode==='cards' && typeof s.flipped!=='boolean') return null;
    return s as CozySession;
  },
  saveCozySession: (profileId: string, data: CozySession | null) => put(`inss:cozy-session:${profileId}:v1`,data)
};
