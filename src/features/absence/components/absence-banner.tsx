import { format, parseISO } from "date-fns";

type Props = {
  absenceEnd: string;
  clearAbsenceAction: (_fd: FormData) => Promise<void>;
};

export function AbsenceBanner({ absenceEnd, clearAbsenceAction }: Props) {
  return (
    <div
      role="alert"
      className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200"
    >
      <div className="flex items-center justify-between gap-4">
        <span>
          Você está em modo ausência até{" "}
          <strong>{format(parseISO(absenceEnd), "dd/MM/yyyy")}</strong>
        </span>
        <form action={clearAbsenceAction}>
          <button
            type="submit"
            className="whitespace-nowrap rounded-md bg-yellow-100 px-3 py-1.5 text-xs font-medium text-yellow-900 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-100 dark:hover:bg-yellow-800"
          >
            Encerrar ausência
          </button>
        </form>
      </div>
    </div>
  );
}
