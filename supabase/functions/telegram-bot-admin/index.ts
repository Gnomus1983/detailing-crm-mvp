import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";

const payloadSchema = z
  .object({
    action: z.enum(["set_webhook", "get_webhook_info"])
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

async function canManageTelegramBot(supabase: ReturnType<typeof createClient>, userId: string) {
  const [{ data: platformAdmin }, { data: ownerMembership }] = await Promise.all([
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
      .eq("is_active", true)
      .eq("role", "owner")
      .limit(1)
      .maybeSingle()
  ]);

  return Boolean(platformAdmin?.id || ownerMembership?.id);
}

async function telegramApi(botToken: string, method: string, body?: Record<string, unknown>) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: body ? "POST" : "GET",
    headers: body
      ? {
          "Content-Type": "application/json"
        }
      : undefined,
    body: body ? JSON.stringify(body) : undefined
  });

  const payload = await response.json();
  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.description || `Telegram API failed: ${response.status}`);
  }

  return payload;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const telegramBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  if (!telegramBotToken) {
    return jsonResponse({ error: "Missing TELEGRAM_BOT_TOKEN" }, 500);
  }

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

    const allowed = await canManageTelegramBot(supabase, authData.user.id);
    if (!allowed) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    const body = await request.json();
    const parsed = payloadSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse({ error: "Invalid payload", details: parsed.error.flatten() }, 400);
    }

    if (parsed.data.action === "get_webhook_info") {
      const info = await telegramApi(telegramBotToken, "getWebhookInfo");
      return jsonResponse({ ok: true, result: info.result });
    }

    const webhookUrl = `${supabaseUrl}/functions/v1/telegram-webhook`;
    const result = await telegramApi(telegramBotToken, "setWebhook", {
      url: webhookUrl,
      allowed_updates: ["message"]
    });

    return jsonResponse({ ok: true, webhook_url: webhookUrl, result: result.result });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
