"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { type CampaignTargeting } from "@/src/lib/mockData";
import {
  createCampaign,
  computeCostPerResponseCents,
} from "@/src/lib/supabaseCampaigns";
import { getCurrentOrgId, getOrgBalance } from "@/src/lib/supabase";
import {
  CAMPAIGN_TEMPLATES,
  templateKeyToLegacyTemplate,
  type CampaignTemplatePreset,
} from "@/src/lib/campaignTemplates";

const REGIONS = [
  "Île-de-France",
  "Provence-Alpes-Côte d'Azur",
  "Auvergne-Rhône-Alpes",
  "Occitanie",
  "Toutes",
];
const TAGS = ["Tech", "Mode", "Alimentation", "Sport", "Voyage", "Culture", "Santé", "Finance"];

function applyPreset(preset: CampaignTemplatePreset) {
  return {
    question: preset.defaultQuestion,
    optionsText: preset.defaultOptions.join("\n"),
    quota: preset.defaultQuota,
    rewardUser: preset.defaultRewardCents / 100,
  };
}

export default function NewCampaignPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<CampaignTemplatePreset | null>(null);
  const [question, setQuestion] = useState("");
  const [optionsText, setOptionsText] = useState("");
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(65);
  const [regions, setRegions] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [quota, setQuota] = useState(100);
  const [rewardUser, setRewardUser] = useState(0.2);
  const [questionError, setQuestionError] = useState("");
  const [submitError, setSubmitError] = useState<"insufficient_org_credit" | "creation_failed" | null>(null);
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null);
  const [orgCreditCents, setOrgCreditCents] = useState<number | null>(null);
  const [publishNow, setPublishNow] = useState(true);

  const rewardCents = Math.round(rewardUser * 100);
  const costPerResponseCents = computeCostPerResponseCents(rewardCents);
  const totalCostCents = quota * costPerResponseCents;
  const costPerResponseEur = costPerResponseCents / 100;
  const totalCostEur = totalCostCents / 100;
  const creditInsufficient =
    orgCreditCents !== null && totalCostCents > orgCreditCents;

  useEffect(() => {
    getCurrentOrgId().then((id) => {
      if (id) getOrgBalance(id).then((b) => setOrgCreditCents(b?.available_cents ?? null));
    });
  }, []);

  const handleSelectTemplate = useCallback((preset: CampaignTemplatePreset) => {
    setSelectedPreset(preset);
    const { question: q, optionsText: opt, quota: qu, rewardUser: ru } = applyPreset(preset);
    setQuestion(q);
    setOptionsText(opt);
    setQuota(qu);
    setRewardUser(ru);
  }, []);

  const handleResetTemplate = useCallback(() => {
    if (selectedPreset) {
      const { question: q, optionsText: opt, quota: qu, rewardUser: ru } = applyPreset(selectedPreset);
      setQuestion(q);
      setOptionsText(opt);
      setQuota(qu);
      setRewardUser(ru);
    }
  }, [selectedPreset]);

  const toggleRegion = (r: string) => {
    if (r === "Toutes") {
      setRegions(regions.length === REGIONS.length - 1 ? [] : REGIONS.filter((x) => x !== "Toutes"));
    } else {
      setRegions((prev) =>
        prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
      );
    }
  };
  const toggleTag = (t: string) => {
    setTags((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuestionError("");
    setSubmitError(null);
    setSubmitErrorMessage(null);
    const questionTrimmed = question.trim();
    if (!questionTrimmed) {
      setQuestionError("La question est obligatoire.");
      return;
    }
    const options = optionsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const targeting: CampaignTargeting & { responseType?: string } = {
      ageMin,
      ageMax,
      regions: regions.length === 0 ? [] : regions.filter((r) => r !== "Toutes"),
      tags,
    };
    if (selectedPreset?.responseType === "nps") {
      targeting.responseType = "nps";
    }
    const legacyTemplate = selectedPreset
      ? templateKeyToLegacyTemplate(selectedPreset.key)
      : "A/B";
    const result = await createCampaign({
      name: name || "Sans titre",
      template: legacyTemplate as "A/B" | "Price test" | "Slogan" | "Concept" | "NPS",
      question: questionTrimmed,
      options: selectedPreset?.responseType === "nps" ? [] : options.length ? options : ["Oui", "Non"],
      targeting,
      quota,
      rewardUser,
      templateKey: selectedPreset?.key ?? null,
      templateVersion: 1,
      publishNow,
    });
    if ("error" in result) {
      if (result.error === "insufficient_org_credit") {
        setSubmitError("insufficient_org_credit");
      } else {
        setSubmitError("creation_failed");
        setSubmitErrorMessage(result.message ?? null);
      }
      return;
    }
    router.push(`/campaigns/${result.campaign.id}`);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center gap-4">
          <Link
            href="/"
            className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            ← Retour
          </Link>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            Nouvelle campagne — Créer en 15 secondes
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Choisir un template
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {CAMPAIGN_TEMPLATES.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => handleSelectTemplate(preset)}
                  className={`rounded-xl border p-4 text-left transition ${
                    selectedPreset?.key === preset.key
                      ? "border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                      : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 hover:border-zinc-400 dark:hover:border-zinc-600"
                  }`}
                >
                  <span className="font-medium block">{preset.name}</span>
                  <span className={`text-xs mt-1 block ${selectedPreset?.key === preset.key ? "opacity-90" : "text-zinc-500 dark:text-zinc-400"}`}>
                    {preset.description}
                  </span>
                </button>
              ))}
            </div>
            {selectedPreset && (
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetTemplate}
                  className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 underline"
                >
                  Réinitialiser
                </button>
                <span className="text-zinc-400 dark:text-zinc-500">— valeurs du template {selectedPreset.name}</span>
              </div>
            )}
          </div>

          {selectedPreset && selectedPreset.tips.length > 0 && (
            <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-4">
              <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">Conseils</h3>
              <ul className="list-disc list-inside text-sm text-blue-800 dark:text-blue-300 space-y-1">
                {selectedPreset.tips.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Nom de la campagne
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-100"
              placeholder="Ex: Test prix produit X"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Question <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={question}
              onChange={(e) => { setQuestion(e.target.value); setQuestionError(""); }}
              className={`w-full rounded-lg border bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-100 ${
                questionError ? "border-red-500" : "border-zinc-300 dark:border-zinc-600"
              }`}
              placeholder="Ex: Quelle option préférez-vous ?"
            />
            {questionError && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{questionError}</p>
            )}
          </div>

          {selectedPreset?.responseType !== "nps" && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Options (une par ligne)
              </label>
              <textarea
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-100"
                placeholder="Option 1&#10;Option 2&#10;Option 3"
              />
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
              Ciblage
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Âge min</label>
                <input
                  type="number"
                  min={18}
                  max={99}
                  value={ageMin}
                  onChange={(e) => setAgeMin(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Âge max</label>
                <input
                  type="number"
                  min={18}
                  max={99}
                  value={ageMax}
                  onChange={(e) => setAgeMax(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2"
                />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-xs text-zinc-500">Régions</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {REGIONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => toggleRegion(r)}
                    className={`rounded-full px-3 py-1 text-sm ${
                      regions.includes(r) || (r === "Toutes" && regions.length === REGIONS.length - 1)
                        ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                        : "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3">
              <span className="text-xs text-zinc-500">Tags</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {TAGS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTag(t)}
                    className={`rounded-full px-3 py-1 text-sm ${
                      tags.includes(t)
                        ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                        : "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Quota (réponses)
              </label>
              <input
                type="number"
                min={1}
                value={quota}
                onChange={(e) => setQuota(Number(e.target.value))}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Récompense utilisateur (€)
              </label>
              <input
                type="number"
                step={0.05}
                min={0.05}
                value={rewardUser}
                onChange={(e) => setRewardUser(Number(e.target.value))}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={publishNow}
                onChange={(e) => setPublishNow(e.target.checked)}
                className="rounded border-zinc-300 dark:border-zinc-600"
              />
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Publier maintenant
              </span>
            </label>
          </div>

          <div className="rounded-xl bg-zinc-100 dark:bg-zinc-800/50 p-4 space-y-1">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Récompense user : <strong>{rewardUser.toFixed(2)} €</strong>
            </p>
            {publishNow ? (
              <>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Coût facturé : <strong>{costPerResponseEur.toFixed(2)} €</strong> / réponse
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Total estimé : <strong>{totalCostEur.toFixed(2)} €</strong>
                </p>
                {creditInsufficient && (
                  <p className="text-sm text-amber-700 dark:text-amber-400 mt-2">
                    Votre crédit est insuffisant pour cette campagne. Rechargez votre compte (bouton « Recharger (DEV) » en haut).
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Coût appliqué à la publication.
              </p>
            )}
          </div>

          {submitError === "insufficient_org_credit" && (
            <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                Crédit insuffisant. Rechargez votre compte entreprise.
              </p>
              <Link
                href="/"
                className="inline-block mt-2 text-sm text-red-700 dark:text-red-300 underline hover:no-underline"
              >
                Recharger (DEV)
              </Link>
            </div>
          )}
          {submitError === "creation_failed" && (
            <div>
              <p className="text-sm text-red-600 dark:text-red-400">
                Création impossible.
              </p>
              {process.env.NODE_ENV === "development" && submitErrorMessage && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-mono">
                  {submitErrorMessage}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 dark:bg-zinc-100 px-6 py-2.5 text-sm font-medium text-white dark:text-zinc-900 hover:opacity-90"
            >
              Créer
            </button>
            <Link
              href="/"
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-6 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Annuler
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
