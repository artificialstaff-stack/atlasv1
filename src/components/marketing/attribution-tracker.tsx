"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  extractAttribution,
  hasTrackingParams,
  mergeAttribution,
  readStoredAttribution,
  writeStoredAttribution,
} from "@/lib/marketing-attribution";

export function MarketingAttributionTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (!hasTrackingParams(params)) {
      return;
    }

    const existing = readStoredAttribution(window.localStorage);
    const incoming = extractAttribution(params, pathname, document.referrer);

    writeStoredAttribution(
      window.localStorage,
      mergeAttribution(existing, incoming),
    );
  }, [pathname, searchParams]);

  return null;
}
