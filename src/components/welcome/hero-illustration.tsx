/**
 * Ilustração da tela de boas-vindas (DESIGN.md §5): duas ações da casa flutuando
 * sobre uma nuvem — à esquerda, uma mão segurando a sacola de feira com frutas;
 * à direita, outra mão regando uma plantinha. A "nuvem" é um chão de puffs com
 * gradientes radiais sobrepostos (não lineares) e borda difusa por máscara.
 * As cores vêm das variáveis --lavender-*, --pink-* etc. de globals.css; as
 * animações, de welcome.css.
 */

export function HeroIllustration() {
  return (
    <svg viewBox="0 0 375 230" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" className="welcome-illus">
      <defs>
        <filter id="grainF" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="4" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.1 .62" result="a" />
          <feComposite in="SourceGraphic" in2="a" operator="in" result="g" />
          <feBlend in="SourceGraphic" in2="g" mode="multiply" />
        </filter>
        <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" /></filter>
        <filter id="blur14" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14" /></filter>
        <filter id="blur3" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3" /></filter>
        <filter id="fingerShade" x="-50%" y="-20%" width="200%" height="140%"><feGaussianBlur stdDeviation=".7" /></filter>
        <filter id="edge"x="-10%" y="-20%" width="120%" height="140%"><feGaussianBlur stdDeviation="2.2" /></filter>

        {/* Mãos no estilo das referências: braço e mão numa peça só, em cor da marca, com grão e traço fino */}
        <linearGradient id="gHandL" gradientUnits="userSpaceOnUse" x1="-20" y1="0" x2="134" y2="40"><stop offset="0" stopColor="var(--pink-200)" /><stop offset=".55" stopColor="var(--pink-400)" /><stop offset="1" stopColor="#DE6A92" /></linearGradient>
        <linearGradient id="gArmR" gradientUnits="userSpaceOnUse" x1="395" y1="0" x2="306" y2="30"><stop offset="0" stopColor="var(--lavender-300)" /><stop offset="1" stopColor="var(--lavender-500)" /></linearGradient>
        <linearGradient id="gHandR" gradientUnits="userSpaceOnUse" x1="62" y1="-20" x2="6" y2="16"><stop offset="0" stopColor="var(--lavender-500)" /><stop offset="1" stopColor="#8A73DC" /></linearGradient>
        <linearGradient id="gPink"x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--pink-200)" /><stop offset="1" stopColor="var(--pink-600)" /></linearGradient>
        <linearGradient id="gLav" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--lavender-300)" /><stop offset="1" stopColor="var(--lavender-500)" /></linearGradient>

        {/* Sacola, frutas, regador, vaso */}
        <linearGradient id="gBag" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#F0D3A8" /><stop offset="1" stopColor="#C99B63" /></linearGradient>
        <linearGradient id="gOr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FFB167" /><stop offset="1" stopColor="var(--orange-600)" /></linearGradient>
        <linearGradient id="gApple" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#C6E08A" /><stop offset="1" stopColor="var(--green-400)" /></linearGradient>
        <linearGradient id="gGreen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--green-400)" /><stop offset="1" stopColor="var(--green-600)" /></linearGradient>
        <linearGradient id="gLeaf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#A8CF6E" /><stop offset="1" stopColor="var(--green-600)" /></linearGradient>
        <linearGradient id="gCan" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--yellow-300)" /><stop offset="1" stopColor="var(--orange-500)" /></linearGradient>
        <linearGradient id="gPot" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#E08A5E" /><stop offset="1" stopColor="#B65A36" /></linearGradient>
        <linearGradient id="gWater" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#D6E6F7" /><stop offset="1" stopColor="#93B8E4" /></linearGradient>

        {/* Nuvem: base com foco deslocado + manchas de cor desfocadas = gradiente não linear */}
        <radialGradient id="gCloud" cx=".5" cy=".05" fx=".42" fy="0" r=".95">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset=".35" stopColor="#FEF3EA" />
          <stop offset=".7" stopColor="#F6D6CF" />
          <stop offset="1" stopColor="#E9C9E4" />
        </radialGradient>
        <radialGradient id="gPuffHi" cx=".45" cy=".35" r=".6">
          <stop offset="0" stopColor="#fff" stopOpacity=".95" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="gFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset=".72" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="1" />
        </linearGradient>
        <mask id="cloudMask" maskUnits="userSpaceOnUse" x="-40" y="100" width="455" height="160">
          <g fill="#fff" filter="url(#edge)">
            <circle cx="6" cy="192" r="38" />
            <circle cx="58" cy="168" r="40" />
            <circle cx="118" cy="176" r="36" />
            <circle cx="168" cy="186" r="30" />
            <circle cx="214" cy="170" r="40" />
            <circle cx="272" cy="180" r="34" />
            <circle cx="322" cy="164" r="42" />
            <circle cx="372" cy="186" r="36" />
            <rect x="-30" y="188" width="435" height="60" />
          </g>
          <rect x="-40" y="140" width="455" height="100" fill="url(#gFade)" />
          {/* Abaixo do fade, a máscara fica toda preta: nada da nuvem reaparece sobre o carrossel. */}
          <rect x="-40" y="239.5" width="455" height="25" fill="#000" />
        </mask>
      </defs>

      <g filter="url(#grainF)">
        {/* Halos de fundo */}
        <ellipse cx="318" cy="96" rx="78" ry="58" fill="var(--lavender-300)" opacity=".5" filter="url(#soft)" />
        <ellipse cx="62" cy="96" rx="82" ry="56" fill="#F5DCE6" opacity=".85" filter="url(#soft)" />

        {/* ── Nuvem-chão ── */}
        {/* Aura atrás dos puffs: dá contraste para o contorno branco da nuvem */}
        <ellipse cx="80" cy="150" rx="110" ry="22" fill="#EFC6D6" opacity=".85" filter="url(#blur14)" />
        <ellipse cx="300" cy="146" rx="110" ry="22" fill="#D9CBF2" opacity=".9" filter="url(#blur14)" />
        <ellipse cx="190" cy="160" rx="60" ry="16" fill="#F3D2C2" opacity=".8" filter="url(#blur14)" />
        <g mask="url(#cloudMask)">
          <rect x="-40" y="110" width="455" height="140" fill="url(#gCloud)" />
          <ellipse cx="40" cy="214" rx="90" ry="34" fill="var(--pink-200)" opacity=".85" filter="url(#blur14)" />
          <ellipse cx="190" cy="222" rx="80" ry="26" fill="var(--lavender-300)" opacity=".55" filter="url(#blur14)" />
          <ellipse cx="340" cy="212" rx="90" ry="32" fill="var(--peach-400)" opacity=".7" filter="url(#blur14)" />
          <ellipse cx="300" cy="168" rx="60" ry="22" fill="var(--yellow-300)" opacity=".35" filter="url(#blur14)" />
          {/* Volume dos puffs: brilho no topo de cada um */}
          <g fill="url(#gPuffHi)">
            <ellipse cx="54" cy="150" rx="30" ry="18" />
            <ellipse cx="116" cy="160" rx="26" ry="14" />
            <ellipse cx="210" cy="150" rx="30" ry="17" />
            <ellipse cx="318" cy="144" rx="32" ry="18" />
            <ellipse cx="270" cy="164" rx="22" ry="12" />
          </g>
          {/* Sombras das ações que flutuam */}
          <ellipse className="a-shadow" cx="104" cy="168" rx="34" ry="6" fill="#B7708A" opacity=".28" filter="url(#blur3)" />
          <ellipse className="a-shadow a-shadow-2" cx="226" cy="170" rx="26" ry="5" fill="#B0749A" opacity=".26" filter="url(#blur3)" />
        </g>

        {/* ── Ação 1: mão segurando a sacola com frutas ── */}
        <g className="a-hand-l">
          <g className="a-float">
            {/* Frutas que saem da sacola */}
            <path className="a-veg" style={{ animationDelay: "1.2s", transformOrigin: "84px 74px" }} d="M80 74 c-8 -14 -8 -30 0 -38 c6 10 8 24 4 38z" fill="url(#gGreen)" />
            <path className="a-veg" style={{ animationDelay: "1.25s", transformOrigin: "90px 74px" }} d="M88 74 c0 -16 8 -28 16 -32 c0 12 -4 24 -12 34z" fill="url(#gLeaf)" />
            <g className="a-veg" style={{ animationDelay: "1.3s", transformOrigin: "124px 66px" }}>
              <circle cx="124" cy="64" r="13" fill="url(#gOr)" />
              <path d="M124 51 c2 -6 8 -8 13 -6 c-3 5 -8 7 -13 6z" fill="url(#gGreen)" />
              <circle cx="119" cy="58" r="3.5" fill="#fff" opacity=".4" />
            </g>
            <g className="a-veg" style={{ animationDelay: "1.4s", transformOrigin: "104px 68px" }}>
              <path d="M104 58 c-8 -4 -16 2 -15 11 c1 9 8 13 15 10 c7 3 14 -1 15 -10 c1 -9 -7 -15 -15 -11z" fill="url(#gApple)" />
              <path d="M104 58 c0 -5 2 -8 4 -10" stroke="#7A4A2C" strokeWidth="2" strokeLinecap="round" fill="none" />
              <circle cx="97" cy="64" r="3" fill="#fff" opacity=".4" />
            </g>
            {/* Sacola de papel */}
            <path d="M136 74 l12 -5 l6 70 l-12 4z" fill="#B9874F" />
            <path d="M66 74 h70 l6 69 h-82z" fill="url(#gBag)" />
            <path d="M66 74 h70 l.8 8 h-71.6z" fill="#F6E2C2" opacity=".85" />
            <path d="M96 106 c-5 -6 -14 -2 -10 6 l10 9 l10 -9 c4 -8 -5 -12 -10 -6z" fill="var(--pink-400)" opacity=".75" />
            {/* Alças (passam por trás do punho) */}
            <path d="M82 76 C80 58 88 42 98 40" stroke="#A87442" strokeWidth="3.2" strokeLinecap="round" fill="none" />
            <path d="M120 76 C122 58 114 42 106 40" stroke="#A87442" strokeWidth="3.2" strokeLinecap="round" fill="none" />
            {/* Braço e punho fechado nas alças (uma peça rosa, dedos em traço fino) */}
            <path d="M-20 16 C22 12 58 14 88 20 L88 56 C58 52 22 52 -20 58z" fill="url(#gHandL)" />
            <path d="M84 22 C90 14 99 9.5 109 9.5 C119.5 9.5 129 13 131.4 19.6 C133.4 24.6 131.4 27.4 128.6 27.8 C133.4 30.4 134.4 36.4 130.2 39.4 C132.6 43.2 131.4 48.6 127 50 C127 54.6 122 58.6 115 58.6 C106 58.6 98 57.6 90 55.6 L84 54z" fill="url(#gHandL)" />
            <g stroke="#A3325E" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none">
              <path d="M128.6 27.8 C121 25.2 113 24.6 107.4 25.6 c-2.6 .4 -3.2 -2.8 -.8 -3.6" />
              <path d="M130.2 39.4 C122 36.6 114 36 108.4 36.8 c-2.6 .4 -3.2 -2.8 -.8 -3.6" />
              <path d="M127 50 C120.6 47.6 114.6 47 110 47.6 c-2.6 .4 -3.2 -2.8 -.8 -3.6" />
              <path d="M87.6 48 C93 40.6 99.4 32.4 106 27.6 c2.4 -1.6 4.4 .4 3 2.6" />
              <path d="M84.6 29 c2 1.2 3.4 3 4 5" opacity=".7" />
            </g>
          </g>
        </g>

        {/* Laranja solta, flutuando entre as duas ações */}
        <g className="a-float" style={{ animationDelay: "-2s" }}>
          <g className="a-veg" style={{ animationDelay: "1.6s", transformOrigin: "170px 92px" }}>
            <circle cx="170" cy="92" r="11" fill="url(#gOr)" />
            <path d="M170 81 c2 -5 7 -7 11 -5 c-3 4 -7 6 -11 5z" fill="url(#gGreen)" />
            <circle cx="166" cy="87" r="3" fill="#fff" opacity=".4" />
          </g>
        </g>

        {/* ── Ação 2: mão regando a plantinha ── */}
        <g className="a-plant">
          <g className="a-float" style={{ animationDelay: "-1s" }}>
            <path d="M226 138 C226 124 224 112 218 100" stroke="var(--green-600)" strokeWidth="2.6" strokeLinecap="round" fill="none" />
            <path d="M226 128 C230 118 236 110 244 104" stroke="var(--green-600)" strokeWidth="2.6" strokeLinecap="round" fill="none" />
            <path className="a-leaf" d="M218 100 c-16 -2 -24 -14 -22 -24 c12 2 22 12 22 24z" fill="url(#gLeaf)" />
            <path className="a-leaf" d="M222 118 c-16 4 -26 -2 -30 -10 c12 -4 24 0 30 10z" fill="url(#gLeaf)" style={{ animationDelay: "-1.2s" }} />
            <path className="a-leaf" d="M244 104 c4 -14 16 -20 24 -18 c-2 12 -12 18 -24 18z" fill="url(#gLeaf)" style={{ animationDelay: "-.6s" }} />
            <path className="a-leaf" d="M230 122 c10 -10 22 -10 28 -4 c-8 8 -20 10 -28 4z" fill="url(#gLeaf)" style={{ animationDelay: "-2s" }} />
            <circle cx="218" cy="98" r="4.5" fill="var(--peach-400)" />
            <circle cx="218" cy="98" r="2" fill="var(--yellow-300)" />
            {/* Vaso */}
            <path d="M210 142 h32 l-4 24 h-24z" fill="url(#gPot)" />
            <rect x="207" y="136" width="38" height="8" rx="3" fill="#E79A70" />
            <ellipse cx="226" cy="137" rx="16" ry="2.4" fill="#7A4A2C" />
          </g>
        </g>

        {/* Gotas de água caindo do regador */}
        <g fill="url(#gWater)">
          <path className="a-drop" d="M232 84 c-2 3 -3 5 -3 6.5 a3 3 0 0 0 6 0 c0 -1.5 -1 -3.5 -3 -6.5z" />
          <path className="a-drop" style={{ animationDelay: "2.0s" }} d="M224 88 c-2 3 -3 5 -3 6.5 a3 3 0 0 0 6 0 c0 -1.5 -1 -3.5 -3 -6.5z" />
          <path className="a-drop" style={{ animationDelay: "2.3s" }} d="M238 90 c-2 3 -3 5 -3 6.5 a3 3 0 0 0 6 0 c0 -1.5 -1 -3.5 -3 -6.5z" />
          <path className="a-drop" style={{ animationDelay: "2.6s" }} d="M229 94 c-2 3 -3 5 -3 6.5 a3 3 0 0 0 6 0 c0 -1.5 -1 -3.5 -3 -6.5z" />
        </g>

        <g className="a-hand-r">
          <g className="a-float" style={{ animationDelay: "-3s" }}>
            {/* Braço lilás vindo da direita (sem manga: braço e mão na mesma cor) */}
            <path d="M395 -2 C366 0 336 6 306 15 L317 41 C342 38 368 40 395 46z" fill="url(#gArmR)" />
            {/* Regador inclinado, despejando para a esquerda */}
            <g transform="translate(262 48) rotate(-22)">
              <path d="M2 44 L-34 20 L-31 15 L6 36z" fill="url(#gCan)" />
              <ellipse cx="-35" cy="17" rx="4" ry="7.5" transform="rotate(-34 -35 17)" fill="var(--orange-500)" />
              <path d="M0 22 C0 16 4 14 10 14 L48 14 C54 14 58 16 58 22 L56 56 C56 62 52 64 46 64 L12 64 C6 64 2 62 2 56z" fill="url(#gCan)" />
              <path d="M6 22 h46" stroke="#fff" strokeOpacity=".55" strokeWidth="3" strokeLinecap="round" />
              <path d="M52 22 C66 22 72 32 70 42 C68 50 62 54 56 54" stroke="var(--orange-600)" strokeWidth="5" strokeLinecap="round" fill="none" />
              <path d="M12 14 C12 0 46 0 46 14" stroke="var(--orange-600)" strokeWidth="5" strokeLinecap="round" fill="none" />
              {/* Punho fechado na alça de cima, dedos em traço fino */}
              <path d="M62 -10 C52 -18 40 -21 29 -19.5 C20 -18 14 -13 14 -6 C12.5 0 14 5.5 18.5 5.5 C20.5 5.5 21.5 4.5 22 3.5 C22.5 7.5 26 9 29 8.5 C30.5 8.2 31 7.5 31.2 6.5 C32 9.5 36 10.5 39 9.5 C40 9 40.4 8 40.4 7.5 C41.5 9.5 46 10 48.5 8 C51 6 53 4 55 3.4 L63 7z" fill="url(#gHandR)" />
              <g stroke="#4A3AA6" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none">
                <path d="M22 3.5 C20.6 -1 20.6 -6 21.6 -10" />
                <path d="M31.2 6.5 C30 1 30 -5.6 31 -11.6" />
                <path d="M40.4 7.5 C39.4 2 39.6 -4.6 40.6 -10.6" />
                <path d="M57 -3 C53.4 1 50 3.6 46.4 4.6" />
              </g>
            </g>
          </g>
        </g>

        {/* Brilhos */}
        <path d="M252 132 l2 -6 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2z" fill="var(--yellow-300)" className="a-twinkle" />
        <path d="M40 72 l1.5 -4.5 l1.5 4.5 l4.5 1.5 l-4.5 1.5 l-1.5 4.5 l-1.5 -4.5 l-4.5 -1.5z" fill="var(--yellow-300)" className="a-twinkle" style={{ animationDelay: "-1.2s" }} />
        <circle cx="150" cy="40" r="2.5" fill="var(--yellow-300)" />
        <circle cx="196" cy="62" r="2" fill="var(--pink-400)" opacity=".7" />
      </g>
    </svg>
  );
}
