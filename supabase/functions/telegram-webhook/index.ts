import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const OWNER_CHAT_ID = Deno.env.get("TELEGRAM_OWNER_CHAT_ID")!;
const WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET")!;

async function sendTelegram(method: string, body: Record<string, unknown>) {
  const res = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/${method}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  return res.json();
}

Deno.serve(async (req) => {
  // Webhook secret doğrulama
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const update = await req.json();

  // Chat ID kontrolü — sadece owner
  const chatId =
    update.message?.chat?.id?.toString() ??
    update.callback_query?.message?.chat?.id?.toString();

  if (chatId !== OWNER_CHAT_ID) {
    return new Response("OK");
  }

  // Echo — gelen mesajı geri gönder
  if (update.message?.text) {
    await sendTelegram("sendMessage", {
      chat_id: chatId,
      text: `Echo: ${update.message.text}`,
    });
  }

  return new Response("OK");
});
