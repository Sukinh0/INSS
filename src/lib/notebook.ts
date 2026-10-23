import type { Question } from '../types';

export type NotebookKind = 'note' | 'question';
export type NotebookQuestionRef = {
  id: string;
  statement: string;
  options?: string[];
  origin: string;
  sourceUrl?: string;
};
export type NotebookEntry = {
  id: string;
  kind: NotebookKind;
  title: string;
  text: string;
  subject: string;
  topic: string;
  studyLater: boolean;
  question?: NotebookQuestionRef;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};
export type NotebookData = { version: 1; entries: NotebookEntry[] };

export const emptyNotebook = (): NotebookData => ({version:1,entries:[]});
export const MAX_NOTEBOOK_ACTIVE = 100;
export const MAX_NOTEBOOK_ENTRIES = 500;
export const NOTEBOOK_BODY_LIMIT = 1500;

const safe=(v:unknown,max:number) => typeof v === 'string' ? v.slice(0,max) : '';
const date=(v:unknown) => typeof v==='string' && Number.isFinite(Date.parse(v)) ? v : null;
const url=(v:unknown) => typeof v==='string' && /^https:\/\//i.test(v) ? v.slice(0,800) : undefined;

export function normalizeNotebook(value:unknown): NotebookData {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return emptyNotebook();
  const entries=(value as {entries?:unknown}).entries;
  if (!Array.isArray(entries)) return emptyNotebook();
  const out=new Map<string,NotebookEntry>();
  for(const raw of entries.slice(-MAX_NOTEBOOK_ENTRIES)) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const item=raw as Partial<NotebookEntry>;
    if ((item.kind !== 'note' && item.kind !== 'question') || !item.id || typeof item.id!=='string' || item.id.length>200) continue;
    const createdAt=date(item.createdAt), updatedAt=date(item.updatedAt), deletedAt=date(item.deletedAt);
    if (!createdAt || !updatedAt) continue;
    const rawQ=item.question;
    const question= item.kind==='question' && rawQ && typeof rawQ==='object' && typeof rawQ.id==='string' && typeof rawQ.statement==='string' && rawQ.id.length<=160
      ? {
        id:safe(rawQ.id,160),
        statement:safe(rawQ.statement,900),
        ...(Array.isArray(rawQ.options) ? {options:rawQ.options.filter((x):x is string=>typeof x==='string').slice(0,5).map(x=>x.slice(0,400))} : {}),
        origin:safe(rawQ.origin,120),
        ...(url(rawQ.sourceUrl) ? {sourceUrl:url(rawQ.sourceUrl)} : {})
      } : undefined;
    if (item.kind==='question' && !question) continue;
    const entry:NotebookEntry={
      id:item.id,kind:item.kind,
      title:safe(item.title,100),text:safe(item.text,NOTEBOOK_BODY_LIMIT),
      subject:safe(item.subject,100),topic:safe(item.topic,100),
      studyLater:item.studyLater===true,createdAt,updatedAt,
      ...(question?{question}:{}),...(deletedAt?{deletedAt}:{})
    };
    const prev=out.get(entry.id);
    if (!prev || newer(entry,prev)===entry) out.set(entry.id,entry);
  }
  return {version:1,entries:[...out.values()].sort((a,b)=>a.createdAt.localeCompare(b.createdAt)).slice(-MAX_NOTEBOOK_ENTRIES)};
}

function newer(a:NotebookEntry,b:NotebookEntry):NotebookEntry {
  const ta=Date.parse(a.updatedAt),tb=Date.parse(b.updatedAt);
  if(ta!==tb)return ta>tb?a:b;
  if(!!a.deletedAt!==!!b.deletedAt)return a.deletedAt?a:b;
  // Deterministic in case two devices edit in the same millisecond.
  return JSON.stringify(a)>=JSON.stringify(b)?a:b;
}

export function mergeNotebook(first:NotebookData,second:NotebookData):NotebookData {
  const map=new Map<string,NotebookEntry>();
  for(const entry of [...normalizeNotebook(first).entries,...normalizeNotebook(second).entries]){
    const prior=map.get(entry.id);
    map.set(entry.id,prior?newer(prior,entry):entry);
  }
  return normalizeNotebook({entries:[...map.values()]});
}
export const activeNotebook=(data:NotebookData) =>
  normalizeNotebook(data).entries.filter(e=>!e.deletedAt).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));

function assertSpace(data:NotebookData,adding:boolean) {
  if (adding && activeNotebook(data).length>=MAX_NOTEBOOK_ACTIVE) throw Error('O caderninho chegou a 100 itens. Exclua alguns para adicionar outros.');
  if (adding && data.entries.length>=MAX_NOTEBOOK_ENTRIES) throw Error('Limite de registros do caderninho atingido. Exporte um backup para guardar seus dados.');
}
export function createNotebookNote(data:NotebookData,params:{title:string;text:string;subject?:string;topic?:string;studyLater?:boolean},now=new Date().toISOString()):NotebookData {
  const clean=normalizeNotebook(data);
  assertSpace(clean,true);
  if (!params.title.trim() && !params.text.trim()) throw Error('Escreva um título ou uma anotação antes de salvar.');
  const item:NotebookEntry={
    id:crypto.randomUUID(),kind:'note',title:params.title.trim().slice(0,100),text:params.text.trim().slice(0,NOTEBOOK_BODY_LIMIT),
    subject:(params.subject??'').slice(0,100),topic:(params.topic??'').slice(0,100),
    studyLater:params.studyLater===true,createdAt:now,updatedAt:now
  };
  return mergeNotebook(clean,{version:1,entries:[item]});
}

export function saveNotebookQuestion(data:NotebookData,q:Question,now=new Date().toISOString()):NotebookData {
  const clean=normalizeNotebook(data);
  // Question ID is stable; preserves user annotations when saved repeatedly.
  const id='q:'+q.id;
  const existing=clean.entries.find(e=>e.id===id);
  if (!existing || existing.deletedAt) assertSpace(clean,!existing || !!existing.deletedAt);
  const question:NotebookQuestionRef={
    id:q.id.slice(0,160),statement:q.statement.slice(0,900),
    ...(q.options?.length?{options:q.options.slice(0,5).map(s=>s.slice(0,400))}:{}),
    origin:q.source?.kind==='official'?'Oficial verificada':q.adaptedFrom?.length?'Treino A–E adaptado':'Autoral',
    ...(url(q.source?.questionPaperUrl)?{sourceUrl:url(q.source.questionPaperUrl)}:{})
  };
  const item:NotebookEntry={
    id,kind:'question',title:existing?.title||'Questão para lembrar',
    text:existing?.text||'',subject:q.subject.slice(0,100),topic:q.topic.slice(0,100),
    studyLater:existing?.studyLater??true,createdAt:existing?.createdAt??now,updatedAt:now,question
  };
  return mergeNotebook(clean,{version:1,entries:[item]});
}

export function editNotebookEntry(data:NotebookData,id:string,params:{title?:string;text?:string;subject?:string;topic?:string;studyLater?:boolean},now=new Date().toISOString()):NotebookData {
  const clean=normalizeNotebook(data);
  const before=clean.entries.find(e=>e.id===id&&!e.deletedAt);
  if(!before)throw Error('Anotação não encontrada.');
  const next:NotebookEntry={...before,updatedAt:now,
    title:params.title===undefined?before.title:params.title.trim().slice(0,100),
    text:params.text===undefined?before.text:params.text.trim().slice(0,NOTEBOOK_BODY_LIMIT),
    subject:params.subject===undefined?before.subject:params.subject.slice(0,100),
    topic:params.topic===undefined?before.topic:params.topic.slice(0,100),
    studyLater:params.studyLater??before.studyLater
  };
  return mergeNotebook(clean,{version:1,entries:[next]});
}
export function deleteNotebookEntry(data:NotebookData,id:string,now=new Date().toISOString()):NotebookData {
  const clean=normalizeNotebook(data);
  const old=clean.entries.find(e=>e.id===id&&!e.deletedAt);
  if (!old) return clean;
  return mergeNotebook(clean,{version:1,entries:[{...old,updatedAt:now,deletedAt:now}]});
}
export function hasNotebookQuestion(data:NotebookData,id:string):boolean {
  return activeNotebook(data).some(e=>e.id==='q:'+id);
}
