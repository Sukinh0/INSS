import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BookHeart, Check, ChevronRight, Heart, Lightbulb, RotateCcw, Sparkles, Sun, BookOpen, Flower2 } from 'lucide-react';
import type { Question } from '../types';
import { getCloudCozy, saveCloudCozy } from '../lib/firebase';
import { storage } from '../lib/storage';
import {
  MINI_LESSONS, chooseLessons, cozySubjects, emptyCozy, flashcardBank, mergeCozy,
  pickFlashcards, recordCozy, sanitizeCozy, sunflowerStage,
  type CozyKind, type CozyProgress, type CozySession
} from '../lib/cozy';
import '../cozy.css';

type Props = { profileId: string; profileName: string; questions: Question[]; cloudSync: boolean };
type Finished = { mode: CozyKind; count: number } | null;

export default function CozyStudy({ profileId, profileName, questions, cloudSync }: Props) {
  const [progress, setProgress] = useState<CozyProgress>(() => sanitizeCozy(storage.cozy(profileId)));
  const [session, setSession] = useState<CozySession | null>(() => storage.cozySession(profileId));
  const [finished, setFinished] = useState<Finished>(null);
  const [subject, setSubject] = useState('Todas');
  const [sunCount, setSunCount] = useState(3);
  const [cardCount, setCardCount] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const subjects = useMemo(() => cozySubjects(), []);
  const cards = useMemo(() => flashcardBank(questions, subject), [questions,subject]);
  const cardsById = useMemo(() => new Map(questions.map(q => [q.id, q])), [questions]);
  const stage = sunflowerStage(progress);
  const firstName = profileName.split(' ')[0] || 'florzinha';

  // Os registros de estudo são independentes do ranking, do histórico e das notas de prova.
  useEffect(() => {
    if (!cloudSync) return;
    let alive = true;
    setIsSyncing(true);
    getCloudCozy(profileId).then(remote => {
      if (!alive || storage.activeId() !== profileId) return;
      setProgress(prev => {
        const merged = mergeCozy(prev, remote);
        storage.saveCozy(profileId, merged);
        return merged;
      });
    }).catch(() => {
      if (alive) setFeedback('O cantinho continua funcionando aqui. Não foi possível carregar o progresso da nuvem.');
    }).finally(() => {if (alive) setIsSyncing(false);});
    return () => {alive = false;};
  }, [profileId,cloudSync]);

  function saveProgress(next: CozyProgress) {
    const normalized = sanitizeCozy(next);
    setProgress(prev => mergeCozy(prev,normalized));
    if (!storage.saveCozy(profileId,normalized)) setFeedback('Seu dispositivo está sem espaço para salvar o progresso do cantinho.');
    if (cloudSync) {
      saveCloudCozy(profileId,normalized).then(remote => {
        if (storage.activeId() !== profileId) return;
        setProgress(prev => {
          const merged=mergeCozy(prev,remote);
          storage.saveCozy(profileId,merged);
          return merged;
        });
      }).catch(() => setFeedback('Salvo neste dispositivo. A sincronização com Google não funcionou agora.'));
    }
  }
  function log(kind: 'petal'|'session'|'card', itemId: string, rating?: 'known'|'review') {
    // Leitura do armazenamento reduz perda de eventos em atualizações próximas.
    const next=recordCozy(mergeCozy(progress,storage.cozy(profileId)),kind,itemId,rating);
    saveProgress(next);
  }
  function saveSession(next: CozySession | null) {
    setSession(next);
    if (!storage.saveCozySession(profileId,next)) setFeedback('Não foi possível salvar a atividade em andamento.');
  }
  function startSunflower() {
    const lessons=chooseLessons(progress,sunCount,subject);
    if (!lessons.length) {setFeedback('Ainda não há aulas neste tema. Escolha Todas as matérias.'); return;}
    setFinished(null);
    saveSession({mode:'sunflower',ids:lessons.map(l=>l.id),index:0,phase:'learn',selected:null});
  }
  function startCards() {
    const list=pickFlashcards(cards,progress,cardCount,subject);
    if (!list.length) {setFeedback('Não encontramos cartinhas para esse tema. Escolha Todas as matérias.');return;}
    setFinished(null);
    saveSession({mode:'cards',ids:list.map(q=>q.id),index:0,flipped:false});
  }
  function answerSunflower(answer: 'C'|'E'|null) {
    if (!session || session.mode!=='sunflower' || session.phase==='feedback') return;
    const id=session.ids[session.index];
    // "Só quero ler" também conta como um passo, sem penalidade e sem precisar responder.
    log('petal',id);
    saveSession({...session,phase:'feedback',selected:answer});
  }
  function nextSunflower() {
    if (!session || session.mode!=='sunflower' || session.phase!=='feedback') return;
    if (session.index + 1 >= session.ids.length) {
      log('session','sunflower');
      setFinished({mode:'sunflower',count:session.ids.length});
      saveSession(null);
    } else saveSession({...session,index:session.index+1,phase:'learn',selected:null});
  }
  function rateCard(rating:'known'|'review') {
    if (!session || session.mode!=='cards' || !session.flipped) return;
    log('card',session.ids[session.index],rating);
    if (session.index + 1 >= session.ids.length) {
      setFinished({mode:'cards',count:session.ids.length});
      saveSession(null);
    } else saveSession({...session,index:session.index+1,flipped:false});
  }
  const heading = <div className="cozy-heading">
    <div className="cozy-eyebrow"><Sun size={16}/> SEU ESPAÇO SEM PRESSA</div>
    <h1>Meu Cantinho <span>🌻</span></h1>
    <p>Nos dias difíceis, um pouquinho também é um monte. Que bom ter você por aqui, {firstName}! 💛</p>
  </div>;

  if (session?.mode === 'sunflower') {
    const lesson=MINI_LESSONS.find(l=>l.id===session.ids[session.index]);
    if (!lesson) return <div className="cozy-page">{heading}<button className="btn btn-outline" onClick={()=>saveSession(null)}>Voltar ao cantinho</button></div>;
    const isCorrect=session.selected===lesson.correct;
    return <div className="cozy-page">{heading}
      <button className="cozy-back" onClick={()=>saveSession(null)}><ArrowLeft size={17}/> Voltar ao cantinho</button>
      <div className="cozy-activity-head"><span>🌻 Girassol · uma coisa de cada vez</span><span>{session.index+1} de {session.ids.length}</span></div>
      <div className="cozy-activity-progress" aria-label={`Etapa ${session.index+1} de ${session.ids.length}`}><span style={{width:`${(session.index+1)/session.ids.length*100}%`}}/></div>
      <section className="cozy-study-panel">
        <div className="cozy-subject">{lesson.subject}</div>
        {session.phase==='learn' && <>
          <div className="cozy-lesson-illustration" aria-hidden="true">🌼</div>
          <h2>{lesson.title}</h2><p className="cozy-teaching">{lesson.intro}</p>
          <p className="cozy-kind-note"><Heart size={16}/> Não precisa decorar nada. Só leia com calma.</p>
          <button className="btn btn-primary full" onClick={()=>saveSession({...session,phase:'ask'})}>Acho que entendi! <ArrowRight size={17}/></button>
          <button className="cozy-text-action" onClick={()=>answerSunflower(null)}>Hoje quero só ler <ChevronRight size={15}/></button>
        </>}
        {session.phase==='ask' && <>
          <div className="cozy-lesson-illustration" aria-hidden="true">💡</div>
          <h2>Vamos tentar uma perguntinha?</h2>
          <p className="cozy-statement">{lesson.statement}</p>
          <div className="cozy-answer-buttons">
            <button onClick={()=>answerSunflower('C')}><Check size={19}/> Certo</button>
            <button onClick={()=>answerSunflower('E')}><RotateCcw size={19}/> Errado</button>
          </div>
          <button className="cozy-text-action" onClick={()=>answerSunflower(null)}>Prefiro ver a explicação <ChevronRight size={15}/></button>
        </>}
        {session.phase==='feedback' && <>
          <div className="cozy-lesson-illustration" aria-hidden="true">{session.selected===null?'🌷':isCorrect?'🌻':'💛'}</div>
          <h2>{session.selected===null?'Aprender já é uma conquista!':isCorrect?'Você mandou bem!':'Tudo bem, agora você sabe!'}</h2>
          <p className="cozy-answer-reveal">Resposta: <strong>{lesson.correct==='C'?'Certo':'Errado'}</strong></p>
          <p className="cozy-teaching">{lesson.explanation}</p>
          <p className="cozy-kind-note"><Flower2 size={16}/> Cada passo ajuda seu jardim a florescer, mesmo sem acertar.</p>
          <button className="btn btn-primary full" onClick={nextSunflower}>{session.index+1===session.ids.length?'Concluir com carinho':'Continuar aprendendo'} <ArrowRight size={17}/></button>
        </>}
      </section>
      <p className="cozy-under-note">Sem cronômetro, sem nota e sem desconto por erro. 🌿</p>
    </div>;
  }

  if (session?.mode === 'cards') {
    const q=cardsById.get(session.ids[session.index]);
    if (!q) return <div className="cozy-page">{heading}<button className="btn btn-outline" onClick={()=>saveSession(null)}>Voltar ao cantinho</button></div>;
    return <div className="cozy-page">{heading}
      <button className="cozy-back" onClick={()=>saveSession(null)}><ArrowLeft size={17}/> Voltar ao cantinho</button>
      <div className="cozy-activity-head"><span>💌 Cartinhas do Saber</span><span>{session.index+1} de {session.ids.length}</span></div>
      <div className="cozy-activity-progress" aria-label={`Cartinha ${session.index+1} de ${session.ids.length}`}><span style={{width:`${(session.index+1)/session.ids.length*100}%`}}/></div>
      <div className="cozy-card-subject">{q.subject} · {q.topic}</div>
      <button type="button" className={`cozy-flashcard ${session.flipped?'cozy-flashcard-flipped':''}`}
        onClick={()=>saveSession({...session,flipped:!session.flipped})}
        aria-label={session.flipped?'Ver a frente da cartinha':'Virar cartinha e revelar resposta'}>
        <span className="cozy-flashcard-top">{session.flipped?'VERSO • AGORA VOCÊ SABE':'FRENTE • PENSE UM POUQUINHO'}</span>
        <span className="cozy-flashcard-icon" aria-hidden="true">{session.flipped?'💡':'✉️'}</span>
        {session.flipped ? <>
          <strong>{q.correct==='C'?'Certo':'Errado'}</strong>
          <span className="cozy-flashcard-body">{q.explanation}</span>
        </> : <>
          <strong>Certo ou Errado?</strong>
          <span className="cozy-flashcard-body">{q.statement}</span>
        </>}
        <span className="cozy-flashcard-hint"><RotateCcw size={15}/> Toque para {session.flipped?'ver a pergunta':'revelar a resposta'}</span>
      </button>
      {session.flipped ? <div className="cozy-rating">
        <p>Como foi essa cartinha? Não é prova, é só para organizar sua revisão.</p>
        <div><button onClick={()=>rateCard('review')}><Heart size={18}/> Quero revisar</button>
          <button onClick={()=>rateCard('known')}><Check size={18}/> Já sabia!</button></div>
      </div> : <p className="cozy-under-note">Pense na resposta e vire a cartinha quando quiser.</p>}
      <p className="cozy-under-note">Cartões adaptados do banco autoral. Não são questões oficiais em formato de flashcard.</p>
    </div>;
  }

  if (finished) return <div className="cozy-page">{heading}
    <section className="cozy-completed">
      <span className="cozy-completed-flower" aria-hidden="true">🌻</span>
      <h2>Seu esforço de hoje já valeu! 💛</h2>
      <p>{finished.mode==='sunflower'?`Você cuidou de ${finished.count} pequenos aprendizados.`:`Você revisou ${finished.count} cartinhas no seu ritmo.`}</p>
      <p>Você não precisa fazer mais nada agora. O que importa é que encontrou um jeitinho de continuar.</p>
      <button className="btn btn-primary" onClick={()=>setFinished(null)}>Voltar ao meu cantinho <ArrowRight size={17}/></button>
    </section>
  </div>;

  return <div className="cozy-page">{heading}
    <section className="cozy-welcome">
      <div><span className="cozy-pill"><Sparkles size={15}/> Dia leve, aprendizado real</span>
        <h2>Vamos aprender no seu tempo?</h2>
        <p>Escolha o que combina com você agora. Aqui não tem prova, pressão ou obrigação.</p>
      </div>
      <div className="cozy-garden" aria-label={`Jardim: ${stage.title}`}>
        <span className="cozy-garden-emoji" aria-hidden="true">{stage.emoji}</span>
        <strong>{stage.title}</strong>
        <small>{stage.petals} aprendizados · {stage.sessions} momentinhos Girassol concluídos</small>
      </div>
    </section>
    <div className="cozy-personalize">
      <label htmlFor="cozy-subject">Qual matéria vamos encontrar hoje?</label>
      <select id="cozy-subject" value={subject} onChange={e=>setSubject(e.target.value)}>
        <option value="Todas">Todas as matérias (surpresinha!)</option>
        {subjects.map(s=><option key={s} value={s}>{s}</option>)}
      </select>
    </div>
    <div className="cozy-mode-grid">
      <section className="cozy-mode-card cozy-sunflower-card">
        <div className="cozy-mode-icon">🌻</div>
        <span className="cozy-mode-eyebrow">APRENDER COM CALMA</span>
        <h2>Modo Girassol</h2>
        <p>Uma explicação pequenininha, uma pergunta fácil de começar e uma conquista para seu jardim.</p>
        <div className="cozy-option-label">Quanto cabe no seu dia?</div>
        <div className="cozy-lengths">
          {[{n:1,label:'1 passo'},{n:3,label:'3 passos'},{n:5,label:'5 passos'}].map(v=>
            <button key={v.n} className={sunCount===v.n?'selected':''} onClick={()=>setSunCount(v.n)}>{v.label}</button>)}
        </div>
        <button className="btn btn-primary full" onClick={startSunflower}>Cultivar meu girassol <ArrowRight size={17}/></button>
      </section>
      <section className="cozy-mode-card cozy-cards-card">
        <div className="cozy-mode-icon">💌</div>
        <span className="cozy-mode-eyebrow">LEMBRAR SEM PRESSÃO</span>
        <h2>Cartinhas do Saber</h2>
        <p>Pense, vire e veja a explicação. Diga “Já sabia” ou “Quero revisar” — sem nota, só aprendizado.</p>
        <div className="cozy-option-label">Quantas cartinhas?</div>
        <div className="cozy-lengths">{[5,10].map(n=><button key={n} className={cardCount===n?'selected':''} onClick={()=>setCardCount(n)}>{n} cartinhas</button>)}</div>
        <button className="btn btn-primary full" onClick={startCards} disabled={!cards.length}>Virar cartinhas <ArrowRight size={17}/></button>
        {!cards.length && <small>Não há cartinhas nesta matéria ainda.</small>}
      </section>
    </div>
    <div className="cozy-gentle-footer"><BookHeart size={18}/>
      Seu Cantinho é separado das notas, do ranking e do histórico de simulados. {isSyncing?'Sincronizando progresso...':cloudSync?'Progresso sincronizado com Google quando disponível.':'Seu jardim fica salvo neste dispositivo.'}
    </div>
    {feedback && <div className="cozy-warning" role="status">{feedback}<button aria-label="Fechar aviso" onClick={()=>setFeedback('')}>×</button></div>}
  </div>;
}
