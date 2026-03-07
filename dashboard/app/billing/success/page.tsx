"use client";

import Link from "next/link";

export default function BillingSuccessPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
          Paiement confirmé
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
          Crédit mis à jour. Votre compte entreprise a été rechargé.
        </p>
        <Link
          href="/"
          className="inline-block rounded-lg bg-zinc-900 dark:bg-zinc-100 px-6 py-2.5 text-sm font-medium text-white dark:text-zinc-900 hover:opacity-90"
        >
          Retour au tableau de bord
        </Link>
      </div>
    </div>
  );
}
