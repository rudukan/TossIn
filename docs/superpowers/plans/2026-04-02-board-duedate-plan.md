# Board Sadeleştirme + Due Date & Hatırlatma Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Board kolonlarını sadeleştir (in_progress/waiting), due_date + hatırlatma sistemi ekle, Telegram'dan board yönetimi + query desteği

**Architecture:** DB migration ile type'lar ve kolonlar güncellenir. Claude prompt'una move/query/due_date action'ları eklenir. Yeni `reminder-cron` Edge Function her dakika hatırlatma kontrolü yapar. Web app board + kartlar güncellenir.

**Tech Stack:** Supabase (Postgres + Edge Functions + pg_cron), Claude API (Haiku), Telegram Bot API, Next.js 16, React 19, dnd-kit

**Spec:** `docs/superpowers/specs/2026-04-02-board-duedate-design.md`

---

## File Structure

```
src/lib/types.ts                                    # NoteType güncelle, due_date/reminded ekle
src/lib/hooks/useNotes.ts                           # Type filtre güncelle
src/components/KanbanBoard.tsx                       # Kolon isimleri, due_date gösterimi
src/components/NoteCard.tsx                          # due_date gösterimi
src/app/page.tsx                                     # Type referansları güncelle
supabase/functions/telegram-webhook/index.ts         # Prompt, action'lar, callback'ler
supabase/functions/reminder-cron/index.ts            # Yeni — hatırlatma Edge Function
```

---

### Task 1: DB Migration — type değişikliği + yeni kolonlar

**Files:**
- Migration via Supabase MCP

- [ ] **Step 1: Type constraint değiştir ve mevcut verileri migrate et**

Supabase MCP ile çalıştır:

```sql
ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_type_check;
ALTER TABLE notes ADD CONSTRAINT notes_type_check 
  CHECK (type IN ('inbox', 'in_progress', 'waiting', 'done'));

UPDATE notes SET type = 'in_progress' WHERE type = 'actionable';
UPDATE notes SET type = 'waiting' WHERE type = 'reference';
```

- [ ] **Step 2: due_date, reminded, reminded_at kolonları ekle**

```sql
ALTER TABLE notes ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS reminded BOOLEAN DEFAULT false;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS reminded_at TIMESTAMPTZ;
```

- [ ] **Step 3: due_date index ekle (hatırlatma sorgusu için)**

```sql
CREATE INDEX IF NOT EXISTS idx_notes_due_date ON notes(due_date) WHERE due_date IS NOT NULL AND reminded = false;
```

- [ ] **Step 4: Doğrula**

```sql
SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'notes' ORDER BY ordinal_position;
```

`due_date`, `reminded`, `reminded_at` kolonlarının var olduğunu, type constraint'in güncellendiğini doğrula.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: db migration — new note types + due_date columns"
```

---

### Task 2: TypeScript types + useNotes hook güncelleme

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/hooks/useNotes.ts`

- [ ] **Step 1: types.ts güncelle**

`src/lib/types.ts` dosyasını şu şekilde değiştir:

```typescript
export type NoteType = 'inbox' | 'in_progress' | 'waiting' | 'done'
export type NoteSource = 'web' | 'telegram' | 'voice'

export interface Note {
  id: string
  user_id: string
  content: string
  type: NoteType
  tags: string[]
  is_starred: boolean
  source: NoteSource
  due_date: string | null
  reminded: boolean
  reminded_at: string | null
  created_at: string
  updated_at: string
}
```

- [ ] **Step 2: useNotes.ts — updateNote'a due_date desteği ekle**

`src/lib/hooks/useNotes.ts` satır 67'deki `updateNote` signature'ını güncelle:

```typescript
  const updateNote = async (id: string, updates: Partial<Pick<Note, 'content' | 'type' | 'tags' | 'is_starred' | 'due_date'>>) => {
```

- [ ] **Step 3: Build kontrol**

```bash
cd c:/Users/duruk/toss && npm run build 2>&1 | head -20
```

TypeScript hatası olmamalı.

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts src/lib/hooks/useNotes.ts && git commit -m "feat: update TypeScript types for new board + due_date"
```

---

### Task 3: KanbanBoard + NoteCard UI güncelleme

**Files:**
- Modify: `src/components/KanbanBoard.tsx`
- Modify: `src/components/NoteCard.tsx`

- [ ] **Step 1: KanbanBoard.tsx — kolon tanımlarını güncelle**

Satır 22-27'deki `columns` array'ini değiştir:

```typescript
const columns: { id: NoteType; label: string; color: string }[] = [
  { id: 'inbox', label: 'Inbox', color: 'text-blue-400' },
  { id: 'in_progress', label: 'Yapılıyor', color: 'text-orange-400' },
  { id: 'waiting', label: 'Beklemede', color: 'text-purple-400' },
  { id: 'done', label: 'Bitti', color: 'text-green-400' },
]
```

- [ ] **Step 2: KanbanBoard.tsx — SortableCard'da due_date göster**

SortableCard component'inin return bölümünde, content'ten sonra due_date gösterimi ekle (satır 54'ten sonra):

```typescript
      <p className="text-sm leading-relaxed text-zinc-200">{note.content}</p>
      {note.due_date && (
        <p className={`mt-1 text-[10px] font-medium ${
          new Date(note.due_date) < new Date() ? 'text-red-400' :
          new Date(note.due_date).toDateString() === new Date().toDateString() ? 'text-yellow-400' :
          'text-zinc-500'
        }`}>
          {new Date(note.due_date) < new Date() ? '⚠️' :
           new Date(note.due_date).toDateString() === new Date().toDateString() ? '🔴' : '⏰'}{' '}
          {new Date(note.due_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}{' '}
          {new Date(note.due_date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      )}
```

- [ ] **Step 3: NoteCard.tsx — due_date gösterimi ekle**

`src/components/NoteCard.tsx` dosyasını oku, not content'inden sonra aynı due_date gösterim pattern'ini ekle.

- [ ] **Step 4: NoteCard.tsx — type changer butonlarını güncelle**

NoteCard'daki type changer butonlarında `actionable` → `in_progress`, `reference` → `waiting` olarak güncelle. Label'ları da "Yapılıyor" ve "Beklemede" yap.

- [ ] **Step 5: Build + görsel kontrol**

```bash
cd c:/Users/duruk/toss && npm run build 2>&1 | head -20
```

Hata yoksa `npm run dev` ile localhost:3000/board açıp board'un 4 kolonu doğru gösterdiğini kontrol et.

- [ ] **Step 6: Commit**

```bash
git add src/components/KanbanBoard.tsx src/components/NoteCard.tsx && git commit -m "feat: update board UI — new columns + due_date display"
```

---

### Task 4: Telegram webhook — prompt + move/query/due_date

**Files:**
- Modify: `supabase/functions/telegram-webhook/index.ts`

- [ ] **Step 1: ClassifyResult interface güncelle**

```typescript
interface ClassifyResult {
  action: "complete" | "create" | "create_multiple" | "move" | "query";
  matched_note_id?: string;
  confidence?: number;
  content?: string;
  items?: string[];
  target_type?: "in_progress" | "waiting";
  query_type?: "today" | "waiting" | "in_progress" | "all_open";
  due_date?: string | null;
  needs_time?: boolean;
}
```

- [ ] **Step 2: classifyMessage — type filter ve prompt güncelle**

`.in("type", ["inbox", "actionable"])` satırını değiştir:

```typescript
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
```

- [ ] **Step 3: Claude prompt'u güncelle**

Mevcut prompt'u tamamen şununla değiştir:

```typescript
          content: `Sen bir not asistanısın. Kullanıcının mesajını analiz et.
Bugünün tarihi: ${new Date().toISOString().split("T")[0]}

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
8. Mesajda tarih/saat bilgisi varsa due_date olarak çıkar (ISO 8601). "yarın" = bir sonraki gün, "cuma" = en yakın cuma. Saat belirtilmemişse needs_time: true.${voiceHint}

JSON döndür (başka bir şey yazma):
{ "action": "complete", "matched_note_id": "uuid", "confidence": 0.95 }
veya
{ "action": "create", "content": "temizlenmiş not", "due_date": "2026-04-03T15:00:00" }
veya
{ "action": "create", "content": "temizlenmiş not", "due_date": "2026-04-04", "needs_time": true }
veya
{ "action": "create_multiple", "items": ["not 1", "not 2"] }
veya
{ "action": "move", "matched_note_id": "uuid", "target_type": "in_progress", "confidence": 0.95 }
veya
{ "action": "query", "query_type": "today" }`,
```

- [ ] **Step 4: createNote fonksiyonuna due_date desteği ekle**

```typescript
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
```

- [ ] **Step 5: Text handler — move action ekle**

Text handler'daki `try` bloğunda, `create_multiple` else-if'inden önce:

```typescript
        } else if (result.action === "move" && result.confidence !== undefined && result.confidence >= 0.9) {
          await supabase
            .from("notes")
            .update({ type: result.target_type, updated_at: new Date().toISOString() })
            .eq("id", result.matched_note_id);

          const { data: note } = await supabase
            .from("notes")
            .select("content")
            .eq("id", result.matched_note_id)
            .single();

          const emoji = result.target_type === "in_progress" ? "📋" : "⏸";
          const label = result.target_type === "in_progress" ? "Yapılıyor" : "Beklemede";
          await sendTelegram("sendMessage", {
            chat_id: chatId,
            text: `${emoji} "${note?.content}" → ${label}`,
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
```

- [ ] **Step 6: Text handler — query action ekle**

Move handler'dan sonra:

```typescript
        } else if (result.action === "query") {
          let queryFilter: string[];
          let title: string;

          if (result.query_type === "today") {
            queryFilter = ["inbox", "in_progress"];
            title = "📋 Bugünkü notların:";
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
                ? `⏰ ${new Date(n.due_date).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })} — `
                : "• ";
              return `  ${due}${n.content}`;
            });
            await sendTelegram("sendMessage", {
              chat_id: chatId,
              text: `${title}\n${lines.join("\n")}`,
            });
          }
```

- [ ] **Step 7: Text handler — create'e due_date desteği ekle**

Mevcut create handler'ını güncelle:

```typescript
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
          const note = await createNote(result.content ?? update.message.text, "telegram", result.due_date);

          if (result.needs_time && result.due_date) {
            const dateStr = new Date(result.due_date).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });
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
            const dateStr = new Date(result.due_date).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
            const dayStr = new Date(result.due_date).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
            await sendTelegram("sendMessage", {
              chat_id: chatId,
              text: `✓ kaydedildi (⏰ ${dayStr} ${dateStr})`,
            });
          } else {
            await sendTelegram("sendMessage", {
              chat_id: chatId,
              text: "✓ kaydedildi",
            });
          }
        }
```

- [ ] **Step 8: Voice handler — aynı move/query/due_date desteği**

Voice handler'daki `classifyMessage(transcript, true)` sonrası handler'ları text handler ile aynı pattern'de güncelle. Move, query ve due_date create akışlarını voice handler'a da ekle (text handler'daki aynı kod, sadece emoji prefix'leri `🎤` ile).

- [ ] **Step 9: Callback handler — yeni callback'leri ekle**

Mevcut callback_query handler'ına, `reject` bloğunun altına:

```typescript
      } else if (action === "move_confirm") {
        const [, noteId2, targetType] = data.split(":");
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

          const timeStr = newDate.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
          await sendTelegram("editMessageText", {
            chat_id: chatId,
            message_id: messageId,
            text: `⏰ ${timeStr}'e ertelendi`,
          });
        }
      }
```

- [ ] **Step 10: Deploy**

```bash
npx supabase functions deploy telegram-webhook --no-verify-jwt
```

- [ ] **Step 11: Manuel test — move**

Web app'ten "doktora git" notu oluştur. tossinBot'a "doktora git'e başlıyorum" yaz. "📋 yapılıyor'a taşındı" gelmeli.

- [ ] **Step 12: Manuel test — query**

tossinBot'a "bugün ne var?" yaz. Açık notların listesi gelmeli.

- [ ] **Step 13: Manuel test — due_date**

tossinBot'a "yarın 15:00'te toplantı" yaz. "✓ kaydedildi (⏰ 3 Nis 15:00)" gelmeli.

- [ ] **Step 14: Manuel test — needs_time**

tossinBot'a "cuma fatura öde" yaz. Saat seçim butonları gelmeli. Bir saat seç, onaylandığını gör.

- [ ] **Step 15: Commit**

```bash
git add supabase/functions/telegram-webhook/index.ts && git commit -m "feat: telegram move/query/due_date actions"
```

---

### Task 5: Reminder cron Edge Function

**Files:**
- Create: `supabase/functions/reminder-cron/index.ts`

- [ ] **Step 1: Edge Function oluştur**

```bash
cd c:/Users/duruk/toss && npx supabase functions new reminder-cron
```

- [ ] **Step 2: reminder-cron handler yaz**

`supabase/functions/reminder-cron/index.ts`:

```typescript
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

    // 2. Cevapsız hatırlatmaları kontrol et (30 dk geçmiş)
    const { data: unanswered } = await supabase
      .from("notes")
      .select("id, content")
      .eq("reminded", true)
      .not("reminded_at", "is", null)
      .not("type", "in", '("done","waiting")')
      .lte("reminded_at", new Date(Date.now() - 30 * 60 * 1000).toISOString());

    if (unanswered && unanswered.length > 0) {
      for (const note of unanswered) {
        await supabase
          .from("notes")
          .update({ type: "waiting", updated_at: new Date().toISOString() })
          .eq("id", note.id);

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
```

- [ ] **Step 3: Cevapsız notlar query'sini düzelt**

Supabase JS client `.not("type", "in", ...)` syntax'ı farklı çalışabilir. Alternatif:

```typescript
    const { data: unanswered } = await supabase
      .from("notes")
      .select("id, content")
      .eq("reminded", true)
      .not("reminded_at", "is", null)
      .not("type", "eq", "done")
      .not("type", "eq", "waiting")
      .lte("reminded_at", new Date(Date.now() - 30 * 60 * 1000).toISOString());
```

- [ ] **Step 4: Deploy reminder-cron**

```bash
npx supabase functions deploy reminder-cron --no-verify-jwt
```

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/reminder-cron/ && git commit -m "feat: reminder cron edge function"
```

---

### Task 6: pg_cron setup — her dakika hatırlatma kontrolü

**Files:**
- Supabase SQL via MCP

- [ ] **Step 1: pg_cron ve pg_net extension'larını aktif et**

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
```

- [ ] **Step 2: Cron job oluştur**

Service role key'i Supabase dashboard'dan al (Settings > API > service_role key). Sonra:

```sql
SELECT cron.schedule(
  'check-reminders',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://fuctxjzkddlmwdqtzoiz.supabase.co/functions/v1/reminder-cron',
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    )
  );
  $$
);
```

Kullanıcıdan service role key'i iste.

- [ ] **Step 3: Cron job'ı doğrula**

```sql
SELECT * FROM cron.job;
```

`check-reminders` job'ın listelendiğini doğrula.

- [ ] **Step 4: Manuel test — hatırlatma**

1. tossinBot'a "5 dakika sonraya test hatırlatma" yaz (veya web'den due_date'i şu andan 1 dk sonrasına ayarlı not oluştur)
2. Birkaç dakika bekle
3. "⏰ ... 15 dakika kaldı!" mesajı gelmeli
4. "Tamamladım ✓" butonuna tıkla → not done olmalı

- [ ] **Step 5: Manuel test — ertele**

1. Aynı testi tekrarla
2. Bu sefer "Ertele 1 saat" butonuna tıkla
3. Due date 1 saat ileri gitmeli, reminded = false olmalı

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: pg_cron reminder job — 1 min interval"
```

---

### Task 7: Son kontroller + temizlik

**Files:**
- Modify: various (gerekirse)

- [ ] **Step 1: Uçtan uca test — yeni not + due_date**

tossinBot'a "yarın saat 3'te doktora git" → kaydedildi + ⏰ gösterimi

- [ ] **Step 2: Uçtan uca test — saat sorma**

tossinBot'a "cuma fatura öde" → saat seçim butonları → bir saat seç

- [ ] **Step 3: Uçtan uca test — move**

tossinBot'a "doktora git'e başlıyorum" → yapılıyor'a taşındı. Web board'da doğru kolonda.

- [ ] **Step 4: Uçtan uca test — query**

tossinBot'a "bugün ne var?" → açık notlar listesi

- [ ] **Step 5: Uçtan uca test — hatırlatma + ertele**

Due date'i yakın bir not oluştur, hatırlatma geldiğinde ertele, tekrar geldiğini doğrula.

- [ ] **Step 6: Uçtan uca test — cevapsız → waiting**

Due date'i yakın not oluştur, hatırlatma geldiğinde hiçbir şey yapma, 30 dk sonra (veya test için reminder_at'ı manual güncelle) waiting'e alındığını doğrula.

- [ ] **Step 7: Web board kontrol**

localhost:3000/board — 4 kolon doğru isimlerle, drag-drop çalışıyor, due_date gösterimi doğru.

- [ ] **Step 8: Push**

```bash
git push origin master
```

- [ ] **Step 9: Günlük log**

`logs/2026-04-02.md` dosyasına yapılanları yaz.
