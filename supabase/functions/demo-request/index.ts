import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";
import { buildCorsHeaders } from "../_shared/cors.ts";
import { escapeTelegramHtml, sendTelegramMessage } from "../_shared/telegram.ts";

const demoRequestSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(6).max(32),
    company_name: z.union([z.string().trim().max(160), z.literal(""), z.null()]).optional(),
    business: z.enum(["detailing", "car_wash", "tire_service", "auto_service"]).default("detailing"),
    role: z.enum(["owner", "manager", "admin"]).optional(),
    plan: z.enum(["basic", "solo", "professional"]).optional(),
    billing: z.enum(["monthly", "yearly"]).optional(),
    comment: z.union([z.string().trim().max(2000), z.literal(""), z.null()]).optional(),
    employees_count: z.number().int().min(1).max(500).nullable().optional(),
    locations_count: z.number().int().min(1).max(100).nullable().optional()
  })
  .strict();

const businessLabels: Record<string, string> = {
  detailing: "Детейлинг",
  car_wash: "Автомойка",
  tire_service: "Шиномонтаж",
  auto_service: "Автосервис"
};

const roleLabels: Record<string, string> = {
  owner: "Владелец",
  manager: "Менеджер",
  admin: "Администратор"
};

const planLabels: Record<string, string> = {
  basic: "Basic",
  solo: "Solo",
  professional: "Professional"
};

const billingLabels: Record<string, string> = {
  monthly: "Месяц",
  yearly: "Год"
};

function isQaDemoPayload(payload: z.infer<typeof demoRequestSchema>) {
  const haystack = [payload.name, payload.company_name, payload.comment]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    haystack.includes("[qa-check]") ||
    haystack.includes("structured demo check") ||
    haystack.includes("structured auto service qa") ||
    haystack.includes("structured demo-request check") ||
    haystack.includes("creator handoff qa") ||
    haystack.includes("qa structured center") ||
    haystack.includes("structured handoff check")
  );
}

function jsonResponse(body: unknown, corsHeaders: Record<string, string>, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: corsHeaders
  });
}

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || null;
  }

  return request.headers.get("x-real-ip") || request.headers.get("cf-connecting-ip") || null;
}

async function hashIdentifier(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (request) => {
  const corsHeaders = buildCorsHeaders(request);

  try {
    if (request.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "Метод не поддерживается." }, corsHeaders, 405);
    }

    const body = await request.json();
    const parsed = demoRequestSchema.safeParse(body);

    if (!parsed.success) {
      return jsonResponse(
        {
          error: "Данные демо-заявки невалидны.",
          details: parsed.error.flatten()
        },
        corsHeaders,
        400
      );
    }

    const payload = parsed.data;
    const ip = getClientIp(request);
    const qaDemo = isQaDemoPayload(payload);

    if (!ip) {
      return jsonResponse({ error: "Не удалось определить источник запроса." }, corsHeaders, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const telegramBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const telegramChatId = Deno.env.get("TELEGRAM_MANAGER_CHAT_ID");
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const actionKey = "demo_request";
    const identifierHash = await hashIdentifier(`${actionKey}:${ip}`);
    const oneHourAgoIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { count, error: rateLimitError } = await supabase
      .from("rate_limit_events")
      .select("*", { count: "exact", head: true })
      .eq("action_key", actionKey)
      .eq("identifier_hash", identifierHash)
      .gte("created_at", oneHourAgoIso);

    if (rateLimitError) {
      return jsonResponse({ error: rateLimitError.message }, corsHeaders, 500);
    }

    if ((count || 0) >= 5) {
      return jsonResponse({ error: "Слишком много демо-запросов за последний час. Попробуйте чуть позже." }, corsHeaders, 429);
    }

    const { error: logError } = await supabase.from("rate_limit_events").insert({
      action_key: actionKey,
      identifier_hash: identifierHash
    });

    if (logError) {
      return jsonResponse({ error: logError.message }, corsHeaders, 500);
    }

    const requestPayload = {
      name: payload.name,
      phone: payload.phone,
      business_type: payload.business,
      company_name: payload.company_name || null,
      employees_count: payload.employees_count ?? null,
      locations_count: payload.locations_count ?? null,
      comment: payload.comment || null,
      meta: {
        role: payload.role || null,
        plan: payload.plan || null,
        billing: payload.billing || null,
        team_size: payload.employees_count ?? null,
        locations_count: payload.locations_count ?? null,
        company_name: payload.company_name || null,
        qa_demo: qaDemo
      },
      source: qaDemo ? "qa" : "landing",
      status: "new",
      is_demo: qaDemo
    };

    const { data: createdRequest, error: insertError } = await supabase
      .from("platform_demo_requests")
      .insert(requestPayload)
      .select("*")
      .maybeSingle();

    if (insertError) {
      return jsonResponse({ error: insertError.message }, corsHeaders, 500);
    }

    if (telegramBotToken && telegramChatId) {
      const text = [
        "<b>Новый запрос на демо Detail CRM</b>",
        "",
        `<b>Имя:</b> ${escapeTelegramHtml(payload.name)}`,
        `<b>Телефон:</b> ${escapeTelegramHtml(payload.phone)}`,
        `<b>Бизнес:</b> ${escapeTelegramHtml(businessLabels[payload.business] || payload.business)}`,
        payload.company_name ? `<b>Компания:</b> ${escapeTelegramHtml(payload.company_name)}` : null,
        payload.role ? `<b>Роль:</b> ${escapeTelegramHtml(roleLabels[payload.role] || payload.role)}` : null,
        payload.plan ? `<b>Пакет:</b> ${escapeTelegramHtml(planLabels[payload.plan] || payload.plan)}` : null,
        payload.billing ? `<b>Период:</b> ${escapeTelegramHtml(billingLabels[payload.billing] || payload.billing)}` : null,
        payload.employees_count ? `<b>Сотрудники:</b> ${escapeTelegramHtml(String(payload.employees_count))}` : null,
        payload.locations_count ? `<b>Локации:</b> ${escapeTelegramHtml(String(payload.locations_count))}` : null,
        `<b>Комментарий:</b> ${escapeTelegramHtml(payload.comment || "Без комментария")}`,
        createdRequest?.id ? `<b>ID запроса:</b> ${escapeTelegramHtml(createdRequest.id)}` : null
      ]
        .filter(Boolean)
        .join("\n");

      try {
        await sendTelegramMessage({
          botToken: telegramBotToken,
          chatId: telegramChatId,
          text
        });
      } catch (telegramError) {
        console.error("demo-request telegram failed", telegramError);
      }
    }

    return jsonResponse({
      ok: true,
      result: createdRequest
    }, corsHeaders);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected demo-request failure";
    console.error("demo-request fatal", error);
    return jsonResponse({ error: message }, corsHeaders, 500);
  }
});
