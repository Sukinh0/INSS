import type { Question } from '../types';
import { isAvailableForQuiz } from './origin';

export type CozyKind = 'sunflower' | 'cards';
export type CozyRating = 'known' | 'review';
export type CozyEvent = {
  id: string;
  kind: 'petal' | 'session' | 'card';
  itemId: string;
  at: string;
  rating?: CozyRating;
};
export type CozyProgress = { version: 1; events: CozyEvent[] };
export type CozySession =
  | { mode: 'sunflower'; ids: string[]; index: number; phase: 'learn' | 'ask' | 'feedback'; selected: 'C' | 'E' | null }
  | { mode: 'cards'; ids: string[]; index: number; flipped: boolean };

export type MiniLesson = {
  id: string;
  subject: string;
  title: string;
  intro: string;
  statement: string;
  correct: 'C' | 'E';
  explanation: string;
};

/** Microaulas autorais em linguagem simples, separadas das questões oficiais. */
export const MINI_LESSONS: MiniLesson[] = [
  { id:'g-01', subject:'Seguridade Social', title:'Os três pilares', intro:'A Seguridade Social brasileira reúne saúde, previdência e assistência social. Cada uma atende necessidades diferentes.', statement:'A Seguridade Social engloba saúde, previdência e assistência social.', correct:'C', explanation:'É o que dispõe o art. 194 da Constituição. As três áreas formam um conjunto de proteção social.' },
  { id:'g-02', subject:'Seguridade Social', title:'Saúde é para todos', intro:'O SUS busca garantir acesso universal à saúde. Não é preciso pagar ao INSS para ter atendimento.', statement:'Somente quem contribui para a previdência pode receber atendimento no SUS.', correct:'E', explanation:'O acesso ao SUS é universal e não depende de contribuição previdenciária.' },
  { id:'g-03', subject:'Seguridade Social', title:'Assistência social', intro:'A assistência social atende quem dela necessita, mesmo que a pessoa não contribua para a previdência.', statement:'A assistência social exige contribuição previdenciária prévia para ser prestada.', correct:'E', explanation:'A Constituição estabelece que a assistência social será prestada a quem dela necessitar, independentemente de contribuição.' },
  { id:'g-04', subject:'Direito Previdenciário', title:'Quem é segurado?', intro:'Quem trabalha com carteira assinada, em regra, participa obrigatoriamente do Regime Geral de Previdência Social.', statement:'O empregado com carteira assinada é, em regra, segurado obrigatório do RGPS.', correct:'C', explanation:'O empregado integra a lista de segurados obrigatórios prevista na legislação previdenciária.' },
  { id:'g-05', subject:'Direito Previdenciário', title:'Participar por escolha', intro:'O segurado facultativo é alguém que pode contribuir para o RGPS sem exercer atividade remunerada que imponha filiação obrigatória.', statement:'O segurado facultativo precisa, necessariamente, ter vínculo de emprego.', correct:'E', explanation:'A filiação facultativa não exige emprego. Depende de requisitos legais próprios.' },
  { id:'g-06', subject:'Direito Previdenciário', title:'RGPS e RPPS', intro:'Existem regimes previdenciários diferentes. O RGPS não é exclusivo de servidores titulares de cargos efetivos.', statement:'O RGPS é destinado exclusivamente aos servidores públicos titulares de cargo efetivo.', correct:'E', explanation:'O RGPS abrange, entre outros, trabalhadores da iniciativa privada; servidores efetivos podem ter regime próprio.' },
  { id:'g-07', subject:'Língua Portuguesa', title:'Há ou a?', intro:'A palavra “há” pode indicar tempo já decorrido: “Moro aqui há cinco anos”.', statement:'Na frase “Trabalho aqui há dois anos”, o uso de “há” está correto.', correct:'C', explanation:'O verbo haver pode indicar tempo transcorrido e é impessoal nesse sentido.' },
  { id:'g-08', subject:'Língua Portuguesa', title:'Onde e aonde', intro:'“Onde” indica lugar; “aonde” costuma acompanhar verbos que pedem a preposição “a”, indicando destino.', statement:'Em “Aonde você vai?”, o uso de “aonde” é adequado.', correct:'C', explanation:'O verbo ir pede a preposição “a”; por isso, “aonde” indica destino.' },
  { id:'g-09', subject:'Língua Portuguesa', title:'Mas ou mais?', intro:'“Mas” expressa oposição; “mais” expressa quantidade ou intensidade.', statement:'Em “Quero estudar, mais estou cansada”, a palavra “mais” indica oposição corretamente.', correct:'E', explanation:'Nesse contexto, deve-se usar “mas”, que introduz a ideia de oposição.' },
  { id:'g-10', subject:'Direito Constitucional', title:'Direitos sociais', intro:'A Constituição reconhece direitos sociais, como educação, saúde, trabalho e previdência social.', statement:'A educação e a saúde são direitos sociais previstos na Constituição.', correct:'C', explanation:'O art. 6º da Constituição inclui educação e saúde entre os direitos sociais.' },
  { id:'g-11', subject:'Direito Constitucional', title:'Todos perante a lei', intro:'A Constituição estabelece que todas as pessoas são iguais perante a lei, sem distinção de qualquer natureza, nos termos do art. 5º.', statement:'A Constituição afasta o princípio da igualdade perante a lei.', correct:'E', explanation:'O art. 5º afirma expressamente o princípio da igualdade perante a lei.' },
  { id:'g-12', subject:'Direito Constitucional', title:'Quem cria as leis?', intro:'O Poder Legislativo exerce, principalmente, a função de legislar e fiscalizar. Isso não significa que seja a única função constitucional do órgão.', statement:'Uma das funções típicas do Poder Legislativo é elaborar leis.', correct:'C', explanation:'Legislar e fiscalizar são funções típicas do Poder Legislativo.' },
  { id:'g-13', subject:'Direito Administrativo', title:'Os cinco princípios', intro:'LIMPE é um jeito de memorizar os princípios expressos no art. 37: legalidade, impessoalidade, moralidade, publicidade e eficiência.', statement:'Eficiência é um dos princípios expressos da administração pública.', correct:'C', explanation:'O princípio da eficiência está expressamente previsto no caput do art. 37 da Constituição.' },
  { id:'g-14', subject:'Direito Administrativo', title:'Legalidade administrativa', intro:'Na administração pública, o agente deve agir de acordo com o ordenamento jurídico e suas competências.', statement:'O agente público pode ignorar a lei sempre que achar uma solução mais rápida.', correct:'E', explanation:'A busca por eficiência não permite desrespeitar a legalidade administrativa.' },
  { id:'g-15', subject:'Direito Administrativo', title:'Impessoalidade', intro:'O interesse público deve orientar a atuação administrativa; a máquina pública não deve ser usada para favorecer amigos.', statement:'A impessoalidade permite beneficiar conhecidos em razão da amizade pessoal.', correct:'E', explanation:'Favorecimento pessoal contraria o princípio da impessoalidade.' },
  { id:'g-16', subject:'Ética no Serviço Público', title:'Respeito faz parte', intro:'No atendimento ao público, tratar as pessoas com respeito e atenção é parte de uma conduta ética.', statement:'Um atendimento respeitoso e cuidadoso é compatível com a ética no serviço público.', correct:'C', explanation:'Cortesia, respeito e atenção ao cidadão são condutas esperadas no serviço público.' },
  { id:'g-17', subject:'Ética no Serviço Público', title:'O interesse coletivo', intro:'Ao lidar com assuntos públicos, deve-se evitar usar o cargo em benefício exclusivamente pessoal.', statement:'É ético usar informações do trabalho para obter vantagem privada indevida.', correct:'E', explanation:'Usar o cargo ou informações funcionais para obter vantagem indevida contraria os deveres éticos.' },
  { id:'g-18', subject:'Ética no Serviço Público', title:'Sigilo necessário', intro:'Ser transparente não significa divulgar dados pessoais ou protegidos por sigilo legal.', statement:'O servidor deve divulgar qualquer dado sigiloso sempre que um conhecido pedir.', correct:'E', explanation:'É preciso respeitar a legislação de proteção de dados e o dever legal de sigilo.' },
  { id:'g-19', subject:'Informática', title:'Cuidado com golpes', intro:'Phishing é uma tentativa de enganar pessoas para roubar informações, muitas vezes usando mensagens ou sites falsos.', statement:'Uma mensagem falsa que tenta obter senhas pode ser uma tentativa de phishing.', correct:'C', explanation:'Phishing explora o engano para obter dados sensíveis, como senhas e códigos de acesso.' },
  { id:'g-20', subject:'Informática', title:'A importância do backup', intro:'Cópias de segurança ajudam a recuperar dados em caso de falha ou perda. O ideal é testá-las e protegê-las.', statement:'Fazer backups pode reduzir o impacto da perda de arquivos importantes.', correct:'C', explanation:'Backups são parte das práticas de proteção e recuperação de dados.' },
  { id:'g-21', subject:'Informática', title:'Senha forte', intro:'Senhas longas e exclusivas, junto com autenticação em dois fatores, ajudam a proteger suas contas.', statement:'Reutilizar a mesma senha em todos os serviços é a prática mais segura.', correct:'E', explanation:'Reutilizar senhas amplia o impacto de vazamentos; prefira senhas únicas e autenticação adicional.' },
  { id:'g-22', subject:'Raciocínio Lógico', title:'Todos e alguns', intro:'Negar “todos” não exige dizer que “nenhum” é. Basta que pelo menos um caso contradiga a regra.', statement:'A negação de “Todos os alunos estudam” é “Pelo menos um aluno não estuda”.', correct:'C', explanation:'Para tornar falsa uma afirmação universal, basta existir pelo menos uma exceção.' },
  { id:'g-23', subject:'Raciocínio Lógico', title:'A condição “se”', intro:'A frase “Se P, então Q” só é falsa quando P acontece e Q não acontece.', statement:'A proposição “Se P, então Q” é falsa quando P é verdadeira e Q é falsa.', correct:'C', explanation:'Esse é o único caso que torna falsa a implicação material.' },
  { id:'g-24', subject:'Raciocínio Lógico', title:'O contrário lógico', intro:'Se uma afirmação diz “Alguns estudantes acertaram”, negá-la significa dizer que nenhum estudante acertou.', statement:'“Nenhum estudante acertou” nega a afirmação “Algum estudante acertou”.', correct:'C', explanation:'A negação de “existe pelo menos um” é “não existe nenhum”.' }
];

export const emptyCozy = (): CozyProgress => ({ version: 1, events: [] });

export function sanitizeCozy(value: unknown): CozyProgress {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return emptyCozy();
  const raw = value as {events?: unknown};
  if (!Array.isArray(raw.events)) return emptyCozy();
  const events: CozyEvent[] = [];
  const seen = new Set<string>();
  for (const item of raw.events.slice(-2500)) {
    if (!item || typeof item !== 'object') continue;
    const e = item as Partial<CozyEvent>;
    if (typeof e.id !== 'string' || e.id.length > 100 || seen.has(e.id)) continue;
    if (typeof e.at !== 'string' || !Number.isFinite(Date.parse(e.at))) continue;
    if (e.kind !== 'petal' && e.kind !== 'session' && e.kind !== 'card') continue;
    if (typeof e.itemId !== 'string' || e.itemId.length > 200) continue;
    if (e.kind === 'card' && e.rating !== 'known' && e.rating !== 'review') continue;
    seen.add(e.id);
    events.push({ id:e.id, kind:e.kind, at:e.at, itemId:e.itemId, ...(e.kind === 'card' ? {rating:e.rating} : {}) });
  }
  return {version:1, events};
}

export function mergeCozy(a: CozyProgress, b: CozyProgress): CozyProgress {
  const union = new Map<string, CozyEvent>();
  for(const event of [...sanitizeCozy(a).events, ...sanitizeCozy(b).events]) union.set(event.id, event);
  return {version:1, events:[...union.values()].sort((x,y)=>x.at.localeCompare(y.at) || x.id.localeCompare(y.id)).slice(-2000)};
}

export function recordCozy(progress: CozyProgress, kind: CozyEvent['kind'], itemId: string, rating?: CozyRating): CozyProgress {
  const at = new Date().toISOString();
  const e: CozyEvent = {id:crypto.randomUUID(),kind,itemId,at,...(rating ? {rating} : {})};
  return mergeCozy(progress,{version:1,events:[e]});
}

export function sunflowerStage(progress: CozyProgress): {emoji: string; title: string; sessions: number; petals: number} {
  const sessions = progress.events.filter(e=>e.kind==='session').length;
  const petals = progress.events.filter(e=>e.kind==='petal').length;
  const stages = [
    {emoji:'🌱',title:'Uma sementinha cheia de possibilidades'},
    {emoji:'🌿',title:'Sua plantinha já ganhou folhas'},
    {emoji:'🌼',title:'Uma florzinha está surgindo'},
    {emoji:'🌻',title:'Seu girassol está florindo!'}
  ];
  return {...stages[Math.min(3,Math.floor(petals/4))],sessions,petals};
}

export function chooseLessons(progress: CozyProgress, count: number, subject='Todas', random:()=>number=Math.random): MiniLesson[] {
  const recentlySeen = new Set(progress.events.filter(e=>e.kind==='petal').slice(-Math.floor(MINI_LESSONS.length/2)).map(e=>e.itemId));
  const selected = MINI_LESSONS.filter(l=>subject==='Todas'||l.subject===subject)
    .map(l=>({l,seen:recentlySeen.has(l.id),r:random()}))
    .sort((a,b)=> Number(a.seen)-Number(b.seen) || a.r-b.r)
    .map(e=>e.l);
  return selected.slice(0,Math.max(1,Math.floor(count)));
}

export function flashcardBank(pool: Question[], subject='Todas'): Question[] {
  const ids = new Set<string>();
  return pool.filter(q=>{
    if (q.source.kind!=='authorial' || !isAvailableForQuiz(q,'authorial')) return false;
    if (q.options?.length || q.contextId || q.statement.length>350 || !['C','E'].includes(q.correct ?? '')) return false;
    if (subject!=='Todas' && q.subject!==subject) return false;
    if (ids.has(q.id)) return false;
    ids.add(q.id);return true;
  });
}

export function pickFlashcards(pool: Question[], progress: CozyProgress, count: number, subject='Todas', random:()=>number=Math.random, now=Date.now()): Question[] {
  const candidates=flashcardBank(pool,subject);
  const latest=new Map<string,CozyEvent>();
  for(const e of progress.events) if(e.kind==='card') latest.set(e.itemId,e);
  const ranks=candidates.map(q=>{
    const e=latest.get(q.id);
    const age=e?now-Date.parse(e.at):0;
    // "Quero revisar" volta antes; cartões novos vêm em seguida e conhecidos circulam mais tarde.
    const due = e?.rating==='review' && age>=0;
    const knownDue=e?.rating==='known' && age>=86_400_000;
    const priority=due?0:!e?1:knownDue?2:3;
    return {q,priority,r:random()};
  });
  return ranks.sort((a,b)=>a.priority-b.priority||a.r-b.r)
    .slice(0,Math.min(Math.max(1,Math.floor(count)),ranks.length)).map(x=>x.q);
}

export function cozySubjects(): string[] {return [...new Set(MINI_LESSONS.map(l=>l.subject))];}
