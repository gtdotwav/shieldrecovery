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
export declare function verifyWebhookSignature(input: {
    secret: string;
    signature: string;
    timestamp: string | number;
    rawBody: string;
    toleranceSeconds?: number;
}): boolean;
/**
 * Compute a webhook signature for testing purposes.
 */
export declare function computeWebhookSignature(input: {
    secret: string;
    timestamp: number;
    rawBody: string;
}): string;
//# sourceMappingURL=webhooks.d.ts.map