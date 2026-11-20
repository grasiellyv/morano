import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  debug: false,
  replaysOnErrorSampleRate: 0,
  replaysSessionSampleRate: 0,
  beforeSend(event) {
    if (event.request?.data) delete event.request.data;
    if (event.user) {
      delete event.user.email;
      delete (event.user as Record<string, unknown>).full_name;
    }
    return event;
  },
});
