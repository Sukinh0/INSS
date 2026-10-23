import type { ActiveQuiz, Selection } from '../types';

/**
 * Uma escolha é definitiva. Isso também protege simulados antigos
 * retomados com respostas já registradas antes da atualização.
 */
export function chooseQuizAnswer(quiz: ActiveQuiz, answer: Selection): ActiveQuiz {
  const question = quiz.snapshots[quiz.current];
  if (!question || answer === null || quiz.answers[question.id] != null) return quiz;
  const allowed = question.options?.length
    ? 'ABCDE'.slice(0, question.options.length).includes(answer)
    : answer === 'C' || answer === 'E';
  if (!allowed) return quiz;
  return { ...quiz, answers: { ...quiz.answers, [question.id]: answer } };
}

/** Revela a correção somente após a estudante registrar uma resposta. */
export function revealQuizAnswer(quiz: ActiveQuiz): ActiveQuiz {
  const question = quiz.snapshots[quiz.current];
  if (!question || quiz.answers[question.id] == null || quiz.checkedAnswers?.[question.id]) return quiz;
  return { ...quiz, checkedAnswers: { ...quiz.checkedAnswers, [question.id]: true } };
}

export function isQuizAnswerRevealed(quiz: ActiveQuiz, questionId: string): boolean {
  return quiz.checkedAnswers?.[questionId] === true;
}
