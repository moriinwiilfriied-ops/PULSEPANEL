/**
 * Affiché lorsque l’utilisateur est authentifié mais n’a aucune organisation.
 * Le middleware redirige ici si org_members est vide pour ce user.
 */

import Link from "next/link";
import { noAccess as copy } from "@/src/lib/uiCopy";

export default function NoAccessPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
          {copy.title}
        </h1>
        <p className="text-zinc-600 dark:text-zinc-300 mb-4">
          Votre compte est bien connecté, mais aucun accès à une organisation
          n’est configuré pour le moment.
        </p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
          Pour obtenir un accès au dashboard entreprise, contactez
          l’administrateur ou le support pilot. Le lien entre votre compte et
          une organisation doit être effectué côté administration.
        </p>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            {copy.action}
          </Link>
        </div>
      </div>
    </div>
  );
}
