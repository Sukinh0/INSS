import {describe,expect,it} from 'vitest';
import {activeNotebook,createNotebookNote,deleteNotebookEntry,editNotebookEntry,emptyNotebook,hasNotebookQuestion,mergeNotebook,normalizeNotebook,saveNotebookQuestion} from './notebook';
import {normalizeQuestion} from './origin';
const question=normalizeQuestion({id:'q1',subject:'Seguridade Social',topic:'SUS',statement:'Saúde faz parte da seguridade social.',correct:'C',explanation:'Artigo 194 CF.',origin:'Questão autoral'});
describe('Meu Caderninho',()=>{
 it('salva uma nota privada e permite editar e marcar para revisar',()=>{
   const a=createNotebookNote(emptyNotebook(),{title:'Revisar',text:'Minha anotação',studyLater:true});
   expect(activeNotebook(a)).toHaveLength(1);
   const b=editNotebookEntry(a,activeNotebook(a)[0].id,{text:'Outro texto',studyLater:false},'2030-01-01T01:00:00Z');
   expect(activeNotebook(b)[0].text).toBe('Outro texto');
   expect(activeNotebook(b)[0].studyLater).toBe(false);
 });
 it('guarda questão sem revelar gabarito nem comentário',()=>{
   const data=saveNotebookQuestion(emptyNotebook(),question);
   expect(hasNotebookQuestion(data,'q1')).toBe(true);
   expect(JSON.stringify(data)).not.toContain('Artigo 194');
   expect(JSON.stringify(data)).not.toContain('"correct"');
 });
 it('não cria favoritos repetidos e mantém a observação escrita',()=>{
   const a=saveNotebookQuestion(emptyNotebook(),question,'2026-10-20T10:00:00Z');
   const b=editNotebookEntry(a,'q:q1',{text:'Minha dúvida'},'2026-10-20T10:10:00Z');
   const c=saveNotebookQuestion(b,question,'2026-10-20T10:20:00Z');
   expect(activeNotebook(c)).toHaveLength(1);
   expect(activeNotebook(c)[0].text).toBe('Minha dúvida');
 });
 it('não ressuscita anotações deletadas por sincronização antiga',()=>{
   const a=createNotebookNote(emptyNotebook(),{title:'Teste',text:'Texto'},'2026-10-20T10:00:00Z');
   const b=deleteNotebookEntry(a,activeNotebook(a)[0].id,'2026-10-20T10:20:00Z');
   expect(activeNotebook(mergeNotebook(a,b))).toHaveLength(0);
   expect(activeNotebook(mergeNotebook(b,a))).toHaveLength(0);
 });
 it('respeita atualizações mais novas e notas de outro aparelho',()=>{
   const a=createNotebookNote(emptyNotebook(),{title:'A',text:'Primeiro'},'2026-10-20T10:00:00Z');
   const b=editNotebookEntry(a,activeNotebook(a)[0].id,{text:'Atualizado'},'2026-10-20T11:00:00Z');
   const another=createNotebookNote(emptyNotebook(),{title:'B',text:'Outro'},'2026-10-20T12:00:00Z');
   const merged=mergeNotebook(mergeNotebook(a,b),another);
   expect(activeNotebook(merged)).toHaveLength(2);
   expect(activeNotebook(merged).find(e=>e.title==='A')?.text).toBe('Atualizado');
 });
 it('remove metadados de gabarito malicioso e rejeita javascript URLs',()=>{
   const raw={entries:[{id:'q:secret',kind:'question',title:'Teste',text:'teste',subject:'A',topic:'T',createdAt:'2026-10-20T10:00:00Z',updatedAt:'2026-10-20T10:00:00Z',studyLater:true,
   question:{id:'secret',statement:'Item',origin:'Oficial',correct:'C',explanation:'GABARITO',sourceUrl:'javascript:alert(1)'}}]};
   const value=normalizeNotebook(raw);
   expect(JSON.stringify(value)).not.toContain('GABARITO');
   expect(activeNotebook(value)[0].question?.sourceUrl).toBeUndefined();
 });
});