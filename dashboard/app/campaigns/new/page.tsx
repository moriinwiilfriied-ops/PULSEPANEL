"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  calcPricePerResponse,
  type CampaignTemplate,
  type CampaignTargeting,
} from "@/src/lib/mockData";
import { createCampaign } from "@/src/lib/supabaseCampaigns";

const TEMPLATES: { value: CampaignTemplate; label: string }[] = [
  { value: "A/B", label: "A/B" },
  { value: "Price test", label: "Price test" },
  { value: "Slogan", label: "Slogan" },
];

const REGIONS = [
  "Île-de-France",
  "Provence-Alpes-Côte d'Azur",
  "Auvergne-Rhône-Alpes",
  "Occitanie",
  "Toutes",
];
const TAGS = ["Tech", "Mode", "Alimentation", "Sport", "Voyage", "Culture", "Santé", "Finance"];

export default function NewCampaignPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [template, setTemplate] = useState<CampaignTemplate>("A/B");
  const [question, setQuestion] = useState("");
  const [optionsText, setOptionsText] = useState("");
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(65);
  const [regions, setRegions] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [quota, setQuota] = useState(100);
  const [rewardUser, setRewardUser] = useState(0.2);
  const [questionError, setQuestionError] = useState("");

  const pricePerResponse = calcPricePerResponse(rewardUser);
  const total = Math.round(quota * pricePerResponse * 100) / 100;

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
    const questionTrimmed = question.trim();
    if (!questionTrimmed) {
      setQuestionError("La question est obligatoire.");
      return;
    }
    const options = optionsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const targeting: CampaignTargeting = {
      ageMin,
      ageMax,
      regions: regions.length === 0 ? [] : regions.filter((r) => r !== "Toutes"),
      tags,
    };
    const campaign = await createCampaign({
      name: name || "Sans titre",
      template,
      question: questionTrimmed,
      options: options.length ? options : ["Oui", "Non"],
      targeting,
      quota,
      rewardUser,
    });
    router.push(`/campaigns/${campaign.id}`);
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
            Nouvelle campagne
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
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
              Template
            </label>
            <div className="flex gap-2 flex-wrap">
              {TEMPLATES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTemplate(t.value)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                    template === t.value
                      ? "border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                      : "border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
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

          <div className="rounded-xl bg-zinc-100 dark:bg-zinc-800/50 p-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Prix par réponse (mock) : <strong>{pricePerResponse.toFixed(2)} €</strong>
              {" "}(reward × 1.7 + 0.35)
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              Total estimé : <strong>{total.toFixed(2)} €</strong>
            </p>
          </div>

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
