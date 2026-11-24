# Morano — Design System (v1)

> "Dividir responsabilidades. Multiplicar o bem-estar."
> Referência visual: `morano-telas.html` (abra no navegador; textos e cores são editáveis).
> Use este arquivo como fonte de verdade ao gerar as telas no VS Code.

---

## 1. Fontes (carregar em TODAS as páginas)

```html
<!-- Títulos: Quincy CF — Adobe Fonts -->
<link rel="stylesheet" href="https://use.typekit.net/tjw1unx.css">
<!-- Subtítulos e corpo: Plus Jakarta Sans — Google Fonts -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
```

**Para a Quincy funcionar em qualquer dispositivo:** em fonts.adobe.com → *Web Projects* → projeto `tjw1unx` → adicione **todos** os domínios onde o app roda (ex.: `morano.app`, `*.vercel.app`, `localhost`). O kit só serve a fonte a domínios cadastrados. Em app nativo (React Native/Capacitor), a WebView precisa de um domínio de origem cadastrado; caso contrário, cai no fallback (Georgia).

```css
--font-title: "quincy-cf", "Quincy CF", Georgia, serif;
--font-body:  "Plus Jakarta Sans", system-ui, sans-serif;
```

## 2. Escala tipográfica

| Token | Fonte | Peso | Tamanho / altura | Uso |
|---|---|---|---|---|
| `logo` | Quincy | 600 | 40 / 1 · -0.02em | Marca "morano." (ponto em `--orange-500`) |
| `display` | Quincy | 400 | 30 / 1.12 · -0.01em | Headline do onboarding |
| `h1` | Quincy | 500 | 26 / 1.15 | Título da tela ("Morano", nome do usuário) |
| `h2` | Quincy | 500 | 20 / 1.2 | Títulos de seção ("Precisa de atenção") |
| `num` | Quincy | 500 | 34 / 1 | Números do resumo (5, 0, 0) |
| `h3` | Jakarta | 700 | 15 / 1.3 | Título de card/item |
| `sub` | Jakarta | 500 | 14 / 1.45 · `--muted` | Tagline, subtítulos |
| `body` | Jakarta | 400 | 13 / 1.5 · `--muted` | Parágrafos |
| `caption` | Jakarta | 500 | 11.5 / 1.35 · `--muted` | Descrições, datas, contadores |
| `button` | Jakarta | 600 | 16 | Botões |
| `badge` | Jakarta | 600 | 11 | "Atrasada", chips |

Regra: **Quincy = emoção e hierarquia** (títulos e números). **Jakarta = informação** (tudo que se lê ou se toca).

## 3. Cores

```css
/* Base */
--cream:#FBF3EA; --cream-2:#F6E8DA; --card:#FFF9F2; --card-line:#F1E3D4; --line:#E9D9C9;
/* Texto */
--ink:#2A1C17; --ink-2:#4A3A33; --muted:#7A6A62;
/* Ilustração / acentos */
--lavender-100:#EDE6FB; --lavender-300:#C9B8F0; --lavender-500:#9B87E0;
--pink-200:#F7C9D3; --pink-400:#EE8FAE; --pink-600:#D9527E;
--peach-200:#FAD9C0; --peach-400:#F6B98A;
--orange-500:#EE8A3C; --orange-600:#D9692A;
--yellow-300:#F7D27A;
--green-400:#7FAE4E; --green-600:#4D7A35;
/* Estados */
--alert-bg:#F8DCCF; --alert-ink:#A3472A;
```

- CTA primário: fundo `--ink`, texto `#FFF6EC`.
- Botão "+" e progresso concluído: `--green-600`.
- Ícones dos benefícios: lavanda (compartilhado), pêssego (rotina), amarelo (lembrar).
- Fundo do onboarding: radial lavanda no canto superior esquerdo, pêssego no direito, amarelo embaixo à direita, base `--cream` e grão (ruído) por cima, a 22%.

## 4. Forma e espaço
- Raios: card 20 · resumo 24 · folha 32 · botão/nav 999 · ícone de item 10.
- Espaçamento: margem lateral 16–24 · gap entre cards 10 · seções 22 no topo.
- Sombra dos cards: `0 8px 24px -14px rgba(120,80,60,.35)`. Cards do onboarding: vidro (`rgba(255,249,242,.82)` + `blur(10px)`).

## 5. Ilustração (estilo do gif)
- Vetor plano com **gradientes suaves** e **textura granulada** (filtro `feTurbulence`, multiply). Sem contorno.
- Cena: **mãos** (rosa, lavanda, pele) passando uma **sacola de papel** com verduras, **laranja** flutuando, **planta de folhas laranja**, verduras sobre **morros** rosa/pêssego/lavanda desfocados.
- Mensagem: cuidado sendo dividido entre pessoas da casa.
- O SVG está em `<template id="illus">` no HTML. Exporte como componente `<HeroIllustration/>`.

## 6. Movimento (ordem do gif)
1. 0–0.2s: textos sobem (`translateY 18px → 0`, 0.7s).
2. 0.2–0.5s: mãos entram pelas laterais (1s, `cubic-bezier(.2,.8,.2,1)`).
3. 0.9s: sacola cai com leve quique; 1.1–1.55s: verduras "pop" em sequência.
4. 1.6 / 1.8 / 2.0s: cards de benefício, um a um.
5. 2.3s: botão "Começar" e link "Entrar".
- Contínuo: folhas balançam (4s) e a laranja flutua (5s).
- Respeitar `prefers-reduced-motion`: desligar tudo e mostrar o estado final.

## 7. Tela de início (antes do cadastro): texto obrigatório
- morano.
- Dividir responsabilidades. / Multiplicar o bem-estar.
- **A casa não precisa depender da memória de uma pessoa só.**
- Organize tarefas, compras e responsabilidades em um só lugar. Compartilhe o cuidado com quem mora com você.
- Tudo compartilhado: Listas, tarefas e compras visíveis para todos da casa.
- Uma rotina mais organizada: Distribua responsabilidades e acompanhe o que foi feito.
- Menos coisas para lembrar: Lembretes e histórico: a casa não depende da sua memória.
- [Começar] · Já tem uma conta? **Entrar**

Opções: **A** fiel ao gif · **B** ilustração no topo + folha creme · **C** título grande + carrossel.

## 8. Home (depois do login)
Header (Morano + sino + avatar) → Resumo da casa (Tarefas/Compras/Cuidados + progresso) → **Precisa de atenção** (itens atrasados, badge "Atrasada", "Ver tudo") → **Rotina de hoje** (check + cômodo, botão +) → nav flutuante em pílula (Início ativo + 4 ícones).

Opções: **A** fiel à imagem 2 (resumo escuro) · **B** resumo lavanda com ilustração · **C** resumo claro em blocos coloridos.

## 9. Opção escolhida (aprovada)
- **Tela de início:** Opção **C**: logo + tagline + título grande (Quincy 34px) + parágrafo + ilustração + carrossel horizontal com os 3 benefícios (scroll-snap, cards a 82% da largura, indicador de pontos) + botão "Começar" e "Já tem uma conta? Entrar" fixos no rodapé. Tela sem rolagem vertical.
- **Telas internas do app (Home e demais):** **manter o layout, as cores e os componentes atuais.** Trocar apenas a tipografia:
  - Títulos de tela, títulos de seção e números do resumo passam para **Quincy** (tokens `h1`, `h2`, `num`).
  - Todo o resto (itens, legendas, badges, botões, nav) passa para **Plus Jakarta Sans** (tokens `h3`, `sub`, `body`, `caption`, `badge`, `button`).
  - As opções B e C da Home (seção 8) **não** serão usadas.
