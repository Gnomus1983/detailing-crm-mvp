import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";
import { createAutomationRun } from "../_shared/automation-log.ts";
import { escapeTelegramHtml, sendTelegramMessage } from "../_shared/telegram.ts";

const leadAlertPayloadSchema = z
  .object({
    event: z.literal("lead_created").optional(),
    public_entry: z.boolean().optional(),
    lead: z
      .object({
        id: z.string().uuid().optional(),
        source: z.string().max(40).nullable().optional(),
        preferred_date: z.string().max(20).nullable().optional(),
        preferred_time: z.string().max(60).nullable().optional(),
        comment: z.string().max(2000).nullable().optional(),
        estimated_price: z.union([z.number(), z.string().max(40), z.null()]).optional(),
        follow_up_at: z.string().max(80).nullable().optional(),
        services: z
          .object({
            name: z.string().max(120).nullable().optional()
          })
          .nullable()
          .optional(),
        clients: z
          .object({
            name: z.string().max(120).nullable().optional(),
            phone: z.string().max(40).nullable().optional(),
            car_make: z.string().max(80).nullable().optional(),
            car_model: z.string().max(80).nullable().optional(),
            car_year: z.number().int().nullable().optional()
          })
          .nullable()
          .optional()
      })
      .nullable()
      .optional(),
    client: z
      .object({
        name: z.string().max(120).nullable().optional(),
        phone: z.string().max(40).nullable().optional()
      })
      .nullable()
      .optional(),
    intake: z
      .object({
        client_name: z.string().max(120).nullable().optional(),
        phone: z.string().max(40).nullable().optional(),
        source: z.string().max(40).nullable().optional(),
        service_id: z.string().uuid().nullable().optional()
      })
      .nullable()
      .optional(),
    sent_at: z.string().datetime({ offset: true }).optional()
  })
  .strict();

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

function normalizeAlert(payload: z.infer<typeof leadAlertPayloadSchema>) {
  const lead = payload.lead || {};
  const client = payload.client || lead.clients || {};
  const intake = payload.intake || {};

  const clientName = client.name || intake.client_name || "Client necunoscut";
  const phone = client.phone || intake.phone || "Fara telefon";
  const source = lead.source || intake.source || "manual";
  const service = lead.services?.name || "Serviciu nerezolvat inca";
  const preferredSlot = lead.preferred_date
    ? `${lead.preferred_date}${lead.preferred_time ? ` ${lead.preferred_time}` : ""}`
    : "Nesetat";
  const car = [lead.clients?.car_make, lead.clients?.car_model, lead.clients?.car_year].filter(Boolean).join(" ") || "Fara detalii auto";
  const comment = lead.comment || "Fara comentariu";
  const price = lead.estimated_price != null && lead.estimated_price !== "" ? `${lead.estimated_price} EUR` : "Neevaluat";

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
    return jsonResponse({ error: "Metoda nu este permisa" }, 405);
  }

  const internalToken = Deno.env.get("ALERT_INTERNAL_TOKEN");
  if (internalToken) {
    const provided = request.headers.get("x-internal-token");
    if (provided !== internalToken) {
      return jsonResponse({ error: "Neautorizat" }, 401);
    }
  }

  const telegramBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const telegramChatId = Deno.env.get("TELEGRAM_MANAGER_CHAT_ID");

  if (!telegramBotToken || !telegramChatId) {
    return jsonResponse(
      {
        error: "Lipsesc TELEGRAM_BOT_TOKEN sau TELEGRAM_MANAGER_CHAT_ID"
      },
      500
    );
  }

  const body = await request.json();
  const parsed = leadAlertPayloadSchema.safeParse(body);

  if (!parsed.success) {
    return jsonResponse(
      {
        error: "Payload-ul de alerta nu este valid.",
        details: parsed.error.flatten()
      },
      400
    );
  }

  const payload = parsed.data;
  if (payload.event && payload.event !== "lead_created") {
    return jsonResponse({ skipped: true, reason: `Eveniment nesuportat ${payload.event}` });
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
      "<b>Solicitare noua detailing</b>",
      "",
      `<b>Client:</b> ${escapeTelegramHtml(alert.clientName)}`,
      `<b>Telefon:</b> ${escapeTelegramHtml(alert.phone)}`,
      `<b>Serviciu:</b> ${escapeTelegramHtml(alert.service)}`,
      `<b>Sursa:</b> ${escapeTelegramHtml(alert.source)}`,
      `<b>Masina:</b> ${escapeTelegramHtml(alert.car)}`,
      `<b>Interval preferat:</b> ${escapeTelegramHtml(alert.preferredSlot)}`,
      `<b>Pret estimat:</b> ${escapeTelegramHtml(alert.price)}`,
      `<b>ID solicitare:</b> ${escapeTelegramHtml(alert.leadId)}`,
      `<b>Intrare:</b> ${alert.publicEntry ? "Formular public" : "CRM intern"}`,
      "",
      `<b>Comentariu:</b> ${escapeTelegramHtml(alert.comment)}`
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
        note: "Alerta Telegram pentru solicitare a fost trimisa managerului.",
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
