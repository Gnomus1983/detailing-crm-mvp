import { createClient } from "npm:@supabase/supabase-js@2";

async function getBotUsername(botToken: string) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Telegram getMe failed with status ${response.status}: ${details}`);
  }

  const payload = await response.json();
  const username = payload?.result?.username;
  if (!username) {
    throw new Error("Telegram bot username not found.");
  }

  return username;
}

Deno.serve(async (request) => {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token")?.trim() || "";

    if (!token) {
      return new Response("Missing token.", { status: 400 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const telegramBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN");

    if (!telegramBotToken) {
      return new Response("Telegram bot is not configured.", { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id")
      .eq("public_status_token", token)
      .maybeSingle();

    if (leadError || !lead) {
      return new Response("Status token not found.", { status: 404 });
    }

    const username = await getBotUsername(telegramBotToken);
    const telegramUrl = `https://t.me/${username}?start=detailcrm_${token}`;

    return Response.redirect(telegramUrl, 302);
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "Unexpected error", { status: 500 });
  }
});
