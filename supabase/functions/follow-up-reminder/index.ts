import { createClient } from "npm:@supabase/supabase-js@2";
import { createAutomationRun } from "../_shared/automation-log.ts";
import { escapeTelegramHtml, sendTelegramMessage } from "../_shared/telegram.ts";

type DueLead = {
  id: string;
  source: string | null;
  status: string;
  follow_up_at: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  comment: string | null;
  estimated_price: number | string | null;
  clients: {
    name: string | null;
    phone: string | null;
    car_make: string | null;
    car_model: string | null;
    car_year: number | null;
  } | null;
  services: {
    name: string | null;
  } | null;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

function formatLeadReminder(lead: DueLead) {
  const clientName = lead.clients?.name || "Unknown client";
  const phone = lead.clients?.phone || "No phone";
  const service = lead.services?.name || "Service not selected";
  const source = lead.source || "manual";
  const followUpAt = lead.follow_up_at || "Not set";
  const preferredSlot = lead.preferred_date
    ? `${lead.preferred_date}${lead.preferred_time ? ` ${lead.preferred_time}` : ""}`
    : "Not set";
  const car = [lead.clients?.car_make, lead.clients?.car_model, lead.clients?.car_year].filter(Boolean).join(" ") || "No car details";
  const comment = lead.comment || "No comment";
  const price = lead.estimated_price != null && lead.estimated_price !== "" ? `EUR ${lead.estimated_price}` : "Not estimated";

  return [
    "<b>Follow-up due</b>",
    "",
    `<b>Client:</b> ${escapeTelegramHtml(clientName)}`,
    `<b>Phone:</b> ${escapeTelegramHtml(phone)}`,
    `<b>Service:</b> ${escapeTelegramHtml(service)}`,
    `<b>Source:</b> ${escapeTelegramHtml(source)}`,
    `<b>Car:</b> ${escapeTelegramHtml(car)}`,
    `<b>Preferred slot:</b> ${escapeTelegramHtml(preferredSlot)}`,
    `<b>Follow-up at:</b> ${escapeTelegramHtml(followUpAt)}`,
    `<b>Estimated price:</b> ${escapeTelegramHtml(price)}`,
    `<b>Lead ID:</b> ${escapeTelegramHtml(lead.id)}`,
    "",
    `<b>Comment:</b> ${escapeTelegramHtml(comment)}`
  ].join("\n");
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
  const todayKey = nowIso.slice(0, 10);

  await createAutomationRun(supabase, {
    automation_key: "follow_up_reminder_batch",
    status: "started",
    scope_key: todayKey,
    payload: {
      day: todayKey
    }
  });

  const { data: dueLeads, error: leadsError } = await supabase
    .from("leads")
    .select("id, source, status, follow_up_at, preferred_date, preferred_time, comment, estimated_price, clients(name, phone, car_make, car_model, car_year), services(name)")
    .not("follow_up_at", "is", null)
    .lte("follow_up_at", nowIso)
    .in("status", ["new", "contacted", "quoted", "scheduled", "in_progress"]);

  if (leadsError) {
    await createAutomationRun(supabase, {
      automation_key: "follow_up_reminder_batch",
      status: "error",
      scope_key: todayKey,
      payload: {
        day: todayKey
      },
      error_message: leadsError.message
    });
    return jsonResponse({ error: leadsError.message }, 500);
  }

  const leads = (dueLeads || []) as DueLead[];
  const processed: string[] = [];
  const skipped: string[] = [];
  const failed: string[] = [];

  for (const lead of leads) {
    const { data: existingRun } = await supabase
      .from("automation_runs")
      .select("id")
      .eq("automation_key", "follow_up_reminder")
      .eq("status", "success")
      .eq("scope_key", `${todayKey}:${lead.id}`)
      .limit(1)
      .maybeSingle();

    if (existingRun?.id) {
      await createAutomationRun(supabase, {
        automation_key: "follow_up_reminder",
        status: "skipped",
        scope_key: `${todayKey}:${lead.id}`,
        lead_id: lead.id,
        payload: {
          reason: "already_sent_today",
          day: todayKey
        }
      });
      skipped.push(lead.id);
      continue;
    }

    await createAutomationRun(supabase, {
      automation_key: "follow_up_reminder",
      status: "started",
      scope_key: `${todayKey}:${lead.id}`,
      lead_id: lead.id,
      payload: {
        day: todayKey
      }
    });

    try {
      const text = formatLeadReminder(lead);

      await sendTelegramMessage({
        botToken: telegramBotToken,
        chatId: telegramChatId,
        text
      });

      await supabase.from("lead_events").insert({
        lead_id: lead.id,
        type: "reminder_sent",
        note: "Telegram follow-up reminder sent to manager.",
        payload: {
          channel: "telegram",
          trigger: "follow_up_due",
          day: todayKey
        }
      });

      await createAutomationRun(supabase, {
        automation_key: "follow_up_reminder",
        status: "success",
        scope_key: `${todayKey}:${lead.id}`,
        lead_id: lead.id,
        payload: {
          day: todayKey
        }
      });

      processed.push(lead.id);
    } catch (error) {
      await createAutomationRun(supabase, {
        automation_key: "follow_up_reminder",
        status: "error",
        scope_key: `${todayKey}:${lead.id}`,
        lead_id: lead.id,
        payload: {
          day: todayKey
        },
        error_message: error instanceof Error ? error.message : String(error)
      });
      failed.push(lead.id);
    }
  }

  await createAutomationRun(supabase, {
    automation_key: "follow_up_reminder_batch",
    status: failed.length ? "error" : "success",
    scope_key: todayKey,
    payload: {
      day: todayKey,
      processed_count: processed.length,
      skipped_count: skipped.length,
      failed_count: failed.length
    },
    error_message: failed.length ? `Some reminders failed: ${failed.join(", ")}` : null
  });

  return jsonResponse({
    ok: true,
    processed_count: processed.length,
    skipped_count: skipped.length,
    failed_count: failed.length,
    processed,
    skipped,
    failed
  });
});
