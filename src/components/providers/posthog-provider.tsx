"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";

export function PostHogProvider({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      person_profiles: "identified_only",
      ip: false,
      capture_pageview: true,
      session_recording: { maskAllInputs: true },
      loaded(ph) {
        ph.identify(userId);
      },
    });
  }, [userId]);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
