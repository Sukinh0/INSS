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

describe('seleção editável até conferir a resposta', () => {
  it('não permite conferir uma questão em branco', () => {
    const q = quiz([original]);
    expect(revealQuizAnswer(q)).toBe(q);
    expect(isQuizAnswerRevealed(q, original.id)).toBe(false);
  });

  it('permite trocar C/E antes de conferir e voltar a deixar em branco', () => {
    const initial = quiz([original]);
    const first = chooseQuizAnswer(initial, 'E');
    expect(first.answers['ce-01']).toBe('E');
    const second = chooseQuizAnswer(first, 'C');
    expect(second.answers['ce-01']).toBe('C');
    const blank = chooseQuizAnswer(second, null);
    expect(blank.answers['ce-01']).toBeNull();
    expect(revealQuizAnswer(blank)).toBe(blank);
    const again = chooseQuizAnswer(blank, 'E');
    expect(again.answers['ce-01']).toBe('E');
    expect(initial.answers['ce-01']).toBeUndefined();
    expect(chooseQuizAnswer(again, 'E')).toBe(again); // idempotência
  });

  it('permite trocar A–E até a conferência e ignora opções inválidas', () => {
    const q = quiz([alternative], 'normal');
    const a = chooseQuizAnswer(q, 'A');
    const b = chooseQuizAnswer(a, 'B');
    expect(b.answers['ae-01']).toBe('B');
    const confirmed = revealQuizAnswer(b);
    expect(chooseQuizAnswer(confirmed, 'C')).toBe(confirmed);
    expect(chooseQuizAnswer(confirmed, null)).toBe(confirmed);
    const withTwoOptions = {...alternative, options: ['Opção 1', 'Opção 2']};
    const two = quiz([withTwoOptions]);
    expect(chooseQuizAnswer(two, 'C')).toBe(two);
    expect(chooseQuizAnswer(two, 'A').answers['ae-01']).toBe('A');
  });

  it('trava a escolha definitiva somente após Conferir minha resposta', () => {
    const selected = chooseQuizAnswer(quiz([original]), 'E');
    const corrected = chooseQuizAnswer(selected, 'C');
    expect(corrected.answers['ce-01']).toBe('C');
    const confirmed = revealQuizAnswer(corrected);
    expect(isQuizAnswerRevealed(confirmed, 'ce-01')).toBe(true);
    expect(chooseQuizAnswer(confirmed, 'E')).toBe(confirmed);
    expect(chooseQuizAnswer(confirmed, null)).toBe(confirmed);
    expect(revealQuizAnswer(confirmed)).toBe(confirmed);
    expect(confirmed.answers['ce-01']).toBe('C');
  });

  it('respostas não conferidas continuam editáveis ao voltar para uma questão anterior', () => {
    const first = chooseQuizAnswer(quiz([original, alternative]), 'E');
    const next: ActiveQuiz = {...first, current: 1};
    const second = chooseQuizAnswer(next, 'A');
    const back: ActiveQuiz = {...second, current: 0};
    const switched = chooseQuizAnswer(back, 'C');
    expect(switched.answers['ce-01']).toBe('C');
    expect(switched.answers['ae-01']).toBe('A');
    expect(switched.checkedAnswers).toEqual({});
  });

  it('não altera a resposta de uma questão já conferida ao navegar ou recarregar', () => {
    const first = chooseQuizAnswer(quiz([original, alternative]), 'C');
    const confirmed = revealQuizAnswer(first);
    const next = {...confirmed, current: 1};
    expect(revealQuizAnswer(next)).toBe(next);
    const serialized = JSON.parse(JSON.stringify({...next, current: 0})) as ActiveQuiz;
    expect(isQuizAnswerRevealed(serialized, 'ce-01')).toBe(true);
    expect(chooseQuizAnswer(serialized, 'E')).toBe(serialized);
    expect(chooseQuizAnswer(serialized, null)).toBe(serialized);
  });

  it('compatível com simulados antigos: sem registro de conferência, resposta editável', () => {
    const oldQuiz = quiz([original]);
    delete oldQuiz.checkedAnswers;
    oldQuiz.answers['ce-01'] = 'E';
    const changed = chooseQuizAnswer(oldQuiz, 'C');
    expect(changed.answers['ce-01']).toBe('C');
    const checked = revealQuizAnswer(changed);
    expect(isQuizAnswerRevealed(checked, 'ce-01')).toBe(true);
    expect(chooseQuizAnswer(checked, 'E')).toBe(checked);
  });

  it('correção final mantém o último valor escolhido, com ou sem conferência', () => {
    const time = '2026-10-22T10:05:00.000Z';
    const ce = chooseQuizAnswer(chooseQuizAnswer(quiz([original]), 'E'), 'C');
    const ae = chooseQuizAnswer(chooseQuizAnswer(quiz([alternative], 'normal'), 'A'), 'B');
    expect(calculateResult(ce, time).score).toBe(1); // Cebraspe: +1
    expect(calculateResult(ae, time).score).toBe(1); // A–E: +1
    const wrongConfirmed = revealQuizAnswer(chooseQuizAnswer(ce, 'E'));
    expect(calculateResult(wrongConfirmed, time).score).toBe(-1);
    const wrongAe = revealQuizAnswer(chooseQuizAnswer(ae, 'E'));
    expect(calculateResult(wrongAe, time).score).toBe(0);
  });
});
