"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getCampaignStats, getCampaignQualityStats, updateCampaignStatus, duplicateCampaign, validateCampaignPayouts, exportCampaignResponses, type ExportCampaignResponseRow } from "@/src/lib/supabaseCampaigns";
import { getCampaignTimeToQuota, formatTimeToQuota } from "@/src/lib/pilotKpis";
import { buildCampaignProofPack, proofPackToMarkdown } from "@/src/lib/campaignProof";
import { fetchCampaignQualityDeep, buildCampaignQualityInsights } from "@/src/lib/campaignQualityInsights";
import { supabase, getOrgMembership } from "@/src/lib/supabase";

type Stats = Awaited<ReturnType<typeof getCampaignStats>>;

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [stats, setStats] = useState<Stats>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [validateResult, setValidateResult] = useState<{
    validated_responses: number;
    users: number;
    total_cents: number;
  } | null>(null);
  const [validateError, setValidateError] = useState<string | null>(null);
  const [devAuth, setDevAuth] = useState<{ userId: string | null; orgId: string | null; role: string | null }>({
    userId: null,
    orgId: null,
    role: null,
  });
  const [qualityStats, setQualityStats] = useState<Awaited<ReturnType<typeof getCampaignQualityStats>>>(null);
  const [qualityDeep, setQualityDeep] = useState<Awaited<ReturnType<typeof fetchCampaignQualityDeep>>>(null);
  const [timeToQuota, setTimeToQuota] = useState<Awaited<ReturnType<typeof getCampaignTimeToQuota>>>(null);
  const [exportToast, setExportToast] = useState<"csv" | "json" | null>(null);
  const [proofCopyToast, setProofCopyToast] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [duplicateError, setDuplicateError] = useState<"insufficient_org_credit" | "failed" | null>(null);
  const [publishError, setPublishError] = useState(false);

  const loadStats = () => {
    setLoading(true);
    getCampaignStats(id).then(setStats).finally(() => setLoading(false));
    getCampaignQualityStats(id).then(setQualityStats);
    fetchCampaignQualityDeep(id).then(setQualityDeep);
    getCampaignTimeToQuota(id).then(setTimeToQuota);
  };

  useEffect(() => {
    loadStats();
  }, [id]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const membership = await getOrgMembership();
      setDevAuth({
        userId: user?.id ?? null,
        orgId: membership?.orgId ?? null,
        role: membership?.role ?? null,
      });
    })();
  }, []);

  const handleStatus = async (status: "active" | "paused" | "completed") => {
    setActionLoading(true);
    setPublishError(false);
    const { error } = await updateCampaignStatus(id, status);
    setActionLoading(false);
    if (error && status === "active") {
      const msg = (error as { message?: string }).message ?? "";
      if (msg.includes("insufficient_org_credit")) setPublishError(true);
    }
    if (!error) loadStats();
  };

  const handleDuplicate = async () => {
    setActionLoading(true);
    setDuplicateError(null);
    const result = await duplicateCampaign(id);
    setActionLoading(false);
    if (result && "campaign" in result) router.push(`/campaigns/${result.campaign.id}`);
    else if (result?.error === "insufficient_org_credit") setDuplicateError("insufficient_org_credit");
    else if (result?.error) setDuplicateError("failed");
  };

  const handleDuplicateVariant = async () => {
    setActionLoading(true);
    setDuplicateError(null);
    const result = await duplicateCampaign(id, {
      nameSuffix: " — variante A/B",
      question: "Variante",
    });
    setActionLoading(false);
    if (result && "campaign" in result) router.push(`/campaigns/${result.campaign.id}`);
    else if (result?.error === "insufficient_org_credit") setDuplicateError("insufficient_org_credit");
    else if (result?.error) setDuplicateError("failed");
  };

  const handleValidatePayouts = async () => {
    setActionLoading(true);
    setValidateResult(null);
    setValidateError(null);
    const result = await validateCampaignPayouts(id);
    setActionLoading(false);
    if (result.error) {
      const msg = result.error.message?.toLowerCase() ?? "";
      setValidateError(
        msg.includes("not_authenticated") || msg.includes("jwt")
          ? "Connectez-vous."
          : "Validation impossible: vous n'êtes pas autorisé."
      );
      return;
    }
    if (
      result.validated_responses != null &&
      result.users != null &&
      result.total_cents != null
    ) {
      setValidateResult({
        validated_responses: result.validated_responses,
        users: result.users,
        total_cents: result.total_cents,
      });
    }
    loadStats();
  };

  const exportErrorToMessage = (err: Error): string => {
    const msg = (err.message ?? "").toLowerCase();
    if (msg.includes("forbidden")) return "Vous n'êtes pas autorisé.";
    if (msg.includes("not_authenticated") || msg.includes("jwt")) return "Connectez-vous.";
    return "Export impossible.";
  };

  const downloadJson = (data: ExportCampaignResponseRow[], filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCsv = (data: ExportCampaignResponseRow[], filename: string) => {
    const escape = (v: string) => {
      const s = String(v);
      if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const headers = ["created_at", "response_id", "user_id", "answer", "reward_cents", "payout_status", "is_valid", "duration_ms"];
    const rows = data.map((r) =>
      headers.map((h) => {
        const val = r[h as keyof ExportCampaignResponseRow];
        if (h === "answer") return escape(JSON.stringify(val ?? ""));
        return escape(val == null ? "" : String(val));
      }).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = async () => {
    setExportError(null);
    setExportLoading(true);
    const { data: rows, error } = await exportCampaignResponses(id);
    setExportLoading(false);
    if (error) {
      setExportError(exportErrorToMessage(error));
      return;
    }
    const base = (stats?.campaign?.name ?? "campaign").replace(/[^\w\s-]/g, "").slice(0, 40) || "export";
    downloadCsv(rows ?? [], `${base}_responses.csv`);
    setExportToast("csv");
    setTimeout(() => setExportToast(null), 3000);
  };

  const handleExportJson = async () => {
    setExportError(null);
    setExportLoading(true);
    const { data: rows, error } = await exportCampaignResponses(id);
    setExportLoading(false);
    if (error) {
      setExportError(exportErrorToMessage(error));
      return;
    }
    const base = (stats?.campaign?.name ?? "campaign").replace(/[^\w\s-]/g, "").slice(0, 40) || "export";
    downloadJson(rows ?? [], `${base}_responses.json`);
    setExportToast("json");
    setTimeout(() => setExportToast(null), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-500">Chargement…</p>
      </div>
    );
  }
  if (!stats) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-600 dark:text-zinc-400">Campagne introuvable.</p>
          <Link href="/" className="mt-4 inline-block text-zinc-900 dark:text-zinc-100 underline">
            Retour à l’accueil
          </Link>
        </div>
      </div>
    );
  }

  const {
    campaign,
    responsesCount,
    quota,
    distribution,
    trustAvg,
    qualityBadge,
    verbatims,
    pendingCount = 0,
    availableCount = 0,
    source = "mock",
    costTotalCents,
  } = stats;

  const proofPack =
    campaign.status === "completed"
      ? buildCampaignProofPack({
          campaignName: campaign.name ?? "Sans titre",
          question: campaign.question,
          campaignCreatedAt: campaign.createdAt ?? "",
          status: campaign.status,
          quota,
          responsesCount,
          costTotalCents,
          qualityPctValid: qualityStats?.pct_valid,
          qualityPctTooFast: qualityStats?.pct_too_fast,
          qualityPctEmpty: qualityStats?.pct_empty,
          timeToQuotaSeconds: timeToQuota?.time_to_quota_seconds,
          quotaReached: timeToQuota?.quota_reached,
        })
      : null;

  const handleCopyProof = () => {
    if (!proofPack) return;
    const text = proofPackToMarkdown(proofPack);
    void navigator.clipboard.writeText(text).then(() => {
      setProofCopyToast(true);
      setTimeout(() => setProofCopyToast(false), 2500);
    });
  };

  const qualityInsights =
    responsesCount > 0
      ? buildCampaignQualityInsights({
          total_responses: qualityStats?.total_responses ?? responsesCount,
          valid_responses: qualityStats?.valid_responses ?? 0,
          invalid_responses: qualityStats?.invalid_responses ?? 0,
          pct_valid: qualityStats?.pct_valid ?? 0,
          pct_too_fast: qualityStats?.pct_too_fast ?? 0,
          pct_empty: qualityStats?.pct_empty ?? 0,
          avg_duration_ms: qualityDeep?.avg_duration_ms ?? null,
          flags_count: qualityDeep?.flags_count ?? 0,
          distribution,
          trustAvg,
          responsesCount,
          quota,
          timeToQuotaSeconds: timeToQuota?.time_to_quota_seconds ?? null,
          status: campaign.status,
        })
      : null;

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
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 truncate">
            {campaign.name}
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8 space-y-8">
        {process.env.NODE_ENV === "development" && (
          <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-900 dark:text-amber-200 font-mono">
            <span className="font-semibold">DEV</span> user_id: {devAuth.userId ?? "—"} | org_id: {devAuth.orgId ?? "—"} | role: {devAuth.role ?? "—"}
          </div>
        )}

        {validateError && (
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4">
            <p className="text-sm font-medium text-red-800 dark:text-red-200">{validateError}</p>
          </div>
        )}

        {exportError && (
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4">
            <p className="text-sm font-medium text-red-800 dark:text-red-200">{exportError}</p>
          </div>
        )}

        {exportToast && (
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 text-sm font-medium text-emerald-800 dark:text-emerald-200">
            {exportToast === "csv" ? "Export CSV généré." : "Export JSON généré."}
          </div>
        )}
        {proofCopyToast && (
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 text-sm font-medium text-emerald-800 dark:text-emerald-200">
            Résumé preuve copié dans le presse-papiers.
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              campaign.status === "active"
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                : campaign.status === "paused"
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
            }`}
          >
            {campaign.status === "active" ? "Actif" : campaign.status === "paused" ? "En pause" : "Terminée"}
          </span>
          <span className="rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-2.5 py-0.5 text-xs font-medium">
            {campaign.template}
          </span>
          <span className="rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-2.5 py-0.5 text-xs font-medium">
            Qualité {qualityBadge}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {campaign.status === "active" && (
            <button
              type="button"
              onClick={() => handleStatus("paused")}
              disabled={actionLoading}
              className="rounded-lg border border-amber-500 text-amber-700 dark:text-amber-400 px-4 py-2 text-sm font-medium hover:bg-amber-50 dark:hover:bg-amber-900/20 disabled:opacity-50"
            >
              Pause
            </button>
          )}
          {campaign.status === "paused" && (
            <>
              <button
                type="button"
                onClick={() => handleStatus("active")}
                disabled={actionLoading}
                className="rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                Publier
              </button>
              {publishError && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  Crédit insuffisant.{" "}
                  <Link href="/" className="underline hover:no-underline">
                    Recharger (DEV)
                  </Link>
                </p>
              )}
              <button
                type="button"
                onClick={() => handleStatus("completed")}
                disabled={actionLoading}
                className="rounded-lg border border-zinc-400 text-zinc-700 dark:text-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
              >
                Terminer
              </button>
            </>
          )}
          {campaign.status !== "completed" && (
            <button
              type="button"
              onClick={handleValidatePayouts}
              disabled={actionLoading}
              className="rounded-lg bg-violet-600 text-white px-4 py-2 text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
            >
              Valider paiements
            </button>
          )}
          <button
            type="button"
            onClick={handleDuplicate}
            disabled={actionLoading}
            className="rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50"
            title="Crée une copie en brouillon (même question, quota, récompense). Vous pourrez modifier puis publier."
          >
            Créer une V2
          </button>
          {campaign.templateKey && (
            <button
              type="button"
              onClick={handleDuplicateVariant}
              disabled={actionLoading}
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50"
              title="Dupliquer avec une question variante pour test A/B"
            >
              Créer variante A/B
            </button>
          )}
          {duplicateError === "insufficient_org_credit" && (
            <p className="text-sm text-red-600 dark:text-red-400">
              Crédit insuffisant.{" "}
              <Link href="/" className="underline hover:no-underline">
                Recharger (DEV)
              </Link>
            </p>
          )}
          {duplicateError === "failed" && (
            <p className="text-sm text-red-600 dark:text-red-400">
              Duplication impossible.
            </p>
          )}
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={exportLoading}
            className="rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50"
          >
            Exporter CSV
          </button>
          <button
            type="button"
            onClick={handleExportJson}
            disabled={exportLoading}
            className="rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50"
          >
            Exporter JSON
          </button>
        </div>

        {proofPack && (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Résumé preuve
              </h3>
              {proofPack.goodProofCandidate && (
                <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 text-xs font-medium">
                  Bonne preuve potentielle
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
              {proofPack.summaryShort}
            </p>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-3">
              Chiffre fort : {proofPack.headlineNumber}
            </p>
            <button
              type="button"
              onClick={handleCopyProof}
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              Copier le résumé (Markdown)
            </button>
          </div>
        )}

        {campaign.status === "completed" && (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Et ensuite ?
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
              Relancez un test à partir de cette campagne : créez une V2 en brouillon, ajustez si besoin puis publiez.
            </p>
            <button
              type="button"
              onClick={handleDuplicate}
              disabled={actionLoading}
              className="rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              Créer une V2
            </button>
          </div>
        )}

        {validateResult && (
          <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 p-4">
            <p className="text-sm font-medium text-violet-800 dark:text-violet-200">
              Paiements validés: {validateResult.validated_responses} réponse(s), {validateResult.users} utilisateur(s), {(validateResult.total_cents / 100).toFixed(2)} €
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Réponses</p>
            <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              {responsesCount} / {quota}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Paiements</p>
            <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              <span className="text-amber-600 dark:text-amber-400">{pendingCount} pending</span>
              {" · "}
              <span className="text-emerald-600 dark:text-emerald-400">{availableCount} dispo.</span>
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Trust moyen</p>
            <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              {trustAvg}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Récompense / réponse</p>
            <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              {campaign.rewardUser} €
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Total{source === "mock" ? " (mock)" : ""}
            </p>
            <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              {campaign.total} €
            </p>
          </div>
        </div>

        {(timeToQuota != null || (costTotalCents != null && responsesCount > 0)) && (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
              KPI pilot
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              {timeToQuota?.quota_reached && timeToQuota.time_to_quota_seconds != null && (
                <div>
                  <p className="text-zinc-500 dark:text-zinc-400">Temps pour quota</p>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    {formatTimeToQuota(timeToQuota.time_to_quota_seconds)}
                  </p>
                </div>
              )}
              {timeToQuota && !timeToQuota.quota_reached && (
                <div>
                  <p className="text-zinc-500 dark:text-zinc-400">Quota</p>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    En cours ({responsesCount} / {quota})
                  </p>
                </div>
              )}
              {campaign.createdAt && (
                <div>
                  <p className="text-zinc-500 dark:text-zinc-400">Lancée le</p>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    {new Date(campaign.createdAt).toLocaleDateString()}
                  </p>
                </div>
              )}
              {costTotalCents != null && responsesCount > 0 && (
                <div>
                  <p className="text-zinc-500 dark:text-zinc-400">Coût réel / réponse</p>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    {((costTotalCents / 100) / responsesCount).toFixed(2)} €
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {(qualityStats || qualityInsights) && (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
              Qualité campagne
            </h3>
            <div className="space-y-3">
              {qualityInsights && (
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      qualityInsights.qualitySignal === "bon"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                        : qualityInsights.qualitySignal === "faible"
                          ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                    }`}
                  >
                    {qualityInsights.qualitySignal === "bon"
                      ? "Bon"
                      : qualityInsights.qualitySignal === "faible"
                        ? "Faible"
                        : "À surveiller"}
                  </span>
                </div>
              )}
              {qualityStats && (
                <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                  <li>Réponses valides : {qualityStats.pct_valid} %</li>
                  <li>Trop rapide : {qualityStats.pct_too_fast} %</li>
                  <li>Vides : {qualityStats.pct_empty} %</li>
                </ul>
              )}
              {qualityInsights?.meanDurationSec != null && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Temps moyen de réponse : {qualityInsights.meanDurationSec} s
                </p>
              )}
              {qualityInsights && qualityInsights.flagsCount > 0 && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Réponses flaggées : {qualityInsights.flagsCount} ({Math.round(qualityInsights.flaggedRatio * 100)} %)
                </p>
              )}
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Trust moyen répondants : {trustAvg}
              </p>
              {qualityInsights && qualityInsights.topChoices.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Top choix</p>
                  <ul className="space-y-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                    {qualityInsights.topChoices.slice(0, 5).map(({ choice, count, pct }) => (
                      <li key={choice} className="flex justify-between gap-2">
                        <span className="truncate">{choice}</span>
                        <span>{count} ({pct} %)</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {qualityInsights && qualityInsights.observations.length > 0 && (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
              À retenir
            </h3>
            <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              {qualityInsights.observations.slice(0, 5).map((obs, i) => (
                <li key={i}>{obs}</li>
              ))}
            </ul>
          </div>
        )}

        {Object.keys(distribution).length > 0 && (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
              Distribution des réponses
            </h3>
            <ul className="space-y-2">
              {Object.entries(distribution).map(([answer, count]) => (
                <li key={answer} className="flex justify-between items-center">
                  <span className="text-zinc-700 dark:text-zinc-300 truncate max-w-[70%]">
                    {answer}
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400 text-sm">
                    {count} ({quota ? Math.round((count / quota) * 100) : 0}%)
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
            Verbatims{source === "mock" ? " (mock)" : ""}
          </h3>
          {verbatims.length === 0 ? (
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">Aucune réponse pour l’instant.</p>
          ) : (
            <ul className="space-y-3">
              {verbatims.map((r) => (
                <li
                  key={r.id}
                  className="flex justify-between gap-4 py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                >
                  <p className="text-zinc-900 dark:text-zinc-100 flex-1">{r.answer}</p>
                  <span className="text-xs text-zinc-500 shrink-0">
                    Trust {r.trustLevel} · {new Date(r.at).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
