export declare class PagRecoveryError extends Error {
    readonly status: number;
    readonly code: string;
    readonly body: unknown;
    constructor(status: number, code: string, message: string, body?: unknown);
}
export declare class AuthenticationError extends PagRecoveryError {
    constructor(message?: string);
}
export declare class ForbiddenError extends PagRecoveryError {
    constructor(message?: string);
}
export declare class NotFoundError extends PagRecoveryError {
    constructor(message?: string);
}
export declare class RateLimitError extends PagRecoveryError {
    constructor(message?: string);
}
export declare class ValidationError extends PagRecoveryError {
    constructor(message: string);
}
//# sourceMappingURL=errors.d.ts.map