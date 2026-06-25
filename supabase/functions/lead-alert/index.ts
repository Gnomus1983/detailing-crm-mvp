import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";
import { createAutomationRun } from "../_shared/automation-log.ts";
import { requireInternalToken } from "../_shared/internal-auth.ts";
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
            name: z.string().max(120).nullable().optional(),
            base_price: z.union([z.number(), z.string().max(40), z.null()]).optional()
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
    company: z
      .object({
        id: z.string().uuid().nullable().optional(),
        name: z.string().max(160).nullable().optional(),
        slug: z.string().max(160).nullable().optional()
      })
      .nullable()
      .optional(),
    intake: z
      .object({
        client_name: z.string().max(120).nullable().optional(),
        phone: z.string().max(40).nullable().optional(),
        source: z.string().max(40).nullable().optional(),
        service_id: z.string().uuid().nullable().optional(),
        company_slug: z.string().max(160).nullable().optional()
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

const sourceLabels: Record<string, string> = {
  manual: "Вручную",
  landing: "Сайт",
  instagram: "Инстаграм",
  telegram: "Телеграм",
  whatsapp: "Вотсап",
  phone: "Телефон",
  facebook: "Фейсбук",
  other: "Другое"
};

const serviceLabels: Record<string, string> = {
  "Spalare exterioara": "Мойка кузова",
  "Curatare salon": "Химчистка салона",
  "Spalare detaliata": "Детальная мойка",
  "Detailing interior": "Детейлинг салона",
  "Polizare completa": "Полировка кузова",
  "Detailing complet": "Полный детейлинг",
  Ceramica: "Керамическое покрытие",
  "Polizare + Ceramica": "Полировка + керамика",
  "Consultatie coating ceramic": "Консультация по керамике"
};

function formatSource(value: string | null | undefined) {
  if (!value) {
    return "Не указан";
  }

  return sourceLabels[value] || value;
}

function formatServiceName(value: string | null | undefined) {
  if (!value) {
    return "Услуга не указана";
  }

  return serviceLabels[value] || value;
}

function normalizeAlert(payload: z.infer<typeof leadAlertPayloadSchema>) {
  const lead = payload.lead || {};
  const client = payload.client || lead.clients || {};
  const intake = payload.intake || {};
  const company = payload.company || {};
  const normalizedEstimatedPrice = Number(lead.estimated_price || 0);
  const normalizedBasePrice = Number(lead.services?.base_price || 0);

  const clientName = client.name || intake.client_name || "Клиент не указан";
  const phone = client.phone || intake.phone || "Без телефона";
  const source = formatSource(lead.source || intake.source || "manual");
  const service = formatServiceName(lead.services?.name || null);
  const preferredSlot = lead.preferred_date
    ? `${lead.preferred_date}${lead.preferred_time ? ` ${lead.preferred_time}` : ""}`
    : "Не указан";
  const car = [lead.clients?.car_make, lead.clients?.car_model, lead.clients?.car_year].filter(Boolean).join(" ") || "Автомобиль не указан";
  const comment = lead.comment || "Без комментария";
  const priceValue = normalizedEstimatedPrice > 0 ? normalizedEstimatedPrice : normalizedBasePrice > 0 ? normalizedBasePrice : null;
  const price = priceValue != null ? `${priceValue} MDL` : "Не оценено";
  const companyName = company.name || company.slug || intake.company_slug || "Компания не указана";

  return {
    leadId: lead.id || "unknown",
    clientName,
    phone,
    companyName,
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
    return jsonResponse({ error: "Метод не поддерживается." }, 405);
  }

  const authError = requireInternalToken(request);
  if (authError) {
    return authError;
  }
  const telegramBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const telegramChatId = Deno.env.get("TELEGRAM_MANAGER_CHAT_ID");

  if (!telegramBotToken || !telegramChatId) {
    return jsonResponse(
      {
        error: "Не заданы TELEGRAM_BOT_TOKEN или TELEGRAM_MANAGER_CHAT_ID."
      },
      500
    );
  }

  const body = await request.json();
  const parsed = leadAlertPayloadSchema.safeParse(body);

  if (!parsed.success) {
    return jsonResponse(
      {
        error: "Данные уведомления заполнены неверно.",
        details: parsed.error.flatten()
      },
      400
    );
  }

  const payload = parsed.data;
  if (payload.event && payload.event !== "lead_created") {
    return jsonResponse({ skipped: true, reason: `Неподдерживаемое событие: ${payload.event}` });
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
      "<b>Новая заявка на детейлинг</b>",
      "",
      `<b>Компания:</b> ${escapeTelegramHtml(alert.companyName)}`,
      `<b>Клиент:</b> ${escapeTelegramHtml(alert.clientName)}`,
      `<b>Телефон:</b> ${escapeTelegramHtml(alert.phone)}`,
      `<b>Услуга:</b> ${escapeTelegramHtml(alert.service)}`,
      `<b>Источник:</b> ${escapeTelegramHtml(alert.source)}`,
      `<b>Автомобиль:</b> ${escapeTelegramHtml(alert.car)}`,
      `<b>Предпочтительное время:</b> ${escapeTelegramHtml(alert.preferredSlot)}`,
      `<b>Ориентировочная цена:</b> ${escapeTelegramHtml(alert.price)}`,
      `<b>ID заявки:</b> ${escapeTelegramHtml(alert.leadId)}`,
      `<b>Канал:</b> ${alert.publicEntry ? "Публичная форма" : "Внутренняя CRM"}`,
      "",
      `<b>Комментарий:</b> ${escapeTelegramHtml(alert.comment)}`
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
