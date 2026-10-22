import { describe, expect, it } from 'vitest';
import { calculateResult, compileStats, getWrongQuestionIds, pickQuestions, subjectBreakdown } from './engine';
import type { ActiveQuiz, Question } from '../types';
const questions: Question[] = [
  { id: 'x', subject: 'A', topic: 'T', statement: 'a', correct: 'C', explanation: 'e', origin: 'Autoral' },
  { id: 'y', subject: 'B', topic: 'T', statement: 'b', correct: 'E', explanation: 'e', origin: 'Autoral' },
  { id: 'z', subject: 'A', topic: 'T', statement: 'c', correct: 'C', explanation: 'e', origin: 'Autoral' }
];
const make = (mode: 'cebraspe'|'normal') : ActiveQuiz => ({ profileId: 'p', startedAt: '2026-01-01T00:00:00.000Z', gradeMode: mode, snapshots: questions, current: 0, answers: {x:'C', y:'C', z:null} });
describe('motor de simulados', () => {
  it('filtra e não repete questões e respeita o limite', () => {
    expect(pickQuestions(questions, 20, ['A'], () => 0.2).map(q => q.id).sort()).toEqual(['x', 'z']);
  });
  it('aplica nota Cebraspe +1 -1 0', () => {
    const a = calculateResult(make('cebraspe'), '2026-01-01T00:01:00.000Z');
    expect([a.correct,a.wrong,a.blank,a.score,a.accuracy,a.elapsedSeconds]).toEqual([1,1,1,0,33.33,60]);
  });
  it('mantém a correção de treino e as estatísticas', () => {
    const a = calculateResult(make('normal'), '2026-01-01T00:02:00.000Z');
    expect(a.score).toBe(1);
    expect(subjectBreakdown([a]).find(s => s.subject === 'B')?.accuracy).toBe(0);
    expect(compileStats('p','Pessoa',[a]).points).toBe(10);
    expect(getWrongQuestionIds([a]).has('y')).toBe(true);
  });
});
