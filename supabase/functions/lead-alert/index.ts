import { createClient } from "npm:@supabase/supabase-js@2";
import { createAutomationRun } from "../_shared/automation-log.ts";
import { escapeTelegramHtml, sendTelegramMessage } from "../_shared/telegram.ts";

type LeadAlertPayload = {
  event?: string;
  public_entry?: boolean;
  lead?: {
    id?: string;
    source?: string | null;
    preferred_date?: string | null;
    preferred_time?: string | null;
    comment?: string | null;
    estimated_price?: number | string | null;
    follow_up_at?: string | null;
    services?: { name?: string | null } | null;
    clients?: {
      name?: string | null;
      phone?: string | null;
      car_make?: string | null;
      car_model?: string | null;
      car_year?: number | null;
    } | null;
  } | null;
  client?: {
    name?: string | null;
    phone?: string | null;
  } | null;
  intake?: {
    client_name?: string | null;
    phone?: string | null;
    source?: string | null;
    service_id?: string | null;
  } | null;
  sent_at?: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

function normalizeAlert(payload: LeadAlertPayload) {
  const lead = payload.lead || {};
  const client = payload.client || lead.clients || {};
  const intake = payload.intake || {};

  const clientName = client.name || intake.client_name || "Unknown client";
  const phone = client.phone || intake.phone || "No phone";
  const source = lead.source || intake.source || "manual";
  const service = lead.services?.name || "Service not resolved yet";
  const preferredSlot = lead.preferred_date
    ? `${lead.preferred_date}${lead.preferred_time ? ` ${lead.preferred_time}` : ""}`
    : "Not set";
  const car = [lead.clients?.car_make, lead.clients?.car_model, lead.clients?.car_year].filter(Boolean).join(" ") || "No car details";
  const comment = lead.comment || "No comment";
  const price = lead.estimated_price != null && lead.estimated_price !== "" ? `EUR ${lead.estimated_price}` : "Not estimated";

  return {
    leadId: lead.id || "unknown",
    clientName,
    phone,
    source,
    service,
    preferredSlot,
    car,
    comment,
    price,
    publicEntry: Boolean(payload.public_entry)
  };
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

  const payload = (await request.json()) as LeadAlertPayload;
  if (payload.event && payload.event !== "lead_created") {
    return jsonResponse({ skipped: true, reason: `Unsupported event ${payload.event}` });
  }

  const alert = normalizeAlert(payload);
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  await createAutomationRun(supabase, {
    automation_key: "lead_alert",
    status: "started",
    scope_key: alert.leadId,
    lead_id: alert.leadId !== "unknown" ? alert.leadId : null,
    payload: {
      source: alert.source,
      public_entry: alert.publicEntry
    }
  });

  try {
    const message = [
      "<b>New detailing lead</b>",
      "",
      `<b>Client:</b> ${escapeTelegramHtml(alert.clientName)}`,
      `<b>Phone:</b> ${escapeTelegramHtml(alert.phone)}`,
      `<b>Service:</b> ${escapeTelegramHtml(alert.service)}`,
      `<b>Source:</b> ${escapeTelegramHtml(alert.source)}`,
      `<b>Car:</b> ${escapeTelegramHtml(alert.car)}`,
      `<b>Preferred slot:</b> ${escapeTelegramHtml(alert.preferredSlot)}`,
      `<b>Estimated price:</b> ${escapeTelegramHtml(alert.price)}`,
      `<b>Lead ID:</b> ${escapeTelegramHtml(alert.leadId)}`,
      `<b>Entry:</b> ${alert.publicEntry ? "Public form" : "Internal CRM"}`,
      "",
      `<b>Comment:</b> ${escapeTelegramHtml(alert.comment)}`
    ].join("\n");

    const telegramResult = await sendTelegramMessage({
      botToken: telegramBotToken,
      chatId: telegramChatId,
      text: message
    });

    if (alert.leadId !== "unknown") {
      await supabase.from("lead_events").insert({
        lead_id: alert.leadId,
        type: "reminder_sent",
        note: "Telegram lead alert sent to manager.",
        payload: {
          channel: "telegram",
          trigger: "lead_created_alert"
        }
      });
    }

    await createAutomationRun(supabase, {
      automation_key: "lead_alert",
      status: "success",
      scope_key: alert.leadId,
      lead_id: alert.leadId !== "unknown" ? alert.leadId : null,
      payload: {
        source: alert.source,
        public_entry: alert.publicEntry,
        telegram_message_id: telegramResult?.result?.message_id ?? null
      }
    });

    return jsonResponse({
      ok: true,
      alert,
      telegram_message_id: telegramResult?.result?.message_id ?? null
    });
  } catch (error) {
    await createAutomationRun(supabase, {
      automation_key: "lead_alert",
      status: "error",
      scope_key: alert.leadId,
      lead_id: alert.leadId !== "unknown" ? alert.leadId : null,
      payload: {
        source: alert.source,
        public_entry: alert.publicEntry
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
