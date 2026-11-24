import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const loadProductSources = vi.fn();
vi.mock("@/features/shopping/actions-suggest", () => ({ loadProductSources: (...a: unknown[]) => loadProductSources(...a) }));

import { useProductSources, resetProductSourcesCache } from "./use-product-sources";

const sources = { categories: [{ id: "c1", default_slug: "alimentacao" }], home: [{ name: "Leite", category_id: "c1", unit: "l" }] };

beforeEach(() => {
  resetProductSourcesCache();
  loadProductSources.mockReset();
  loadProductSources.mockResolvedValue(sources);
});

describe("useProductSources", () => {
  it("desabilitado não consulta o servidor", () => {
    const { result } = renderHook(() => useProductSources(false));
    expect(loadProductSources).not.toHaveBeenCalled();
    expect(result.current).toBeUndefined();
  });

  it("habilitado busca uma vez e devolve as fontes", async () => {
    const { result } = renderHook(() => useProductSources(true));
    await waitFor(() => expect(result.current).toEqual(sources));
    expect(loadProductSources).toHaveBeenCalledTimes(1);
  });

  it("dois usos na mesma sessão compartilham a mesma busca (cache)", async () => {
    const a = renderHook(() => useProductSources(true));
    const b = renderHook(() => useProductSources(true));
    await waitFor(() => expect(a.result.current).toEqual(sources));
    await waitFor(() => expect(b.result.current).toEqual(sources));
    expect(loadProductSources).toHaveBeenCalledTimes(1);
  });

  it("falha na busca não quebra: continua sem fontes e permite tentar de novo", async () => {
    loadProductSources.mockRejectedValueOnce(new Error("rede"));
    const first = renderHook(() => useProductSources(true));
    await waitFor(() => expect(loadProductSources).toHaveBeenCalledTimes(1));
    expect(first.result.current).toBeUndefined();
    const second = renderHook(() => useProductSources(true));
    await waitFor(() => expect(second.result.current).toEqual(sources));
    expect(loadProductSources).toHaveBeenCalledTimes(2);
  });
});
