# STAN PROJEKTU — Mammarosa OrderHub (dokument przekazania)

> Ten plik pozwala nowej sesji asystenta przejąć projekt bez utraty kontekstu.
> Przeczytaj CAŁOŚĆ zanim cokolwiek zmienisz. Ostatnia aktualizacja: 2026-07-10.

---

## 1. Kim jest właściciel i o co chodzi

Właściciel prowadzi pizzerię **Mammarosa** (JEDNO słowo — nigdy „Mamma Rosa") w **Kościerzynie**.
Komunikacja: **po polsku**, konkretnie, bez żargonu. Właściciel nie jest programistą —
tłumacz krok po kroku, obrazowo. Oczekuje autonomii: *„rób wszystkie możliwe fazy beze mnie,
dla mnie zostaw rzeczy które mam robić później z Tobą"*.

Stan obecny produkcyjnie (stary świat, DZIAŁA i NIE WOLNO GO RUSZAĆ):
WordPress + WooCommerce + Orderable Pro na `mammarosa.pl/zamow-online/`,
wtyczka `dotypos-woo-connector (2).php` wysyła zamówienia do POS **Dotykačka**,
ETA obsługiwane osobną aplikacją Android na drugim tablecie.

Cel projektu: **całkowicie nowy system** (ten w `orderhub/`), który zastąpi Orderable
i drugi tablet: klienci zamawiają na stronie, obsługa widzi zamówienia w panelu www,
jednym dotknięciem ustawia ETA (klient widzi na żywo), zamówienia trafiają do Dotykački
przez API (klient jako encja Customer, „na wynos" per pozycja), telefon stacjonarny → CTI.

## 2. ŻELAZNE ZASADY (złamanie = poważny błąd)

1. **NIE modyfikuj starych plików wtyczki WordPressa** (`dotypos-connector.php`,
   `dotypos-woo-connector (2).php`). Właściciel zabronił wprost. (W starym pliku jest
   ujawniony client_secret `9BnDK4z…` — do rotacji przez właściciela, NIE commituj sekretów.)
2. **Sekrety tylko w Vercel Environment Variables** — nigdy w repo, nigdy na czacie.
   Poproś właściciela, by wpisywał je sam w panelu Vercela.
3. **Nie mieszaj w POS na sali podczas testów** — wysyłka rachunków do Dotykački jest za
   bezpiecznikiem `DOTYKACKA_SEND_ORDERS=true` (bez niego zawsze symulacja). Nie włączaj
   bez wyraźnej zgody właściciela.
4. Wygląd klienta = **CARTA** (patrz §5). Właściciel dwukrotnie odrzucił „dziecinne/kreskówkowe"
   projekty. ZERO emoji w UI, zero rysowanych ikonek jedzenia — tylko prawdziwe zdjęcia,
   cienkie ikony kreskowe, stonowany ruch.
5. Deploy = merge do `main` (Vercel buduje `main`). Rozwój na gałęzi
   `claude/restaurant-ordering-system-u0p17c`, potem merge → push. Właściciel zgodził się
   na ten przepływ.
6. Zanim wyślesz właścicielowi efekt — **przetestuj automatycznie** (build + Playwright,
   zrzuty ekranu) i wysyłaj gotowe zrzuty/pliki.

## 3. Architektura i repo

```
/ (repo osyda/wtyczkaDOTYKACKA)
├── dotypos-connector.php, dotypos-woo-connector (2).php   ← STARE, NIE DOTYKAĆ
├── docs/
│   ├── STAN_PROJEKTU.md          ← TEN plik
│   ├── dotypos_api_brain.md      ← baza wiedzy o API Dotykački v2 (czytaj przed pracą z API!)
│   ├── CO_ZOSTALO_DLA_CIEBIE.md  ← lista rzeczy zależnych od właściciela
│   └── PLAN_NOWY_PROJEKT.md, ../PLAN.md — starsze plany
├── mockups/                      ← podglądy HTML + zrzuty (historia iteracji designu)
│   └── mammarosa-carta.html      ← zatwierdzony klikalny podgląd pełnego przepływu CARTA
└── orderhub/                     ← WŁAŚCIWA APLIKACJA (Next.js 16, App Router, Tailwind 4, TS)
    ├── app/menu, checkout, dziekujemy/[id], panel, status + api/*
    ├── components/Shop.tsx, ProductModal.tsx
    ├── lib/carta.ts (design tokens), delivery.ts, geo.ts, cti.ts, staffAuth.ts
    ├── lib/dotykacka/ (auth, client, menu, mock, customers, pos, employees, health, config)
    ├── lib/orders/ (types, store: pamięć/KV auto, kvStore: @upstash/redis)
    └── proxy.ts (Next 16: zamiast middleware.ts; bramka staffowego API)
```

**Wdrożenie (zrobione przez właściciela 2026-07-10):** Vercel, team „haccpro's projects" (Hobby),
projekt **wtyczka-dotykacka**, Root Directory = `orderhub`, Production Branch = `main`.
Adres: `wtyczka-dotykacka.vercel.app` (dokładny adres zna właściciel).
`orderhub/DEPLOY.md` = runbook wdrożenia i zmiennych.

**Docelowa domena klienta:** subdomena `zamow.mammarosa.pl` (CNAME → Vercel) + przy go-live
przekierowanie 301 z `mammarosa.pl/zamow-online/` (wtyczka Redirection w WP). NIE teraz.

## 4. Przepływ danych (jak to działa)

- Menu: `lib/dotykacka/menu.ts` — bez kluczy → `mock.ts` (13 pizz z realnymi zdjęciami
  `/food/*.webp`, dodatki: ser/pieczarki/szynka/salami/oliwki; ceny ROBOCZE — do potwierdzenia).
  Z kluczami → prawdziwe produkty z API.
- Zamówienie: POST `/api/orders` → `lib/orders/store.ts` (auto: pamięć lokalnie / Upstash KV
  gdy `KV_REST_API_URL`+`KV_REST_API_TOKEN` lub `UPSTASH_REDIS_REST_URL/TOKEN`)
  → `lib/dotykacka/pos.ts` `sendOrderToPos()`:
  symulacja, jeżeli brak kluczy LUB `DOTYKACKA_SEND_ORDERS` ≠ `true` (bezpiecznik!).
  Wysyłka realna: pos-action `order/create`, `take-away: true` PER POZYCJA, dodatki w nocie
  (TODO: customizations), dostawa jako produkt (env: `DOTYKACKA_DELIVERY_*_PRODUCT_ID`),
  `external-id` = idempotencja, klient przez `customer-id` (upsert po telefonie).
- ETA/statusy: panel POST `/api/orders/[id]/eta` (30/45/60/75 min lub 15/20/30/45 odbiór)
  i `/status` (lifecycle: new → in_progress → ready/on_delivery → completed; scheduled dla „na godzinę").
  Strona `/dziekujemy/[id]` odpytuje co 3 s i pokazuje godzinę + oś statusów.
- Dostawa: `lib/delivery.ts` — Kościerzyna płasko 5 zł (rozpoznanie miasta z normalizacją
  ogonków), poza miastem 2 zł/km do 15 km, dalej „poza zasięgiem".
  MINIMUM zamówienia z dostawą (11.07.2026): do 6 km → 40 zł, powyżej 6 km → 60 zł
  (liczone od wartości koszyka, bez opłaty za dowóz; odbiór bez minimum).
  Quote niesie `minOrder`; UI blokuje (kasa + telefon), serwer waliduje online
  przez `minOrderForFee(deliveryFee)`. `lib/geo.ts` — ORS
  (klucz `ORS_API_KEY`) geokodowanie/trasa/reverse-geocode; fallback haversine ×1,3.
  Współrzędne lokalu: `RESTAURANT_LAT/LNG` (obecnie przybliżone 54.1226/17.9766 — doprecyzować!).
- Godziny otwarcia: `lib/hours.ts` + `/api/hours`. Źródła: wizytówka Google
  (`GOOGLE_MAPS_API_KEY`, Places Text Search po `GOOGLE_PLACE_QUERY`, cache 6 h w Redis+pamięci)
  → zmienna `OPENING_HOURS` („pn-czw 11:00-21:00; nd zamknięte") → domyślne 11–21.
  DECYZJA WŁAŚCICIELA (11.07.2026): docelowo klucz Google — instrukcja krok po kroku
  w CO_ZOSTALO_DLA_CIEBIE.md pkt 6, do wykonania przy najbliższej konfiguracji Vercela.
  Ostatnie zamówienie `LAST_ORDER_MIN` (domyślnie 20) minut przed zamknięciem; strefa
  Europe/Warsaw, obsługa zamknięcia po północy. Egzekwowanie: baner + zablokowana kasa
  w `/menu` i `/checkout` (odpytują `/api/hours` co 60 s) ORAZ serwerowo w POST
  `/api/orders` (403). Telefoniczne (`source:"phone"`) przechodzą zawsze. Karta na `/status`.
- Centralka telefoniczna (CTI) — GOTOWA od strony aplikacji (pełny opis:
  `docs/CENTRALKA_TELEFON.md`): webhook `/api/cti/call` (GET/POST, klucz
  `CTI_WEBHOOK_KEY`, wyjęty spod PIN-a w proxy, obsługa zalogowana może testować
  bez klucza), stan `cti:ring` + dziennik `cti:calls` w `lib/ctiCalls.ts`
  (Redis/pamięć, TTL 90 s, dedup), panel: poll `/api/cti/ring` co 3 s → baner
  z klientem (`lookupCaller` z `lib/cti.ts`) + podwójny dzwonek, zakładka
  „Telefony" (`/api/cti/calls`, Oddzwoń / Zamów), karta na `/status`.
  Do podłączenia na żywo: MacroDroid na komórce lokalu ALBO webhook u operatora
  VoIP — czeka na ustalenie typu linii właściciela.
- PRZEPŁYW KIEROWCÓW (przeprojektowany 13.07.2026 na życzenie właściciela):
  dostawa: Nowe → kelnerka ustawia ETA → w „W realizacji" od razu obowiązkowy
  wybór kierowcy (`DriverAssign`, POST /api/orders/[id]/driver — bez zmiany
  statusu) → zamówienie ZNIKA z ekranu kelnerki (pasek „U kierowców: …") →
  PANEL KIEROWCY `/panel/kierowca` (PIN, wybór imienia pamiętany na urządzeniu,
  poll 8 s): karta kursu z mapą/telefonem/uwagami/„POBIERZ GOTÓWKĄ", przyciski
  „Wyjeżdżam" (on_delivery) i „Dostarczone ✓" (completed). Telefoniczne: pole
  „Kierowca" już na ekranie przyjmowania (payload.driver) → kurs od razu w
  panelu kierowcy. Fallback „bez kierowcy (obsłużę ręcznie)" przywraca stare
  przyciski. Druk w POS przy przypisaniu kierowcy: `issueOrderInPos`
  (order/issue, posOrderId z order/create) za PODWÓJNYM bezpiecznikiem
  DOTYKACKA_SEND_ORDERS=true + DOTYKACKA_ISSUE_ON_DRIVER=true — DO TESTU przy
  go-live (fiskalizacja!). Diagnostyka logowania kodami pracowników: karta na
  /status (`employeesDiagnostics` — liczby i nazwy pól, bez kodów).
- Obieg z POS i utarg kierowców (USTALENIE 11.07.2026, workflow właściciela):
  dziś zamówienie wpada do POS, dostawę kelnerka drukuje wchodząc na KOD KIEROWCY
  (utarg kierowcy), odbiór kasuje ze swojego kodu. Z nowym systemem DZIEŃ PIERWSZY
  = identycznie: `order/create` tworzy otwarte zamówienie w POS, obsługa drukuje
  jak zawsze. DODATKOWO panel przy „W drodze" pyta „który kierowca bierze kurs?"
  (lista z env `DRIVERS` + wolny wpis; `order.driver`) i liczy kursy/utarg per
  kierowca w zakładce „Dziś" — niezależnie od POS. DO PRZETESTOWANIA po podpięciu
  kluczy: pole `user-id` w akcji `order/create` (pos-actions) — hipoteza: zamówienie
  utworzone z user-id kierowcy/kelnerki liczy się do jego utargu bez wchodzenia na
  kod przy terminalu; jeśli tak, można zautomatyzować przypisanie (kierowca wybrany
  w panelu → user-id w POS) i wyeliminować przełączanie kodów.
- Pizza pół na pół (12.07.2026, odwzorowanie „porcji 50%" właściciela z POS):
  `components/HalfHalfModal.tsx` — wejście „Pizza pół na pół · ½/½" na górze
  kategorii pizz w /menu ORAZ na ekranie telefonicznym; klient wybiera dwie
  połówki (lista z cenami ½), cena = (cenaA+cenaB)/2, dodatki NA CAŁOŚĆ (suma
  dodatków obu pizz bez duplikatów). Koszyk: `addHalves()` w CartProvider,
  linia `half|idA|idB` + pole `halves[]` (niesione też w OrderItem). Do POS
  (`pos.ts itemToPos`): DWIE pozycje z manual-price = 50% ceny każdej + notatki
  „PÓŁ NA PÓŁ (1/2) z: …"; dodatki doliczone do pierwszej połówki. UWAGA:
  zachowanie manual-price przy qty>1 do potwierdzenia testem po kluczach.
- Maile do klientów (12.07.2026): `lib/email.ts` — potwierdzenie zamówienia
  w stylu CARTA (inline CSS) z linkiem do śledzenia `/dziekujemy/[id]`; wysyłka
  Resend przez fetch (bez SDK), za kluczem `RESEND_API_KEY` (bez klucza —
  symulacja), nadawca `EMAIL_FROM`. Pole e-mail w kasie OPCJONALNE
  (customer.email); mail idzie w tle po utworzeniu zamówienia (void, origin
  z req.url). Telefoniczne bez maila. Karta na /status. Do zrobienia przez
  właściciela: konto resend.com + klucz + weryfikacja domeny (DNS SPF/DKIM).
- Kody rabatowe (faza R1 GOTOWA, plan: docs/PLAN_KODY_RABATOWE.md): `lib/promo.ts`,
  `/api/promo/validate` (publiczny) + `/api/promo/codes` (PIN), pole w kasie
  i telefonie, rabat ręczny kelnerki z powodem (tylko telefoniczne), karta
  „Rabaty" w panelu, rozliczenie w „Dziś", nota w POS i na kwicie. Total liczony
  na serwerze; minimum dostawy PRZED rabatem. R2 (POS discount-percent) po kluczach.
- Autoryzacja obsługi: `lib/staffAuth.ts` + `proxy.ts` + `/api/staff/*`.
  Bez `STAFF_PIN` → panel otwarty (tryb testowy). Z `STAFF_PIN` → logowanie wspólnym PIN-em
  LUB osobistym kodem pracownika z Dotykački (`lib/dotykacka/employees.ts` — pola-kandydaci
  pin/loginPin/posPin/code/loginCode/password; NIEPOTWIERDZONE czy API zwraca kody —
  sprawdzić po podpięciu kluczy!). Cookie = token SHA-256 z sekretu, 90 dni.

## 5. Design system CARTA (zatwierdzony przez właściciela)

Jasna, redakcyjna „karta menu”. Tokeny w `orderhub/lib/carta.ts` i `app/globals.css`:
- kość słoniowa `#F7F3EB`, papier `#FFFEFA`, atrament `#1B1710`, wyciszony `#7A7060`,
  blady `#A99D87`, linie `#E3DAC6`/`#EDE5D5`, kropki `#C9BEA6`, akcent bordowy `#8E3B2F`.
- Serif (nagłówki/ceny, klasa `.font-carta`): Didot/Bodoni/Georgia (systemowe, bez webfontów).
  Sans: systemowy. Wordmark „MAMMAROSA": sans 800, letter-spacing .4em.
- Motywy: kropkowane linie prowadzące do cen, sekcje z liniami po bokach, kwadratowe
  checkboxy/ikonoramki 38px (wybrane = wypełnione atramentem), przyciski = czarne prostokąty
  z uppercase + serif-cena po prawej, delikatne `ct-reveal` wjazdy.
- Menu: masthead → **przyklejany pasek kategorii** (scrollspy, bordowe podkreślenie) →
  karta „PIZZA TYGODNIA" → listy pozycji (≥700px dwie kolumny) → czarny pasek zamówienia na dole.
- Karta produktu: zdjęcie + **prawdziwe składniki spadające na pizzę** przy zaznaczaniu
  dodatków (sprite'y `/public/toppings/*.webp` wycięte z prawdziwych zdjęć; mapowanie po
  nazwie dodatku w `toppingKind()`), cena live na przycisku.
- Panel obsługi (`/panel`): celowo INNY, ciemny (tło #161F19, karta #1F2A22, limonka #D5E36B,
  alert #E56A4E) — kolumny Nowe / W realizacji / Na godzinę, pastylki ETA, CTI-baner.
- Responsywność: mobile-first 430px; ≥700px tablet (2 kolumny, modale na środku);
  ≥1000px desktop (kasa: formularz + przyklejone podsumowanie w prawej kolumnie).

## 6. Zmienne środowiskowe (komplet w orderhub/.env.example)

| Zmienna | Rola |
|---|---|
| KV_REST_API_URL/TOKEN lub UPSTASH_REDIS_REST_URL/TOKEN | trwały magazyn zamówień (Vercel Storage → Upstash) |
| STAFF_PIN | włącza ochronę panelu; wspólny PIN zapasowy |
| DOTYKACKA_REFRESH_TOKEN / CLOUD_ID / BRANCH_ID (+CLIENT_ID/SECRET) | klucze API → prawdziwe menu, klienci, pracownicy |
| DOTYKACKA_SEND_ORDERS | **bezpiecznik**: `true` = rachunki idą do POS (go-live!) |
| DOTYKACKA_DELIVERY_CITY/KM_PRODUCT_ID | produkty „dostawa" w POS |
| ORS_API_KEY, RESTAURANT_LAT/LNG, DELIVERY_CITY_RADIUS_KM | mapy/odległości |
| GOOGLE_MAPS_API_KEY, GOOGLE_PLACE_QUERY | godziny otwarcia z wizytówki Google |
| OPENING_HOURS, LAST_ORDER_MIN | godziny ręcznie + bufor ostatniego zamówienia (20 min) |

## 7. Co jest ZROBIONE (A→Z, chronologicznie)

1. Analiza API Dotykački (baza: `docs/dotypos_api_brain.md`) + plan (`PLAN.md`, `docs/PLAN_NOWY_PROJEKT.md`).
2. Szkielet aplikacji orderhub: menu, koszyk (localStorage), checkout, dziękujemy, panel, API, mock menu.
3. Automatyczna wycena dostawy (Kościerzyna 5 zł / 2 zł/km ≤15 km) + GPS + reverse geocoding.
4. Iteracje designu (odrzucone: emoji/limonkowe „przedszkole"; odrzucona karuzela-wideo jako
   główny kierunek) → 3 profesjonalne propozycje (Nero/Carta/Forno) → **wybrana CARTA**.
5. Zdjęcia: 14 uploadów właściciela → wycięte białe tła (webp, przezroczystość), wersje HD
   (2× LANCZOS + wyostrzenie) w `orderhub/public/food/`. UWAGA: źródła tylko 300×300 px —
   właściciel MA dosłać większe; nazwa „Parma" dla pliku „gyrospoprawione" DO POTWIERDZENIA.
6. Realistyczne sprite'y składników (wycięte z prawdziwych zdjęć + fotorealistyczne oliwki)
   → `orderhub/public/toppings/`.
7. Pełny podgląd CARTA (`mockups/mammarosa-carta.html`) — zatwierdzony, z poprawkami:
   wordmark zamiast logo, „RESTAURACJA — PIZZERIA", ikony w kasie, responsywność,
   przyklejany pasek kategorii ze scrollspy.
8. Port CARTA do aplikacji Next (Shop, ProductModal, checkout, dziękujemy, globals, layout
   bez webfontów) — E2E przetestowany Playwrightem.
9. Wdrożenie na Vercel przez właściciela (10.07.2026): projekt wtyczka-dotykacka, root
   `orderhub`, main zmergowany (za zgodą), build zielony. `/` → redirect na `/menu`,
   diagnostyka na `/status`.
10. Bezpiecznik `DOTYKACKA_SEND_ORDERS` (symulacja mimo kluczy).
11. Autoryzacja panelu: STAFF_PIN opcjonalny, kody pracowników z Dotykački przez API,
    token-cookie 90 dni. Przetestowane curl-ami (open/PIN/zły PIN/ochrona listy).

## 8. Stan na Vercelu (wg wiedzy z 10.07.2026)

- Deploy działa (tryb DEMO). Właściciel MÓGŁ jeszcze nie zrobić: Storage→Upstash (wymagane,
  bez tego zamówienia znikają) i STAFF_PIN (na testy świadomie bez PIN-u — OK).
- Kluczy Dotykački jeszcze nie podpięto. ORS_API_KEY brak. Domeny własnej brak.

## 9. NAJBLIŻSZY PLAN (ustalony z właścicielem 10.07.2026)

**PRIORYTET 1 — panel obsługi „od A do Z" — ZROBIONE 10.07.2026** (commity 94dbc89, d021d88):
dźwięk nowych zamówień (Web Audio, przełącznik, migający tytuł karty), pełne szczegóły
(klikalny telefon, adres→Google Maps, uwagi w ramce, licznik „czeka X min"), kolejka
„na godzinę" z alertem „CZAS ZACZĄĆ/PO CZASIE" (40 min dostawa / 25 odbiór) i dźwiękiem,
zmiana ETA w trakcie, cofanie statusów, anulowanie z powodem, historia z wyborem dnia
(kafle: zrealizowane/utarg/gotówka-karta/średnia/anulowane), wskaźnik POS w pasku,
druk kwitu kuchennego (72 mm, window.print), pełny ekran, podpis obsługi (order.staff).
Czeka na feedback właściciela z realnego użycia.
**PRIORYTET 2 — strona klienta:** szlif + wyższe zdjęcia + prawdziwe ceny.
**PRIORYTET 3 — go-live:** klucze, `DOTYKACKA_SEND_ORDERS=true`, subdomena + przekierowanie.

## 10. Rzeczy po stronie właściciela (szczegóły: docs/CO_ZOSTALO_DLA_CIEBIE.md)

Upstash + STAFF_PIN na Vercelu · klucze Dotykački (tylko do Vercela!) · darmowy klucz ORS +
dokładne współrzędne lokalu · zdjęcia w wyższej rozdzielczości + potwierdzenie nazw/cen ·
typ linii telefonicznej (CTI) · rotacja ujawnionego client_secret ze starej wtyczki ·
(opcjonalnie) mail do integration@dotypos.com ws. natywnych powiadomień POS.

## 11. Warsztat asystenta (środowisko sesji Claude)

- Sieć jest MOCNO ograniczona: api.dotykacka.cz, docs.api.dotypos.com, Vercel API, CDN-y
  obrazków → 403. npm/PyPI działają. NIE próbuj deployować sam — deploy = push do `main`.
- Testy wizualne: `mockups/node_modules/playwright-core` + Chromium
  `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, viewport 390×844 @2x; app testuj
  przez `npm run build && npm run start -- -p 31xx` w `orderhub/`.
- Pliki tymczasowe TYLKO w katalogu scratchpad sesji (nie /tmp). `pkill next` ubija też
  własny shell (exit 144) — commituj w OSOBNYM wywołaniu Bash.
- Obróbka zdjęć: Pillow (wycinanie tła po nasyceniu, maski z piór, WebP q84).
- Next 16: `proxy.ts` zamiast middleware, params w route handlers są Promise,
  przed pisaniem kodu czytaj `orderhub/node_modules/next/dist/docs/` (patrz orderhub/AGENTS.md).
- Wysyłaj właścicielowi efekty jako pliki/zrzuty (SendUserFile), pisz „zapisałem w kodzie /
  wgrałem na serwer" precyzyjnie — nie mów „wdrożyłem", gdy tylko zapisałeś lokalnie.
