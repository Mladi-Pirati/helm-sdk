import { expect, test } from "bun:test";
import { createClient, type SdkConfig } from "../../client";
import { SdkError, SdkParseError } from "../../errors";

type FetchCall = {
  url: URL;
  init?: RequestInit;
};

type SdkFetch = NonNullable<SdkConfig["fetch"]>;

function asSdkFetch(
  fetchImpl: (...args: Parameters<SdkFetch>) => ReturnType<SdkFetch>
): SdkFetch {
  return Object.assign(fetchImpl, { preconnect: () => undefined });
}

function createFetch(
  handler: (
    call: FetchCall,
    index: number
  ) =>
    | { body: unknown; status?: number }
    | Promise<{ body: unknown; status?: number }>
) {
  const calls: FetchCall[] = [];

  const fetchImpl = asSdkFetch(async (input, init) => {
    const rawUrl =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    const call = { url: new URL(rawUrl), init };
    calls.push(call);

    const response = await handler(call, calls.length - 1);

    return Response.json(response.body, {
      status: response.status ?? 200,
    });
  });

  return { calls, fetchImpl };
}

test("list() returns parsed rows and nextCursor", async () => {
  const { fetchImpl } = createFetch(() => ({
    body: {
      rows: [
        {
          id: "member-1",
          firstName: "Ada",
          lastName: "Lovelace",
          username: "ada",
        },
      ],
      nextCursor: "cursor-2",
    },
  }));
  const client = createClient({ baseUrl: "https://helm.test", fetch: fetchImpl });

  const page = await client.user.members.list();

  expect(page).toEqual({
    rows: [
      {
        id: "member-1",
        firstName: "Ada",
        lastName: "Lovelace",
        username: "ada",
      },
    ],
    nextCursor: "cursor-2",
  });
});

test("list() serializes roleId as repeated query params", async () => {
  const { calls, fetchImpl } = createFetch(() => ({
    body: { rows: [], nextCursor: null },
  }));
  const client = createClient({ baseUrl: "https://helm.test", fetch: fetchImpl });

  await client.user.members.list({ roleId: ["role-a", "role-b"] });

  expect(calls[0]?.url.searchParams.getAll("roleId")).toEqual([
    "role-a",
    "role-b",
  ]);
  expect(calls[0]?.url.search).toContain("roleId=role-a");
  expect(calls[0]?.url.search).toContain("roleId=role-b");
});

test("list() omits params that are not provided", async () => {
  const { calls, fetchImpl } = createFetch(() => ({
    body: { rows: [], nextCursor: null },
  }));
  const client = createClient({ baseUrl: "https://helm.test", fetch: fetchImpl });

  await client.user.members.list({ q: "ada" });

  expect(calls[0]?.url.pathname).toBe("/api/user/members");
  expect(calls[0]?.url.searchParams.get("q")).toBe("ada");
  expect(calls[0]?.url.searchParams.has("cursor")).toBe(false);
  expect(calls[0]?.url.searchParams.has("limit")).toBe(false);
  expect(calls[0]?.url.searchParams.has("status")).toBe(false);
  expect(calls[0]?.url.searchParams.has("roleId")).toBe(false);
  expect(calls[0]?.url.searchParams.has("sort")).toBe(false);
});

test("paginate() yields pages and stops when nextCursor is null", async () => {
  const { fetchImpl } = createFetch((_, index) => ({
    body:
      index === 0
        ? {
            rows: [
              {
                id: "member-1",
                firstName: "Ada",
                lastName: "Lovelace",
                username: "ada",
              },
            ],
            nextCursor: "cursor-2",
          }
        : {
            rows: [
              {
                id: "member-2",
                firstName: "Grace",
                lastName: "Hopper",
                username: "grace",
              },
            ],
            nextCursor: null,
          },
  }));
  const client = createClient({ baseUrl: "https://helm.test", fetch: fetchImpl });

  const pages = [];
  for await (const page of client.user.members.paginate()) {
    pages.push(page);
  }

  expect(pages).toEqual([
    [
      {
        id: "member-1",
        firstName: "Ada",
        lastName: "Lovelace",
        username: "ada",
      },
    ],
    [
      {
        id: "member-2",
        firstName: "Grace",
        lastName: "Hopper",
        username: "grace",
      },
    ],
  ]);
});

test("paginate() correctly threads cursors across pages", async () => {
  const { calls, fetchImpl } = createFetch((_, index) => ({
    body:
      index === 0
        ? { rows: [], nextCursor: "cursor-2" }
        : { rows: [], nextCursor: null },
  }));
  const client = createClient({ baseUrl: "https://helm.test", fetch: fetchImpl });

  for await (const _page of client.user.members.paginate({ q: "ada" })) {
    // consume generator
  }

  expect(calls).toHaveLength(2);
  expect(calls[0]?.url.searchParams.get("cursor")).toBeNull();
  expect(calls[0]?.url.searchParams.get("q")).toBe("ada");
  expect(calls[1]?.url.searchParams.get("cursor")).toBe("cursor-2");
  expect(calls[1]?.url.searchParams.get("q")).toBe("ada");
});

test("list() throws SdkError on non-OK response", async () => {
  const fetchImpl = asSdkFetch(async () => new Response("nope", { status: 403 }));
  const client = createClient({ baseUrl: "https://helm.test", fetch: fetchImpl });

  await expect(client.user.members.list()).rejects.toBeInstanceOf(SdkError);
});

test("list() throws SdkParseError on invalid response shape", async () => {
  const { fetchImpl } = createFetch(() => ({
    body: { rows: [{ id: "member-1" }], nextCursor: null },
  }));
  const client = createClient({ baseUrl: "https://helm.test", fetch: fetchImpl });

  await expect(client.user.members.list()).rejects.toBeInstanceOf(SdkParseError);
});
