import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const OWNER_CHAT_ID = Deno.env.get("TELEGRAM_OWNER_CHAT_ID")!;
const WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

async function createNote(content: string, source: "telegram" | "voice") {
  const { error } = await supabase.from("notes").insert({
    content,
    type: "inbox",
    source,
    tags: [],
    is_starred: false,
  });
  if (error) throw error;
}

async function transcribeVoice(fileId: string): Promise<string> {
  // 1. Telegram'dan dosya URL'ini al
  const fileInfo = await sendTelegram("getFile", { file_id: fileId });
  const filePath = fileInfo.result.file_path;
  const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;

  // 2. Dosyayı indir
  const fileRes = await fetch(fileUrl);
  const fileBlob = await fileRes.blob();

  // 3. Groq Whisper'a gönder
  const formData = new FormData();
  formData.append("file", fileBlob, "voice.ogg");
  formData.append("model", "whisper-large-v3");
  formData.append("language", "tr");

  const groqRes = await fetch(
    "https://api.groq.com/openai/v1/audio/transcriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("GROQ_API_KEY")}`,
      },
      body: formData,
    }
  );

  const groqData = await groqRes.json();
  if (!groqData.text) throw new Error("Transcription failed");
  return groqData.text;
}

Deno.serve(async (req) => {
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const update = await req.json();

  const chatId =
    update.message?.chat?.id?.toString() ??
    update.callback_query?.message?.chat?.id?.toString();

  if (chatId !== OWNER_CHAT_ID) {
    return new Response("OK");
  }

  try {
    if (update.message?.text) {
      await createNote(update.message.text, "telegram");
      await sendTelegram("sendMessage", {
        chat_id: chatId,
        text: "✓ kaydedildi",
      });
    }

    if (update.message?.voice) {
      try {
        const transcript = await transcribeVoice(update.message.voice.file_id);
        if (!transcript.trim()) {
          await sendTelegram("sendMessage", {
            chat_id: chatId,
            text: "Ses kaydı çok kısa, tekrar dene",
          });
          return new Response("OK");
        }
        await createNote(transcript, "voice");
        await sendTelegram("sendMessage", {
          chat_id: chatId,
          text: `🎤 "${transcript}" — kaydedildi`,
        });
      } catch {
        await sendTelegram("sendMessage", {
          chat_id: chatId,
          text: "Ses işlenemedi, tekrar dene",
        });
      }
    }
  } catch (err) {
    console.error("Error:", err);
    await sendTelegram("sendMessage", {
      chat_id: chatId,
      text: "Bir hata oluştu",
    });
  }

  return new Response("OK");
});
