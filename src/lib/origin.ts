import type { Answer, OriginFilter, OriginKind, PublicationStatus, Question, SourceInfo, Verification } from '../types';

/**
 * Validador seguro de URLs HTTPS para fontes primárias e cadernos.
 */
export function isValidHttpsUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Chave determinística para deduplicação e checagem de integridade de questões oficiais.
 * Tupla: (organizer, examYear, examId, bookletCode, itemNumber)
 */
export function getOfficialKey(source: Partial<SourceInfo>): string | null {
  if (!source.organizer || !source.examYear || !source.bookletCode || !source.itemNumber) {
    return null;
  }
  const org = String(source.organizer).trim().toLowerCase();
  const year = String(source.examYear).trim();
  const examId = String(source.examId || 'inss-default').trim().toLowerCase();
  const booklet = String(source.bookletCode).trim().toLowerCase();
  const item = String(source.itemNumber).trim();
  return `${org}|${year}|${examId}|${booklet}|${item}`;
}

/**
 * Verifica se um registro possui todas as fontes primárias e metadados
 * estritamente exigidos para receber o selo 'oficial'.
 */
export function isVerifiableOfficial(raw: Record<string, unknown>, source?: Partial<SourceInfo>): boolean {
  const src = source || (raw.source as Partial<SourceInfo> | undefined) || {};
  const organizer = String(src.organizer || raw.organizer || '').trim();
  const institution = String(src.institution || raw.institution || '').trim();
  const job = String(src.job || raw.job || '').trim();
  const examYear = Number(src.examYear || raw.examYear);
  const bookletCode = String(src.bookletCode || raw.bookletCode || '').trim();
  const itemNumber = Number(src.itemNumber || raw.itemNumber);
  const definitiveKeyUrl = String(src.definitiveKeyUrl || raw.definitiveKeyUrl || '').trim();

  if (!organizer || !institution || !job || !examYear || !bookletCode || !itemNumber) {
    return false;
  }
  if (!isValidHttpsUrl(definitiveKeyUrl)) {
    return false;
  }
  return true;
}

/**
 * Normaliza qualquer questão (legada, importada, backup ou base) para o modelo estruturado.
 * É PURA, DETERMINÍSTICA e IDEMPOTENTE.
 */
export function normalizeQuestion(rawInput: unknown): Question {
  if (!rawInput || typeof rawInput !== 'object') {
    throw new Error('Questão inválida: não é um objeto.');
  }

  const raw = rawInput as Record<string, unknown>;
  const id = String(raw.id || crypto.randomUUID()).trim();
  const subject = String(raw.subject || 'Conhecimentos Gerais').trim();
  const topic = String(raw.topic || 'Geral').trim();
  const statement = String(raw.statement || '').trim();
  const explanation = String(raw.explanation || '').trim();
  const origin = typeof raw.origin === 'string' ? raw.origin.trim() : undefined;
  const sourceUrl = typeof raw.sourceUrl === 'string' && isValidHttpsUrl(raw.sourceUrl) ? raw.sourceUrl.trim() : undefined;

  let options: string[] | undefined;
  if (Array.isArray(raw.options) && raw.options.length) {
    options = raw.options.map(o => String(o).trim());
  }

  // Tratamento de gabarito e resposta oficial
  let correctRaw = raw.correct;
  let officialAnswer: 'C' | 'E' | 'X' | undefined;
  if (raw.officialAnswer === 'X' || raw.officialAnswer === 'C' || raw.officialAnswer === 'E') {
    officialAnswer = raw.officialAnswer;
  } else if (typeof correctRaw === 'string' && correctRaw.toUpperCase() === 'X') {
    officialAnswer = 'X';
  }

  // Sentinela de anulação
  let isAnnulled = officialAnswer === 'X' || raw.status === 'annulled';
  let status: PublicationStatus = 'active';

  if (isAnnulled) {
    status = 'annulled';
    officialAnswer = 'X';
  } else if (raw.status === 'outdated' || raw.status === 'under_review') {
    status = raw.status;
  }

  let correct: Answer | null = null;
  if (!isAnnulled) {
    if (typeof correctRaw === 'string') {
      const up = correctRaw.toUpperCase().trim();
      if (options?.length) {
        if ('ABCDE'.slice(0, options.length).includes(up)) {
          correct = up as Answer;
        }
      } else if (up === 'C' || up === 'E') {
        correct = up as Answer;
      }
    }
  }

  // Se não tem resposta válida pontuável e não é anulada, colocar sob revisão
  if (!correct && !isAnnulled) {
    status = 'under_review';
  }

  // Análise de Procedência (SourceInfo)
  const existingSource = (raw.source && typeof raw.source === 'object') ? (raw.source as Partial<SourceInfo>) : undefined;
  const declaredKind = existingSource?.kind || (raw.kind as OriginKind | undefined);

  let kind: OriginKind = 'unverified';
  let verification: Verification = 'pending';
  let label = existingSource?.label || origin || 'Origem não verificada';
  let author = existingSource?.author;

  // 1. Checagem de questão Oficial
  if (declaredKind === 'official') {
    if (isVerifiableOfficial(raw, existingSource)) {
      kind = 'official';
      verification = existingSource?.verification === 'verified' ? 'verified' : 'pending';
      const year = existingSource?.examYear || raw.examYear;
      const org = existingSource?.organizer || raw.organizer || 'Banca';
      const item = existingSource?.itemNumber || raw.itemNumber;
      label = existingSource?.label || `Oficial · INSS ${year} · ${org} · item ${item}`;
    } else {
      // Se não possui fontes comprovadas, NUNCA recebe status oficial
      kind = 'unverified';
      verification = 'pending';
      label = 'Origem não verificada (documentação incompleta)';
      if (status === 'active') status = 'under_review';
    }
  }
  // 2. Checagem de questão Autoral (base de 234 itens conhecidos ou autoral declarada)
  else if (
    declaredKind === 'authorial' ||
    id.startsWith('base-') ||
    id.startsWith('inss-ce-2026-') ||
    (origin && /autoral|treino|inédita/i.test(origin))
  ) {
    kind = 'authorial';
    verification = 'verified'; // Procedência declarada como material autoral de treino
    label = existingSource?.label || origin || 'Autoral • estilo Cebraspe';
    author = author || 'Material de estudo • estilo Cebraspe';
  }
  // 3. Demais registros importados ou legados sem evidência
  else {
    kind = 'unverified';
    verification = 'pending';
    label = existingSource?.label || origin || 'Origem não verificada';
    if (!existingSource && status === 'active' && !correct) {
      status = 'under_review';
    }
  }

  const source: SourceInfo = {
    kind,
    verification,
    label,
    ...(author ? { author } : {}),
    ...(existingSource?.organizer || raw.organizer ? { organizer: String(existingSource?.organizer || raw.organizer).trim() } : {}),
    ...(existingSource?.institution || raw.institution ? { institution: String(existingSource?.institution || raw.institution).trim() } : {}),
    ...(existingSource?.job || raw.job ? { job: String(existingSource?.job || raw.job).trim() } : {}),
    ...(existingSource?.examYear || raw.examYear ? { examYear: Number(existingSource?.examYear || raw.examYear) } : {}),
    ...(existingSource?.applicationDate || raw.applicationDate ? { applicationDate: String(existingSource?.applicationDate || raw.applicationDate).trim() } : {}),
    ...(existingSource?.examId || raw.examId ? { examId: String(existingSource?.examId || raw.examId).trim() } : {}),
    ...(existingSource?.bookletCode || raw.bookletCode ? { bookletCode: String(existingSource?.bookletCode || raw.bookletCode).trim() } : {}),
    ...(existingSource?.itemNumber || raw.itemNumber ? { itemNumber: Number(existingSource?.itemNumber || raw.itemNumber) } : {}),
    ...(isValidHttpsUrl(existingSource?.questionPaperUrl as string) ? { questionPaperUrl: existingSource!.questionPaperUrl } : (isValidHttpsUrl(raw.questionPaperUrl as string) ? { questionPaperUrl: String(raw.questionPaperUrl).trim() } : {})),
    ...(isValidHttpsUrl(existingSource?.definitiveKeyUrl as string) ? { definitiveKeyUrl: existingSource!.definitiveKeyUrl } : (isValidHttpsUrl(raw.definitiveKeyUrl as string) ? { definitiveKeyUrl: String(raw.definitiveKeyUrl).trim() } : {})),
    ...(existingSource?.reviewedAt ? { reviewedAt: existingSource.reviewedAt } : {}),
    ...(existingSource?.reviewedBy ? { reviewedBy: existingSource.reviewedBy } : {}),
    ...(existingSource?.reviewNote ? { reviewNote: existingSource.reviewNote } : {})
  };

  return {
    id,
    subject,
    topic,
    statement,
    correct,
    ...(options?.length ? { options } : {}),
    explanation,
    ...(origin ? { origin } : {}),
    ...(sourceUrl ? { sourceUrl } : {}),
    source,
    status,
    ...(officialAnswer ? { officialAnswer } : {}),
    ...(Array.isArray(raw.adaptedFrom) ? { adaptedFrom: raw.adaptedFrom.filter((v): v is string => typeof v === 'string' && v.length > 0).slice(0, 5) } : {}),
    ...(raw.contextId ? { contextId: String(raw.contextId).trim() } : {})
  };
}

/**
 * Valida se uma questão está apta para sorteio em simulado pontuável Cebraspe.
 * Itens anulados (X), desatualizados ou de origem não selecionada são excluídos.
 */
export function isAvailableForQuiz(
  q: Question,
  originFilter: OriginFilter = 'all',
  subjects: string[] = []
): boolean {
  if (q.status !== 'active') return false;
  if (!q.correct) return false;
  if (q.options?.length) {
    if (!'ABCDE'.slice(0, q.options.length).includes(q.correct)) return false;
  } else {
    if (q.correct !== 'C' && q.correct !== 'E') return false;
  }
  if (subjects.length > 0 && !subjects.includes(q.subject)) return false;

  if (originFilter === 'authorial') {
    return q.source.kind === 'authorial';
  }
  if (originFilter === 'official') {
    return q.source.kind === 'official' && q.source.verification === 'verified';
  }
  if (originFilter === 'mixed') {
    // Modo misturado só permite oficiais verificadas + autorais; NUNCA não verificadas
    return (
      (q.source.kind === 'authorial' && q.source.verification === 'verified') ||
      (q.source.kind === 'official' && q.source.verification === 'verified')
    );
  }
  return true;
}

/**
 * Formata os selos visuais de procedência conforme o design Amarelo Acolhedor.
 */
export function formatOriginBadge(source: SourceInfo, status?: PublicationStatus): {
  text: string;
  short: string;
  icon: string;
  tone: 'purple' | 'mint' | 'orange' | 'neutral' | 'rose';
} {
  if (status === 'annulled') {
    return {
      text: 'Questão anulada no gabarito definitivo',
      short: 'Anulada',
      icon: '❌',
      tone: 'rose'
    };
  }
  if (status === 'outdated') {
    return {
      text: 'Legislação alterada desde a prova',
      short: 'Legislação alterada',
      icon: '⚠️',
      tone: 'orange'
    };
  }
  if (status === 'under_review') {
    return {
      text: 'Em revisão pedagógica',
      short: 'Em revisão',
      icon: '🔍',
      tone: 'neutral'
    };
  }

  if (source.kind === 'official') {
    const org = source.organizer || 'Banca';
    const year = source.examYear ? ` ${source.examYear}` : '';
    const item = source.itemNumber ? ` · item ${source.itemNumber}` : '';
    return {
      text: `Oficial · INSS${year} · ${org}${item}`,
      short: 'Oficial',
      icon: '🏛️',
      tone: 'mint'
    };
  }

  if (source.kind === 'authorial') {
    return {
      text: source.label || 'Autoral · estilo Cebraspe',
      short: 'Autoral',
      icon: '✍️',
      tone: 'purple'
    };
  }

  return {
    text: 'Origem não verificada',
    short: 'Não verificada',
    icon: '⚠️',
    tone: 'neutral'
  };
}
