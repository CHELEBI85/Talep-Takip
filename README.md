# Pax Medya · Talep Yönetim Sistemi

İki panelli, tamamen responsive talep yönetim uygulaması. **Next.js (App Router) + TypeScript + Tailwind CSS v4 + Manrope + Firebase (Auth + Firestore)**.

## Firebase kurulumu (bir kere yapılır)

Yapılandırma `.env.local` dosyasındadır (repo'ya commit edilmez). Konsolda iki adım gerekir:

1. **Authentication → Sign-in method → Email/Password**: Etkinleştir. ✅ (etkin görünüyor)
2. **Firestore Database → Rules**: Bu repodaki [firestore.rules](firestore.rules) içeriğini yapıştırıp **Publish** et. Kurallar yayınlanana kadar kayıt/talep yazma işlemleri "insufficient permissions" ile reddedilir.

**Admin erişimi:** `.env.local` içindeki `NEXT_PUBLIC_ADMIN_EMAILS` listesindeki e-postayla giriş yapan kullanıcı admin paneline yönlenir. Aynı listeyi `firestore.rules` içindeki `isAdmin()` fonksiyonunda da güncel tut (iki liste eşleşmeli). Admin hesabını da normal kayıt akışıyla (veya konsoldan Authentication → Add user ile) oluşturman gerekir.

### Veri modeli (Firestore)
- `customers/{uid}` — kurum profili: `org, contact, phone, email, ownerUid, createdAt`
- `requests/{autoId}` — talep: `code (#PAX-…), title, description, note, org, ownerUid, status, assignee, feedback, createdAt, updatedAt, history[]`

Müşteri yalnızca kendi taleplerini görür (`ownerUid` sorgusu + kural); admin tümünü görür ve durum/atama/geri bildirim günceller. Tüm listeler `onSnapshot` ile **realtime**dır.

**Silme = soft-delete.** Admin bir talebi sildiğinde belgeye `deleted: true` + `deletedAt` yazılır ve talep çöp kutusuna düşer; buradan geri yüklenebilir. Firestore kurallarında `delete` işlemi herkese kapalıdır — **veri hiçbir zaman kalıcı olarak silinmez**. Talep kodları (`#PAX-…`) `counters/requests` belgesindeki merkezi sayaçtan transaction ile üretilir (çakışma olmaz).

## Çalıştırma

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production derleme
```

`/` otomatik olarak `/giris` ekranına yönlenir.

## Ekranlar / Route yapısı

| Route | Açıklama |
|---|---|
| `/giris` | Giriş (iki sütun marka gradyanı + form) |
| `/kayit` | Kurum kaydı (2 sütun grid) |
| `/talep/yeni` | Yeni talep — çok-maddeli ekle / düzenle / sil + toplu gönder |
| `/taleplerim` | Taleplerim — durum filtre çipleri + kartlar |
| `/talep/[id]` | Talep detay (müşteri) — açıklama, Pax geri bildirimi, geçmiş |
| `/admin` | Genel bakış — özet kutuları, durum dağılımı, son talepler |
| `/admin/talepler` | Gelen talepler — tablo + Kurum/Durum/Atanan filtreleri + arama |
| `/admin/musteriler` | Müşteri listesi (tablo) |
| `/admin/personel` | Personel + atanan talep sayıları |
| `/admin/cop-kutusu` | Çöp kutusu — silinen talepler; geri yükleme |
| `/admin/talep/[id]` | Talep detay (admin) — durum/atama select + not gönder + çöp kutusuna taşı + geçmiş |

Route koruması: müşteri sayfaları giriş ister; `/admin/*` yalnızca admin e-postalarına açıktır (diğerleri `/taleplerim`e yönlenir).

## Mimari

```
src/
  app/
    (auth)/        giris, kayit  → ortak merkezî layout
    (customer)/    talep/yeni, taleplerim, talep/[id]  → CustomerShell
    admin/         talepler, musteriler, personel, talep/[id]  → AdminShell
    layout.tsx     kök: Manrope fontu + StoreProvider
    globals.css    Tailwind v4 @theme design token'ları
  components/
    ui/            StatusPill, Avatar, Button, Field, Chip
    layout/        CustomerShell, AdminShell, PageHeader
    Timeline.tsx
  lib/
    types.ts       Status, Request, DraftRequest, Customer, Staff
    mock-data.ts   tek kaynak mock veri
    store.tsx      React Context store — tüm mutasyon ve seçiciler
```

### Veri katmanı

- `lib/firebase.ts` — app/auth/db init (env'den), `ADMIN_EMAILS`
- `lib/auth.tsx` — `AuthProvider` / `useAuth`: `signIn`, `signUp` (kurum profilini Firestore'a yazar), `logout`, `isAdmin`
- `lib/store.tsx` — `StoreProvider` / `useStore`: realtime `onSnapshot` listeleri + mutasyonlar (`submitDrafts`, `updateStatus`, `assignStaff`, `sendFeedback`). Her mutasyon talep geçmişine otomatik kayıt ekler.
- `lib/mock-data.ts` — yalnızca `STAFF` (organizasyon içi sabit personel listesi)

## Tasarım token'ları

Renk, tipografi, radius ve gölge değerleri `src/app/globals.css` içindeki Tailwind `@theme` bloğunda tanımlıdır (ör. `bg-primary`, `text-muted-2`, `border-border-card`). Font: Manrope (`next/font/google`).

**Durum görselleştirme:** Tasarım kararı gereği durumlar **renk kodu kullanmaz** — nötr gri nokta + sade metin (`StatusPill`).

## Responsive

- **Masaüstü:** sidebar + içerik; tablolar tam genişlik.
- **Mobil:** sidebar alt navigasyona iner; tablolar kart listesine dönüşür; filtre çipleri yatay kaydırılır; butonlar tam genişlik, min 44px dokunma hedefi.

## Referans

Orijinal teslim brief'i ve hifi tasarım referansı `_design/` klasöründedir (`README.md`, `Pax Talep Sistemi.dc.html`, `assets/`).
