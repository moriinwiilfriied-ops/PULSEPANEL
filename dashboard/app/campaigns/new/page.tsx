"use client";
/* eslint-disable @next/next/no-img-element -- URLs dynamiques (upload Supabase ou saisie user), next/image nécessiterait remotePatterns multi-domaines et gestion layout */
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
import { campaignCreate as createCopy } from "@/src/lib/uiCopy";
import { dash } from "@/src/lib/dashboardTheme";
import { PanelCard } from "@/src/components/ui/PanelCard";
import type { CreativeType, CampaignMediaAsset } from "@/src/lib/mockData";
import {
  uploadCampaignMedia,
  validateMediaFile,
  validateImageFile,
} from "@/src/lib/campaignMediaUpload";

const REGIONS = [
  "Île-de-France",
  "Provence-Alpes-Côte d'Azur",
  "Auvergne-Rhône-Alpes",
  "Occitanie",
  "Toutes",
];
const TAGS = ["Tech", "Mode", "Alimentation", "Sport", "Voyage", "Culture", "Santé", "Finance"];

const CREATIVE_TYPES: { value: CreativeType; label: string }[] = [
  { value: "text", label: "Texte simple" },
  { value: "image", label: "Image" },
  { value: "video", label: "Vidéo courte" },
  { value: "comparison", label: "Comparaison A/B" },
];

const inputBase =
  "w-full rounded-xl border bg-dash-surface-2 px-4 py-2.5 text-dash-text placeholder:text-dash-text-muted focus:outline-none focus:ring-2 focus:ring-dash-accent/40 focus:border-transparent transition-[box-shadow,border-color]";
const inputError = "border-dash-danger focus:ring-dash-danger/40";
const inputNormal = "border-dash-border-subtle";

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
  const [submitError, setSubmitError] = useState<"no_org" | "insufficient_org_credit" | "creation_failed" | null>(null);
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null);
  const [orgCreditCents, setOrgCreditCents] = useState<number | null>(null);
  const [publishNow, setPublishNow] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [creativeType, setCreativeType] = useState<CreativeType>("text");
  const [mediaUrlPrimary, setMediaUrlPrimary] = useState("");
  const [mediaUrlComparisonA, setMediaUrlComparisonA] = useState("");
  const [mediaUrlComparisonB, setMediaUrlComparisonB] = useState("");
  const [mediaError, setMediaError] = useState("");
  const [uploadingPrimary, setUploadingPrimary] = useState(false);
  const [uploadingA, setUploadingA] = useState(false);
  const [uploadingB, setUploadingB] = useState(false);

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

  const handleUploadPrimary = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setMediaError("");
    const kind = creativeType === "video" ? "video" : "image";
    const validation = validateMediaFile(file, kind);
    if (!validation.ok) {
      setMediaError(validation.error ?? "Fichier invalide.");
      return;
    }
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      setMediaError("Organisation introuvable. Reconnectez-vous.");
      return;
    }
    setUploadingPrimary(true);
    const result = await uploadCampaignMedia(orgId, file);
    setUploadingPrimary(false);
    if ("error" in result) {
      setMediaError(result.error);
      return;
    }
    setMediaUrlPrimary(result.url);
  };

  const handleUploadComparisonA = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setMediaError("");
    const validation = validateImageFile(file);
    if (!validation.ok) {
      setMediaError(validation.error ?? "Fichier invalide.");
      return;
    }
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      setMediaError("Organisation introuvable. Reconnectez-vous.");
      return;
    }
    setUploadingA(true);
    const result = await uploadCampaignMedia(orgId, file);
    setUploadingA(false);
    if ("error" in result) {
      setMediaError(result.error);
      return;
    }
    setMediaUrlComparisonA(result.url);
  };

  const handleUploadComparisonB = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setMediaError("");
    const validation = validateImageFile(file);
    if (!validation.ok) {
      setMediaError(validation.error ?? "Fichier invalide.");
      return;
    }
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      setMediaError("Organisation introuvable. Reconnectez-vous.");
      return;
    }
    setUploadingB(true);
    const result = await uploadCampaignMedia(orgId, file);
    setUploadingB(false);
    if ("error" in result) {
      setMediaError(result.error);
      return;
    }
    setMediaUrlComparisonB(result.url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuestionError("");
    setMediaError("");
    setSubmitError(null);
    setSubmitErrorMessage(null);
    const questionTrimmed = question.trim();
    if (!questionTrimmed) {
      setQuestionError("La question est obligatoire.");
      return;
    }
    let mediaAssets: CampaignMediaAsset[] = [];
    if (creativeType === "image" || creativeType === "video") {
      const url = (creativeType === "image" ? mediaUrlPrimary : mediaUrlPrimary).trim();
      if (!url) {
        setMediaError(creativeType === "image" ? "URL de l’image obligatoire." : "URL de la vidéo obligatoire.");
        return;
      }
      mediaAssets = [{ type: creativeType, role: "primary", url }];
    } else if (creativeType === "comparison") {
      const a = mediaUrlComparisonA.trim();
      const b = mediaUrlComparisonB.trim();
      if (!a || !b) {
        setMediaError("Les deux URLs (A et B) sont obligatoires pour une comparaison.");
        return;
      }
      mediaAssets = [
        { type: "image", role: "comparison_a", url: a },
        { type: "image", role: "comparison_b", url: b },
      ];
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
    setSubmitting(true);
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
      creativeType: creativeType !== "text" ? creativeType : undefined,
      mediaAssets: mediaAssets.length ? mediaAssets : undefined,
    });
    setSubmitting(false);
    if ("error" in result) {
      if (result.error === "no_org") {
        setSubmitError("no_org");
        return;
      }
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

  const summaryPanel = (
    <PanelCard className="lg:sticky lg:top-6 border border-dash-border-subtle bg-dash-surface-2/95 p-6">
      <h3 className="text-sm font-semibold text-dash-text uppercase tracking-wider mb-4">Coût & récap</h3>

      {/* Total estimé — info dominante en haut */}
      <div className={`rounded-xl p-4 mb-5 ${publishNow ? "bg-dash-surface-3" : "bg-dash-surface-3/70"}`}>
        <p className="text-xs font-medium text-dash-text-muted uppercase tracking-wider">Total estimé</p>
        {publishNow ? (
          <p className="text-2xl font-bold text-dash-text tabular-nums mt-1">{totalCostEur.toFixed(2)} €</p>
        ) : (
          <p className="text-lg font-semibold text-dash-text-muted mt-1">En brouillon — pas de coût immédiat</p>
        )}
      </div>

      {/* Alerte crédit insuffisant — liée au total */}
      {creditInsufficient && publishNow && (
        <div className="rounded-xl bg-amber-500/15 border border-amber-500/30 p-4 mb-5">
          <p className="text-sm font-medium text-amber-200">Crédit insuffisant</p>
          <p className="text-xs text-dash-text-muted mt-1">
            Il manque {(totalCostCents - (orgCreditCents ?? 0)) / 100} € pour cette campagne.
          </p>
          <Link href="/" className={`inline-block mt-2 text-sm font-medium ${dash.link} text-amber-200 hover:text-amber-100`}>
            Recharger →
          </Link>
        </div>
      )}

      {/* Mini récap : quota, récompense, coût/réponse */}
      <dl className="space-y-2.5 text-sm">
        <div className="flex justify-between items-baseline">
          <dt className="text-dash-text-muted">Quota</dt>
          <dd className="font-semibold text-dash-text tabular-nums">{quota} réponses</dd>
        </div>
        <div className="flex justify-between items-baseline">
          <dt className="text-dash-text-muted">Récompense / réponse</dt>
          <dd className="font-semibold text-dash-text tabular-nums">{rewardUser.toFixed(2)} €</dd>
        </div>
        {publishNow && (
          <div className="flex justify-between items-baseline">
            <dt className="text-dash-text-muted">Coût facturé / réponse</dt>
            <dd className="font-semibold text-dash-text tabular-nums">{costPerResponseEur.toFixed(2)} €</dd>
          </div>
        )}
      </dl>

      <div className="mt-4 pt-4 border-t border-dash-border-subtle space-y-1 text-sm">
        <div className="flex justify-between items-baseline">
          <span className="text-dash-text-muted">Template</span>
          <span className="font-medium text-dash-text">{selectedPreset?.name ?? "—"}</span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-dash-text-muted">Format créa</span>
          <span className="font-medium text-dash-text">{CREATIVE_TYPES.find((t) => t.value === creativeType)?.label ?? "Texte simple"}</span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-dash-text-muted">Publication</span>
          <span className="font-medium text-dash-text">{publishNow ? "Immédiate" : "En brouillon"}</span>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-dash-border-subtle">
        <button
          type="submit"
          form="new-campaign-form"
          disabled={submitting || creditInsufficient}
          className={`w-full rounded-xl px-6 py-3.5 text-base font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${dash.btnPrimary}`}
        >
          {submitting ? "Création…" : "Créer la campagne"}
        </button>
        <Link href="/" className={`block text-center text-sm ${dash.link} mt-3`}>Annuler</Link>
      </div>
    </PanelCard>
  );

  return (
    <div className={dash.page}>
      <main className={dash.containerWide}>
        <Link href="/" className={`text-sm ${dash.link} inline-block mb-4`}>← Accueil</Link>

        {/* A. Hero de création premium */}
        <div className={`${dash.hero} mb-10 border border-dash-border-subtle/50`}>
          <h1 className={dash.headlineHero}>Nouvelle campagne</h1>
          <p className="text-dash-text-secondary mt-2 text-base max-w-xl">
            Choisissez un template, configurez le contenu et le ciblage, puis lancez votre campagne en quelques clics.
          </p>
          <p className="text-dash-text-muted text-sm mt-3">
            Créer · Cibler · Publier
          </p>
        </div>

        <form id="new-campaign-form" onSubmit={handleSubmit} className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-10">
          <div className="space-y-10">
            {/* 1. Template */}
            <section>
              <h2 className="text-lg font-semibold text-dash-text tracking-tight mb-1">1. Template</h2>
              <p className="text-sm text-dash-text-muted mb-5">Choisissez le type de campagne à créer.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {CAMPAIGN_TEMPLATES.map((preset) => {
                  const selected = selectedPreset?.key === preset.key;
                  return (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => handleSelectTemplate(preset)}
                      className={`rounded-xl p-5 text-left transition-all duration-150 border-2 ${
                        selected
                          ? "border-dash-accent bg-dash-accent/10 shadow-[var(--dash-shadow)]"
                          : "border-dash-border-subtle bg-dash-surface-2 hover:border-dash-border hover:bg-dash-surface-2/90"
                      }`}
                    >
                      <span className="font-semibold text-dash-text block">{preset.name}</span>
                      <span className={`text-xs mt-1 block ${selected ? "text-dash-text-secondary" : "text-dash-text-muted"}`}>
                        {preset.description}
                      </span>
                      {selected && (
                        <span className="inline-block mt-2 text-[10px] font-medium uppercase tracking-wider text-dash-accent">Sélectionné</span>
                      )}
                    </button>
                  );
                })}
              </div>
              {selectedPreset && (
                <div className="mt-4 flex items-center gap-2">
                  <button type="button" onClick={handleResetTemplate} className={`text-sm ${dash.link}`}>
                    Réinitialiser le template
                  </button>
                  <span className="text-dash-text-muted text-sm">— {selectedPreset.name}</span>
                </div>
              )}
            </section>

            {/* Format de créa (media-first) */}
            <section>
              <h2 className="text-lg font-semibold text-dash-text tracking-tight mb-1">2. Format de créa</h2>
              <p className="text-sm text-dash-text-muted mb-5">Choisissez comment l’utilisateur verra la campagne (texte, image, vidéo ou comparaison A/B).</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {CREATIVE_TYPES.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => { setCreativeType(value); setMediaError(""); }}
                    className={`rounded-xl px-4 py-3 text-sm font-medium border-2 transition-all ${
                      creativeType === value
                        ? "border-dash-accent bg-dash-accent/10 text-dash-text"
                        : "border-dash-border-subtle bg-dash-surface-2 text-dash-text-muted hover:border-dash-border"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </section>

            {/* Média — upload réel ou URL (affiché si pas texte) */}
            {creativeType !== "text" && (
              <section>
                <h2 className="text-lg font-semibold text-dash-text tracking-tight mb-1">3. Média</h2>
                <p className="text-sm text-dash-text-muted mb-5">Uploadez un fichier ou collez une URL (image JPEG/PNG/WebP/GIF max 10 Mo, vidéo MP4/WebM max 25 Mo).</p>
                <PanelCard className="p-6 space-y-6">
                  {(creativeType === "image" || creativeType === "video") && (
                    <>
                      <div className="flex flex-wrap gap-4 items-start">
                        <label className="cursor-pointer rounded-xl border-2 border-dash-border-subtle border-dashed bg-dash-surface-2 px-5 py-4 hover:border-dash-accent/50 hover:bg-dash-surface-2/90 transition-colors">
                          <span className="text-sm font-medium text-dash-text">
                            {uploadingPrimary ? "Upload en cours…" : creativeType === "image" ? "Choisir une image" : "Choisir une vidéo"}
                          </span>
                          <input
                            type="file"
                            accept={creativeType === "image" ? "image/jpeg,image/png,image/webp,image/gif" : "video/mp4,video/webm"}
                            className="hidden"
                            disabled={uploadingPrimary}
                            onChange={handleUploadPrimary}
                          />
                        </label>
                        <div className="flex-1 min-w-[200px]">
                          <label className="block text-sm font-medium text-dash-text mb-2">Ou URL</label>
                          <input
                            type="url"
                            value={mediaUrlPrimary}
                            onChange={(e) => { setMediaUrlPrimary(e.target.value); setMediaError(""); }}
                            className={`${inputBase} ${inputNormal}`}
                            placeholder="https://…"
                          />
                        </div>
                      </div>
                      {mediaUrlPrimary && (
                        <div className="rounded-xl overflow-hidden bg-dash-surface-3 border border-dash-border-subtle">
                          {creativeType === "image" ? (
                            <img src={mediaUrlPrimary} alt="Preview" className="w-full max-h-64 object-contain" onError={(ev) => { (ev.target as HTMLImageElement).style.display = "none"; }} />
                          ) : (
                            <video src={mediaUrlPrimary} controls className="w-full max-h-64" muted playsInline onError={(ev) => { (ev.target as HTMLVideoElement).style.display = "none"; }} />
                          )}
                          <div className="p-2 flex justify-end">
                            <button type="button" onClick={() => setMediaUrlPrimary("")} className="text-sm text-dash-text-muted hover:text-dash-danger">Supprimer</button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  {creativeType === "comparison" && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-dash-text mb-2">Visuel A</label>
                          <div className="flex flex-col gap-2">
                            <label className="cursor-pointer rounded-lg border border-dash-border-subtle border-dashed bg-dash-surface-2 px-3 py-2 text-sm hover:border-dash-accent/50">
                              {uploadingA ? "Upload…" : "Choisir fichier"}
                              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" disabled={uploadingA} onChange={handleUploadComparisonA} />
                            </label>
                            <input type="url" value={mediaUrlComparisonA} onChange={(e) => { setMediaUrlComparisonA(e.target.value); setMediaError(""); }} className={`${inputBase} ${inputNormal} text-sm`} placeholder="Ou URL" />
                          </div>
                          {mediaUrlComparisonA && (
                            <div className="mt-2 rounded-lg overflow-hidden bg-dash-surface-3">
                              <img src={mediaUrlComparisonA} alt="A" className="w-full aspect-square object-cover" onError={(ev) => { (ev.target as HTMLImageElement).style.display = "none"; }} />
                              <button type="button" onClick={() => setMediaUrlComparisonA("")} className="text-xs text-dash-text-muted hover:text-dash-danger w-full py-1">Supprimer</button>
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-dash-text mb-2">Visuel B</label>
                          <div className="flex flex-col gap-2">
                            <label className="cursor-pointer rounded-lg border border-dash-border-subtle border-dashed bg-dash-surface-2 px-3 py-2 text-sm hover:border-dash-accent/50">
                              {uploadingB ? "Upload…" : "Choisir fichier"}
                              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" disabled={uploadingB} onChange={handleUploadComparisonB} />
                            </label>
                            <input type="url" value={mediaUrlComparisonB} onChange={(e) => { setMediaUrlComparisonB(e.target.value); setMediaError(""); }} className={`${inputBase} ${inputNormal} text-sm`} placeholder="Ou URL" />
                          </div>
                          {mediaUrlComparisonB && (
                            <div className="mt-2 rounded-lg overflow-hidden bg-dash-surface-3">
                              <img src={mediaUrlComparisonB} alt="B" className="w-full aspect-square object-cover" onError={(ev) => { (ev.target as HTMLImageElement).style.display = "none"; }} />
                              <button type="button" onClick={() => setMediaUrlComparisonB("")} className="text-xs text-dash-text-muted hover:text-dash-danger w-full py-1">Supprimer</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                  {mediaError && <p className="text-sm text-dash-danger">{mediaError}</p>}
                </PanelCard>
              </section>
            )}

            {selectedPreset && selectedPreset.tips.length > 0 && (
              <PanelCard className="bg-dash-accent/10 border border-dash-accent/20 p-5">
                <h3 className="text-sm font-semibold text-dash-accent mb-2">Conseils</h3>
                <ul className="list-disc list-inside text-sm text-dash-text-secondary space-y-1">
                  {selectedPreset.tips.map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </PanelCard>
            )}

            {/* Question & réponse */}
            <section>
              <h2 className="text-lg font-semibold text-dash-text tracking-tight mb-1">{creativeType !== "text" ? "4. Question & réponse" : "3. Question & réponse"}</h2>
              <p className="text-sm text-dash-text-muted mb-5">Nom, question et options de réponse.</p>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-dash-text mb-2">Nom de la campagne</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`${inputBase} ${inputNormal}`}
                    placeholder="Ex: Test prix produit X"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dash-text mb-2">Question <span className="text-dash-danger">*</span></label>
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => { setQuestion(e.target.value); setQuestionError(""); }}
                    className={`${inputBase} ${questionError ? inputError : inputNormal}`}
                    placeholder="Ex: Quelle option préférez-vous ?"
                  />
                  {questionError && <p className="mt-1.5 text-sm text-dash-danger">{questionError}</p>}
                </div>
                {selectedPreset?.responseType !== "nps" && (
                  <div>
                    <label className="block text-sm font-medium text-dash-text mb-2">Options (une par ligne)</label>
                    <textarea
                      value={optionsText}
                      onChange={(e) => setOptionsText(e.target.value)}
                      rows={4}
                      className={`${inputBase} ${inputNormal} min-h-[100px]`}
                      placeholder="Option 1&#10;Option 2&#10;Option 3"
                    />
                  </div>
                )}
              </div>
            </section>

            {/* Ciblage */}
            <section>
              <h2 className="text-lg font-semibold text-dash-text tracking-tight mb-1">5. Ciblage</h2>
              <p className="text-sm text-dash-text-muted mb-5">Âge, régions et centres d’intérêt.</p>
              <PanelCard className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dash-text mb-2">Âge min</label>
                    <input type="number" min={18} max={99} value={ageMin} onChange={(e) => setAgeMin(Number(e.target.value))} className={`${inputBase} ${inputNormal}`} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dash-text mb-2">Âge max</label>
                    <input type="number" min={18} max={99} value={ageMax} onChange={(e) => setAgeMax(Number(e.target.value))} className={`${inputBase} ${inputNormal}`} />
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-sm font-medium text-dash-text">Régions</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {REGIONS.map((r) => (
                      <button key={r} type="button" onClick={() => toggleRegion(r)} className={`rounded-full px-3 py-1.5 text-sm transition-colors ${regions.includes(r) || (r === "Toutes" && regions.length === REGIONS.length - 1) ? "bg-dash-text text-dash-bg" : "bg-dash-surface-2 text-dash-text-secondary hover:bg-dash-surface-2/80"}`}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-sm font-medium text-dash-text">Tags</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {TAGS.map((t) => (
                      <button key={t} type="button" onClick={() => toggleTag(t)} className={`rounded-full px-3 py-1.5 text-sm transition-colors ${tags.includes(t) ? "bg-dash-text text-dash-bg" : "bg-dash-surface-2 text-dash-text-secondary hover:bg-dash-surface-2/80"}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </PanelCard>
            </section>

            {/* Aperçu mobile */}
            <section>
              <h2 className="text-lg font-semibold text-dash-text tracking-tight mb-1">6. Aperçu mobile</h2>
              <p className="text-sm text-dash-text-muted mb-5">Ce que verra l’utilisateur dans l’app (carte swipe).</p>
              <PanelCard className="p-6 border-2 border-dash-border-subtle">
                <div className="mx-auto rounded-2xl border-2 border-dash-border bg-dash-surface-3 overflow-hidden shadow-lg" style={{ maxWidth: 280 }}>
                  <div className="h-8 flex items-center justify-center border-b border-dash-border bg-dash-surface-2">
                    <span className="text-xs text-dash-text-muted font-medium">Aperçu</span>
                  </div>
                  <div className="p-4 min-h-[140px]">
                    {creativeType === "image" && mediaUrlPrimary ? (
                      <div className="rounded-xl overflow-hidden bg-dash-surface-2 aspect-[4/3] mb-3">
                        <img src={mediaUrlPrimary} alt="Preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      </div>
                    ) : creativeType === "video" && mediaUrlPrimary ? (
                      <div className="rounded-xl overflow-hidden bg-dash-surface-2 aspect-video mb-3">
                        <video src={mediaUrlPrimary} className="w-full h-full object-cover" muted playsInline loop onError={(e) => { (e.target as HTMLVideoElement).style.display = "none"; }} />
                      </div>
                    ) : creativeType === "comparison" && (mediaUrlComparisonA || mediaUrlComparisonB) ? (
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="rounded-lg overflow-hidden bg-dash-surface-2 aspect-square">
                          {mediaUrlComparisonA ? <img src={mediaUrlComparisonA} alt="A" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} /> : <span className="text-[10px] text-dash-text-muted p-1">A</span>}
                        </div>
                        <div className="rounded-lg overflow-hidden bg-dash-surface-2 aspect-square">
                          {mediaUrlComparisonB ? <img src={mediaUrlComparisonB} alt="B" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} /> : <span className="text-[10px] text-dash-text-muted p-1">B</span>}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl bg-dash-surface-2 h-16 mb-3 flex items-center justify-center">
                        <span className="text-xs text-dash-text-muted">{creativeType === "text" ? "Texte" : "Média"}</span>
                      </div>
                    )}
                    <p className="text-xs font-medium text-dash-text line-clamp-2">{question || "Question (à définir)"}</p>
                    <p className="text-[10px] text-dash-text-muted mt-1">+{rewardUser.toFixed(2)} €</p>
                  </div>
                </div>
              </PanelCard>
            </section>

            {/* Budget & publication */}
            <section>
              <h2 className="text-lg font-semibold text-dash-text tracking-tight mb-1">7. Budget & publication</h2>
              <p className="text-sm text-dash-text-muted mb-5">Quota, récompense et lancement.</p>
              <PanelCard className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dash-text mb-2">Quota (réponses)</label>
                    <input type="number" min={1} value={quota} onChange={(e) => setQuota(Number(e.target.value))} className={`${inputBase} ${inputNormal}`} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dash-text mb-2">Récompense utilisateur (€)</label>
                    <input type="number" step={0.05} min={0.05} value={rewardUser} onChange={(e) => setRewardUser(Number(e.target.value))} className={`${inputBase} ${inputNormal}`} />
                  </div>
                </div>
                <label className="inline-flex items-center gap-3 cursor-pointer mt-5">
                  <input type="checkbox" checked={publishNow} onChange={(e) => setPublishNow(e.target.checked)} className="rounded border-dash-border-subtle text-dash-accent focus:ring-dash-accent/40" />
                  <span className="text-sm font-medium text-dash-text">Publier maintenant</span>
                </label>
              </PanelCard>
            </section>

            {/* Erreurs submit */}
            {submitError === "no_org" && (
              <PanelCard className="bg-amber-500/10 border border-amber-500/20 p-5">
                <p className="text-sm font-medium text-amber-400">{createCopy.noOrg}</p>
                <Link href="/select-org" className={`inline-block mt-2 text-sm ${dash.link} text-dash-text`}>Sélectionner une organisation</Link>
              </PanelCard>
            )}
            {submitError === "insufficient_org_credit" && (
              <PanelCard className="bg-red-500/10 border border-red-500/20 p-5">
                <p className="text-sm font-medium text-red-400">{createCopy.insufficientCredit}</p>
                <Link href="/" className={`inline-block mt-2 text-sm ${dash.link} text-dash-text`}>Recharger</Link>
              </PanelCard>
            )}
            {submitError === "creation_failed" && (
              <PanelCard className="bg-dash-danger/10 border border-dash-danger/20 p-5">
                <p className="text-sm font-medium text-dash-danger">{createCopy.creationFailed}</p>
                {process.env.NODE_ENV === "development" && submitErrorMessage && <p className="text-xs text-dash-text-muted mt-1 font-mono">{submitErrorMessage}</p>}
              </PanelCard>
            )}

          </div>

          {/* Panneau résumé sticky (desktop) */}
          <aside className="hidden lg:block self-start">
            {summaryPanel}
          </aside>
        </form>

        {/* Résumé + CTA en bas (mobile uniquement) */}
        <div className="lg:hidden mt-8">
          {summaryPanel}
        </div>
      </main>
    </div>
  );
}
