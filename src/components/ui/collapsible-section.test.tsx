import { fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { CollapsibleSection } from "./collapsible-section";

beforeEach(() => localStorage.clear());

function details(container: HTMLElement) {
  return container.querySelector("details")!;
}

describe("CollapsibleSection", () => {
  it("renderiza <details> com título e contagem", () => {
    const { container, getByText } = render(
      <CollapsibleSection storageKey="k" defaultOpen title="Moradores" meta="2"><p>conteúdo</p></CollapsibleSection>,
    );
    expect(details(container)).toBeInTheDocument();
    expect(getByText("Moradores")).toBeInTheDocument();
    expect(getByText("2")).toBeInTheDocument();
  });

  it("defaultOpen controla o estado inicial", () => {
    const open = render(<CollapsibleSection storageKey="a" defaultOpen title="A"><p>x</p></CollapsibleSection>);
    expect(details(open.container).open).toBe(true);
    const closed = render(<CollapsibleSection storageKey="b" defaultOpen={false} title="B"><p>x</p></CollapsibleSection>);
    expect(details(closed.container).open).toBe(false);
  });

  it("preferência salva vence o padrão depois de montar", () => {
    localStorage.setItem("c", "1");
    localStorage.setItem("d", "0");
    const c = render(<CollapsibleSection storageKey="c" defaultOpen={false} title="C"><p>x</p></CollapsibleSection>);
    const d = render(<CollapsibleSection storageKey="d" defaultOpen title="D"><p>x</p></CollapsibleSection>);
    expect(details(c.container).open).toBe(true);
    expect(details(d.container).open).toBe(false);
  });

  it("forceOpen vence a preferência salva 'fechado'", () => {
    localStorage.setItem("e", "0");
    const { container } = render(<CollapsibleSection storageKey="e" defaultOpen={false} forceOpen title="E"><p>x</p></CollapsibleSection>);
    expect(details(container).open).toBe(true);
  });

  it("alternar grava a preferência", () => {
    const { container } = render(<CollapsibleSection storageKey="f" defaultOpen={false} title="F"><p>x</p></CollapsibleSection>);
    const d = details(container);
    d.open = true;
    fireEvent(d, new Event("toggle"));
    expect(localStorage.getItem("f")).toBe("1");
    d.open = false;
    fireEvent(d, new Event("toggle"));
    expect(localStorage.getItem("f")).toBe("0");
  });

  it("aceita id para âncora", () => {
    const { container } = render(<CollapsibleSection id="secao-convites" storageKey="g" defaultOpen title="G"><p>x</p></CollapsibleSection>);
    expect(details(container).id).toBe("secao-convites");
  });
});
