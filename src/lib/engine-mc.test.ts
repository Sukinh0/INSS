import { describe, expect, it } from 'vitest';
import { calculateResult, formatAnswer, pickQuestions } from './engine';
import { normalizeQuestion } from './origin';
import type { ActiveQuiz, Question } from '../types';

const q: Question = normalizeQuestion({ id:'fcc-2012-01',subject:'Português',topic:'Ortografia',statement:'Assinale a alternativa correta.',correct:'B',options:['Opção um','Opção dois','Opção três','Opção quatro','Opção cinco'],explanation:'Segunda resposta correta.',origin:'Exemplo de importação' });
describe('formato múltipla escolha', () => {
  it('corrige alternativa e preserva o banco', () => {
    const quiz: ActiveQuiz = {profileId:'p',startedAt:'2026-01-01T00:00:00Z',gradeMode:'normal',snapshots:[q],answers:{[q.id]:'B'},current:0};
    expect(calculateResult(quiz,'2026-01-01T00:00:40Z').correct).toBe(1);
    expect(formatAnswer('B',q.options)).toBe('Alternativa B');
    expect(pickQuestions([q],10,['Português'])).toHaveLength(1);
  });
});
