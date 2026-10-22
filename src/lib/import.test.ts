import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from 'vitest';
import { analyzeImport, parseQuestions } from './import';
import { isAvailableForQuiz } from './origin';

test('importa CSV com vírgulas dentro de aspas', () => {
  const csv = 'id,subject,topic,statement,correct,explanation\n1,Português,Gramática,"Sim, está correto",C,"Sim, por esta razão"';
  const r = parseQuestions(csv,'x.csv');
  expect(r[0].statement).toBe('Sim, está correto');
  expect(r[0].correct).toBe('C');
});

test('rejeita itens sem gabarito e links inseguros', () => {
  expect(() => parseQuestions('[{"id":"1"}]','x.json')).toThrow();
  expect(() => parseQuestions(JSON.stringify([{id:'1',subject:'A',topic:'B',statement:'C',correct:'E',explanation:'D',sourceUrl:'javascript:alert(1)'}]),'x.json')).toThrow();
});

test('importa questão de múltipla escolha FCC em CSV', () => {
  const csv = 'id,subject,topic,statement,correct,explanation,optionA,optionB,optionC,optionD,optionE\n2,Português,Interpretação,Qual está correta?,B,Alternativa B,Um,Dois,Três,Quatro,Cinco';
  const data = parseQuestions(csv,'2012.csv');
  expect(data[0].options).toEqual(['Um','Dois','Três','Quatro','Cinco']);
  expect(data[0].correct).toBe('B');
});

test('rejeita paráfrase sintética gerada por IA', () => {
  const fakeAi = JSON.stringify([{
    id: 'ai-fake-01',
    subject: 'Direito Previdenciário',
    topic: 'RGPS',
    statement: 'Como inteligência artificial, reformulei a questão sobre filiação ao RGPS...',
    correct: 'C',
    explanation: 'Justificativa sintética.'
  }]);
  expect(() => parseQuestions(fakeAi, 'ai.json')).toThrow(/paráfrase sintética de IA não é permitida/);
});

test('rejeita itens 91-95 se faltar contexto do seguro-defeso', () => {
  const missingContext = JSON.stringify([{
    id: 'inss-oficial-cebraspe-2022-760-001-091',
    subject: 'Direito Previdenciário',
    topic: 'Seguro-defeso',
    statement: 'Manoel está habilitado para usufruir o seguro-desemprego.',
    correct: 'C',
    explanation: 'Comentário.',
    source: {
      kind: 'official',
      organizer: 'Cebraspe',
      institution: 'INSS',
      job: 'Técnico do Seguro Social',
      examYear: 2022,
      bookletCode: '760_INSS_001_01',
      itemNumber: 91,
      definitiveKeyUrl: 'https://cdn.cebraspe.org.br/concursos/INSS_22/arquivos/GAB_DEFINITIVO_760_INSS_001_01.PDF'
    }
  }]);
  expect(() => parseQuestions(missingContext, 'inss.json')).toThrow(/exigem o enunciado de contexto compartilhado sobre o seguro-defeso/);
});

test('rejeita item 107 se faltar menção à EC 103/2019', () => {
  const missingEc = JSON.stringify([{
    id: 'inss-oficial-cebraspe-2022-760-001-107',
    subject: 'Direito Constitucional',
    topic: 'EC 103/2019',
    statement: 'Desde a promulgação, passou a ser obrigatória a instituição de RPPS.',
    correct: 'E',
    explanation: 'Comentário.',
    source: {
      kind: 'official',
      organizer: 'Cebraspe',
      institution: 'INSS',
      job: 'Técnico do Seguro Social',
      examYear: 2022,
      bookletCode: '760_INSS_001_01',
      itemNumber: 107,
      definitiveKeyUrl: 'https://cdn.cebraspe.org.br/concursos/INSS_22/arquivos/GAB_DEFINITIVO_760_INSS_001_01.PDF'
    }
  }]);
  expect(() => parseQuestions(missingEc, 'inss.json')).toThrow(/exige o contexto da Emenda Constitucional 103\/2019/);
});

test('valida e importa com perfeição os 60 itens oficiais extraídos do caderno 760_INSS_001_01', () => {
  const filePath = path.resolve(__dirname, '../../../INSS_OFICIAIS_60/output/inss_2022_60_para_importar.json');
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, 'utf-8');
  const items = parseQuestions(content, 'inss_2022_60_para_importar.json');
  expect(items).toHaveLength(60);

  const report = analyzeImport(items);
  expect(report.official).toBe(60);
  expect(report.authorial).toBe(0);
  expect(report.unverified).toBe(0);
  expect(report.annulled).toBe(0);
  expect(report.outdated).toBe(0);

  // Todos os 60 devem estar aptos para simulados no modo 'official'
  for (const q of items) {
    expect(q.source.kind).toBe('official');
    expect(q.source.verification).toBe('verified');
    expect(q.status).toBe('active');
    expect(isAvailableForQuiz(q, 'official')).toBe(true);
  }
});
