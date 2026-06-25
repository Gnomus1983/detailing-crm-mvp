import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";
import { createAutomationRun } from "../_shared/automation-log.ts";
import { escapeTelegramHtml, sendTelegramMessage } from "../_shared/telegram.ts";

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

function formatServiceName(value: string | null | undefined) {
  if (!value) {
    return "Услуга";
  }

  return serviceLabels[value] || value;
}

const payloadSchema = z
  .object({
    lead_id: z.string().uuid()
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

async function canManageLeadNotifications(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  companyId: string | null | undefined
) {
  if (!companyId) {
    return false;
  }

  const [{ data: platformAdmin }, { data: membership }] = await Promise.all([
    supabase
      .from("platform_admins")
      .select("id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("company_members")
      .select("id")
      .eq("user_id", userId)
      .eq("company_id", companyId)
      .eq("is_active", true)
      .in("role", ["owner", "manager"])
      .limit(1)
      .maybeSingle()
  ]);

  return Boolean(platformAdmin?.id || membership?.id);
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const telegramBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const publicAppUrl = Deno.env.get("PUBLIC_APP_URL") || "https://vivid-kettle-zdyw.here.now";
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const authHeader = request.headers.get("Authorization") || "";
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;

    if (!jwt) {
      return jsonResponse({ error: "Missing bearer token" }, 401);
    }

    const { data: authData, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !authData.user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const body = await request.json();
    const parsed = payloadSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse({ error: "Invalid payload", details: parsed.error.flatten() }, 400);
    }

    const leadId = parsed.data.lead_id;
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, company_id, status, public_status_token, clients!inner(name, telegram_chat_id, car_make, car_model, car_year), services(name)")
      .eq("id", leadId)
      .maybeSingle();

    if (leadError || !lead) {
      return jsonResponse({ error: "Lead not found" }, 404);
    }

    const allowed = await canManageLeadNotifications(supabase, authData.user.id, lead.company_id);
    if (!allowed) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    await createAutomationRun(supabase, {
      automation_key: "client_ready_telegram",
      status: "started",
      scope_key: lead.id,
      lead_id: lead.id,
      payload: {
        status: lead.status
      }
    });

    if (lead.status !== "done") {
      await createAutomationRun(supabase, {
        automation_key: "client_ready_telegram",
        status: "skipped",
        scope_key: lead.id,
        lead_id: lead.id,
        payload: {
          reason: "status_not_done",
          status: lead.status
        }
      });
      return jsonResponse({ ok: true, status: "skipped", reason: "status_not_done" });
    }

    const { data: existingSuccessRun } = await supabase
      .from("automation_runs")
      .select("id")
      .eq("automation_key", "client_ready_telegram")
      .eq("lead_id", lead.id)
      .eq("status", "success")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingSuccessRun) {
      await createAutomationRun(supabase, {
        automation_key: "client_ready_telegram",
        status: "skipped",
        scope_key: lead.id,
        lead_id: lead.id,
        payload: {
          reason: "already_sent"
        }
      });
      return jsonResponse({ ok: true, status: "skipped", reason: "already_sent" });
    }

    if (!telegramBotToken || !lead.clients.telegram_chat_id) {
      await createAutomationRun(supabase, {
        automation_key: "client_ready_telegram",
        status: "skipped",
        scope_key: lead.id,
        lead_id: lead.id,
        payload: {
          reason: "telegram_not_connected"
        }
      });
      return jsonResponse({ ok: true, status: "skipped", reason: "telegram_not_connected" });
    }

    const carLabel = [lead.clients.car_make, lead.clients.car_model, lead.clients.car_year].filter(Boolean).join(" ");
    const statusUrl = `${publicAppUrl}/status/${lead.public_status_token}`;

    const telegramResult = await sendTelegramMessage({
      botToken: telegramBotToken,
      chatId: lead.clients.telegram_chat_id,
      text: [
        `<b>Ваш автомобиль готов</b>`,
        ``,
        `<b>Автомобиль:</b> ${escapeTelegramHtml(carLabel || "Автомобиль")}`,
        `<b>Услуга:</b> ${escapeTelegramHtml(formatServiceName(lead.services?.name || "Услуга"))}`,
        ``,
        `Команда завершила работу. Откройте страницу статуса:`,
        `<a href="${statusUrl}">${statusUrl}</a>`
      ].join("\n")
    });

    await createAutomationRun(supabase, {
      automation_key: "client_ready_telegram",
      status: "success",
      scope_key: lead.id,
      lead_id: lead.id,
      payload: {
        telegram_message_id: telegramResult?.result?.message_id ?? null
      }
    });

    return jsonResponse({ ok: true, status: "sent" });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
