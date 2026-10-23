# Rumo ao INSS 🌻

## Conferir minha resposta durante o simulado

- **Ao selecionar uma resposta, ela fica travada imediatamente.** Não é possível selecionar outra opção, desfazer a escolha ou alterá-la ao voltar à questão.
- O botão **Conferir minha resposta** só é habilitado após uma escolha. Mostra se houve acerto/erro, destaca a resposta correta, informa o gabarito e apresenta a mesma explicação da correção final ("Entender a resposta").
- Questões oficiais indicam que o comentário de estudo **não é justificativa oficial da banca**. Exercícios de alternativas adaptadas mantêm a indicação de autoria.
- O botão não obriga a conferir: a estudante pode navegar ou finalizar com questões em branco (importante no modo Cebraspe).
- A conferência é salva junto ao simulado no dispositivo, de modo que voltar à questão ou recarregar mantém o feedback aberto. Simulados iniciados em versões anteriores continuam compatíveis: respostas existentes também permanecem bloqueadas, mas podem ser conferidas.
- O histórico, nota e ranking usam os mesmos gabaritos e regras de pontuação de antes; visualizar a correção não altera acertos.

## Meu Caderninho 📒 — notas e questões salvas de qualquer tela

A estudante encontra um botão flutuante 📒 na parte inferior da interface. No desktop ele abre um painel lateral; no celular, uma folha deslizante. O conteúdo é **particular a cada perfil**.

- **Anotações livres:** título, texto simples, matéria, assunto e marcador opcional **Estudar depois**. É possível buscar, filtrar, editar e excluir.
- **Questões guardadas:** botão `Guardar questão` durante o simulado, na revisão e no banco de questões. Também é possível salvar a questão em andamento dentro do painel. A questão inclui seu enunciado, opções e origem, mas **NÃO armazena gabarito, resposta escolhida ou comentário de correção**: guardar uma questão não revela nada antes da hora.
- **Durante o simulado:** abrir/fechar o caderno não muda `quiz.current`, `quiz.answers`, tempo nem `checkedAnswers`. Resposta travada continua travada. O caderno nunca conta como um dia de streak nem pontua para ranking.
- **Offline:** notas são guardadas no `localStorage` por perfil (limite inicial: 100 itens ativos; texto de até 1.500 caracteres), e permanecem disponíveis ao desconectar.
- **Nuvem:** perfis Google usam o campo `notebook` de `users/{uid}` no Firestore, com transação de merge por ID/versão. Exclusões geram marcadores de exclusão (tombstones) para não reaparecerem após sincronização. O app tenta reenviar ao recuperar conexão ou foco.
- **Backup:** exportação `v4` inclui `notebook` e é compatível com restauração de v1, v2 e v3. Importação combina os registros existentes, sem apagar anotações anteriores.

**Privacidade:** o Firebase exige autenticação e permite acesso somente ao próprio UID pelas Rules existentes. No modo local, dados permanecem no navegador **sem criptografia adicional**; não use notas para senhas ou segredos em dispositivos compartilhados. PDFs/arquivos/fotos, formatação rica e resumos gerados por IA não fazem parte desta primeira versão.

### Checklist de QA

`npm ci && npm test && npm run build`

Conferir: simulado Certo/Errado e A–E; guardar uma questão **antes** de conferir a resposta; fechar/reabrir sem interromper o simulado; edição/exclusão; filtros e pesquisa; dois perfis diferentes; backup antigo e v4; Firebase login/desconexão/retomada; painel móvel e teclado (Tab/Esc).

---

## Sequência Girassol — hábito gentil de estudo

A **Sequência Girassol 🌻** aparece no início e no Meu Cantinho. Ela soma **dias com atividade real**, sem qualquer exigência de acerto:

- Simulado finalizado (inclusive com nota zero ou negativa).
- Pelo menos uma microaula concluída no Girassol (responder ou escolher só ler).
- Pelo menos uma Cartinha estudada e marcada como **Já sabia** ou **Quero revisar**.
- Várias atividades no mesmo dia valem **apenas um dia** para a sequência.

**Regra de calendário:** todos os registros são convertidos para **America/Sao_Paulo**, inclusive quando a estudante usa aparelhos em outros fusos. Se hoje ainda não houve estudo, a sequência de ontem permanece ativa durante o dia. Uma pausa maior reinicia o contador atual, mas **nunca apaga o recorde**, nem o jardim, nem o histórico.

A interface mostra calendário dos últimos sete dias, sequência atual, recorde e próxima florada (3, 7, 14, 30, 60, 100 dias...). Mensagens são positivas, sem pressão, perda de pontos, alarmes ou notificações coercitivas.

**Persistência:** não há contador editável nem uma nova coleção Firestore. A sequência é **calculada**, evitando duplicidades, a partir de `attempts` já salvos (inclusive sincronizados pela conta Google) e `cozy.events` já sincronizados pelo Cantinho. Não altera notes, estatísticas de questões nem ranking.

**Verificação:** `npm test` cobre dias repetidos, meia-noite em São Paulo, notas negativas, pausa, recorde, datas inválidas, eventos vindos do Google e próximo marco. `npm run build` checa a interface. Testar também troca de perfil, backup e uso em celular.

---

## Meu Cantinho 🌻 — Girassol e Cartinhas do Saber

O menu **Meu Cantinho** é um espaço de estudo acolhedor, **independente dos simulados e do ranking**. Não há cronômetro, nota, obrigação diária ou penalidade.

- **Modo Girassol:** 24 microaulas autorais distribuídas pelas oito matérias. Escolha 1, 3 ou 5 pequenos passos e, opcionalmente, uma matéria. Cada passo tem leitura breve, questão de Certo/Errado e explicação imediata. A estudante pode optar por apenas ler. O jardim cresce pelos passos concluídos, **nunca pelos acertos**.
- **Cartinhas do Saber:** escolha 5 ou 10 cartões, com assunto específico ou misturado. A frente traz uma afirmação do **banco autoral** e o verso mostra o gabarito e a explicação. Após virar, marque **Já sabia** ou **Quero revisar**. Os cartões indicados para revisão têm prioridade nas próximas sessões.
- **Retomar:** uma sessão iniciada fica guardada por perfil neste dispositivo. Voltar ao menu e acessar a aba novamente permite continuar de onde parou.
- **Progresso independente:** eventos de estudo são persistidos separadamente do histórico de provas, da nota Cebraspe, da evolução dos simulados e do leaderboard.
- **Sincronização:** usando Google/Firebase, os eventos são mesclados no documento `users/{uid}`, campo `cozy`, que já é autorizado pelas Rules atuais. Se a rede falhar, o estudo permanece salvo localmente. A posição da sessão em andamento é **local**, não sincronizada entre aparelhos.
- **Backup:** exportação `v3` inclui as atividades leves; restauração aceita v1, v2 e v3, sem duplicar eventos.
- **Transparência:** tanto as microaulas quanto as cartinhas são **treinos adaptados/autorais**. Nunca são apresentados como transcrições oficiais de provas. O conteúdo requer revisão pedagógica e atualização quando houver mudanças legislativas.

### Validação do Cantinho

Antes do deploy, execute `npm ci && npm test && npm run build` e verifique os fluxos em desktop e mobile: iniciar, responder, ler sem responder, concluir, virar cartões, marcar para revisão, fechar a aba, retomar, reiniciar, usar dois perfis, exportar/importar backup e sincronizar com a conta Google. Esta funcionalidade não precisa de alterações de Firestore Rules.

---

## Novidade — modo Alternativas A–E (treino adaptado)

Em **Simulados → Formato**, a estudante pode escolher:

- **Original • Certo ou Errado**: preserva cada item da banca, com opção de nota Cebraspe (+1/−1/0) ou treino leve.
- **Alternativas A–E**: monta uma questão com **cinco afirmações C/E já cadastradas da mesma matéria**. Quatro têm uma classificação e apenas uma tem a classificação oposta. A pergunta pede para identificar a alternativa correta ou incorreta. Nota: +1 pelo exercício acertado; zero por erro ou branco.

**Transparência:** A–E gerado **não é questão oficial aplicada na prova**, mesmo quando todas as afirmações foram retiradas de itens oficiais. O exercício fica marcado **"Treino adaptado"** e suas cinco questões de origem ficam em `adaptedFrom`; não é adicionado ao banco permanente.

**Disponibilidade:** cada exercício exige 5 itens completos do mesmo assunto geral (matéria), com gabaritos compatíveis; contextos incompletos/anulados/revisão não entram. A quantidade máxima pode ser menor que no modo Certo/Errado. Para mais exercícios, selecione "Todas misturadas".

**Histórico:** tentativas antigas são interpretadas como Certo/Errado; novas têm `exerciseFormat`. O gráfico de evolução pode ser filtrado por formato. O ranking permanece amistoso: 10 pontos por exercício correto em ambos os modos, sem alegação de equivalência pedagógica.

**Validar antes do deploy:** `npm ci && npm test && npm run build`. Testar geração A–E com uma única alternativa válida, ausência de repetição das afirmações na mesma sessão, filtros de origem/matéria, apresentação da correção, backup/restore, smartphone e sessões antigas.

---

Um aplicativo simples, mobile-first, para praticar questões e acompanhar a evolução dos estudos para **Técnico do Seguro Social (INSS)**.

> **Não é um produto oficial do INSS ou do Cebraspe.** As 234 questões que já acompanham o aplicativo (114 base + 120 da expansão Certo/Errado) são **autorais, de treino**, não são transcrições de provas. Legislação e editais podem mudar. Confira tudo em fontes atuais antes de estudar para um concurso futuro.

## O que já está pronto

- Criar perfis por nome/apelido (modo local), um por estudante.
- Escolher **5, 10, 20, 30, 50 ou um número personalizado** de questões (até o número disponível).
- Selecionar uma ou várias disciplinas, ou misturar todas.
- Sorteio sem repetição dentro de cada simulado.
- Questões **Certo/Errado** e questões de **múltipla escolha (4–5 opções)**.
- Correção Treino (+1 por acerto) e Cebraspe (+1 acerto, −1 erro, zero em branco), este último para simulados só de Certo/Errado. Se houver múltipla escolha, utiliza automaticamente o modo Treino.
- Salvar simulado em andamento e retomá-lo depois.
- Correção comentada, acertos, erros, brancos, nota e aproveitamento.
- Identificar matérias e assuntos com mais erros; revisar questões ainda não superadas.
- Histórico de simulados, gráficos de evolução e desempenho por matéria.
- Ranking amistoso por perfil e pontos (10 pontos por acerto).
- Exportar/restaurar backup de históricos + banco personalizado.
- Importar questões em CSV e JSON. Possui modelos no próprio aplicativo.
- Links para editais, provas e gabaritos anteriores.
- Funciona em computador ou celular, com ícone para tela inicial.
- Firebase opcional: autenticação por Google e sincronização entre dispositivos.

## 1. Rodar localmente

Requisitos: Node.js 20.19+ ou 22+ e npm.

```bash
npm install
npm run dev
```

Abrir o endereço indicado pelo Vite (normalmente `http://localhost:5173`). Para verificar:

```bash
npm test
npm run build
```

**Sem configurar o Firebase, não precisa de servidor nem banco de dados:** perfis, simulados e resultados são armazenados no `localStorage` do navegador. Isso também significa que **abrir em outro celular não recupera automaticamente o progresso**. Use backup ou configure o Firebase.

## 2. Publicar na Vercel

1. Crie um repositório GitHub e envie os **arquivos da pasta do projeto** (não a pasta `dist`, nem `.env.local`).
2. Vercel → **Add New** → **Project** → importe o repositório.
3. Framework: **Vite**; Build command: `npm run build`; Output directory: `dist`.
4. Deploy. O app funciona imediatamente em **modo local**.
5. Cada alteração no repositório pode gerar um novo deploy automático.

Você também pode publicar com a CLI Vercel (`npx vercel`), mas a integração com GitHub facilita atualizações.

**Importante:** Vercel hospeda o site, **não substitui um banco de dados**. Para compartilhar o progresso entre celular e computador, siga o passo Firebase.

## 3. Sincronizar com Google (opcional, recomendado para estudar em vários aparelhos)

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com/).
2. **Authentication** → **Sign-in method** → habilite **Google** e configure o e-mail de suporte.
3. **Firestore Database** → crie o banco de dados em modo produção.
4. Em **Firestore → Rules**, cole **exatamente** o conteúdo de `firestore.rules` e clique em **Publish**. Não deixe regras de teste abertas.
5. Firebase → **Project Settings** → **Your apps** → adicione um aplicativo **Web** e copie a configuração.
6. Na Vercel → projeto → **Settings** → **Environment Variables**, cadastre:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
```

7. Firebase → **Authentication → Settings → Authorized domains**: adicione o **domínio exato** que aparece no deploy Vercel. Adicione também um domínio customizado se usar um. O Firebase não aceita qualquer domínio automaticamente.
8. Faça **redeploy** na Vercel (as variáveis Vite são incorporadas na compilação).
9. Abra o app e clique **Entrar com Google**. Depois disso, as tentativas serão sincronizadas no perfil Google.

Para migrar estudos de um perfil local: abra **Minha evolução** → **Exportar backup**; faça login com Google e use **Restaurar backup**. Isso transfere as tentativas para o perfil Google.

### Privacidade e limitações da sincronização

- Somente o titular autenticado tem acesso às próprias tentativas e banco personalizado, conforme as regras fornecidas.
- O ranking expõe **nome, foto e estatísticas resumidas** aos demais usuários Google autenticados do mesmo Firebase. Não coloque dados pessoais sensíveis no apelido. Se quiser privacidade total, use apenas modo local.
- As pontuações do ranking são escritas pelo cliente: ele é **motivacional, sem auditoria antifraude**. Para um ranking público sério, seria necessário validar os resultados no servidor.
- O login Google, neste MVP, não é restrito a um e-mail autorizado. Um visitante que acessar a URL também pode criar seu perfil e aparecer no ranking. Para um app privado com controle de acesso, seria necessário adicionar uma lista de e-mails permitidos em regras e/ou no servidor.
- Se o Firebase ficar indisponível, tentativas são salvas localmente, mas a sincronização pode falhar. Faça backup regularmente.

## 4. Importar novas questões

Abra **Questões e provas → Importar** e faça upload de um arquivo **JSON ou CSV** de até 2 MB; limite de 400 questões personalizadas por perfil. Questões com o mesmo ID substituem a versão importada anterior; IDs do pacote inicial são reservados.

### JSON: Certo/Errado

```json
[
  {
    "id": "treino-001",
    "subject": "Direito Previdenciário",
    "topic": "Seguridade Social",
    "statement": "A seguridade social compreende saúde, previdência e assistência social.",
    "correct": "C",
    "explanation": "Artigo 194 da Constituição Federal.",
    "origin": "Questão autoral"
  }
]
```

### JSON: múltipla escolha

```json
[
  {
    "id": "2012-exemplo-001",
    "subject": "Língua Portuguesa",
    "topic": "Interpretação",
    "statement": "Qual alternativa apresenta a opção correta? (exemplo fictício)",
    "options": ["Opção A", "Opção B", "Opção C", "Opção D", "Opção E"],
    "correct": "B",
    "explanation": "Aqui deve entrar uma justificativa revisada para a alternativa B.",
    "origin": "Exemplo, não é questão oficial"
  }
]
```

### CSV

Cabeçalho: `id,subject,topic,statement,correct,explanation,origin,sourceUrl,optionA,optionB,optionC,optionD,optionE`

- Sem opções, `correct` precisa ser `C` (Certo) ou `E` (Errado).
- Com 4 ou 5 opções não vazias, `correct` deve ser uma das letras `A–D/E`.
- O campo `sourceUrl` é opcional, precisa ser URL `https://`.
- Se o texto tiver vírgula, coloque-o entre aspas duplas no CSV.
- **Não é possível enviar PDF diretamente**: a extração, a associação ao gabarito (incluindo anulações) e a revisão precisam ser feitas antes da importação.

## 5. Provas e referências

Há links consultáveis na aba **Questões e provas → Provas anteriores**, incluindo o [edital INSS 2022](https://cdn.cebraspe.org.br/concursos/inss_22/arquivos/ED_1_INSS_22_ABERTURA.PDF), [gabarito definitivo 2022](https://cdn.cebraspe.org.br/concursos/inss_22/arquivos/GAB_DEFINITIVO_760_INSS_001_01.PDF), [gabarito definitivo 2016](https://cdn.cebraspe.org.br/concursos/inss_2015/arquivos/gab_definitivo_234inss_002_06_txt.pdf) e [índice de provas 2008–2022](https://www.pciconcursos.com.br/provas/tecnico-do-seguro-social-abrangente).

**Atenção:** provas antigas, especialmente previdenciárias, podem conter dispositivos revogados, alterações posteriores e questões anuladas. Não carregue um gabarito sem confirmar edição/caderno e anulações.

## Estrutura do projeto

```text
src/App.tsx              Páginas e navegação
src/styles.css           Design responsivo
src/data/questions.json  234 itens de treino autorais
src/lib/engine.ts        Sorteio, correção, ranking e análises
src/lib/storage.ts       Persistência local
src/lib/firebase.ts      Google Auth e Firestore opcionais
src/lib/import.ts        Leitor CSV/JSON e validação de questões
src/lib/backup.ts        Restauração com validação de histórico
firestore.rules          Regras de acesso para o Firestore
public/                  Favicon, ícones e manifesto mobile
vercel.json              Configuração de build e cabeçalhos
```

## Próximas evoluções possíveis

- Ampliar o banco com questões **oficiais e efetivamente revisadas**, com fonte, ano, banca, caderno, número e status de anulação.
- Filtros por banca, ano, assunto e nível de dificuldade; evitar itens resolvidos recentemente.
- Metas semanais, sessões cronometradas e plano de revisão espaçada.
- IA opcional para explicar erros, mas **sem substituir a conferência jurídica**.
- Sincronizar rascunhos de simulados entre aparelhos.
- Restrição do Firebase a contas permitidas e validação do ranking no servidor.

---

**Status do pacote:** dependências instaladas, testes unitários (`npm test`) e build de produção (`npm run build`) validados com sucesso (100% aprovados). Projeto pronto para deploy na Vercel e integração com Firebase/Firestore.
