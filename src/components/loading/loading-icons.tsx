/**
 * Ícones animados das telas de carregamento (um por área do app). Mesmo
 * "selo" por trás (prato cream com sombra) em todos, mudando só o desenho e a
 * cor da sombra — repete o quadro, varia o conteúdo. Estilo flat com grão,
 * gradientes e traço fino, como a ilustração de boas-vindas (ver
 * `src/components/welcome/hero-illustration.tsx`), mas na paleta
 * marrom/âmbar do app (DESIGN.md), não na lilás/rosa da landing.
 */

function Grain({ id }: { id: string }) {
  return (
    <filter id={id} x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="4" result="n" />
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.1 .55" result="a" />
      <feComposite in="SourceGraphic" in2="a" operator="in" result="g" />
      <feBlend in="SourceGraphic" in2="g" mode="multiply" />
    </filter>
  );
}

function Plate({ shadow }: { shadow: string }) {
  return (
    <>
      <ellipse cx="80" cy="128" rx="40" ry="8" fill={shadow} opacity=".35" />
      <circle cx="80" cy="78" r="62" fill="url(#plateG)" />
      <circle cx="80" cy="78" r="62" fill="none" stroke="var(--border)" strokeWidth="1" />
    </>
  );
}

function PlateDefs() {
  return (
    <radialGradient id="plateG" cx=".4" cy=".35" r=".75">
      <stop offset="0" stopColor="var(--card)" />
      <stop offset="1" stopColor="var(--card2, #F5E4D2)" />
    </radialGradient>
  );
}

export function LoadingIconInicio() {
  const rays = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <svg viewBox="0 0 160 160" className="ld-icon" aria-hidden="true" focusable="false">
      <defs>
        <PlateDefs />
        <Grain id="gInicioGrain" />
        <linearGradient id="gBadge" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E7AE5E" />
          <stop offset="1" stopColor="#C57C23" />
        </linearGradient>
      </defs>
      <g filter="url(#gInicioGrain)">
        <Plate shadow="#B5701E" />
        <g className="ld-float">
          <g>
            {rays.map((deg, i) => (
              <rect
                key={deg}
                className="ld-ray"
                x="78.5"
                y="20"
                width="3"
                height="11"
                rx="1.5"
                fill="#D98A2B"
                opacity={0.6}
                style={{ animationDelay: `${i * 0.12}s` }}
                transform={`rotate(${deg} 80 78)`}
              />
            ))}
          </g>
          <g className="ld-breathe">
            <rect x="38" y="38" width="84" height="84" rx="24" fill="url(#gBadge)" />
            <rect x="38.5" y="38.5" width="83" height="83" rx="23.5" fill="none" stroke="#9C5E16" strokeOpacity=".35" />
            <text
              x="76"
              y="94"
              textAnchor="middle"
              fill="#FFF8EC"
              fontSize="46"
              fontWeight="600"
              style={{ fontFamily: "var(--font-title)", letterSpacing: "-0.02em" }}
            >
              m
            </text>
            <circle cx="104" cy="90" r="5" fill="#C8643C" />
          </g>
        </g>
      </g>
    </svg>
  );
}

export function LoadingIconRotina() {
  return (
    <svg viewBox="0 0 160 160" className="ld-icon" aria-hidden="true" focusable="false">
      <defs>
        <PlateDefs />
        <Grain id="gRotinaGrain" />
        <linearGradient id="gPot" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#D98859" />
          <stop offset="1" stopColor="#A8532F" />
        </linearGradient>
        <linearGradient id="gLeafA" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9CC26B" />
          <stop offset="1" stopColor="#5F8F3A" />
        </linearGradient>
        <linearGradient id="gLeafB" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#7FAE4E" />
          <stop offset="1" stopColor="#4D7A35" />
        </linearGradient>
        <linearGradient id="gCanBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E7AE5E" />
          <stop offset="1" stopColor="#C57C23" />
        </linearGradient>
        <linearGradient id="gDrop" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#CFE1F3" />
          <stop offset="1" stopColor="#9BBBD9" />
        </linearGradient>
      </defs>
      <g filter="url(#gRotinaGrain)">
        <Plate shadow="#5F8F3A" />
        <g className="ld-float">
          {/* Vaso + planta, fixos (o regador que se move por cima) */}
          <path d="M60 118 h40 l-5 26 h-30z" fill="url(#gPot)" />
          <rect x="57" y="112" width="46" height="9" rx="3.5" fill="#E79A70" />
          <g className="ld-leaf" style={{ transformOrigin: "80px 112px" }}>
            <path d="M80 112 c0 -18 -14 -30 -26 -31 c1 15 12 27 26 31z" fill="url(#gLeafA)" />
          </g>
          <g className="ld-leaf" style={{ animationDelay: "-1.4s", transformOrigin: "80px 112px" }}>
            <path d="M80 112 c0 -22 12 -36 26 -38 c0 17 -11 32 -26 38z" fill="url(#gLeafB)" />
          </g>
          <g className="ld-leaf" style={{ animationDelay: "-2.6s", transformOrigin: "80px 112px" }}>
            <path d="M80 112 c-6 -10 -5 -21 1 -27 c5 8 6 18 -1 27z" fill="url(#gLeafA)" />
          </g>

          {/* Gotas caindo do bico do regador */}
          <g fill="url(#gDrop)">
            <path className="ld-drop" style={{ animationDelay: "0s" }} d="M63 72 c-2 2.4 -3.2 4.2 -3.2 5.4 a3.2 3.2 0 0 0 6.4 0 c0 -1.2 -1.2 -3 -3.2 -5.4z" />
            <path className="ld-drop" style={{ animationDelay: "-1s" }} d="M70 76 c-2 2.4 -3.2 4.2 -3.2 5.4 a3.2 3.2 0 0 0 6.4 0 c0 -1.2 -1.2 -3 -3.2 -5.4z" />
          </g>

          {/* Regador: entra, derrama, volta — gira em torno do bico */}
          <g transform="translate(96 24) rotate(-20) scale(0.62)">
            <g className="ld-can" style={{ transformOrigin: "2% 28%" }}>
              {/* Bico (triângulo) + abertura */}
              <path d="M2 44 L-34 20 L-31 15 L6 36z" fill="url(#gCanBody)" />
              <ellipse cx="-33" cy="17" rx="4" ry="7" transform="rotate(-34 -33 17)" fill="#9C5E16" />
              {/* Corpo */}
              <path
                d="M0 22 C0 16 4 14 10 14 L48 14 C54 14 58 16 58 22 L56 56 C56 62 52 64 46 64 L12 64 C6 64 2 62 2 56z"
                fill="url(#gCanBody)"
              />
              <path d="M6 22 h46" stroke="#FFE7BE" strokeOpacity=".65" strokeWidth="3" strokeLinecap="round" />
              {/* Alças */}
              <path d="M52 22 C66 22 72 32 70 42 C68 50 62 54 56 54" stroke="#9C5E16" strokeWidth="5" strokeLinecap="round" fill="none" />
              <path d="M12 14 C12 0 46 0 46 14" stroke="#9C5E16" strokeWidth="5" strokeLinecap="round" fill="none" />
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}

export function LoadingIconCompras() {
  return (
    <svg viewBox="0 0 160 160" className="ld-icon" aria-hidden="true" focusable="false">
      <defs>
        <PlateDefs />
        <Grain id="gComprasGrain" />
        <linearGradient id="gBagBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E9C793" />
          <stop offset="1" stopColor="#C79A5E" />
        </linearGradient>
        <linearGradient id="gCup" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#CFE4F2" />
          <stop offset="1" stopColor="#9BBBD9" />
        </linearGradient>
        <linearGradient id="gApple" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#D98059" />
          <stop offset="1" stopColor="#A8472A" />
        </linearGradient>
      </defs>
      <g filter="url(#gComprasGrain)">
        <Plate shadow="#B5701E" />
        <g className="ld-float">
          <g className="ld-bag">
            {/* Alças, curtas e coladas na sacola para não cruzar com os itens */}
            <path d="M62 78 C60 72 63 68 67 67" stroke="#A87442" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M98 78 C100 72 97 68 93 67" stroke="#A87442" strokeWidth="3" strokeLinecap="round" fill="none" />
            {/* Corpo da sacola */}
            <path d="M56 76 h48 l5 46 h-58z" fill="url(#gBagBody)" />
            <path d="M56 76 h48 l.6 7 h-49.2z" fill="#F6E2C2" opacity=".85" />
            {/* Copo, afundado na boca da sacola (sem vão entre os dois) */}
            <g className="ld-pop">
              <path d="M90 58 l13 -3 l3 28 l-15 3z" fill="url(#gCup)" />
              <ellipse cx="91.8" cy="57.3" rx="6.6" ry="2.4" fill="#E7F2FA" />
              <path d="M95 51 l5 -8" stroke="#CFE4F2" strokeWidth="2.2" strokeLinecap="round" />
            </g>
            {/* Maçã, afundada na boca da sacola (sem vão entre as duas) */}
            <g className="ld-pop" style={{ animationDelay: "-1.4s" }}>
              <circle cx="68" cy="64" r="12" fill="url(#gApple)" />
              <path d="M68 52 c-1 -5 3 -8 7 -7 c-2 4 -4 6 -7 7z" fill="#5F8F3A" />
              <circle cx="63" cy="60" r="3" fill="#fff" opacity=".35" />
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}

export function LoadingIconManutencao() {
  return (
    <svg viewBox="0 0 160 160" className="ld-icon" aria-hidden="true" focusable="false">
      <defs>
        <PlateDefs />
        <Grain id="gManutGrain" />
        <linearGradient id="gBoxBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#D98059" />
          <stop offset="1" stopColor="#A8472A" />
        </linearGradient>
        <linearGradient id="gLid" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5C3B23" />
          <stop offset="1" stopColor="#3A2415" />
        </linearGradient>
        <linearGradient id="gTool" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#B7C0C3" />
          <stop offset="1" stopColor="#7E8A8E" />
        </linearGradient>
      </defs>
      <g filter="url(#gManutGrain)">
        <Plate shadow="#8A472A" />
        <g className="ld-float">
          {/* Caixa */}
          <path d="M48 96 h64 l-4 34 h-56z" fill="url(#gBoxBody)" />
          <path d="M44 86 h72 v12 h-72z" fill="url(#gLid)" />
          <path d="M66 78 C66 72 94 72 94 78 L94 86 H66z" fill="none" stroke="#3A2415" strokeWidth="3.4" strokeLinecap="round" />
          <circle cx="56" cy="92" r="2.4" fill="#F2C48D" />
          <circle cx="104" cy="92" r="2.4" fill="#F2C48D" />

          {/* Chave inglesa (mesmo desenho do ícone lucide "wrench"), apertando um parafuso */}
          <g transform="translate(58 56) scale(2.1)">
            <g className="ld-wrench" style={{ transformOrigin: "78% 15%" }}>
              <path
                d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z"
                fill="url(#gTool)"
                stroke="#5B6468"
                strokeWidth="0.6"
                strokeLinejoin="round"
              />
            </g>
          </g>
          <path className="ld-spark" d="M112 100 l2 -6 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2z" fill="#F2C48D" />
        </g>
      </g>
    </svg>
  );
}

export function LoadingIconCasa() {
  return (
    <svg viewBox="0 0 160 160" className="ld-icon" aria-hidden="true" focusable="false">
      <defs>
        <PlateDefs />
        <Grain id="gCasaGrain" />
        <linearGradient id="gRoof" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5C3B23" />
          <stop offset="1" stopColor="#3A2415" />
        </linearGradient>
        <linearGradient id="gWall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFAF4" />
          <stop offset="1" stopColor="#F5E4D2" />
        </linearGradient>
        <linearGradient id="gBush" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9CC26B" />
          <stop offset="1" stopColor="#5F8F3A" />
        </linearGradient>
      </defs>
      <g filter="url(#gCasaGrain)">
        <Plate shadow="#8A6B3A" />
        <g className="ld-float">
          {/* Arbusto */}
          <g className="ld-bush">
            <circle cx="46" cy="110" r="11" fill="url(#gBush)" />
            <circle cx="56" cy="114" r="8" fill="url(#gBush)" />
          </g>
          {/* Casa */}
          <path d="M56 116 v-24 h32 v24z" fill="url(#gWall)" />
          <path d="M48 93 L72 66 L96 93 z" fill="url(#gRoof)" />
          <rect x="48" y="90" width="48" height="4" rx="1.6" fill="url(#gRoof)" />
          <path d="M60 116 v-13 a5 5 0 0 1 10 0 v13z" fill="#B5701E" />
          <rect x="77" y="96" width="11" height="10" rx="1.8" fill="#8FD0E8" className="ld-glow" />
          <rect x="77" y="96" width="11" height="10" rx="1.8" fill="none" stroke="#3A2415" strokeWidth="1.4" />
          <circle cx="104" cy="70" r="2.2" fill="#F2C48D" className="ld-twinkle" />
          <circle cx="112" cy="80" r="1.6" fill="#F2C48D" className="ld-twinkle" style={{ animationDelay: "-1.2s" }} />
        </g>
      </g>
    </svg>
  );
}
