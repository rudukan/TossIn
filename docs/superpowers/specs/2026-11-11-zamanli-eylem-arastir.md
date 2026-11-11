# Zamanlı eylem — "araştır"

- Hedef: Telegram'a "akşam 6'da şu konuyu araştır" yazınca, zamanı gelince uygulama araştırmayı kendisi yapar ve sonucu Telegram'a yazar.
- Neden: Uygulama notu yalnız saklıyor; kullanıcı "execute olsa çok iyi olur" dedi. İlk eylem güvenli ve bilgisayar gerektirmeyen bir şey olmalı.
- Bitti sayılır:
  - "X'i saat Y'de araştır" mesajı araştırma işi olarak kaydedilir ve bot bunu açıkça söyler (Telegram'da denenir).
  - Zamanı gelince bot özet + en az 2 kaynak bağlantısı gönderir (Telegram'da denenir).
  - Zamansız "şunu araştır" mesajı hemen çalışır (Telegram'da denenir).
  - Araştırma hata verirse bot hatayı söyler, iş sessizce kaybolmaz (bozuk girdiyle denenir).
  - Normal notlar ve mevcut hatırlatmalar eskisi gibi çalışır (Telegram'da denenir).
- Durum: 11 Kasım 2026 — açıldı, kullanıcı isteğiyle beklemede (kod yazılmadı)
- Sıradaki adım: Kullanıcı dönünce bitti ölçütlerini onaylar — kullanıcı

## Temel parçalar

1. Tanıma: sınıflandırıcı "araştır" isteğini normal nottan ayırır (yeni `action`).
2. Kayıt: notta "bu bir araştırma işi" bilgisi durur (yeni sütun gerekir).
3. Zamanlayıcı: zamanı gelen işi bulur. `reminder-cron` zaten var ve aynı işi hatırlatma için yapıyor.
4. Çalıştırma: Claude API + web araması ile araştırma.
5. Teslim: sonuç Telegram'a sığacak biçimde (4096 karakter sınırı) ve nota yazılır.
6. Hata ve maliyet sınırı: zaman aşımı, tekrar çalışmama (aynı iş iki kez koşmaz), arama sayısı üst sınırı.

## Bilinen / bilinmeyen

| Konu | Durum | Nasıl netleşir |
|---|---|---|
| `reminder-cron` fonksiyonu var, tarihi gelen notu bulup Telegram'a yazıyor | Doğrulandı (kod okundu) | — |
| `reminder-cron` gerçekten zamanlanmış mı, kaç dakikada bir çalışıyor | Bilinmiyor | Supabase panelinde cron kayıtları |
| Repoda migration klasörü yok; şema panelden yönetiliyor | Doğrulandı | — |
| Claude API'de web araması aracı Haiku 5.5 ile çalışıyor mu, ücreti | Test edilmedi | Resmî belge + tek deneme çağrısı |
| Edge Function süre sınırı araştırmaya yeter mi | Bilinmiyor | Supabase belgesi + ölçüm |
| Araştırma başına maliyet | Bilinmiyor | İlk 3 denemenin kullanım kaydı |

## Yol haritası

| # | Adım | Kim | Çıktı |
|---|---|---|---|
| 1 | Bilinmeyenleri netleştir: cron durumu, web araması aracı, süre sınırı | asistan | tablo güncel |
| 2 | Nota "eylem" alanı ekle (SQL) | asistan yazar, kullanıcı onaylar | sütun var |
| 3 | Sınıflandırıcıya "araştır" eylemi ekle; bot kaydı doğrular | asistan | Telegram denemesi |
| 4 | Araştırmayı çalıştıran kod + zamanlayıcıya bağlama | asistan | zamanı gelince sonuç mesajı |
| 5 | Hata, tekrar çalışmama, maliyet sınırı | asistan | bozuk girdi denemesi |
| 6 | Kullanıcı 3 gerçek araştırma dener | kullanıcı | geri bildirim |

## Sonra (kapsam dışı)

- Sabah özeti (aynı zamanlayıcı).
- Başka eylemler: özetle, taslak yaz, kontrol et.
- Bilgisayarda çalışan eylemler (onay adımı + tek klasör izni).

## Günlük

### 11 Kasım 2026

- İş açıldı. Düzeltme: önceki sohbette "uygulama hiç hatırlatmıyor" denmişti; yanlış. `reminder-cron` 15 dakika kala hatırlatıyor ve cevapsız kalanı beklemeye alıyor (kodda var; çalıştığı Test edilmedi).
