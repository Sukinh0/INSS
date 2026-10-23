import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ArrowLeft, ArrowRight, Award, BookOpen, Brain, Building2, CalendarDays, ChartNoAxesCombined,
  Check, CheckCircle2, ChevronDown, ChevronRight, CircleHelp, Clock3, Cloud,
  Download, ExternalLink, FileQuestion, FileUp, GraduationCap, Heart, Home,
  Lightbulb, LogOut, Medal, Menu, Plus, RotateCcw, Search, Settings2, ShieldCheck,
  Sparkles, Sun, Target, Trash2, TrendingUp, Trophy, X, XCircle
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { cloudEnabled, formatAuthError, getCloudCustom, loadCloudAttempts, loginGoogle, logoutGoogle, saveCloudAttempt, saveCloudCustom, saveCloudCozy, saveLeaderboard, syncProfile, toProfile, watchLeaderboard, watchUser } from './lib/firebase';
import { calculateResult, compileOriginStats, compileStats, formatAnswer, getWrongQuestionIds, pickQuestions, subjectBreakdown, summarizeMode, topicBreakdown } from './lib/engine';
import { generateAlternativeQuestions } from './lib/alternatives';
import { chooseQuizAnswer, isQuizAnswerRevealed, revealQuizAnswer } from './lib/quiz-feedback';
import { analyzeImport, exampleQuestions, parseQuestions } from './lib/import';
import { parseBackup } from './lib/backup';
import { formatOriginBadge, isAvailableForQuiz, normalizeQuestion } from './lib/origin';
import { storage } from './lib/storage';
import { mergeCozy } from './lib/cozy';
import CozyStudy from './components/CozyStudy';
import originalQuestions from './data/questions.json';
import officialQuestions from './data/questions_official.json';
import type { ActiveQuiz, Attempt, ExerciseFormat, GradeMode, OriginFilter, OriginKind, Profile, ProfileStats, Question, Selection } from './types';
import './styles.css';

type Page = 'home' | 'cozy' | 'setup' | 'quiz' | 'result' | 'progress' | 'ranking' | 'bank';
const BASE = [
  ...(originalQuestions as unknown[]).map(normalizeQuestion),
  ...(officialQuestions as unknown[]).map(normalizeQuestion)
];
const subjectIcons = ['📘','⚖️','✍️','🏛️','📋','🤝','💻','🧠'];
const knownSubjects = [...new Set(BASE.map(q => q.subject))];
const SOURCES = [
  { title: 'Edital oficial INSS 2022', desc: 'Conteúdo programático do Técnico do Seguro Social', url: 'https://cdn.cebraspe.org.br/concursos/inss_22/arquivos/ED_1_INSS_22_ABERTURA.PDF', year: '2022' },
  { title: 'Caderno 2022 — conhecimentos básicos', desc: 'Documento oficial com os 50 itens de conhecimentos básicos (código 760_INSS_CB1_01)', url: 'https://cdn.cebraspe.org.br/concursos/INSS_22/arquivos/760_INSS_CB1_01.PDF', year: '2022' },
  { title: 'Gabarito definitivo 2022 — conhecimentos básicos', desc: 'Itens 1 a 50; confira o item 49 anulado (X)', url: 'https://cdn.cebraspe.org.br/concursos/INSS_22/arquivos/GAB_DEFINITIVO_760_INSS_CB1_01.PDF', year: '2022' },
  { title: 'Gabarito definitivo 2022 — específicos', desc: 'Itens 51 a 120 (código 760_INSS_001_01); confira os itens anulados (X)', url: 'https://cdn.cebraspe.org.br/concursos/INSS_22/arquivos/GAB_DEFINITIVO_760_INSS_001_01.PDF', year: '2022' },
  { title: 'Portal oficial Cebraspe INSS 2022', desc: 'Cadernos, gabaritos, comunicados e alterações de gabarito', url: 'https://www.cebraspe.org.br/concursos/inss_22', year: '2022' },
  { title: 'Acervo de provas do INSS (2008, 2012, 2016 e 2022)', desc: 'Índice de provas históricas de Técnico; a prova FCC 2012 é de múltipla escolha', url: 'https://www.pciconcursos.com.br/provas/tecnico-do-seguro-social-abrangente', year: '2008–22' },
  { title: 'Prova INSS 2016 (Cebraspe)', desc: 'Referência para consultar o caderno da seleção', url: 'https://www.cebraspe.org.br/concursos/inss_2015', year: '2016' },
  { title: 'Gabarito definitivo 2016', desc: 'Caderno LUA — Técnico do Seguro Social, Cebraspe', url: 'https://cdn.cebraspe.org.br/concursos/inss_2015/arquivos/gab_definitivo_234inss_002_06_txt.pdf', year: '2016' }
];
function prettyDateTime(iso: string) { return new Date(iso).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}); }
function formatTime(seconds: number) { const min = Math.floor(seconds / 60); return min >= 60 ? `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}m` : `${min}min`; }
function download(content: string, filename: string, mime = 'application/json') {
  const link = document.createElement('a');
  const url = URL.createObjectURL(new Blob([content], {type: mime}));
  link.href = url; link.download = filename; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}
function Badge({children, tone='purple'}: {children: ReactNode, tone?:'purple'|'mint'|'rose'|'neutral'|'orange'}) {
  const toneClass = tone === 'purple' ? 'tag-purple' : tone === 'mint' ? 'tag-mint' : tone === 'rose' ? 'tag-rose' : tone === 'orange' ? 'tag-outdated' : 'tag-neutral';
  return <span className={`tag ${toneClass}`}>{children}</span>;
}
function StatIcon({children,tone='purple'}:{children:ReactNode,tone?:'purple'|'orange'|'green'|'blue'}) {return <span className={`stat-icon stat-${tone}`}>{children}</span>;}
function Avatar({name,photo,size='normal'}:{name:string,photo?:string,size?:'normal'|'large'|'small'}) { return <div className={`avatar avatar-${size}`} title={name}>{photo ? <img alt="" src={photo} referrerPolicy="no-referrer"/> : name.trim().slice(0,1).toUpperCase()}</div>; }

export default function App() {
  const [profiles, setProfiles] = useState<Profile[]>(() => storage.profiles());
  const [activeId, setActiveId] = useState(() => storage.activeId());
  const [attempts, setAttempts] = useState<Attempt[]>(() => storage.attempts(storage.activeId()));
  const [custom, setCustom] = useState<Question[]>(() => storage.custom(storage.activeId()).map(normalizeQuestion));
  const [quiz, setQuiz] = useState<ActiveQuiz | null>(() => storage.quiz(storage.activeId()));
  const [result, setResult] = useState<Attempt | null>(null);
  const [page, setPage] = useState<Page>('home');
  const [nameInput, setNameInput] = useState('');
  const [authUid, setAuthUid] = useState<string | null>(null);
  const [cloudRanking, setCloudRanking] = useState<ProfileStats[]>([]);
  const [authError, setAuthError] = useState('');
  const [toast, setToast] = useState('');
  const [drawer, setDrawer] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [setupOrigin, setSetupOrigin] = useState<OriginFilter>('authorial');
  const [setupCount, setSetupCount] = useState(10);
  const [setupSubjects, setSetupSubjects] = useState<string[]>([]);
  const [setupGrade, setSetupGrade] = useState<GradeMode>('cebraspe');
  const [setupFormat, setSetupFormat] = useState<ExerciseFormat>('ce');
  const [bankSearch, setBankSearch] = useState('');
  const [bankSubject, setBankSubject] = useState('Todas');
  const [bankTab, setBankTab] = useState<'questions'|'sources'|'import'>('questions');
  const [bankOrigin, setBankOrigin] = useState<'all' | 'authorial' | 'official' | 'unverified'>('all');
  const [progressOrigin, setProgressOrigin] = useState<'all' | 'authorial' | 'official'>('all');
  const [progressFormat, setProgressFormat] = useState<'ce' | 'alternatives' | 'all'>('ce');
  const [resultFilter, setResultFilter] = useState<'wrong'|'all'>('wrong');
  const fileInput = useRef<HTMLInputElement>(null);
  const backupInput = useRef<HTMLInputElement>(null);
  const profile = profiles.find(p => p.id === activeId);

  const allQuestions = useMemo(() => {
    const normCustom = custom.map(normalizeQuestion);
    return [...BASE, ...normCustom.filter(q => !BASE.some(b => b.id === q.id))];
  }, [custom]);

  const officialBankCount = useMemo(() => allQuestions.filter(q => q.source.kind === 'official' && q.source.verification === 'verified').length, [allQuestions]);
  const authorialBankCount = useMemo(() => allQuestions.filter(q => q.source.kind === 'authorial').length, [allQuestions]);
  const unverifiedBankCount = useMemo(() => allQuestions.filter(q => q.source.kind === 'unverified').length, [allQuestions]);

  const subjects = useMemo(() => [...new Set(allQuestions.map(q => q.subject))], [allQuestions]);
  const stats = useMemo(() => compileStats(activeId, profile?.name || 'Estudante', attempts, profile?.photo), [activeId, attempts, profile?.name, profile?.photo]);
  const breakdown = useMemo(() => subjectBreakdown(attempts), [attempts]);
  const wrongIds = useMemo(() => {
    const bankIds = new Set(allQuestions.map(q => q.id));
    return new Set([...getWrongQuestionIds(attempts)].filter(id => bankIds.has(id)));
  }, [attempts, allQuestions]);
  const today = new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'});

  useEffect(() => {
    if (!cloudEnabled) return;
    return watchUser(
      user => {
        if (!user) { setAuthUid(null); return; }
        const current = toProfile(user);
        setAuthUid(user.uid);
        setProfiles(prev => {
          const next = [...prev.filter(p => p.id !== user.uid), { ...prev.find(p => p.id === user.uid), ...current }];
          storage.saveProfiles(next); return next;
        });
        selectUser(current.id);
        syncProfile(current).catch(() => setAuthError('Não foi possível salvar o perfil na nuvem. Confira se o banco Firestore foi criado no Firebase Console.'));
        loadCloudAttempts(current.id).then(cloud => {
          if (storage.activeId() !== current.id) return;
          const local = storage.attempts(current.id);
          const merged = [...new Map([...local, ...cloud].map(a => [a.id, a])).values()].sort((a,b) => b.finishedAt.localeCompare(a.finishedAt));
          storage.saveAttempts(current.id, merged); setAttempts(merged);
          saveLeaderboard(compileStats(current.id,current.name,merged,current.photo)).catch(() => setAuthError('Ranking não pôde ser atualizado.'));
        }).catch(() => setAuthError('Falha ao sincronizar o histórico. Verifique se o Firestore foi criado no console.'));
        getCloudCustom(current.id).then(items => {
          if (storage.activeId() !== current.id) return;
          const merged = [...new Map([...storage.custom(current.id), ...items].map(q => [q.id,q])).values()];
          storage.saveCustom(current.id, merged); setCustom(merged);
        }).catch(() => setAuthError('O banco personalizado não pôde ser sincronizado.'));
      },
      err => setAuthError(formatAuthError(err))
    );
  // Intencional: observador de autenticação criado uma única vez
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!authUid) return;
    return watchLeaderboard(setCloudRanking, () => setAuthError('Ranking na nuvem indisponível. Confira as regras do Firestore.'));
  }, [authUid]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 3500); return () => clearTimeout(timer);
  }, [toast]);

  function selectUser(id: string) {
    storage.saveActiveId(id); setActiveId(id);
    setAttempts(storage.attempts(id)); setCustom(storage.custom(id)); setQuiz(storage.quiz(id));
    setResult(null); setPage('home'); setDrawer(false);
  }
  function createProfile() {
    const name = nameInput.trim().slice(0, 35);
    if (name.length < 2) { setAuthError('Digite um nome com pelo menos duas letras.'); return; }
    const next = { id: crypto.randomUUID(), name, createdAt: new Date().toISOString() };
    const data = [...profiles, next];
    setProfiles(data); storage.saveProfiles(data); selectUser(next.id); setAuthError(''); setNameInput('');
    setToast(`Bem-vinda, ${name}! 💜`);
  }
  function navigate(to: Page) { setDrawer(false); setPage(to); if (to !== 'result') setResult(null); }
  function setAnswer(value: Selection) {
    if (!quiz) return;
    const updated = chooseQuizAnswer(quiz, value);
    if (updated === quiz) return;
    setQuiz(updated); storage.saveQuiz(activeId, updated);
  }
  function checkAnswer() {
    if (!quiz) return;
    const updated = revealQuizAnswer(quiz);
    if (updated === quiz) return;
    setQuiz(updated); storage.saveQuiz(activeId, updated);
  }
  function setCurrent(index: number) {
    if (!quiz || index < 0 || index >= quiz.snapshots.length) return;
    const updated = {...quiz,current:index}; setQuiz(updated); storage.saveQuiz(activeId,updated);
  }
  function startQuiz() {
    const source = reviewMode ? allQuestions.filter(q => wrongIds.has(q.id)) : allQuestions;
    const chosen = setupFormat === 'alternatives'
      ? generateAlternativeQuestions(source, setupCount, setupOrigin, setupSubjects)
      : pickQuestions(source.filter(q => !q.options?.length), setupCount, setupSubjects, undefined, setupOrigin);
    if (quiz) {setToast('Finalize ou descarte o simulado atual antes de iniciar outro.'); return;}
    if (!chosen.length) {
      if (setupOrigin === 'official' && officialBankCount === 0) {
        setToast('Ainda não adicionamos provas oficiais verificadas. Escolha questões autorais para praticar.');
      } else {
        setToast(setupFormat === 'alternatives' ? 'São necessárias cinco afirmações compatíveis da mesma matéria para cada exercício A–E. Tente misturar matérias.' : 'Não há questões disponíveis nessa combinação.');
      }
      return;
    }
    const effectiveGrade = setupFormat === 'alternatives' ? 'normal' : setupGrade;
    if (effectiveGrade !== setupGrade) setToast('No treino A–E, cada exercício vale +1 acerto e erro não desconta pontos.');
    const next: ActiveQuiz = { profileId: activeId, startedAt: new Date().toISOString(), gradeMode: effectiveGrade, exerciseFormat: setupFormat, originFilter: setupOrigin, snapshots: chosen, answers: {}, checkedAnswers: {}, current: 0 };
    setQuiz(next); storage.saveQuiz(activeId,next); setPage('quiz');
  }
  function finishQuiz() {
    if (!quiz || !profile) return;
    const final = { ...calculateResult(quiz, new Date().toISOString()), profileName: profile.name };
    const updated = [final,...attempts];
    setAttempts(updated); storage.saveAttempts(activeId,updated);
    setResult(final); setQuiz(null); storage.saveQuiz(activeId,null); setPage('result'); setResultFilter('wrong');
    if (authUid && profile.cloud && authUid === activeId) {
      Promise.all([saveCloudAttempt(final), saveLeaderboard(compileStats(activeId, profile.name, updated, profile.photo))])
        .catch(() => setToast('Simulado salvo no dispositivo, mas não foi sincronizado.'));
    }
  }
  function openAttempt(attempt: Attempt) { setResult(attempt); setResultFilter('wrong'); setPage('result'); }
  async function importFile(file: File | undefined) {
    if (!file || !profile) return;
    if (file.size > 2_000_000) {setToast('Arquivo muito grande. Envie até 2 MB.'); return;}
    try {
      const items = parseQuestions(await file.text(),file.name);
      const report = analyzeImport(items);
      const newItems = items.filter(item => !BASE.some(q => q.id === item.id));
      if (!newItems.length) {
        setToast('Todas as questões do arquivo já estão ativas no acervo base!');
        setBankTab('questions');
        return;
      }
      const currentMap = new Map(custom.map(q => [q.id,q]));
      for (const item of newItems) {
        const existing = currentMap.get(item.id);
        if (existing && (existing.correct !== item.correct || existing.statement !== item.statement)) {
          throw new Error(`Conflito no item ${item.id}: texto ou gabarito divergem do registro existente.`);
        }
        currentMap.set(item.id,item);
      }
      const next = [...currentMap.values()];
      if (next.length > 400) throw new Error('Limite de 400 questões personalizadas por perfil.');
      if (!storage.saveCustom(activeId,next)) throw new Error('Espaço local insuficiente. Exporte antes seus dados.');
      setCustom(next);
      setToast(`${newItems.length} questões importadas (${report.authorial} autorais, ${report.official} oficiais, ${report.unverified} em revisão)!`);
      setBankTab('questions');
      if (authUid === activeId && profile.cloud) saveCloudCustom(activeId,next).catch(() => setToast('Importadas localmente, mas a sincronização falhou.'));
    } catch(e) {setToast((e as Error).message);} finally { if (fileInput.current) fileInput.current.value = ''; }
  }
  async function loadOfficialBatch() {
    setToast('As 60 questões oficiais do INSS 2022 já estão disponíveis e ativas no acervo padrão!');
    setBankTab('questions');
    setBankOrigin('official');
  }
  function clearCustom() {
    if (!custom.length || !confirm(`Apagar as ${custom.length} questões personalizadas? O histórico dos simulados será preservado.`)) return;
    setCustom([]); storage.saveCustom(activeId,[]);
    if (authUid === activeId && profile?.cloud) saveCloudCustom(activeId,[]).catch(() => setToast('Excluídas localmente; não foi possível sincronizar.'));
    setToast('Questões personalizadas removidas.');
  }
  function exportData() {
    download(JSON.stringify({app:'Rumo ao INSS', version:3, exportedAt: new Date().toISOString(), profile,attempts,custom,cozy:storage.cozy(activeId)},null,2),`rumo-inss-backup-v3-${new Date().toISOString().slice(0,10)}.json`);
  }
  async function importBackup(file: File | undefined) {
    if (!file || !profile) return;
    if (file.size > 8_000_000) {setToast('O backup deve ter até 8 MB.'); return;}
    try {
      const incoming = parseBackup(await file.text(), activeId, profile.name);
      const existing = new Map(attempts.map(a => [a.id,a]));
      const newItems = incoming.attempts.filter(a => !existing.has(a.id));
      for (const attempt of newItems) existing.set(attempt.id,attempt);
      const merged = [...existing.values()].sort((a,b) => b.finishedAt.localeCompare(a.finishedAt));
      const bank = new Map(custom.map(q => [q.id,q]));
      for (const q of incoming.custom) {
        if (!BASE.some(base => base.id === q.id)) bank.set(q.id,q);
      }
      if (bank.size > 400) throw new Error('O banco resultante teria mais de 400 questões importadas.');
      if (!storage.saveAttempts(activeId,merged) || !storage.saveCustom(activeId,[...bank.values()])) {
        throw new Error('Armazenamento local cheio: exporte o histórico e libere espaço.');
      }
      setAttempts(merged); setCustom([...bank.values()]);
      const cozyMerged=mergeCozy(storage.cozy(activeId),incoming.cozy);
      if (!storage.saveCozy(activeId,cozyMerged)) throw new Error('Sem espaço para guardar o progresso do Meu Cantinho.');
      setToast(`Backup restaurado: ${newItems.length} simulado(s) novo(s) e atividades leves preservadas.`);
      if (authUid === activeId && profile.cloud) {
        try {
          for (let index = 0; index < newItems.length; index += 10) {
            await Promise.all(newItems.slice(index,index+10).map(saveCloudAttempt));
          }
          await saveCloudCustom(activeId,[...bank.values()]);
          await saveCloudCozy(activeId,cozyMerged);
          await saveLeaderboard(compileStats(activeId,profile.name,merged,profile.photo));
        } catch {setAuthError('Backup restaurado neste dispositivo, mas a sincronização de alguns dados falhou.');}
      }
    } catch (error) {setToast((error as Error).message);} finally {if (backupInput.current) backupInput.current.value='';}
  }
  function startReview() {setSetupFormat('ce');setReviewMode(true);setSetupSubjects([]);setSetupCount(Math.min(10,wrongIds.size));setPage('setup');}

  const nav = [
    {id:'home',name:'Início',icon:<Home size={19}/>},
    {id:'cozy',name:'Meu Cantinho',icon:<Sun size={19}/>},
    {id:'setup',name:'Simulados',icon:<BookOpen size={19}/>},
    {id:'progress',name:'Minha evolução',icon:<ChartNoAxesCombined size={19}/>},
    {id:'ranking',name:'Ranking',icon:<Trophy size={19}/>},
    {id:'bank',name:'Questões e provas',icon:<FileQuestion size={19}/>}
  ] as const;

  if (!profile) return <div className="welcome-screen"><div className="welcome-decoration deco-one"/><div className="welcome-decoration deco-two"/><div className="welcome-card"><div className="logo-big"><GraduationCap size={27}/></div><Badge>Seu cantinho de estudos</Badge><h1>A sua aprovação começa aqui. <span>✨</span></h1><p>Estude no seu ritmo, descubra onde melhorar e comemore cada conquista. Um passo de cada vez!</p><label htmlFor="first-name">Como podemos te chamar?</label><input id="first-name" placeholder="Seu nome ou apelido" maxLength={35} value={nameInput} onChange={e => setNameInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && createProfile()}/><button className="btn btn-primary full" onClick={createProfile}>Começar meus estudos <ArrowRight size={18}/></button>{cloudEnabled && <><div className="or"><span>ou</span></div><button className="btn btn-outline full" onClick={() => loginGoogle().catch(e => setAuthError(formatAuthError(e)))}><Cloud size={18}/> Entrar com Google e sincronizar</button></>}{profiles.length > 0 && <><div className="or"><span>Continuar perfil salvo</span></div><div className="saved-profiles">{profiles.map(p => <button key={p.id} onClick={() => {if (p.cloud && authUid !== p.id) {setAuthError('Entre novamente com a conta Google deste perfil.');return;} selectUser(p.id);}}><Avatar name={p.name} photo={p.photo} size="small"/>{p.name}<ChevronRight size={15}/></button>)}</div></>}{authError && <p className="form-error">{authError}</p>}<p className="small-note"><ShieldCheck size={15}/> {cloudEnabled ? 'Perfil local ou conta Google sincronizada.' : 'Os dados ficam salvos neste dispositivo. Ative o Firebase para sincronizar.'}</p></div></div>;

  const localRanking = profiles.filter(p => !p.cloud).map(p => compileStats(p.id,p.name,storage.attempts(p.id),p.photo));
  const ranking = (authUid ? [...cloudRanking, ...localRanking] : profiles.map(p => compileStats(p.id,p.name, p.id === activeId ? attempts : storage.attempts(p.id),p.photo)))
    .filter(s => s.attempts > 0).sort((a,b) => b.points - a.points || b.accuracy - a.accuracy || a.profileName.localeCompare(b.profileName));
  const availableQuestions = allQuestions.filter(q => reviewMode ? wrongIds.has(q.id) : true).filter(q => isAvailableForQuiz(q, setupOrigin, setupSubjects) && !q.options?.length);
  const possibleAlternativeCount = generateAlternativeQuestions(availableQuestions, Number.MAX_SAFE_INTEGER, setupOrigin, setupSubjects, () => 0.43).length;
  const availableCount = setupFormat === 'alternatives' ? possibleAlternativeCount : availableQuestions.length;
  const qInBank = allQuestions.filter(q => {
    if (bankOrigin === 'official') return q.source.kind === 'official' && q.source.verification === 'verified';
    if (bankOrigin === 'authorial') return q.source.kind === 'authorial';
    if (bankOrigin === 'unverified') return q.source.kind === 'unverified';
    return true;
  }).filter(q => (bankSubject === 'Todas' || q.subject === bankSubject) && `${q.statement} ${q.topic} ${q.subject} ${q.source.label}`.toLowerCase().includes(bankSearch.toLowerCase()));

  const originFilterForStats: OriginKind | undefined = progressOrigin === 'all' ? undefined : progressOrigin;
  const filteredProgressAttempts = attempts.filter(a => progressFormat === 'all' || (a.exerciseFormat ?? 'ce') === progressFormat);
  const progressStats = compileOriginStats(activeId, profile.name, filteredProgressAttempts, originFilterForStats, profile.photo);
  const progressBreakdown = subjectBreakdown(filteredProgressAttempts, originFilterForStats);
  const progressWeakTopics = topicBreakdown(filteredProgressAttempts, originFilterForStats).filter(x => x.wrong > 0).slice(0, 4);

  return <div className="app-shell">
    <aside className={`sidebar ${drawer?'sidebar-open':''}`}>
      <div className="sidebar-head"><button className="brand" onClick={() => navigate('home')}><span className="brand-mark"><GraduationCap size={23}/></span><span>rumo<span className="brand-accent">ao</span>INSS<small>Meu espaço de estudos</small></span></button><button className="icon-btn mobile-only" aria-label="Fechar menu" onClick={() => setDrawer(false)}><X size={20}/></button></div>
      <div className="nav-caption">MENU PRINCIPAL</div>
      <nav aria-label="Navegação principal" className="side-nav">{nav.map(n => <button key={n.id} className={`nav-item ${page===n.id || (page==='quiz' && n.id==='setup')?'active':''}`} onClick={() => navigate(n.id)}>{n.icon}<span>{n.name}</span>{(n.id === 'setup' && quiz) && <span className="nav-dot"/>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="help-box"><span className="help-emoji">✨</span><strong>Você consegue!</strong><p>Cada questão é mais um passo na direção do seu sonho.</p><button onClick={() => {setReviewMode(false);setPage('setup');}}>Bora estudar <ArrowRight size={15}/></button></div><div className="sidebar-user"><Avatar name={profile.name} photo={profile.photo}/><div><strong>{profile.name}</strong><small>{authUid===activeId?'☁ Conta Google':'Perfil local'}</small></div><button className="icon-btn" title="Trocar de perfil" aria-label="Trocar de perfil" onClick={async () => {if (authUid) await logoutGoogle();storage.saveActiveId('');setActiveId('');setPage('home');}}><LogOut size={17}/></button></div></div>
    </aside>
    {drawer && <button className="drawer-overlay" aria-label="Fechar menu" onClick={() => setDrawer(false)}/>}
    <div className="main-column">
      <header className="topbar"><div className="topbar-left"><button className="icon-btn mobile-only" aria-label="Abrir menu" onClick={() => setDrawer(true)}><Menu size={22}/></button><span className="top-date"><CalendarDays size={15}/><span>{today}</span></span></div><div className="topbar-right">{cloudEnabled && !authUid && <button className="text-link cloud-entry" onClick={() => loginGoogle().catch(e => setAuthError(formatAuthError(e)))}>Entrar com Google</button>}<Badge tone={authUid===activeId?'mint':'neutral'}>{authUid===activeId?<><Cloud size={13}/> Google</>:<><ShieldCheck size={13}/> Local</>}</Badge><Avatar name={profile.name} photo={profile.photo} size="small"/></div></header>
      <main className="main-content">
        {page === 'home' && <>
          <div className="page-heading"><div><span className="eyebrow"><Sparkles size={15}/> SUA JORNADA DE ESTUDOS</span><h1>Oi, {profile.name.split(' ')[0]}! <span>👋</span></h1><p>Pronta para dar mais um passo rumo à sua aprovação?</p></div></div>
          <section className="hero-card"><div className="hero-content"><div className="hero-kicker"><span className="pulse-dot"/> O SEU FUTURO ESTÁ SENDO CONSTRUÍDO</div><h2>Um pouquinho todos os dias faz uma <em>grande diferença.</em></h2><p>Não precisa acertar tudo hoje. O importante é continuar evoluindo. 🌻</p><button className="btn btn-white" onClick={() => {if (quiz){setPage('quiz');return;}setReviewMode(false);setPage('setup');}}>{quiz?'Continuar simulado':'Começar um simulado'} <ArrowRight size={18}/></button></div><div className="hero-art" aria-hidden="true"><div className="orbit orbit-1"/><div className="orbit orbit-2"/><div className="art-star star-a">✦</div><div className="art-star star-b">✧</div><div className="book-art"><div className="book-page page-left"/><div className="book-page page-right"/><div className="book-center"/></div><span className="art-sparkle">✴</span></div></section>
          <div className="section-title-row"><h2>Seu progresso até aqui</h2><span className="muted">Cada conquista conta! 🌷</span></div>
          <div className="stats-grid"><div className="stat-card"><StatIcon tone="purple"><BookOpen size={22}/></StatIcon><div className="stat-number">{stats.attempts}</div><div className="stat-label">Simulados feitos</div><div className="stat-foot">Continue praticando</div></div><div className="stat-card"><StatIcon tone="green"><CheckCircle2 size={22}/></StatIcon><div className="stat-number">{stats.totalCorrect}</div><div className="stat-label">Questões certas</div><div className="stat-foot">Muito bem!</div></div><div className="stat-card"><StatIcon tone="orange"><Target size={22}/></StatIcon><div className="stat-number">{stats.accuracy}%</div><div className="stat-label">Taxa de acertos</div><div className="stat-foot">{stats.attempts?'Rumo aos 100%':'Seu ponto de partida'}</div></div><div className="stat-card"><StatIcon tone="blue"><Award size={22}/></StatIcon><div className="stat-number">{stats.points}</div><div className="stat-label">Pontos conquistados</div><div className="stat-foot">10 por acerto</div></div></div>
          <div className="dashboard-bottom"><div className="panel"><div className="panel-header"><div><span className="panel-kicker">PRÓXIMO PASSO</span><h3>O que vamos estudar?</h3></div><Brain size={21} className="muted"/></div><div className="quick-actions"><button onClick={() => {setReviewMode(false);setSetupSubjects([]);setSetupCount(10);setPage('setup');}}><span className="quick-ico purple"><FileQuestion size={22}/></span><span><strong>Simulado surpresa</strong><small>Questões de várias matérias</small></span><ChevronRight size={17}/></button><button onClick={() => {setReviewMode(false);setSetupSubjects([]);setPage('setup');}}><span className="quick-ico mint"><BookOpen size={22}/></span><span><strong>Escolher matérias</strong><small>Foque no que precisa melhorar</small></span><ChevronRight size={17}/></button><button onClick={() => navigate('cozy')}><span className="quick-ico peach"><Sun size={22}/></span><span><strong>Meu Cantinho 🌻</strong><small>Estudar sem pressão com Girassol e Cartinhas</small></span><ChevronRight size={17}/></button><button onClick={startReview} disabled={!wrongIds.size}><span className="quick-ico peach"><RotateCcw size={22}/></span><span><strong>Revisar meus erros</strong><small>{wrongIds.size ? `${wrongIds.size} questões esperando revisão` : 'Aparecerá após seus primeiros erros'}</small></span><ChevronRight size={17}/></button></div></div>
          <div className="panel recommendation-panel"><div className="panel-header"><div><span className="panel-kicker">FOCO INTELIGENTE</span><h3>Seu plano de melhoria</h3></div><Lightbulb size={21} className="muted"/></div>{breakdown.length ? <><p className="panel-intro">Com base nos simulados que você fez, vale dar mais atenção a:</p><div className="focus-list">{breakdown.slice(0,3).map((s,i) => <div key={s.subject} className="focus-item"><span className="focus-num">0{i+1}</span><span><strong>{s.subject}</strong><small>{s.correct} de {s.total} acertos • {s.accuracy}%</small></span><div className="mini-progress"><span style={{width:`${s.accuracy}%`}}/></div></div>)}</div><button className="text-link" onClick={() => navigate('progress')}>Ver análise completa <ArrowRight size={16}/></button></> : <div className="empty-compact"><span>🌱</span><strong>Tudo começa com o primeiro passo</strong><p>Faça um simulado para descobrir seus pontos fortes e onde vale revisar.</p></div>}</div></div>
          {attempts.length > 0 && <section className="panel recent-panel"><div className="panel-header"><h3>Últimos simulados</h3><button className="text-link" onClick={() => navigate('progress')}>Ver todos <ArrowRight size={15}/></button></div><div className="history-list">{attempts.slice(0,3).map(a => <button key={a.id} onClick={() => openAttempt(a)}><span className="history-icon"><CheckCircle2 size={19}/></span><span className="history-name">Simulado • {a.snapshots.length} questões<small>{prettyDateTime(a.finishedAt)} · {a.exerciseFormat==='alternatives'?'A–E adaptado':summarizeMode(a.gradeMode)}</small></span><strong>{a.accuracy}%</strong><ChevronRight size={17}/></button>)}</div></section>}
        </>}
        {page === 'cozy' && <CozyStudy key={activeId} profileId={activeId} profileName={profile.name} questions={allQuestions} cloudSync={authUid===activeId && !!profile.cloud}/>}
        {page === 'setup' && <><div className="page-heading"><div><span className="eyebrow"><Settings2 size={15}/> PERSONALIZE SEU ESTUDO</span><h1>Preparar simulado <span>✏️</span></h1><p>Escolha como quer praticar hoje. Você está no controle!</p></div></div>{quiz && <div className="resume-banner"><div><strong>Você tem um simulado em andamento.</strong><span>Retome de onde parou quando quiser.</span></div><button className="btn btn-primary" onClick={() => setPage('quiz')}>Continuar <ArrowRight size={17}/></button><button className="icon-btn" aria-label="Descartar simulado" title="Descartar simulado" onClick={() => {if (confirm('Descartar o simulado em andamento? Suas respostas atuais serão perdidas.')) {setQuiz(null);storage.saveQuiz(activeId,null);}}}><Trash2 size={17}/></button></div>}
          <div className="setup-layout"><section className="panel setup-main">
            <div className="form-section">
              <div className="form-section-head"><span className="step-number">1</span><div><h3>Que tipo de questões você quer praticar?</h3><p>Separe o treino entre exercícios inéditos e provas oficiais de concurso.</p></div></div>
              <div className="origin-choices-grid">
                <button
                  type="button"
                  className={`origin-choice-card ${setupOrigin==='authorial'?'selected':''}`}
                  onClick={()=>setSetupOrigin('authorial')}
                >
                  <div className="origin-choice-top"><span className="origin-emoji">✍️</span><span className="origin-badge-count">{authorialBankCount} itens</span></div>
                  <strong>Autorais</strong>
                  <small>Exercícios inéditos no estilo da banca Cebraspe</small>
                  <div className="origin-choice-check">{setupOrigin==='authorial'&&<Check size={16}/>}</div>
                </button>
                <button
                  type="button"
                  className={`origin-choice-card ${setupOrigin==='official'?'selected':''} ${officialBankCount===0?'disabled':''}`}
                  onClick={()=>{if (officialBankCount>0) setSetupOrigin('official');}}
                  disabled={officialBankCount===0}
                >
                  <div className="origin-choice-top"><span className="origin-emoji">🏛️</span><span className="origin-badge-count">{officialBankCount} itens</span></div>
                  <strong>Oficiais</strong>
                  <small>Questões reais aplicadas com caderno e gabarito definitivo conferidos</small>
                  <div className="origin-choice-check">{setupOrigin==='official'&&<Check size={16}/>}</div>
                </button>
                <button
                  type="button"
                  className={`origin-choice-card ${setupOrigin==='mixed'?'selected':''}`}
                  onClick={()=>setSetupOrigin('mixed')}
                >
                  <div className="origin-choice-top"><span className="origin-emoji">🎲</span><span className="origin-badge-count">{authorialBankCount + officialBankCount} itens</span></div>
                  <strong>Misturadas</strong>
                  <small>Treino integrado unindo oficiais verificadas e autorais</small>
                  <div className="origin-choice-check">{setupOrigin==='mixed'&&<Check size={16}/>}</div>
                </button>
              </div>
              {officialBankCount===0 && (
                <div className="origin-notice">
                  <CircleHelp size={15}/>
                  <span>Ainda não adicionamos provas oficiais verificadas. Você pode estudar com as autorais enquanto isso.</span>
                </div>
              )}
            </div>
            <div className="form-section"><div className="form-section-head"><span className="step-number">2</span><div><h3>Qual formato de exercício?</h3><p>Dois jeitos de praticar com o mesmo banco de conhecimento.</p></div></div><div className="grade-choices"><button className={setupFormat==='ce'?'selected':''} onClick={()=>{setSetupFormat('ce');setSetupGrade('cebraspe');}}><span className="grade-icon"><Target size={19}/></span><strong>Original • Certo ou Errado</strong><small>Uma afirmação por questão, com gabarito da banca nos itens oficiais.</small></button><button className={setupFormat==='alternatives'?'selected':''} onClick={()=>{setSetupFormat('alternatives');setSetupGrade('normal');}}><span className="grade-icon"><FileQuestion size={19}/></span><strong>Alternativas A–E</strong><small>Cinco afirmações originais combinadas em um exercício adaptado, com uma única resposta.</small></button></div>{setupFormat==='alternatives' && <div className="origin-notice"><CircleHelp size={15}/><span>Treino adaptado, não é uma questão A–E oficial da banca. Cada exercício utiliza 5 itens C/E da mesma matéria; acertos valem +1, erros valem 0.</span></div>}</div>
            <div className="form-section"><div className="form-section-head"><span className="step-number">3</span><div><h3>Quantas questões?</h3><p>Comece com poucas ou desafie seus conhecimentos.</p></div></div><div className="choice-row">{[5,10,20,30,50].map(count => <button key={count} className={`choice-chip ${setupCount===count?'selected':''}`} onClick={() => setSetupCount(count)}>{count}</button>)}<label className="custom-count-label">Outra <input aria-label="Número de questões" type="number" min={1} max={400} value={setupCount} onChange={e => setSetupCount(Math.max(1,Math.min(400,Number(e.target.value)||1)))}/></label></div></div><div className="form-section"><div className="form-section-head"><span className="step-number">4</span><div><h3>Quais matérias?</h3><p>Deixe todas misturadas ou selecione suas favoritas.</p></div></div><button className={`all-subjects ${!setupSubjects.length?'on':''}`} onClick={() => setSetupSubjects([])}><span><Sparkles size={18}/> Todas misturadas</span>{!setupSubjects.length && <Check size={18}/>}</button><div className="subjects-grid">{subjects.map((s,i) => <button key={s} className={`subject-choice ${setupSubjects.includes(s)?'selected':''}`} onClick={() => {setSetupSubjects(prev => prev.includes(s)?prev.filter(x => x!==s):[...prev,s]);}}><span className="subject-emoji">{subjectIcons[knownSubjects.indexOf(s)] || subjectIcons[i%subjectIcons.length]}</span><span>{s}<small>{setupFormat==='alternatives' ? `${generateAlternativeQuestions(availableQuestions.filter(q=>q.subject===s),Number.MAX_SAFE_INTEGER,setupOrigin,[s],()=>0.43).length} exercícios A–E` : `${allQuestions.filter(q => q.subject===s && (!reviewMode || wrongIds.has(q.id)) && !q.options?.length && isAvailableForQuiz(q, setupOrigin)).length} questões`}</small></span><span className="subject-check">{setupSubjects.includes(s)&&<Check size={13}/>}</span></button>)}</div></div><div className="form-section last"><div className="form-section-head"><span className="step-number">5</span><div><h3>Como quer ser avaliada?</h3><p>Você pode treinar sem pressão ou simular a banca.</p></div></div>{setupFormat==='alternatives' ? <div className="origin-notice"><CheckCircle2 size={15}/><span>Treino A–E: +1 acerto, 0 por erro ou em branco. Não utiliza penalidade Cebraspe.</span></div> : <div className="grade-choices"><button className={setupGrade==='normal'?'selected':''} onClick={() => setSetupGrade('normal')}><span className="grade-icon"><Heart size={19}/></span><strong>Treino leve</strong><small>Acertou? +1 ponto. Errou? Sem desconto.</small></button><button className={setupGrade==='cebraspe'?'selected':''} onClick={() => setSetupGrade('cebraspe')}><span className="grade-icon"><Target size={19}/></span><strong>Modo Cebraspe</strong><small>Acerto +1, erro −1, branco 0.</small></button></div>}</div></section><aside className="panel summary-panel"><span className="panel-kicker">TUDO PRONTO?</span><h3>Seu simulado</h3><div className="summary-illustration">📚<span>✦</span></div><div className="summary-line"><span>{setupFormat==='alternatives'?'Base utilizada':'Origem'}</span><strong>{setupOrigin==='authorial'?'✍️ Autorais':setupOrigin==='official'?'🏛️ Oficiais':'🎲 Misturadas'}</strong></div><div className="summary-line"><span>Questões</span><strong>{Math.min(setupCount,availableCount)} de {availableCount} disponíveis</strong></div><div className="summary-line"><span>Matérias</span><strong>{setupSubjects.length?`${setupSubjects.length} selecionadas`:'Todas misturadas'}</strong></div><div className="summary-line"><span>Formato</span><strong>{setupFormat==='alternatives'?'A–E adaptado':'Certo ou Errado'}</strong></div><div className="summary-line"><span>Correção</span><strong>{setupFormat==='alternatives'?'Sem desconto':setupGrade==='normal'?'Treino leve':'Cebraspe'}</strong></div><div className="summary-line"><span>Tipo</span><strong>{reviewMode?'Revisão de erros':'Questões variadas'}</strong></div>{reviewMode && <div className="inline-info"><RotateCcw size={15}/> Somente questões que você errou e ainda não acertou depois.</div>}<button className="btn btn-primary full large" onClick={startQuiz} disabled={!availableCount || !!quiz}>Iniciar simulado <ArrowRight size={18}/></button>{quiz && <p className="helper-center">Termine ou descarte o atual para começar outro.</p>}{setupCount>availableCount && <p className="helper-center">Serão usadas todas as questões disponíveis, sem repetição.</p>}</aside></div>
        </>}
        {page === 'quiz' && quiz && <QuizView quiz={quiz} onAnswer={setAnswer} onCheck={checkAnswer} onCurrent={setCurrent} onFinish={finishQuiz} onExit={() => setPage('home')}/>}
        {page === 'result' && result && <ResultView result={result} filter={resultFilter} setFilter={setResultFilter} onReturn={() => navigate('home')} onAgain={() => {setReviewMode(false);setPage('setup');}} onReview={startReview}/>}
        {page === 'progress' && <><div className="page-heading"><div><span className="eyebrow"><TrendingUp size={15}/> EVOLUÇÃO CONSTANTE</span><h1>Minha evolução <span>🌱</span></h1><p>Uma visão do quanto você já avançou. Compare-se apenas com quem você era ontem.</p></div><div className="page-actions"><button className="btn btn-outline" onClick={exportData}><Download size={17}/> Exportar backup</button><input ref={backupInput} type="file" accept=".json,application/json" hidden onChange={e=>importBackup(e.target.files?.[0])}/><button className="btn btn-outline" onClick={()=>backupInput.current?.click()}><FileUp size={17}/> Restaurar backup</button></div></div>
          <div className="progress-origin-row"><span>Formato do simulado:</span><div className="choice-row">
            <button className={`choice-chip ${progressFormat==='ce'?'selected':''}`} onClick={()=>setProgressFormat('ce')}>Certo/Errado</button>
            <button className={`choice-chip ${progressFormat==='alternatives'?'selected':''}`} onClick={()=>{setProgressFormat('alternatives');setProgressOrigin('all');}}>Alternativas A–E</button>
            <button className={`choice-chip ${progressFormat==='all'?'selected':''}`} onClick={()=>setProgressFormat('all')}>Todos</button>
          </div></div>
          <div className="progress-origin-row">
            <span>Filtrar desempenho por:</span>
            <div className="choice-row">
              <button className={`choice-chip ${progressOrigin === 'all' ? 'selected' : ''}`} onClick={() => setProgressOrigin('all')}>Geral</button>
              <button className={`choice-chip ${progressOrigin === 'authorial' ? 'selected' : ''}`} onClick={() => setProgressOrigin('authorial')}>✍️ Autorais</button>
              <button className={`choice-chip ${progressOrigin === 'official' ? 'selected' : ''}`} disabled={progressFormat==='alternatives'} onClick={() => setProgressOrigin('official')}>🏛️ Oficiais</button>
            </div>
          </div>
          <div className="stats-grid progress-stat-grid"><div className="stat-card"><StatIcon><BookOpen size={21}/></StatIcon><div className="stat-number">{progressStats.attempts}</div><div className="stat-label">Simulados</div></div><div className="stat-card"><StatIcon tone="green"><CheckCircle2 size={21}/></StatIcon><div className="stat-number">{progressStats.totalCorrect}</div><div className="stat-label">Acertos</div></div><div className="stat-card"><StatIcon tone="orange"><Target size={21}/></StatIcon><div className="stat-number">{progressStats.accuracy}%</div><div className="stat-label">Precisão {progressOrigin==='authorial'?'autoral':progressOrigin==='official'?'oficial':'geral'}</div></div><div className="stat-card"><StatIcon tone="blue"><Medal size={21}/></StatIcon><div className="stat-number">{progressStats.bestAccuracy}%</div><div className="stat-label">Melhor resultado</div></div></div>
          <div className="analytics-grid"><section className="panel chart-panel"><div className="panel-header"><div><span className="panel-kicker">TRAJETÓRIA</span><h3>Seu desempenho por simulado</h3></div></div>{filteredProgressAttempts.length ? <div className="chart-wrap"><ResponsiveContainer width="100%" height={240}><AreaChart data={[...filteredProgressAttempts].reverse().map((a,i) => ({name:`${i+1}º`,accuracy:a.accuracy}))} margin={{top:12,right:12,left:-26,bottom:0}}><defs><linearGradient id="areaColor" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#E7AD22" stopOpacity={0.28}/><stop offset="95%" stopColor="#E7AD22" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#EDE2C9" vertical={false}/><XAxis dataKey="name" tickLine={false} axisLine={false} tick={{fontSize:11,fill:'#675B45'}}/><YAxis domain={[0,100]} tickLine={false} axisLine={false} tick={{fontSize:11,fill:'#675B45'}}/><Tooltip formatter={(v) => [`${v}%`,'Acertos']}/><Area type="monotone" dataKey="accuracy" stroke="#B67D0E" strokeWidth={3} fill="url(#areaColor)" dot={{r:4,fill:'#B67D0E',stroke:'#FFFDF5',strokeWidth:2}}/></AreaChart></ResponsiveContainer></div> : <Empty title="Seu gráfico vai aparecer aqui" detail="Conclua um simulado para ver sua evolução ao longo do tempo."/>}</section><section className="panel chart-panel"><div className="panel-header"><div><span className="panel-kicker">POR DISCIPLINA</span><h3>Como estão suas matérias?</h3></div></div>{progressBreakdown.length?<div className="subject-bars">{progressBreakdown.map(s=><div className="subject-bar" key={s.subject}><div><strong>{s.subject}</strong><span>{s.accuracy}% <small>({s.total} itens)</small></span></div><div className="bar-track"><span style={{width:`${s.accuracy}%`,background:s.accuracy>=75?'#1C7041':s.accuracy>=50?'#E7AD22':'#D97706'}}/></div></div>)}</div>:<Empty title="Ainda sem dados por matéria" detail={progressOrigin==='official'?'Nenhuma questão oficial respondida ainda.':'Quando você responder questões, cada disciplina terá seu indicador.'}/>}</section></div>
          {progressWeakTopics.length>0 && <section className="panel weak-panel"><div className="panel-header"><div><span className="panel-kicker">OLHAR COM CARINHO</span><h3>Assuntos que merecem revisão</h3></div><Lightbulb size={22}/></div><div className="weak-grid">{progressWeakTopics.map(t => <div className="weak-card" key={`${t.subject}-${t.topic}`}><span>📖</span><strong>{t.topic}</strong><small>{t.subject}</small><div>{t.correct} acertos · {t.wrong} erros</div></div>)}</div></section>}
          <section className="panel recent-panel"><div className="panel-header"><h3>Histórico completo</h3><Badge tone="neutral">{attempts.length} simulados</Badge></div>{attempts.length ? <div className="history-list">{attempts.map(a => <button key={a.id} onClick={() => openAttempt(a)}><span className="history-icon"><BookOpen size={19}/></span><span className="history-name">{a.snapshots.length} questões · {a.exerciseFormat==='alternatives'?'A–E adaptado':summarizeMode(a.gradeMode)}<small>{prettyDateTime(a.finishedAt)} · {formatTime(a.elapsedSeconds)}</small></span><strong>{a.accuracy}%</strong><ChevronRight size={17}/></button>)}</div> : <Empty title="Nenhum simulado ainda" detail="Assim que você terminar o primeiro, ele aparecerá aqui."/>}</section>
        </>}
        {page === 'ranking' && <><div className="page-heading"><div><span className="eyebrow"><Trophy size={15}/> CADA PONTO É UMA VITÓRIA</span><h1>Ranking de estudos <span>🏆</span></h1><p>Uma competição saudável para manter a motivação lá em cima.</p></div></div><div className="rank-hero"><div><span>✨ QUEM ESTUDA, EVOLUI</span><h2>O maior prêmio é a sua aprovação!</h2><p>10 pontos por resposta correta. O ranking valoriza a prática, mas não substitui sua análise de desempenho.</p></div><div className="rank-art">🏆</div></div><section className="panel ranking-panel"><div className="panel-header"><h3>Classificação geral</h3><Badge>{ranking.length} participantes</Badge></div>{ranking.length ? <div className="rank-list">{ranking.map((p,i) => <div className={`rank-row ${p.profileId===activeId?'me':''}`} key={p.profileId}><span className={`rank-position rank-${i+1}`}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}º`}</span><Avatar name={p.profileName} photo={p.photo}/><div className="rank-person"><strong>{p.profileName} {p.profileId===activeId&&<Badge tone="mint">Você</Badge>}</strong><small>{p.attempts} simulados · {p.accuracy}% de acertos</small></div><div className="rank-points"><strong>{p.points}</strong><small>pontos</small></div></div>)}</div> : <Empty title="O pódio ainda está vazio" detail="Faça um simulado e conquiste os primeiros pontos!"/>}</section><div className="ranking-note"><CircleHelp size={18}/>{authUid===activeId?'Ranking amistoso da nuvem e dos perfis locais. As pontuações são informadas pelo aplicativo, sem auditoria antifraude.':'O ranking local reúne perfis deste dispositivo. Para competir entre aparelhos, ative Firebase e entre com Google. É um ranking amistoso, sem antifraude.'}</div></>}
        {page === 'bank' && <><div className="page-heading"><div><span className="eyebrow"><FileQuestion size={15}/> SUA BIBLIOTECA</span><h1>Questões e provas <span>📚</span></h1><p>Treino autoral, documentos de referência e espaço para suas próprias questões.</p></div></div><div className="bank-summary"><StatIcon><BookOpen size={25}/></StatIcon><div><strong>{allQuestions.length} questões catalogadas</strong><small>🏛️ Oficiais: {officialBankCount} verificadas · ✍️ Autorais: {authorialBankCount} disponíveis {unverifiedBankCount > 0 ? `· ⚠️ Não verificadas: ${unverifiedBankCount}` : ''}</small></div><button className="btn btn-outline" onClick={() => setBankTab('import')}><Plus size={17}/> Adicionar questões</button></div><div className="bank-tabs"><button className={bankTab==='questions'?'selected':''} onClick={() => setBankTab('questions')}>Questões</button><button className={bankTab==='sources'?'selected':''} onClick={() => setBankTab('sources')}>Provas anteriores</button><button className={bankTab==='import'?'selected':''} onClick={() => setBankTab('import')}>Importar</button></div>
          {bankTab==='questions' && <section className="panel bank-panel">
            <div className="bank-origin-subtabs">
              <button className={bankOrigin==='all'?'selected':''} onClick={()=>setBankOrigin('all')}>Todas ({allQuestions.length})</button>
              <button className={bankOrigin==='authorial'?'selected':''} onClick={()=>setBankOrigin('authorial')}>✍️ Autorais ({authorialBankCount})</button>
              <button className={bankOrigin==='official'?'selected':''} onClick={()=>setBankOrigin('official')}>🏛️ Oficiais ({officialBankCount})</button>
              {unverifiedBankCount>0 && <button className={bankOrigin==='unverified'?'selected':''} onClick={()=>setBankOrigin('unverified')}>⚠️ Não verificadas ({unverifiedBankCount})</button>}
            </div>
            <div className="bank-filters"><label className="search-input"><Search size={18}/><input placeholder="Buscar por questão ou assunto..." value={bankSearch} onChange={e => setBankSearch(e.target.value)}/></label><label className="select-wrap"><select aria-label="Filtrar por matéria" value={bankSubject} onChange={e => setBankSubject(e.target.value)}><option>Todas</option>{subjects.map(s=><option key={s}>{s}</option>)}</select><ChevronDown size={17}/></label></div>
            <div className="bank-warning"><Lightbulb size={17}/> As questões iniciais são autorais, inspiradas no conteúdo programático. Não são transcrições oficiais do Cebraspe nem substituem o estudo da legislação atualizada.</div>
            {bankOrigin === 'official' && officialBankCount === 0 ? (
              <div className="official-empty-state">
                <span className="official-empty-icon">🏛️</span>
                <h3>Nenhuma prova oficial verificada adicionada ainda</h3>
                <p>
                  Por integridade pedagógica e respeito aos seus estudos, o <strong>Rumo ao INSS</strong> nunca classifica questões autorais ou de IA como oficiais. O banco oficial exige conferência direta do caderno de prova e do respectivo gabarito definitivo homologado.
                </p>
                <div className="official-empty-links">
                  <strong>Fontes oficiais homologadas para consulta primária:</strong>
                  <ul>
                    <li><a href="https://www.cebraspe.org.br/concursos/inss_22" target="_blank" rel="noopener noreferrer">Portal Cebraspe INSS 2022 <ExternalLink size={13}/></a></li>
                    <li><a href="https://cdn.cebraspe.org.br/concursos/INSS_22/arquivos/760_INSS_CB1_01.PDF" target="_blank" rel="noopener noreferrer">Caderno CB1 (código 760_INSS_CB1_01) <ExternalLink size={13}/></a></li>
                    <li><a href="https://cdn.cebraspe.org.br/concursos/INSS_22/arquivos/GAB_DEFINITIVO_760_INSS_CB1_01.PDF" target="_blank" rel="noopener noreferrer">Gabarito definitivo CB1 (Item 49 anulado com 'X') <ExternalLink size={13}/></a></li>
                    <li><a href="https://cdn.cebraspe.org.br/concursos/INSS_22/arquivos/GAB_DEFINITIVO_760_INSS_001_01.PDF" target="_blank" rel="noopener noreferrer">Gabarito definitivo Específico (código 760_INSS_001_01) <ExternalLink size={13}/></a></li>
                  </ul>
                </div>
                <button className="btn btn-outline" onClick={() => setBankOrigin('authorial')}>Ver questões autorais para praticar</button>
              </div>
            ) : (
              <div className="question-list">{qInBank.slice(0,100).map((q,i) => {
                const badge = formatOriginBadge(q.source, q.status);
                return <div key={q.id} className="bank-question">
                  <div className="bank-question-top">
                    <span>QUESTÃO {i+1}</span>
                    <Badge tone={badge.tone}>{badge.icon} {badge.short}</Badge>
                    {q.source.kind === 'official' && (
                      <span className="official-item-tag">
                        🏛️ Cebraspe · INSS {q.source.examYear || 2022} · item {q.source.itemNumber}
                      </span>
                    )}
                    {q.source.questionPaperUrl && (
                      <a href={q.source.questionPaperUrl} target="_blank" rel="noopener noreferrer" className="source-meta-link">Caderno <ExternalLink size={12}/></a>
                    )}
                    {q.source.definitiveKeyUrl && (
                      <a href={q.source.definitiveKeyUrl} target="_blank" rel="noopener noreferrer" className="source-meta-link">Gabarito definitivo <ExternalLink size={12}/></a>
                    )}
                  </div>
                  <strong>{q.statement}</strong>
                  {q.options?.length && <ol className="bank-options">{q.options.map((option,i)=><li key={i}><b>{String.fromCharCode(65+i)}.</b> {option}</li>)}</ol>}
                  <div className="bank-question-footer">
                    <span>{q.subject} · {q.topic}</span>
                    <details><summary>Ver gabarito</summary><p><b>{formatAnswer(q.correct,q.options)}.</b> {q.explanation}</p></details>
                  </div>
                </div>;
              })}{qInBank.length>100 && <p className="helper-center">Exibindo 100 de {qInBank.length} questões. Refine sua busca para encontrar outras.</p>}{!qInBank.length && <Empty title="Nenhuma questão encontrada" detail="Tente outra palavra-chave ou outra matéria."/>}</div>
            )}
          </section>}
          {bankTab==='sources' && <section className="panel bank-panel"><div className="panel-header"><div><h3>Provas e materiais de referência</h3><p className="muted">Links para consultar documentos externos.</p></div></div><div className="sources-list">{SOURCES.map(s=><a href={s.url} key={s.title} target="_blank" rel="noopener noreferrer"><span className="source-icon"><FileQuestion size={21}/></span><span><strong>{s.title}</strong><small>{s.desc}</small></span><Badge tone="neutral">{s.year}</Badge><ExternalLink size={16}/></a>)}</div><p className="bank-warning"><CircleHelp size={17}/> Links incluem sites oficiais e índices de terceiros. A importação automática de PDFs de provas e gabaritos ainda não está incluída: para adicionar questões ao treino, utilize o formato JSON ou CSV da aba Importar e confira os gabaritos.</p></section>}
          {bankTab==='import' && <section className="panel bank-panel"><div className="import-hero"><span className="import-icon"><FileUp size={29}/></span><h3>Monte sua própria biblioteca</h3><p>Adicione questões de materiais que você possui em JSON ou CSV, com enunciado, matéria, gabarito e explicação. O sistema aceita Certo/Errado e múltipla escolha (4 ou 5 alternativas). As questões serão integradas aos simulados.</p><input ref={fileInput} type="file" accept=".json,.csv,application/json,text/csv" hidden onChange={e => importFile(e.target.files?.[0])}/><div style={{display:'flex',gap:'10px',flexWrap:'wrap',justifyContent:'center'}}><button className="btn btn-primary" onClick={() => fileInput.current?.click()}><FileUp size={18}/> Selecionar arquivo</button><button className="btn btn-outline" onClick={loadOfficialBatch}><Building2 size={18}/> Carregar Lote Oficial (60 itens INSS 2022)</button></div><div className="import-actions"><button className="text-link" onClick={() => download(JSON.stringify(exampleQuestions,null,2),'modelo-questoes-inss.json')}>Baixar modelo JSON <Download size={15}/></button><button className="text-link" onClick={() => download('id,subject,topic,statement,correct,explanation,origin,sourceUrl,optionA,optionB,optionC,optionD,optionE\nminha-001,Seguridade Social,Conceitos,\"A seguridade social inclui saúde previdência e assistência social.\",C,\"Conforme artigo 194 da Constituição.\",Meu material,,,,,,\nminha-002,Português,Interpretação,Marque a alternativa correta.,B,Explicação da alternativa B,Prova antiga,,Opção 1,Opção 2,Opção 3,Opção 4,Opção 5','modelo-questoes-inss.csv','text/csv;charset=utf-8')}>Baixar modelo CSV <Download size={15}/></button></div></div>{custom.length>0 && <div className="import-footer"><span><CheckCircle2 size={17}/> {custom.length} questões personalizadas cadastradas.</span><div><button className="text-link" onClick={() => download(JSON.stringify(custom,null,2),'minhas-questoes-inss.json')}>Exportar questões <Download size={16}/></button><button className="text-link danger" onClick={clearCustom}><Trash2 size={16}/> Apagar questões</button></div></div>}<div className="bank-warning"><ShieldCheck size={17}/> No modo Google, as questões personalizadas também são sincronizadas. Arquivos com dados incorretos ou gabaritos desatualizados podem afetar o resultado; revise antes de importar.</div></section>}
        </>}
      </main>
    </div>
    <nav className="mobile-bottom-nav" aria-label="Acesso rápido">{nav.slice(0,5).map(n=><button key={n.id} className={page===n.id?'active':''} onClick={() => navigate(n.id)}>{n.icon}<span>{n.name==='Minha evolução'?'Evolução':n.name}</span></button>)}</nav>
    {toast && <div className="toast" role="status"><Sparkles size={17}/>{toast}<button aria-label="Fechar aviso" onClick={() => setToast('')}><X size={15}/></button></div>}
    {authError && profile && <div className="sync-error" role="alert"><Cloud size={17}/>{authError}<button aria-label="Fechar aviso" onClick={() => setAuthError('')}><X size={15}/></button></div>}
  </div>;
}

function QuizView({
  quiz, onAnswer, onCheck, onCurrent, onFinish, onExit
}: {
  quiz: ActiveQuiz;
  onAnswer: (a: Selection) => void;
  onCheck: () => void;
  onCurrent: (n: number) => void;
  onFinish: () => void;
  onExit: () => void;
}) {
  const [elapsed, setElapsed] = useState(() => Math.round((Date.now() - Date.parse(quiz.startedAt)) / 1000));
  useEffect(() => {
    const timer = setInterval(() => setElapsed(Math.round((Date.now() - Date.parse(quiz.startedAt)) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [quiz.startedAt]);

  const q = quiz.snapshots[quiz.current];
  const answered = quiz.snapshots.filter(item => quiz.answers[item.id] != null).length;
  const selection = quiz.answers[q.id] ?? null;
  const locked = selection !== null;
  const checked = isQuizAnswerRevealed(quiz, q.id);
  const right = checked && selection === q.correct;
  const last = quiz.current === quiz.snapshots.length - 1;
  const originBadge = formatOriginBadge(q.source, q.status);
  const choices: { letter: Exclude<Selection, null>; title: string; detail?: string }[] =
    q.options?.length
      ? q.options.map((option, i) => ({ letter: 'ABCDE'[i] as Exclude<Selection, null>, title: option }))
      : [
          { letter: 'C', title: 'Certo', detail: 'A afirmação está correta' },
          { letter: 'E', title: 'Errado', detail: 'A afirmação está incorreta' }
        ];

  function finish() {
    if (answered < quiz.snapshots.length && !confirm(`Você deixou ${quiz.snapshots.length - answered} questão(ões) em branco. Deseja finalizar assim mesmo?`)) return;
    onFinish();
  }

  return <>
    <div className="quiz-top">
      <div><button className="text-link" onClick={onExit}><ArrowLeft size={17}/> Salvar e sair</button><h1>Hora de praticar! <span>🧠</span></h1><p>Leia com calma. Você consegue!</p></div>
      <div className="quiz-timer"><Clock3 size={18}/>{formatTime(elapsed)}</div>
    </div>
    <div className="quiz-layout">
      <section className="panel quiz-card">
        <div className="quiz-progress-head"><span>QUESTÃO {quiz.current + 1} DE {quiz.snapshots.length}</span><span>{Math.round(answered / quiz.snapshots.length * 100)}% respondidas</span></div>
        <div className="progress-track"><div style={{ width: `${answered / quiz.snapshots.length * 100}%` }}/></div>
        <div className="question-meta">
          <Badge tone={originBadge.tone}>{originBadge.icon} {originBadge.short}</Badge>
          {q.adaptedFrom?.length ? <span className="official-item-tag">✍️ Treino adaptado • 5 afirmações do banco</span> : null}
          {q.source.kind === 'official' && <span className="official-item-tag">🏛️ Cebraspe · INSS {q.source.examYear || 2022} · item {q.source.itemNumber || q.id}</span>}
          <Badge>{q.subject}</Badge><Badge tone="neutral">{q.topic}</Badge>
          {q.source.questionPaperUrl && <a href={q.source.questionPaperUrl} target="_blank" rel="noopener noreferrer" className="source-meta-link">Caderno <ExternalLink size={12}/></a>}
          {q.source.definitiveKeyUrl && <a href={q.source.definitiveKeyUrl} target="_blank" rel="noopener noreferrer" className="source-meta-link">Gabarito oficial <ExternalLink size={12}/></a>}
        </div>
        <h2>{q.statement}</h2>
        <p className="question-prompt">
          {quiz.exerciseFormat === 'alternatives' ? 'Treino adaptado de cinco afirmações C/E. Escolha uma única alternativa.' : q.options?.length ? 'Assinale a alternativa correta.' : 'Julgue a afirmação acima como certa ou errada.'}
        </p>
        <div className="answer-list">
          {choices.map(({letter, title, detail}) => {
            const selected = selection === letter;
            const correctAnswer = checked && q.correct === letter;
            const wrongAnswer = checked && selected && q.correct !== letter;
            return <button
              type="button"
              key={letter}
              className={`answer-option ${selected ? 'chosen' : ''} ${correctAnswer ? 'answer-is-correct' : ''} ${wrongAnswer ? 'answer-is-wrong' : ''}`}
              onClick={() => onAnswer(letter)}
              disabled={locked}
              aria-pressed={selected}
              title={locked ? 'Resposta registrada e bloqueada' : undefined}
            >
              <span className="answer-letter">{letter}</span>
              <div><strong>{title}</strong>{detail && <small>{detail}</small>}</div>
              <span className="answer-radio">{selected && <Check size={17}/>}</span>
            </button>;
          })}
        </div>
        <p className="answer-lock-note" role="status">
          {locked ? <><ShieldCheck size={15}/> Resposta registrada e bloqueada. Não é possível alterá-la.</> : <><CircleHelp size={15}/> A escolha fica definitiva ao selecionar uma resposta. Você também pode deixar em branco.</>}
        </p>
        <div className="quiz-check-area">
          <button type="button" className="btn btn-primary full" disabled={!locked || checked} onClick={onCheck}>
            <CheckCircle2 size={18}/>{checked ? 'Resposta conferida' : 'Conferir minha resposta'}
          </button>
          {!locked && <span className="helper-center">Selecione Certo/Errado ou uma alternativa de A a E para conferir.</span>}
        </div>
        {checked && (
          <div className={`quiz-feedback ${right ? 'quiz-feedback-correct' : 'quiz-feedback-wrong'}`} role="status" aria-live="polite">
            <div className="quiz-feedback-heading">
              {right ? <><CheckCircle2 size={20}/> Você acertou! 🌻</> : <><XCircle size={20}/> Essa não era a resposta correta. Vamos entender?</>}
            </div>
            <div className="answer-comparison">
              <span>Sua resposta: <strong>{formatAnswer(selection, q.options)}</strong></span>
              <span>Gabarito: <strong>{formatAnswer(q.correct, q.options)}</strong></span>
              {q.source.kind === 'official' && <span className="official-key-pill">🏛️ Gabarito oficial Cebraspe: {q.officialAnswer || q.correct}</span>}
            </div>
            <div className="answer-explanation">
              <Lightbulb size={18}/>
              <div>
                {q.source.kind === 'official' && <div className="official-disclaimer-pill">Comentário de estudo — não é justificativa oficial da banca</div>}
                {q.adaptedFrom?.length ? <p className="quiz-feedback-caption">Exercício A–E adaptado, não é uma questão oficial de alternativas.</p> : null}
                <p style={{whiteSpace: 'pre-line'}}>{q.explanation}</p>
              </div>
            </div>
          </div>
        )}
        <div className="quiz-controls">
          <button className="btn btn-outline" disabled={quiz.current === 0} onClick={() => onCurrent(quiz.current - 1)}><ArrowLeft size={17}/> Anterior</button>
          <div className="question-counter">{quiz.current + 1} / {quiz.snapshots.length}</div>
          {last ? <button className="btn btn-primary" onClick={finish}>Finalizar <Check size={17}/></button>
            : <button className="btn btn-primary" onClick={() => onCurrent(quiz.current + 1)}>Próxima <ArrowRight size={17}/></button>}
        </div>
      </section>
      <aside className="panel quiz-aside">
        <div className="panel-header"><h3>Seu simulado</h3><Badge tone="neutral">{quiz.exerciseFormat === 'alternatives' ? 'A–E • treino' : summarizeMode(quiz.gradeMode)}</Badge></div>
        <div className="quiz-progress-label"><span>Respondidas</span><strong>{answered}/{quiz.snapshots.length}</strong></div>
        <div className="question-navigator">
          {quiz.snapshots.map((item, i) => {
            const alreadyAnswered = quiz.answers[item.id] != null;
            const alreadyChecked = isQuizAnswerRevealed(quiz, item.id);
            return <button
              key={item.id}
              aria-label={`Ir para questão ${i + 1}, ${alreadyChecked ? 'conferida' : alreadyAnswered ? 'respondida' : 'em branco'}`}
              className={`${i === quiz.current ? 'current' : ''} ${alreadyAnswered ? 'answered' : ''} ${alreadyChecked ? 'checked' : ''}`}
              onClick={() => onCurrent(i)}
            >{i + 1}</button>;
          })}
        </div>
        <div className="navigator-legend"><span><i className="legend-done"/> Respondida</span><span><i className="legend-current"/> Atual</span><span><i className="legend-blank"/> Em branco</span></div>
        <button className="btn btn-outline full" onClick={finish}>Finalizar simulado <Check size={17}/></button>
        <p className="helper-center">Respostas e conferências são salvas automaticamente.</p>
      </aside>
    </div>
  </>;
}

function ResultView({result,filter,setFilter,onReturn,onAgain,onReview}:{result:Attempt,filter:'wrong'|'all',setFilter:(v:'wrong'|'all')=>void,onReturn:()=>void,onAgain:()=>void,onReview:()=>void}) {
  const [expanded,setExpanded] = useState<string[]>([]);
  const subjects = subjectBreakdown([result]);
  const selected = result.snapshots.filter(q => filter === 'all' || result.answers[q.id] !== q.correct);
  return <><button className="text-link result-back" onClick={onReturn}><ArrowLeft size={17}/> Voltar ao início</button><div className="result-banner"><div className="confetti confetti-1">✦</div><div className="confetti confetti-2">✧</div><span className="result-trophy">{result.accuracy>=80?'🏆':result.accuracy>=50?'🌟':'🌻'}</span><span className="result-kicker">SIMULADO CONCLUÍDO</span><h1>{result.accuracy>=80?'Que resultado incrível!':result.accuracy>=50?'Muito bem! Continue assim.':'Todo progresso começa praticando!'}</h1><p>Você terminou mais uma etapa. Agora vamos descobrir o que aprendemos!</p><div className="result-score"><strong>{result.accuracy}%</strong><span>de aproveitamento</span></div>{result.exerciseFormat==='alternatives' && <p>Modo A–E adaptado: os exercícios combinam cinco itens C/E, e não representam questões A–E oficiais.</p>}</div><div className="result-stats"><div><CheckCircle2 size={22}/><strong>{result.correct}</strong><span>Acertos</span></div><div><XCircle size={22}/><strong>{result.wrong}</strong><span>Erros</span></div><div><CircleHelp size={22}/><strong>{result.blank}</strong><span>Em branco</span></div><div><Medal size={22}/><strong>{result.score}</strong><span>{result.gradeMode==='cebraspe'?'Nota líquida':'Nota'}</span></div></div><div className="result-layout"><section className="panel"><div className="panel-header"><div><span className="panel-kicker">MAPA DE APRENDIZADO</span><h3>Resultados por matéria</h3></div></div><div className="subject-bars">{subjects.map(s=><div className="subject-bar" key={s.subject}><div><strong>{s.subject}</strong><span>{s.accuracy}% <small>({s.correct}/{s.total})</small></span></div><div className="bar-track"><span style={{width:`${s.accuracy}%`,background:s.accuracy>=75?'#1C7041':s.accuracy>=50?'#E7AD22':'#D97706'}}/></div></div>)}</div></section><section className="panel result-focus"><div className="panel-header"><div><span className="panel-kicker">PRÓXIMA CONQUISTA</span><h3>O que estudar agora?</h3></div><Lightbulb size={21}/></div>{subjects.some(s=>s.wrong || s.blank) ? <><p>Priorize estas matérias para ganhar confiança:</p>{subjects.filter(s=>s.wrong||s.blank).slice(0,3).map(s=><div key={s.subject} className="review-suggestion"><span>📌</span><div><strong>{s.subject}</strong><small>{s.wrong} erro(s), {s.blank} em branco · revise os temas abaixo.</small></div></div>)}</> : <div className="empty-compact"><span>🎉</span><strong>Parabéns, todas corretas!</strong><p>Que tal misturar outras matérias para continuar evoluindo?</p></div>}<button className="btn btn-primary full" onClick={onAgain}>Fazer outro simulado <ArrowRight size={17}/></button>{result.exerciseFormat==='alternatives' ? <p className="helper-center">Confira a correção de cada alternativa abaixo; a revisão individual continua disponível no modo Certo/Errado.</p> : <button className="btn btn-outline full" onClick={onReview}><RotateCcw size={17}/> Revisar meus erros</button>}</section></div><section className="panel review-panel"><div className="panel-header"><div><span className="panel-kicker">APRENDER COM CADA RESPOSTA</span><h3>Correção comentada</h3></div><div className="tab-switch"><button className={filter==='wrong'?'selected':''} onClick={()=>setFilter('wrong')}>Erros e brancos</button><button className={filter==='all'?'selected':''} onClick={()=>setFilter('all')}>Todas</button></div></div>{selected.length ? <div className="review-list">{selected.map((q) => {
    const response=result.answers[q.id]??null;
    const good=response===q.correct;
    const open=expanded.includes(q.id);
    const badge=formatOriginBadge(q.source, q.status);
    return <div className={`review-item ${good?'good':'bad'}`} key={q.id}>
      <div className="review-top">
        <Badge tone={badge.tone}>{badge.icon} {badge.short}</Badge>
        {q.source.kind === 'official' && (
          <span className="official-item-tag">
            🏛️ Cebraspe · INSS {q.source.examYear || 2022} · item {q.source.itemNumber || q.id}
          </span>
        )}
        <Badge tone="neutral">{q.subject}</Badge>
        {q.source.kind === 'official' && q.source.questionPaperUrl && (
          <a href={q.source.questionPaperUrl} target="_blank" rel="noopener noreferrer" className="source-meta-link">Caderno <ExternalLink size={12}/></a>
        )}
        {q.source.kind === 'official' && q.source.definitiveKeyUrl && (
          <a href={q.source.definitiveKeyUrl} target="_blank" rel="noopener noreferrer" className="source-meta-link">Gabarito definitivo <ExternalLink size={12}/></a>
        )}
        <span className={good?'correct-label':'incorrect-label'}>{good?<><CheckCircle2 size={15}/> Acertou</>:response?<><XCircle size={15}/> Errou</>:<><CircleHelp size={15}/> Em branco</>}</span>
      </div>
      <p>{q.statement}</p>
      {q.adaptedFrom?.length ? <p className="muted">Exercício A–E adaptado de {q.adaptedFrom.length} afirmações Certo/Errado, não é questão original da banca.</p> : null}
      {q.options?.length ? <ol className="bank-options">{q.options.map((option,i)=><li key={i}><b>{'ABCDE'[i]}.</b> {option}</li>)}</ol> : null}
      <div className="answer-comparison">
        <span>Sua resposta: <strong>{formatAnswer(response,q.options)}</strong></span>
        <span>Gabarito: <strong>{formatAnswer(q.correct,q.options)}</strong></span>
        {q.source.kind === 'official' && (
          <span className="official-key-pill">🏛️ Gabarito oficial Cebraspe: {q.officialAnswer || q.correct}</span>
        )}
      </div>
      <button className="text-link" onClick={()=>setExpanded(prev=>open?prev.filter(id=>id!==q.id):[...prev,q.id])}>{open?'Ocultar explicação':'Entender a resposta'} <ChevronDown size={15}/></button>
      {open && <div className="answer-explanation">
        {q.source.kind === 'official' && (
          <div className="official-disclaimer-pill">
            <Lightbulb size={13}/> Comentário de estudo — não é justificativa oficial da banca
          </div>
        )}
        <p style={{whiteSpace:'pre-line'}}>{q.explanation}</p>
      </div>}
    </div>;
  })}</div>:<Empty title="Nenhum erro para revisar!" detail="Você acertou tudo. Escolha Todas para rever as explicações."/>}</section></>;
}
function Empty({title,detail}:{title:string,detail:string}) {return <div className="empty"><span>🌷</span><strong>{title}</strong><p>{detail}</p></div>;}
