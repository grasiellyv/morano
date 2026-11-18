# PROJETO MORANO — MASTER PROMPT (documento original do dono do produto)

> Fonte original dos requisitos. Onde o design (`docs/superpowers/specs/2026-11-18-morano-mvp-design.md`) diverge deste documento, **o design prevalece** — as divergências foram discutidas e aprovadas.

## 1. Papel

Equipe multidisciplinar (engenharia sênior, arquitetura, product design, UX/UI, full stack, banco de dados e segurança, SaaS) responsável por planejar, arquitetar e desenvolver o MORANO como produto digital funcional, escalável, seguro e comercializável, usado diariamente por milhares de pessoas. Não tomar decisões técnicas importantes sem avaliar consequências.

## 2. Identidade do produto

- **Nome:** MORANO · **Categoria:** plataforma inteligente de gestão residencial · **Slogan:** "Sua casa. Sob controle."
- **Conceito:** centraliza a administração da residência num só lugar; reduz a carga mental; substitui vários apps, planilhas, calendários e anotações; um administrador digital da casa.
- **Proposta de valor:** o usuário entende rapidamente o que precisa ser feito, o que está atrasado, o que precisa de manutenção, o que precisa ser comprado, quais equipamentos precisam de atenção e como está a organização geral.
- **Público:** quem mora sozinho, casais, famílias, inquilinos, proprietários, e futuramente quem administra mais de uma residência. A experiência deve se adaptar ao perfil de cada residência; não pensar só em famílias ou só em quem mora sozinho.

## 3. Posicionamento

Não deve parecer: app de tarefas simples, lista de limpeza, calendário doméstico, lista de compras, app genérico de produtividade, chatbot doméstico. Deve ser percebido como plataforma completa de gestão residencial, transmitindo organização, controle, tranquilidade e praticidade. O diferencial é a integração: uma tarefa pode estar relacionada a um cômodo, equipamento, manutenção ou necessidade de compra.

## 4. Identidade visual

Premium, minimalista, sofisticada (referência: lifestyle, arquitetura, organização, tecnologia).

- Paleta: Off-white #F5F2EC · Areia #E7E0D5 · Grafite #30332F · Verde-sálvia #879080 · Caramelo #B69B79.
- Tipografia: Manrope (títulos, números, destaques); Inter (textos, descrições, auxiliares).
- Diretrizes: layout limpo, muito espaço em branco, bordas suaves, cantos arredondados com moderação, sombras discretas, ícones minimalistas, animações suaves e funcionais, hierarquia clara, excelente no mobile.
- Evitar: gradientes exagerados, cores vibrantes, dashboard administrativo genérico, excesso de cards, poluição, botões sem função, visual de template SaaS.
- Logotipo tipográfico elegante, legível e reconhecível, sem elementos que prejudiquem a simplicidade.

## 5. Estrutura principal

Navegação: Início · Rotina · Minha casa · Manutenção · Compras · Perfil e configurações. Adaptada a desktop e mobile.

### 5.1 Início — Dashboard
Saudação personalizada, data atual, resumo da residência, tarefas de hoje, progresso, atrasadas, próximas manutenções, pendências, itens a comprar, resumo semanal. Priorizar o importante; entender a casa em poucos segundos; sem excesso de informação.

### 5.2 Rotina
Criar, editar, excluir, concluir, adiar tarefas; prioridades; associar a cômodos; duração estimada; histórico; calendário; tarefas recorrentes.
Frequências: uma vez, diária, semanal, quinzenal, mensal, personalizada.
Campos: título, descrição, cômodo, prioridade, tempo estimado, data, frequência, status.
Recorrência correta: separar configuração de ocorrências; concluir não apaga histórico; adiar uma ocorrência não altera as próximas; proteção contra duplicidade; fuso horário da residência.

### 5.3 Minha casa
Dados: nome, tipo de imóvel, próprio/alugado, nº de moradores, tipo de residência, cômodos, equipamentos.
Cômodos: sala, cozinha, quarto, banheiro, lavanderia, escritório, varanda, garagem, outros — cada um associável a tarefas, equipamentos e pendências.
Equipamentos (ex.: geladeira, máquina de lavar, ar-condicionado, micro-ondas, fogão, TV, lava-louças): nome, marca, modelo, nº de série, data da compra, prazo de garantia, cômodo, observações, fotografias, manuais e documentos. Objetivo: histórico organizado dos equipamentos.

### 5.4 Manutenção
Cadastrar manutenção; associar a equipamentos ou à residência; agendar serviços; registrar concluídas; histórico; custos; observações; anexos (documentos e fotos).
Área de problemas e pendências (ex.: torneira vazando, lâmpada queimada, problema elétrico, infiltração, defeito em equipamento), cada um com título, descrição, cômodo, data de identificação, status, histórico, data de resolução.
Não inventar recomendações técnicas ou intervalos de manutenção; usar informações do fabricante ou do usuário.

### 5.5 Compras
Categorias: limpeza, higiene, cozinha, lavanderia, alimentação, outros. Adicionar produtos, quantidade, unidade, categoria, marcar como comprado, histórico, organizar pendentes. Extremamente rápido (adicionar em poucos segundos). Previsão de consumo e reposição inteligente ficam para o futuro; não complicar o MVP.

## 6. Onboarding

Fluxo: apresentação → cadastro/autenticação → tipo de residência → próprio/alugado → moradores → cômodos → tempo disponível → preferências de organização → sugestão de rotina inicial → revisão e aprovação → dashboard. Não obrigar a preencher tudo; permitir pular etapas opcionais. Sugestões em três níveis (Leve, Equilibrada, Detalhada), editáveis. Nunca criar tarefas sem revisão e aprovação do usuário.

## 7. Tecnologias

Frontend: Next.js (App Router), React, TypeScript strict, Tailwind CSS, shadcn/ui, Lucide React. Backend: Supabase (PostgreSQL, Auth, Storage, SSR). Formulários: React Hook Form + Zod. Datas: date-fns. Testes: Vitest, Playwright. Hospedagem: Vercel. App: web responsivo com PWA; sem app nativo agora. Versões estáveis e compatíveis; consultar documentação oficial; sem dependências desnecessárias.

## 8. Estrutura do projeto

Estrutura modular sugerida (app/(auth), onboarding, (dashboard)/{inicio,rotina,minha-casa,manutencao,compras,configuracoes}, api; components/{ui,layout,dashboard,routine,maintenance,home}; features/{auth,onboarding,homes,routines,tasks,maintenance,shopping}; lib/{supabase,validations,dates,utils}; services; hooks; types; constants; supabase/{migrations,seed.sql,config.toml}; tests; .env.example; README). Pode ser adaptada com justificativa. Evitar componentes gigantes e duplicação; separar interface, regras de negócio, validações e acesso a dados.

## 9. Banco de dados

PostgreSQL via Supabase, migrations versionadas, UUIDs, relacionamentos, timestamps, índices. Tabelas iniciais: profiles, homes, home_members, rooms, tasks, routines, task_occurrences, appliances, maintenance_records, home_issues, shopping_items, attachments, push_subscriptions, subscriptions (campos detalhados no prompt original; refinados no design). Avaliar campos de atualização, unicidade, índices, integridade referencial e políticas de exclusão. Não implementar relacionamentos polimórficos sem definir a autorização.

## 10. Segurança e privacidade (obrigatório)

RLS em todas as tabelas privadas; autorização por associação à residência; permissões por papel; proteção de documentos e imagens; validação no servidor; rotas privadas protegidas; validação de uploads; controle de acesso ao Storage; variáveis de ambiente protegidas; tratamento de erros; proteção contra acesso a dados de outros usuários. Só membros veem a residência; só administradores gerenciam membros; nunca expor a Service Role Key; nunca confiar só em verificação visual. LGPD: privacidade, exclusão de conta, transparência sobre uso dos dados.

## 11. Regras de negócio

Tarefas: preservar histórico, evitar duplicação, adiamento individual, não alterar recorrências futuras indevidamente, respeitar fuso, tratar datas corretamente. Manutenção: preservar histórico, custos, anexos, equipamentos, manutenção geral da casa. Compras: marcar comprado, histórico quando necessário, alterar quantidade e categoria. Residência compartilhada: arquitetura pronta para várias pessoas no futuro; MVP prioriza uso individual.

## 12. Monetização

Freemium. **Grátis:** uma residência, tarefas básicas, rotinas essenciais, lista de compras, histórico limitado, equipamentos limitados. **MORANO PRO:** tarefas ilimitadas, equipamentos ilimitados, histórico completo, manutenção avançada, fotos e documentos, relatórios, recursos avançados. Preços-hipótese: R$ 9,90/mês, R$ 79,90/ano. Sem cobrança real agora; preparar planos e permissões; futuramente Mercado Pago ou Stripe; status validado no servidor via webhooks autenticados; nunca liberar recursos pagos por alteração no navegador.

## 13. Experiência

Prioridades: facilidade, velocidade, clareza, organização, consistência, responsividade, acessibilidade. Não precisar aprender a usar. Estados de carregamento, sucesso, erro, vazio e confirmações. Sem botões sem função. Sem dados fictícios apresentados como reais; demonstrações identificadas.

## 14. Roadmap

**MVP 1.0:** autenticação, cadastro, onboarding, residência, cômodos, dashboard, tarefas, recorrência, histórico, equipamentos, manutenções, problemas, compras, configurações, responsividade, estrutura freemium.
**1.5:** push, upload de documentos, fotografias, compartilhamento residencial, relatórios semanais, rotinas inteligentes, OCR, assistente inteligente.
**2.0:** previsão de consumo, integrações, recomendações de produtos, automações, gestão avançada de equipamentos, marketplace de manutenção.
Não desenvolver futuro antes de estabilizar o MVP; não adicionar IA por tendência.

## 15. Fluxos principais

Primeiro acesso: Cadastro → Autenticação → Onboarding → Residência → Cômodos → Preferências → Rotina sugerida → Aprovação → Dashboard.
Criação de tarefa: Rotina → Nova tarefa → Informações → Cômodo → Duração → Frequência → Salvar → Criar ocorrência → Exibir na rotina.
Registro de problema: Minha casa → Problemas → Novo → Descrição → Cômodo → Salvar → Atualizar status → Resolver. *(No design, problemas ficam em Manutenção, com atalho no cômodo.)*
Manutenção: Minha casa → Equipamento → Informações → Agendar manutenção → Data → Registrar serviço → Histórico.

## 16. Padrão de desenvolvimento

Código limpo; TS strict; evitar `any`; sem duplicação; sem abstrações desnecessárias; regras de negócio fora dos componentes; componentes reutilizáveis quando fizer sentido; validar entradas; tratar erros; testes para regras críticas; documentação atualizada; consultar documentação oficial; não inventar credenciais; não simular integrações externas; nada destrutivo sem autorização; explicar mudanças de configuração importantes.

## 17. Forma de execução

Não desenvolver tudo de uma vez. Trabalhar por etapas, com aprovação do dono após cada uma. Relatório ao fim de cada etapa: o que foi desenvolvido, arquivos criados/modificados, dependências adicionadas, testes realizados, problemas encontrados, o que falta — e aguardar aprovação.

## 18. Princípio central

Transformar a gestão de uma residência em algo simples, inteligente e organizado; cada funcionalidade deve contribuir para isso; construir um produto que as pessoas queiram usar todos os dias.
