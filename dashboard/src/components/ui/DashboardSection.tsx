"use client";

import { dash } from "@/src/lib/dashboardTheme";

export function DashboardSection({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <h2 className={dash.sectionTitle}>{title}</h2>
      {subtitle && <p className={dash.sectionSubtitle}>{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}
