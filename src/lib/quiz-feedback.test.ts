import { describe, expect, it } from 'vitest';
import { chooseQuizAnswer, isQuizAnswerRevealed, revealQuizAnswer } from './quiz-feedback';
import { calculateResult } from './engine';
import { normalizeQuestion } from './origin';
import type { ActiveQuiz, Question } from '../types';

const original = normalizeQuestion({
  id: 'ce-01',
  subject: 'Direito Previdenciário',
  topic: 'RGPS',
  statement: 'O Regime Geral de Previdência Social abrange os empregados da iniciativa privada.',
  correct: 'C',
  explanation: 'O RGPS abrange os trabalhadores indicados na legislação.',
  origin: 'Questão autoral'
});
const alternative = normalizeQuestion({
  id: 'ae-01',
  subject: 'Língua Portuguesa',
  topic: 'Interpretação',
  statement: 'Assinale a alternativa correta.',
  options: ['Afirmação 1', 'Afirmação 2', 'Afirmação 3', 'Afirmação 4', 'Afirmação 5'],
  correct: 'B',
  explanation: 'Somente a afirmação 2 está correta.',
  origin: 'Questão autoral'
});

function quiz(snapshots: Question[], gradeMode: 'normal' | 'cebraspe' = 'cebraspe'): ActiveQuiz {
  return {
    profileId: 'user-01', startedAt: '2026-10-22T10:00:00.000Z',
    gradeMode, snapshots, current: 0, answers: {}, checkedAnswers: {}
  };
}

describe('escolha definitiva e conferência individual', () => {
  it('não permite conferir antes de responder', () => {
    const q = quiz([original]);
    expect(revealQuizAnswer(q)).toBe(q);
    expect(isQuizAnswerRevealed(q, original.id)).toBe(false);
  });

  it('trava resposta C/E imediatamente, inclusive em tentativas de limpar ou trocar', () => {
    const originalQuiz = quiz([original]);
    const answered = chooseQuizAnswer(originalQuiz, 'E');
    expect(answered.answers['ce-01']).toBe('E');
    expect(chooseQuizAnswer(answered, 'C')).toBe(answered);
    expect(chooseQuizAnswer(answered, null)).toBe(answered);
    expect(originalQuiz.answers['ce-01']).toBeUndefined();
  });

  it('trava alternativas A–E e não aceita opções incompatíveis com o enunciado', () => {
    const q = quiz([alternative], 'normal');
    expect(chooseQuizAnswer(q, null)).toBe(q);
    const answered = chooseQuizAnswer(q, 'A');
    expect(chooseQuizAnswer(answered, 'B')).toBe(answered);
    expect(answered.answers['ae-01']).toBe('A');
    const withTwoOptions = {...alternative, options: ['Opção 1', 'Opção 2']};
    expect(chooseQuizAnswer(quiz([withTwoOptions]), 'C')).toEqual(quiz([withTwoOptions]));
  });

  it('só revela a questão atual e preserva a conferência ao navegar ou recarregar', () => {
    const first = chooseQuizAnswer(quiz([original, alternative]), 'C');
    const checked = revealQuizAnswer(first);
    expect(isQuizAnswerRevealed(checked, 'ce-01')).toBe(true);
    expect(isQuizAnswerRevealed(checked, 'ae-01')).toBe(false);
    expect(revealQuizAnswer(checked)).toBe(checked);
    const next = {...checked, current: 1};
    expect(revealQuizAnswer(next)).toBe(next);
    const persisted = JSON.parse(JSON.stringify({...next, current: 0})) as ActiveQuiz;
    expect(isQuizAnswerRevealed(persisted, 'ce-01')).toBe(true);
    expect(chooseQuizAnswer(persisted, 'E')).toBe(persisted);
  });

  it('compatível com simulados antigos, sem mapa de conferências', () => {
    const oldQuiz = quiz([original]);
    delete oldQuiz.checkedAnswers;
    oldQuiz.answers['ce-01'] = 'E';
    expect(chooseQuizAnswer(oldQuiz, 'C')).toBe(oldQuiz);
    const checked = revealQuizAnswer(oldQuiz);
    expect(isQuizAnswerRevealed(checked, 'ce-01')).toBe(true);
  });

  it('conferir não altera a nota Cebraspe +1/-1 ou a nota A–E sem desconto', () => {
    const ce = revealQuizAnswer(chooseQuizAnswer(quiz([original]), 'E'));
    const ae = revealQuizAnswer(chooseQuizAnswer(quiz([alternative], 'normal'), 'B'));
    const time = '2026-10-22T10:05:00.000Z';
    expect(calculateResult(ce, time).score).toBe(-1);
    expect(calculateResult(ae, time).score).toBe(1);
  });
});
