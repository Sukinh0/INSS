# Rumo ao INSS 💜

Um aplicativo simples, mobile-first, para praticar questões e acompanhar a evolução dos estudos para **Técnico do Seguro Social (INSS)**.

> **Não é um produto oficial do INSS ou do Cebraspe.** As 114 questões que já acompanham o aplicativo são **autorais, de treino**, não são transcrições de provas. Legislação e editais podem mudar. Confira tudo em fontes atuais antes de estudar para um concurso futuro.

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
src/data/questions.json  114 itens de treino autorais
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
