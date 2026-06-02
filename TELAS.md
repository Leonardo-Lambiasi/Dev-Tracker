# Telas e Funções — Dev Tracker

Referência de telas, componentes e comportamentos por usuário. Estado: junho/2026.

---

## Navegação

Quatro rotas, três delas protegidas por JWT (`[Authorize]`):

| Rota         | Componente           | Descrição                                        |
|--------------|----------------------|--------------------------------------------------|
| `/login`     | `Login.jsx`          | Tela full-screen fora do layout principal        |
| `/`          | `Home → Dashboard`   | Dashboard principal                              |
| `/registrar` | `Register → DailyForm` | Formulário de registro diário                |
| `/historico` | `History`            | Histórico de registros com exclusão e export PDF |

Rotas protegidas redirecionam para `/login` se não autenticado.

---

## Diferenças por usuário

| Recurso | Leo | Rafa |
|---|---|---|
| Tema | Índigo `#6366f1` | Roxo `#9333ea` |
| Seção Estudos no form | ✓ | — |
| Seção Trabalho (Rift) no form | ✓ | — |
| Seção Saúde & Bem-estar no form | — | ✓ |
| Seção Lazer no form | — | ✓ |
| Treino: opções | Academia / Vôlei / Ambos / Nenhum | Academia / Caminhada-Corrida / Bike / Nenhum |
| Campo Destaque na reflexão | ✓ | ✓ |
| Painel Financeiro (metas) | ✓ | ✓ |
| Painel Extrato bancário | ✓ | ✓ |
| Cards bem-estar (humor, atend., conteúdo, lazer) | — | ✓ |
| Card "Coisas boas da semana" (gratidões + conquistas) | — | ✓ |
| Timeline treino semanal (academia/caminhada/bike) | — | ✓ |
| Banner modo cuidado (humor baixo) | — | ✓ |
| Painel lazer & hiperfoco (gráfico por semana) | — | ✓ |
| Aderência à rotina (checkin + gráfico) | — | ✓ |
| Gráfico horas de estudo | ✓ | — |
| Gráfico qualidade do sono | — | ✓ |
| Gráfico tópicos estudados (barra horizontal) | ✓ | — |
| Humor colorido no form (vermelho→verde) | — | ✓ |
| Metas financeiras incluídas no prompt da análise semanal | ✓ | — |
| Metas financeiras incluídas no prompt do extrato | ✓ | ✓ |
| Prompt IA diário | Dev em transição, direto, sem elogios vazios | Acolhedora, foco bem-estar |
| Prompt IA semanal | Estudos, Rift, treino, projetos, metas financeiras | Bem-estar, sono, atend., gratidão, lazer, aderência |

---

## Tela: Dashboard (`/`)

### Componentes renderizados (em ordem)

1. **Banner modo cuidado** *(só Rafa)* — aparece se média de humor dos últimos 3 registros < 2. Dispensável com `×`. Em modo cuidado: seções de treino e rotina colapsam por padrão.

2. **Banner "registrar hoje"** — aparece se não há registro para o dia local atual. Link para `/registrar`.

3. **Cards bem-estar** *(só Rafa, fora do modo cuidado)*
   - Humor médio da semana
   - Atendimentos realizados
   - Cancelamentos (laranja se > 0)
   - Conteúdo postado
   - Dias com lazer (`X/7`)
   - Aderência à rotina com seta de tendência (`↑` / `↓` / `→`)

4. **Card "Coisas boas da semana"** *(só Rafa, sempre visível)* — gratidões e conquistas da semana atual.

5. **Timeline treino Rafa** *(só Rafa)* — academia, caminhada/corrida, bike e rendimento médio. Colapsável em modo cuidado.

6. **Cards Leo** *(só Leo)* — horas de estudo, tickets Rift, humor médio, dias registrados.

7. **Gráficos** — fade-in escalonado ao carregar. Cada gráfico usa classe `chart-appear` com animação de entrada:
   - Horas de estudo por dia *(só Leo)* — linha, últimas 4 semanas
   - Humor por dia da semana — barras
   - Qualidade do sono por dia *(só Rafa)* — barras
   - Tópicos estudados *(só Leo)* — barras horizontais, últimas 4 semanas

8. **Painel lazer & hiperfoco** *(só Rafa, se houver dados)* — barras empilhadas de lazeres por semana + gráfico de aderência à rotina.

9. **FocoProjetos** — projetos em andamento com edição inline do "próximo passo". Click-outside fecha o campo.

10. **WeeklyGrid** — grade de rotina semanal (ver seção abaixo).

11. **ProjectTracker** — CRUD completo de projetos: nome, stack, status, percentual, próximo passo.

12. **FinancePanel** — metas financeiras: CRUD com valor alvo, valor atual, progresso e prazo.

13. **ExtratoPanel** — análise de extrato bancário via IA.

14. **TrainingPanel** — análise de treino das últimas 4 semanas: contagem por tipo e gráfico de consistência.

15. **WeeklyReport** — análise semanal gerada pela IA.

---

## Tela: Registrar (`/registrar`)

Formulário colapsável por seção. Todas as seções fechadas mostram hint do conteúdo preenchido.

### Seção Geral (sempre visível)
- **Data** — padrão: hoje (data local, não UTC). Bloqueado para datas futuras.
- **Humor** — botões 1–5 com emoji. **Obrigatório.** Rafa: colorido (vermelho→verde). Leo: cor única.

### Seção Saúde & Bem-estar *(só Rafa)*
- Rating 1–5: qualidade do sono
- Número (min=0, max=20): atendimentos realizados
- Número (min=0, max=10): conteúdos postados
- Número (min=0, max=10): cancelamentos (mostra campo de motivo se > 0)
- Textarea: gratidão do dia

### Seção Lazer *(só Rafa)*
- Seleção de lazer (lista personalizada + defaults padrão)
- Cadastro de novo lazer inline
- Rating 1–5: intensidade/foco
- Textarea: observação

### Seção Estudos *(só Leo)*
- Horas estudadas (número, min=0, max=24, step=0.5)
- Tópico estudado (texto livre)

### Seção Trabalho — Rift *(só Leo)*
- Tickets trabalhados (número, min=0, max=50)
- Horas trabalhadas (número, min=0, max=24, step=0.5)

### Seção Treino *(ambos)*
- **Leo:** Academia / Vôlei / Ambos / Nenhum
- **Rafa:** Academia / Caminhada-Corrida / Bike / Nenhum
- Se treinou: Rating de rendimento 1–5 + textarea de observação

### Seção Reflexão *(ambos)*
- Conquistas, Desafios, Destaques (textareas)

### Após salvar
- Se IA retornou insight: exibe o texto com botão "Ver dashboard". Tom e número de frases variam por usuário (Leo: 2 frases; Rafa: 3 frases ou 2 frases se humor ≤ 2)
- Se IA falhou: card de sucesso com mensagem de fallback + redirect automático para o dashboard após 1s

---

## Tela: Histórico (`/historico`)

- Lista todos os registros do usuário (mais recente primeiro)
- Cada card mostra: data, humor, treino, horas de estudo/trabalho, destaque, desafios
- **Rafa:** mostra também sono, atendimentos e trecho da gratidão
- **Botão "Exportar PDF (7 dias)"** no cabeçalho — chama `GET /api/registros/exportar/pdf`, baixa automaticamente como blob (não abre nova aba). Loading state durante geração. Arquivo: `devtracker-historico-DD-MM-YYYY.pdf`
- Botão de exclusão com confirmação inline por card (não usa `alert()` ou `confirm()`)
- Mensagem de erro inline se exclusão falhar ou PDF falhar

---

## Componente: Rotina Semanal (WeeklyGrid)

- Grade 7 dias × 3 períodos (Manhã / Tarde / Noite)
- **Desktop:** grade completa com painel de detalhe abaixo ao clicar uma célula
- **Mobile:** abas por dia com lista de períodos, painel inline ao clicar
- Clique em célula → lista os slots daquele dia/período + botão "Novo slot"
- Checkin por slot: botão de status (○ → ✓ → ✗ → ○), persistido por semana

### Slots recorrentes

- Toggle "↻ Repetir toda semana" no form de criar/editar
- Quando ativado: checkboxes Dom–Sáb para selecionar os dias de repetição (mínimo 1 dia obrigatório)
- O slot "template" vive no seu `DiaSemana` original; cópias virtuais são injetadas nos outros dias configurados onde não há slot manual no mesmo dia/período
- Visual diferenciado: **borda tracejada** + **ícone ↻** na compact view e no painel
- Clicar "Editar..." em slot virtual abre diálogo:
  - **"Editar só este dia"** → cria novo slot real naquele dia (não recorrente), sobrepondo a injeção
  - **"Editar todos os recorrentes"** → abre o template para edição; banner explica "↻ Editando template recorrente — alterações afetam todos os dias em que aparece"
- Checkin em slot virtual: aplicado ao slot original (compartilhado entre instâncias da mesma semana)

---

## Componente: ExtratoPanel

Aceita extrato em texto livre ou PDF. Modos selecionáveis via botão no painel.

### Resposta da IA (novo schema)

```json
{
  "resumo": "string — síntese do período",
  "categorias": [{ "nome": "string", "valor": number, "percentual": number }],
  "maiores_gastos": [{ "descricao": "string", "valor": number }],
  "padrao": "string",
  "recomendacao": "string",
  "projecao": "No ritmo atual, fecha o mês com R$ X de sobra/deficit",
  "acoes_concretas": ["ação 1", "ação 2", "ação 3"],
  "alertas": ["alerta de gasto oculto ou padrão de impulso"],
  "metas_impacto": [{ "meta": "string", "observacao": "string" }]
}
```

Retrocompatibilidade: análises antigas (schema anterior com `resumo` como objeto) são renderizadas corretamente pela detecção `typeof dados.resumo === 'string'`.

---

## Componente: WeeklyReport

- Exibe a última análise semanal gerada
- **Botão "Gerar análise"** visível se: nenhuma análise anterior **ou** última análise há mais de 7 dias
- Contador "Próxima análise disponível em X dia(s)" quando dentro do cooldown
- Loading state durante geração (~30s para Gemini Flash com ThinkingBudget=2048)
- Análise estruturada em 4 seções: Visão Geral / Destaques / Padrões Preocupantes / Foco para o próximo período
- Intervalo dinâmico: começa na `SemanaFim` da última análise (não fixo em 7 dias). Com cooldown de 12h mínimo entre análises consecutivas.

---

## IA — Fluxo detalhado

### Insight diário

Disparado automaticamente ao salvar um registro. Usa contexto expandido:

**Leo:**
- Dados do dia (humor, estudo, trabalho, treino, destaque, desafios)
- Últimos 5 registros como tendência
- Projetos ativos com % e próximo passo
- Streak de treino (calculado sobre os últimos 30 registros)
- Saída: 2 frases — observação honesta + ação concreta para amanhã. Sem elogios vazios.

**Rafa:**
- Dados do dia (humor, sono, atendimentos, conteúdo postado, gratidão, lazer, treino)
- Últimos 5 registros como tendência
- Alerta se humor médio ≤ 2 nos últimos 3 registros
- Saída: 3 frases — observação + encorajamento genuíno + ação. Tom acolhedor mas honesto.
- Se humor do dia ≤ 2: prompt diferente (modo cuidado) com 2 partes: acolhimento + ação gentil para amanhã

Modelo: Gemini 2.5 Flash (ThinkingBudget=0). Máximo 500 tokens. Fallback textual se IA falhar.

### Análise semanal

Disparada manualmente. Cooldown mínimo de 7 dias. Intervalo dinâmico desde `SemanaFim` da última análise.

**Leo — contexto:**
- Todos os registros do período com totais de estudo, trabalho, treino, humor
- Comparação explícita com período anterior (horas, humor, academia)
- Projetos ativos com %
- Metas financeiras com progresso %
- Insights diários do período
- Contexto da última análise (primeiros 400 chars) para comparação de progresso
- Contexto financeiro (últimos 400 chars da última análise financeira)

**Rafa — contexto:**
- Todos os registros com sono, atendimentos, gratidões, lazer, humor
- Alerta crítico se ≥ 3 dias com humor < 3
- Comparação com período anterior (humor, sono, atendimentos, academia)
- Aderência à rotina (semana atual e anterior)
- Insights diários do período
- Contexto da última análise para comparação

Modelo: Gemini 2.5 Flash (ThinkingBudget=2048). Máximo 1200 tokens. Sem emojis. Máximo 400 palavras.

### Análise financeira

- Prompt inclui o extrato + metas financeiras cadastradas do usuário (descrição, valor atual, meta, progresso %)
- Modelo: Gemini 2.5 Flash (jsonMode=true, ResponseMimeType=application/json)
- Máximo 2000 tokens
- Salvo no banco como `AnaliseSemanal` com tipo "financeiro"

---

## Segurança

- Rate limiting: `POST /api/auth/login` → máximo 10 req/min por IP. HTTP 429 com mensagem "Muitas requisições. Tente novamente em instantes."
- Falha de autenticação: `ILogger.LogWarning` com formato `Login falhou para usuário '{Username}' — IP: {Ip} — {Timestamp}`
- Senha nunca logada; só `req.Usuario`
- Frontend: `api.login` lê o body do erro (JSON ou texto plano) e propaga a mensagem real. Se 429, exibe a mensagem de rate limit — não o genérico "Usuário ou senha inválidos"

---

## API — Endpoints completos

Todos requerem `Authorization: Bearer <token>`, exceto `/api/auth/login` e `/health`.

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/login` | Login, retorna JWT |
| GET | `/health` | Health check público |
| POST | `/api/registros` | Cria registro + dispara insight IA |
| GET | `/api/registros` | Lista registros do usuário (filtro `?inicio=&fim=`) |
| GET | `/api/registros/{id}` | Busca por ID |
| GET | `/api/registros/semana` | Registros dos últimos 7 dias |
| GET | `/api/registros/resumo` | Métricas agregadas da semana |
| GET | `/api/registros/exportar/pdf` | PDF dos últimos 7 dias |
| PUT | `/api/registros/{id}` | Atualiza registro |
| DELETE | `/api/registros/{id}` | Remove registro |
| GET | `/api/projetos` | Lista projetos |
| POST | `/api/projetos` | Cria projeto |
| PUT | `/api/projetos/{id}` | Atualiza projeto |
| DELETE | `/api/projetos/{id}` | Remove projeto |
| GET | `/api/metas` | Lista metas financeiras |
| POST | `/api/metas` | Cria meta |
| PUT | `/api/metas/{id}` | Atualiza meta |
| DELETE | `/api/metas/{id}` | Remove meta |
| POST | `/api/analise/gerar` | Gera análise semanal |
| GET | `/api/analise/ultima` | Última análise (tipo desenvolvimento) |
| GET | `/api/analise/historico` | Histórico de análises (filtro `?tipo=`) |
| POST | `/api/financeiro/analisar-extrato` | Analisa extrato (texto) |
| POST | `/api/financeiro/analisar-pdf` | Analisa extrato (PDF, max 10MB) |
| GET | `/api/rotina` | Lista slots + expande recorrentes como virtuais |
| POST | `/api/rotina` | Cria slot (aceita `isRecorrente` e `diasRecorrentes`) |
| PUT | `/api/rotina/{id}` | Atualiza slot |
| DELETE | `/api/rotina/{id}` | Remove slot |
| GET | `/api/rotina/checkins?semana=YYYY-MM-DD` | Checkins da semana |
| PUT | `/api/rotina/{slotId}/checkin` | Upsert checkin (status: feito/nao_feito/"") |
| GET | `/api/rotina/aderencia?semanas=4` | Aderência das últimas N semanas |
| GET | `/api/lazeres` | Lista lazeres cadastrados (Rafa) |
| POST | `/api/lazeres` | Cria lazer |
| PUT | `/api/lazeres/{id}` | Atualiza lazer |
| DELETE | `/api/lazeres/{id}` | Remove lazer |
