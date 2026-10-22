import { describe, expect, it } from 'vitest';
import initial from '../data/questions.json';
import { getOfficialKey, isAvailableForQuiz, normalizeQuestion } from './origin';
import { pickQuestions, compileOriginStats } from './engine';
import type { Attempt } from '../types';

describe('Segurança de Origem e Separação de Bancos (Rumo ao INSS)', () => {
  it('categoriza todas as 234 questões da base existente estritamente como AUTORAIS (zero oficiais)', () => {
    expect(initial).toHaveLength(234);
    const normalized = initial.map(normalizeQuestion);

    const officials = normalized.filter(q => q.source.kind === 'official');
    const authorials = normalized.filter(q => q.source.kind === 'authorial');

    expect(officials).toHaveLength(0);
    expect(authorials).toHaveLength(234);
    for (const q of normalized) {
      expect(q.source.kind).toBe('authorial');
      expect(q.source.verification).toBe('verified');
      expect(q.status).toBe('active');
      expect(['C', 'E']).toContain(q.correct);
    }
  });

  it('impede promoção falsa a oficial se faltarem fontes primárias e gabarito definitivo', () => {
    // Caso com menção textual ao Cebraspe no origin sem metadados
    const q1 = normalizeQuestion({
      id: 'fake-01',
      subject: 'Direito Previdenciário',
      topic: 'RGPS',
      statement: 'O INSS é uma autarquia federal.',
      correct: 'C',
      explanation: 'Artigo da lei.',
      origin: 'Cebraspe INSS 2022'
    });
    expect(q1.source.kind).not.toBe('official');
    expect(q1.source.kind).toBe('unverified');
    expect(q1.source.verification).toBe('pending');

    // Caso tentando declarar kind='official' sem o gabarito definitivo ou caderno
    const q2 = normalizeQuestion({
      id: 'fake-02',
      subject: 'Direito Constitucional',
      topic: 'Direitos Fundamentais',
      statement: 'Texto de prova.',
      correct: 'C',
      explanation: 'Comentário.',
      source: {
        kind: 'official',
        organizer: 'Cebraspe'
        // Faltam: examYear, bookletCode, itemNumber, definitiveKeyUrl
      }
    });
    expect(q2.source.kind).toBe('unverified');
    expect(q2.source.verification).toBe('pending');
    expect(q2.status).toBe('under_review');
  });

  it('admite questão oficial apenas quando há conferência e fontes primárias verificáveis', () => {
    const validOfficial = normalizeQuestion({
      id: 'inss-2022-cb1-01',
      subject: 'Língua Portuguesa',
      topic: 'Interpretação de Texto',
      statement: 'Com base no texto da prova...',
      correct: 'C',
      explanation: 'Comentário pedagógico autoral sobre a questão oficial.',
      source: {
        kind: 'official',
        verification: 'verified',
        label: 'Oficial · INSS 2022 · Cebraspe · item 1',
        organizer: 'Cebraspe',
        institution: 'INSS',
        job: 'Técnico do Seguro Social',
        examYear: 2022,
        bookletCode: '760_INSS_CB1_01',
        itemNumber: 1,
        questionPaperUrl: 'https://cdn.cebraspe.org.br/concursos/INSS_22/arquivos/760_INSS_CB1_01.PDF',
        definitiveKeyUrl: 'https://cdn.cebraspe.org.br/concursos/INSS_22/arquivos/GAB_DEFINITIVO_760_INSS_CB1_01.PDF'
      }
    });

    expect(validOfficial.source.kind).toBe('official');
    expect(validOfficial.source.verification).toBe('verified');
    expect(validOfficial.status).toBe('active');
  });

  it('teste sentinela: item 49 anulado (X) é excluído de sorteios pontuáveis e tem status annulled', () => {
    // Sentinela baseada no caderno real 760_INSS_CB1_01, item 49 com gabarito definitivo X
    const sentinelItem49 = normalizeQuestion({
      id: 'inss-2022-cb1-49',
      subject: 'Noções de Informática',
      topic: 'Segurança da Informação',
      statement: 'Enunciado de referência do item 49...',
      correct: null,
      officialAnswer: 'X',
      status: 'annulled',
      explanation: 'Item anulado no gabarito definitivo divulgado pelo Cebraspe.',
      source: {
        kind: 'official',
        verification: 'verified',
        organizer: 'Cebraspe',
        institution: 'INSS',
        job: 'Técnico do Seguro Social',
        examYear: 2022,
        bookletCode: '760_INSS_CB1_01',
        itemNumber: 49,
        questionPaperUrl: 'https://cdn.cebraspe.org.br/concursos/INSS_22/arquivos/760_INSS_CB1_01.PDF',
        definitiveKeyUrl: 'https://cdn.cebraspe.org.br/concursos/INSS_22/arquivos/GAB_DEFINITIVO_760_INSS_CB1_01.PDF'
      }
    });

    expect(sentinelItem49.status).toBe('annulled');
    expect(sentinelItem49.correct).toBeNull();
    expect(sentinelItem49.officialAnswer).toBe('X');

    // Não deve ser sorteável em nenhum modo pontuável
    expect(isAvailableForQuiz(sentinelItem49, 'official')).toBe(false);
    expect(isAvailableForQuiz(sentinelItem49, 'mixed')).toBe(false);
    expect(isAvailableForQuiz(sentinelItem49, 'all')).toBe(false);

    const drawn = pickQuestions([sentinelItem49], 10, [], undefined, 'official');
    expect(drawn).toHaveLength(0);
  });

  it('exclui questões com legislação desatualizada (outdated) do treino corrente', () => {
    const outdatedQuestion = normalizeQuestion({
      id: 'inss-old-01',
      subject: 'Direito Previdenciário',
      topic: 'Pensão por morte',
      statement: 'Regra anterior à EC 103/2019...',
      correct: 'C',
      status: 'outdated',
      explanation: 'Esta regra mudou com a Reforma da Previdência.',
      source: {
        kind: 'authorial',
        verification: 'verified',
        label: 'Desatualizada'
      }
    });

    expect(outdatedQuestion.status).toBe('outdated');
    expect(isAvailableForQuiz(outdatedQuestion, 'authorial')).toBe(false);
    expect(isAvailableForQuiz(outdatedQuestion, 'mixed')).toBe(false);
  });

  it('garante idempotência e pureza em normalizeQuestion', () => {
    const original = {
      id: 'test-idem-01',
      subject: 'Ética',
      topic: 'Decreto 1.171/94',
      statement: 'A moralidade da administração pública não se limita à distinção entre bem e mal.',
      correct: 'C',
      explanation: 'Exato, também considera a honestidade e lealdade.',
      origin: 'Questão autoral'
    };

    const firstPass = normalizeQuestion(original);
    const secondPass = normalizeQuestion(firstPass);

    expect(firstPass).toEqual(secondPass);
    expect(firstPass.source.kind).toBe('authorial');
  });

  it('filtra corretamente por origem no motor de simulado', () => {
    const authorialQ = normalizeQuestion({
      id: 'aut-01',
      subject: 'Seguridade',
      topic: 'Saúde',
      statement: 'A saúde é direito de todos e dever do Estado.',
      correct: 'C',
      explanation: 'Artigo 196 da CF.',
      origin: 'Autoral'
    });

    const unverifiedQ = normalizeQuestion({
      id: 'unv-01',
      subject: 'Seguridade',
      topic: 'Saúde',
      statement: 'Outra questão.',
      correct: 'E',
      explanation: 'Explicando.',
      origin: 'Material aleatório da internet'
    });

    const officialQ = normalizeQuestion({
      id: 'ofc-01',
      subject: 'Seguridade',
      topic: 'Saúde',
      statement: 'Item real da prova.',
      correct: 'C',
      explanation: 'Comentário.',
      source: {
        kind: 'official',
        verification: 'verified',
        organizer: 'Cebraspe',
        institution: 'INSS',
        job: 'Técnico',
        examYear: 2022,
        bookletCode: '760_CB1',
        itemNumber: 2,
        definitiveKeyUrl: 'https://cdn.cebraspe.org.br/gab.pdf'
      }
    });

    const pool = [authorialQ, unverifiedQ, officialQ];

    // Modo autoral só sorteia autorais
    const authorialDrawn = pickQuestions(pool, 10, [], undefined, 'authorial');
    expect(authorialDrawn.map(q => q.id)).toEqual(['aut-01']);

    // Modo oficial só sorteia oficiais verificadas
    const officialDrawn = pickQuestions(pool, 10, [], undefined, 'official');
    expect(officialDrawn.map(q => q.id)).toEqual(['ofc-01']);

    // Modo misturado sorteia oficial + autoral, NUNCA não-verificadas
    const mixedDrawn = pickQuestions(pool, 10, [], undefined, 'mixed');
    expect(mixedDrawn.map(q => q.id).sort()).toEqual(['aut-01', 'ofc-01']);

    // Se o banco oficial estiver vazio (como no início com os 234 itens autorais):
    const emptyOfficialDrawn = pickQuestions([authorialQ, unverifiedQ], 10, [], undefined, 'official');
    expect(emptyOfficialDrawn).toHaveLength(0);
  });

  it('deduplica questões oficiais pela tupla de aplicação e caderno', () => {
    const key1 = getOfficialKey({
      organizer: 'Cebraspe',
      examYear: 2022,
      examId: 'inss-2022',
      bookletCode: '760_INSS_CB1_01',
      itemNumber: 15
    });

    const key2 = getOfficialKey({
      organizer: 'Cebraspe',
      examYear: 2022,
      examId: 'inss-2022',
      bookletCode: '760_inss_cb1_01',
      itemNumber: 15
    });

    expect(key1).toBe('cebraspe|2022|inss-2022|760_inss_cb1_01|15');
    expect(key1).toBe(key2);
  });

  it('permite segmentar desempenho e estatísticas por origem', () => {
    const qAut = normalizeQuestion({ id: 'a1', subject: 'Português', topic: 'Crase', statement: 'x', correct: 'C', explanation: 'e', origin: 'Autoral' });
    const qOfc = normalizeQuestion({
      id: 'o1', subject: 'Português', topic: 'Pontuação', statement: 'y', correct: 'E', explanation: 'e',
      source: { kind: 'official', verification: 'verified', organizer: 'Cebraspe', institution: 'INSS', job: 'Técnico', examYear: 2022, bookletCode: 'CB1', itemNumber: 1, definitiveKeyUrl: 'https://cdn.cebraspe.org.br/gab.pdf' }
    });

    const attempt: Attempt = {
      id: 'att-1',
      profileId: 'p1',
      profileName: 'Maria',
      startedAt: '2026-01-01T00:00:00Z',
      finishedAt: '2026-01-01T00:01:00Z',
      elapsedSeconds: 60,
      gradeMode: 'normal',
      originFilter: 'mixed',
      questionIds: ['a1', 'o1'],
      snapshots: [qAut, qOfc],
      answers: { a1: 'C', o1: 'C' }, // a1 acertou, o1 errou
      subjects: ['Português'],
      correct: 1,
      wrong: 1,
      blank: 0,
      score: 1,
      accuracy: 50
    };

    const autStats = compileOriginStats('p1', 'Maria', [attempt], 'authorial');
    expect(autStats.totalCorrect).toBe(1);
    expect(autStats.totalQuestions).toBe(1);
    expect(autStats.accuracy).toBe(100);

    const ofcStats = compileOriginStats('p1', 'Maria', [attempt], 'official');
    expect(ofcStats.totalCorrect).toBe(0);
    expect(ofcStats.totalQuestions).toBe(1);
    expect(ofcStats.accuracy).toBe(0);
  });
});
