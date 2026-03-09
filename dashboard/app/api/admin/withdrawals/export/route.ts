import { NextResponse } from "next/server";
import { getAdminSession } from "@/src/lib/adminAuth";
import { getAdminWithdrawals, type AdminWithdrawalRow } from "@/src/lib/adminData";

function csvEscape(val: unknown): string {
  const s = val === null || val === undefined ? "" : String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const CSV_KEYS: (keyof AdminWithdrawalRow)[] = [
  "id",
  "created_at",
  "user_id",
  "amount_cents",
  "status",
  "method",
  "note",
  "decided_at",
  "decided_by",
  "rejection_reason",
  "external_reference",
  "payment_channel",
  "admin_note",
];

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? undefined;
  const since = searchParams.get("since") ?? undefined;
  const q = searchParams.get("q") ?? undefined;

  const rows = await getAdminWithdrawals({
    status: status || undefined,
    since: since || undefined,
    searchId: q || undefined,
    limit: 500,
  });

  const lines = [
    CSV_KEYS.map(csvEscape).join(","),
    ...rows.map((r) => CSV_KEYS.map((k) => csvEscape(r[k])).join(",")),
  ];
  const csv = "\uFEFF" + lines.join("\r\n");
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="withdrawals-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
