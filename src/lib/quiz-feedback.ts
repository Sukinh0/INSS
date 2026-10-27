import type { ActiveQuiz, Selection } from '../types';

/**
 * Selecionar uma opção é provisório: até clicar em "Conferir minha resposta",
 * a estudante pode trocar a alternativa ou voltar a deixar em branco.
 * A conferência é o ÚNICO evento que torna a resposta definitiva.
 */
export function chooseQuizAnswer(quiz: ActiveQuiz, answer: Selection): ActiveQuiz {
  const question = quiz.snapshots[quiz.current];
  if (!question || isQuizAnswerRevealed(quiz, question.id)) return quiz;

  const allowed = answer === null || (
    question.options?.length
      ? 'ABCDE'.slice(0, question.options.length).includes(answer)
      : answer === 'C' || answer === 'E'
  );
  if (!allowed || (quiz.answers[question.id] ?? null) === answer) return quiz;
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
