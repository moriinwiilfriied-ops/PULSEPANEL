import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

function LoginFallback() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm animate-pulse">
        <div className="h-7 bg-zinc-200 dark:bg-zinc-700 rounded w-3/4 mb-2" />
        <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-full mb-6" />
        <div className="h-10 bg-zinc-200 dark:bg-zinc-700 rounded w-full mb-4" />
        <div className="h-10 bg-zinc-200 dark:bg-zinc-700 rounded w-full" />
      </div>
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
