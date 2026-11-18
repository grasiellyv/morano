# MORANO — Etapa 1 (Fundação) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A running Next.js app with the MORANO visual identity: tokens, fonts, `morano.` logo, app icons/manifest, a responsive app shell (bottom nav on mobile, sidebar on desktop), honest placeholder pages for every main area, base UI components, and working unit + E2E test infrastructure.

**Architecture:** Next.js App Router at the repo root with `src/`. Design tokens live once, in `src/app/globals.css` (Tailwind v4 `@theme` + shadcn semantic variables). Navigation is defined once in a typed config consumed by both bottom nav and sidebar. No backend yet. Auth, Supabase and data arrive in Etapa 2.

**Tech Stack:** Next.js 16.x, React 19.x, TypeScript (strict, whatever version `create-next-app` installs), Tailwind CSS 4.x, shadcn/ui (CLI 4.x), lucide-react, sonner, Vitest 5 + Testing Library + jsdom, Playwright 1.65.

**Spec:** `docs/superpowers/specs/2026-11-18-morano-mvp-design.md` (sections 4.4, 5, 7, 7.1, 12 row 1). Original requirements: `docs/master-prompt.md` §4.

## Global Constraints

- All user-facing copy is in **pt-BR**. `<html lang="pt-BR">`.
- Palette (verbatim): Off-white `#F5F2EC` · Areia `#E7E0D5` · Grafite `#30332F` · Verde-sálvia `#879080` · Caramelo `#B69B79`.
- AA-safe derived text colors (Sálvia and Caramelo fail AA as text on Off-white): **sage-ink `#5A6155`**, **alert-ink `#8A5530`**. Sálvia and Caramelo are for graphics, borders, the logo dot and fills only, never body text.
- Fonts: **Manrope** for headings, numbers and highlights. **Inter** for body text. Both via `next/font/google`, `display: "swap"`.
- Logo: `morano.` in Manrope SemiBold (600), lowercase, letter-spacing `-0.035em`, final dot in Caramelo. App icon: `m.` in Off-white on Sálvia, with the dot in Grafite.
- Mobile nav has exactly 5 items, in order: Início `/inicio`, Rotina `/rotina`, Casa `/casa`, Manutenção `/manutencao`, Compras `/compras`. Configurações `/configuracoes` is reached from the avatar in the header (mobile) and the sidebar footer (desktop).
- Avoid: gradients, vibrant colors, card-heavy dashboards, buttons without a function, fake data shown as real.
- Animations stay subtle and are disabled under `prefers-reduced-motion: reduce`. Touch targets are ≥ 44px.
- Install no dependency not listed in this plan. Do not upgrade the TypeScript or ESLint versions `create-next-app` picks.
- Commits use Conventional Commits and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Work on branch `etapa-1-fundacao`.
- Shell: Windows. Commands below are npm scripts and work in PowerShell and Git Bash.

## Review Focus

1. **Narrow phones (320px wide):** no horizontal page scroll, and all 5 nav labels (the longest is "Manutenção") fit without overlap. Test: Task 5 E2E `no horizontal scroll at 320px`.
2. **Deep links:** `/rotina/qualquer-coisa` must highlight Rotina, and `/` must never highlight everything. Test: Task 5 unit `isNavItemActive`.
3. **Text contrast:** every text/background token pair used for copy meets WCAG AA (≥ 4.5:1). Test: Task 2 unit `tokens.contrast.test.ts`.
4. **iPhone home indicator:** the bottom nav must not sit under the home indicator. The viewport needs `viewport-fit=cover` and the nav needs `padding-bottom: env(safe-area-inset-bottom)`. Test: Task 5 E2E `viewport meta has viewport-fit=cover`.
5. **Keyboard users:** nav links show a visible focus ring, and the active link carries `aria-current="page"`. Test: Task 5 E2E `focus ring visible on nav link`.

---

## File Structure

```text
(repo root)
├── package.json, tsconfig.json, next.config.ts, eslint.config.mjs, postcss.config.mjs
├── .prettierrc.json, .prettierignore, components.json, .env.example, README.md
├── vitest.config.mts, vitest.setup.ts, playwright.config.ts
├── src/
│   ├── app/
│   │   ├── layout.tsx            # html/body, fonts, metadata, viewport, <Toaster/>
│   │   ├── globals.css           # ALL design tokens
│   │   ├── page.tsx              # redirect("/inicio")
│   │   ├── icon.svg              # favicon (m.)
│   │   ├── apple-icon.tsx        # 180px PNG via ImageResponse
│   │   ├── manifest.ts           # PWA manifest (no service worker yet)
│   │   ├── (app)/layout.tsx      # AppShell
│   │   ├── (app)/{inicio,rotina,casa,manutencao,compras,configuracoes}/page.tsx
│   │   └── (dev)/estilo/page.tsx # component gallery, 404 in production
│   ├── components/
│   │   ├── ui/                   # shadcn: button, input, label, skeleton, sonner, alert-dialog
│   │   ├── brand/logo.tsx, brand/app-mark.tsx
│   │   ├── layout/nav-items.ts, nav-active.ts, app-shell.tsx, bottom-nav.tsx, sidebar.tsx, app-header.tsx
│   │   └── feedback/empty-state.tsx, page-header.tsx, confirm-dialog.tsx
│   └── lib/utils.ts              # cn() (created by shadcn)
└── tests/e2e/shell.spec.ts
```

---

### Task 1: Scaffold Next.js, tooling and unit-test harness

**Files:**
- Create: everything `create-next-app` generates, moved to the repo root. Also `.prettierrc.json`, `.prettierignore`, `.env.example`, `README.md`, `vitest.config.mts`, `vitest.setup.ts`, `src/lib/smoke.test.ts` (deleted at the end of this task).
- Modify: `.gitignore` (merge), `package.json` (name and scripts), `tsconfig.json`.

**Interfaces:**
- Produces: npm scripts `dev`, `build`, `start`, `lint`, `typecheck`, `format`, `format:check`, `test` (vitest run), `test:watch`. Path alias `@/*` → `src/*`.

- [ ] **Step 1: Create the branch**

Run: `git checkout -b etapa-1-fundacao`
Expected: `Switched to a new branch 'etapa-1-fundacao'`

- [ ] **Step 2: Scaffold into a temp folder**

The repo folder name "Morano App" has a space and is not a valid npm name, so scaffold elsewhere and move the files.
Run: `npx create-next-app@latest morano-tmp --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes`
Expected: `Success! Created morano-tmp`

- [ ] **Step 3: Move the scaffold to the root**

Move every file from `morano-tmp/`, including dotfiles, to the repo root. Exclude `morano-tmp/.git` if one exists. Then delete `morano-tmp/`. Merge `.gitignore` so it keeps the existing lines `.superpowers/`, `.env*` and `!.env.example`. Set `"name": "morano"` and `"private": true` in `package.json`.

- [ ] **Step 4: Tighten TypeScript**

In `tsconfig.json`, keep `"strict": true` and add `"noUncheckedIndexedAccess": true`, `"noImplicitOverride": true` and `"forceConsistentCasingInFileNames": true`.

- [ ] **Step 5: Add Prettier and scripts**

Run: `npm i -D prettier prettier-plugin-tailwindcss`
`.prettierrc.json`: `{ "semi": true, "singleQuote": false, "trailingComma": "all", "printWidth": 100, "plugins": ["prettier-plugin-tailwindcss"] }`. `.prettierignore`: `.next`, `node_modules`, `.superpowers`, `package-lock.json`, `src/components/ui`.
Scripts: `"typecheck": "tsc --noEmit"`, `"format": "prettier --write ."`, `"format:check": "prettier --check ."`.

- [ ] **Step 6: Add Vitest**

Run: `npm i -D vitest @vitejs/plugin-react vite-tsconfig-paths jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event`
`vitest.config.mts`: plugins `[tsconfigPaths(), react()]`, `test: { environment: "jsdom", setupFiles: ["./vitest.setup.ts"], include: ["src/**/*.test.{ts,tsx}"], css: false }`. `vitest.setup.ts` imports `@testing-library/jest-dom/vitest`. Scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 7: Prove the harness with a throwaway test**

`src/lib/smoke.test.ts`:
```ts
import { expect, test } from "vitest";
test("harness runs", () => { expect(1 + 1).toBe(2); });
```
Run: `npm test`
Expected: `1 passed`. Then delete `src/lib/smoke.test.ts`.

- [ ] **Step 8: Write `.env.example` and `README.md`**

`.env.example` holds only comments for now: `# Supabase keys arrive in Etapa 2 — never commit real values`. The `README.md` is in pt-BR and gives the project name and slogan, requirements (Node ≥ 20.9, Docker Desktop from Etapa 2), each npm script with one line on what it does, and links to `docs/master-prompt.md` and the spec.

- [ ] **Step 9: Verify everything**

Run: `npm run lint && npm run typecheck && npm run build`
Expected: all exit 0, and the build output lists route `/`.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js com TypeScript strict, Tailwind, Prettier e Vitest"
```

---

### Task 2: Design tokens, fonts, shadcn/ui and base components

**Files:**
- Modify: `src/app/globals.css`, `src/app/layout.tsx`
- Create: `components.json` (via shadcn), `src/lib/utils.ts` (via shadcn), `src/components/ui/{button,input,label,skeleton,sonner,alert-dialog}.tsx` (via shadcn), `src/components/feedback/{page-header,empty-state,confirm-dialog}.tsx`
- Test: `src/app/tokens.contrast.test.ts`, `src/components/feedback/feedback.test.tsx`

**Interfaces:**
- Produces:
  - Tailwind color utilities `offwhite`, `sand`, `graphite`, `sage`, `caramel`, `sage-ink`, `alert-ink`, plus shadcn semantic ones (`background`, `foreground`, `primary`, `secondary`, `muted`, `muted-foreground`, `accent`, `destructive`, `border`, `input`, `ring`).
  - Font utilities `font-heading` (Manrope) and `font-sans` (Inter, the default).
  - `<PageHeader title: string; description?: string; actions?: ReactNode />`
  - `<EmptyState icon?: LucideIcon; title: string; description: string; action?: ReactNode />`
  - `<ConfirmDialog trigger: ReactNode; title: string; description: string; confirmLabel: string; onConfirm: () => void | Promise<void>; destructive?: boolean />`. Cancel label: "Cancelar". It shows a pending state while `onConfirm` runs.

- [ ] **Step 1: Initialize shadcn and add components**

Run: `npx shadcn@latest init` (base color Neutral, CSS variables yes), then `npx shadcn@latest add button input label skeleton sonner alert-dialog`.
Expected: the files under `src/components/ui/` exist and `src/lib/utils.ts` exports `cn`.

- [ ] **Step 2: Write the failing contrast test**

`src/app/tokens.contrast.test.ts` reads `src/app/globals.css` with `fs`. It extracts `--name: #hex;` declarations with a regex, computes the WCAG 2.x contrast ratio (relative luminance, sRGB linearization), and asserts ≥ 4.5 for each pair:
```ts
const pairs: [fg: string, bg: string][] = [
  ["--foreground", "--background"],
  ["--muted-foreground", "--background"],
  ["--muted-foreground", "--muted"],
  ["--primary-foreground", "--primary"],
  ["--secondary-foreground", "--secondary"],
  ["--accent-foreground", "--accent"],
  ["--destructive", "--background"],
  ["--color-alert-ink", "--color-sand"],
  ["--color-graphite", "--color-caramel"],
];
```
It also asserts that `--color-sage` and `--color-caramel` against `--background` are **< 4.5**. That documents why they must never be used for text. If one ever passes, the guideline can be relaxed deliberately.
Run: `npm test -- tokens`
Expected: FAIL, because the variables are still the shadcn OKLCH defaults.

- [ ] **Step 3: Write the tokens in `globals.css`**

Under `:root`, use hex values only, replacing shadcn's OKLCH defaults:
- Raw palette: `--color-offwhite #F5F2EC; --color-sand #E7E0D5; --color-graphite #30332F; --color-sage #879080; --color-caramel #B69B79; --color-sage-ink #5A6155; --color-alert-ink #8A5530`
- Semantic: `--background offwhite; --foreground graphite; --card #FFFFFF; --card-foreground graphite; --popover #FFFFFF; --popover-foreground graphite; --primary graphite; --primary-foreground offwhite; --secondary sand; --secondary-foreground graphite; --muted sand; --muted-foreground sage-ink; --accent sand; --accent-foreground graphite; --destructive alert-ink; --border sand; --input sand; --ring sage; --radius 0.75rem`

Expose the raw palette in `@theme inline` as `--color-*`, and set `--font-sans: var(--font-inter)` and `--font-heading: var(--font-manrope)`. Remove the `.dark` block (no dark mode in the MVP, per spec §5). Add a base rule: `@media (prefers-reduced-motion: reduce) { *, ::before, ::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }`.

- [ ] **Step 4: Run the contrast test**

Run: `npm test -- tokens`
Expected: PASS.

- [ ] **Step 5: Wire up fonts and the root layout**

In `src/app/layout.tsx`:
- Fonts: `Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" })` and `Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" })`.
- `<html lang="pt-BR">` carries both font variable classes. `<body className="bg-background text-foreground font-sans antialiased">`. Render `<Toaster position="top-center" />` from `@/components/ui/sonner`.
- `metadata`: `title: { default: "MORANO", template: "%s · MORANO" }`, `description: "Sua casa. Sob controle."`, `applicationName: "MORANO"`.
- `viewport`: `{ themeColor: "#F5F2EC", viewportFit: "cover", width: "device-width", initialScale: 1 }`.

Headings use `font-heading`, applied through a base layer rule on `h1, h2, h3`.

- [ ] **Step 6: Write the failing feedback-component tests**

`src/components/feedback/feedback.test.tsx`:
- `PageHeader renders title as h1` → `getByRole("heading", { level: 1, name: "Rotina" })`.
- `EmptyState renders title, description and action` → the texts are present, and a passed `<button>Criar</button>` is findable by role.
- `ConfirmDialog calls onConfirm only after confirming` → click the trigger, the dialog opens with the title, "Cancelar" closes it without calling `onConfirm`, reopening and clicking `confirmLabel` calls it once.

Run: `npm test -- feedback`
Expected: FAIL (modules not found).

- [ ] **Step 7: Implement `page-header.tsx`, `empty-state.tsx` and `confirm-dialog.tsx`**

`ConfirmDialog` wraps shadcn `AlertDialog`. When `destructive` is set, the confirm button uses `variant="destructive"`. While the promise is pending, the button is disabled and reads "Aguarde…".

- [ ] **Step 8: Run all tests and checks**

Run: `npm test && npm run lint && npm run typecheck`
Expected: all pass.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: tokens de design MORANO, fontes, shadcn/ui e componentes de feedback"
```

---

### Task 3: Brand — logo, app icons and manifest

**Files:**
- Create: `src/components/brand/logo.tsx`, `src/components/brand/app-mark.tsx`, `src/app/icon.svg`, `src/app/apple-icon.tsx`, `src/app/manifest.ts`
- Delete: `src/app/favicon.ico` (scaffold default)
- Test: `src/components/brand/logo.test.tsx`, `src/app/manifest.test.ts`

**Interfaces:**
- Produces:
  - `<Logo size?: "sm" | "md" | "lg"; className?: string />`. It renders `morano` plus a `.` in `text-caramel`, with the whole element under `aria-label="MORANO"` and `role="img"`. Sizes map to 18 / 22 / 40px.
  - `<AppMark size: number />`: a square with `rounded-[22%]`, bg Sálvia, `m` in Off-white and `.` in Grafite. It is used by `apple-icon.tsx` and the dev gallery.
  - `manifest()` returning `MetadataRoute.Manifest`.

- [ ] **Step 1: Write the failing tests**

- `logo.test.tsx`: `getByRole("img", { name: "MORANO" })` exists, and its text content is `morano.`.
- `manifest.test.ts`: `manifest()` returns `name: "MORANO"`, `short_name: "MORANO"`, `lang: "pt-BR"`, `start_url: "/inicio"`, `display: "standalone"`, `background_color: "#F5F2EC"`, `theme_color: "#F5F2EC"`, plus icons for `/icon.svg` (`sizes: "any"`, `type: "image/svg+xml"`) and `/apple-icon` (`sizes: "180x180"`, `type: "image/png"`).

Run: `npm test -- brand manifest`
Expected: FAIL.

- [ ] **Step 2: Implement `Logo`, `AppMark` and `manifest.ts`**

The manifest also carries `description: "Sua casa. Sob controle."`.

- [ ] **Step 3: Create the icons**

`src/app/icon.svg` is a 64×64 rounded square (`rx="14"`) filled `#879080`, with a centered "m" in `#F5F2EC` and a "." in `#30332F`. Use the font-family `Manrope, system-ui, sans-serif` and weight 700. Express it as `<text>`; exact glyph outlines can come later.
`src/app/apple-icon.tsx` uses `ImageResponse` from `next/og`, size 180×180. It loads Manrope 700 through `fetch` of the Google Fonts file. If that fails, it falls back to the default font without throwing. It renders the same composition as `AppMark`.

- [ ] **Step 4: Verify**

Run: `npm test && npm run build`
Expected: tests pass, and the build lists `/icon.svg`, `/apple-icon` and `/manifest.webmanifest`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: logotipo morano., ícones do app e manifest PWA"
```

---

### Task 4: Navigation model and active-state rule

**Files:**
- Create: `src/components/layout/nav-items.ts`, `src/components/layout/nav-active.ts`
- Test: `src/components/layout/nav-active.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type NavItem = { href: "/inicio" | "/rotina" | "/casa" | "/manutencao" | "/compras"; label: string; icon: LucideIcon };
  export const PRIMARY_NAV: readonly NavItem[];          // exactly the 5 items, in order
  export const SETTINGS_NAV: { href: "/configuracoes"; label: "Configurações"; icon: LucideIcon };
  export function isNavItemActive(pathname: string, href: string): boolean;
  ```
  Icons (lucide-react): Início `House`, Rotina `CalendarCheck`, Casa `Sofa`, Manutenção `Wrench`, Compras `ShoppingBasket`, Configurações `Settings`.

- [ ] **Step 1: Write the failing tests**

```ts
expect(PRIMARY_NAV.map(i => i.label)).toEqual(["Início", "Rotina", "Casa", "Manutenção", "Compras"]);
expect(isNavItemActive("/rotina", "/rotina")).toBe(true);
expect(isNavItemActive("/rotina/calendario", "/rotina")).toBe(true);
expect(isNavItemActive("/rotina-antiga", "/rotina")).toBe(false);
expect(isNavItemActive("/", "/inicio")).toBe(false);
expect(isNavItemActive("/inicio/", "/inicio")).toBe(true);
expect(isNavItemActive("/compras?x=1", "/compras")).toBe(true);
```
Run: `npm test -- nav-active`
Expected: FAIL.

- [ ] **Step 2: Implement**

`isNavItemActive` strips the query and hash, strips a trailing slash, and matches on equality or on the `href + "/"` prefix.

- [ ] **Step 3: Run and commit**

Run: `npm test -- nav-active`
Expected: PASS.
```bash
git add -A
git commit -m "feat: modelo de navegação e regra de item ativo"
```

---

### Task 5: Responsive app shell, placeholder pages and E2E

**Files:**
- Create: `src/components/layout/{app-shell,bottom-nav,sidebar,app-header}.tsx`, `src/app/(app)/layout.tsx`, `src/app/(app)/{inicio,rotina,casa,manutencao,compras,configuracoes}/page.tsx`, `src/app/(dev)/estilo/page.tsx`, `playwright.config.ts`, `tests/e2e/shell.spec.ts`
- Modify: `src/app/page.tsx` (replace the scaffold), `package.json` (scripts), `.gitignore` (`/test-results`, `/playwright-report`)

**Interfaces:**
- Consumes: `PRIMARY_NAV`, `SETTINGS_NAV`, `isNavItemActive` (Task 4); `Logo` (Task 3); `PageHeader`, `EmptyState`, `ConfirmDialog` (Task 2).
- Produces: `<AppShell>{children}</AppShell>`, used by every authenticated page from Etapa 2 on. Scripts `"test:e2e": "playwright test"`.

Layout rules:
- **< md (768px):**
  - `AppHeader` sits at the top: `Logo size="sm"` on the left, and an avatar link (`aria-label="Configurações"`, href `/configuracoes`, a 32px circle with a `User` icon in `bg-sand`) on the right.
  - `BottomNav` is fixed at the bottom. It shows 5 equal columns, each a 20px icon over a label in `text-[11px]`, min height 56px, with `padding-bottom: env(safe-area-inset-bottom)`, `bg-background` and `border-t border-border`.
  - Active item: `text-foreground`. Inactive: `text-muted-foreground`.
  - The main content gets bottom padding equal to the nav height plus the safe area.
- **≥ md:**
  - `Sidebar` is fixed on the left, width 240px. It holds `Logo size="md"`, the 5 items as rows (icon + label, the active row in `bg-sand`), and `SETTINGS_NAV` pinned at the bottom.
  - No bottom nav and no avatar header.
  - Content area: `max-w-3xl`, horizontal padding `px-4 md:px-10`.
- Every nav link is a `next/link`, gets `aria-current="page"` when active, and shows `focus-visible:ring-2 ring-ring` (a visible ring). Navs use `<nav aria-label="Navegação principal">`.
- `AppShell` is a Server Component. `BottomNav` and `Sidebar` are client components that use `usePathname()`.

Placeholder page copy (`PageHeader` title, then an `EmptyState` with no action button):

| Route | Title | EmptyState title | Description |
|---|---|---|---|
| /inicio | Início | O resumo da sua casa aparece aqui | Disponível na Etapa 7, depois que rotina, casa, manutenção e compras estiverem prontas. |
| /rotina | Rotina | Suas tarefas e rotinas aparecem aqui | Disponível na Etapa 4. |
| /casa | Minha casa | Cômodos e equipamentos aparecem aqui | Disponível nas Etapas 3 e 5. |
| /manutencao | Manutenção | Serviços e problemas aparecem aqui | Disponível na Etapa 5. |
| /compras | Compras | Sua lista de compras aparece aqui | Disponível na Etapa 6. |
| /configuracoes | Configurações | Perfil, casa e plano aparecem aqui | Disponível na Etapa 8. |

`src/app/page.tsx`: `redirect("/inicio")` from `next/navigation`. In Etapa 2, auth will decide between onboarding and the app.
`src/app/(dev)/estilo/page.tsx`: calls `notFound()` when `process.env.NODE_ENV === "production"`. Otherwise it renders the palette swatches with names and hex, the type scale (Manrope h1–h3, Inter body/small), `Logo` in all sizes, `AppMark` at 64px, button variants, input + label, skeleton, an `EmptyState`, a `ConfirmDialog` whose confirm calls `toast.success("Confirmado")`, and a "Mostrar toast de erro" button calling `toast.error(...)`. The page header carries a visible badge "DEMONSTRAÇÃO".

- [ ] **Step 1: Install Playwright and configure**

Run: `npm i -D @playwright/test` then `npx playwright install chromium`.
`playwright.config.ts`:
- `testDir: "tests/e2e"`.
- `webServer: { command: "npm run dev -- --port 3100", url: "http://localhost:3100", reuseExistingServer: !process.env.CI }`, `use.baseURL: "http://localhost:3100"`.
- Projects: `mobile` (`devices["Pixel 7"]`) and `desktop` (`devices["Desktop Chrome"]`, viewport 1280×800).

- [ ] **Step 2: Write the failing E2E tests in `tests/e2e/shell.spec.ts`**

- `root redirects to /inicio`: after `goto("/")`, the page URL ends with `/inicio`.
- `mobile: bottom nav shows 5 items and marks the active one` (mobile project only):
  - `getByRole("navigation", { name: "Navegação principal" })` contains 5 links with the labels in order.
  - Clicking "Rotina" → URL `/rotina`, h1 "Rotina", and that link has `aria-current="page"`.
- `mobile: avatar opens Configurações`: clicking the `Configurações` link → h1 "Configurações".
- `desktop: sidebar shows nav and settings` (desktop project only): the nav is visible and the "Configurações" link is visible.
- `no horizontal scroll at 320px`: set the viewport to 320×640. For each of the 6 routes, `document.documentElement.scrollWidth <= 320`. Each of the 5 nav labels' bounding boxes fits inside its own link box, so nothing overlaps.
- `viewport meta has viewport-fit=cover`: the `meta[name=viewport]` content contains `viewport-fit=cover`.
- `focus ring visible on nav link`: press Tab until a nav link is focused. Its computed `box-shadow` or `outline-style` is not `none`.
- `/estilo shows DEMONSTRAÇÃO badge in dev`: the text is visible.

Run: `npm run test:e2e`
Expected: FAIL (no shell yet).

- [ ] **Step 3: Implement the shell components, `(app)/layout.tsx`, the six placeholder pages, the root redirect and `/estilo`**

- [ ] **Step 4: Run E2E**

Run: `npm run test:e2e`
Expected: all pass in both projects.

- [ ] **Step 5: Full verification**

Run: `npm run format:check && npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e`
Expected: every command exits 0.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: app shell responsivo, páginas provisórias, galeria de estilo e testes E2E"
```

---

### Task 6: Stage report for the owner

**Files:**
- Create: `docs/etapas/etapa-1-relatorio.md`

- [ ] **Step 1: Write the report in pt-BR**

Use the format the owner requires (master prompt §17):
1. What was developed.
2. Files created or modified (from `git diff --stat main...etapa-1-fundacao`).
3. Dependencies added, with exact installed versions from `package.json`.
4. Tests run, with pass counts from the last runs.
5. Problems found.
6. What is still missing, with Etapa 2 next.
7. How to look at it: `npm run dev`, then open `http://localhost:3000/inicio` and `/estilo`.

- [ ] **Step 2: Commit**

```bash
git add docs/etapas/etapa-1-relatorio.md
git commit -m "docs: relatório da Etapa 1"
```

Then stop and wait for the owner's approval before any Etapa 2 work.
