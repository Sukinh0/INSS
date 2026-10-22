import { describe, expect, it } from 'vitest';
import { generateAlternativeQuestions } from './alternatives';
import { calculateResult } from './engine';
import { normalizeQuestion } from './origin';
import type { ActiveQuiz, Question } from '../types';

const make = (n: number, correct: 'C'|'E', subject='Seguridade Social'): Question =>
  normalizeQuestion({
    id: `base-test-${n}`, subject, topic:'Conceitos',
    statement: `A afirmação ${n} contém conteúdo completo para que a candidata possa julgar seu acerto.`,
    correct, explanation:`Comentário original do item ${n}.`,
    origin:'Questão autoral'
  });

const bank = [...Array.from({length:2},(_,i)=>make(i+1,'C')),
              ...Array.from({length:8},(_,i)=>make(i+3,'E'))];

describe('modo de alternativas adaptadas', () => {
  it('forma A-E com exatamente uma alternativa conforme o enunciado', () => {
    const questions = generateAlternativeQuestions(bank,10,'authorial',[],()=>0.27);
    expect(questions).toHaveLength(2);
    const used = new Set<string>();
    for(const q of questions) {
      expect(q.options).toHaveLength(5);
      expect(q.adaptedFrom).toHaveLength(5);
      expect(q.source.kind).toBe('authorial');
      expect(q.origin).toContain('adaptado');
      const target = q.statement.includes('INCORRETA') ? 'E' : 'C';
      const truth = q.adaptedFrom!.map(id => bank.find(item=>item.id===id)!.correct);
      expect(truth.filter(t=>t===target)).toHaveLength(1);
      const chosen = 'ABCDE'.indexOf(q.correct!);
      expect(truth[chosen]).toBe(target);
      for (const id of q.adaptedFrom!) { expect(used.has(id)).toBe(false);used.add(id); }
    }
  });
  it('não forma alternativas de tema sem cinco afirmações nem inclui contextuais', () => {
    const context = {...make(99,'C'),contextId:'texto-1'};
    const other = [...bank.slice(0,4),context];
    expect(generateAlternativeQuestions(other,10,'authorial',[],()=>0.3)).toHaveLength(0);
  });
  it('não inclui conteúdo não verificado quando o filtro pede oficiais', () => {
    expect(generateAlternativeQuestions(bank,10,'official',[],()=>0.4)).toHaveLength(0);
  });
  it('contabiliza erro como zero, sem penalidade Cebraspe', () => {
    const q = generateAlternativeQuestions(bank,1,'authorial',[],()=>0.22)[0];
    const wrong = 'ABCDE'.split('').find(x=>x!==q.correct) as 'A'|'B'|'C'|'D'|'E';
    const attempt: ActiveQuiz = {profileId:'p',startedAt:'2026-10-20T00:00:00Z',gradeMode:'normal',exerciseFormat:'alternatives',
      snapshots:[q],answers:{[q.id]:wrong},current:0};
    const result=calculateResult(attempt,'2026-10-20T00:02:00Z');
    expect([result.correct,result.wrong,result.score]).toEqual([0,1,0]);
    expect(result.exerciseFormat).toBe('alternatives');
  });
});
