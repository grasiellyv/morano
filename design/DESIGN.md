# Morano — Design handoff (mobile)

Referência visual: pasta `reference/*.dc.html` (marcação e estilos exatos de cada tela). Este arquivo é a fonte de verdade para tokens, componentes e comportamento. Implemente na stack atual do projeto, sem trocar de framework. **Não remover nenhuma funcionalidade existente**: rotina, compras, manutenção, casa/moradores, ajustes, notificações.

## Princípios (o app existe para aliviar carga mental)
- Sensação: calma, quente, leve. Uma família de cor (marrons/âmbar). Nada saturado, sem vermelho puro. Verde só em dois papéis: "concluído" (`--done-*`) e ações de adicionar/criar (`--add`).
- Ícones: só lucide-react (ou SVG próprio no mesmo grid 24px, cantos/terminais redondos). Traço único `--icon-stroke: 1.75`, aplicado via CSS a todo `svg.lucide`. Sem emoji na interface — categorias de compras guardam a chave do ícone (ver `src/features/shopping/category-icon.tsx`).
- Hierarquia por escala e peso: no máximo um texto grande e fino por tela; o resto pequeno e quieto.
- Estado ativo por luminosidade (escuro sobre claro / claro sobre escuro), não por cor saturada.
- Linguagem de cuidado: "Faltam 4 coisas leves para hoje", nunca "4 pendentes".
- Sem gamificação punitiva: sem contador de sequência, sem marcar dia perdido.
- Sem fotos de ambientes. Avatares de moradores: foto do morador, com iniciais como fallback.

## Tipografia
Fonte: **DM Sans** (Google Fonts), pesos 300, 400, 500, 600.
| Uso | Tamanho / peso |
|---|---|
| Wordmark "Morano" (placeholder do logo) | 22 / 600, letter-spacing -0.6 |
| Título de tela (Rotina) | 24 / 400, -0.4 |
| Headline do card principal | 22 / 300, line-height 1.2, -0.3 |
| Título de seção | 15 / 600 |
| Título de linha/tarefa | 14 / 500 |
| Meta/subtítulo | 12 / 400, cor mute |
| Chips, rótulos pequenos | 10.5–12.5 / 500 |
| Valor em tile (ex.: "1 vencida", "5 itens") | 15 / 600 (não maior) |

## Cores
Tokens (CSS variables ou equivalente no tema):
| Token | Claro | Escuro |
|---|---|---|
| bg | #FBF0E4 | #1C130E |
| glow (radial 380×300, canto sup. direito) | rgba(240,184,128,.30) | rgba(214,140,75,.26) |
| card | #FFFAF4 | #2A1D15 |
| card2 | #F5E4D2 | #37271C |
| ink | #2A1B12 | #F6E9DB |
| mute | #725E4F | #BDA894 |
| line | rgba(110,70,35,.12) | rgba(246,233,219,.10) |
| shadow | 0 1px 2px rgba(90,55,25,.05), 0 6px 18px rgba(90,55,25,.06) | none |
| heroA → heroB (gradiente 160°) | #4B3527 → #2B1E16 | #6A4A34 → #3C2A1E |
| warnBg / warnInk / warnIcon | #F7DCCB / #7E3417 / #EFBFA3 | #43251A / #FFC3A0 / #66361F |
| navBg (blur 18px) | rgba(255,250,244,.88) | rgba(52,37,28,.90) |
| navItem | #F5E4D2 | #402E22 |
| navActive / navActiveInk | #2A1B12 / #FBEFE3 | #F6E9DB / #2A1B12 |

Acentos fixos: âmbar de progresso #F2C48D (sobre o hero); âmbar de aviso #D98A2B (bolinha em Compras, barra de progresso); terracota de alerta #C8643C (bolinha em Manutenção e no sino).
Eventos: Aniversário #C25B6E · Festa #D98A2B · Compromisso #4F6D93. Tints dos ícones: aniversário #F3D2D8/#8A2F45, festa #F6DDB9/#6E420F, compromisso #D5DEEA/#2C4A6E.
Avatares (bg/texto): Rafael #EBD5BE/#6B3A17 · Ana #F3CFCF/#8A2F3A · Lucas #D5DEEA/#2C4A6E. Atribuir cor por morador de forma estável.
Contraste: texto >= 4.5:1.

## Forma e espaçamento
- Raios: hero 20 · cards 16 · linhas de evento 14 · tiles de ícone 9–10 · chips/botões 8–12 · avatares e botões de ícone circulares · nav pill 32, itens da nav 24.
- Padding lateral de tela 20. Espaço entre blocos 12–16. Altura de linha de tarefa 54. Alvos de toque >= 44 (botões visuais menores têm área de toque estendida).
- Ícones: traço 1.6–1.8, cantos arredondados, viewBox 24 (equivalentes Lucide: bell, sliders-horizontal, house, calendar, calendar-check, shopping-bag, wrench, users, plus, check, chevron-left/right, arrow-up-right, clock, trash-2, sprout, sofa, bed, washing-machine, cake, map-pin, repeat, bell-ring, x, list). Para "party" use balão/party-popper. Para "plate" use círculo duplo ou utensils.
- Sem ícones emoji.

## Navegação (barra flutuante)
Pill fixa, 20px das laterais, 18px do fundo, altura 64. 5 destinos: Início, Rotina, Compras, Manutenção, Casa. Ativo = pill escura com ícone + rótulo; inativos = círculos 48 só com ícone (aria-label). Bolinhas de aviso: Compras (âmbar, "2 novos") e Manutenção (terracota, "1 vencida"). Conteúdo com padding-bottom ~140 para não ficar sob a barra.

## Telas

### 1. Início (Main / Rolagem / Escuro)
Ordem vertical:
1. **Cabeçalho**: wordmark "Morano" à esquerda; sino (ponto terracota quando há notificação), ajustes (sliders), avatar do usuário (perfil).
2. **Card principal (hero, gradiente café + brilho âmbar)**: pill "Olá, {nome}" + botão seta (abre Rotina); headline "Faltam {n} coisas leves para hoje"; sub "{feitas} já feitas · {n} itens na lista"; anel de progresso 68px com "{feitas}/{total}" (traço âmbar #F2C48D, 7px); tira Seg–Dom: dias concluídos com check âmbar, hoje em destaque claro, futuros neutros.
3. **Para fazer hoje**: título, link "Ver rotina", botão "+" (nova tarefa). Card com as tarefas pendentes do dia (ver Linha de tarefa) e rodapé "{n} concluídas hoje" (expande).
4. **Grid 2 colunas**: Manutenção (fundo warn, "{n} vencida(s)", item mais atrasado + dias de atraso, rodapé "Última feita: ...") e Compras ("{n} itens", "{quem} adicionou {itens}", rodapé "{k} novos · há {t}"). Ambos levam à tela respectiva.
5. **Moradores (compacto)**: título + resumo de carga ("Ana: 3 tarefas · Lucas: 1 tarefa"), chip "{n} na casa"; avatares 44px sobrepostos (-12px, anel na cor do card), botão circular tracejado "+" (adicionar morador), botão escuro "Ver casa".

### 2. Rotina — Tarefas (Tarefas.dc.html)
Cabeçalho "Rotina" + botão filtro + botão "+" escuro. Alternador segmentado **Tarefas | Calendário**. Tira de 7 dias navegável (dia ativo escuro; dias concluídos com ponto âmbar; dias com evento mostram ponto da cor do tipo). Faixa "Próximo: {evento}" (fundo warn, leva ao Calendário). Filtros: Todas / Minhas / por morador (avatar + nome) + contador "x de y" + barra de progresso fina (âmbar). Listas: "Para fazer · n" e "Concluídas · n" (concluída = check preenchido, título riscado em mute).

### 3. Rotina — Calendário (Calendario.dc.html)
Mesmo cabeçalho/alternador. Card de mês (Seg–Dom, 6 linhas, setas de mês). Hoje = círculo escuro. Pontos sob o dia por tipo de evento (passados com opacidade .45; dias de outro mês com .55). Legenda: Aniversário, Festa, Compromisso. "Próximos compromissos" (linha: bloco de data DOM/22, título, hora · local, ícone do tipo em círculo tintado). Botão primário "Marcar compromisso" (abre a tela 4).

### 4. Novo compromisso (Novo-compromisso.dc.html)
Tela cheia, sem nav, botão fechar. Campos: Tipo (4 tiles: Aniversário, Festa, Compromisso, Outro; selecionado = fundo tintado + borda na cor do tipo), Nome, Data, Hora, Local (opcional), Quem participa (avatares com check + "Convidado"), switches "Repetir todo ano" (padrão ligado para Aniversário) e "Lembrete" (ex.: 1 dia antes, 9h). CTA fixo "Salvar compromisso".

## Componentes reutilizáveis
- **Linha de tarefa**: tile de ícone 36 (categoria: lixo, louça, plantas, sala, quarto, roupa...), título, meta com ícone de relógio ("até 19h · Área de serviço"), avatar 24 do responsável, botão circular 26 para concluir (borda 1.5 mute; concluído = preenchido ink com check).
- **Segmented**: container card2 raio 12, padding 3, altura 42; opção ativa = card com sombra.
- **Chip de filtro**: altura 32, raio 10; ativo = navActive/navActiveInk.
- **Botão primário**: fundo ink, texto card, raio 12, altura 44–48.
- **Switch**: 44×26, trilho navActive, bolinha navActiveInk, role="switch" + aria-checked.

## Dados e comportamento
- Tarefa: título, categoria (define ícone), local, prazo, responsável, status, data. Marcar conclui e move para "Concluídas"; o anel/progresso = concluídas/total do dia.
- Eventos NÃO contam no progresso de tarefas (decisão: evento não é carga de trabalho).
- Compromisso: tipo, nome, data, hora, local?, participantes[], repeteAnualmente, lembrete. Aniversário repete todo ano por padrão.
- Faixa "Próximo compromisso" = evento futuro mais próximo.
- Bug a corrigir no app atual: o card de topo mostrava "2 itens na lista" enquanto Compras mostrava "5 itens pendentes". Usar uma única fonte de verdade (número de itens pendentes da lista).
- Dados de exemplo nas telas (Dentista da Ana, Almoço em família, tarefas) são ilustrativos: usar dados reais.
- Acessibilidade: botões reais (`<button>`, `<a>`), aria-label em ícones isolados, labels nos campos.

## Prompt sugerido para o Claude Code
"Leia DESIGN.md e abra os arquivos em reference/ (são HTML estáticos; use-os como referência de marcação e estilo, não os copie cegamente). Implemente o novo design da tela Início primeiro, usando tokens de tema (claro/escuro) e a fonte DM Sans. Mantenha toda a lógica e funcionalidades existentes. Depois crie a tela Rotina com as visões Tarefas e Calendário e o formulário Novo compromisso. Mostre o que mudou a cada etapa."

## Ações de adicionar/criar
Todo botão que acrescenta algo (Adicionar, Criar, Nova lista, FAB "+") usa o token `--add` (#3B6B2A) com texto `--add-foreground` (#FFF) — contraste 6.3:1 (AA). Hover `--add-hover` (#305A22). Para link de texto verde, `--add-ink` (#2F5A21, 7.6:1 sobre card). No código: `<Button variant="add">`, `IconButton add`, ou classes `bg-add text-add-foreground hover:bg-add-hover`. Botões de "Salvar" em edição continuam escuros.

## Seção de detalhes expansível (formulários)
Campos opcionais ficam numa seção própria (card `bg-secondary/50`, borda): cabeçalho com ícone, título 14/600, resumo 12 mute do que já foi escolhido, e ação "Expandir/Minimizar" com chevron. Abre sozinha quando a pessoa começa a digitar o campo principal; se ela minimizar, não reabre até o próximo item. Escolhas únicas viram chips (`role="radio"`), selecionado = escuro sobre claro.

## Card "Olá" do Início (tom por período do dia)
O card escuro do topo muda de gradiente conforme a hora no fuso da casa (`getHeroPeriod` em `src/lib/day-period`): manhã 5h–12h `--hero-morning-*` (#6E4529→#4E321F, mais claro), tarde 12h–18h `--hero-afternoon-*` (#4B3527→#2B1E16, base), noite 18h–5h `--hero-night-*` (#2C2120→#140E0C, mais profundo). Texto creme #FBEFE3 ≥ 7.3:1 e creme 85% ≥ 5.8:1 em todos os tons. O ícone do chip "Olá" acompanha: sol / sol médio / lua. Conteúdo: "Olá, nome" + status da casa (Organizada / Pede atenção), "Resumo da casa" com 3 números (Tarefas, Compras, Cuidados — cada um é link) e barra de progresso do dia. A tira semanal e a frase "Faltam N coisas leves" saíram.

## Tela Casa (hub da residência)
Estrutura: título "Casa" + engrenagem (configurações) · nome da casa e "N moradores · tipo" (sem foto) · **Quem faz parte** (avatar com inicial, nome, papel, selo Ativo/Ausente; "+ Convidar morador" em verde só para proprietário/admin) · **Organização da casa**, grade 2×2 de atalhos: Moradores (contas e permissões), Animais (cuidados e necessidades), Produtos (itens recorrentes), Histórico (atividades da casa) · **Sobre a casa**: tipo/posse/composição, Editar dados, Cômodos e Tarefas da rotina. Subtelas (`/casa/animais`, `/casa/produtos`, `/casa/historico`) usam PageHeader com "Voltar", cartões `--card` com sombra, estados vazios com ícone e frase de cuidado.

## Conta × Casa (um lugar para cada coisa)
- **Minha conta** (`/perfil`) = tudo que é da PESSOA: nome, e-mail, modo ausência, senha, sair. Único ponto de entrada: o botão de avatar (inicial) no cabeçalho do Início e da Casa (`AccountButton`), e "Minha conta" no menu lateral do desktop. Não existe engrenagem; `/configuracoes` só redireciona para `/perfil`.
- **Casa** (aba) = tudo que é da CASA: dados da residência, moradores e permissões, cômodos, animais, produtos, histórico. Nada pessoal mora lá e nada da casa mora em "Minha conta" (sem links cruzados duplicados).
- Regra para novas telas: se vale só para mim → Minha conta; se vale para todos os moradores → Casa.

## Compras: lista compartilhada
Cabeçalho: eyebrow "COMPRAS · missão" + "Lista da casa" + compartilhar; "Atualizada há N min" + iniciais dos moradores. Link público `/lista/<token>`: só visualização, sem login, atualiza a cada 20 s, pode ser desativado (apaga o token). Itens nunca duplicam: adicionar um produto já pendente soma a quantidade (mesma unidade) ou avisa (unidade diferente), via função atômica `add_shopping_item`. "Recuperar do histórico" reaproveita itens de compras finalizadas.
