"use client";

import { ReactNode } from "react";
import { AgentActionCard } from "./agent-action-card";
import { StatCard } from "@/components/shared/stat-card";
import { MetricChart } from "@/components/shared/metric-chart";
import { StatusTransition } from "@/components/shared/status-transition";

/**
 * Generative UI Renderer — AI agent çıktılarını render eder
 * CopilotKit render fonksiyonları için kullanılır
 */

type ComponentType =
  | "stat-card"
  | "chart"
  | "status-badge"
  | "action-card"
  | "text";

interface GenerativeBlock {
  type: ComponentType;
  props: Record<string, unknown>;
}

export function renderGenerativeUI(blocks: GenerativeBlock[]): ReactNode[] {
  return blocks.map((block, i) => {
    switch (block.type) {
      case "stat-card":
        return (
          <StatCard
            key={i}
            title={block.props.title as string}
            value={block.props.value as number}
            format={block.props.format as "number" | "currency" | "percent"}
            trend={block.props.trend as number | undefined}
          />
        );

      case "chart":
        return (
          <MetricChart
            key={i}
            data={block.props.data as Record<string, unknown>[]}
            type={block.props.type as "area" | "bar" | "line"}
            dataKeys={block.props.dataKeys as string[]}
            title={block.props.title as string}
            height={200}
          />
        );

      case "status-badge":
        return (
          <StatusTransition
            key={i}
            status={block.props.status as "pending" | "in_progress" | "approved" | "rejected" | "crisis"}
            label={block.props.label as string}
          />
        );

      case "action-card":
        return (
          <AgentActionCard
            key={i}
            title={block.props.title as string}
            description={block.props.description as string}
            status={block.props.status as "pending" | "running" | "completed" | "failed"}
            agentName={block.props.agentName as string}
          />
        );

      case "text":
      default:
        return (
          <p key={i} className="text-sm text-foreground">
            {block.props.content as string}
          </p>
        );
    }
  });
}
