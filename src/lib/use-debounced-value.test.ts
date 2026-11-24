import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDebouncedValue } from "./use-debounced-value";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useDebouncedValue", () => {
  it("só entrega o valor depois de 300 ms parado", () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 300), { initialProps: { v: "l" } });
    rerender({ v: "le" });
    act(() => { vi.advanceTimersByTime(299); });
    expect(result.current).toBe("l");
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current).toBe("le");
  });

  it("digitar de novo reinicia a espera", () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 300), { initialProps: { v: "l" } });
    rerender({ v: "le" });
    act(() => { vi.advanceTimersByTime(200); });
    rerender({ v: "lei" });
    act(() => { vi.advanceTimersByTime(200); });
    expect(result.current).toBe("l");
    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current).toBe("lei");
  });
});
