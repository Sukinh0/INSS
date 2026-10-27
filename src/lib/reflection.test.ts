import {describe,expect,it} from 'vitest';
import {normalizeQuestion} from './origin';
import {reflectionGuide,canSaveReflection,cleanReflectionAnswers,normalizeReflectionDraft} from './reflection';
import {activeNotebook,deleteNotebookEntry,editNotebookReflection,emptyNotebook,findNotebookReflection,mergeNotebook,normalizeNotebook,saveNotebookReflection} from './notebook';
import {parseBackup} from './backup';
import type {Attempt} from '../types';

const q1=normalizeQuestion({id:'q-1',subject:'Direito Previdenciário',topic:'Seguridade Social',statement:'A seguridade inclui saúde.',correct:'C',explanation:'Art. 194.',origin:'Questão autoral'});
const q2=normalizeQuestion({id:'q-2',subject:'Direito Previdenciário',topic:'Seguridade Social',statement:'A assistência exige contribuição.',correct:'E',explanation:'Não exige contribuição.',origin:'Questão autoral'});
const q3=normalizeQuestion({id:'q-3',subject:'Língua Portuguesa',topic:'Crase',statement:'Há crase na expressão citada.',correct:'E',explanation:'Não há.',origin:'Questão autoral'});
const attempt=(overrides:Partial<Attempt>={}):Attempt=>({
  id:'simulado-001',profileId:'p',profileName:'Maria',
  startedAt:'2026-10-25T20:00:00Z',finishedAt:'2026-10-25T20:10:00Z',
  elapsedSeconds:600,gradeMode:'cebraspe',questionIds:['q-1','q-2','q-3'],snapshots:[q1,q2,q3],
  answers:{'q-1':'E','q-2':'C','q-3':'E'},subjects:['Direito Previdenciário','Língua Portuguesa'],
  correct:1,wrong:2,blank:0,score:-1,accuracy:33.33,...overrides
});

describe('Diário de Aprendizado',()=>{
 it('direciona a reflexão para a maior dificuldade sem gerar respostas por IA',()=>{
  const g=reflectionGuide(attempt());
  expect(g.focusSubject).toBe('Direito Previdenciário');
  expect(g.focusTopic).toBe('Seguridade Social');
  expect(g.questions).toHaveLength(3);
  expect(g.questions[0].prompt).toContain('Depois de conferir');
  expect(g.questions[1].prompt).toContain('amiga');
  expect(g.questions.every(q=>q.answer==='')).toBe(true);
 });
 it('quando acerta tudo, incentiva explicar o que consolidou',()=>{
  const a=attempt({answers:{'q-1':'C','q-2':'E','q-3':'E'},correct:3,wrong:0,score:3,accuracy:100});
  expect(reflectionGuide(a).questions[0].prompt).toContain('reforçar');
 });
 it('um campo escrito basta; zeros campos não geram anotação',()=>{
  const g=reflectionGuide(attempt());
  expect(canSaveReflection(g.questions)).toBe(false);
  g.questions[2].answer='Ainda quero revisar.';
  expect(canSaveReflection(g.questions)).toBe(true);
  const long=cleanReflectionAnswers([{prompt:'P',answer:'x'.repeat(3000)}]);
  expect(long[0].answer).toHaveLength(900);
 });
 it('salva uma reflexão estruturada, vinculada à tentativa e sem duplicar',()=>{
  const a=attempt();
  const g=reflectionGuide(a);
  g.questions[0].answer='Hoje aprendi a diferença entre saúde e previdência.';
  const first=saveNotebookReflection(emptyNotebook(),a,g.questions,'2026-10-25T21:00:00Z');
  const saved=findNotebookReflection(first,a.id)!;
  expect(saved.reflection?.attemptId).toBe(a.id);
  expect(saved.reflection?.subjects).toContain('Direito Previdenciário');
  expect(saved.reflection?.correct).toBe(1);
  expect(saved.reflection?.questions[0].answer).toContain('diferença');
  expect(JSON.stringify(saved)).not.toContain('Art. 194.');
  const second=saveNotebookReflection(first,a,[{prompt:'p',answer:'Mudou meu entendimento'},{prompt:'',answer:''},{prompt:'',answer:''}],'2026-10-25T22:00:00Z');
  expect(activeNotebook(second)).toHaveLength(1);
  expect(findNotebookReflection(second,a.id)?.reflection?.questions[0].answer).toBe('Mudou meu entendimento');
 });
 it('permite editar dentro do Caderninho sem alterar nota ou gabarito',()=>{
  const a=attempt();
  const g=reflectionGuide(a);
  g.questions[0].answer='Aprendi uma coisa.';
  const saved=saveNotebookReflection(emptyNotebook(),a,g.questions,'2026-10-25T21:00:00Z');
  const next=editNotebookReflection(saved,'reflection:'+a.id,[{prompt:'ignored',answer:'Agora sei explicar!'},{prompt:'',answer:''},{prompt:'',answer:''}],'2026-10-25T22:00:00Z');
  expect(findNotebookReflection(next,a.id)?.reflection?.questions[0].answer).toBe('Agora sei explicar!');
  expect(findNotebookReflection(next,a.id)?.reflection?.questions[0].prompt).toBe(g.questions[0].prompt);
  expect(a.score).toBe(-1);
  expect(a.answers['q-1']).toBe('E');
 });
 it('mantém diário editado no merge entre dispositivos e não ressuscita exclusão',()=>{
  const a=attempt();
  const g=reflectionGuide(a);g.questions[0].answer='Original';
  const first=saveNotebookReflection(emptyNotebook(),a,g.questions,'2026-10-25T21:00:00Z');
  const edited=editNotebookReflection(first,'reflection:'+a.id,[{prompt:'',answer:'Revisado'},...g.questions.slice(1)],'2026-10-25T22:00:00Z');
  const merged=mergeNotebook(first,edited);
  expect(findNotebookReflection(merged,a.id)?.reflection?.questions[0].answer).toBe('Revisado');
  const deleted=deleteNotebookEntry(edited,'reflection:'+a.id,'2026-10-25T23:00:00Z');
  expect(findNotebookReflection(mergeNotebook(first,deleted),a.id)).toBeUndefined();
 });
 it('backup v4 mantém o diário; backup antigo continua válido',()=>{
  const a=attempt();
  const g=reflectionGuide(a);g.questions[0].answer='Texto meu';
  const notebook=saveNotebookReflection(emptyNotebook(),a,g.questions);
  const parsed=parseBackup(JSON.stringify({app:'Rumo ao INSS',version:4,attempts:[],custom:[],notebook}), 'novo','Novo');
  expect(findNotebookReflection(parsed.notebook,a.id)?.reflection?.questions[0].answer).toBe('Texto meu');
  const old=parseBackup(JSON.stringify({app:'Rumo ao INSS',version:3,attempts:[],custom:[]}), 'novo','Novo');
  expect(activeNotebook(old.notebook)).toHaveLength(0);
 });
 it('descarta estrutura malformada e rascunhos de outra tentativa',()=>{
  const fake=normalizeNotebook({entries:[{id:'reflection:x',kind:'reflection',createdAt:'2026-10-20T10:00:00Z',updatedAt:'2026-10-20T10:00:00Z',reflection:{attemptId:'x',finishedAt:'oops',questions:['bad']}}]});
  expect(activeNotebook(fake)).toHaveLength(0);
  expect(normalizeReflectionDraft({attemptId:'abc',step:2,answers:['x','y','z']})?.step).toBe(2);
  expect(normalizeReflectionDraft({attemptId:'abc',step:3,answers:['x','y','z']})).toBeNull();
 });
});
