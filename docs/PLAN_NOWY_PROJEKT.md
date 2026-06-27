# Mamma Rosa — nowy system zamówień (greenfield)

> Projekt budowany OD ZERA. Nie dotykamy istniejącej wtyczki WooCommerce
> (`dotypos-woo-connector`) — ona dalej działa, dopóki nowy system jej nie zastąpi.
> Wiedza o API: `docs/dotypos_api_brain.md`.

## 1. Cel
Własny system zamawiania „tylko pode mnie": własny wygląd, własne reguły, bez Orderable,
spięty bezpośrednio z Dotykačką. Docelowo zastępuje: Orderable + wtyczkę dostawy +
„śmieszną apkę" + drugi tablet.

Marzenia do zrealizowania:
1. Własny sklep (dostawa/odbiór, ASAP/konkretna godzina, dostawa 4 zł Kościerzyna / 2 zł poza).
2. Klient z zamówienia **przypisany jako encja Customer w Dotykačce** (nie notatka).
3. ETA bez drugiego tabletu — kelnerka ustawia czas na **jednym** ekranie na komputerze sprzedażowym.
4. Flaga **na wynos** zawsze poprawna (per pozycja w `order/create`).
5. Telefon stacjonarny dzwoni → karta klienta po numerze / założenie rachunku (CTI).
6. (Później) płatność online + ewentualna auto-fiskalizacja.

## 2. Stack (rekomendacja decyzyjna)
- **Next.js 15 (App Router) + TypeScript + Tailwind** — jeden projekt: sklep + panel kelnerki + API.
- **Hosting: Vercel.**
- **Baza: Postgres (Neon/Vercel)** — zamówienia, statusy, ETA, cache klientów, mapowanie produktów.
- **Realtime:** start na SSE/polling (strona „dziękujemy" + panel kelnerki); ew. Pusher/Ably później.
- **Kolejka/retry/locki:** Vercel KV (Redis) lub tabela w Postgres.
- **Integracja Dotykačka:** warstwa serwerowa `lib/dotykacka` (Connector v2 → refresh token →
  access token cache → pos-actions / customers / products). Sekrety w ENV Vercela, nigdy w kliencie.
- **Panel kelnerki = PWA** (instalowalny na komputerze sprzedażowym, obok Dotykački).
- **Płatności:** start gotówka/karta przy odbiorze; Przelewy24/Stripe w późniejszej fazie.

## 3. Struktura repo (nowy folder `orderhub/`, wtyczka nietknięta)
```
orderhub/
  app/
    (shop)/
      menu/                 # menu z Dotykački
      koszyk/
      checkout/
      dziekujemy/[id]/      # strona podziękowania z LIVE ETA
    (staff)/
      panel/                # ekran kelnerki: nowe zamówienia + ustawianie ETA (PWA)
      klient/[phone]/       # karta klienta (pod CTI)
    api/
      orders/               # POST: przyjęcie zamówienia z checkoutu
      orders/[id]/eta/      # POST: kelnerka ustawia czas
      cti/incoming/         # webhook: połączenie przychodzące
      webhooks/dotykacka/   # opcjonalne webhooki z POS
  lib/
    dotykacka/              # auth, pos-actions, customers, products, retry/idempotency
    db/                     # schema + migracje
    realtime/
  components/
```

## 4. Mapowanie marzeń na API (z `dotypos_api_brain.md`)
- **Wysyłka zamówienia:** `POST /v2/clouds/{cloudId}/branches/{branchId}/pos-actions`,
  `action: order/create`, `external-id: WC-...`, `items[]` z **`take-away: true` per pozycja**,
  dodatki jako `customizations`, dostawa jako osobna pozycja z `manual-price`.
- **Klient jako encja:** szukaj `GET /customers?filter=phone|eq|<numer>`; brak →
  `POST /customers` (`firstName/lastName/phone/email/addressLine1/city/zip`, NIP=`vatId`,
  REGON=`companyId`, `flags:0`); podepnij przez `customer-id` w `order/create`.
- **Na wynos:** pole `take-away` przy każdej pozycji (+ produkty muszą mieć włączony takeaway w POS).
- **Powiadomienie/popup w Dotykačce:** możliwe TYLKO dla zamówień wystawionych (`order/issue`)
  i tylko jeśli Dotykačka włączy powiadomienia dla naszej aplikacji API → do ustalenia z
  integration@dotypos.com. Inaczej „popup" realizujemy na naszym panelu kelnerki.
- **ETA:** trzymamy stan w naszej bazie; panel kelnerki ustawia czas; strona „dziękujemy"
  aktualizuje się live. (Opcja max integracji: OMS API lokalnie na POS — preview, osobne dane od Dotykački.)
- **Auto-fiskalizacja (później):** `order/create-issue-pay` + `payment-method-id`
  (gotówka 900000001 / karta 900000002 / online 900000019) — po testach fiskalnych.

## 5. Roadmap fazowa
- **Faza 0 — Szkielet (start teraz).** Next.js + Tailwind + struktura + ENV. Warstwa `lib/dotykacka`:
  auth Connector v2 + token cache + **test pobrania branchy i produktów**. Efekt: „widzę Twoje menu z API".
- **Faza 1 — Menu + koszyk.** Render produktów/kategorii/dodatków z Dotykački. Koszyk. Wybór
  dostawa/odbiór + ASAP/godzina. Reguła dostawy 4 zł / 2 zł.
- **Faza 2 — Checkout + wysyłka do POS.** `order/create` (take-away per pozycja, dodatki, dostawa),
  klient jako encja Customer, strona „dziękujemy". Idempotencja + retry (kasa zamknięta itp.).
- **Faza 3 — Panel kelnerki + ETA (koniec drugiego tabletu).** Lista nowych zamówień ASAP,
  ustawianie ETA, live-update na stronie klienta. PWA na komputer sprzedażowy.
- **Faza 4 — CTI / telefon.** `/api/cti/incoming` + karta klienta po numerze. Wariant zależny od typu linii.
- **Faza 5 — Płatności online + ew. auto-fiskalizacja.**

Każdą fazę wdrażamy i sprawdzamy osobno; stara wtyczka działa równolegle aż do przełączenia.

## 6. Decyzje do potwierdzenia (mam defaulty — możemy ruszać)
1. **Lokalizacja projektu:** nowy folder `orderhub/` w tym repo (default) czy osobne repo?
2. **Stack:** Next.js + Vercel + Postgres — OK? (default: tak)
3. **Dane testowe Dotykački:** czy dostanę testowy `cloudId` + `branchId` + refresh token
   (najlepiej chmura testowa), żeby realnie pobierać menu? Bez tego Faza 0 staje na mockach
   i podłączymy live później.
4. **Telefon (do Fazy 4):** VoIP/SIP, analogowy/GSM, czy numer odbierany na Androidzie?
5. **Domena:** docelowy adres nowego sklepu (np. zamow.mammarosa.pl)?

## 7. Bezpieczeństwo
- Sekrety (client_secret, refresh_token) wyłącznie w ENV Vercela — nigdy w repo ani w kliencie.
- Uwaga: stary `dotypos-connector.php` ma `client_secret` w kodzie — przy okazji do rotacji.
