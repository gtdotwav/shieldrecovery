import {
  PagRecoveryError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  ValidationError,
} from "./errors.js";

export type RequestOptions = {
  method?: string;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  timeout?: number;
};

export class HttpClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly maxRetries: number;

  constructor(config: {
    apiKey: string;
    baseUrl: string;
    timeout: number;
    maxRetries: number;
  }) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.timeout = config.timeout;
    this.maxRetries = config.maxRetries;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = this.buildUrl(path, options.params);
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options.headers,
    };

    const init: RequestInit = {
      method: options.method ?? "GET",
      headers,
    };

    if (options.body !== undefined) {
      init.body = JSON.stringify(options.body);
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          options.timeout ?? this.timeout,
        );

        const response = await fetch(url, { ...init, signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
          const contentType = response.headers.get("content-type") ?? "";
          if (contentType.includes("application/json")) {
            return (await response.json()) as T;
          }
          return (await response.text()) as unknown as T;
        }

        // Parse error response
        let errorBody: unknown;
        try {
          errorBody = await response.json();
        } catch {
          errorBody = await response.text().catch(() => "Unknown error");
        }

        const errorMessage = extractErrorMessage(errorBody, response.statusText);

        // Don't retry client errors (except 429)
        if (response.status < 500 && response.status !== 429) {
          throw mapStatusToError(response.status, errorMessage, errorBody);
        }

        // Retry on 429 and 5xx
        if (attempt < this.maxRetries) {
          const delay = response.status === 429
            ? Math.min(2000 * (attempt + 1), 10000)
            : Math.min(1000 * Math.pow(2, attempt), 8000);
          await sleep(delay);
          lastError = mapStatusToError(response.status, errorMessage, errorBody);
          continue;
        }

        throw mapStatusToError(response.status, errorMessage, errorBody);
      } catch (err) {
        if (err instanceof PagRecoveryError) throw err;

        lastError = err instanceof Error ? err : new Error(String(err));

        if (attempt < this.maxRetries) {
          await sleep(Math.min(1000 * Math.pow(2, attempt), 8000));
          continue;
        }
      }
    }

    throw lastError ?? new PagRecoveryError(0, "NETWORK_ERROR", "Request failed after retries.");
  }

  async get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>(path, { method: "GET", params });
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: "POST", body });
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: "PUT", body });
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: "PATCH", body });
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: "DELETE" });
  }

  private buildUrl(
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): string {
    const url = new URL(`${this.baseUrl}${path}`);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    return url.toString();
  }
}

function extractErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object") {
    const obj = body as Record<string, unknown>;
    if (typeof obj.error === "string") return obj.error;
    if (obj.error && typeof obj.error === "object") {
      const err = obj.error as Record<string, unknown>;
      if (typeof err.message === "string") return err.message;
    }
    if (typeof obj.message === "string") return obj.message;
  }
  if (typeof body === "string") return body;
  return fallback;
}

function mapStatusToError(
  status: number,
  message: string,
  body?: unknown,
): PagRecoveryError {
  switch (status) {
    case 400:
      return new ValidationError(message);
    case 401:
      return new AuthenticationError(message);
    case 403:
      return new ForbiddenError(message);
    case 404:
      return new NotFoundError(message);
    case 429:
      return new RateLimitError(message);
    default:
      return new PagRecoveryError(status, deriveCode(status), message, body);
  }
}

function deriveCode(status: number): string {
  if (status >= 500) return "INTERNAL_ERROR";
  return "ERROR";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
