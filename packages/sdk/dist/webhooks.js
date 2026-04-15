import { createHmac, timingSafeEqual } from "node:crypto";
/**
 * Verify a PagRecovery/Shield Gateway webhook signature.
 *
 * @example
 * ```ts
 * import { verifyWebhookSignature } from '@pagrecovery/sdk/webhooks';
 *
 * const isValid = verifyWebhookSignature({
 *   secret: process.env.WEBHOOK_SECRET!,
 *   signature: req.headers['x-signature'] as string,
 *   timestamp: req.headers['x-timestamp'] as string,
 *   rawBody: rawBodyString,
 * });
 * ```
 */
export function verifyWebhookSignature(input) {
    const { secret, signature, rawBody } = input;
    const toleranceSeconds = input.toleranceSeconds ?? 300;
    if (!signature || !secret || !rawBody)
        return false;
    // Parse timestamp
    const timestamp = typeof input.timestamp === "string"
        ? Number(input.timestamp)
        : input.timestamp;
    if (!Number.isFinite(timestamp))
        return false;
    // Check freshness
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const age = Math.abs(nowInSeconds - timestamp);
    if (age > toleranceSeconds)
        return false;
    // Compute expected signature
    const payload = `${timestamp}.${rawBody}`;
    const expected = createHmac("sha256", secret).update(payload).digest("hex");
    // Normalize provided signature (strip optional "sha256=" prefix)
    const provided = signature.startsWith("sha256=")
        ? signature.slice(7)
        : signature;
    // Timing-safe comparison
    const providedBuf = Buffer.from(provided, "hex");
    const expectedBuf = Buffer.from(expected, "hex");
    if (providedBuf.length !== expectedBuf.length)
        return false;
    return timingSafeEqual(providedBuf, expectedBuf);
}
/**
 * Compute a webhook signature for testing purposes.
 */
export function computeWebhookSignature(input) {
    const payload = `${input.timestamp}.${input.rawBody}`;
    return createHmac("sha256", input.secret).update(payload).digest("hex");
}
//# sourceMappingURL=webhooks.js.map