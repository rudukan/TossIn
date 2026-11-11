# UI düzenlemeleri

- Hedef: To-do listesinin arayüzünü, önce bozuk yerleri onararak düzenlemek.
- Neden: Arama sonuç göstermiyor, silme ve kayıt hatası veri kaybettirebiliyor; arayüz telefonda dar ve küçük.
- Bitti sayılır:
  - Arama yalnız eşleşen notları gösterir (tarayıcıda denenir).
  - Silme geri alınabilir; kayıt hatası ekranda görünür ve yazılan not kaybolmaz (tarayıcıda denenir).
  - `npm run lint` ve `npm run build` hatasız geçer (komut çıktısı).
  - Board ve Inbox 375px ve masaüstünde taşma olmadan okunur (ekran görüntüsü).
  - Inbox'ta durum değiştirmek tek tık (tarayıcıda denenir).
- Durum: 11 Kasım 2026 — adım 1–3 kodu yazıldı, commit yok; tarayıcıda kullanıcı denemesi bekliyor
- Sıradaki adım: Kullanıcı `http://localhost:3000` adresinde Inbox, Board, arama ve giriş ekranını dener, içine sinmeyeni söyler — kullanıcı

## Bilinen / bilinmeyen

| Konu | Durum | Nasıl netleşir |
|---|---|---|
| Arama sonucu kullanılmıyor (`search/page.tsx`) | Doğrulandı | — |
| Silme onaysız ve geri alınamaz | Doğrulandı | — |
| Kayıt hatasında giriş kutusu temizleniyor | Doğrulandı | — |
| Lint 3 hata (effect içinde setState) | Doğrulandı | — |
| Board'da sütun içi sıra kaydedilmiyor | Doğrulandı | — |
| Board'da üst/alt çubuk genişliği içerikle uyuşmuyor | Doğrulandı | — |
| Telefonda Board dar, yazılar küçük, çift tık dokunmatikte çalışmıyor | Tahmin | Tarayıcıda 375px görünüm |

## Yol haritası

| # | Adım | Kim | Çıktı |
|---|---|---|---|
| 1 | Bozukları onar: arama, silme, kayıt hatası, lint | asistan | lint + build temiz |
| 2 | Board düzeni: genişlik hizası, telefon görünümü, sıralama davranışı | asistan | ekran görüntüsü |
| 3 | Kart düzeni: yazı boyutu, dokunma alanı, tek tık durum, düzenleme düğmesi | asistan | ekran görüntüsü |
| 4 | Telefon ve masaüstü kontrolü | asistan | ekran görüntüsü |

## Kararlar

- 11 Kasım 2026 — Arama tarayıcıda, eldeki notlar üzerinde yazarken süzülür. Neden: bütün notlar zaten yüklü; ağ isteği ve Enter gerekmez. Elenen: sunucuda tam metin arama (`searchNotes`); sözcük kökü eşleştirir ama Enter ister ve çok sözcüklü sorguda `to_tsquery` hata verir.
- 11 Kasım 2026 — Silme 5 saniye bekletilir, bu sürede "Geri al" ile döner. Neden: onay penceresi her silmede bir tık ekler. Sınır: 5 saniye dolmadan sekme kapanırsa not silinmez.

## Sonra (bu işin kapsamı dışında)

- Kullanıcı notu, 11 Kasım 2026: Arayüz "vay be" dedirtmese de rahat ve çok verimli kullanılabilmeli; ölçü bu.
- Zamanlama (schedule) görünümü: notlara zaman verip takvim gibi görmek.
- İlerde: zamanı gelen işi uygulamanın kendisinin çalıştırabileceği bir zemin.

## Günlük

### 11 Kasım 2026

- Adım 1 kodu yazıldı: arama (yazarken süzme), geri alınabilir silme + bildirim (`Toast.tsx`), kayıt hatasında metin korunuyor, lint hataları giderildi.
- Doğrulandı: `npx tsc --noEmit` temiz, `npx eslint` 0 hata, `npm run build` başarılı.
- Test edilmedi: tarayıcıda davranış. Önizleme sunucusu izni iki kez reddedildi.
- Kullanıcı en çok rahatsız eden yer olarak "Inbox'ı işlemek" dedi; adım 3 öne alındı.
- Kart (`NoteCard.tsx`): durum düğmeleri (Yapılıyor / Beklemede / Bitti) kartın üstünde, tek tık. Inbox'ta taşıma 5 saniye geri alınabilir. Inbox'ta gereksiz "Inbox" rozeti kalktı. Düzenle ve Sil ⋯ panelinde yan yana. Yazılar 10px'ten 11–12px'e, düğmeler büyüdü.
- Doğrulandı: tip, lint (0 hata), build temiz. Build bir kez `next/font/google` hatası verdi, tekrar çalıştırınca geçti (Tahmin: yazı tipi indirme, geçici ağ).
- Test edilmedi: tarayıcıda görünüm ve davranış.
- Adım 2 (Board) kodu yazıldı: üst çubuk ve alt menü Board genişliğine hizalandı; telefonda sütunlar yana kaydırılıyor, masaüstünde 4 yan yana; kartlar yalnız sütunlar arasında sürükleniyor (sütun içi sahte sıralama kalktı); yazı ve düğmeler büyüdü.
- Karar: Sütun içi sıralama eklenmedi. Neden: veritabanında sıra alanı yok, migration ister. Elenen: sıra alanı ekleyip kalıcı sıralama.
- Doğrulandı: tip, lint (0 hata), build temiz.
- Sorun: Kullanıcı sayfayı `192.168.1.100:3000` adresinden açınca yükleme simgesinde kaldı. Sunucu çıktısı: "Blocked cross-origin request ... from 192.168.1.100". Next 16 dev modunda ağ adresini varsayılan olarak engelliyor. Çözüm: `http://localhost:3000`. (Tahmin: kalma nedeni bu; localhost'ta denenince netleşir.)
- Test edilmedi: tarayıcıda görünüm ve davranış.
- Doğrulandı (kullanıcı): sayfa `http://localhost:3000` adresinde açıldı.
- Giriş ekranı: "Beni hatırla" kutusu hiçbir şey yapmıyordu. Artık işaretliyse başarılı girişte e-posta bu tarayıcıda saklanıyor ve sonraki açılışta dolu geliyor; imleç şifreye geçiyor. Şifre uygulamada saklanmıyor (karar: güvenlik; şifreyi tarayıcının şifre yöneticisi doldurur).
- Doğrulandı: tip ve lint temiz. Test edilmedi: tarayıcıda giriş ekranı.
- Sıradaki adım: kullanıcı çıkış yapıp tekrar girerek e-postanın geldiğini, sonra Inbox ve Board'u dener.

### Devir — 11 Kasım 2026, 16:08
- Durum: Yol haritasının 1–3. adımlarının kodu yazıldı, hepsi kaydedilmemiş (commit yok) ve bu worktree'de duruyor. Tip, lint (0 hata) ve build temiz. Tarayıcıda yalnız "sayfa açılıyor" doğrulandı; davranışların hiçbiri denenmedi.
- Kararlar:
  - Arama tarayıcıda yazarken süzülür — notlar zaten yüklü ("Kararlar" bölümünde).
  - Silme ve Inbox'tan taşıma 5 saniye geri alınabilir — onay penceresi her seferinde tık ekler.
  - Board'da sütun içi sıralama yok — veritabanında sıra alanı yok, migration ister.
  - Giriş ekranı yalnız e-postayı saklar, şifreyi saklamaz — güvenlik; şifreyi tarayıcı doldurur.
- Kullanıcının yargıları: "vay be dedirtmese bile çok efektif kullanabileceği bir arayüz"; en çok rahatsız eden yer "Inbox'ı işlemek"; "Beni hatırla deyince de bilgilerimi getirmiyor".
- Açık sorular:
  - Değişiklikler commit edilsin mi, PR açılsın mı — kullanıcı.
  - Telefondan denemek için `next.config.ts` içine `allowedDevOrigins` eklensin mi — kullanıcı.
  - Kullanılmayan `searchNotes` (NotesProvider) ve `@dnd-kit/sortable` bağımlılığı kaldırılsın mı — kullanıcı.
- Sıradaki tek adım: Kullanıcı `http://localhost:3000` adresinde dener ve geri bildirim verir — kullanıcı. Sonra adım 4 (375px ve masaüstü ekran kontrolü) — asistan.
- Dosyalar: `src/app/page.tsx`, `src/app/search/page.tsx`, `src/app/login/page.tsx`, `src/components/{AppShell,CaptureBar,CommandPalette,KanbanBoard,NoteCard,Toast}.tsx`, `src/lib/{NotesProvider.tsx,types.ts}`. Commit'e girmemeli: `.claude/launch.json` (izlenmiyor), `.env.local` (ana klasörden kopya, gitignore'da).
- Doğrulanmamış:
  - Bütün arayüz davranışları: arama, geri al bildirimi, kayıt hatası, tek tık durum, Board sürükleme, telefonda yana kaydırma, e-posta hatırlama.
  - 375px'te kart altındaki üç düğme ile tarihin tek satıra sığması (Tahmin: sığmazsa tarih alt satıra iner).
  - Asistanın önizleme sunucusu izni iki kez reddedildi; tarayıcı kontrolünü şimdilik kullanıcı yapıyor.
  - Komut paletindeki 1/2/3 kısayol etiketleri hâlâ çalışmıyor (bulgu 7, dokunulmadı).
