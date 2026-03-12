"use client";

import Image from "next/image";
import { dash } from "@/src/lib/dashboardTheme";
import type { Campaign, CreativeType, CampaignMediaAsset } from "@/src/lib/mockData";

const CREATIVE_TYPE_LABELS: Record<CreativeType, string> = {
  text: "Texte",
  image: "Image",
  video: "Vidéo",
  comparison: "Comparaison A/B",
};

function getPrimaryUrl(assets: CampaignMediaAsset[]): string | undefined {
  return assets.find((a) => a.role === "primary")?.url;
}

function getComparisonUrls(assets: CampaignMediaAsset[]): { a: string | undefined; b: string | undefined } {
  const a = assets.find((a) => a.role === "comparison_a")?.url;
  const b = assets.find((a) => a.role === "comparison_b")?.url;
  return { a, b };
}

export function CampaignCreativePreview({ campaign }: { campaign: Campaign }) {
  const type: CreativeType = campaign.creativeType ?? "text";
  const assets = campaign.mediaAssets ?? [];
  const primaryUrl = getPrimaryUrl(assets);
  const { a: urlA, b: urlB } = getComparisonUrls(assets);

  return (
    <div className="rounded-xl overflow-hidden bg-dash-surface-2/80 border border-white/[0.06]">
      <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-white/[0.06]">
        <span className={dash.sectionTitle}>Aperçu créa</span>
        <span className={`${dash.badge} ${dash.badgeNeutral}`}>{CREATIVE_TYPE_LABELS[type]}</span>
      </div>
      <div className="p-4">
        {type === "text" && (
          <div className="space-y-2">
            <p className="text-sm text-dash-text-secondary line-clamp-3">{campaign.question || "Aucune question."}</p>
            {campaign.options?.length > 0 && (
              <p className="text-xs text-dash-text-muted">
                {campaign.options.length} réponse{campaign.options.length > 1 ? "s" : ""} possible{campaign.options.length > 1 ? "s" : ""}
              </p>
            )}
          </div>
        )}

        {type === "image" && (
          <div className="space-y-2">
            {primaryUrl ? (
              <div className="rounded-lg overflow-hidden bg-dash-surface-3 aspect-video max-h-48 w-full max-w-sm relative">
                <Image
                  src={primaryUrl}
                  alt="Aperçu créa"
                  fill
                  sizes="(max-width: 384px) 100vw, 384px"
                  className="object-contain"
                />
              </div>
            ) : (
              <p className="text-sm text-dash-text-muted">Aucune image.</p>
            )}
            {assets.length > 0 && (
              <p className="text-xs text-dash-text-muted">1 asset</p>
            )}
          </div>
        )}

        {type === "video" && (
          <div className="space-y-2">
            {primaryUrl ? (
              <div className="relative rounded-lg overflow-hidden bg-dash-surface-3 aspect-video max-h-48 w-full max-w-sm">
                <video
                  src={primaryUrl}
                  className="w-full h-full object-contain"
                  muted
                  playsInline
                  preload="metadata"
                  onError={(e) => {
                    (e.target as HTMLVideoElement).style.display = "none";
                  }}
                />
                <span className={`absolute top-2 right-2 ${dash.badge} bg-black/60 text-white`}>Vidéo</span>
              </div>
            ) : (
              <p className="text-sm text-dash-text-muted">Aucune vidéo.</p>
            )}
            {assets.length > 0 && (
              <p className="text-xs text-dash-text-muted">1 asset</p>
            )}
          </div>
        )}

        {type === "comparison" && (
          <div className="space-y-2">
            {(urlA || urlB) ? (
              <div className="grid grid-cols-2 gap-3 max-w-xl">
                <div className="rounded-lg overflow-hidden bg-dash-surface-3 border border-white/[0.06]">
                  <p className="text-xs font-medium text-dash-text-muted px-2 py-1 border-b border-white/[0.06]">A</p>
                  <div className="aspect-square max-h-32 relative">
                    {urlA ? (
                      <Image src={urlA} alt="Variante A" fill sizes="128px" className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-dash-text-muted text-xs">—</div>
                    )}
                  </div>
                </div>
                <div className="rounded-lg overflow-hidden bg-dash-surface-3 border border-white/[0.06]">
                  <p className="text-xs font-medium text-dash-text-muted px-2 py-1 border-b border-white/[0.06]">B</p>
                  <div className="aspect-square max-h-32 relative">
                    {urlB ? (
                      <Image src={urlB} alt="Variante B" fill sizes="128px" className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-dash-text-muted text-xs">—</div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-dash-text-muted">Aucun visuel A/B.</p>
            )}
            {assets.length > 0 && (
              <p className="text-xs text-dash-text-muted">{assets.length} assets</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
