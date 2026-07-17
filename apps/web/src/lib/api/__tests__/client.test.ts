import { describe, expect, it, vi } from "vitest";

import { ApiError, createApiClient } from "@/lib/api/client";

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

// A typed fetch mock so call args are `[string, RequestInit?]`, not `[]`.
function mockFetch(handler: (url: string, init?: RequestInit) => Response) {
  return vi.fn((url: string, init?: RequestInit): Promise<Response> =>
    Promise.resolve(handler(url, init)),
  );
}

describe("createApiClient", () => {
  it("attaches the bearer token and parses the response", async () => {
    const fetchImpl = mockFetch(() => jsonResponse({ subject: "s" }));
    const client = createApiClient({
      baseUrl: "http://api.test",
      getToken: async () => "TOKEN123",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const result = await client.getMe();

    expect(result.subject).toBe("s");
    const call = fetchImpl.mock.calls[0]!;
    expect(call[0]).toBe("http://api.test/api/v1/me");
    const headers = new Headers(call[1]?.headers);
    expect(headers.get("Authorization")).toBe("Bearer TOKEN123");
  });

  it("omits the Authorization header when there is no token", async () => {
    const fetchImpl = mockFetch(() => jsonResponse({ subject: "s" }));
    const client = createApiClient({
      baseUrl: "http://api.test",
      getToken: async () => null,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await client.getMe();
    const call = fetchImpl.mock.calls[0]!;
    const headers = new Headers(call[1]?.headers);
    expect(headers.has("Authorization")).toBe(false);
  });

  it("throws a typed ApiError from the backend error envelope", async () => {
    const fetchImpl = mockFetch(() =>
      jsonResponse(
        { error: { code: "forbidden", message: "Nope", correlationId: "c-9" } },
        { status: 403 },
      ),
    );
    const client = createApiClient({
      baseUrl: "http://api.test",
      getToken: async () => "t",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(client.getMe()).rejects.toBeInstanceOf(ApiError);
    await expect(client.getMe()).rejects.toMatchObject({
      status: 403,
      code: "forbidden",
      correlationId: "c-9",
    });
  });

  it("posts ask questions and parses citation shape", async () => {
    const fetchImpl = mockFetch((_url, init) => {
      expect(init?.body).toBe(JSON.stringify({ question: "budget variance" }));
      return jsonResponse({
        answer: "Use the budget variance guide.",
        citations: [
          {
            sourceType: "content",
            sourceKey: "copilot-excel-budget-variance",
            title: "Analyze a budget variance report",
            kind: "playbook",
          },
        ],
        grounded: true,
        model: "mock-1",
      });
    });
    const client = createApiClient({
      baseUrl: "http://api.test",
      getToken: async () => "t",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const result = await client.ask("budget variance");

    expect(fetchImpl.mock.calls[0]?.[0]).toBe("http://api.test/api/v1/ask");
    expect(fetchImpl.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(result.citations[0]?.sourceKey).toBe("copilot-excel-budget-variance");
  });
});
