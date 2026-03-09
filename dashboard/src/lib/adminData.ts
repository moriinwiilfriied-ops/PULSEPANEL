/**
 * Données admin — lecture seule, serveur uniquement (supabaseAdmin).
 * Ne pas importer côté client.
 */

import { supabaseAdmin } from "@/src/lib/supabaseAdmin";

const DEFAULT_LIMIT = 200;

// --- Overview ---

export interface AdminOverviewStats {
  withdrawalsPendingCount: number;
  flagsOpenCount: number;
  campaignsActiveCount: number;
  responsesLast24hCount: number;
  orgTopupsLast7dCount: number;
  webhookEventsAvailable: boolean;
}

/** KPI pilot ops (RPC get_admin_pilot_kpis). Service role uniquement. */
export interface AdminPilotKpis {
  flags_open: number;
  webhook_errors_24h: number;
  webhook_errors_7d: number;
  withdrawals_pending: number;
  withdrawals_paid_7d: number;
  orgs_repeat_eligible: number;
  orgs_repeat_positive: number;
  repeat_rate: number | null;
}

export async function getAdminPilotKpis(): Promise<AdminPilotKpis | null> {
  const { data, error } = await supabaseAdmin.rpc("get_admin_pilot_kpis");
  if (error || data == null) return null;
  const o = data as Record<string, unknown>;
  return {
    flags_open: Number(o.flags_open ?? 0),
    webhook_errors_24h: Number(o.webhook_errors_24h ?? 0),
    webhook_errors_7d: Number(o.webhook_errors_7d ?? 0),
    withdrawals_pending: Number(o.withdrawals_pending ?? 0),
    withdrawals_paid_7d: Number(o.withdrawals_paid_7d ?? 0),
    orgs_repeat_eligible: Number(o.orgs_repeat_eligible ?? 0),
    orgs_repeat_positive: Number(o.orgs_repeat_positive ?? 0),
    repeat_rate: typeof o.repeat_rate === "number" ? o.repeat_rate : null,
  };
}

export async function getAdminOverviewStats(): Promise<AdminOverviewStats> {
  const [
    withdrawalsRes,
    flagsRes,
    campaignsRes,
    responsesRes,
    orgTopupsRes,
    webhookEventsRes,
  ] = await Promise.all([
    supabaseAdmin.from("withdrawals").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabaseAdmin.from("flags").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabaseAdmin.from("campaigns").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabaseAdmin
      .from("responses")
      .select("id", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    supabaseAdmin
      .from("org_topups")
      .select("id", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    supabaseAdmin.from("webhook_events").select("id", { count: "exact", head: true }).limit(1),
  ]);

  return {
    withdrawalsPendingCount: withdrawalsRes.count ?? 0,
    flagsOpenCount: flagsRes.count ?? 0,
    campaignsActiveCount: campaignsRes.count ?? 0,
    responsesLast24hCount: responsesRes.count ?? 0,
    orgTopupsLast7dCount: orgTopupsRes.count ?? 0,
    webhookEventsAvailable: !webhookEventsRes.error,
  };
}

// --- Users ---

export interface AdminUserRow {
  id: string;
  created_at: string;
  age_bucket: string | null;
  region: string | null;
  onboarding_completed: boolean;
  trust_level: string | null;
  trust_score: number;
  pending_cents: number;
  available_cents: number;
  withdrawals_count: number;
  flags_count: number;
  last_activity: string | null;
  withdrawals_frozen: boolean;
  withdrawals_frozen_reason: string | null;
}

export async function getAdminUsers(limit = DEFAULT_LIMIT): Promise<AdminUserRow[]> {
  const { data: users } = await supabaseAdmin
    .from("users")
    .select("id, created_at, age_bucket, region, onboarding_completed, trust_level, trust_score")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!users?.length) return [];

  const ids = users.map((u) => u.id);

  const [balances, withdrawalsCounts, flagsCounts, lastResponses, riskControls] = await Promise.all([
    supabaseAdmin.from("user_balances").select("user_id, pending_cents, available_cents").in("user_id", ids),
    supabaseAdmin.from("withdrawals").select("user_id"),
    supabaseAdmin.from("flags").select("user_id"),
    supabaseAdmin.from("responses").select("user_id, created_at").in("user_id", ids).order("created_at", { ascending: false }),
    supabaseAdmin.from("user_risk_controls").select("user_id, withdrawals_frozen, withdrawals_frozen_reason").in("user_id", ids),
  ]);

  const balanceByUser = new Map((balances.data ?? []).map((b) => [b.user_id, b]));
  const withdrawalsByUser = new Map<string, number>();
  (withdrawalsCounts.data ?? []).forEach((w) => {
    withdrawalsByUser.set(w.user_id, (withdrawalsByUser.get(w.user_id) ?? 0) + 1);
  });
  const flagsByUser = new Map<string, number>();
  (flagsCounts.data ?? []).forEach((f) => {
    if (f.user_id) flagsByUser.set(f.user_id, (flagsByUser.get(f.user_id) ?? 0) + 1);
  });
  const lastActivityByUser = new Map<string, string>();
  (lastResponses.data ?? []).forEach((r) => {
    if (!lastActivityByUser.has(r.user_id)) lastActivityByUser.set(r.user_id, r.created_at);
  });
  const riskByUser = new Map(
    (riskControls.data ?? []).map((r) => [
      r.user_id,
      { frozen: r.withdrawals_frozen ?? false, reason: r.withdrawals_frozen_reason ?? null },
    ])
  );

  return users.map((u) => {
    const bal = balanceByUser.get(u.id);
    const risk = riskByUser.get(u.id);
    return {
      id: u.id,
      created_at: u.created_at,
      age_bucket: u.age_bucket ?? null,
      region: u.region ?? null,
      onboarding_completed: u.onboarding_completed ?? false,
      trust_level: u.trust_level ?? null,
      trust_score: u.trust_score ?? 0,
      pending_cents: bal?.pending_cents ?? 0,
      available_cents: bal?.available_cents ?? 0,
      withdrawals_count: withdrawalsByUser.get(u.id) ?? 0,
      flags_count: flagsByUser.get(u.id) ?? 0,
      last_activity: lastActivityByUser.get(u.id) ?? null,
      withdrawals_frozen: risk?.frozen ?? false,
      withdrawals_frozen_reason: risk?.reason ?? null,
    };
  });
}

// --- Withdrawals ---

export interface AdminWithdrawalRow {
  id: string;
  created_at: string;
  user_id: string;
  amount_cents: number;
  status: string;
  method: string | null;
  note: string | null;
  decided_at: string | null;
  decided_by: string | null;
  rejection_reason: string | null;
  external_reference: string | null;
  payment_channel: string | null;
  admin_note: string | null;
}

export interface AdminWithdrawalDetail extends AdminWithdrawalRow {
  user_trust_level: string | null;
  user_trust_score: number | null;
  user_pending_cents: number;
  user_available_cents: number;
  user_withdrawals_count: number;
  user_flags_count: number;
}

export async function getAdminWithdrawals(opts?: {
  status?: string;
  limit?: number;
  since?: string;
  searchId?: string;
}): Promise<AdminWithdrawalRow[]> {
  let q = supabaseAdmin
    .from("withdrawals")
    .select("id, created_at, user_id, amount_cents, status, method, note, decided_at, decided_by, rejection_reason, external_reference, payment_channel, admin_note")
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? DEFAULT_LIMIT);

  if (opts?.status) q = q.eq("status", opts.status);
  if (opts?.since) q = q.gte("created_at", opts.since);
  if (opts?.searchId && opts.searchId.trim().length >= 4) {
    const s = opts.searchId.trim();
    q = q.ilike("user_id", `%${s}%`);
  }

  const { data } = await q;
  return (data ?? []) as AdminWithdrawalRow[];
}

export interface AdminWithdrawalsKpis {
  pendingCount: number;
  pendingTotalCents: number;
  paidCountLast30: number;
}

export async function getAdminWithdrawalsKpis(): Promise<AdminWithdrawalsKpis> {
  const [pendingRes, paidRes] = await Promise.all([
    supabaseAdmin
      .from("withdrawals")
      .select("id, amount_cents")
      .eq("status", "pending"),
    supabaseAdmin
      .from("withdrawals")
      .select("id", { count: "exact", head: true })
      .eq("status", "paid")
      .gte("decided_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
  ]);
  const pendingRows = (pendingRes.data ?? []) as { amount_cents: number }[];
  const pendingTotalCents = pendingRows.reduce((s, r) => s + r.amount_cents, 0);
  return {
    pendingCount: pendingRows.length,
    pendingTotalCents,
    paidCountLast30: paidRes.count ?? 0,
  };
}

export async function getAdminWithdrawalDetail(
  withdrawalId: string
): Promise<AdminWithdrawalDetail | null> {
  const { data: row, error } = await supabaseAdmin
    .from("withdrawals")
    .select("id, created_at, user_id, amount_cents, status, method, note, decided_at, decided_by, rejection_reason, external_reference, payment_channel, admin_note")
    .eq("id", withdrawalId)
    .maybeSingle();

  if (error || !row) return null;
  const w = row as AdminWithdrawalRow & Record<string, unknown>;

  const userId = w.user_id;
  const [userRes, balanceRes, withdrawalsCountRes, flagsCountRes] = await Promise.all([
    supabaseAdmin.from("users").select("trust_level, trust_score").eq("id", userId).maybeSingle(),
    supabaseAdmin.from("user_balances").select("pending_cents, available_cents").eq("user_id", userId).maybeSingle(),
    supabaseAdmin.from("withdrawals").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabaseAdmin.from("flags").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  const user = userRes.data as { trust_level?: string; trust_score?: number } | null;
  const balance = balanceRes.data as { pending_cents?: number; available_cents?: number } | null;

  return {
    ...w,
    user_trust_level: user?.trust_level ?? null,
    user_trust_score: user?.trust_score ?? null,
    user_pending_cents: balance?.pending_cents ?? 0,
    user_available_cents: balance?.available_cents ?? 0,
    user_withdrawals_count: withdrawalsCountRes.count ?? 0,
    user_flags_count: flagsCountRes.count ?? 0,
  };
}

// --- Flags ---

export interface AdminFlagRow {
  id: string;
  created_at: string;
  user_id: string | null;
  response_id: string | null;
  reason: string | null;
  severity: number | null;
  status: string | null;
  admin_note: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  campaign_id: string | null;
  campaign_question: string | null;
  user_trust_level: string | null;
  user_trust_score: number | null;
  user_withdrawals_frozen: boolean;
}

export interface AdminFlagsFilters {
  status?: string;
  severity?: number;
  search_user_id?: string;
  limit?: number;
}

export async function getAdminFlags(filters: AdminFlagsFilters | number = DEFAULT_LIMIT): Promise<AdminFlagRow[]> {
  const opts = typeof filters === "number" ? { limit: filters } : { ...filters, limit: filters.limit ?? DEFAULT_LIMIT };
  const limit = Math.min(opts.limit ?? DEFAULT_LIMIT, 500);

  let q = supabaseAdmin
    .from("flags")
    .select("id, created_at, user_id, response_id, reason, severity, status, admin_note, reviewed_at, reviewed_by")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (opts.status) q = q.eq("status", opts.status);
  if (opts.severity != null) q = q.eq("severity", opts.severity);
  if (opts.search_user_id?.trim()) q = q.ilike("user_id", `%${opts.search_user_id.trim()}%`);

  const { data: flags } = await q;
  if (!flags?.length) return [];

  const responseIds = flags.map((f) => f.response_id).filter(Boolean) as string[];
  const userIds = [...new Set(flags.map((f) => f.user_id).filter(Boolean))] as string[];

  const [responsesRes, usersRes, riskRes] = await Promise.all([
    responseIds.length > 0
      ? supabaseAdmin.from("responses").select("id, campaign_id, campaigns(question)").in("id", responseIds)
      : { data: [] as { id: string; campaign_id: string; campaigns?: { question?: string | null } | null }[] },
    userIds.length > 0 ? supabaseAdmin.from("users").select("id, trust_level, trust_score").in("id", userIds) : { data: [] as { id: string; trust_level: string | null; trust_score: number }[] },
    userIds.length > 0 ? supabaseAdmin.from("user_risk_controls").select("user_id, withdrawals_frozen").in("user_id", userIds) : { data: [] as { user_id: string; withdrawals_frozen: boolean }[] },
  ]);

  const responses = (responsesRes.data ?? []) as { id: string; campaign_id: string; campaigns?: { question?: string | null } | null }[];
  const users = (usersRes.data ?? []) as { id: string; trust_level: string | null; trust_score: number }[];
  const riskRows = (riskRes.data ?? []) as { user_id: string; withdrawals_frozen: boolean }[];

  const responseMap = new Map(responses.map((r) => [r.id, { campaign_id: r.campaign_id, question: r.campaigns?.question ?? null }]));
  const userMap = new Map(users.map((u) => [u.id, { trust_level: u.trust_level, trust_score: u.trust_score }]));
  const frozenByUser = new Map(riskRows.map((r) => [r.user_id, r.withdrawals_frozen ?? false]));

  return flags.map((f) => {
    const resp = f.response_id ? responseMap.get(f.response_id) : null;
    const u = f.user_id ? userMap.get(f.user_id) : null;
    return {
      id: f.id,
      created_at: f.created_at,
      user_id: f.user_id ?? null,
      response_id: f.response_id ?? null,
      reason: f.reason ?? null,
      severity: f.severity ?? null,
      status: f.status ?? null,
      admin_note: f.admin_note ?? null,
      reviewed_at: f.reviewed_at ?? null,
      reviewed_by: f.reviewed_by ?? null,
      campaign_id: resp?.campaign_id ?? null,
      campaign_question: resp?.question ?? null,
      user_trust_level: u?.trust_level ?? null,
      user_trust_score: u?.trust_score ?? null,
      user_withdrawals_frozen: f.user_id ? (frozenByUser.get(f.user_id) ?? false) : false,
    };
  });
}

export interface AdminFlagDetail extends AdminFlagRow {
  user_pending_cents: number;
  user_available_cents: number;
  user_withdrawals_count: number;
  user_flags_count: number;
  withdrawals_frozen_reason: string | null;
  withdrawals_frozen_at: string | null;
  withdrawals_frozen_by: string | null;
  user_devices: AdminUserDeviceRow[];
  user_shared_device_signals: AdminSharedDeviceSignal[];
}

export async function getAdminFlagDetail(flagId: string): Promise<AdminFlagDetail | null> {
  const { data: flag, error } = await supabaseAdmin
    .from("flags")
    .select("id, created_at, user_id, response_id, reason, severity, status, admin_note, reviewed_at, reviewed_by")
    .eq("id", flagId)
    .maybeSingle();

  if (error || !flag) return null;

  const userId = flag.user_id;
  if (!userId) {
    return {
      ...flag,
      admin_note: flag.admin_note ?? null,
      reviewed_at: flag.reviewed_at ?? null,
      reviewed_by: flag.reviewed_by ?? null,
      campaign_id: null,
      campaign_question: null,
      user_trust_level: null,
      user_trust_score: null,
      user_withdrawals_frozen: false,
      user_pending_cents: 0,
      user_available_cents: 0,
      user_withdrawals_count: 0,
      user_flags_count: 0,
      withdrawals_frozen_reason: null,
      withdrawals_frozen_at: null,
      withdrawals_frozen_by: null,
      user_devices: [],
      user_shared_device_signals: [],
    } as AdminFlagDetail;
  }

  const [respRes, userRes, balanceRes, withdrawalsCountRes, flagsCountRes, riskRes, userDevices, userSharedSignals] = await Promise.all([
    flag.response_id ? supabaseAdmin.from("responses").select("id, campaign_id, campaigns(question)").eq("id", flag.response_id).maybeSingle() : { data: null },
    supabaseAdmin.from("users").select("trust_level, trust_score").eq("id", userId).maybeSingle(),
    supabaseAdmin.from("user_balances").select("pending_cents, available_cents").eq("user_id", userId).maybeSingle(),
    supabaseAdmin.from("withdrawals").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabaseAdmin.from("flags").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabaseAdmin.from("user_risk_controls").select("withdrawals_frozen, withdrawals_frozen_reason, withdrawals_frozen_at, withdrawals_frozen_by").eq("user_id", userId).maybeSingle(),
    getAdminUserDevices(userId),
    getAdminSharedDeviceSignals(userId),
  ]);

  const resp = respRes.data as { campaign_id?: string; campaigns?: { question?: string | null } | null } | null;
  const user = userRes.data as { trust_level?: string; trust_score?: number } | null;
  const balance = balanceRes.data as { pending_cents?: number; available_cents?: number } | null;
  const risk = riskRes.data as { withdrawals_frozen?: boolean; withdrawals_frozen_reason?: string | null; withdrawals_frozen_at?: string | null; withdrawals_frozen_by?: string | null } | null;

  return {
    id: flag.id,
    created_at: flag.created_at,
    user_id: flag.user_id,
    response_id: flag.response_id ?? null,
    reason: flag.reason ?? null,
    severity: flag.severity ?? null,
    status: flag.status ?? null,
    admin_note: flag.admin_note ?? null,
    reviewed_at: flag.reviewed_at ?? null,
    reviewed_by: flag.reviewed_by ?? null,
    campaign_id: resp?.campaign_id ?? null,
    campaign_question: resp?.campaigns?.question ?? null,
    user_trust_level: user?.trust_level ?? null,
    user_trust_score: user?.trust_score ?? null,
    user_withdrawals_frozen: risk?.withdrawals_frozen ?? false,
    user_pending_cents: balance?.pending_cents ?? 0,
    user_available_cents: balance?.available_cents ?? 0,
    user_withdrawals_count: withdrawalsCountRes.count ?? 0,
    user_flags_count: flagsCountRes.count ?? 0,
    withdrawals_frozen_reason: risk?.withdrawals_frozen_reason ?? null,
    withdrawals_frozen_at: risk?.withdrawals_frozen_at ?? null,
    withdrawals_frozen_by: risk?.withdrawals_frozen_by ?? null,
    user_devices: userDevices ?? [],
    user_shared_device_signals: userSharedSignals ?? [],
  };
}

// --- User devices (admin-only, fraude/support) ---

export interface AdminUserDeviceRow {
  id: string;
  device_hash: string;
  platform: string | null;
  app_version: string | null;
  first_seen_at: string;
  last_seen_at: string;
}

export async function getAdminUserDevices(userId: string): Promise<AdminUserDeviceRow[]> {
  const { data } = await supabaseAdmin
    .from("user_devices")
    .select("id, device_hash, platform, app_version, first_seen_at, last_seen_at")
    .eq("user_id", userId)
    .order("last_seen_at", { ascending: false })
    .limit(50);
  return (data ?? []) as AdminUserDeviceRow[];
}

export interface AdminSharedDeviceSignal {
  device_hash: string;
  other_users_count: number;
  other_user_ids: string[];
}

/** Pour chaque device du user, indique combien d’autres users partagent le même device_hash (et leurs ids). */
export async function getAdminSharedDeviceSignals(userId: string): Promise<AdminSharedDeviceSignal[]> {
  const devices = await getAdminUserDevices(userId);
  if (devices.length === 0) return [];

  const deviceHashes = [...new Set(devices.map((d) => d.device_hash))];
  const signals: AdminSharedDeviceSignal[] = [];

  for (const hash of deviceHashes) {
    const { data: rows } = await supabaseAdmin
      .from("user_devices")
      .select("user_id")
      .eq("device_hash", hash)
      .neq("user_id", userId);
    const otherIds = [...new Set((rows ?? []).map((r: { user_id: string }) => r.user_id))];
    if (otherIds.length > 0) {
      signals.push({
        device_hash: hash,
        other_users_count: otherIds.length,
        other_user_ids: otherIds,
      });
    }
  }
  return signals;
}

// --- User risk controls (admin-only) ---

export interface UserRiskControlRow {
  user_id: string;
  withdrawals_frozen: boolean;
  withdrawals_frozen_reason: string | null;
  withdrawals_frozen_at: string | null;
  withdrawals_frozen_by: string | null;
  admin_note: string | null;
  updated_at: string;
}

export async function getAdminUserRiskControl(userId: string): Promise<UserRiskControlRow | null> {
  const { data } = await supabaseAdmin
    .from("user_risk_controls")
    .select("user_id, withdrawals_frozen, withdrawals_frozen_reason, withdrawals_frozen_at, withdrawals_frozen_by, admin_note, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  return data as UserRiskControlRow | null;
}

export interface AdminUserDailyLimitStatus {
  trust_level: string;
  valid_responses_today: number;
  reward_cents_today: number;
  withdrawal_requests_today: number;
  max_valid_responses_per_day: number;
  max_reward_cents_per_day: number;
  max_withdrawal_requests_per_day: number;
  remaining_valid_responses_today: number;
  remaining_reward_cents_today: number;
  remaining_withdrawal_requests_today: number;
  shared_device_users_count?: number;
  open_flags_count?: number;
}

export interface AdminUserDetail extends AdminUserRow {
  risk_control: UserRiskControlRow | null;
  devices: AdminUserDeviceRow[];
  shared_device_signals: AdminSharedDeviceSignal[];
  daily_limit_status: AdminUserDailyLimitStatus | null;
}

export async function getAdminUserDetail(userId: string): Promise<AdminUserDetail | null> {
  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select("id, created_at, age_bucket, region, onboarding_completed, trust_level, trust_score")
    .eq("id", userId)
    .maybeSingle();
  if (error || !user) return null;

  const [balRes, withdrawalsCountRes, flagsCountRes, lastRespRes, riskRes, devices, sharedSignals, dailyLimitRes] = await Promise.all([
    supabaseAdmin.from("user_balances").select("pending_cents, available_cents").eq("user_id", userId).maybeSingle(),
    supabaseAdmin.from("withdrawals").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabaseAdmin.from("flags").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabaseAdmin.from("responses").select("created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabaseAdmin.from("user_risk_controls").select("user_id, withdrawals_frozen, withdrawals_frozen_reason, withdrawals_frozen_at, withdrawals_frozen_by, admin_note, updated_at").eq("user_id", userId).maybeSingle(),
    getAdminUserDevices(userId),
    getAdminSharedDeviceSignals(userId),
    supabaseAdmin.rpc("get_admin_user_daily_limit_status", { _user_id: userId }),
  ]);

  const bal = balRes.data as { pending_cents?: number; available_cents?: number } | null;
  const risk = riskRes.data as UserRiskControlRow | null;
  const dailyData = dailyLimitRes.data as AdminUserDailyLimitStatus | { error?: string } | null;
  const daily_limit_status =
    dailyData && !("error" in dailyData && dailyData.error) ? (dailyData as AdminUserDailyLimitStatus) : null;

  return {
    id: user.id,
    created_at: user.created_at,
    age_bucket: user.age_bucket ?? null,
    region: user.region ?? null,
    onboarding_completed: user.onboarding_completed ?? false,
    trust_level: user.trust_level ?? null,
    trust_score: user.trust_score ?? 0,
    pending_cents: bal?.pending_cents ?? 0,
    available_cents: bal?.available_cents ?? 0,
    withdrawals_count: withdrawalsCountRes.count ?? 0,
    flags_count: flagsCountRes.count ?? 0,
    last_activity: (lastRespRes.data as { created_at?: string } | null)?.created_at ?? null,
    withdrawals_frozen: risk?.withdrawals_frozen ?? false,
    withdrawals_frozen_reason: risk?.withdrawals_frozen_reason ?? null,
    risk_control: risk,
    devices: devices ?? [],
    shared_device_signals: sharedSignals ?? [],
    daily_limit_status,
  };
}

// --- Ledger (user) ---

export interface AdminLedgerEntryRow {
  id: string;
  created_at: string;
  entity_type: string;
  entity_id: string | null;
  amount_cents: number;
  currency: string | null;
  reason: string | null;
  ref_id: string | null;
  status: string | null;
}

export async function getAdminLedgerEntries(limit = DEFAULT_LIMIT): Promise<AdminLedgerEntryRow[]> {
  const { data } = await supabaseAdmin
    .from("ledger_entries")
    .select("id, created_at, entity_type, entity_id, amount_cents, currency, reason, ref_id, status")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as AdminLedgerEntryRow[];
}

// --- Ledger (org) ---

export interface AdminOrgLedgerRow {
  id: string;
  created_at: string;
  org_id: string;
  amount_cents: number;
  reason: string | null;
  campaign_id: string | null;
}

export async function getAdminOrgLedgerEntries(limit = DEFAULT_LIMIT): Promise<AdminOrgLedgerRow[]> {
  const { data } = await supabaseAdmin
    .from("org_ledger_entries")
    .select("id, created_at, org_id, amount_cents, reason, campaign_id")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as AdminOrgLedgerRow[];
}

// --- Campaigns (cross-org, admin global) ---

export interface AdminCampaignRow {
  id: string;
  org_id: string | null;
  org_name: string | null;
  name: string | null;
  template: string | null;
  template_key: string | null;
  question: string | null;
  status: string;
  quota: number;
  responses_count: number;
  reward_cents: number;
  price_cents: number;
  cost_per_response_cents: number;
  cost_total_cents: number;
  billing_status: string | null;
  created_at: string;
  pct_valid: number | null;
  pct_too_fast: number | null;
  pct_empty: number | null;
  flags_count: number;
}

export interface AdminCampaignsFilters {
  status?: string;
  org_id?: string;
  search?: string; // id ou question/name
  limit?: number;
}

export async function getAdminCampaigns(filters: AdminCampaignsFilters = {}): Promise<AdminCampaignRow[]> {
  const limit = Math.min(filters.limit ?? 200, 500);
  let q = supabaseAdmin
    .from("campaigns")
    .select("id, org_id, name, template, template_key, question, status, quota, responses_count, reward_cents, price_cents, cost_per_response_cents, cost_total_cents, billing_status, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filters.status) q = q.eq("status", filters.status);
  if (filters.org_id) q = q.eq("org_id", filters.org_id);
  if (filters.search?.trim()) {
    const s = filters.search.trim();
    q = q.or(`id.ilike.%${s}%,question.ilike.%${s}%,name.ilike.%${s}%`);
  }

  const { data: campaigns } = await q;
  if (!campaigns?.length) return [];

  const orgIds = [...new Set((campaigns as { org_id?: string }[]).map((c) => c.org_id).filter(Boolean))] as string[];
  const campaignIds = campaigns.map((c) => c.id);

  const [orgsRes, qualityRes, flagsCountRes] = await Promise.all([
    orgIds.length > 0 ? supabaseAdmin.from("orgs").select("id, name").in("id", orgIds) : { data: [] as { id: string; name: string }[] },
    supabaseAdmin.from("campaign_quality_stats").select("campaign_id, pct_valid, pct_too_fast, pct_empty").in("campaign_id", campaignIds),
    supabaseAdmin.from("responses").select("id, campaign_id").in("campaign_id", campaignIds),
  ]);

  const orgs = (orgsRes.data ?? []) as { id: string; name: string }[];
  const qualityRows = (qualityRes.data ?? []) as { campaign_id: string; pct_valid?: number; pct_too_fast?: number; pct_empty?: number }[];
  const responsesForFlags = (flagsCountRes.data ?? []) as { id: string; campaign_id: string }[];
  const responseIds = responsesForFlags.map((r) => r.id);

  const orgByName = new Map(orgs.map((o) => [o.id, o.name]));
  const qualityByCampaign = new Map(qualityRows.map((q) => [q.campaign_id, q]));
  const responsesByCampaign = new Map<string, string[]>();
  responsesForFlags.forEach((r) => {
    const list = responsesByCampaign.get(r.campaign_id) ?? [];
    list.push(r.id);
    responsesByCampaign.set(r.campaign_id, list);
  });

  let flagsByResponse: Map<string, number> = new Map();
  if (responseIds.length > 0) {
    const flagsRes = await supabaseAdmin.from("flags").select("response_id").in("response_id", responseIds);
    const flagsList = (flagsRes.data ?? []) as { response_id: string }[];
    flagsList.forEach((f) => flagsByResponse.set(f.response_id, (flagsByResponse.get(f.response_id) ?? 0) + 1));
  }
  const flagsByCampaign = new Map<string, number>();
  responsesByCampaign.forEach((respIds, campId) => {
    const count = respIds.reduce((s, rid) => s + (flagsByResponse.get(rid) ?? 0), 0);
    flagsByCampaign.set(campId, count);
  });

  return campaigns.map((c) => {
    const qq = qualityByCampaign.get(c.id);
    return {
      id: c.id,
      org_id: c.org_id ?? null,
      org_name: c.org_id ? (orgByName.get(c.org_id) ?? null) : null,
      name: c.name ?? null,
      template: c.template ?? null,
      template_key: c.template_key ?? null,
      question: c.question ?? null,
      status: c.status ?? "active",
      quota: c.quota ?? 0,
      responses_count: c.responses_count ?? 0,
      reward_cents: c.reward_cents ?? 0,
      price_cents: c.price_cents ?? 0,
      cost_per_response_cents: c.cost_per_response_cents ?? 0,
      cost_total_cents: c.cost_total_cents ?? 0,
      billing_status: c.billing_status ?? null,
      created_at: c.created_at,
      pct_valid: qq?.pct_valid ?? null,
      pct_too_fast: qq?.pct_too_fast ?? null,
      pct_empty: qq?.pct_empty ?? null,
      flags_count: flagsByCampaign.get(c.id) ?? 0,
    };
  });
}

export interface AdminCampaignDetail extends AdminCampaignRow {
  options: unknown;
  targeting: unknown;
  template_version: number | null;
  total_responses: number | null;
  valid_responses: number | null;
  invalid_responses: number | null;
}

export async function getAdminCampaignDetail(id: string): Promise<AdminCampaignDetail | null> {
  const { data: c, error } = await supabaseAdmin
    .from("campaigns")
    .select("id, org_id, name, template, template_key, template_version, question, options, targeting, status, quota, responses_count, reward_cents, price_cents, cost_per_response_cents, cost_total_cents, billing_status, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error || !c) return null;

  const [orgRes, qualityRes, respIdsRes] = await Promise.all([
    c.org_id ? supabaseAdmin.from("orgs").select("id, name").eq("id", c.org_id).maybeSingle() : { data: null },
    supabaseAdmin.from("campaign_quality_stats").select("campaign_id, total_responses, valid_responses, invalid_responses, pct_valid, pct_too_fast, pct_empty").eq("campaign_id", id).maybeSingle(),
    supabaseAdmin.from("responses").select("id").eq("campaign_id", id),
  ]);

  const org = orgRes.data as { name: string } | null;
  const quality = qualityRes.data as { total_responses?: number; valid_responses?: number; invalid_responses?: number; pct_valid?: number; pct_too_fast?: number; pct_empty?: number } | null;
  const responseIds = (respIdsRes.data ?? []).map((r: { id: string }) => r.id);

  let flagsCount = 0;
  if (responseIds.length > 0) {
    const fc = await supabaseAdmin.from("flags").select("id", { count: "exact", head: true }).in("response_id", responseIds);
    flagsCount = fc.count ?? 0;
  }

  return {
    id: c.id,
    org_id: c.org_id ?? null,
    org_name: c.org_id && org ? org.name : null,
    name: c.name ?? null,
    template: c.template ?? null,
    template_key: c.template_key ?? null,
    question: c.question ?? null,
    status: c.status ?? "active",
    quota: c.quota ?? 0,
    responses_count: c.responses_count ?? 0,
    reward_cents: c.reward_cents ?? 0,
    price_cents: c.price_cents ?? 0,
    cost_per_response_cents: c.cost_per_response_cents ?? 0,
    cost_total_cents: c.cost_total_cents ?? 0,
    billing_status: c.billing_status ?? null,
    created_at: c.created_at,
    pct_valid: quality?.pct_valid ?? null,
    pct_too_fast: quality?.pct_too_fast ?? null,
    pct_empty: quality?.pct_empty ?? null,
    flags_count: flagsCount,
    options: c.options ?? [],
    targeting: c.targeting ?? {},
    template_version: c.template_version ?? null,
    total_responses: quality?.total_responses ?? null,
    valid_responses: quality?.valid_responses ?? null,
    invalid_responses: quality?.invalid_responses ?? null,
  };
}

export interface AdminCampaignQualityRow {
  campaign_id: string;
  total_responses: number;
  valid_responses: number;
  invalid_responses: number;
  pct_valid: number;
  pct_too_fast: number;
  pct_empty: number;
}

export async function getAdminCampaignQuality(campaignId: string): Promise<AdminCampaignQualityRow | null> {
  const { data } = await supabaseAdmin
    .from("campaign_quality_stats")
    .select("campaign_id, total_responses, valid_responses, invalid_responses, pct_valid, pct_too_fast, pct_empty")
    .eq("campaign_id", campaignId)
    .maybeSingle();
  return data as AdminCampaignQualityRow | null;
}

export interface AdminCampaignStats {
  activeCount: number;
  pausedCount: number;
  completedCount: number;
  completedLast7d: number;
  completedLast30d: number;
  withFlagsCount: number;
}

export async function getAdminCampaignStats(): Promise<AdminCampaignStats> {
  const now = new Date();
  const since7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const since30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [activeRes, pausedRes, completedRes, completed7Res, completed30Res, campaignsRes] = await Promise.all([
    supabaseAdmin.from("campaigns").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabaseAdmin.from("campaigns").select("id", { count: "exact", head: true }).eq("status", "paused"),
    supabaseAdmin.from("campaigns").select("id", { count: "exact", head: true }).eq("status", "completed"),
    supabaseAdmin.from("campaigns").select("id", { count: "exact", head: true }).eq("status", "completed").gte("created_at", since7),
    supabaseAdmin.from("campaigns").select("id", { count: "exact", head: true }).eq("status", "completed").gte("created_at", since30),
    supabaseAdmin.from("campaigns").select("id"),
  ]);

  const campaignIds = (campaignsRes.data ?? []).map((c: { id: string }) => c.id);
  let withFlagsCount = 0;
  if (campaignIds.length > 0) {
    const respRes = await supabaseAdmin.from("responses").select("id, campaign_id").in("campaign_id", campaignIds);
    const resps = (respRes.data ?? []) as { id: string; campaign_id: string }[];
    const responseIds = resps.map((r) => r.id);
    if (responseIds.length > 0) {
      const flagsRes = await supabaseAdmin.from("flags").select("response_id").in("response_id", responseIds);
      const flaggedResponseIds = new Set((flagsRes.data ?? []).map((f: { response_id: string }) => f.response_id));
      const campaignIdsWithFlags = new Set<string>();
      resps.forEach((r) => {
        if (flaggedResponseIds.has(r.id)) campaignIdsWithFlags.add(r.campaign_id);
      });
      withFlagsCount = campaignIdsWithFlags.size;
    }
  }

  return {
    activeCount: activeRes.count ?? 0,
    pausedCount: pausedRes.count ?? 0,
    completedCount: completedRes.count ?? 0,
    completedLast7d: completed7Res.count ?? 0,
    completedLast30d: completed30Res.count ?? 0,
    withFlagsCount,
  };
}

// --- Webhooks (audit webhook_events + org_topups pour lien) ---

export interface AdminWebhookEventRow {
  id: string;
  provider: string;
  event_id: string;
  event_type: string;
  livemode: boolean | null;
  api_version?: string | null;
  created_ts?: string | null;
  received_at: string;
  processing_status: string;
  processing_error: string | null;
  processed_at: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  org_id: string | null;
  payload_summary: Record<string, unknown> | null;
  source_route: string | null;
}

export interface AdminWebhookEventsFilters {
  status?: string;
  event_type?: string;
  search?: string; // event_id ou stripe_checkout_session_id
  limit?: number;
}

export async function getAdminWebhookEvents(
  filters: AdminWebhookEventsFilters = {}
): Promise<AdminWebhookEventRow[]> {
  const limit = Math.min(filters.limit ?? 100, 500);
  let q = supabaseAdmin
    .from("webhook_events")
    .select(
      "id, provider, event_id, event_type, livemode, received_at, processing_status, processing_error, processed_at, stripe_checkout_session_id, stripe_payment_intent_id, org_id, payload_summary, source_route"
    )
    .order("received_at", { ascending: false })
    .limit(limit);

  if (filters.status) {
    q = q.eq("processing_status", filters.status);
  }
  if (filters.event_type) {
    q = q.eq("event_type", filters.event_type);
  }
  if (filters.search?.trim()) {
    const s = filters.search.trim();
    q = q.or(`event_id.ilike.%${s}%,stripe_checkout_session_id.ilike.%${s}%`);
  }

  const { data } = await q;
  return (data ?? []) as AdminWebhookEventRow[];
}

export async function getAdminWebhookEventDetail(id: string): Promise<AdminWebhookEventRow | null> {
  const { data } = await supabaseAdmin
    .from("webhook_events")
    .select(
      "id, provider, event_id, event_type, livemode, api_version, created_ts, received_at, processing_status, processing_error, processed_at, stripe_checkout_session_id, stripe_payment_intent_id, org_id, payload_summary, source_route"
    )
    .eq("id", id)
    .maybeSingle();
  return data as AdminWebhookEventRow | null;
}

export interface AdminWebhookStats {
  eventsLast24h: number;
  errorsLast24h: number;
  ignoredOrReceivedLast24h: number;
  checkoutCompletedLast24h: number;
}

export async function getAdminWebhookStats(): Promise<AdminWebhookStats> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [
    eventsRes,
    errorsRes,
    ignoredRes,
    checkoutRes,
  ] = await Promise.all([
    supabaseAdmin.from("webhook_events").select("id", { count: "exact", head: true }).gte("received_at", since),
    supabaseAdmin.from("webhook_events").select("id", { count: "exact", head: true }).gte("received_at", since).eq("processing_status", "error"),
    supabaseAdmin.from("webhook_events").select("id", { count: "exact", head: true }).gte("received_at", since).in("processing_status", ["ignored", "received"]),
    supabaseAdmin.from("webhook_events").select("id", { count: "exact", head: true }).gte("received_at", since).eq("event_type", "checkout.session.completed"),
  ]);
  return {
    eventsLast24h: eventsRes.count ?? 0,
    errorsLast24h: errorsRes.count ?? 0,
    ignoredOrReceivedLast24h: ignoredRes.count ?? 0,
    checkoutCompletedLast24h: checkoutRes.count ?? 0,
  };
}

export interface AdminOrgTopupRow {
  id: string;
  created_at: string;
  org_id: string;
  stripe_checkout_session_id: string;
  stripe_payment_intent_id: string | null;
  amount_cents: number;
  currency: string;
  status: string;
  paid_at: string | null;
}

export async function getAdminOrgTopups(limit = 100): Promise<AdminOrgTopupRow[]> {
  const { data } = await supabaseAdmin
    .from("org_topups")
    .select("id, created_at, org_id, stripe_checkout_session_id, stripe_payment_intent_id, amount_cents, currency, status, paid_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as AdminOrgTopupRow[];
}
