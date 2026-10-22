import type { ActiveQuiz, Attempt, Profile, Question } from '../types';

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
  saveCustom: (profileId: string, data: Question[]) => put(`inss:custom:${profileId}:v1`, data)
};
