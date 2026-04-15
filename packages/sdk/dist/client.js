import { PagRecoveryError, AuthenticationError, ForbiddenError, NotFoundError, RateLimitError, ValidationError, } from "./errors.js";
export class HttpClient {
    apiKey;
    baseUrl;
    timeout;
    maxRetries;
    constructor(config) {
        this.apiKey = config.apiKey;
        this.baseUrl = config.baseUrl.replace(/\/+$/, "");
        this.timeout = config.timeout;
        this.maxRetries = config.maxRetries;
    }
    async request(path, options = {}) {
        const url = this.buildUrl(path, options.params);
        const headers = {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            Accept: "application/json",
            ...options.headers,
        };
        const init = {
            method: options.method ?? "GET",
            headers,
        };
        if (options.body !== undefined) {
            init.body = JSON.stringify(options.body);
        }
        let lastError = null;
        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), options.timeout ?? this.timeout);
                const response = await fetch(url, { ...init, signal: controller.signal });
                clearTimeout(timeoutId);
                if (response.ok) {
                    const contentType = response.headers.get("content-type") ?? "";
                    if (contentType.includes("application/json")) {
                        return (await response.json());
                    }
                    return (await response.text());
                }
                // Parse error response
                let errorBody;
                try {
                    errorBody = await response.json();
                }
                catch {
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
            }
            catch (err) {
                if (err instanceof PagRecoveryError)
                    throw err;
                lastError = err instanceof Error ? err : new Error(String(err));
                if (attempt < this.maxRetries) {
                    await sleep(Math.min(1000 * Math.pow(2, attempt), 8000));
                    continue;
                }
            }
        }
        throw lastError ?? new PagRecoveryError(0, "NETWORK_ERROR", "Request failed after retries.");
    }
    async get(path, params) {
        return this.request(path, { method: "GET", params });
    }
    async post(path, body) {
        return this.request(path, { method: "POST", body });
    }
    async put(path, body) {
        return this.request(path, { method: "PUT", body });
    }
    async patch(path, body) {
        return this.request(path, { method: "PATCH", body });
    }
    async delete(path) {
        return this.request(path, { method: "DELETE" });
    }
    buildUrl(path, params) {
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
function extractErrorMessage(body, fallback) {
    if (body && typeof body === "object") {
        const obj = body;
        if (typeof obj.error === "string")
            return obj.error;
        if (obj.error && typeof obj.error === "object") {
            const err = obj.error;
            if (typeof err.message === "string")
                return err.message;
        }
        if (typeof obj.message === "string")
            return obj.message;
    }
    if (typeof body === "string")
        return body;
    return fallback;
}
function mapStatusToError(status, message, body) {
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
function deriveCode(status) {
    if (status >= 500)
        return "INTERNAL_ERROR";
    return "ERROR";
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
//# sourceMappingURL=client.js.map