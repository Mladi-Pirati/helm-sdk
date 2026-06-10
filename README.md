# @mp/helm-sdk

A TypeScript SDK for interacting with the Helm API.

## Installation

Add as a git dependency in your `package.json`:

```json
{
  "dependencies": {
    "@mp/helm-sdk": "git+ssh://git@github.com/mladipirati/helm-sdk.git#v0.1.0"
  }
}
```

Then install with your package manager:

```bash
bun install
# or
npm install
# or
pnpm install
```

## Usage in Next.js (Auth.js v5 + Keycloak provider)

First, configure Auth.js to surface the Keycloak access token:

```ts
// auth.ts
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Keycloak({ ... })],
  callbacks: {
    async jwt({ token, account }) {
      if (account) token.accessToken = account.access_token;
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined;
      return session;
    },
  },
});
```

Note: You must augment `next-auth`'s `Session` and `JWT` types to include `accessToken`.

Create the SDK client in server and client contexts:

**Server component or route handler:**

```ts
const session = await auth();
const helm = createClient({
  baseUrl: process.env.HELM_API_URL!,
  getToken: () => session?.accessToken ?? null,
});
```

**Client component:**

```ts
const { data: session } = useSession();
const helm = createClient({
  baseUrl: process.env.NEXT_PUBLIC_HELM_API_URL!,
  getToken: () => session?.accessToken ?? null,
});
```

## Usage in React Native / Expo (expo-auth-session)

After the PKCE flow completes, persist the token with `expo-secure-store`:

```ts
import * as SecureStore from "expo-secure-store";
import { fetch as nitroFetch } from "react-native-nitro-fetch";

const helm = createClient({
  baseUrl: process.env.EXPO_PUBLIC_HELM_API_URL!,
  getToken: () => SecureStore.getItemAsync("keycloak_access_token"),
  fetch: nitroFetch, // optional — requires RN 0.75+, New Arch, and a dev build (not Expo Go)
});
```

Note: `react-native-nitro-fetch` must be installed in the consuming app, not in this SDK.

## Error handling

```ts
import { SdkError, SdkParseError } from "@mp/helm-sdk";

try {
  const me = await helm.user.me();
} catch (err) {
  if (err instanceof SdkError) {
    // err.status, err.body, err.endpoint
  } else if (err instanceof SdkParseError) {
    // API returned unexpected shape — err.cause contains the ZodError
  }
}
```

## Environment setup

The SDK never reads environment variables. The `baseUrl` is always passed explicitly by the consumer.

## Building

```bash
bun run build
```

## Adding endpoints

For each new endpoint, create files under `src/modules/<module>/` following the three-file pattern:

- `routes.ts` — HTTP route definitions
- `schemas.ts` — Zod validation schemas
- `types.ts` — TypeScript type exports

Add the corresponding method to `client.ts` and re-export from `index.ts`.
