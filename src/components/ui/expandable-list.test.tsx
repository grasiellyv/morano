import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ExpandableList } from "./expandable-list";

function setup() {
  return render(
    <ExpandableList moreCount={2} more={<><li>Quarto</li><li>Quinto</li></>}>
      <li>Primeiro</li><li>Segundo</li><li>Terceiro</li>
    </ExpandableList>,
  );
}

describe("ExpandableList", () => {
  it("fechada mostra só os primeiros e o botão com a contagem", () => {
    setup();
    expect(screen.getByText("Terceiro")).toBeInTheDocument();
    expect(screen.queryByText("Quarto")).toBeNull();
    expect(screen.getByRole("button", { name: /Ver tudo \(2 a mais\)/ })).toHaveAttribute("aria-expanded", "false");
  });

  it("aberta mostra os demais e o botão 'Mostrar menos' fica DEPOIS do último item", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: /Ver tudo/ }));
    const last = screen.getByText("Quinto");
    const toggle = screen.getByRole("button", { name: "Mostrar menos" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(last.compareDocumentPosition(toggle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("'Mostrar menos' volta a esconder os extras", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: /Ver tudo/ }));
    await user.click(screen.getByRole("button", { name: "Mostrar menos" }));
    expect(screen.queryByText("Quarto")).toBeNull();
    expect(screen.getByRole("button", { name: /Ver tudo \(2 a mais\)/ })).toBeInTheDocument();
  });

  it("sem extras não mostra botão", () => {
    render(<ExpandableList moreCount={0} more={null}><li>Só um</li></ExpandableList>);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
