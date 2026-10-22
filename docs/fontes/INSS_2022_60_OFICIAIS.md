# Lote 01 — 60 questões oficiais INSS 2022 (Cebraspe)

**Estado:** manifesto de fonte e gabarito definitivo preparado; transcrições **ainda não adicionadas** ao app. O JSON desta pasta **NÃO** é arquivo para importar diretamente na interface, porque não contém o enunciado — isso é intencional para evitar conteúdo incompleto ou reproduzido sem verificação.

## Fontes primárias
- [Caderno original de conhecimentos específicos — 760_INSS_001_01](https://cdn.cebraspe.org.br/concursos/inss_22/arquivos/760_INSS_001_01.PDF)
- [Gabarito definitivo correspondente](https://cdn.cebraspe.org.br/concursos/INSS_22/arquivos/GAB_DEFINITIVO_760_INSS_001_01.PDF)
- Aplicação: **27/11/2022**, cargo **Técnico do Seguro Social**.

## Seleção
Os itens **51 a 117**, excetuados os anulados **54, 65, 68, 72, 74, 104 e 106**, totalizam exatamente **60 questões válidas**. Os IDs oficiais são estáveis (ex.: `inss-oficial-cebraspe-2022-760-001-051`). O acervo ainda não deve contar estes registros como disponíveis até o enunciado ser transcrito e conferido.

## Próximo trabalho (necessário para disponibilizar as 60 no simulado)
1. Abrir o PDF original, extrair o texto dos 70 itens mantendo a ordem de leitura das **duas colunas**.
2. Comparar **cada** transcrição com o item original no PDF. Não usar paráfrase de IA como se fosse oficial.
3. Preservar integralmente a **situação hipotética compartilhada pelos itens 91–95**, e a referência à EC 103/2019 no item 107.
4. Conferir os gabaritos no arquivo **definitivo da mesma aplicação/caderno**. Os 7 `X` já foram excluídos.
5. Verificar condições de reprodução/licença, particularmente para o repositório público e a publicação na Vercel. Se não houver permissão para republicar os enunciados, mostrar um leitor/link do documento original, e manter só os metadados públicos.
6. Revisar legislação **atual** independentemente da correção **histórica** da banca. Quaisquer itens desatualizados devem ser classificados como `outdated`, não pontuáveis, até a sinalização pedagógica apropriada.
7. Acrescentar `statement`, `correct`, `explanation` e `origin` ao registro, assim como `source.kind='official'`, `source.verification='verified'`, `status='active'` **somente após revisão**.
8. Importar pela aba **Questões e provas → Importar**, preservando IDs, banco autoral, Firebase, evolução e ranking. Validar um simulado com 10 itens no filtro **Oficiais**.
9. Executar testes e build (Vitest, TypeScript, Vite). Não fazer deploy automático antes da revisão.

### Integridade
Os registros do catálogo são metadados: origem oficial identificada **não equivale** a texto extraído/revisado ou licença de reprodução verificada. Não exibir "60 questões disponíveis" enquanto o aplicativo não tiver as 60 questões completas e validadas.

Existe um pacote auxiliar offline preparado nesta conversa com um extrator PDF em Python (PyMuPDF), manifesto e testes sintéticos. Use-o para gerar JSON candidato a importação, mas submeta o resultado à revisão humana.

### Cuidados conhecidos
- Caderno de 2022 para Guarulhos teve **reaplicação em outra data**, com gabarito próprio. Não misturar arquivos.
- Questões 91–95 não podem aparecer isoladas da situação hipotética sobre o defeso de camarão/lagosta.
- Comentários de estudo não devem ser atribuídos à banca.
