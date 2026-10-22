import { expect, test } from 'vitest';
import { parseBackup } from './backup';

test('restaura históricos no perfil ativo e recalcula pontuação', () => {
  const q = {id:'q1',subject:'Português',topic:'Crase',statement:'Há crase aqui.',correct:'E',explanation:'Não há crase.',origin:'Revisão'};
  const raw = JSON.stringify({app:'Rumo ao INSS',version:1,custom:[],attempts:[{id:'a',startedAt:'2026-01-01T00:00:00Z',finishedAt:'2026-01-01T00:01:00Z',gradeMode:'cebraspe',snapshots:[q],answers:{q1:'C'},score:99999}]});
  const result = parseBackup(raw,'novo-perfil','Maria');
  expect(result.attempts[0].score).toBe(-1);
  expect(result.attempts[0].profileId).toBe('novo-perfil');
  expect(result.attempts[0].profileName).toBe('Maria');
});
test('rejeita backup de origem desconhecida', () => {
  expect(() => parseBackup('{"app":"Outra coisa","version":1,"custom":[],"attempts":[]}', 'x', 'X')).toThrow('reconhecido');
});
