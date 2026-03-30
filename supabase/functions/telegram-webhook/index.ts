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

interface ClassifyResult {
  action: "complete" | "create" | "create_multiple";
  matched_note_id?: string;
  confidence?: number;
  content?: string;
  items?: string[];
}

async function classifyMessage(
  message: string,
  isVoice: boolean
): Promise<ClassifyResult> {
  const { data: notes } = await supabase
    .from("notes")
    .select("id, content")
    .in("type", ["inbox", "actionable"]);

  const notesList =
    notes && notes.length > 0
      ? notes.map((n: { id: string; content: string }) => `- [${n.id}] ${n.content}`).join("\n")
      : "(not yok)";

  const voiceHint = isVoice
    ? "\n3. Bu mesaj ses kaydından geldi. Metni düzgün bir cümleye dönüştür (dolgu sesleri, tekrarlar temizle)."
    : "";

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content: `Sen bir not asistanısın. Kullanıcının mesajını analiz et.

Kullanıcının açık notları:
${notesList}

Gelen mesaj: "${message}"

Görev:
1. Bu mesaj mevcut bir notu tamamlıyor mu, yoksa yeni bir not mu?
2. Tamamlama sinyalleri: "ödendi", "bitti", "yaptım", "hallettim", "tamamlandı", "gönderdim", "aldım", "done", "paid", "finished", "completed", "sent"
3. ÖNEMLİ: Tek kelimelik veya çok kısa belirsiz mesajlar (ör. "anne", "market") yeni not olarak kaydedilmeli, tamamlama olmamalı. Tamamlama için mesajda açık bir eylem ifadesi olmalı (ör. "anneyi aradım", "markete gittim").
4. Sadece bir notu tamamla. Birden fazla not eşleşiyorsa en yakın olanı seç.
5. Mesajda birden fazla ayrı görev/not varsa (liste, virgülle ayrılmış, numaralı maddeler) bunları ayrı ayrı notlara böl. Maksimum 7 not.${voiceHint}

JSON döndür (başka bir şey yazma):
{ "action": "complete", "matched_note_id": "uuid", "confidence": 0.95 }
veya
{ "action": "create", "content": "temizlenmiş not metni" }
veya
{ "action": "create_multiple", "items": ["not 1", "not 2", "not 3"] }`,
        },
      ],
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(`Claude API: ${data.error.message}`);
  let text = data.content[0].text.trim();
  // Claude bazen ```json ... ``` ile sarar, temizle
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/,  "");
  return JSON.parse(text);
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
      try {
        const result = await classifyMessage(update.message.text, false);

        if (result.action === "complete" && result.confidence !== undefined && result.confidence >= 0.9) {
          await supabase
            .from("notes")
            .update({ type: "done", updated_at: new Date().toISOString() })
            .eq("id", result.matched_note_id);

          const { data: note } = await supabase
            .from("notes")
            .select("content")
            .eq("id", result.matched_note_id)
            .single();

          await sendTelegram("sendMessage", {
            chat_id: chatId,
            text: `✓ "${note?.content}" tamamlandı`,
          });
        } else if (result.action === "complete") {
          const { data: note } = await supabase
            .from("notes")
            .select("content")
            .eq("id", result.matched_note_id)
            .single();

          await sendTelegram("sendMessage", {
            chat_id: chatId,
            text: `Bunu mu tamamladın?\n\n📝 ${note?.content}`,
            reply_to_message_id: update.message.message_id,
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "Evet ✓", callback_data: `confirm:${result.matched_note_id}` },
                  { text: "Hayır, yeni not", callback_data: `reject:${result.matched_note_id}` },
                ],
              ],
            },
          });
        } else if (result.action === "create_multiple" && result.items && result.items.length > 0) {
          const items = result.items.slice(0, 7);
          for (const item of items) {
            await createNote(item, "telegram");
          }
          const list = items.map((item: string) => `• ${item}`).join("\n");
          await sendTelegram("sendMessage", {
            chat_id: chatId,
            text: `✓ ${items.length} not kaydedildi:\n${list}`,
          });
        } else {
          await createNote(result.content ?? update.message.text, "telegram");
          await sendTelegram("sendMessage", {
            chat_id: chatId,
            text: "✓ kaydedildi",
          });
        }
      } catch (classifyErr) {
        console.error("Classification error:", classifyErr);
        await createNote(update.message.text, "telegram");
        await sendTelegram("sendMessage", {
          chat_id: chatId,
          text: `✓ kaydedildi (hata: ${classifyErr instanceof Error ? classifyErr.message : String(classifyErr)})`,
        });
      }
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

        try {
          const result = await classifyMessage(transcript, true);

          if (result.action === "complete" && result.confidence !== undefined && result.confidence >= 0.9) {
            await supabase
              .from("notes")
              .update({ type: "done", updated_at: new Date().toISOString() })
              .eq("id", result.matched_note_id);

            const { data: note } = await supabase
              .from("notes")
              .select("content")
              .eq("id", result.matched_note_id)
              .single();

            await sendTelegram("sendMessage", {
              chat_id: chatId,
              text: `🎤 ✓ "${note?.content}" tamamlandı`,
            });
          } else if (result.action === "complete") {
            const { data: note } = await supabase
              .from("notes")
              .select("content")
              .eq("id", result.matched_note_id)
              .single();

            await sendTelegram("sendMessage", {
              chat_id: chatId,
              text: `🎤 Bunu mu tamamladın?\n\n📝 ${note?.content}`,
              reply_to_message_id: update.message.message_id,
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: "Evet ✓", callback_data: `confirm:${result.matched_note_id}` },
                    { text: "Hayır, yeni not", callback_data: `reject:${result.matched_note_id}` },
                  ],
                ],
              },
            });
          } else if (result.action === "create_multiple" && result.items && result.items.length > 0) {
            const items = result.items.slice(0, 7);
            for (const item of items) {
              await createNote(item, "voice");
            }
            const list = items.map((item: string) => `• ${item}`).join("\n");
            await sendTelegram("sendMessage", {
              chat_id: chatId,
              text: `🎤 ${items.length} not kaydedildi:\n${list}`,
            });
          } else {
            await createNote(result.content ?? transcript, "voice");
            await sendTelegram("sendMessage", {
              chat_id: chatId,
              text: `🎤 "${result.content ?? transcript}" — kaydedildi`,
            });
          }
        } catch {
          await createNote(transcript, "voice");
          await sendTelegram("sendMessage", {
            chat_id: chatId,
            text: `🎤 "${transcript}" — kaydedildi (sınıflandırma yapılamadı)`,
          });
        }
      } catch {
        await sendTelegram("sendMessage", {
          chat_id: chatId,
          text: "Ses işlenemedi, tekrar dene",
        });
      }
    }

    if (update.callback_query) {
      const data = update.callback_query.data as string;
      const messageId = update.callback_query.message.message_id;
      const [action, noteId] = data.split(":");

      if (action === "confirm") {
        // Notu done yap
        await supabase
          .from("notes")
          .update({ type: "done", updated_at: new Date().toISOString() })
          .eq("id", noteId);

        const { data: note } = await supabase
          .from("notes")
          .select("content")
          .eq("id", noteId)
          .single();

        // Mesajı güncelle (butonları kaldır)
        await sendTelegram("editMessageText", {
          chat_id: chatId,
          message_id: messageId,
          text: `✓ "${note?.content}" tamamlandı`,
        });
      } else if (action === "reject") {
        // Orijinal mesajı inbox'a kaydet
        const replyMessage = update.callback_query.message.reply_to_message;
        const originalText = replyMessage?.text ?? replyMessage?.caption ?? "";

        if (originalText) {
          await createNote(originalText, replyMessage?.voice ? "voice" : "telegram");
        }

        // Mesajı güncelle
        await sendTelegram("editMessageText", {
          chat_id: chatId,
          message_id: messageId,
          text: "✓ yeni not olarak kaydedildi",
        });
      }

      // Telegram loading göstergesini kapat
      await sendTelegram("answerCallbackQuery", {
        callback_query_id: update.callback_query.id,
      });
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
