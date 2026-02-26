"use client";

import { motion } from "framer-motion";

interface MiniBarChartProps {
  data: { label: string; value: number; color?: string }[];
  height?: number;
}

/**
 * SVG-tabanlı mini bar chart — dependency yok
 * Dashboard KPI'ları için hafif görselleştirme
 */
export function MiniBarChart({ data, height = 120 }: MiniBarChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const barWidth = Math.min(40, Math.floor(200 / data.length) - 4);
  const totalWidth = data.length * (barWidth + 4);

  return (
    <div className="flex items-end justify-center gap-1" style={{ height }}>
      {data.map((item, i) => {
        const barHeight = (item.value / maxValue) * (height - 24);
        return (
          <div key={item.label} className="flex flex-col items-center gap-1">
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: barHeight, opacity: 1 }}
              transition={{ duration: 0.5, delay: i * 0.05, ease: "easeOut" }}
              className="rounded-t-sm min-w-[16px]"
              style={{
                width: barWidth,
                backgroundColor: item.color ?? "hsl(var(--primary))",
              }}
            />
            <span className="text-[9px] text-muted-foreground truncate max-w-[36px]">
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

interface MiniDonutProps {
  value: number;
  max: number;
  label: string;
  color?: string;
  size?: number;
}

/**
 * SVG donut chart — tek metrik görselleştirme
 */
export function MiniDonut({
  value,
  max,
  label,
  color = "hsl(var(--primary))",
  size = 80,
}: MiniDonutProps) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={4}
          />
          {/* Value circle */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold tabular-nums">{Math.round(percentage)}%</span>
        </div>
      </div>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
}

/**
 * SVG sparkline — trend çizgisi
 */
export function Sparkline({
  data,
  color = "hsl(var(--primary))",
  height = 32,
  width = 100,
}: SparklineProps) {
  if (data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const padding = 2;

  const points = data
    .map((v, i) => {
      const x = padding + (i / (data.length - 1)) * (width - padding * 2);
      const y = padding + (1 - (v - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible">
      <motion.polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
    </svg>
  );
}
