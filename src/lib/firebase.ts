import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged, type User } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, getFirestore, onSnapshot, runTransaction, setDoc } from 'firebase/firestore';
import { emptyCozy, mergeCozy, sanitizeCozy, type CozyProgress } from './cozy';
import { emptyNotebook, mergeNotebook, normalizeNotebook, type NotebookData } from './notebook';
import type { Attempt, Profile, ProfileStats, Question } from '../types';

const env = import.meta.env;
export const cloudEnabled = !!(env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_AUTH_DOMAIN && env.VITE_FIREBASE_PROJECT_ID && env.VITE_FIREBASE_APP_ID);
let app: FirebaseApp | null = null;
if (cloudEnabled) {
  app = getApps()[0] ?? initializeApp({
    apiKey: env.VITE_FIREBASE_API_KEY, authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID, appId: env.VITE_FIREBASE_APP_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET, messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID
  });
}
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

export function formatAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code || '';
  const msg = (err as { message?: string })?.message || '';
  if (code === 'auth/unauthorized-domain') {
    const domain = typeof window !== 'undefined' ? window.location.hostname : 'do site';
    return `Domínio "${domain}" não autorizado. Vá em Firebase Console > Authentication > Configurações > Domínios autorizados e adicione "${domain}".`;
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'A janela de login do Google foi fechada antes de concluir.';
  }
  if (code === 'auth/popup-blocked') {
    return 'O pop-up de login foi bloqueado pelo seu navegador. Permita pop-ups para este site.';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Login com Google não está ativado no Firebase Console (Authentication > Método de login).';
  }
  if (code === 'auth/cancelled-popup-request') {
    return 'Tentativa de login cancelada.';
  }
  return msg || 'Erro ao autenticar com o Google.';
}

export async function loginGoogle() {
  if (!auth) throw new Error('Configure as variáveis de ambiente do Firebase para entrar com Google.');
  try {
    const res = await signInWithPopup(auth, provider);
    return res.user;
  } catch (err) {
    const code = (err as { code?: string }).code || '';
    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(auth, provider);
      return null;
    }
    throw err;
  }
}

export function watchUser(callback: (user: User | null) => void, onError?: (err: Error) => void) {
  if (!auth) return () => {};
  getRedirectResult(auth)
    .then(res => {
      if (res?.user) callback(res.user);
    })
    .catch(err => {
      console.error('Redirect result error:', err);
      if (onError) onError(err);
    });
  return onAuthStateChanged(auth, callback, onError);
}
export async function logoutGoogle() { if (auth) await signOut(auth); }
export function toProfile(user: User): Profile {
  return { id: user.uid, name: user.displayName || 'Estudante', photo: user.photoURL || undefined, cloud: true, createdAt: new Date().toISOString() };
}
export async function syncProfile(profile: Profile) {
  if (!db) return;
  await setDoc(doc(db, 'users', profile.id), { name: profile.name, photo: profile.photo || null, updatedAt: new Date().toISOString() }, { merge: true });
}
export async function loadCloudAttempts(userId: string): Promise<Attempt[]> {
  if (!db) return [];
  const docs = await getDocs(collection(db, 'users', userId, 'attempts'));
  return docs.docs.map(d => d.data() as Attempt).sort((a,b) => b.finishedAt.localeCompare(a.finishedAt));
}
export async function saveCloudAttempt(attempt: Attempt) {
  if (!db) return;
  await setDoc(doc(db, 'users', attempt.profileId, 'attempts', attempt.id), attempt);
}
export async function saveLeaderboard(stats: ProfileStats) {
  if (!db) return;
  await setDoc(doc(db, 'leaderboard', stats.profileId), { ...stats, photo: stats.photo || null });
}
export function watchLeaderboard(callback: (items: ProfileStats[]) => void, fail: (e: Error) => void) {
  if (!db) return () => {};
  return onSnapshot(collection(db, 'leaderboard'), snap => callback(snap.docs.map(d => d.data() as ProfileStats)), fail);
}
export async function getCloudCustom(userId: string): Promise<Question[]> {
  if (!db) return [];
  const snap = await getDoc(doc(db, 'users', userId, 'custom', 'bank'));
  return (snap.data()?.questions || []) as Question[];
}
export async function saveCloudCustom(userId: string, questions: Question[]) {
  if (!db) return;
  await setDoc(doc(db, 'users', userId, 'custom', 'bank'), { questions });
}

/** Usa o documento users/{uid} já autorizado nas Firestore Rules atuais. */
export async function getCloudCozy(userId: string): Promise<CozyProgress> {
  if (!db) return emptyCozy();
  const snap = await getDoc(doc(db, 'users', userId));
  return sanitizeCozy(snap.data()?.cozy);
}

/** Mescla eventos em transação para não perder progresso sincronizado em outro dispositivo. */
export async function saveCloudCozy(userId: string, local: CozyProgress): Promise<CozyProgress> {
  if (!db) return sanitizeCozy(local);
  return runTransaction(db, async transaction => {
    const ref = doc(db!, 'users', userId);
    const snap = await transaction.get(ref);
    const merged = mergeCozy(sanitizeCozy(snap.data()?.cozy), local);
    transaction.set(ref, { cozy: merged }, { merge: true });
    return merged;
  });
}

/** Caderninho armazenado dentro de users/{uid}, protegido pelas Rules atuais. */
export async function getCloudNotebook(userId: string):Promise<NotebookData> {
  if(!db) return emptyNotebook();
  const snap=await getDoc(doc(db,'users',userId));
  return normalizeNotebook(snap.data()?.notebook);
}
/** Mescla inclusões/edições/exclusões com tombstones para evitar ressuscitar notas apagadas. */
export async function saveCloudNotebook(userId:string,local:NotebookData):Promise<NotebookData> {
  if(!db) return normalizeNotebook(local);
  return runTransaction(db,async tx=>{
    const ref=doc(db!,'users',userId);
    const snap=await tx.get(ref);
    const merged=mergeNotebook(normalizeNotebook(snap.data()?.notebook),local);
    tx.set(ref,{notebook:merged},{merge:true});
    return merged;
  });
}
