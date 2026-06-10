export class SdkError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
    public readonly endpoint: string
  ) {
    super(`[HelmSDK] ${status} on ${endpoint}: ${body}`);
    this.name = "SdkError";
  }
}

export class SdkParseError extends Error {
  constructor(
    public readonly endpoint: string,
    public readonly cause: unknown
  ) {
    super(`[HelmSDK] Response parse failed on ${endpoint}`, { cause });
    this.name = "SdkParseError";
  }
}
