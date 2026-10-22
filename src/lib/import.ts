import type { Question } from '../types';
import { isValidHttpsUrl, normalizeQuestion } from './origin';

function readCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], cell = '', inside = false;
  const source = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === '"') {
      if (inside && source[i + 1] === '"') { cell += '"'; i++; }
      else inside = !inside;
    } else if (char === ',' && !inside) { row.push(cell); cell = ''; }
    else if ((char === '\n' || char === '\r') && !inside) {
      if (char === '\r' && source[i + 1] === '\n') i++;
      row.push(cell); if (row.some(x => x.trim())) rows.push(row);
      row = []; cell = '';
    } else cell += char;
  }
  if (inside) throw new Error('CSV inválido: há aspas sem fechamento.');
  row.push(cell); if (row.some(x => x.trim())) rows.push(row);
  return rows;
}

export type ImportReport = {
  total: number;
  authorial: number;
  official: number;
  unverified: number;
  annulled: number;
  outdated: number;
};

export function analyzeImport(items: Question[]): ImportReport {
  let authorial = 0, official = 0, unverified = 0, annulled = 0, outdated = 0;
  for (const q of items) {
    if (q.status === 'annulled') annulled++;
    else if (q.status === 'outdated') outdated++;

    if (q.source.kind === 'official' && q.source.verification === 'verified') official++;
    else if (q.source.kind === 'authorial') authorial++;
    else unverified++;
  }
  return { total: items.length, authorial, official, unverified, annulled, outdated };
}

export function parseQuestions(content: string, fileName: string): Question[] {
  let input: unknown;
  if (fileName.toLowerCase().endsWith('.csv')) {
    const [header, ...rows] = readCsv(content);
    if (!header) throw new Error('Arquivo vazio.');
    const fields = header.map(h => h.trim().toLowerCase());
    input = rows.map(row => Object.fromEntries(fields.map((key, i) => [key, row[i]?.trim() ?? ''])));
  } else {
    try { input = JSON.parse(content); } catch { throw new Error('JSON inválido. Confira a formatação.'); }
  }
  if (!Array.isArray(input) || !input.length) throw new Error('O arquivo deve conter uma lista de questões.');
  if (input.length > 400) throw new Error('Envie até 400 questões por arquivo.');
  const seen = new Set<string>();

  return input.map((entry, index) => {
    const q = entry as Record<string, unknown>;
    const id = String(q.id || `import-${index + 1}`).trim();
    const subject = String(q.subject || '').trim();
    const topic = String(q.topic || '').trim();
    const statement = String(q.statement || '').trim();
    const correctRaw = String(q.correct || '').trim().toUpperCase();
    const isAnnulled = correctRaw === 'X' || q.officialAnswer === 'X' || q.status === 'annulled';

    let options: string[] | undefined;
    if (Array.isArray(q.options)) options = q.options.map(x => String(x).trim());
    else if (typeof q.options === 'string' && q.options.trim()) {
      try { const opt = JSON.parse(q.options); if (Array.isArray(opt)) options = opt.map(x => String(x).trim()); }
      catch { throw new Error(`Questão ${index + 1}: o campo options deve ser um array JSON.`); }
    }
    if (!options) {
      const columns = ['optiona','optionb','optionc','optiond','optione'].map(k => String(q[k] || '').trim());
      if (columns.some(Boolean)) options = columns.filter(Boolean);
    }
    const explanation = String(q.explanation || (isAnnulled ? 'Item anulado pela banca examinadora.' : '')).trim();
    const origin = String(q.origin || 'Questão importada').trim();
    const sourceUrl = String(q.sourceUrl || q.sourceurl || '').trim();

    if (!id || !subject || !topic || !statement || (!explanation && !isAnnulled)) {
      throw new Error(`Questão ${index + 1}: preencha id, subject, topic, statement e explanation.`);
    }

    if (!isAnnulled) {
      if (options ? (options.length < 4 || options.length > 5 || options.some(x => !x || x.length > 1000) || !'ABCDE'.slice(0,options.length).includes(correctRaw)) : !['C','E'].includes(correctRaw)) {
        throw new Error(`Questão ${index + 1}: gabarito inválido para o formato de alternativas.`);
      }
    }

    if (seen.has(id)) throw new Error(`ID duplicado no arquivo: ${id}`);
    seen.add(id);

    if (statement.length > 4000 || explanation.length > 4000 || subject.length > 100 || topic.length > 100) {
      throw new Error(`Questão ${index + 1}: campo grande demais.`);
    }

    if (sourceUrl && (!isValidHttpsUrl(sourceUrl) || sourceUrl.length > 1000)) {
      throw new Error(`Questão ${index + 1}: sourceUrl precisa começar com https://`);
    }

    // Valida URLs de metadados se fornecidas
    const defKey = String(q.definitiveKeyUrl || (q.source as Record<string,unknown>)?.definitiveKeyUrl || '').trim();
    if (defKey && !isValidHttpsUrl(defKey)) {
      throw new Error(`Questão ${index + 1}: definitiveKeyUrl precisa começar com https://`);
    }
    const paperUrl = String(q.questionPaperUrl || (q.source as Record<string,unknown>)?.questionPaperUrl || '').trim();
    if (paperUrl && !isValidHttpsUrl(paperUrl)) {
      throw new Error(`Questão ${index + 1}: questionPaperUrl precisa começar com https://`);
    }

    // Normaliza determinística e puramente
    const normalized = normalizeQuestion({
      ...q,
      id,
      subject,
      topic,
      statement,
      correct: isAnnulled ? null : correctRaw,
      explanation,
      origin,
      ...(options ? { options } : {}),
      ...(sourceUrl ? { sourceUrl } : {})
    });

    return normalized;
  });
}

export const exampleQuestions: Question[] = [
  normalizeQuestion({
    id: 'minha-prova-001',
    subject: 'Seguridade Social',
    topic: 'Conceitos',
    statement: 'A seguridade social inclui saúde, previdência e assistência social.',
    correct: 'C',
    explanation: 'Conforme o art. 194 da Constituição Federal.',
    origin: 'Meu material de treino'
  })
];

