import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Inbox } from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(cleanup);
import { toast } from "sonner";
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

import { ConfirmDialog } from "./confirm-dialog";
import { EmptyState } from "./empty-state";
import { PageHeader } from "./page-header";

describe("PageHeader", () => {
  it("renders title as h1", () => {
    render(<PageHeader title="Rotina" description="Tarefas da casa" />);
    expect(screen.getByRole("heading", { level: 1, name: "Rotina" })).toBeInTheDocument();
    expect(screen.getByText("Tarefas da casa")).toBeInTheDocument();
  });

  it("quebra linha em vez de vazar quando há várias ações", () => {
    render(<PageHeader title="Membros" actions={<><button>A</button><button>B</button></>} />);
    expect(screen.getByRole("banner").className).toMatch(/flex-wrap/);
    expect(screen.getByText("A").parentElement!.className).toMatch(/flex-wrap/);
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

  function setup(onConfirm: () => Promise<void>) {
    render(
      <ConfirmDialog
        trigger={<button>Abrir</button>}
        title="Confirmar?"
        description="Descrição"
        confirmLabel="Confirmar"
        onConfirm={onConfirm}
      />,
    );
  }

  it("shows pending state and closes only after the promise resolves", async () => {
    const user = userEvent.setup();
    let resolve!: () => void;
    const deferred = new Promise<void>((r) => (resolve = r));
    setup(() => deferred);

    await user.click(screen.getByRole("button", { name: "Abrir" }));
    await user.click(await screen.findByRole("button", { name: "Confirmar" }));

    const pending = await screen.findByRole("button", { name: "Aguarde…" });
    expect(pending).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    resolve();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("keeps the dialog open and re-enables buttons when onConfirm rejects", async () => {
    const user = userEvent.setup();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    setup(() => Promise.reject(new Error("falhou")));

    await user.click(screen.getByRole("button", { name: "Abrir" }));
    await user.click(await screen.findByRole("button", { name: "Confirmar" }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Não foi possível concluir. Tente novamente."),
    );
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeEnabled();
    expect(consoleError).toHaveBeenCalledWith(expect.objectContaining({ message: "falhou" }));
    consoleError.mockRestore();
  });
});
