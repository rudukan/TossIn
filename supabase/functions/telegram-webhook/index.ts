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

async function createNote(content: string, source: "telegram" | "voice", dueDate?: string | null) {
  const { data, error } = await supabase.from("notes").insert({
    content,
    type: "inbox",
    source,
    tags: [],
    is_starred: false,
    due_date: dueDate ?? null,
  }).select().single();
  if (error) throw error;
  return data;
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
  action: "complete" | "create" | "create_multiple" | "move" | "query" | "reschedule";
  matched_note_id?: string;
  confidence?: number;
  content?: string;
  items?: string[];
  target_type?: "in_progress" | "waiting";
  query_type?: "today" | "waiting" | "in_progress" | "all_open";
  due_date?: string | null;
  needs_time?: boolean;
}

async function classifyMessage(
  message: string,
  isVoice: boolean
): Promise<ClassifyResult> {
  const { data: notes } = await supabase
    .from("notes")
    .select("id, content, type, due_date")
    .in("type", ["inbox", "in_progress", "waiting"]);

  const notesList =
    notes && notes.length > 0
      ? notes.map((n: { id: string; content: string; type: string; due_date: string | null }) => {
          const due = n.due_date ? ` (${n.due_date})` : "";
          return `- [${n.id}] (${n.type}) ${n.content}${due}`;
        }).join("\n")
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
Bugünün tarihi ve saati: ${new Date().toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}
Timezone: Europe/Istanbul (UTC+3). Tüm due_date değerlerini +03:00 offset ile döndür (ör. "2026-04-03T15:00:00+03:00").

Kullanıcının açık notları:
${notesList}

Gelen mesaj: "${message}"

Görev:
1. Bu mesaj mevcut bir notu tamamlıyor mu, yoksa yeni bir not mu, yoksa bir board geçişi mi, yoksa bir sorgulama mı?
2. Tamamlama sinyalleri: "ödendi", "bitti", "yaptım", "hallettim", "tamamlandı", "gönderdim", "aldım", "done", "paid", "finished", "completed", "sent"
3. Board geçiş sinyalleri: "başlıyorum", "üzerinde çalışıyorum" → in_progress. "erteledim", "beklemede", "bekliyorum" → waiting
4. Sorgulama sinyalleri: "bugün ne var?", "ne yapmam lazım?", "beklemedekiler?" → query
5. ÖNEMLİ: Tek kelimelik veya çok kısa belirsiz mesajlar yeni not olarak kaydedilmeli. Tamamlama/geçiş için açık eylem ifadesi gerekli.
6. Sadece bir notu tamamla veya taşı. Birden fazla eşleşiyorsa en yakın olanı seç.
7. Mesajda birden fazla ayrı görev varsa bunları ayrı ayrı notlara böl. Maksimum 7 not.
8. Mesajda tarih/saat bilgisi varsa due_date olarak çıkar (ISO 8601). "yarın" = bir sonraki gün, "cuma" = en yakın cuma. Saat belirtilmemişse needs_time: true.
9. Eğer mesaj hem mevcut bir notu güncelliyor (move/complete) hem yeni tarih/saat içeriyorsa, due_date alanını da JSON'a ekle. Örn: "Ali ile toplantıyı saat 21'e al" → move + due_date.
10. Eğer mesaj sadece mevcut bir notun tarih/saatini güncelliyorsa (state değişikliği yok) action'ı "reschedule" yap.${voiceHint}

JSON döndür (başka bir şey yazma):
{ "action": "complete", "matched_note_id": "uuid", "confidence": 0.95 }
veya
{ "action": "create", "content": "temizlenmiş not", "due_date": "2026-04-03T15:00:00" }
veya
{ "action": "create", "content": "temizlenmiş not", "due_date": "2026-04-04", "needs_time": true }
veya
{ "action": "create_multiple", "items": ["not 1", "not 2"] }
veya
{ "action": "move", "matched_note_id": "uuid", "target_type": "in_progress", "confidence": 0.95, "due_date": "2026-04-06T21:00:00+03:00" }
veya
{ "action": "reschedule", "matched_note_id": "uuid", "due_date": "2026-04-06T21:00:00+03:00", "confidence": 0.95 }
veya
{ "action": "query", "query_type": "today" }`,
        },
      ],
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(`Claude API: ${data.error.message}`);
  let text = data.content[0].text.trim();
  // Claude bazen ```json ... ``` ile sarar veya ek açıklama ekler — temizle
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/,  "");
  // JSON bloğunu bul — ilk { ile son } arası
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  if (jsonStart !== -1 && jsonEnd !== -1) {
    text = text.substring(jsonStart, jsonEnd + 1);
  }
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
        } else if (result.action === "move" && result.confidence !== undefined && result.confidence >= 0.9) {
          const updateData: Record<string, unknown> = {
            type: result.target_type,
            updated_at: new Date().toISOString(),
          };
          if (result.due_date) {
            updateData.due_date = result.due_date;
            updateData.reminded = false;
            updateData.reminded_at = null;
          }
          await supabase
            .from("notes")
            .update(updateData)
            .eq("id", result.matched_note_id);

          const { data: note } = await supabase
            .from("notes")
            .select("content")
            .eq("id", result.matched_note_id)
            .single();

          const emoji = result.target_type === "in_progress" ? "📋" : "⏸";
          const label = result.target_type === "in_progress" ? "Yapılıyor" : "Beklemede";
          let text = `${emoji} "${note?.content}" → ${label}`;
          if (result.due_date) {
            const dateStr = new Date(result.due_date).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });
            const dayStr = new Date(result.due_date).toLocaleDateString("tr-TR", { day: "numeric", month: "short", timeZone: "Europe/Istanbul" });
            text += `\n⏰ ${dayStr} ${dateStr}`;
          }
          await sendTelegram("sendMessage", {
            chat_id: chatId,
            text,
          });
        } else if (result.action === "move") {
          const { data: note } = await supabase
            .from("notes")
            .select("content")
            .eq("id", result.matched_note_id)
            .single();

          const label = result.target_type === "in_progress" ? "Yapılıyor" : "Beklemede";
          await sendTelegram("sendMessage", {
            chat_id: chatId,
            text: `"${note?.content}" → ${label}'a taşınsın mı?`,
            reply_to_message_id: update.message.message_id,
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "Evet ✓", callback_data: `move_confirm:${result.matched_note_id}:${result.target_type}` },
                  { text: "Hayır", callback_data: `move_reject:${result.matched_note_id}` },
                ],
              ],
            },
          });
        } else if (result.action === "reschedule" && result.matched_note_id && result.due_date) {
          await supabase
            .from("notes")
            .update({
              due_date: result.due_date,
              reminded: false,
              reminded_at: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", result.matched_note_id);

          const { data: note } = await supabase
            .from("notes")
            .select("content")
            .eq("id", result.matched_note_id)
            .single();

          const dateStr = new Date(result.due_date).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });
          const dayStr = new Date(result.due_date).toLocaleDateString("tr-TR", { day: "numeric", month: "short", timeZone: "Europe/Istanbul" });
          await sendTelegram("sendMessage", {
            chat_id: chatId,
            text: `⏰ "${note?.content}" → ${dayStr} ${dateStr}`,
          });
        } else if (result.action === "query") {
          let queryFilter: string[];
          let title: string;

          if (result.query_type === "today") {
            // Bugün: due_date bugün olan + due_date'siz in_progress notlar
            // Istanbul timezone ile bugünün başı ve sonu
            const now = new Date();
            const istanbulOffset = 3 * 60; // UTC+3
            const localNow = new Date(now.getTime() + istanbulOffset * 60 * 1000);
            const todayStr = localNow.toISOString().split("T")[0];
            const todayStart = new Date(todayStr + "T00:00:00+03:00");
            const todayEnd = new Date(todayStr + "T23:59:59+03:00");

            const { data: todayDue } = await supabase
              .from("notes")
              .select("content, due_date, type")
              .neq("type", "done")
              .gte("due_date", todayStart.toISOString())
              .lte("due_date", todayEnd.toISOString())
              .order("due_date", { ascending: true });

            const { data: inProgressNoDue } = await supabase
              .from("notes")
              .select("content, due_date, type")
              .eq("type", "in_progress")
              .is("due_date", null)
              .order("created_at", { ascending: false });

            const todayNotes = [...(todayDue ?? []), ...(inProgressNoDue ?? [])];

            if (todayNotes.length === 0) {
              await sendTelegram("sendMessage", {
                chat_id: chatId,
                text: "📋 Bugünkü notların:\n\nHiç not yok 🎉",
              });
            } else {
              const lines = todayNotes.map((n: { content: string; due_date: string | null }) => {
                const due = n.due_date
                  ? `⏰ ${new Date(n.due_date).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" })} — `
                  : "• ";
                return `  ${due}${n.content}`;
              });
              await sendTelegram("sendMessage", {
                chat_id: chatId,
                text: `📋 Bugünkü notların:\n${lines.join("\n")}`,
              });
            }
          } else if (result.query_type === "waiting") {
            queryFilter = ["waiting"];
            title = "⏸ Beklemede:";
          } else if (result.query_type === "in_progress") {
            queryFilter = ["in_progress"];
            title = "📋 Yapılıyor:";
          } else {
            queryFilter = ["inbox", "in_progress", "waiting"];
            title = "📋 Açık notların:";
          }

          if (result.query_type !== "today") {
            const { data: queryNotes } = await supabase
              .from("notes")
              .select("content, due_date, type")
              .in("type", queryFilter)
              .order("due_date", { ascending: true, nullsFirst: false })
              .order("created_at", { ascending: false });

            if (!queryNotes || queryNotes.length === 0) {
              await sendTelegram("sendMessage", {
                chat_id: chatId,
                text: `${title}\n\nHiç not yok 🎉`,
              });
            } else {
              const lines = queryNotes.map((n: { content: string; due_date: string | null }) => {
                const due = n.due_date
                  ? `⏰ ${new Date(n.due_date).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" })} — `
                  : "• ";
                return `  ${due}${n.content}`;
              });
              await sendTelegram("sendMessage", {
                chat_id: chatId,
                text: `${title}\n${lines.join("\n")}`,
              });
            }
          }
        } else if (result.action === "create_multiple" && result.items && result.items.length > 0) {
          const rawItems = result.items.slice(0, 7);
          const items = rawItems.map((item: unknown) => typeof item === "string" ? item : (item as { content?: string }).content ?? String(item));
          for (const item of items) {
            await createNote(item, "telegram");
          }
          const list = items.map((item: string) => `• ${item}`).join("\n");
          await sendTelegram("sendMessage", {
            chat_id: chatId,
            text: `✓ ${items.length} not kaydedildi:\n${list}`,
          });
        } else {
          const note = await createNote(result.content ?? update.message.text, "telegram", result.due_date);

          if (result.needs_time && result.due_date) {
            const dateStr = new Date(result.due_date).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Istanbul" });
            await sendTelegram("sendMessage", {
              chat_id: chatId,
              text: `✓ kaydedildi (📅 ${dateStr})\nSaat kaçta hatırlatayım?`,
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: "09:00", callback_data: `settime:${note.id}:09:00` },
                    { text: "12:00", callback_data: `settime:${note.id}:12:00` },
                    { text: "15:00", callback_data: `settime:${note.id}:15:00` },
                    { text: "Hatırlatma istemiyorum", callback_data: `noreminder:${note.id}` },
                  ],
                ],
              },
            });
          } else if (result.due_date) {
            const dateStr = new Date(result.due_date).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });
            const dayStr = new Date(result.due_date).toLocaleDateString("tr-TR", { day: "numeric", month: "short", timeZone: "Europe/Istanbul" });
            await sendTelegram("sendMessage", {
              chat_id: chatId,
              text: `✓ "${result.content ?? update.message.text}" — kaydedildi (⏰ ${dayStr} ${dateStr})`,
            });
          } else {
            await sendTelegram("sendMessage", {
              chat_id: chatId,
              text: "✓ kaydedildi",
            });
          }
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
          } else if (result.action === "move" && result.confidence !== undefined && result.confidence >= 0.9) {
            const updateData: Record<string, unknown> = {
              type: result.target_type,
              updated_at: new Date().toISOString(),
            };
            if (result.due_date) {
              updateData.due_date = result.due_date;
              updateData.reminded = false;
              updateData.reminded_at = null;
            }
            await supabase
              .from("notes")
              .update(updateData)
              .eq("id", result.matched_note_id);

            const { data: note } = await supabase
              .from("notes")
              .select("content")
              .eq("id", result.matched_note_id)
              .single();

            const emoji = result.target_type === "in_progress" ? "📋" : "⏸";
            const label = result.target_type === "in_progress" ? "Yapılıyor" : "Beklemede";
            let text = `🎤 ${emoji} "${note?.content}" → ${label}`;
            if (result.due_date) {
              const dateStr = new Date(result.due_date).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });
              const dayStr = new Date(result.due_date).toLocaleDateString("tr-TR", { day: "numeric", month: "short", timeZone: "Europe/Istanbul" });
              text += `\n⏰ ${dayStr} ${dateStr}`;
            }
            await sendTelegram("sendMessage", {
              chat_id: chatId,
              text,
            });
          } else if (result.action === "move") {
            const { data: note } = await supabase
              .from("notes")
              .select("content")
              .eq("id", result.matched_note_id)
              .single();

            const label = result.target_type === "in_progress" ? "Yapılıyor" : "Beklemede";
            await sendTelegram("sendMessage", {
              chat_id: chatId,
              text: `🎤 "${note?.content}" → ${label}'a taşınsın mı?`,
              reply_to_message_id: update.message.message_id,
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: "Evet ✓", callback_data: `move_confirm:${result.matched_note_id}:${result.target_type}` },
                    { text: "Hayır", callback_data: `move_reject:${result.matched_note_id}` },
                  ],
                ],
              },
            });
          } else if (result.action === "reschedule" && result.matched_note_id && result.due_date) {
            await supabase
              .from("notes")
              .update({
                due_date: result.due_date,
                reminded: false,
                reminded_at: null,
                updated_at: new Date().toISOString(),
              })
              .eq("id", result.matched_note_id);

            const { data: note } = await supabase
              .from("notes")
              .select("content")
              .eq("id", result.matched_note_id)
              .single();

            const dateStr = new Date(result.due_date).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });
            const dayStr = new Date(result.due_date).toLocaleDateString("tr-TR", { day: "numeric", month: "short", timeZone: "Europe/Istanbul" });
            await sendTelegram("sendMessage", {
              chat_id: chatId,
              text: `🎤 ⏰ "${note?.content}" → ${dayStr} ${dateStr}`,
            });
          } else if (result.action === "query") {
            let queryFilter: string[];
            let title: string;

            if (result.query_type === "today") {
              const now = new Date();
              const istanbulOffset = 3 * 60;
              const localNow = new Date(now.getTime() + istanbulOffset * 60 * 1000);
              const todayStr = localNow.toISOString().split("T")[0];
              const todayStart = new Date(todayStr + "T00:00:00+03:00");
              const todayEnd = new Date(todayStr + "T23:59:59+03:00");

              const { data: todayDue } = await supabase
                .from("notes")
                .select("content, due_date, type")
                .neq("type", "done")
                .gte("due_date", todayStart.toISOString())
                .lte("due_date", todayEnd.toISOString())
                .order("due_date", { ascending: true });

              const { data: inProgressNoDue } = await supabase
                .from("notes")
                .select("content, due_date, type")
                .eq("type", "in_progress")
                .is("due_date", null)
                .order("created_at", { ascending: false });

              const todayNotes = [...(todayDue ?? []), ...(inProgressNoDue ?? [])];

              if (todayNotes.length === 0) {
                await sendTelegram("sendMessage", {
                  chat_id: chatId,
                  text: "🎤 📋 Bugünkü notların:\n\nHiç not yok 🎉",
                });
              } else {
                const lines = todayNotes.map((n: { content: string; due_date: string | null }) => {
                  const due = n.due_date
                    ? `⏰ ${new Date(n.due_date).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" })} — `
                    : "• ";
                  return `  ${due}${n.content}`;
                });
                await sendTelegram("sendMessage", {
                  chat_id: chatId,
                  text: `🎤 📋 Bugünkü notların:\n${lines.join("\n")}`,
                });
              }
            } else if (result.query_type === "waiting") {
              queryFilter = ["waiting"];
              title = "🎤 ⏸ Beklemede:";
            } else if (result.query_type === "in_progress") {
              queryFilter = ["in_progress"];
              title = "🎤 📋 Yapılıyor:";
            } else {
              queryFilter = ["inbox", "in_progress", "waiting"];
              title = "🎤 📋 Açık notların:";
            }

            if (result.query_type !== "today") {
              const { data: queryNotes } = await supabase
                .from("notes")
                .select("content, due_date, type")
                .in("type", queryFilter)
                .order("due_date", { ascending: true, nullsFirst: false })
                .order("created_at", { ascending: false });

              if (!queryNotes || queryNotes.length === 0) {
                await sendTelegram("sendMessage", {
                  chat_id: chatId,
                  text: `${title}\n\nHiç not yok 🎉`,
                });
              } else {
                const lines = queryNotes.map((n: { content: string; due_date: string | null }) => {
                  const due = n.due_date
                    ? `⏰ ${new Date(n.due_date).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" })} — `
                    : "• ";
                  return `  ${due}${n.content}`;
                });
                await sendTelegram("sendMessage", {
                  chat_id: chatId,
                  text: `${title}\n${lines.join("\n")}`,
                });
              }
            }
          } else if (result.action === "create_multiple" && result.items && result.items.length > 0) {
            const rawItems = result.items.slice(0, 7);
            const items = rawItems.map((item: unknown) => typeof item === "string" ? item : (item as { content?: string }).content ?? String(item));
            for (const item of items) {
              await createNote(item, "voice");
            }
            const list = items.map((item: string) => `• ${item}`).join("\n");
            await sendTelegram("sendMessage", {
              chat_id: chatId,
              text: `🎤 ${items.length} not kaydedildi:\n${list}`,
            });
          } else {
            const note = await createNote(result.content ?? transcript, "voice", result.due_date);

            if (result.needs_time && result.due_date) {
              const dateStr = new Date(result.due_date).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Istanbul" });
              await sendTelegram("sendMessage", {
                chat_id: chatId,
                text: `🎤 ✓ kaydedildi (📅 ${dateStr})\nSaat kaçta hatırlatayım?`,
                reply_markup: {
                  inline_keyboard: [
                    [
                      { text: "09:00", callback_data: `settime:${note.id}:09:00` },
                      { text: "12:00", callback_data: `settime:${note.id}:12:00` },
                      { text: "15:00", callback_data: `settime:${note.id}:15:00` },
                      { text: "Hatırlatma istemiyorum", callback_data: `noreminder:${note.id}` },
                    ],
                  ],
                },
              });
            } else if (result.due_date) {
              const dateStr = new Date(result.due_date).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });
              const dayStr = new Date(result.due_date).toLocaleDateString("tr-TR", { day: "numeric", month: "short", timeZone: "Europe/Istanbul" });
              await sendTelegram("sendMessage", {
                chat_id: chatId,
                text: `🎤 "${result.content ?? transcript}" — kaydedildi (⏰ ${dayStr} ${dateStr})`,
              });
            } else {
              await sendTelegram("sendMessage", {
                chat_id: chatId,
                text: `🎤 "${result.content ?? transcript}" — kaydedildi`,
              });
            }
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

      } else if (action === "move_confirm") {
        const parts = data.split(":");
        const noteId2 = parts[1];
        const targetType = parts[2];
        await supabase
          .from("notes")
          .update({ type: targetType, updated_at: new Date().toISOString() })
          .eq("id", noteId2);

        const { data: note } = await supabase
          .from("notes")
          .select("content")
          .eq("id", noteId2)
          .single();

        const emoji = targetType === "in_progress" ? "📋" : "⏸";
        const label = targetType === "in_progress" ? "Yapılıyor" : "Beklemede";
        await sendTelegram("editMessageText", {
          chat_id: chatId,
          message_id: messageId,
          text: `${emoji} "${note?.content}" → ${label}`,
        });

      } else if (action === "move_reject") {
        await sendTelegram("editMessageText", {
          chat_id: chatId,
          message_id: messageId,
          text: "İptal edildi",
        });

      } else if (action === "settime") {
        const parts = data.split(":");
        const noteId2 = parts[1];
        const hours = parts[2];
        const minutes = parts[3];

        const { data: note } = await supabase
          .from("notes")
          .select("due_date")
          .eq("id", noteId2)
          .single();

        if (note?.due_date) {
          const newDate = new Date(note.due_date);
          newDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          await supabase
            .from("notes")
            .update({ due_date: newDate.toISOString(), updated_at: new Date().toISOString() })
            .eq("id", noteId2);

          await sendTelegram("editMessageText", {
            chat_id: chatId,
            message_id: messageId,
            text: `⏰ Hatırlatma ${hours}:${minutes}'e ayarlandı`,
          });
        }

      } else if (action === "noreminder") {
        await supabase
          .from("notes")
          .update({ reminded: true, updated_at: new Date().toISOString() })
          .eq("id", noteId);

        await sendTelegram("editMessageText", {
          chat_id: chatId,
          message_id: messageId,
          text: "✓ Hatırlatma iptal edildi",
        });

      } else if (action === "reminder_done") {
        await supabase
          .from("notes")
          .update({ type: "done", updated_at: new Date().toISOString() })
          .eq("id", noteId);

        const { data: note } = await supabase
          .from("notes")
          .select("content")
          .eq("id", noteId)
          .single();

        await sendTelegram("editMessageText", {
          chat_id: chatId,
          message_id: messageId,
          text: `✓ "${note?.content}" tamamlandı`,
        });

      } else if (action === "reminder_snooze") {
        const { data: note } = await supabase
          .from("notes")
          .select("due_date")
          .eq("id", noteId)
          .single();

        if (note?.due_date) {
          const newDate = new Date(note.due_date);
          newDate.setHours(newDate.getHours() + 1);
          await supabase
            .from("notes")
            .update({
              due_date: newDate.toISOString(),
              reminded: false,
              reminded_at: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", noteId);

          const timeStr = newDate.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });
          await sendTelegram("editMessageText", {
            chat_id: chatId,
            message_id: messageId,
            text: `⏰ ${timeStr}'e ertelendi`,
          });
        }
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
