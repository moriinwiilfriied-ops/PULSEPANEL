"use client";

import { dash } from "@/src/lib/dashboardTheme";

export function MetricCard({
  label,
  value,
  featured = false,
  className = "",
}: {
  label: string;
  value: React.ReactNode;
  featured?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`${dash.card} ${className} ${featured ? "md:col-span-2" : ""}`}
    >
      <p className={dash.metricLabel}>{label}</p>
      <p
        className={`${featured ? "text-2xl md:text-3xl" : dash.metricValue} mt-1`}
      >
        {value}
      </p>
    </div>
  );
}
