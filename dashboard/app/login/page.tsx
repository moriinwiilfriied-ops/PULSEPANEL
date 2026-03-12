import { Suspense } from "react";
import { LoginForm } from "./LoginForm";
import { dash } from "@/src/lib/dashboardTheme";
import { PanelCard } from "@/src/components/ui/PanelCard";

function LoginFallback() {
  return (
    <div className={`${dash.page} flex items-center justify-center px-4`}>
      <PanelCard className="w-full max-w-sm animate-pulse">
        <div className="h-7 bg-dash-surface-2 rounded w-3/4 mb-2" />
        <div className="h-4 bg-dash-surface-2 rounded w-full mb-6" />
        <div className="h-10 bg-dash-surface-2 rounded w-full mb-4" />
        <div className="h-10 bg-dash-surface-2 rounded w-full" />
      </PanelCard>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
