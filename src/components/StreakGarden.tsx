import { ArrowRight, CalendarDays, Flower2, Sun } from 'lucide-react';
import type { StudyStreak } from '../lib/streak';
import { streakMessage } from '../lib/streak';
import '../streak.css';

type Props={ streak: StudyStreak; onStudy?: () => void; compact?: boolean };

export default function StreakGarden({streak,onStudy,compact=false}: Props) {
  const progress=Math.min(100,100*streak.current/streak.nextMilestone);
  return <section className={`streak-garden ${compact?'streak-garden-compact':''}`} aria-label="Sequência de dias de estudo">
    <div className="streak-garden-intro">
      <div className="streak-garden-main">
        <span className="streak-bloom" aria-hidden="true">{streak.latestFlower?.emoji ?? '🌱'}</span>
        <div>
          <div className="streak-eyebrow"><Sun size={15}/> SEQUÊNCIA GIRASSOL</div>
          <h2><strong>{streak.current}</strong> {streak.current===1?'dia de estudo':'dias de estudo'}</h2>
          <p>{streakMessage(streak)}</p>
        </div>
      </div>
      <div className="streak-best"><Flower2 size={18}/><span>Melhor sequência<strong>{streak.best} {streak.best===1?'dia':'dias'}</strong></span></div>
    </div>
    <div className="streak-week" aria-label="Atividade nos últimos sete dias">
      {streak.days.map(item=><div key={item.date} className={`streak-week-day ${item.studied?'streak-week-done':''} ${item.today?'streak-week-today':''}`}>
        <small>{item.label}</small>
        <span title={`${item.date}: ${item.flower?`estudou — ${item.flower.name} ${item.flower.emoji}`:'sem registro de estudo'}`} aria-label={`${item.label}, ${item.date}: ${item.flower?`estudou e ganhou ${item.flower.name}`:'sem estudo registrado'}`}>
          {item.flower?.emoji ?? (item.today?'🌱':'·')}
        </span>
      </div>)}
    </div>
    <p className="streak-flower-cycle">🌷 Cada dia de estudo traz uma flor diferente. Após 11 flores, o jardim recomeça a coleção!</p>
    <div className="streak-milestone">
      <div className="streak-milestone-caption"><span><CalendarDays size={15}/> Próxima florada</span><strong>{streak.nextMilestone} dias</strong></div>
      <div className="streak-milestone-track" role="progressbar" aria-label="Caminho até a próxima florada" aria-valuemin={0} aria-valuemax={streak.nextMilestone} aria-valuenow={streak.current}><span style={{width:`${progress}%`}}/></div>
    </div>
    {onStudy && !streak.studiedToday && <button type="button" className="streak-study-link" onClick={onStudy}>Cultivar hoje no Meu Cantinho <ArrowRight size={16}/></button>}
    {streak.studiedToday && <div className="streak-today-ok">✓ Sua sementinha de hoje já foi cuidada. Sem mais obrigações!</div>}
    <p className="streak-disclaimer">Conta dias com simulado concluído, Girassol ou Cartinhas. Acertos não são necessários; não altera a nota ou o ranking.</p>
  </section>;
}
