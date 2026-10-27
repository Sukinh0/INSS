import type { Attempt, Question } from '../types';

/** O convite depende exclusivamente das questões reais do simulado concluído.
 * Não inventa explicações nem avalia automaticamente o texto da estudante.
 */
export type ReflectionAnswer = { prompt: string; answer: string };
export type ReflectionGuide = {
  focusSubject: string;
  focusTopic: string;
  subjects: string[];
  questions: [ReflectionAnswer, ReflectionAnswer, ReflectionAnswer];
};
export const MAX_REFLECTION_ANSWER = 900;

export function reflectionGuide(attempt: Attempt): ReflectionGuide {
  const subjects = [...new Set(attempt.snapshots.map(q=>q.subject))].filter(Boolean);
  const rows=new Map<string,{subject:string;topic:string;needs:number;total:number}>();
  for (const q of attempt.snapshots) {
    const key=q.subject+'\u0000'+q.topic;
    const old=rows.get(key)??{subject:q.subject,topic:q.topic,needs:0,total:0};
    old.total++;
    if(attempt.answers[q.id]!==q.correct) old.needs++;
    rows.set(key,old);
  }
  // Prioriza um assunto que merece revisão; em empate, a maior frequência.
  const focus=[...rows.values()].sort((a,b)=>b.needs-a.needs||b.total-a.total||a.subject.localeCompare(b.subject,'pt-BR'))[0];
  const focusSubject=focus?.subject||subjects[0]||'o conteúdo do simulado';
  const focusTopic=focus?.topic||focusSubject;
  const anyDifficulty=Boolean(focus?.needs);
  const intro=anyDifficulty
    ? `Depois de conferir as respostas, o que você entendeu melhor sobre ${focusTopic}?`
    : `O que você conseguiu reforçar hoje sobre ${focusTopic}?`;
  return {
    focusSubject,focusTopic,subjects,
    questions:[
      {prompt:intro,answer:''},
      {prompt:`Imagine que vai explicar ${focusTopic} para uma amiga. Como contaria do seu jeito?`,answer:''},
      {prompt:`O que você ainda gostaria de entender ou revisar sobre ${focusTopic}?`,answer:''}
    ]
  };
}

export function cleanReflectionAnswers(answers: ReflectionAnswer[]): ReflectionAnswer[] {
  return answers.slice(0,3).map(x=>({
    prompt:(typeof x.prompt==='string'?x.prompt:'').slice(0,230),
    answer:(typeof x.answer==='string'?x.answer:'').trim().slice(0,MAX_REFLECTION_ANSWER)
  }));
}

export function canSaveReflection(answers: ReflectionAnswer[]): boolean {
  return cleanReflectionAnswers(answers).some(x=>x.answer.trim().length>0);
}

export function reflectionPreview(question: Question):string {
  return [question.subject,question.topic].filter(Boolean).join(' · ');
}

/** Rascunho local separado por perfil; não afeta histórico nem notas. */
export type ReflectionDraft = { attemptId:string; step:number; answers:string[] };
export function normalizeReflectionDraft(value:unknown):ReflectionDraft|null {
  if(!value || typeof value!=='object' || Array.isArray(value))return null;
  const v=value as Partial<ReflectionDraft>;
  if(typeof v.attemptId!=='string' || !v.attemptId.length || v.attemptId.length>120 || !Number.isInteger(v.step) || (v.step??-1)<0 || (v.step??3)>2 || !Array.isArray(v.answers) || v.answers.length!==3 || !v.answers.every(s=>typeof s==='string'))return null;
  return {attemptId:v.attemptId,step:v.step!,answers:v.answers.map(s=>s.slice(0,MAX_REFLECTION_ANSWER))};
}
