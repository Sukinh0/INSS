import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BookHeart, CheckCircle2, Heart, Lightbulb, NotebookPen, Sparkles } from 'lucide-react';
import type { Attempt } from '../types';
import type { NotebookEntry } from '../lib/notebook';
import { canSaveReflection, MAX_REFLECTION_ANSWER, reflectionGuide } from '../lib/reflection';
import { storage } from '../lib/storage';
import '../reflection.css';

type Props={
  attempt:Attempt;
  saved?:NotebookEntry;
  onSave:(attempt:Attempt,answers:{prompt:string;answer:string}[])=>void;
  onOpenNotebook:()=>void;
};

/** Experiência conversacional opcional após o resultado. Uma pergunta por vez. */
export default function LearningReflection({attempt,saved,onSave,onOpenNotebook}:Props) {
  const guide=useMemo(()=>reflectionGuide(attempt),[attempt]);
  const [draft]=useState(()=>storage.reflectionDraft(attempt.profileId));
  const [answers,setAnswers]=useState<string[]>(()=>{
    if(saved?.reflection?.questions.length===3)return saved.reflection.questions.map(x=>x.answer);
    return draft?.attemptId===attempt.id?draft.answers:['','',''];
  });
  const [step,setStep]=useState(()=>draft?.attemptId===attempt.id?draft.step:0);
  const [screen,setScreen]=useState<'invite'|'writing'|'saved'|'dismissed'>(saved?'saved':'invite');
  const [message,setMessage]=useState('');

  useEffect(()=>{
    if(screen==='writing') {
      if(!storage.saveReflectionDraft(attempt.profileId,{attemptId:attempt.id,step,answers})){
        setMessage('Não foi possível salvar o rascunho neste aparelho. Se possível, copie sua resposta antes de sair.');
      }
    }
  },[screen,step,answers,attempt.id,attempt.profileId]);

  function start(){
    setMessage('');setScreen('writing');
    if(saved?.reflection?.questions.length===3){
      setAnswers(saved.reflection.questions.map(q=>q.answer));
      setStep(0);
    }
  }
  function next(){
    if(step<2){setStep(s=>s+1);setMessage('');return;}
    const values=guide.questions.map((q,i)=>({prompt:q.prompt,answer:answers[i]??''}));
    if(!canSaveReflection(values)) {
      setMessage('Pode escrever apenas uma das três respostas. Uma frase já é suficiente! 💛');
      return;
    }
    try {
      onSave(attempt,values);
      storage.saveReflectionDraft(attempt.profileId,null);
      setScreen('saved');setMessage('');
    } catch(e){setMessage((e as Error).message);}
  }
  const hasDraft=answers.some(a=>a.trim().length>0);
  return <section className="reflection-wrap" aria-label="Reflexão sobre o simulado">
    {screen==='invite'&&<div className="reflection-invite">
      <div className="reflection-art" aria-hidden="true">📖</div>
      <div className="reflection-invite-content">
        <span className="reflection-eyebrow"><Sparkles size={15}/> UM MOMENTINHO PARA VOCÊ</span>
        <h2>O que aprendi hoje? 💛</h2>
        <p>Antes de ir, que tal contar com suas palavras o que ficou do simulado? São três perguntinhas, uma de cada vez. Não tem nota nem resposta perfeita.</p>
        <span className="reflection-focus"><Lightbulb size={15}/> Vamos falar sobre {guide.focusTopic}.</span>
        <div className="reflection-invite-actions">
          <button type="button" className="btn btn-primary" onClick={start}>{hasDraft?'Continuar minha reflexão':'Quero registrar meu aprendizado'} <ArrowRight size={17}/></button>
          <button type="button" className="reflection-decline" onClick={()=>setScreen('dismissed')}>Agora não</button>
        </div>
      </div>
    </div>}

    {screen==='dismissed'&&<div className="reflection-dismissed">
      <span aria-hidden="true">🌱</span>
      <p>Tudo bem não escrever hoje. Seu resultado está salvo, e você pode voltar aqui quando quiser.</p>
      <button type="button" onClick={()=>setScreen('invite')}>Quero refletir depois <ArrowRight size={15}/></button>
    </div>}
    {screen==='writing'&&<div className="reflection-writing">
      <div className="reflection-writing-head">
        <span className="reflection-eyebrow"><BookHeart size={16}/> MEU APRENDIZADO DE HOJE</span>
        <span className="reflection-counter">PERGUNTA {step+1} DE 3</span>
      </div>
      <div className="reflection-dots" aria-label={`Pergunta ${step+1} de 3`}>
        {[0,1,2].map(i=><span key={i} className={i<=step?'active':''}/>)}
      </div>
      <div className="reflection-prompt-art" aria-hidden="true">{['🌱','🌷','🌻'][step]}</div>
      <h2>{guide.questions[step].prompt}</h2>
      <p className="reflection-encouragement">{[
        'Escreva a primeira coisa que vier à cabeça. Pode ser bem curtinho.',
        'Imagine uma conversa tranquila, sem palavras difíceis.',
        'Não saber tudo faz parte do aprendizado. Uma dúvida também vale.'
      ][step]}</p>
      <label className="reflection-label" htmlFor="reflection-answer">Sua resposta (opcional)</label>
      <textarea
        id="reflection-answer"
        rows={5}
        maxLength={MAX_REFLECTION_ANSWER}
        placeholder={['Hoje eu entendi que...','Eu explicaria assim...','Ainda quero entender melhor...'][step]}
        value={answers[step]??''}
        onChange={e=>{
          const value=e.target.value;
          setAnswers(prev=>prev.map((old,i)=>i===step?value:old));
          setMessage('');
        }}
      />
      <div className="reflection-count">{(answers[step]??'').length}/{MAX_REFLECTION_ANSWER}</div>
      <p className="reflection-auto-save"><CheckCircle2 size={15}/> Rascunho guardado neste dispositivo, mesmo que você saia desta tela.</p>
      {message&&<p className="reflection-message" role="status">{message}</p>}
      <div className="reflection-controls">
        <button type="button" className="btn btn-outline" onClick={()=>{
          if(step===0){setScreen('invite');}else{setStep(v=>v-1);setMessage('');}
        }}><ArrowLeft size={16}/>{step===0?'Voltar':'Anterior'}</button>
        <button type="button" className="btn btn-primary" onClick={next}>
          {step===2?'Guardar aprendizado':'Continuar'} {step===2?<NotebookPen size={17}/>:<ArrowRight size={17}/>}
        </button>
      </div>
      <button type="button" className="reflection-skip" onClick={()=>{setScreen('dismissed');setMessage('');}}>Deixar para depois</button>
    </div>}

    {screen==='saved'&&<div className="reflection-saved">
      <span className="reflection-saved-illustration" aria-hidden="true">🌻📒</span>
      <span className="reflection-eyebrow"><CheckCircle2 size={16}/> APRENDIZADO GUARDADO</span>
      <h2>Suas palavras também fazem parte da sua evolução! 💛</h2>
      <p>Seu registro está no <strong>Meu Caderninho → Aprendizados</strong>. Você poderá reler, editar ou marcar para estudar depois quando quiser.</p>
      <div className="reflection-saved-actions">
        <button type="button" className="btn btn-primary" onClick={onOpenNotebook}>Abrir Meu Caderninho <ArrowRight size={17}/></button>
        <button type="button" className="btn btn-outline" onClick={start}>Editar o que escrevi</button>
      </div>
      <span className="reflection-kindness"><Heart size={14}/> Escrever não altera sua nota nem é uma obrigação.</span>
    </div>}
  </section>;
}
