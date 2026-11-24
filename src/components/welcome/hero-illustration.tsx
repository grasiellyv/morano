/**
 * Ilustração da tela de boas-vindas (DESIGN.md §5): mãos passando uma sacola de
 * papel com verduras. Extraída de `design/reference/morano-telas.html`
 * (`<template id="illus">`). As cores vêm das variáveis --lavender-*, --pink-*
 * etc. de globals.css; as animações, de welcome.css.
 */
export function HeroIllustration() {
  return (
    <svg viewBox="0 0 375 230" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" className="welcome-illus">
  <defs>
    <filter id="grainF" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="4" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.1 .62" result="a"/>
      <feComposite in="SourceGraphic" in2="a" operator="in" result="g"/>
      <feBlend in="SourceGraphic" in2="g" mode="multiply"/>
    </filter>
    <filter id="soft"><feGaussianBlur stdDeviation="6"/></filter>
    <linearGradient id="gPink" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--pink-200)"/><stop offset="1" stopColor="var(--pink-600)"/></linearGradient>
    <linearGradient id="gLav" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--lavender-300)"/><stop offset="1" stopColor="var(--lavender-500)"/></linearGradient>
    <linearGradient id="gSkin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F6C29C"/><stop offset="1" stopColor="#D9895F"/></linearGradient>
    <linearGradient id="gBag" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#EBCB9E"/><stop offset="1" stopColor="#C79A64"/></linearGradient>
    <linearGradient id="gOr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FFB167"/><stop offset="1" stopColor="var(--orange-600)"/></linearGradient>
    <linearGradient id="gLeaf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--yellow-300)"/><stop offset="1" stopColor="var(--orange-500)"/></linearGradient>
    <linearGradient id="gGreen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--green-400)"/><stop offset="1" stopColor="var(--green-600)"/></linearGradient>
    <radialGradient id="gHillP" cx=".4" cy=".2" r=".9"><stop offset="0" stopColor="#FBE0DC"/><stop offset=".6" stopColor="var(--pink-400)"/><stop offset="1" stopColor="var(--pink-400)" stopOpacity="0"/></radialGradient>
    <radialGradient id="gHillY" cx=".5" cy=".2" r=".9"><stop offset="0" stopColor="#FFF0D0"/><stop offset=".7" stopColor="var(--peach-400)"/><stop offset="1" stopColor="var(--peach-400)" stopOpacity="0"/></radialGradient>
  </defs>
  <g filter="url(#grainF)">
    <ellipse cx="330" cy="120" rx="80" ry="60" fill="var(--lavender-300)" opacity=".55" filter="url(#soft)"/>
    <ellipse cx="40" cy="135" rx="90" ry="50" fill="#F2DCEB" opacity=".9" filter="url(#soft)"/>
    <g className="a-plant">
      <path d="M300 205 l-6 -40 h40 l-6 40z" fill="#8A5A3C"/>
      <path d="M312 168 C312 130 306 100 296 70" stroke="var(--orange-600)" strokeWidth="3" fill="none"/>
      <path d="M312 150 C322 120 334 98 344 80" stroke="var(--orange-600)" strokeWidth="3" fill="none"/>
      <path className="a-leaf" d="M296 70 c-30 -6 -40 -26 -36 -40 c18 4 34 18 36 40z" fill="url(#gLeaf)"/>
      <path className="a-leaf" d="M300 100 c-30 4 -48 -8 -50 -22 c20 -2 40 6 50 22z" fill="url(#gLeaf)" style={{ animationDelay: "-1s" }}/>
      <path className="a-leaf" d="M306 128 c-26 10 -44 2 -50 -10 c18 -6 38 -2 50 10z" fill="url(#gLeaf)" style={{ animationDelay: "-2s" }}/>
      <path className="a-leaf" d="M344 80 c8 -26 30 -36 42 -32 c-4 18 -20 32 -42 32z" fill="url(#gLeaf)" style={{ animationDelay: "-.5s" }}/>
      <path className="a-leaf" d="M328 108 c14 -20 36 -24 46 -18 c-8 16 -26 24 -46 18z" fill="url(#gLeaf)" style={{ animationDelay: "-1.6s" }}/>
      <path className="a-leaf" d="M318 140 c18 -14 38 -12 46 -4 c-12 12 -30 14 -46 4z" fill="url(#gLeaf)" style={{ animationDelay: "-2.4s" }}/>
    </g>
    <g className="a-hand-r">
      <path d="M380 60 C340 58 300 66 268 82 c-8 4 -6 12 2 12 l40 -6 c-8 8 -24 14 -30 22 c-4 6 2 12 10 8 l40 -18 c18 -4 40 -6 60 -2z" fill="url(#gLav)"/>
      <path d="M272 86 l-40 -6 c-8 -1 -8 -9 0 -10 l46 4z" fill="url(#gLav)"/>
      <path d="M270 98 l-36 8 c-8 2 -6 10 2 10 l40 -8z" fill="url(#gLav)"/>
    </g>
    <g className="a-hand-l">
      <path d="M-10 88 C20 80 60 88 84 102 c10 6 18 14 22 24 c3 8 -4 12 -10 8 l-14 -10 c4 10 2 18 -6 20 c-20 6 -50 2 -86 -4z" fill="url(#gPink)"/>
    </g>
    <g className="a-bag">
      <path d="M78 34 c-6 -20 -2 -34 4 -40 c4 10 4 26 2 40z" fill="url(#gGreen)"/>
      <path d="M88 32 c0 -18 10 -30 18 -34 c0 12 -6 26 -12 36z" fill="url(#gGreen)"/>
      <rect x="96" y="14" width="18" height="30" rx="6" fill="#B9C8DC" opacity=".9"/>
      <path d="M118 30 l-6 -26 c10 -4 18 2 18 10z" fill="url(#gOr)"/>
      <circle cx="132" cy="30" r="14" fill="url(#gGreen)"/>
      <path d="M62 38 h78 l8 74 h-92z" fill="url(#gBag)"/>
      <path d="M62 38 l-8 6 l2 68 l6 0z" fill="#B9874F"/>
      <path d="M140 38 l10 -4 l6 76 l-8 2z" fill="#D4AC77"/>
      <path d="M70 92 c14 -4 34 -2 50 6 c6 3 4 9 -2 9 l-46 -4z" fill="url(#gPink)"/>
      <path d="M72 104 c14 -2 30 0 42 6 c5 3 3 8 -2 8 l-40 -4z" fill="url(#gPink)"/>
    </g>
    <g className="a-float"><g className="a-veg" style={{ animationDelay: "1.3s", transformOrigin: "186px 30px" }}>
      <circle cx="186" cy="30" r="20" fill="url(#gOr)"/>
      <path d="M186 10 c4 -8 12 -10 18 -8 c-4 6 -10 9 -18 8z" fill="url(#gGreen)"/>
      <circle cx="180" cy="22" r="5" fill="#fff" opacity=".35"/>
    </g></g>
    <g className="a-hand-r2">
      <path d="M300 230 c-6 -30 -14 -56 -10 -72 c2 -8 10 -8 12 0 l6 24 l2 -40 c0 -8 10 -8 10 0 l2 38 l8 -36 c2 -8 11 -6 10 2 l-4 40 l12 -24 c4 -7 12 -3 9 4 l-17 44 c-4 14 -6 24 -6 30z" fill="url(#gSkin)"/>
    </g>
    <ellipse cx="90" cy="210" rx="150" ry="52" fill="url(#gHillP)"/>
    <ellipse cx="320" cy="222" rx="130" ry="48" fill="url(#gHillY)"/>
    <g className="a-veg" style={{ animationDelay: "1.1s", transformOrigin: "120px 175px" }}>
      <path d="M104 186 c-10 -18 -6 -36 6 -42 c8 10 8 28 2 42z" fill="url(#gGreen)"/>
      <path d="M120 188 c-2 -16 8 -30 20 -32 c0 14 -6 26 -16 34z" fill="url(#gGreen)"/>
    </g>
    <g className="a-veg" style={{ animationDelay: "1.25s", transformOrigin: "170px 182px" }}>
      <circle cx="166" cy="184" r="13" fill="#EFE3B8"/><circle cx="158" cy="180" r="7" fill="#E2D39E"/>
    </g>
    <g className="a-veg" style={{ animationDelay: "1.4s", transformOrigin: "210px 180px" }}>
      <path d="M198 194 c-4 -12 4 -22 16 -22 c10 0 14 10 10 20z" fill="url(#gOr)"/>
      <path d="M210 172 c-2 -10 4 -16 10 -18" stroke="var(--green-600)" strokeWidth="3" fill="none"/>
    </g>
    <g className="a-veg" style={{ animationDelay: "1.55s", transformOrigin: "245px 176px" }}>
      <circle cx="240" cy="172" r="14" fill="url(#gGreen)"/><circle cx="254" cy="166" r="12" fill="url(#gGreen)"/>
      <rect x="244" y="176" width="6" height="18" rx="3" fill="#9CBF6B"/>
    </g>
    <circle cx="44" cy="70" r="3" fill="var(--yellow-300)"/>
    <circle cx="236" cy="54" r="2.5" fill="var(--yellow-300)"/>
  </g>
</svg>
  );
}
