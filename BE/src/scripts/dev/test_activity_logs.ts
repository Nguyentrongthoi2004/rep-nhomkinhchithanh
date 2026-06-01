import { activityLogsService } from "../../modules/activity-logs/activity-logs.service";
import { supabaseAdmin } from "../../lib/supabase";

if (process.env.ALLOW_DEV_DB_MUTATION !== "true") {
  throw new Error(
    "Script nay co ghi/xoa dong smoke trong activity_logs. Set ALLOW_DEV_DB_MUTATION=true neu chac chan dang chay tren DB dev.",
  );
}

type AdminUserRow = {
  mand: number;
  hoten: string | null;
  tendangnhap: string | null;
};

type SmokeDetails = {
  smoke: boolean;
  nonce: string;
};

function expect(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function runStep(name: string, fn: () => Promise<void>) {
  process.stdout.write(`- ${name}... `);
  await fn();
  process.stdout.write("PASS\n");
}

async function main() {
  const nonce = `activity-log-smoke-${Date.now()}`;
  const targetId = `SMOKE-${nonce}`;
  const keepSmokeLog = process.env.KEEP_ACTIVITY_LOG_SMOKE === "true";
  let inserted = false;

  try {
    await runStep("activity_logs table is readable by service role", async () => {
      const { error } = await supabaseAdmin.from("activity_logs").select("id").limit(1);
      expect(!error, error?.message ?? "Cannot read activity_logs");
    });

    const { data: adminRows, error: adminError } = await supabaseAdmin
      .from("nguoidung")
      .select("mand, hoten, tendangnhap")
      .eq("vaitro", "ADMIN")
      .neq("trangthai", "NGHI_VIEC")
      .limit(1);

    expect(!adminError, adminError?.message ?? "Cannot query admin user");
    const admin = (adminRows?.[0] ?? null) as AdminUserRow | null;
    expect(admin, "Need at least one active ADMIN user in nguoidung to test user_id FK");

    await runStep("activityLogsService.record inserts a smoke log", async () => {
      await activityLogsService.record({
        userId: admin.mand,
        action: "ORDER_CREATED",
        targetType: "donhang",
        targetId,
        details: {
          smoke: true,
          nonce,
          tester: admin.tendangnhap,
        },
      });
      inserted = true;

      const { data, error } = await supabaseAdmin
        .from("activity_logs")
        .select("id, user_id, action, target_type, target_id, details")
        .eq("target_id", targetId)
        .maybeSingle();

      expect(!error, error?.message ?? "Cannot select inserted activity log");
      expect(data, "Smoke activity log was not inserted");
      expect(data.user_id === admin.mand, "Inserted log user_id mismatch");
      expect(data.action === "ORDER_CREATED", "Inserted log action mismatch");
      expect(data.target_type === "donhang", "Inserted log target_type mismatch");
      expect(data.target_id === targetId, "Inserted log target_id mismatch");
      expect((data.details as SmokeDetails | null)?.nonce === nonce, "Inserted log details.nonce mismatch");
    });

    await runStep("activityLogsService.list finds the smoke log by search", async () => {
      const result = await activityLogsService.list({ page: 1, pageSize: 5, q: targetId });
      const found = result.items.find((item) => item.target_id === targetId);
      expect(found, "Smoke log not found by q filter");
      expect(found.action === "ORDER_CREATED", "List q filter returned wrong action");
    });

    await runStep("activityLogsService.list filters by action, target type and user", async () => {
      const result = await activityLogsService.list({
        page: 1,
        pageSize: 5,
        action: "ORDER_CREATED",
        targetType: "donhang",
        userId: admin.mand,
        q: targetId,
      });
      expect(result.items.some((item) => item.target_id === targetId), "Smoke log not found by combined filters");
    });
  } finally {
    if (inserted && !keepSmokeLog) {
      const { error } = await supabaseAdmin.from("activity_logs").delete().eq("target_id", targetId);
      if (error) {
        console.error(`Cleanup failed for ${targetId}: ${error.message}`);
      } else {
        console.log(`- cleanup smoke log ${targetId}... PASS`);
      }
    } else if (inserted) {
      console.log(`- kept smoke log ${targetId} for manual Supabase verification`);
    }
  }
}

main().catch((error: unknown) => {
  console.error("\nActivity log smoke test failed:");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
