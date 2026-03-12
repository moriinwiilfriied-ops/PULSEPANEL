"use client";

import { dash } from "@/src/lib/dashboardTheme";

type Variant = "success" | "warning" | "neutral" | "test" | "danger";

export function StatusBadge({
  children,
  variant = "neutral",
  className = "",
}: {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}) {
  const variantClass =
    variant === "success"
      ? dash.badgeSuccess
      : variant === "warning"
        ? dash.badgeWarning
        : variant === "test"
          ? dash.badgeTest
          : variant === "danger"
            ? dash.badgeDanger
            : dash.badgeNeutral;
  return <span className={`${dash.badge} ${variantClass} ${className}`}>{children}</span>;
}
