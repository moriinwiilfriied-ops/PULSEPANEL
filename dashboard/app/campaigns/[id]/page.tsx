"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getCampaignStats, getCampaignQualityStats, updateCampaignStatus, duplicateCampaign, validateCampaignPayouts, exportCampaignResponses, resetTestCampaign, deleteCampaign, deleteCampaignGeneric, type ExportCampaignResponseRow } from "@/src/lib/supabaseCampaigns";
import { getCampaignTimeToQuota, formatTimeToQuota } from "@/src/lib/pilotKpis";
import { buildCampaignProofPack, proofPackToMarkdown } from "@/src/lib/campaignProof";
import { fetchCampaignQualityDeep, buildCampaignQualityInsights } from "@/src/lib/campaignQualityInsights";
import { supabase, getOrgMembership } from "@/src/lib/supabase";
import { testSwipe as testCopy, campaignDelete as deleteCopy } from "@/src/lib/uiCopy";
import { dash } from "@/src/lib/dashboardTheme";
import { PanelCard } from "@/src/components/ui/PanelCard";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { CampaignCreativePreview } from "@/src/components/campaign/CampaignCreativePreview";

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

  const loadStats = useCallback(() => {
    setLoading(true);
    getCampaignStats(id).then(setStats).finally(() => setLoading(false));
    getCampaignQualityStats(id).then(setQualityStats);
    fetchCampaignQualityDeep(id).then(setQualityDeep);
    getCampaignTimeToQuota(id).then(setTimeToQuota);
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setLoading(true);
    });
    getCampaignStats(id)
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    getCampaignQualityStats(id).then((data) => {
      if (!cancelled) setQualityStats(data);
    });
    fetchCampaignQualityDeep(id).then((data) => {
      if (!cancelled) setQualityDeep(data);
    });
    getCampaignTimeToQuota(id).then((data) => {
      if (!cancelled) setTimeToQuota(data);
    });
    return () => {
      cancelled = true;
    };
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
      <div className={`${dash.page} flex items-center justify-center`}>
        <p className="text-dash-text-muted">Chargement…</p>
      </div>
    );
  }
  if (!stats) {
    return (
      <div className={`${dash.page} flex items-center justify-center`}>
        <div className="text-center">
          <p className="text-dash-text-secondary">Campagne introuvable.</p>
          <Link href="/" className={`mt-4 inline-block ${dash.link} text-dash-text`}>
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
    <div className={dash.page}>
      <main className={dash.containerWide + " space-y-8"}>
        {/* Header cockpit : retour discret, titre fort, statut + tags */}
        <div className="flex flex-col gap-4">
          <Link href="/" className={`text-sm ${dash.link} self-start`}>← Accueil</Link>
          <div className="flex flex-wrap items-baseline gap-3 gap-y-1">
            <h1 className={dash.headlineHero + " truncate pr-4"}>{campaign.name}</h1>
            <StatusBadge variant={campaign.status === "active" ? "success" : campaign.status === "paused" ? "warning" : "neutral"}>
              {campaign.status === "active" ? "Actif" : campaign.status === "paused" ? "En pause" : "Terminée"}
            </StatusBadge>
            <span className={`${dash.badge} ${dash.badgeNeutral}`}>{campaign.template}</span>
            <span className={`${dash.badge} bg-dash-accent/15 text-dash-accent`}>Qualité {qualityBadge}</span>
            {campaign.isTest && <StatusBadge variant="test">Test swipe</StatusBadge>}
          </div>
          {process.env.NODE_ENV === "development" && (
            <div className="rounded-md bg-dash-surface-2/50 px-2.5 py-1.5 text-[10px] text-dash-text-muted/80 font-mono">
              <span className="text-dash-text-muted/70">DEV</span> {devAuth.userId ?? "—"} · {devAuth.orgId ?? "—"} · {devAuth.role ?? "—"}
            </div>
          )}
        </div>

        {/* Aperçu créa : type + visuel immédiat */}
        <PanelCard className="p-0 overflow-hidden">
          <CampaignCreativePreview campaign={campaign} />
        </PanelCard>

        {validateError && (
          <PanelCard className="bg-red-950/20">
            <p className="text-sm font-medium text-red-400">{validateError}</p>
          </PanelCard>
        )}
        {exportError && (
          <PanelCard className="bg-red-950/20">
            <p className="text-sm font-medium text-red-400">{exportError}</p>
          </PanelCard>
        )}
        {exportToast && (
          <PanelCard className="bg-emerald-950/20">
            <p className="text-sm font-medium text-emerald-400">{exportToast === "csv" ? "Export CSV généré." : "Export JSON généré."}</p>
          </PanelCard>
        )}
        {proofCopyToast && (
          <PanelCard className="bg-emerald-950/20">
            <p className="text-sm font-medium text-emerald-400">Résumé preuve copié.</p>
          </PanelCard>
        )}

        {/* Zone actions : une primaire, secondaires regroupées */}
        <div className="flex flex-wrap items-center gap-3">
          {campaign.status === "active" && (
            <button type="button" onClick={() => handleStatus("paused")} disabled={actionLoading} className={`${dash.btn} ${dash.btnWarning}`}>Pause</button>
          )}
          {campaign.status === "paused" && (
            <>
              <button type="button" onClick={() => handleStatus("active")} disabled={actionLoading} className={`${dash.btn} ${dash.btnPrimary} px-5 py-2.5`}>Publier</button>
              {publishError && <p className="text-sm text-dash-danger">Crédit insuffisant. <Link href="/" className={dash.link}>Recharger</Link></p>}
              <button type="button" onClick={() => handleStatus("completed")} disabled={actionLoading} className={`${dash.btn} ${dash.btnSecondary}`}>Terminer</button>
            </>
          )}
          {campaign.status === "completed" && (
            <button type="button" onClick={handleDuplicate} disabled={actionLoading} className={`${dash.btn} ${dash.btnPrimary} px-5 py-2.5`} title="Copie en brouillon">Créer une V2</button>
          )}
          {campaign.status !== "completed" && (
            <>
              <button type="button" onClick={handleValidatePayouts} disabled={actionLoading} className={`${dash.btn} ${dash.btnGhost}`}>Valider paiements</button>
              <button type="button" onClick={handleDuplicate} disabled={actionLoading} className={`${dash.btn} ${dash.btnGhost}`} title="Copie en brouillon">V2</button>
              {campaign.templateKey && (
                <button type="button" onClick={handleDuplicateVariant} disabled={actionLoading} className={`${dash.btn} ${dash.btnGhost}`}>Variante A/B</button>
              )}
            </>
          )}
          {duplicateError === "insufficient_org_credit" && <p className="text-sm text-dash-danger">Crédit insuffisant. <Link href="/" className={dash.link}>Recharger</Link></p>}
          {duplicateError === "failed" && <p className="text-sm text-dash-danger">Duplication impossible.</p>}
          {campaign.isTest && (
            <>
              <button type="button" onClick={async () => { setActionLoading(true); const { error } = await resetTestCampaign(id); if (error) alert(testCopy.errorReset); else loadStats(); setActionLoading(false); }} disabled={actionLoading} className={`${dash.btn} ${dash.btnWarning}`}>{testCopy.ctaReset}</button>
              <button type="button" onClick={async () => { if (!window.confirm(testCopy.confirmDelete)) return; setActionLoading(true); const { error } = await deleteCampaign(id); setActionLoading(false); if (error) alert(testCopy.errorDelete); else router.push("/"); }} disabled={actionLoading} className={`${dash.btn} ${dash.btnDanger}`}>{testCopy.ctaDelete}</button>
            </>
          )}
          {!campaign.isTest && (
            <button type="button" onClick={async () => { if (!window.confirm(deleteCopy.confirmGeneric)) return; setActionLoading(true); const result = await deleteCampaignGeneric(id); setActionLoading(false); if ("error" in result) { alert(deleteCopy.errorGeneric + (result.error ? ` ${result.error}` : "")); return; } if (result.result === "delete_blocked" || result.result === "not_found") { alert(result.message ?? deleteCopy.errorGeneric); return; } alert(result.result === "deleted_hard" ? deleteCopy.resultDeletedHard : deleteCopy.resultDeletedSoft); router.push("/"); }} disabled={actionLoading} className={`${dash.btn} ${dash.btnDanger} ml-auto`}>Supprimer</button>
          )}
          <span className="hidden sm:inline flex-1" />
          <button type="button" onClick={handleExportCsv} disabled={exportLoading} className={`${dash.btn} ${dash.btnGhost} text-sm`}>CSV</button>
          <button type="button" onClick={handleExportJson} disabled={exportLoading} className={`${dash.btn} ${dash.btnGhost} text-sm`}>JSON</button>
        </div>

        {proofPack && (
          <PanelCard>
            <div className="flex items-center gap-2 mb-3">
              <h3 className={dash.sectionTitle}>Résumé preuve</h3>
              {proofPack.goodProofCandidate && (
                <span className={`${dash.badge} ${dash.badgeSuccess}`}>Bonne preuve potentielle</span>
              )}
            </div>
            <p className="text-sm text-dash-text-secondary mb-2">{proofPack.summaryShort}</p>
            <p className="text-sm font-medium text-dash-text mb-3">Chiffre fort : {proofPack.headlineNumber}</p>
            <button type="button" onClick={handleCopyProof} className={`${dash.btn} ${dash.btnSecondary}`}>
              Copier le résumé (Markdown)
            </button>
          </PanelCard>
        )}

        {campaign.status === "completed" && (
          <PanelCard>
            <h3 className={dash.sectionTitle + " mb-2"}>Et ensuite ?</h3>
            <p className="text-sm text-dash-text-secondary mb-3">
              Relancez un test à partir de cette campagne : créez une V2 en brouillon, ajustez si besoin puis publiez.
            </p>
            <button type="button" onClick={handleDuplicate} disabled={actionLoading} className={`${dash.btn} ${dash.btnPrimary}`}>
              Créer une V2
            </button>
          </PanelCard>
        )}

        {validateResult && (
          <PanelCard className="bg-dash-accent/10">
            <p className="text-sm font-medium text-dash-accent">
              Paiements validés: {validateResult.validated_responses} réponse(s), {validateResult.users} utilisateur(s), {(validateResult.total_cents / 100).toFixed(2)} €
            </p>
          </PanelCard>
        )}

        {/* Métriques pilotage : bloc central */}
        <PanelCard className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className={dash.metricLabel}>Réponses</p>
              <p className={dash.metricValue}>{responsesCount} / {quota}</p>
            </div>
            <div>
              <p className={dash.metricLabel}>Paiements</p>
              <p className="text-base font-semibold text-dash-text"><span className="text-amber-400">{pendingCount} pending</span> · <span className="text-emerald-400">{availableCount} dispo.</span></p>
            </div>
            <div>
              <p className={dash.metricLabel}>Trust moyen</p>
              <p className={dash.metricValue}>{trustAvg}</p>
            </div>
            <div>
              <p className={dash.metricLabel}>Récompense · Total</p>
              <p className={dash.metricValue}>{campaign.rewardUser} € · {campaign.total} €</p>
            </div>
          </div>
        </PanelCard>

        {(timeToQuota != null || (costTotalCents != null && responsesCount > 0)) && (
          <PanelCard>
            <h3 className={dash.sectionTitle + " mb-3"}>KPI pilot</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              {timeToQuota?.quota_reached && timeToQuota.time_to_quota_seconds != null && (
                <div>
                  <p className={dash.metricLabel}>Temps pour quota</p>
                  <p className="text-base font-semibold text-dash-text tabular-nums">{formatTimeToQuota(timeToQuota.time_to_quota_seconds)}</p>
                </div>
              )}
              {timeToQuota && !timeToQuota.quota_reached && (
                <div>
                  <p className={dash.metricLabel}>Quota</p>
                  <p className="font-medium text-dash-text">En cours ({responsesCount} / {quota})</p>
                </div>
              )}
              {campaign.createdAt && (
                <div>
                  <p className={dash.metricLabel}>Lancée le</p>
                  <p className="font-medium text-dash-text">{new Date(campaign.createdAt).toLocaleDateString()}</p>
                </div>
              )}
              {costTotalCents != null && responsesCount > 0 && (
                <div>
                  <p className={dash.metricLabel}>Coût réel / réponse</p>
                  <p className="font-medium text-dash-text">{((costTotalCents / 100) / responsesCount).toFixed(2)} €</p>
                </div>
              )}
            </div>
          </PanelCard>
        )}

        {(qualityStats || qualityInsights) && (
          <PanelCard>
            <h3 className={dash.sectionTitle + " mb-3"}>Qualité campagne</h3>
            <div className="space-y-3">
              {qualityInsights && (
                <div className="flex items-center gap-2">
                  <StatusBadge
                    variant={qualityInsights.qualitySignal === "bon" ? "success" : qualityInsights.qualitySignal === "faible" ? "neutral" : "warning"}
                  >
                    {qualityInsights.qualitySignal === "bon" ? "Bon" : qualityInsights.qualitySignal === "faible" ? "Faible" : "À surveiller"}
                  </StatusBadge>
                </div>
              )}
              {qualityStats && (
                <ul className="space-y-1 text-sm text-dash-text-secondary">
                  <li>Réponses valides : {qualityStats.pct_valid} %</li>
                  <li>Trop rapide : {qualityStats.pct_too_fast} %</li>
                  <li>Vides : {qualityStats.pct_empty} %</li>
                </ul>
              )}
              {qualityInsights?.meanDurationSec != null && (
                <p className="text-sm text-dash-text-secondary">Temps moyen de réponse : {qualityInsights.meanDurationSec} s</p>
              )}
              {qualityInsights && qualityInsights.flagsCount > 0 && (
                <p className="text-sm text-dash-text-secondary">Réponses flaggées : {qualityInsights.flagsCount} ({Math.round(qualityInsights.flaggedRatio * 100)} %)</p>
              )}
              <p className="text-sm text-dash-text-secondary">Trust moyen répondants : {trustAvg}</p>
              {qualityInsights && qualityInsights.topChoices.length > 0 && (
                <div>
                  <p className={dash.metricLabel + " mb-1"}>Top choix</p>
                  <ul className="space-y-0.5 text-sm text-dash-text-secondary">
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
          </PanelCard>
        )}

        {qualityInsights && qualityInsights.observations.length > 0 && (
          <PanelCard>
            <h3 className={dash.sectionTitle + " mb-3"}>À retenir</h3>
            <ul className="space-y-2 text-sm text-dash-text-secondary">
              {qualityInsights.observations.slice(0, 5).map((obs, i) => (
                <li key={i}>{obs}</li>
              ))}
            </ul>
          </PanelCard>
        )}

        {Object.keys(distribution).length > 0 && (
          <PanelCard>
            <h3 className={dash.sectionTitle + " mb-3"}>Distribution des réponses</h3>
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
          </PanelCard>
        )}

        <PanelCard>
          <h3 className={dash.sectionTitle + " mb-3"}>Verbatims</h3>
          {verbatims.length === 0 ? (
            <p className="text-dash-text-muted text-sm">Aucune réponse pour l’instant.</p>
          ) : (
            <ul className="space-y-3">
              {verbatims.map((r) => (
                <li key={r.id} className="flex justify-between gap-4 py-2 border-b border-white/[0.06] last:border-0">
                  <p className="text-dash-text flex-1">{r.answer}</p>
                  <span className="text-xs text-dash-text-muted shrink-0">Trust {r.trustLevel} · {new Date(r.at).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </PanelCard>
      </main>
    </div>
  );
}
