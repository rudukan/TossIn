import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const OWNER_CHAT_ID = Deno.env.get("TELEGRAM_OWNER_CHAT_ID")!;
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

Deno.serve(async (_req) => {
  try {
    // 1. Hatırlatma zamanı gelen notları bul (15 dk önce)
    const { data: dueNotes } = await supabase
      .from("notes")
      .select("id, content, due_date")
      .eq("reminded", false)
      .neq("type", "done")
      .not("due_date", "is", null)
      .lte("due_date", new Date(Date.now() + 15 * 60 * 1000).toISOString());

    if (dueNotes && dueNotes.length > 0) {
      for (const note of dueNotes) {
        await sendTelegram("sendMessage", {
          chat_id: OWNER_CHAT_ID,
          text: `⏰ "${note.content}" — 15 dakika kaldı!`,
          reply_markup: {
            inline_keyboard: [
              [
                { text: "Tamamladım ✓", callback_data: `reminder_done:${note.id}` },
                { text: "Ertele 1 saat", callback_data: `reminder_snooze:${note.id}` },
              ],
            ],
          },
        });

        await supabase
          .from("notes")
          .update({ reminded: true, reminded_at: new Date().toISOString() })
          .eq("id", note.id);
      }
    }

    // 2. Cevapsız hatırlatmaları kontrol et (30 dk geçmiş, en fazla 60 dk)
    // .in() ile explicit allowlist — done ve waiting hariç
    // Sadece son 1 saatte hatırlatılan notlar — eski reminded notlar zaten işlenmiş
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const sixtyMinAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: unanswered, error: unansweredErr } = await supabase
      .from("notes")
      .select("id, content, type")
      .eq("reminded", true)
      .in("type", ["inbox", "in_progress"])
      .not("reminded_at", "is", null)
      .lte("reminded_at", thirtyMinAgo)
      .gte("reminded_at", sixtyMinAgo);

    if (unansweredErr) {
      console.error("Unanswered query error:", unansweredErr);
    }

    if (unanswered && unanswered.length > 0) {
      for (const note of unanswered) {
        const { error: updateErr } = await supabase
          .from("notes")
          .update({ type: "waiting", updated_at: new Date().toISOString() })
          .eq("id", note.id)
          .eq("reminded", true) // race protection — yalnızca hala reminded=true ise
          .in("type", ["inbox", "in_progress"]); // güncel type hala uygun mu

        if (updateErr) {
          console.error(`Move to waiting failed for ${note.id}:`, updateErr);
          continue;
        }

        await sendTelegram("sendMessage", {
          chat_id: OWNER_CHAT_ID,
          text: `⏸ "${note.content}" beklemede'ye alındı`,
        });
      }
    }

    return new Response(JSON.stringify({ ok: true, reminders: dueNotes?.length ?? 0, moved: unanswered?.length ?? 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Reminder cron error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
