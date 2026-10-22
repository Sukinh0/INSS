import { isAvailableForQuiz } from './origin';
import type { Answer, OriginFilter, Question } from '../types';

/**
 * Monta alternativas A–E a partir de CINCO afirmações C/E existentes.
 * NÃO reescreve questão oficial nem inventa distratores jurídicos.
 * Cada exercício tem exatamente uma afirmação C (ou E), e quatro opostas.
 * Os exercícios resultantes são AUTORAIS/ADAPTADOS, nunca questões oficiais A–E.
 */
export function generateAlternativeQuestions(
  questions: Question[],
  count: number,
  originFilter: OriginFilter = 'all',
  subjects: string[] = [],
  random: () => number = Math.random
): Question[] {
  const pools = new Map<string, { C: Question[]; E: Question[] }>();
  const seen = new Set<string>();
  const usable = questions.filter(q => {
    if (!isAvailableForQuiz(q, originFilter, subjects)) return false;
    if (q.options?.length || q.contextId || (q.correct !== 'C' && q.correct !== 'E')) return false;
    if (q.statement.length > 650 || q.statement.length < 20) return false;
    // Enunciados dependentes de um contexto externo não devem ser tratados isoladamente.
    if (/\b(texto acima|texto anterior|texto a seguir|tabela acima|figura acima|gr[aá]fico acima)\b/i.test(q.statement)) return false;
    if (seen.has(q.id)) return false;
    seen.add(q.id);
    return true;
  });
  for (const q of shuffled(usable, random)) {
    const pool = pools.get(q.subject) ?? { C: [], E: [] };
    pool[q.correct as 'C' | 'E'].push(q);
    pools.set(q.subject, pool);
  }

  const result: Question[] = [];
  const limit = Math.max(0, Math.min(Math.floor(count), Math.floor(usable.length / 5)));
  while (result.length < limit) {
    const candidates: { subject: string; target: 'C' | 'E' }[] = [];
    for (const [subject, pool] of pools) {
      if (pool.C.length >= 1 && pool.E.length >= 4) candidates.push({ subject, target: 'C' });
      if (pool.E.length >= 1 && pool.C.length >= 4) candidates.push({ subject, target: 'E' });
    }
    if (!candidates.length) break;
    const candidate = candidates[Math.floor(random() * candidates.length)];
    const pool = pools.get(candidate.subject)!;
    const opposite = candidate.target === 'C' ? 'E' : 'C';
    const focus = pool[candidate.target].pop()!;
    // Prefere afirmações do mesmo tema, sem sacrificar a disponibilidade.
    pool[opposite].sort((a, b) =>
      Number(b.topic === focus.topic) - Number(a.topic === focus.topic)
    );
    const others = pool[opposite].splice(0, 4);
    const original = shuffled([focus, ...others], random);
    const answerPosition = original.findIndex(q => q.id === focus.id);
    const answer = 'ABCDE'[answerPosition] as Answer;
    const allOfficial = original.every(q => q.source.kind === 'official' && q.source.verification === 'verified');
    const hasOfficial = original.some(q => q.source.kind === 'official');
    const referenceUrl = original[0].source.questionPaperUrl;
    const samePaper = !!referenceUrl && original.every(q => q.source.questionPaperUrl === referenceUrl);
    const adaptation = candidate.target === 'C' ? 'CORRETA' : 'INCORRETA';
    const list = original.map((q, i) =>
      `${'ABCDE'[i]}) Originalmente ${q.correct === 'C' ? 'CERTO' : 'ERRADO'}. ${q.explanation}`
    ).join('\n');
    result.push({
      id: `adapt-ae-${focus.id}-${original.map(q => q.id).sort().join('_')}`,
      subject: candidate.subject,
      topic: focus.topic,
      statement: `Com base nas afirmações de ${candidate.subject}, assinale a alternativa ${adaptation}.`,
      options: original.map(q => q.statement),
      correct: answer,
      explanation: `Resposta: alternativa ${answer}. Neste exercício há exatamente uma afirmação ${adaptation.toLowerCase()}.\n${list}\n\nEste é um treino adaptado, não uma questão A–E aplicada pela banca.`,
      origin: allOfficial
        ? 'Treino adaptado de questões oficiais • não é questão oficial A–E'
        : 'Treino adaptado de itens Certo/Errado',
      source: {
        kind: 'authorial', verification: 'verified',
        label: allOfficial ? 'A–E adaptado de base oficial (não é questão original da banca)' : 'A–E adaptado para treino',
        author: 'Composição automática de 5 questões existentes',
        ...(samePaper ? { questionPaperUrl: referenceUrl } : {}),
        reviewNote: hasOfficial ? 'Parte das afirmações veio de itens oficiais. Este exercício A–E não foi aplicado pela banca.' : 'Treino gerado pela composição de afirmações existentes.'
      },
      status: 'active',
      adaptedFrom: original.map(q => q.id)
    });
  }
  return shuffled(result, random);
}

function shuffled<T>(items: T[], random: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.max(0, Math.min(i, Math.floor(random() * (i + 1))));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
