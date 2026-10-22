import initial from '../data/questions.json';
import { describe, expect, it } from 'vitest';

describe('Expansão do banco INSS (+120 questões Certo/Errado)', () => {
  const novas = initial.filter(q => q.id.startsWith('inss-ce-2026-'));

  it('possui total de 234 questões na base', () => {
    expect(initial).toHaveLength(234);
  });

  it('possui 120 novas questões e exatamente 15 por matéria', () => {
    expect(novas).toHaveLength(120);
    const mapa = novas.reduce<Record<string, number>>((acc, q) => {
      acc[q.subject] = (acc[q.subject] || 0) + 1;
      return acc;
    }, {});
    expect(Object.keys(mapa)).toHaveLength(8);
    expect(Object.values(mapa).every(n => n === 15)).toBe(true);
  });

  it('não duplica ids e preserva o padrão certo/errado', () => {
    expect(new Set(initial.map(q => q.id)).size).toBe(initial.length);
    for (const q of novas) {
      expect(['C', 'E']).toContain(q.correct);
      expect('options' in q).toBe(false);
      expect(q.explanation.trim().length).toBeGreaterThan(20);
    }
  });
});
