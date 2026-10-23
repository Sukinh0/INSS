import { describe, expect, it } from 'vitest';
import { computeStudyStreak, dayKey, shiftDay, streakMessage, STUDY_FLOWERS, flowerForStudyDay } from './streak';
import type { Attempt } from '../types';
import { emptyCozy, type CozyProgress } from './cozy';

const now = new Date('2026-10-22T21:15:00-03:00');
const attempt = (finishedAt: string): Attempt => ({
  id:finishedAt, profileId:'p', profileName:'Estudante', startedAt:finishedAt,
  finishedAt, elapsedSeconds:60, gradeMode:'cebraspe', questionIds:['x'],
  snapshots:[{id:'x'} as Attempt['snapshots'][number]], answers:{x:'E'},
  subjects:['Língua Portuguesa'],correct:0,wrong:1,blank:0,score:-1,accuracy:0
});
const cozy=(events: {kind:'petal'|'session'|'card'; at:string; rating?:'review'|'known'}[]): CozyProgress=>({
  version:1, events:events.map((e,i)=>({id:String(i),itemId:'item-'+i,...e}))
});

describe('sequência Girassol',()=>{
  it('usa meia-noite de São Paulo, não meia-noite UTC',()=>{
    expect(dayKey('2026-10-23T02:59:00Z')).toBe('2026-10-22');
    expect(dayKey('2026-10-23T03:01:00Z')).toBe('2026-10-23');
    expect(shiftDay('2026-03-01',-1)).toBe('2026-02-28');
  });
  it('um simulado com nota negativa conta como dia estudado',()=>{
    const info=computeStudyStreak([attempt('2026-10-22T08:20:00-03:00')],emptyCozy(),now);
    expect([info.current,info.best,info.totalDays,info.studiedToday]).toEqual([1,1,1,true]);
    expect(info.days.at(-1)?.studied).toBe(true);
  });
  it('consolida várias atividades no mesmo dia como um único dia',()=>{
    const info=computeStudyStreak([
      attempt('2026-10-21T16:00:00-03:00'),
      attempt('2026-10-21T19:00:00-03:00')
    ],cozy([
      {kind:'petal',at:'2026-10-21T20:00:00-03:00'},
      {kind:'card',at:'2026-10-22T12:00:00-03:00',rating:'review'},
      {kind:'session',at:'2026-10-22T14:00:00-03:00'}
    ]),now);
    expect([info.totalDays,info.current,info.best,info.studiedToday]).toEqual([2,2,2,true]);
  });
  it('mantém a sequência de ontem antes de completar a tarefa de hoje',()=>{
    const info=computeStudyStreak([attempt('2026-10-21T15:00:00-03:00')],emptyCozy(),now);
    expect(info.current).toBe(1);
    expect(info.studiedToday).toBe(false);
    expect(streakMessage(info)).toContain('continua');
  });
  it('retoma a partir de zero após uma pausa, sem apagar o recorde',()=>{
    const info=computeStudyStreak([
      attempt('2026-10-17T14:00:00-03:00'),
      attempt('2026-10-18T14:00:00-03:00'),
      attempt('2026-10-19T14:00:00-03:00')
    ],emptyCozy(),now);
    expect(info.current).toBe(0);
    expect(info.best).toBe(3);
    expect(info.totalDays).toBe(3);
    expect(streakMessage(info)).toContain('Recomeçar');
  });
  it('ignora datas inválidas e futuras',()=>{
    const p=cozy([
      {kind:'petal',at:'data inválida'},
      {kind:'card',at:'2026-10-22T09:00:00-03:00'}, // sem avaliação
      {kind:'session',at:'2026-10-23T23:00:00-03:00'}
    ]);
    const info=computeStudyStreak([attempt('2050-01-01T00:00:00Z')],p,now);
    expect(info.totalDays).toBe(0);
    expect(info.current).toBe(0);
  });
  it('conserva a sequência e o recorde ao combinar sessões salvas e nuvem',()=>{
    const p=cozy([{kind:'card',rating:'known',at:'2026-10-20T10:00:00-03:00'}]);
    const info=computeStudyStreak([
      attempt('2026-10-21T10:00:00-03:00'),
      attempt('2026-10-22T10:00:00-03:00')
    ],p,now);
    expect(info.current).toBe(3);
    expect(info.nextMilestone).toBe(7);
    expect(info.days).toHaveLength(7);
  });
  it('possui 11 flores visivelmente distintas sem repetição na primeira volta',()=>{
    expect(STUDY_FLOWERS).toHaveLength(11);
    expect(new Set(STUDY_FLOWERS.map(f=>f.emoji)).size).toBe(11);
    expect(new Set(STUDY_FLOWERS.map(f=>f.name)).size).toBe(11);
    expect(flowerForStudyDay(1)).toEqual({emoji:'🌻',name:'Girassol'});
    expect(flowerForStudyDay(11)).toEqual({emoji:'💐',name:'Buquê de flores'});
  });
  it('repete o ciclo após todas as flores, sem apagar o histórico',()=>{
    expect(flowerForStudyDay(12)).toEqual(flowerForStudyDay(1));
    expect(flowerForStudyDay(22)).toEqual(flowerForStudyDay(11));
    expect(flowerForStudyDay(23)).toEqual(flowerForStudyDay(1));
    const attempts=Array.from({length:12},(_,i)=>
      attempt(`${shiftDay('2026-10-22',i-11)}T15:00:00-03:00`)
    );
    const info=computeStudyStreak(attempts,emptyCozy(),now);
    expect(info.totalDays).toBe(12);
    expect(info.current).toBe(12);
    expect(info.latestFlower).toEqual(STUDY_FLOWERS[0]);
    expect(info.days.at(-1)?.flower).toEqual(STUDY_FLOWERS[0]);
    expect(info.days.at(-2)?.flower).toEqual(STUDY_FLOWERS[10]);
  });
  it('entrega uma única flor por data, mesmo havendo vários estudos no mesmo dia',()=>{
    const info=computeStudyStreak([
      attempt('2026-10-21T11:00:00-03:00'),
      attempt('2026-10-21T18:00:00-03:00'),
      attempt('2026-10-22T11:00:00-03:00')
    ],emptyCozy(),now);
    expect(info.totalDays).toBe(2);
    expect(info.days.at(-2)?.flower).toEqual(STUDY_FLOWERS[0]);
    expect(info.days.at(-1)?.flower).toEqual(STUDY_FLOWERS[1]);
  });
  it('não concede flor em dia sem estudo, mas continua a coleção após uma pausa',()=>{
    const info=computeStudyStreak([
      attempt('2026-10-16T11:00:00-03:00'),
      attempt('2026-10-18T11:00:00-03:00'),
      attempt('2026-10-22T11:00:00-03:00')
    ],emptyCozy(),now);
    expect(info.current).toBe(1);
    expect(info.best).toBe(1);
    expect(info.days[0].flower).toEqual(STUDY_FLOWERS[0]);
    expect(info.days[1].flower).toBeUndefined();
    expect(info.days[2].flower).toEqual(STUDY_FLOWERS[1]);
    expect(info.days[6].flower).toEqual(STUDY_FLOWERS[2]);
    expect(info.latestFlower).toEqual(STUDY_FLOWERS[2]);
  });
  it('não concede flor se não houve aprendizado registrado',()=>{
    const info=computeStudyStreak([],emptyCozy(),now);
    expect(info.totalDays).toBe(0);
    expect(info.latestFlower).toBeUndefined();
    expect(info.days.every(d=>d.flower===undefined)).toBe(true);
  });

});
