import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    // Only capture warnings/errors automatically; rely on logger.error to capture domain events.
    enabled: true,
    sendDefaultPii: false,
    beforeSend(event, hint) {
      // Strip likely-PII fields if they slipped into context.
      if (event.request?.cookies) delete event.request.cookies;
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      const error = hint.originalException;
      if (error instanceof Error && error.message.includes("aborted")) {
        // Ignore intentional aborts (timeouts).
        return null;
      }
      return event;
    },
  });
}
