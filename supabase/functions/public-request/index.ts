import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";

const corsHeaders = {
  // TODO: replace "*" with the production app domain before public launch.
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

const sourceSchema = z.enum(["manual", "landing", "instagram", "telegram", "whatsapp", "phone", "facebook", "other"]);

const publicLeadSchema = z
  .object({
    client_name: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(6).max(32),
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

function jsonResponse(body: unknown, status = 200) {
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

function emptyToNull(value: string | number | null | undefined) {
  if (value === "" || value == null) {
    return null;
  }

  return value;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Metoda nu este permisa" }, 405);
  }

  const body = await request.json();
  const parsed = publicLeadSchema.safeParse(body);

  if (!parsed.success) {
    return jsonResponse(
      {
        error: "Datele cererii nu sunt valide.",
        details: parsed.error.flatten()
      },
      400
    );
  }

  const payload = parsed.data;
  const ip = getClientIp(request);
  const phone = normalizeText(payload.phone);

  if (!ip) {
    return jsonResponse({ error: "Nu am putut valida sursa cererii." }, 400);
  }

  if (!normalizeText(payload.client_name) || !phone) {
    return jsonResponse({ error: "Numele si telefonul sunt obligatorii." }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const identifierHash = await hashIdentifier(`public_request:${ip}`);
  const oneHourAgoIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count, error: rateLimitError } = await supabase
    .from("rate_limit_events")
    .select("*", { count: "exact", head: true })
    .eq("action_key", "public_request")
    .eq("identifier_hash", identifierHash)
    .gte("created_at", oneHourAgoIso);

  if (rateLimitError) {
    return jsonResponse({ error: rateLimitError.message }, 500);
  }

  if ((count || 0) >= 3) {
    return jsonResponse(
      {
        error: "Ai trimis deja prea multe cereri in ultima ora. Incearca din nou mai tarziu."
      },
      429
    );
  }

  const { error: logError } = await supabase.from("rate_limit_events").insert({
    action_key: "public_request",
    identifier_hash: identifierHash
  });

  if (logError) {
    return jsonResponse({ error: logError.message }, 500);
  }

  const { data, error } = await supabase.rpc("submit_public_lead", {
    p_client_name: normalizeText(payload.client_name),
    p_phone: phone,
    p_email: normalizeText(payload.email),
    p_service_id: emptyToNull(payload.service_id) || null,
    p_car_make: normalizeText(payload.car_make),
    p_car_model: normalizeText(payload.car_model),
    p_car_year: typeof payload.car_year === "number" ? payload.car_year : null,
    p_car_plate: normalizeText(payload.car_plate),
    p_source: normalizeText(payload.source) || "landing",
    p_address: normalizeText(payload.address),
    p_comment: normalizeText(payload.comment),
    p_preferred_date: emptyToNull(payload.preferred_date) || null,
    p_preferred_time: normalizeText(payload.preferred_time),
    p_estimated_price: typeof payload.estimated_price === "number" ? payload.estimated_price : null,
    p_follow_up_at: typeof payload.follow_up_at === "string" && payload.follow_up_at ? new Date(payload.follow_up_at).toISOString() : null,
    p_website: normalizeText(payload.website)
  });

  if (error) {
    return jsonResponse({ error: error.message }, 400);
  }

  return jsonResponse({ ok: true, result: data });
});
