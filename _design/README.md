# Teslim Paketi: Pax Medya Talep Yönetim Sistemi (Frontend)

## Genel Bakış
İki panelli bir talep yönetim sistemi:
- **Müşteri Paneli** — kurumlar talep oluşturur ve taleplerini takip eder.
- **Admin Paneli** — Pax Medya ekibi talepleri yönetir, durum değiştirir, personele atar, geri bildirim ekler.

Hedef: müşterinin birkaç adımda talep oluşturabildiği, taleplerini takip edebildiği; admin tarafının tüm süreci kolayca yönetebildiği, **tamamen responsive** bir arayüz. Bu teslim paketi yalnızca **frontend** içindir.

## Önerilen Stack
- **Next.js (App Router) + React + TypeScript**
- Stil: Tailwind CSS (veya CSS Modules). Aşağıdaki design token'ları birebir kullanın.
- Font: **Manrope** (`next/font/google`), ağırlıklar 400–800.
- Şimdilik backend yok — verileri `lib/mock-data.ts` içinde mock olarak tutun; sonra API'ye bağlanacak şekilde soyutlayın.

## Tasarım Dosyaları Hakkında
Bu paketteki `.html` dosyaları **HTML ile hazırlanmış tasarım referanslarıdır** — nihai görünüm ve davranışı gösteren prototiplerdir, doğrudan kopyalanacak production kodu değildir. Görev, bu tasarımları Next.js ortamında, kendi bileşen yapınız ve pattern'lerinizle **yeniden oluşturmaktır**.

## Fidelity
**Yüksek fidelity (hifi).** Renkler, tipografi, boşluklar ve etkileşimler nihaidir. UI'ı token'lara sadık kalarak birebir kurun.

---

## Önerilen Route Yapısı
```
app/
  (auth)/
    giris/page.tsx            → Giriş
    kayit/page.tsx            → Kurum kaydı
  (customer)/
    talep/yeni/page.tsx       → Yeni Talep Oluştur
    taleplerim/page.tsx       → Taleplerim (liste + filtre)
    talep/[id]/page.tsx       → Talep detay (müşteri görünümü)
  admin/
    talepler/page.tsx         → Gelen talepler (tablo + filtre)
    musteriler/page.tsx       → Müşteri listesi
    talep/[id]/page.tsx       → Talep detay (admin görünümü)
```

---

## Design Tokens

### Renkler
| Rol | Hex |
|---|---|
| Primary (marka mavi) | `#2b4aa0` |
| Primary koyu / gradyan ucu | `#20326e` |
| Primary açık aksан | `#3a78c3` |
| Admin sidebar zemin | `#1c2740` |
| Admin sidebar ayraç | `#2c395c` |
| Turuncu aksан | `#e8663c` |
| Sarı aksан | `#f5c518` |
| Sayfa zemini | `#eef1f6` / panel içi `#f7f8fb` |
| Kart / yüzey | `#ffffff` |
| Input zemin | `#f6f7fb` |
| Kenarlık | `#e6e9f0` (input), `#e9ecf4` (kart), `#edeff5` (ayraç) |
| Ana metin | `#1b2231` |
| İkincil metin | `#4a5266` |
| Silik metin | `#77809a` / `#8b93a5` |
| Çok silik / placeholder | `#a3aac0` / `#9aa1b5` |
| Durum noktası (nötr) | `#98a0b5` |

### Tipografi (Manrope)
- Sayfa başlığı: 26px / 800
- Bölüm başlığı (kart): 20px / 800 (deck'te 40px)
- Kart başlığı: 15px / 800
- Gövde: 14px / 400–500, line-height 1.6
- Label: 13px / 600
- Küçük / meta: 12–13px / 500–600
- Letter-spacing başlıklarda `-0.01em` – `-0.02em`
- **Minimum mobil dokunma hedefi: 44px**

### Boşluk & Şekil
- Radius: input/buton 10px, kart 13–14px, panel 18px, telefon çerçevesi 38px
- Kart padding: 16–24px; sayfa padding: 20–28px (mobil 18–20px)
- Buton padding: 12–14px dikey
- Gölge: `0 18px 50px -22px rgba(27,34,49,.35)` (yüzey), hafif `0 8px 22px rgba(27,34,49,.14)`

---

## Ekranlar

### 1. Giriş (`/giris`)
İki sütun: solda marka gradyanı (logo + slogan "Taleplerinizi tek yerden yönetin."), sağda form.
- Alanlar: **E-posta**, **Şifre** (label üstte, input `#f6f7fb`).
- "Beni hatırla" checkbox. **Şifremi unuttum yok** (kaldırıldı).
- Primary buton "Giriş yap". Altta "Hesabınız yok mu? Kayıt olun".

### 2. Kurum Kaydı (`/kayit`)
Tek kart, 2 sütunlu grid. Alanlar:
- **Kurum adı** (tam genişlik), **Yetkili kişi**, **Telefon**, **E-posta**, **Şifre**.
- Not: *"Kurum adı kayıtta alınır — talep formunda tekrar sorulmaz."*
- Primary buton "Kayıt ol".

### 3. Yeni Talep Oluştur (`/talep/yeni`)
Sol sidebar (Yeni Talep / Taleplerim + kullanıcı kartı "Aydın İnşaat · Müşteri"). Sağda 2 sütun:
- **Sol – form kartı:** Talep başlığı, Talep açıklaması (textarea), Ek not (opsiyonel). **Dosya ekleme YOK.** Butonlar: `+ Listeye ekle`, `Temizle`.
- **Sağ – "Eklenen talepler" kartı:** eklenen talepler listesi (her maddede başlık, meta, **Düzenle / Sil**). Altta `Talepleri Gönder (N)`.
- Üst bar: "Kurum: Aydın İnşaat A.Ş." (salt-okunur — kayıttan gelir).
- **Davranış:** "+ Listeye ekle" formu doğrular, talebi sağdaki listeye ekler, formu temizler. Düzenle → formu doldurur; Sil → maddeyi kaldırır. "Gönder" tüm listeyi kaydeder; her talep ayrı takip edilir.

### 4. Taleplerim (`/taleplerim`)
Üstte durum filtre çipleri: **Tümü / Yeni / İnceleniyor / İşleme alındı / Bilgi bekleniyor / Tamamlandı / İptal edildi**. Aktif çip primary dolu.
- Talep kartları: ID (#TL-1042), başlık, "Oluşturma … · Güncelleme …", sağda durum (nötr nokta + metin — **renk kodu yok, sade tek renk metin**).
- Varsa "Pax notu: …" alanı.
- Sağ üstte `+ Yeni Talep`.

### 5. Talep Detay — Müşteri (`/talep/[id]`)
ID + başlık, durum + güncelleme tarihi, **Açıklama** kartı, **Pax Medya geri bildirimi** kartı (açık mavi `#eef2fb`), **Talep geçmişi** (dikey zaman çizelgesi: olay + tarih).

### 6. Admin — Gelen Talepler (`/admin/talepler`)
Koyu sidebar `#1c2740` (Genel Bakış / **Talepler** / Müşteriler / Personel + kullanıcı **Mehmet Çelebi Gezer · Yönetici**, baş harf **MG**, turuncu avatar).
- Filtre çubuğu: **Kurum ▾ / Durum ▾ / Atanan ▾** + "N talep".
- Tablo sütunları: **Talep (başlık + ID) · Kurum · Durum · Atanan · Güncelleme**.
- Arama alanı "Ara: talep, kurum…".

### 7. Admin — Müşteriler (`/admin/musteriler`)
Tablo: **Kurum (avatar + ad) · Yetkili (ad + e-posta) · Talep (sayı)**.

### 8. Admin — Talep Detay (`/admin/talep/[id]`)
ID + kurum + başlık + açıklama.
- **Durum** select (İşleme alındı ▾) ve **Personele ata** select (Ece Yılmaz ▾) yan yana.
- **Müşteriye not / geri bildirim** textarea + `Notu kaydet & müşteriye bildir`.
- **Talep geçmişi** zaman çizelgesi (olay · kişi · tarih).

---

## Etkileşim & Davranış
- Yeni Talep: çok-maddeli ekle/düzenle/sil, toplu gönder (yukarıda).
- Filtre çipleri ve dropdown'lar client-side listeyi filtreler.
- Admin durum/atama değişikliği talebi günceller ve geçmişe kayıt ekler.
- Not gönderimi müşteri detayındaki "Pax geri bildirimi" alanına yansır.

## Responsive
- **Masaüstü:** sidebar + içerik; tablolar tam genişlik.
- **Mobil:** sidebar alt navigasyona/hamburger'a iner; tablolar **kart listesine** dönüşür (bkz. HTML'deki telefon çerçeveleri); filtreler yatay kaydırılabilir çip satırı; butonlar tam genişlik, min 44px. Form alanları tek sütun.

## Durumlar (enum)
`Yeni` · `İnceleniyor` · `İşleme alındı` · `Bilgi bekleniyor` · `Tamamlandı` · `İptal edildi`
Görsel: nötr gri nokta + metin (renk kodu kullanılmıyor).

## State (öneri)
- `requests: Request[]` (id, title, description, note?, org, status, assignee, createdAt, updatedAt, history[])
- `draftItems: DraftRequest[]` (Yeni Talep ekranındaki geçici liste)
- `customers: Customer[]` (name, contact, email, requestCount)
- filtre state'leri: `statusFilter`, `orgFilter`, `assigneeFilter`, `search`

## Assets
- `assets/pax-mark.png` — kare logo işareti (avatar, favicon, dar alanlar)
- `assets/pax-logo.png` — yatay logo (sidebar, kayıt üst)

## Referans Dosyalar (bu pakette)
- `Pax Talep Sistemi.dc.html` — tüm ekranların (masaüstü + mobil) hifi referansı. **Ana kaynak.**
- `assets/` — logolar.

> Not: `.dc.html` dosyaları tarayıcıda doğrudan açılır; içindeki inline stiller token/ölçü kaynağınızdır.
