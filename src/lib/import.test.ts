import { expect, test } from 'vitest';
import { parseQuestions } from './import';
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
