"use client";

import type { ClientPageHeroProps } from "@/lib/customer-portal/types";
import {
  AtlasHeroBoard,
  type AtlasPageHeroVM,
  type AtlasWidgetTone,
} from "@/components/portal/atlas-widget-kit";

interface PortalPageHeroProps extends ClientPageHeroProps {
  metrics?: Array<{ label: string; value: string }>;
  children?: React.ReactNode;
  className?: string;
}

const SURFACE_MAP: Record<NonNullable<ClientPageHeroProps["surfaceVariant"]>, "hero" | "secondary" | "list" | "locked"> = {
  hero: "hero",
  secondary: "secondary",
  list: "list",
  locked: "locked",
};

const TONE_MAP: Record<NonNullable<ClientPageHeroProps["surfaceVariant"]>, AtlasWidgetTone> = {
  hero: "primary",
  secondary: "neutral",
  list: "cobalt",
  locked: "warning",
};

function toAction(action: ClientPageHeroProps["primaryAction"]): AtlasPageHeroVM["primaryAction"] {
  if (!action) return undefined;
  return {
    label: action.label,
    href: action.href,
    variant: action.emphasis === "secondary" ? "outline" : "default",
  };
}

export function PortalPageHero({
  eyebrow,
  title,
  description,
  surfaceVariant = "secondary",
  badges,
  primaryAction,
  secondaryAction,
  metrics,
  children,
  className,
}: PortalPageHeroProps) {
  return (
    <AtlasHeroBoard
      eyebrow={eyebrow}
      title={title}
      description={description}
      badges={badges}
      metrics={metrics}
      primaryAction={toAction(primaryAction)}
      secondaryAction={toAction(secondaryAction)}
      tone={TONE_MAP[surfaceVariant]}
      surface={SURFACE_MAP[surfaceVariant]}
      className={className}
    >
      {children}
    </AtlasHeroBoard>
  );
}
