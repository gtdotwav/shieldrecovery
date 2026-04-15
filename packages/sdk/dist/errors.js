export class PagRecoveryError extends Error {
    status;
    code;
    body;
    constructor(status, code, message, body) {
        super(message);
        this.name = "PagRecoveryError";
        this.status = status;
        this.code = code;
        this.body = body;
    }
}
export class AuthenticationError extends PagRecoveryError {
    constructor(message = "Invalid API key.") {
        super(401, "UNAUTHORIZED", message);
        this.name = "AuthenticationError";
    }
}
export class ForbiddenError extends PagRecoveryError {
    constructor(message = "Forbidden.") {
        super(403, "FORBIDDEN", message);
        this.name = "ForbiddenError";
    }
}
export class NotFoundError extends PagRecoveryError {
    constructor(message = "Resource not found.") {
        super(404, "NOT_FOUND", message);
        this.name = "NotFoundError";
    }
}
export class RateLimitError extends PagRecoveryError {
    constructor(message = "Rate limit exceeded.") {
        super(429, "RATE_LIMITED", message);
        this.name = "RateLimitError";
    }
}
export class ValidationError extends PagRecoveryError {
    constructor(message) {
        super(400, "BAD_REQUEST", message);
        this.name = "ValidationError";
    }
}
//# sourceMappingURL=errors.js.map