import { SdkError, SdkParseError } from "./errors";
import { USER_ROUTES } from "./modules/user/user.routes";
import { HelmUserSchema } from "./modules/user/user.schemas";
import type { HelmUser } from "./modules/user/user.types";

export interface SdkConfig {
  /**
   * Base URL of the Helm API.
   * Never read from env directly — always passed in by the consumer.
   *
   * Next.js server: process.env.HELM_API_URL
   * Next.js client: process.env.NEXT_PUBLIC_HELM_API_URL
   * Expo: process.env.EXPO_PUBLIC_HELM_API_URL
   */
  baseUrl: string;

  /**
   * Returns the current Keycloak Bearer access token, or null if unauthenticated.
   * Can be async. The SDK never handles login, logout, or token refresh.
   */
  getToken?: () => string | null | Promise<string | null>;

  /**
   * Custom fetch implementation. Defaults to globalThis.fetch.
   * In RN/Expo: pass `fetch` from `react-native-nitro-fetch`.
   */
  fetch?: typeof fetch;
}

export function createClient(config: SdkConfig) {
  const fetchImpl = config.fetch ?? fetch;

  async function request<T>(
    endpoint: string,
    schema: { parse: (data: unknown) => T }
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (config.getToken) {
      const token = await config.getToken();
      if (token !== null && token !== undefined) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    const response = await fetchImpl(`${config.baseUrl}${endpoint}`, {
      headers,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new SdkError(response.status, body, endpoint);
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch (err) {
      throw new SdkParseError(endpoint, err);
    }

    try {
      return schema.parse(json);
    } catch (err) {
      throw new SdkParseError(endpoint, err);
    }
  }

  return {
    user: {
      me: (): Promise<HelmUser> => request(USER_ROUTES.me, HelmUserSchema),
    },
  };
}
