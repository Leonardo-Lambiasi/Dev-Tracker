# Telas e Funções — Dev Tracker

Documento de referência para as telas e funcionalidades de cada usuário.

---

## Navegação

Três rotas protegidas por JWT (redireciona para `/login` se não autenticado):

| Rota | Componente | Descrição |
|---|---|---|
| `/login` | `Login.jsx` | Tela de login, full-screen, fora do layout |
| `/` | `Home → Dashboard` | Dashboard principal |
| `/registrar` | `Register → DailyForm` | Formulário de registro diário |
| `/historico` | `History` | Histórico de registros com exclusão |

---

## Diferenças por usuário

| Recurso | Leo | Rafa |
|---|---|---|
| Tema | Índigo (`#6366f1`) | Roxo (`#9333ea`) |
| Seção Estudos no form | ✓ | — |
| Seção Trabalho (Rift) no form | ✓ | — |
| Seção Saúde & Bem-estar no form | — | ✓ |
| Treino: opções | Academia / Vôlei / Ambos / Nenhum | Academia / Caminhada-Corrida / Bike / Nenhum |
| Campo Destaque na reflexão | ✓ | ✓ |
| Painel Financeiro | ✓ | ✓ |
| Painel Extrato bancário | ✓ | ✓ |
| Cards bem-estar (humor, atend., conteúdo) | — | ✓ |
| Timeline treino semanal (academia/caminhada/bike) | — | ✓ |
| Banner humor baixo | — | ✓ (média < 3 nos últimos 3 dias) |
| Gráfico horas de estudo | ✓ | — |
| Gráfico qualidade do sono | — | ✓ |
| Gráfico tópicos estudados (barra horizontal) | ✓ | — |
| Humor colorido no form | — | ✓ |
| Prompt IA diário | Dev em transição, direto | Acolhedora, foco bem-estar |
| Prompt IA semanal | Estudos, Rift, treino, finanças | Bem-estar, atend., gratidão, treino |

---

## Tela: Dashboard (`/`)

### Componentes renderizados

1. **Banner humor baixo** *(só Rafa)* — aparece se média de humor dos últimos 3 dias < 3. Dispensável com `×`.

2. **Banner "registrar hoje"** — aparece se não há registro para o dia atual. Link para `/registrar`.

3. **Cards bem-estar** *(só Rafa)*
   - Humor médio da semana (colorido)
   - Atendimentos realizados
   - Conteúdo postado / meta 3/semana com barra de progresso (ocupa 2 colunas)

4. **Timeline treino Rafa** *(só Rafa)* — academia, caminhada/corrida, bike e rendimento médio em linha horizontal.

5. **Cards Leo** *(só Leo)* — horas de estudo, tickets Rift, humor médio, dias registrados.

6. **Gráficos**
   - Horas de estudo por dia *(só Leo)* — linha, últimas 4 semanas
   - Humor por dia da semana — barras, semana atual
   - Qualidade do sono por dia *(só Rafa)* — barras, semana atual
   - Tópicos estudados *(só Leo)* — barras horizontais, últimas 4 semanas

7. **FocoProjetos** — projetos em andamento com edição inline do "próximo passo". Click-outside fecha o campo.

8. **WeeklyGrid** — grade 7 dias × 3 períodos (manhã/tarde/noite) com slots de rotina clicáveis.

9. **ProjectTracker** — CRUD completo de projetos: nome, stack, status, percentual, próximo passo.

10. **FinancePanel** *(ambos)* — metas financeiras: CRUD de metas com valor alvo, valor atual e progresso.

11. **ExtratoPanel** *(ambos)* — cola extrato bancário em texto, envia para a IA, exibe análise financeira estruturada (resumo, categorias, top gastos, padrão, recomendação).

12. **TrainingPanel** — análise de treino das últimas 4 semanas com contagem por tipo e gráfico de consistência.

13. **WeeklyReport** — análise semanal gerada pela IA (Gemini Pro). Botão "Gerar análise" disponível a cada 3 dias.

---

## Tela: Registrar (`/registrar`)

Formulário colapsável por seção. Todas as seções mostram um hint com o preenchido quando fechadas.

### Seção Geral (sempre visível)
- **Data** — padrão: hoje
- **Humor** — botões 1–5 com emoji. *Obrigatório.* Rafa: colorido (vermelho→verde). Leo: cor única.

### Seção Saúde & Bem-estar *(só Rafa)*
- Rating 1–5: qualidade do sono
- Número: atendimentos realizados
- Número: conteúdos postados
- Textarea: gratidão do dia

### Seção Estudos *(só Leo)*
- Horas estudadas (número, step 0.5)
- Tópico estudado (texto livre)

### Seção Trabalho — Rift *(só Leo)*
- Tickets trabalhados (número)
- Horas trabalhadas (número, step 0.5)

### Seção Treino *(ambos)*
- **Leo:** Academia / Vôlei / Ambos / Nenhum
- **Rafa:** Academia / Caminhada-Corrida / Bike / Nenhum
- Se treinou: Rating de rendimento 1–5
- Se treinou: Textarea de observação

### Seção Reflexão *(ambos)*
- Conquistas (textarea)
- Desafios (textarea)
- Destaques (textarea) — *ambos*

### Após salvar
- Se IA retornou insight: exibe o texto com botão "Ver dashboard"
- Se IA falhou: tela de sucesso com mensagem de fallback e redirect automático para o dashboard

---

## Tela: Histórico (`/historico`)

- Lista todos os registros do usuário (mais recente primeiro)
- Cada card mostra: data, humor, treino, horas de estudo/trabalho, destaque, desafios
- **Rafa:** mostra sono, atendimentos e trecho da gratidão (se preenchidos)
- Botão de exclusão com confirmação inline (não usa `alert()`)

---

## Rotina Semanal (WeeklyGrid)

- Grade 7 dias × 3 períodos (Manhã / Tarde / Noite)
- **Desktop:** grade completa, painel de detalhe aparece abaixo ao clicar uma célula
- **Mobile:** abas por dia com lista de períodos
- Clique em célula → lista os slots + botão "Novo slot"
- Novo/Editar slot: descrição, categoria (botões coloridos), hora início/fim opcional
- Categorias: trabalho, estudo, treino, projeto, descanso, registro, outro
- Exclusão com confirmação inline no SlotChip
- Erros de save exibidos diretamente no painel

---

## IA — Fluxo

### Insight diário
- Disparado automaticamente ao salvar um registro
- Modelo: Gemini 2.5 Flash (ThinkingBudget=0 para resposta direta)
- Prompt Leo: 2 frases — observação honesta + ação concreta para amanhã
- Prompt Rafa: 3 frases — observação + encorajamento + ação; mais cuidado se humor ≤ 2
- Máximo 500 tokens; fallback textual se IA falhar
- Exibido na tela de sucesso do formulário

### Análise semanal
- Disparada manualmente no WeeklyReport (botão "Gerar análise")
- Disponível a cada 3 dias
- Modelo: Gemini 2.5 Pro (ThinkingBudget=8000)
- Contexto Leo: 7 dias de registros + semana anterior + projetos + resumo financeiro
- Contexto Rafa: 7 dias + gratidões + atendimentos + alerta de humor baixo se ≥ 3 dias < 3
- Máximo 400 palavras, sem emojis

### Análise financeira *(ambos)*
- ExtratoPanel: usuário cola o extrato em texto livre (qualquer formato)
- Modelo: Gemini 2.5 Flash com jsonMode=true (ResponseMimeType=application/json)
- Resposta: JSON estruturado com resumo, categorias, maiores gastos, padrão e recomendação
- Salvo no banco como `AnaliseSemanal` com tipo "financeiro"
- Histórico de análises expansível no próprio painel

---

## API — Endpoints

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/login` | Login, retorna JWT |
| GET | `/api/registros` | Lista registros do usuário (filtro por data) |
| POST | `/api/registros` | Cria registro + dispara insight IA |
| DELETE | `/api/registros/{id}` | Deleta registro |
| GET | `/api/registros/semana` | Registros dos últimos 7 dias |
| GET | `/api/registros/resumo` | Métricas agregadas da semana |
| GET | `/api/projetos` | Lista projetos do usuário |
| POST | `/api/projetos` | Cria projeto |
| PUT | `/api/projetos/{id}` | Atualiza projeto |
| DELETE | `/api/projetos/{id}` | Deleta projeto |
| GET | `/api/metas` | Lista metas financeiras |
| POST | `/api/metas` | Cria meta |
| PUT | `/api/metas/{id}` | Atualiza meta |
| DELETE | `/api/metas/{id}` | Deleta meta |
| POST | `/api/analise/gerar` | Gera análise semanal via IA |
| GET | `/api/analise/ultima` | Última análise semanal |
| GET | `/api/analise/historico` | Histórico de análises |
| POST | `/api/financeiro/analisar-extrato` | Analisa extrato bancário via IA |
| GET | `/api/rotina` | Lista slots de rotina |
| POST | `/api/rotina` | Cria slot |
| PUT | `/api/rotina/{id}` | Atualiza slot |
| DELETE | `/api/rotina/{id}` | Deleta slot |

Todos os endpoints (exceto `/api/auth/login`) requerem `Authorization: Bearer <token>`.
