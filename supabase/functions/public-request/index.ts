import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";
import { buildCorsHeaders } from "../_shared/cors.ts";

const sourceSchema = z.enum(["manual", "landing", "instagram", "telegram", "whatsapp", "phone", "facebook", "other"]);

const publicLeadSchema = z
  .object({
    client_name: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(6).max(32),
    company_slug: z.string().trim().min(2).max(120),
    email: z.union([z.string().trim().email().max(160), z.literal(""), z.null()]).optional(),
    service_id: z.union([z.string().uuid(), z.literal(""), z.null()]).optional(),
    car_make: z.union([z.string().trim().max(80), z.literal(""), z.null()]).optional(),
    car_model: z.union([z.string().trim().max(80), z.literal(""), z.null()]).optional(),
    car_year: z.union([z.coerce.number().int().min(1950).max(2100), z.literal(""), z.null()]).optional(),
    car_plate: z.union([z.string().trim().max(32), z.literal(""), z.null()]).optional(),
    source: sourceSchema.optional(),
    address: z.union([z.string().trim().max(240), z.literal(""), z.null()]).optional(),
    comment: z.union([z.string().trim().max(2000), z.literal(""), z.null()]).optional(),
    preferred_date: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal(""), z.null()]).optional(),
    preferred_time: z.union([z.string().trim().max(60), z.literal(""), z.null()]).optional(),
    estimated_price: z.union([z.coerce.number().min(0).max(100000), z.literal(""), z.null()]).optional(),
    follow_up_at: z.union([z.string().datetime({ offset: true }), z.literal(""), z.null()]).optional(),
    website: z.union([z.string().trim().max(200), z.literal(""), z.null()]).optional()
  })
  .strict();

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

function normalizeText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeCompanySlug(value: unknown) {
  return normalizeText(value);
}

function emptyToNull(value: string | number | null | undefined) {
  if (value === "" || value == null) {
    return null;
  }

  return value;
}

async function triggerLeadAlert(
  supabaseUrl: string,
  internalToken: string | null,
  payload: Record<string, unknown>
) {
  const response = await fetch(`${supabaseUrl}/functions/v1/lead-alert`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(internalToken ? { "x-internal-token": internalToken } : {})
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Lead alert failed with status ${response.status}`);
  }

  return response.json();
}

async function resolveEstimatedPrice(
  supabase: ReturnType<typeof createClient>,
  serviceId: string | null,
  estimatedPrice: number | null
) {
  if (typeof estimatedPrice === "number" && Number.isFinite(estimatedPrice) && estimatedPrice > 0) {
    return estimatedPrice;
  }

  if (!serviceId) {
    return null;
  }

  const { data, error } = await supabase.from("services").select("base_price").eq("id", serviceId).maybeSingle();

  if (error) {
    throw error;
  }

  const basePrice = Number(data?.base_price || 0);
  return Number.isFinite(basePrice) && basePrice > 0 ? basePrice : null;
}

async function resolveCompanySummary(
  supabase: ReturnType<typeof createClient>,
  companySlug: string
) {
  const { data, error } = await supabase
    .from("companies")
    .select("id, name, slug, status")
    .eq("slug", companySlug)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
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
    const parsed = publicLeadSchema.safeParse(body);

    if (!parsed.success) {
      return jsonResponse(
        {
          error: "Данные заявки заполнены неверно.",
          details: parsed.error.flatten()
        },
        corsHeaders,
        400
      );
    }

    const payload = parsed.data;
    const ip = getClientIp(request);
    const phone = normalizeText(payload.phone);
    const companySlug = normalizeCompanySlug(payload.company_slug);

    if (!companySlug) {
      return jsonResponse({ error: "Не указан company_slug для клиентской формы." }, corsHeaders, 400);
    }

    if (!ip) {
      return jsonResponse({ error: "Не удалось проверить источник заявки." }, corsHeaders, 400);
    }

    if (!normalizeText(payload.client_name) || !phone) {
      return jsonResponse({ error: "Имя и телефон обязательны." }, corsHeaders, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const internalAlertToken = Deno.env.get("ALERT_INTERNAL_TOKEN") || null;
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const normalizedServiceId = emptyToNull(payload.service_id) || null;
    const companySummary = await resolveCompanySummary(supabase, companySlug);
    if (!companySummary?.id || companySummary.status !== "active") {
      return jsonResponse({ error: "Клиентская форма для этой компании сейчас недоступна." }, corsHeaders, 400);
    }
    const resolvedEstimatedPrice = await resolveEstimatedPrice(
      supabase,
      normalizedServiceId,
      typeof payload.estimated_price === "number" ? payload.estimated_price : null
    );

    const rateLimitActionKey = `public_request:${companySlug}`;
    const identifierHash = await hashIdentifier(`public_request:${companySlug}:${ip}`);
    const oneHourAgoIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { count, error: rateLimitError } = await supabase
      .from("rate_limit_events")
      .select("*", { count: "exact", head: true })
      .eq("action_key", rateLimitActionKey)
      .eq("identifier_hash", identifierHash)
      .gte("created_at", oneHourAgoIso);

    if (rateLimitError) {
      return jsonResponse({ error: rateLimitError.message }, corsHeaders, 500);
    }

    if ((count || 0) >= 3) {
      return jsonResponse(
        {
          error: "Вы уже отправили слишком много заявок за последний час. Попробуйте позже."
        },
        corsHeaders,
        429
      );
    }

    const { error: logError } = await supabase.from("rate_limit_events").insert({
      action_key: rateLimitActionKey,
      identifier_hash: identifierHash
    });

    if (logError) {
      return jsonResponse({ error: logError.message }, corsHeaders, 500);
    }

    const { data, error } = await supabase.rpc("submit_public_lead", {
      p_client_name: normalizeText(payload.client_name),
      p_phone: phone,
      p_email: normalizeText(payload.email),
      p_service_id: normalizedServiceId,
      p_car_make: normalizeText(payload.car_make),
      p_car_model: normalizeText(payload.car_model),
      p_car_year: typeof payload.car_year === "number" ? payload.car_year : null,
      p_car_plate: normalizeText(payload.car_plate),
      p_source: normalizeText(payload.source) || "landing",
      p_address: normalizeText(payload.address),
      p_comment: normalizeText(payload.comment),
      p_preferred_date: emptyToNull(payload.preferred_date) || null,
      p_preferred_time: normalizeText(payload.preferred_time),
      p_estimated_price: resolvedEstimatedPrice,
      p_follow_up_at:
        typeof payload.follow_up_at === "string" && payload.follow_up_at
          ? new Date(payload.follow_up_at).toISOString()
          : null,
      p_website: normalizeText(payload.website),
      p_company_slug: companySlug
    });

    if (error) {
      return jsonResponse({ error: error.message }, corsHeaders, 400);
    }

    let alertStatus: "sent" | "skipped" | "failed" = "skipped";

    if (data?.lead_id) {
      const { data: alertLead, error: alertLeadError } = await supabase
        .from("leads")
        .select(
          "id, source, preferred_date, preferred_time, comment, estimated_price, follow_up_at, company_id, clients(name, phone, car_make, car_model, car_year), services(name, base_price)"
        )
        .eq("id", data.lead_id)
        .single();

      if (!alertLeadError && alertLead) {
        try {
          await triggerLeadAlert(supabaseUrl, internalAlertToken, {
            event: "lead_created",
            public_entry: true,
            lead: alertLead,
            client: {
              name: alertLead.clients?.name || null,
              phone: alertLead.clients?.phone || null
            },
            company: {
              id: companySummary?.id || alertLead.company_id || null,
              name: companySummary?.name || null,
              slug: companySummary?.slug || companySlug
            },
            intake: {
              client_name: normalizeText(payload.client_name),
              phone,
              source: normalizeText(payload.source) || "landing",
              service_id: normalizedServiceId,
              company_slug: companySlug
            },
            sent_at: new Date().toISOString()
          });
          alertStatus = "sent";
        } catch (alertError) {
          console.error("public-request lead-alert failed", alertError);
          alertStatus = "failed";
        }
      }
    }

    return jsonResponse({ ok: true, result: data, alert_status: alertStatus }, corsHeaders);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected public-request failure";
    console.error("public-request fatal", error);
    return jsonResponse({ error: message }, corsHeaders, 500);
  }
});
