export type RequestOptions = {
    method?: string;
    body?: unknown;
    params?: Record<string, string | number | boolean | undefined>;
    headers?: Record<string, string>;
    timeout?: number;
};
export declare class HttpClient {
    private readonly apiKey;
    private readonly baseUrl;
    private readonly timeout;
    private readonly maxRetries;
    constructor(config: {
        apiKey: string;
        baseUrl: string;
        timeout: number;
        maxRetries: number;
    });
    request<T>(path: string, options?: RequestOptions): Promise<T>;
    get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T>;
    post<T>(path: string, body?: unknown): Promise<T>;
    put<T>(path: string, body?: unknown): Promise<T>;
    patch<T>(path: string, body?: unknown): Promise<T>;
    delete<T>(path: string): Promise<T>;
    private buildUrl;
}
//# sourceMappingURL=client.d.ts.map