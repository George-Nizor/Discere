import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type RenderResult, render } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { vi } from "vitest";

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

export function renderWithProviders(ui: ReactElement, initialPath = "/"): RenderResult {
  const client = createTestQueryClient();
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[initialPath]}>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  }
  return render(ui, { wrapper: Wrapper });
}

export interface StubReply {
  status?: number;
  body?: unknown;
}

export type StubHandler = (input: { body: unknown; url: string }) => StubReply;

/**
 * Replaces `fetch` with a table keyed by "METHOD /path". An unmatched request fails loudly so a
 * test never passes because a call silently returned nothing.
 */
export function stubFetch(handlers: Record<string, StubHandler | StubReply>) {
  const calls: Array<{ key: string; body: unknown }> = [];
  const stub = vi.fn(async (url: string | URL, init?: RequestInit) => {
    const address = typeof url === "string" ? url : url.toString();
    const path = address.split("?")[0] ?? address;
    const method = (init?.method ?? "GET").toUpperCase();
    const key = `${method} ${path}`;
    const parsedBody =
      typeof init?.body === "string" && init.body.length > 0
        ? (JSON.parse(init.body) as unknown)
        : null;
    calls.push({ key, body: parsedBody });
    const handler = handlers[key];
    if (!handler) throw new Error(`No stub registered for ${key}`);
    const reply =
      typeof handler === "function" ? handler({ body: parsedBody, url: address }) : handler;
    const status = reply.status ?? 200;
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => JSON.stringify(reply.body ?? {}),
    } as unknown as Response;
  });
  vi.stubGlobal("fetch", stub);
  return { stub, calls };
}
