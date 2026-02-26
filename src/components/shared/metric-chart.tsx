"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";

// ─── Chart Renk Paleti (CSS değişkenlerinden) ───
const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

interface MetricChartProps {
  data: Record<string, unknown>[];
  type?: "area" | "bar" | "line";
  dataKeys: string[];
  xAxisKey?: string;
  height?: number;
  className?: string;
  title?: string;
  showLegend?: boolean;
  showGrid?: boolean;
}

export function MetricChart({
  data,
  type = "area",
  dataKeys,
  xAxisKey = "name",
  height = 280,
  className,
  title,
  showLegend = false,
  showGrid = true,
}: MetricChartProps) {
  const commonProps = {
    data,
    margin: { top: 5, right: 10, left: -10, bottom: 0 },
  };

  const axisStyle = {
    fontSize: 11,
    fill: "var(--muted-foreground)",
    fontFamily: "var(--font-geist-sans)",
  };

  const gridProps = showGrid
    ? {
        strokeDasharray: "3 3",
        stroke: "var(--border)",
        opacity: 0.4,
      }
    : undefined;

  const tooltipStyle = {
    contentStyle: {
      background: "var(--popover)",
      border: "1px solid var(--border)",
      borderRadius: "8px",
      fontSize: 12,
      color: "var(--popover-foreground)",
    },
  };

  const renderChart = () => {
    if (type === "bar") {
      return (
        <BarChart {...commonProps}>
          {gridProps && <CartesianGrid {...gridProps} />}
          <XAxis dataKey={xAxisKey} tick={axisStyle} axisLine={false} tickLine={false} />
          <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
          <Tooltip {...tooltipStyle} />
          {showLegend && <Legend />}
          {dataKeys.map((key, i) => (
            <Bar
              key={key}
              dataKey={key}
              fill={CHART_COLORS[i % CHART_COLORS.length]}
              radius={[4, 4, 0, 0]}
              opacity={0.85}
            />
          ))}
        </BarChart>
      );
    }

    if (type === "line") {
      return (
        <LineChart {...commonProps}>
          {gridProps && <CartesianGrid {...gridProps} />}
          <XAxis dataKey={xAxisKey} tick={axisStyle} axisLine={false} tickLine={false} />
          <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
          <Tooltip {...tooltipStyle} />
          {showLegend && <Legend />}
          {dataKeys.map((key, i) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={CHART_COLORS[i % CHART_COLORS.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      );
    }

    // area (default)
    return (
      <AreaChart {...commonProps}>
        {gridProps && <CartesianGrid {...gridProps} />}
        <XAxis dataKey={xAxisKey} tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
        <Tooltip {...tooltipStyle} />
        {showLegend && <Legend />}
        {dataKeys.map((key, i) => (
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            stroke={CHART_COLORS[i % CHART_COLORS.length]}
            fill={CHART_COLORS[i % CHART_COLORS.length]}
            fillOpacity={0.15}
            strokeWidth={2}
          />
        ))}
      </AreaChart>
    );
  };

  return (
    <div className={cn("w-full", className)}>
      {title && (
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
          {title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
}
