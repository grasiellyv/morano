import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Inbox } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./confirm-dialog";
import { EmptyState } from "./empty-state";
import { PageHeader } from "./page-header";

describe("PageHeader", () => {
  it("renders title as h1", () => {
    render(<PageHeader title="Rotina" description="Tarefas da casa" />);
    expect(screen.getByRole("heading", { level: 1, name: "Rotina" })).toBeInTheDocument();
    expect(screen.getByText("Tarefas da casa")).toBeInTheDocument();
  });
});

describe("EmptyState", () => {
  it("renders title, description and action", () => {
    render(
      <EmptyState
        icon={Inbox}
        title="Nada por aqui"
        description="Comece criando o primeiro item."
        action={<button>Criar</button>}
      />,
    );
    expect(screen.getByText("Nada por aqui")).toBeInTheDocument();
    expect(screen.getByText("Comece criando o primeiro item.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Criar" })).toBeInTheDocument();
  });
});

describe("ConfirmDialog", () => {
  it("calls onConfirm only after confirming", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        trigger={<button>Excluir</button>}
        title="Excluir tarefa?"
        description="Esta ação não pode ser desfeita."
        confirmLabel="Sim, excluir"
        onConfirm={onConfirm}
        destructive
      />,
    );

    await user.click(screen.getByRole("button", { name: "Excluir" }));
    expect(await screen.findByRole("alertdialog", { name: "Excluir tarefa?" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Excluir" }));
    await user.click(await screen.findByRole("button", { name: "Sim, excluir" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
