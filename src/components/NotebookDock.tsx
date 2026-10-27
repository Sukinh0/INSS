import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, BookMarked, Bookmark, Check, ChevronRight, FileQuestion,
  Heart, NotebookPen, Pencil, Plus, Search, Trash2, X
} from 'lucide-react';
import type { Question } from '../types';
import {
  activeNotebook, createNotebookNote, deleteNotebookEntry, editNotebookEntry, editNotebookReflection,
  hasNotebookQuestion, NOTEBOOK_BODY_LIMIT, saveNotebookQuestion,
  type NotebookData, type NotebookEntry
} from '../lib/notebook';
import '../notebook.css';

type Filter='all'|'notes'|'questions'|'reflections'|'later';
type Draft={title:string;text:string;subject:string;topic:string;studyLater:boolean};
type Props={
  data:NotebookData;
  open:boolean;
  currentQuestion?:Question;
  subjects:string[];
  onOpen:()=>void;
  onClose:()=>void;
  onChange:(next:NotebookData)=>void;
  onOpenAttempt?:(attemptId:string)=>void;
  focusReflections?:boolean;
};

export default function NotebookDock({data,open,currentQuestion,subjects,onOpen,onClose,onChange,onOpenAttempt,focusReflections=false}:Props) {
  const [filter,setFilter]=useState<Filter>('all');
  const [search,setSearch]=useState('');
  const [editingId,setEditingId]=useState<string|null>(null);
  const [creating,setCreating]=useState(false);
  const [draft,setDraft]=useState<Draft>({title:'',text:'',subject:'',topic:'',studyLater:false});
  const [reflectionAnswers,setReflectionAnswers]=useState<string[]>(['','','']);
  const [error,setError]=useState('');
  const panel=useRef<HTMLDivElement>(null);
  const fab=useRef<HTMLButtonElement>(null);
  const closeRef=useRef(onClose);
  closeRef.current=onClose;
  const all=useMemo(()=>activeNotebook(data),[data]);
  const saved=currentQuestion?hasNotebookQuestion(data,currentQuestion.id):false;
  const notes=all.filter(e=>e.kind==='note').length;
  const bookmarks=all.filter(e=>e.kind==='question').length;
  const reflections=all.filter(e=>e.kind==='reflection').length;
  const editingReflection=all.find(e=>e.id===editingId && e.kind==='reflection');
  const later=all.filter(e=>e.studyLater).length;
  const visible=all.filter(e=>{
    if(filter==='notes' && e.kind!=='note')return false;
    if(filter==='questions' && e.kind!=='question')return false;
    if(filter==='reflections' && e.kind!=='reflection')return false;
    if(filter==='later' && !e.studyLater)return false;
    const value=`${e.title} ${e.text} ${e.subject} ${e.topic} ${e.question?.statement??''} ${e.reflection?.questions.map(x=>x.prompt+' '+x.answer).join(' ')??''}`.toLocaleLowerCase('pt-BR');
    return value.includes(search.toLocaleLowerCase('pt-BR'));
  });

  useEffect(()=>{
    if(open && focusReflections){setFilter('reflections');setSearch('');setEditingId(null);setCreating(false);}
  },[open,focusReflections]);

  useEffect(()=>{
    if(!open)return;
    const prev=document.body.style.overflow;
    document.body.style.overflow='hidden';
    const previousFocus=document.activeElement as HTMLElement|null;
    panel.current?.focus();
    const key=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){event.preventDefault();closeRef.current();}
      if(event.key!=='Tab' || !panel.current)return;
      const items=Array.from(panel.current.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href]'))
        .filter(el=>el.getClientRects().length>0);
      if(!items.length)return;
      const first=items[0],last=items[items.length-1];
      if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();}
      if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}
    };
    document.addEventListener('keydown',key);
    return ()=>{document.body.style.overflow=prev;document.removeEventListener('keydown',key);(previousFocus?.isConnected?previousFocus:fab.current)?.focus();};
  },[open]);

  function newDraft(){
    setEditingId(null);setCreating(true);
    setDraft({title:'',text:'',subject:'',topic:'',studyLater:false});setError('');
  }
  function edit(entry:NotebookEntry){
    setCreating(false);setEditingId(entry.id);
    setDraft({title:entry.title,text:entry.text,subject:entry.subject,topic:entry.topic,studyLater:entry.studyLater});
    setReflectionAnswers(entry.reflection?.questions.map(x=>x.answer)??['','','']);setError('');
  }
  function cancelEditor(){setEditingId(null);setCreating(false);setError('');}
  function saveDraft(){
    try {
      if(creating)onChange(createNotebookNote(data,draft));
      else if(editingId && editingReflection?.reflection) {
        const questions=editingReflection.reflection.questions.map((q,i)=>({prompt:q.prompt,answer:reflectionAnswers[i]??''}));
        const updated=editNotebookReflection(data,editingId,questions);
        onChange(draft.studyLater===editingReflection.studyLater?updated:editNotebookEntry(updated,editingId,{studyLater:draft.studyLater}));
      } else if(editingId)onChange(editNotebookEntry(data,editingId,draft));
      cancelEditor();
    }catch(e){setError((e as Error).message);}
  }
  function remove(id:string){
    if(!window.confirm('Excluir este item do caderninho? Você poderá recuperar apenas por um backup anterior.'))return;
    onChange(deleteNotebookEntry(data,id));
    if(editingId===id)cancelEditor();
  }
  function markLater(item:NotebookEntry){
    try{onChange(editNotebookEntry(data,item.id,{studyLater:!item.studyLater}));}catch(e){setError((e as Error).message);}
  }
  function saveCurrent(){
    if(!currentQuestion)return;
    try{
      onChange(saveNotebookQuestion(data,currentQuestion));
      setFilter('questions');setSearch('');setError('');
    }catch(e){setError((e as Error).message);}
  }

  return <>
    <button type="button" ref={fab} className="notebook-fab" aria-label="Abrir Meu Caderninho" title="Meu Caderninho" onClick={onOpen}>
      <NotebookPen size={23}/><span className="notebook-fab-label">Caderninho</span>{all.length>0&&<span className="notebook-fab-dot" aria-label={`${all.length} itens`}>{all.length>99?'99+':all.length}</span>}
    </button>
    {open&&<>
      <button className="notebook-scrim" type="button" tabIndex={-1} onClick={onClose} aria-label="Fechar caderninho"/>
      <div className="notebook-panel" role="dialog" aria-modal="true" aria-labelledby="notebook-panel-title" tabIndex={-1} ref={panel}>
        <header className="notebook-header">
          <div className="notebook-header-icon">📒</div>
          <div className="notebook-header-title"><span>SEU ESPAÇO PESSOAL</span><h2 id="notebook-panel-title">Meu Caderninho</h2><p>Guarde agora, estude no seu tempo. 💛</p></div>
          <button type="button" className="notebook-close" onClick={onClose} aria-label="Fechar caderninho"><X size={21}/></button>
        </header>
        <div className="notebook-scroll">
          {currentQuestion && <div className="notebook-current-question">
            <span><Bookmark size={15}/> QUESTÃO DE AGORA</span>
            <p>{currentQuestion.subject} · {currentQuestion.topic}</p>
            <button type="button" onClick={saveCurrent} disabled={saved}>
              {saved?<><Check size={17}/> Questão já guardada</>:<><BookMarked size={17}/> Guardar esta questão</>}
            </button>
            <small>Salva apenas o enunciado e as opções. O gabarito não é revelado.</small>
          </div>}
          <div className="notebook-counter">
            <div><strong>{notes}</strong><span>Anotações</span></div>
            <div><strong>{bookmarks}</strong><span>Questões</span></div>
            <div><strong>{reflections}</strong><span>Aprendizados</span></div>
            <div><strong>{later}</strong><span>Estudar depois</span></div>
          </div>
          <button type="button" className="notebook-create" onClick={newDraft}><Plus size={19}/> Escrever uma anotação</button>
          {(creating||editingId) && <form className="notebook-editor" onSubmit={e=>{e.preventDefault();saveDraft();}}>
            <div className="notebook-editor-heading"><Pencil size={17}/>{creating?'Nova anotação':'Editar item salvo'}</div>
            {editingReflection?.reflection ? <>
              <p className="notebook-reflection-tip">Revise o que escreveu. Seu registro continuará associado ao mesmo simulado.</p>
              {editingReflection.reflection.questions.map((q,i)=><div className="notebook-reflection-edit" key={i}>
                <label htmlFor={`notebook-reflection-${i}`}>{i+1}. {q.prompt}</label>
                <textarea id={`notebook-reflection-${i}`} rows={3} maxLength={900} value={reflectionAnswers[i]??''} onChange={e=>setReflectionAnswers(v=>v.map((a,j)=>j===i?e.target.value:a))}/>
              </div>)}
            </> : <>
            <label htmlFor="notebook-title">Título</label>
            <input id="notebook-title" placeholder="O que quero lembrar?" maxLength={100} value={draft.title} onChange={e=>setDraft(v=>({...v,title:e.target.value}))}/>
            <label htmlFor="notebook-content">Minha anotação</label>
            <textarea id="notebook-content" rows={4} maxLength={NOTEBOOK_BODY_LIMIT} placeholder="Escreva com suas palavras..." value={draft.text} onChange={e=>setDraft(v=>({...v,text:e.target.value}))}/>
            <div className="notebook-editor-meta"><div><label htmlFor="notebook-subject">Matéria (opcional)</label><select id="notebook-subject" value={draft.subject} onChange={e=>setDraft(v=>({...v,subject:e.target.value}))}><option value="">Sem matéria</option>{subjects.map(s=><option key={s} value={s}>{s}</option>)}{draft.subject&&!subjects.includes(draft.subject)&&<option value={draft.subject}>{draft.subject}</option>}</select></div>
              <div><label htmlFor="notebook-topic">Assunto (opcional)</label><input id="notebook-topic" maxLength={100} placeholder="Ex.: RGPS" value={draft.topic} onChange={e=>setDraft(v=>({...v,topic:e.target.value}))}/></div>
            </div>
            </>}
            <label className="notebook-checkbox"><input type="checkbox" checked={draft.studyLater} onChange={e=>setDraft(v=>({...v,studyLater:e.target.checked}))}/> <Heart size={16}/> Estudar depois</label>
            <div className="notebook-editor-actions"><button type="button" onClick={cancelEditor}>Cancelar</button><button type="submit" className="notebook-action-save"><Check size={15}/> Salvar no caderninho</button></div>
          </form>}
          <div className="notebook-filter-row">
            {([{key:'all',name:'Tudo'},{key:'notes',name:'Anotações'},{key:'questions',name:'Questões'},{key:'reflections',name:'Aprendizados'},{key:'later',name:'Estudar depois'}] as const).map(x=>
              <button type="button" key={x.key} className={filter===x.key?'selected':''} onClick={()=>{setFilter(x.key);setSearch('');}}>{x.name}</button>)}
          </div>
          <div className="notebook-search"><Search size={16}/><input aria-label="Buscar no caderninho" placeholder="Buscar anotação, matéria ou questão..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
          {visible.length===0?<div className="notebook-empty"><span>📒</span><strong>{all.length?'Nada encontrado neste filtro.':'Seu caderninho começa aqui!'}</strong><p>{all.length?'Tente outra palavra ou outro filtro.':'Escreva um lembrete ou guarde uma questão durante os estudos.'}</p></div>:<div className="notebook-items">
            {visible.map(item=><article key={item.id} className="notebook-item">
              <div className="notebook-item-top">
                <span className="notebook-item-type">{item.kind==='question'?<><FileQuestion size={14}/> Questão guardada</>:item.kind==='reflection'?<><BookMarked size={14}/> Meu aprendizado</>:<><NotebookPen size={14}/> Anotação</>}</span>
                {item.studyLater&&<span className="notebook-later-badge"><Heart size={13}/> Estudar depois</span>}
              </div>
              <h3>{item.title||'Minha anotação'}</h3>
              {(item.subject||item.topic)&&<small>{[item.subject,item.topic].filter(Boolean).join(' · ')}</small>}
              {item.kind==='question'&&item.question&&<div className="notebook-question-text">
                <p>{item.question.statement}</p>
                {item.question.options?.map((opt,i)=><p key={i}><strong>{'ABCDE'[i]}.</strong> {opt}</p>)}
                <span>{item.question.origin}</span>
                {item.question.sourceUrl&&<a target="_blank" rel="noopener noreferrer" href={item.question.sourceUrl}>Consultar o caderno de origem <ChevronRight size={14}/></a>}
              </div>}
              {item.kind==='reflection' && item.reflection && <div className="notebook-reflection-view">
                <div className="notebook-reflection-meta">📅 {new Date(item.reflection.finishedAt).toLocaleDateString('pt-BR')} · {item.reflection.correct} acerto(s), {item.reflection.wrong} erro(s), {item.reflection.blank} em branco</div>
                {item.reflection.questions.map((x,i)=>x.answer.trim()&&<div className="notebook-reflection-qa" key={i}><strong>{x.prompt}</strong><p>{x.answer}</p></div>)}
                {onOpenAttempt&&<button type="button" className="notebook-link-attempt" onClick={()=>onOpenAttempt(item.reflection!.attemptId)}>Ver o simulado relacionado <ChevronRight size={14}/></button>}
              </div>}
              {item.text&&<p className="notebook-item-text">{item.text}</p>}
              <div className="notebook-item-actions">
                <button type="button" onClick={()=>markLater(item)}><Heart size={16} fill={item.studyLater?'currentColor':'none'}/>{item.studyLater?'Desmarcar':'Estudar depois'}</button>
                <button type="button" onClick={()=>edit(item)}><Pencil size={15}/> Editar</button>
                <button type="button" className="notebook-item-delete" onClick={()=>remove(item.id)} aria-label={`Excluir ${item.title||'item'}`}><Trash2 size={16}/></button>
              </div>
            </article>)}
          </div>}
          {error&&<p className="notebook-error" role="alert">{error}</p>}
          <p className="notebook-footnote">Seu caderno é privado para este perfil e não altera o simulado, o streak ou o ranking. Em dispositivos compartilhados, cuide do acesso ao perfil.</p>
        </div>
        <div className="notebook-panel-bottom"><button type="button" onClick={onClose}><ArrowLeft size={16}/> Voltar a estudar</button></div>
      </div>
    </>}
  </>;
}
