/**
 * Thin Sentry wrapper used by the recovery logger and route handlers.
 *
 * Centralises capture so the rest of the codebase doesn't import the SDK
 * directly. If SENTRY_DSN is unset (e.g. local dev) all calls become no-ops,
 * keeping behaviour identical to the pre-Sentry world.
 */

import * as Sentry from "@sentry/nextjs";

const enabled = Boolean(process.env.SENTRY_DSN);

export function captureException(
  error: unknown,
  context?: { tags?: Record<string, string>; extra?: Record<string, unknown> },
): void {
  if (!enabled) return;
  Sentry.withScope((scope) => {
    if (context?.tags) {
      for (const [key, value] of Object.entries(context.tags)) scope.setTag(key, value);
    }
    if (context?.extra) {
      for (const [key, value] of Object.entries(context.extra)) scope.setExtra(key, value);
    }
    if (error instanceof Error) {
      Sentry.captureException(error);
    } else {
      Sentry.captureMessage(typeof error === "string" ? error : JSON.stringify(error), "error");
    }
  });
}

export function captureMessage(
  message: string,
  level: "info" | "warning" | "error" = "info",
  context?: { tags?: Record<string, string>; extra?: Record<string, unknown> },
): void {
  if (!enabled) return;
  Sentry.withScope((scope) => {
    if (context?.tags) {
      for (const [key, value] of Object.entries(context.tags)) scope.setTag(key, value);
    }
    if (context?.extra) {
      for (const [key, value] of Object.entries(context.extra)) scope.setExtra(key, value);
    }
    Sentry.captureMessage(message, level);
  });
}

export async function withSentrySpan<T>(
  name: string,
  attributes: Record<string, string | number | boolean>,
  fn: () => Promise<T>,
): Promise<T> {
  if (!enabled) return fn();
  return Sentry.startSpan({ name, attributes }, fn);
}

export function setRequestId(requestId: string): void {
  if (!enabled) return;
  Sentry.getCurrentScope().setTag("request_id", requestId);
}

export const isSentryEnabled = enabled;
