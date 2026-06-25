import { createClient } from "npm:@supabase/supabase-js@2";
import { createAutomationRun } from "../_shared/automation-log.ts";
import { escapeTelegramHtml, sendTelegramMessage } from "../_shared/telegram.ts";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

function extractStartToken(text: string | null | undefined) {
  if (!text) {
    return null;
  }

  const match = text.trim().match(/^\/start(?:@\w+)?\s+detailcrm_([0-9a-f-]{36})$/i);
  return match?.[1] || null;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ ok: true, ignored: true });
  }

  const telegramBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const publicAppUrl = Deno.env.get("PUBLIC_APP_URL") || "https://vivid-kettle-zdyw.here.now";

  if (!telegramBotToken) {
    return jsonResponse({ error: "Missing TELEGRAM_BOT_TOKEN" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const update = await request.json();
    const message = update?.message;
    const chatId = message?.chat?.id ? String(message.chat.id) : null;
    const startToken = extractStartToken(message?.text);

    if (!chatId || !startToken) {
      return jsonResponse({ ok: true, ignored: true });
    }

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, public_status_token, clients!inner(id, name, car_make, car_model, car_year, telegram_chat_id)")
      .eq("public_status_token", startToken)
      .maybeSingle();

    if (leadError || !lead) {
      await sendTelegramMessage({
        botToken: telegramBotToken,
        chatId,
        text: "Не удалось привязать Telegram. Откройте ссылку из CRM ещё раз."
      });
      return jsonResponse({ ok: true, linked: false });
    }

    await createAutomationRun(supabase, {
      automation_key: "client_telegram_link",
      status: "started",
      scope_key: startToken,
      lead_id: lead.id,
      payload: {
        chat_id: chatId
      }
    });

    const clientId = lead.clients.id;
    const carLabel = [lead.clients.car_make, lead.clients.car_model, lead.clients.car_year].filter(Boolean).join(" ");
    const statusUrl = `${publicAppUrl}/status/${lead.public_status_token}`;

    const { error: updateError } = await supabase
      .from("clients")
      .update({
        telegram_chat_id: chatId,
        telegram_connected_at: new Date().toISOString()
      })
      .eq("id", clientId);

    if (updateError) {
      throw updateError;
    }

    await sendTelegramMessage({
      botToken: telegramBotToken,
      chatId,
      text: [
        `<b>Telegram подключён</b>`,
        ``,
        `<b>Клиент:</b> ${escapeTelegramHtml(lead.clients.name || "Клиент")}`,
        `<b>Автомобиль:</b> ${escapeTelegramHtml(carLabel || "Автомобиль")}`,
        ``,
        `Когда команда переведёт заявку в статус "Готово", вы получите сообщение сюда.`,
        ``,
        `<a href="${statusUrl}">Открыть страницу статуса</a>`
      ].join("\n")
    });

    await createAutomationRun(supabase, {
      automation_key: "client_telegram_link",
      status: "success",
      scope_key: startToken,
      lead_id: lead.id,
      payload: {
        chat_id: chatId
      }
    });

    return jsonResponse({ ok: true, linked: true, client_id: clientId, lead_id: lead.id });
  } catch (error) {
    await createAutomationRun(supabase, {
      automation_key: "client_telegram_link",
      status: "error",
      scope_key: "unknown",
      lead_id: null,
      payload: {},
      error_message: error instanceof Error ? error.message : String(error)
    });

    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "Unexpected error"
      },
      500
    );
  }
});
