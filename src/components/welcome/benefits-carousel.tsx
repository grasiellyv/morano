"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarCheck, Clock, Users } from "lucide-react";

const BENEFITS = [
  { tone: "lav", Icon: Users, title: "Tudo compartilhado", description: "Listas, tarefas e compras visíveis para todos da casa." },
  { tone: "pea", Icon: CalendarCheck, title: "Uma rotina mais organizada", description: "Distribua responsabilidades e acompanhe o que foi feito." },
  { tone: "yel", Icon: Clock, title: "Menos coisas para lembrar", description: "Lembretes e histórico: a casa não depende da sua memória." },
] as const;

/** Carrossel horizontal (scroll-snap) dos 3 benefícios, com indicador de pontos. */
export function BenefitsCarousel() {
  const track = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  // Rolagem automática: pausa com o mouse em cima e para de vez quando a pessoa
  // toca, arrasta ou foca o carrossel. Não roda com "reduzir movimento".
  const hovering = useRef(false);
  const stopped = useRef(false);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      if (stopped.current || hovering.current || document.hidden) return;
      goTo((activeRef.current + 1) % BENEFITS.length);
    }, 5000);
    return () => window.clearInterval(id);
  }, []);

  function onScroll() {
    const el = track.current;
    if (!el) return;
    const items = Array.from(el.children) as HTMLElement[];
    let best = 0;
    let bestDist = Infinity;
    items.forEach((item, i) => {
      const dist = Math.abs(item.offsetLeft - 22 - el.scrollLeft);
      if (dist < bestDist) {
        best = i;
        bestDist = dist;
      }
    });
    // Último cartão: a rolagem chega ao fim sem alinhá-lo à borda.
    if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 2) best = items.length - 1;
    setActive(best);
  }

  function goTo(i: number) {
    const el = track.current;
    const item = el?.children[i] as HTMLElement | undefined;
    if (!el || !item) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: item.offsetLeft - 22, behavior: reduce ? "auto" : "smooth" });
  }

  return (
    <section
      aria-roledescription="carrossel"
      aria-label="Benefícios do Morano"
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") hovering.current = true;
      }}
      onPointerLeave={() => {
        hovering.current = false;
      }}
      onTouchStart={() => {
        stopped.current = true;
      }}
      onFocus={() => {
        stopped.current = true;
      }}
    >
      <ul ref={track} className="welcome-track a-in" style={{ animationDelay: "1.6s" }} onScroll={onScroll} tabIndex={0}>
        {BENEFITS.map(({ tone, Icon, title, description }, i) => (
          <li key={title} className="welcome-feat" aria-label={`${i + 1} de ${BENEFITS.length}`}>
            <span className={`welcome-ico ${tone}`}>
              <Icon aria-hidden size={19} />
            </span>
            <div>
              <h3>{title}</h3>
              <p>{description}</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="welcome-dots a-in" style={{ animationDelay: "1.9s" }}>
        {BENEFITS.map((b, i) => (
          <button
            key={b.title}
            type="button"
            className="welcome-dot"
            aria-label={`Ver benefício ${i + 1}: ${b.title}`}
            aria-current={i === active}
            onClick={() => goTo(i)}
          />
        ))}
      </div>
    </section>
  );
}
