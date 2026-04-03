# Telegram Bot (Phase 2 + 2.5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Supabase Edge Function ile Telegram'dan not yakalama (text + ses) ve mevcut notları akıllı tamamlama

**Architecture:** Tek Supabase Edge Function (`telegram-webhook`) tüm Telegram mesajlarını alır. Text mesajlar doğrudan Claude API'ye, ses mesajları önce Groq Whisper'a sonra Claude'a gider. Claude hem sınıflandırma (yeni not / tamamlama) hem ses temizleme yapar. Belirsiz eşleşmelerde Telegram inline keyboard ile onay istenir.

**Tech Stack:** Supabase Edge Functions (Deno), Claude API (Haiku), Groq Whisper API, Telegram Bot API

**Spec:** `docs/superpowers/specs/2026-03-30-telegram-bot-design.md`

---

## File Structure

```
supabase/
  functions/
    telegram-webhook/
      index.ts          # Tek dosya — webhook handler, tüm logic burada
```

Mevcut dosyalarda değişiklik yok. DB şeması yeterli.

---

### Task 1: Supabase Edge Function scaffold + basit echo

**Files:**
- Create: `supabase/functions/telegram-webhook/index.ts`

- [ ] **Step 1: Supabase init (eğer yoksa)**

```bash
cd c:/Users/duruk/toss
npx supabase init
```

Bu `supabase/` dizinini ve `config.toml` dosyasını oluşturur. Zaten mevcut dosyaları ezmez.

- [ ] **Step 2: Edge Function oluştur**

```bash
npx supabase functions new telegram-webhook
```

Bu `supabase/functions/telegram-webhook/index.ts` dosyasını oluşturur.

- [ ] **Step 3: Minimal echo handler yaz**

`supabase/functions/telegram-webhook/index.ts` içeriğini şu şekilde değiştir:

```typescript
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
```

- [ ] **Step 4: Secrets ayarla**

```bash
npx supabase secrets set TELEGRAM_BOT_TOKEN="<bot-token>"
npx supabase secrets set TELEGRAM_OWNER_CHAT_ID="<chat-id>"
npx supabase secrets set TELEGRAM_WEBHOOK_SECRET="<rastgele-string>"
```

Kullanıcıdan bu değerleri iste.

`TELEGRAM_OWNER_CHAT_ID` bulmak için: Telegram'da @userinfobot'a mesaj at, chat ID'ni öğren.

- [ ] **Step 5: Deploy et**

```bash
npx supabase functions deploy telegram-webhook --no-verify-jwt
```

`--no-verify-jwt` gerekli — Telegram webhook'u Supabase JWT göndermez, kendi secret header'ı ile doğrularız.

- [ ] **Step 6: Telegram webhook'u kaydet**

```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://fuctxjzkddlmwdqtzoiz.supabase.co/functions/v1/telegram-webhook",
    "secret_token": "<WEBHOOK_SECRET>"
  }'
```

- [ ] **Step 7: Manuel test — Telegram'dan mesaj at**

tossinBot'a "merhaba" yaz. "Echo: merhaba" yanıtı gelmeli.

- [ ] **Step 8: Commit**

```bash
git add supabase/
git commit -m "feat: telegram webhook scaffold with echo handler"
```

---

### Task 2: Text mesaj → basit inbox'a kaydet (Phase 2 core)

**Files:**
- Modify: `supabase/functions/telegram-webhook/index.ts`

- [ ] **Step 1: Supabase client + not oluşturma ekle**

Echo handler'ı kaldır. Yerine DB'ye not kaydeden handler yaz:

```typescript
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
  } catch (err) {
    console.error("Error:", err);
    await sendTelegram("sendMessage", {
      chat_id: chatId,
      text: "Bir hata oluştu",
    });
  }

  return new Response("OK");
});
```

- [ ] **Step 2: Deploy**

```bash
npx supabase functions deploy telegram-webhook --no-verify-jwt
```

- [ ] **Step 3: Manuel test**

tossinBot'a "market alışverişi" yaz. "✓ kaydedildi" yanıtı gelmeli. Web app'te Inbox'ta görünmeli.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/telegram-webhook/index.ts
git commit -m "feat: telegram text messages save to inbox"
```

---

### Task 3: Ses mesajı → Groq Whisper → inbox'a kaydet

**Files:**
- Modify: `supabase/functions/telegram-webhook/index.ts`

- [ ] **Step 1: GROQ_API_KEY secret ekle**

```bash
npx supabase secrets set GROQ_API_KEY="<groq-api-key>"
```

- [ ] **Step 2: Voice handler ekle**

`index.ts`'e şu fonksiyonu ekle (createNote'un altına):

```typescript
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
```

- [ ] **Step 3: Voice mesaj routing ekle**

`try` bloğunun içine, text handler'ın altına:

```typescript
    if (update.message?.voice) {
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
    }
```

- [ ] **Step 4: Whisper hata handling**

Voice handler'ı try/catch ile sar (Whisper hatası için):

```typescript
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
```

- [ ] **Step 5: Deploy**

```bash
npx supabase functions deploy telegram-webhook --no-verify-jwt
```

- [ ] **Step 6: Manuel test**

tossinBot'a ses mesajı gönder. `🎤 "transcript metni" — kaydedildi` yanıtı gelmeli.

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/telegram-webhook/index.ts
git commit -m "feat: voice messages via Groq Whisper transcription"
```

---

### Task 4: Claude API entegrasyonu — akıllı sınıflandırma (Phase 2.5)

**Files:**
- Modify: `supabase/functions/telegram-webhook/index.ts`

- [ ] **Step 1: ANTHROPIC_API_KEY secret ekle**

```bash
npx supabase secrets set ANTHROPIC_API_KEY="<anthropic-api-key>"
```

- [ ] **Step 2: Claude sınıflandırma fonksiyonu ekle**

```typescript
interface ClassifyResult {
  action: "complete" | "create";
  matched_note_id?: string;
  confidence?: number;
  content?: string;
}

async function classifyMessage(
  message: string,
  isVoice: boolean
): Promise<ClassifyResult> {
  // Açık notları çek
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
2. Tamamlama sinyalleri: "ödendi", "bitti", "yaptım", "hallettim", "tamamlandı", "gönderdim", "aldım", "done", "paid", "finished", "completed", "sent"${voiceHint}

JSON döndür (başka bir şey yazma):
{ "action": "complete", "matched_note_id": "uuid", "confidence": 0.95 }
veya
{ "action": "create", "content": "temizlenmiş not metni" }`,
        },
      ],
    }),
  });

  const data = await res.json();
  const text = data.content[0].text;
  return JSON.parse(text);
}
```

- [ ] **Step 3: Text handler'ı Claude ile değiştir**

Mevcut basit `createNote` çağrısını kaldır. Yerine:

```typescript
    if (update.message?.text) {
      const result = await classifyMessage(update.message.text, false);

      if (result.action === "complete" && result.confidence !== undefined && result.confidence >= 0.8) {
        // Yüksek güvenle tamamla
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
        // Düşük güven — onay iste
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
      } else {
        // Yeni not
        await createNote(result.content ?? update.message.text, "telegram");
        await sendTelegram("sendMessage", {
          chat_id: chatId,
          text: "✓ kaydedildi",
        });
      }
    }
```

- [ ] **Step 4: Voice handler'ı Claude ile güncelle**

Mevcut voice handler'ın içini güncelle — transcript'i Claude'a gönder:

```typescript
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

        const result = await classifyMessage(transcript, true);

        if (result.action === "complete" && result.confidence !== undefined && result.confidence >= 0.8) {
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
        } else {
          await createNote(result.content ?? transcript, "voice");
          await sendTelegram("sendMessage", {
            chat_id: chatId,
            text: `🎤 "${result.content ?? transcript}" — kaydedildi`,
          });
        }
      } catch {
        await sendTelegram("sendMessage", {
          chat_id: chatId,
          text: "Ses işlenemedi, tekrar dene",
        });
      }
    }
```

- [ ] **Step 5: Claude API fallback**

`classifyMessage` fonksiyonunda hata olursa, mesajı olduğu gibi inbox'a kaydetmek için handler'ları try/catch ile sar. Text handler örneği:

Step 3'teki text handler kodunun tamamını bir `try/catch` ile sar. Catch bloğunda:

```typescript
      } catch {
        // Claude başarısız — fallback: olduğu gibi kaydet
        await createNote(update.message.text, "telegram");
        await sendTelegram("sendMessage", {
          chat_id: chatId,
          text: "✓ kaydedildi (sınıflandırma yapılamadı)",
        });
      }
```

Voice handler (Step 4) için aynı pattern: mevcut dış `catch` Whisper hatasını yakalar. `classifyMessage` çağrısını ve sonrasını ek bir iç `try/catch` ile sar — iç catch'te:

```typescript
        } catch {
          // Claude başarısız — transcript'i olduğu gibi kaydet
          await createNote(transcript, "voice");
          await sendTelegram("sendMessage", {
            chat_id: chatId,
            text: `🎤 "${transcript}" — kaydedildi (sınıflandırma yapılamadı)`,
          });
        }
```

- [ ] **Step 6: Deploy**

```bash
npx supabase functions deploy telegram-webhook --no-verify-jwt
```

- [ ] **Step 7: Manuel test — yeni not**

Hiç not yokken tossinBot'a "yarın doktora git" yaz. "✓ kaydedildi" gelmeli.

- [ ] **Step 8: Manuel test — tamamlama**

Web app'ten "elektrik faturasını öde" notu oluştur. Sonra tossinBot'a "elektrik faturası ödendi" yaz. `✓ "elektrik faturasını öde" tamamlandı` gelmeli.

- [ ] **Step 9: Commit**

```bash
git add supabase/functions/telegram-webhook/index.ts
git commit -m "feat: Claude API smart classification for note completion"
```

---

### Task 5: Inline keyboard confirmation flow

**Files:**
- Modify: `supabase/functions/telegram-webhook/index.ts`

- [ ] **Step 1: Callback query handler ekle**

`try` bloğunun içine, voice handler'ın altına:

```typescript
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
```

- [ ] **Step 2: Deploy**

```bash
npx supabase functions deploy telegram-webhook --no-verify-jwt
```

- [ ] **Step 3: Manuel test — confirm flow**

1. Web app'ten "bankayı ara" notu oluştur
2. tossinBot'a "banka işi halloldu" yaz (belirsiz eşleşme bekleniyor)
3. "Bunu mu tamamladın?" mesajı gelmeli, inline butonlarla
4. "Evet ✓" butonuna tıkla
5. Mesaj "✓ 'bankayı ara' tamamlandı" olarak güncellenmeli
6. Web app'te not "done" durumunda olmalı

- [ ] **Step 4: Manuel test — reject flow**

1. Web app'ten "anne hediyesi al" notu oluştur
2. tossinBot'a "anneyi aradım" yaz
3. "Bunu mu tamamladın?" gelmeli
4. "Hayır, yeni not" butonuna tıkla
5. Mesaj "✓ yeni not olarak kaydedildi" olarak güncellenmeli
6. Web app'te "anneyi aradım" yeni not olarak inbox'ta görünmeli

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/telegram-webhook/index.ts
git commit -m "feat: inline keyboard confirmation for uncertain matches"
```

---

### Task 6: Son kontroller + temizlik

**Files:**
- Modify: `supabase/functions/telegram-webhook/index.ts` (gerekirse)

- [ ] **Step 1: Uçtan uca test — text yeni not**

tossinBot'a "yarın diş randevusu" yaz → "✓ kaydedildi" → Web app inbox'ta görünüyor

- [ ] **Step 2: Uçtan uca test — text tamamlama**

Web app'ten "diş randevusuna git" oluştur → tossinBot'a "diş randevusuna gittim" yaz → "✓ tamamlandı" → Web app'te done

- [ ] **Step 3: Uçtan uca test — ses yeni not**

Ses mesajı gönder "market alışverişi yap" → `🎤 "..." — kaydedildi`

- [ ] **Step 4: Uçtan uca test — ses tamamlama**

Web app'ten "market alışverişi" notu oluştur → Ses mesajı gönder "market alışverişini yaptım" → tamamlama mesajı

- [ ] **Step 5: Edge case — boş inbox ile mesaj**

Tüm notları sil/done yap → tossinBot'a "yeni bir şey" yaz → "✓ kaydedildi" (Claude açık not bulamazsa create döner)

- [ ] **Step 6: Edge case — bilinmeyen kullanıcı**

Başka bir Telegram hesabından tossinBot'a mesaj at → yanıt gelmemeli

- [ ] **Step 7: Günlük log güncelle**

`logs/2026-03-30.md` dosyasına yapılanları ekle.

- [ ] **Step 8: Final commit**

```bash
git add -A
git commit -m "feat: telegram bot Phase 2 + 2.5 complete — text, voice, smart completion"
```
