/**
 * PulsePanel — Design system 2026 command center
 * Shell large, hiérarchie forte, composition éditoriale.
 */

export const dash = {
  /** Conteneur page (dans main du shell) */
  page: "min-h-full bg-dash-bg text-dash-text",
  /** Contenu principal — largeur command center */
  container: "mx-auto max-w-6xl px-4 sm:px-6 py-8",
  /** Contenu plus large (fiches, création) */
  containerWide: "mx-auto max-w-6xl px-4 sm:px-6 py-8",

  /** Cartes : surface élevée, ombre légère */
  card: "rounded-xl bg-dash-surface-2 p-4 shadow-[var(--dash-shadow)]",
  cardHover: "hover:bg-dash-surface-2/95 transition-colors",
  cardSecondary: "rounded-xl bg-dash-surface-2/90 p-4",

  /** Hero command center : bloc le plus mis en avant */
  hero: "rounded-2xl bg-dash-surface-3 p-8 md:p-10 shadow-[var(--dash-shadow)]",
  /** Titre hero / page */
  headlineHero: "text-3xl md:text-4xl font-semibold text-dash-text tracking-tight",
  headlineSection: "text-lg font-semibold text-dash-text tracking-tight",

  /** Titre section */
  sectionTitle: "text-base font-semibold text-dash-text tracking-tight",
  sectionSubtitle: "text-sm text-dash-text-secondary mt-0.5",
  /** Métrique valeur */
  metricValue: "text-xl font-semibold text-dash-text tabular-nums",
  metricLabel: "text-xs font-medium text-dash-text-muted uppercase tracking-wider",

  /** Badges : pills fond seul, SANS bordure */
  badge: "rounded-full px-2.5 py-0.5 text-xs font-medium",
  badgeSuccess: "bg-emerald-500/20 text-emerald-300",
  badgeWarning: "bg-amber-500/20 text-amber-300",
  badgeNeutral: "bg-zinc-500/15 text-zinc-400",
  badgeTest: "bg-amber-500/15 text-amber-400",
  badgeDanger: "bg-red-500/15 text-red-400",

  /** Boutons : primary rempli, secondary/ghost/danger par fond, SANS outline */
  btn: "rounded-[var(--dash-radius)] px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50",
  btnPrimary: "bg-dash-text text-dash-bg hover:opacity-90",
  btnSecondary: "bg-dash-surface-2 text-dash-text-secondary hover:bg-dash-surface hover:text-dash-text",
  btnGhost: "text-dash-text-secondary hover:bg-dash-surface-2 hover:text-dash-text",
  btnDanger: "bg-red-500/15 text-red-400 hover:bg-red-500/25",
  btnWarning: "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25",

  /** Actions rapides : icône style, SANS bordure */
  quickAction: "p-1.5 rounded-md text-dash-text-muted hover:bg-dash-surface-2 hover:text-dash-text-secondary disabled:opacity-50",
  quickActionDanger: "text-red-400/90 hover:bg-red-500/10",

  /** Liens */
  link: "text-dash-text-secondary hover:text-dash-text underline-offset-2 hover:underline",

  /** Bloc DEV : très discret */
  devBlock: "rounded-md bg-dash-surface-2/50 px-2.5 py-1.5 text-[10px] text-dash-text-muted/80 font-mono",
} as const;
