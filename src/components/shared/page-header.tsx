"use client";

import { ReactNode } from "react";
import { AtlasHeroBoard } from "@/components/portal/atlas-widget-kit";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  children,
  className,
}: PageHeaderProps) {
  return (
    <AtlasHeroBoard
      eyebrow="Admin Surface"
      title={title}
      description={description ?? ""}
      tone="cobalt"
      surface="secondary"
      className={className}
    >
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </AtlasHeroBoard>
  );
}
