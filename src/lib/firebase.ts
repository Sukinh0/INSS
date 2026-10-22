import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged, type User } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, getFirestore, onSnapshot, setDoc } from 'firebase/firestore';
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

export async function loginGoogle() {
  if (!auth) throw new Error('Configure as variáveis do Firebase para entrar com Google.');
  try { await signInWithPopup(auth, provider); }
  catch (err) {
    const code = (err as { code?: string }).code || '';
    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(auth, provider);
    } else throw err;
  }
}
export function watchUser(callback: (user: User | null) => void) {
  if (!auth) return () => {};
  getRedirectResult(auth).catch(console.error);
  return onAuthStateChanged(auth, callback);
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
