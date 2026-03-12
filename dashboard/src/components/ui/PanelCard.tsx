"use client";

import { dash } from "@/src/lib/dashboardTheme";

export function PanelCard({
  children,
  hover = false,
  className = "",
}: {
  children: React.ReactNode;
  hover?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`${dash.card} ${hover ? dash.cardHover : ""} ${className}`}
    >
      {children}
    </div>
  );
}
