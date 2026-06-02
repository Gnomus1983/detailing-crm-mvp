import { createClient } from "npm:@supabase/supabase-js@2";
import { createAutomationRun } from "../_shared/automation-log.ts";
import { escapeTelegramHtml, sendTelegramMessage } from "../_shared/telegram.ts";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

function startOfUtcDayIso() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  return start.toISOString();
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const internalToken = Deno.env.get("ALERT_INTERNAL_TOKEN");
  if (internalToken) {
    const provided = request.headers.get("x-internal-token");
    if (provided !== internalToken) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
  }

  const telegramBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const telegramChatId = Deno.env.get("TELEGRAM_MANAGER_CHAT_ID");

  if (!telegramBotToken || !telegramChatId) {
    return jsonResponse(
      {
        error: "Missing TELEGRAM_BOT_TOKEN or TELEGRAM_MANAGER_CHAT_ID"
      },
      500
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const nowIso = new Date().toISOString();
  const todayStartIso = startOfUtcDayIso();
  const digestDay = nowIso.slice(0, 10);

  await createAutomationRun(supabase, {
    automation_key: "daily_digest",
    status: "started",
    scope_key: digestDay,
    payload: {
      day: digestDay
    }
  });

  const { data: existingDigestRun } = await supabase
    .from("automation_runs")
    .select("id")
    .eq("automation_key", "daily_digest")
    .eq("status", "success")
    .eq("scope_key", digestDay)
    .limit(1)
    .maybeSingle();

  if (existingDigestRun?.id) {
    await createAutomationRun(supabase, {
      automation_key: "daily_digest",
      status: "skipped",
      scope_key: digestDay,
      payload: {
        day: digestDay,
        reason: "already_sent_today"
      }
    });

    return jsonResponse({
      ok: true,
      skipped: true,
      reason: "Digest already sent today"
    });
  }

  const [
    { count: newLeadsCount, error: newLeadsError },
    { count: overdueFollowUpsCount, error: overdueError },
    { count: activeLeadsCount, error: activeError },
    { count: doneTodayCount, error: doneTodayError }
  ] = await Promise.all([
    supabase.from("leads").select("*", { count: "exact", head: true }).gte("created_at", todayStartIso),
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .not("follow_up_at", "is", null)
      .lte("follow_up_at", nowIso)
      .in("status", ["new", "contacted", "quoted", "scheduled", "in_progress"]),
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .in("status", ["contacted", "quoted", "scheduled", "in_progress"]),
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("status", "done")
      .gte("updated_at", todayStartIso)
  ]);

  const firstError = newLeadsError || overdueError || activeError || doneTodayError;
  if (firstError) {
    await createAutomationRun(supabase, {
      automation_key: "daily_digest",
      status: "error",
      scope_key: digestDay,
      payload: {
        day: digestDay
      },
      error_message: firstError.message
    });
    return jsonResponse({ error: firstError.message }, 500);
  }

  try {
    const message = [
      "<b>Daily CRM digest</b>",
      "",
      `<b>Date:</b> ${escapeTelegramHtml(digestDay)}`,
      `<b>New leads today:</b> ${escapeTelegramHtml(String(newLeadsCount || 0))}`,
      `<b>Overdue follow-ups:</b> ${escapeTelegramHtml(String(overdueFollowUpsCount || 0))}`,
      `<b>Active leads:</b> ${escapeTelegramHtml(String(activeLeadsCount || 0))}`,
      `<b>Done today:</b> ${escapeTelegramHtml(String(doneTodayCount || 0))}`
    ].join("\n");

    const telegramResult = await sendTelegramMessage({
      botToken: telegramBotToken,
      chatId: telegramChatId,
      text: message
    });

    await createAutomationRun(supabase, {
      automation_key: "daily_digest",
      status: "success",
      scope_key: digestDay,
      payload: {
        day: digestDay,
        new_leads: newLeadsCount || 0,
        overdue_follow_ups: overdueFollowUpsCount || 0,
        active_leads: activeLeadsCount || 0,
        done_today: doneTodayCount || 0,
        telegram_message_id: telegramResult?.result?.message_id ?? null
      }
    });

    return jsonResponse({
      ok: true,
      digest_day: digestDay,
      stats: {
        new_leads: newLeadsCount || 0,
        overdue_follow_ups: overdueFollowUpsCount || 0,
        active_leads: activeLeadsCount || 0,
        done_today: doneTodayCount || 0
      },
      telegram_message_id: telegramResult?.result?.message_id ?? null
    });
  } catch (error) {
    await createAutomationRun(supabase, {
      automation_key: "daily_digest",
      status: "error",
      scope_key: digestDay,
      payload: {
        day: digestDay,
        new_leads: newLeadsCount || 0,
        overdue_follow_ups: overdueFollowUpsCount || 0,
        active_leads: activeLeadsCount || 0,
        done_today: doneTodayCount || 0
      },
      error_message: error instanceof Error ? error.message : String(error)
    });

    return jsonResponse(
      {
        error: error instanceof Error ? error.message : String(error)
      },
      500
    );
  }
});
