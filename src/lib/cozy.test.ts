import { describe, expect, it } from 'vitest';
import {
  MINI_LESSONS, chooseLessons, emptyCozy, flashcardBank, mergeCozy, pickFlashcards,
  recordCozy, sanitizeCozy, sunflowerStage, cozySubjects
} from './cozy';
import { normalizeQuestion } from './origin';

const authorial = (id:string,subject='Seguridade Social')=> normalizeQuestion({
  id, subject, topic:'Conceitos', statement:`A afirmação de teste ${id} utiliza um enunciado autoral suficientemente longo.`,
  correct: 'C', explanation:'Comentário e explicação pedagógica.',
  origin:'Questão autoral • estilo Cebraspe'
});
const official = () => normalizeQuestion({
  id:'oficial-01', subject:'Seguridade Social',topic:'Conceitos',
  statement:'A previdência social faz parte da seguridade social.',
  correct:'C', explanation:'Art. 194 da Constituição.',
  source:{ kind:'official', verification:'verified',label:'Oficial INSS 2022', organizer:'Cebraspe',institution:'INSS',job:'Técnico do Seguro Social',examYear:2022,bookletCode:'760_INSS_001_01',itemNumber:51,definitiveKeyUrl:'https://cdn.cebraspe.org.br/concursos/inss_22/arquivos/gab.PDF' }
});

describe('Meu Cantinho — Girassol',()=>{
  it('tem 24 microaulas autorais com respostas e 8 matérias',()=>{
    expect(MINI_LESSONS).toHaveLength(24);
    expect(new Set(MINI_LESSONS.map(x=>x.id)).size).toBe(24);
    expect(cozySubjects()).toHaveLength(8);
    for(const l of MINI_LESSONS){
      expect(l.intro.length).toBeGreaterThan(25);
      expect(l.statement.length).toBeGreaterThan(25);
      expect(l.explanation.length).toBeGreaterThan(25);
      expect(['C','E']).toContain(l.correct);
    }
  });
  it('faz crescer o jardim por aprendizagem e não por quantidade de acertos',()=>{
    const first=emptyCozy();
    let p=first;
    for(let i=0;i<4;i++) p=recordCozy(p,'petal',MINI_LESSONS[i].id);
    expect(sunflowerStage(p).petals).toBe(4);
    expect(sunflowerStage(p).emoji).toBe('🌿');
    expect(sunflowerStage(p).sessions).toBe(0);
    p=recordCozy(p,'session','sunflower');
    expect(sunflowerStage(p).sessions).toBe(1);
  });
  it('filtra uma matéria e prioriza assuntos ainda não vistos',()=>{
    const all=chooseLessons(emptyCozy(),5,'Língua Portuguesa',()=>0.5);
    expect(all).toHaveLength(3);
    expect(all.every(l=>l.subject==='Língua Portuguesa')).toBe(true);
    let p=emptyCozy();p=recordCozy(p,'petal','g-07');
    const selected=chooseLessons(p,2,'Língua Portuguesa',()=>0.5);
    expect(selected.some(l=>l.id==='g-07')).toBe(false);
  });
});
describe('Meu Cantinho — Cartinhas',()=>{
  it('usa o banco autoral e não converte provas oficiais em flashcards oficiais',()=>{
    const pool=[authorial('a'),authorial('b'),official()];
    const selected=flashcardBank(pool);
    expect(selected.map(q=>q.id).sort()).toEqual(['a','b']);
  });
  it('filtra matérias e respeita a quantidade',()=>{
    const pool=[authorial('a'),authorial('b','Informática'),authorial('c','Informática')];
    expect(pickFlashcards(pool,emptyCozy(),5,'Informática',()=>0.4)).toHaveLength(2);
  });
  it('prioriza cartinhas marcadas quero revisar sobre as novas',()=>{
    const pool=[authorial('a'),authorial('b'),authorial('c')];
    let progress=recordCozy(emptyCozy(),'card','b','review');
    progress=recordCozy(progress,'card','a','known');
    const selected=pickFlashcards(pool,progress,2,'Todas',()=>0.3);
    expect(selected.map(q=>q.id)).toEqual(['b','c']);
  });
});
describe('Meu Cantinho — armazenamento e sincronização',()=>{
  it('mescla eventos por ID sem contar duas vezes um mesmo estudo',()=>{
    const p=recordCozy(emptyCozy(),'petal','g-01');
    expect(mergeCozy(p,p).events).toHaveLength(1);
    expect(mergeCozy(p,emptyCozy()).events).toHaveLength(1);
    expect(mergeCozy(emptyCozy(),p).events).toHaveLength(1);
  });
  it('descarta entradas malformadas e preserva progresso válido',()=>{
    const p=recordCozy(emptyCozy(),'card','a','known');
    const bad=sanitizeCozy({ events:[...p.events,{id:'ruim',at:'não data',kind:'card',itemId:'b',rating:'known'},...p.events] });
    expect(bad.events).toHaveLength(1);
    expect(bad.events[0].id).toBe(p.events[0].id);
  });
});
