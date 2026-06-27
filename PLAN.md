# Plan: System zamówień Mamma Rosa ↔ Dotykačka (POS)

> Dokument roboczy. Opracowany na podstawie analizy istniejącej wtyczki
> `dotypos-woo-connector (2).php` (działająca integracja produkcyjna) oraz
> dokumentacji API Dotykačka v2 (https://docs.api.dotypos.com).
>
> Uwaga: domena `docs.api.dotypos.com` jest w tym środowisku zablokowana
> przez politykę sieciową, więc dokładne nazwy niektórych pól (oznaczone
> **[DO POTWIERDZENIA]**) trzeba zweryfikować na żywym API zanim wejdą do kodu.
> Wszystkie fakty oznaczone **[KOD]** pochodzą z analizy działającej wtyczki i są pewne.

---

## 1. Stan obecny — co realnie masz (z analizy kodu)

### Stack
- **WooCommerce** + **Orderable Pro** (UI zamawiania) + wtyczka liczenia dostawy
  (4 zł Kościerzyna / 2 zł poza).
- **`dotypos-woo-connector`** — własna wtyczka (2960 linii) łącząca Woo z Dotykačką.
- **Aplikacja Android** ("ta śmieszna") — przechwytuje zamówienia ASAP i obsługuje ETA
  na drugim tablecie.

### Jak działa integracja z POS dzisiaj **[KOD]**
- **Autoryzacja:** Connector v2 (`admin.dotykacka.cz/client/connect/v2`) → `refreshToken`.
  Z niego pobierany `accessToken` (ważny ~1h) przez
  `POST https://api.dotykacka.cz/v2/signin/token` z nagłówkiem `Authorization: User <refreshToken>`
  i ciałem `{"_cloudId": "<cloudId>"}`. Token cache'owany 55 min.
- **Wysyłka zamówienia:** `POST /v2/clouds/{cloudId}/branches/{branchId}/pos-actions`
  z payloadem:
  ```json
  {
    "action": "order/create",
    "external-id": "woo-<id>",
    "note": "🚚 DOSTAWA | Woo: #123 | Klient: ... | Tel: ... | Adres: ...",
    "items": [ { "id": <productId>, "qty": 2, "customizations": [ ... ] } ],
    "take-away": true
  }
  ```
  → tworzy **zaparkowany, otwarty rachunek** na POS.
- **Take-away:** druga akcja `order/set-item-takeaway` ustawia flagę „na wynos” na pozycjach.
- **Dodatki (customizations):** dopinane do dania przez `product-customization-id` + `product-id`,
  z fallbackiem (gdy POS zwróci „Customization not found” → ponowna wysyłka bez customizations).
- **Dostawa jako produkt:** koszt dostawy doklejany jako osobny produkt w POS (żeby suma się zgadzała).
- **Retry:** gdy kasa zamknięta (`code 3001 / Register is closed`) → zamówienie czeka i jest
  ponawiane w oknie 11:45–12:15.
- **Idempotencja:** nagłówek `Idempotency-Key: dwco-order-<id>` + meta `_dwco_dotypos_order_id`
  zapobiega duplikatom.

### ⚠️ Najważniejsze ograniczenie obecnego rozwiązania **[KOD]**
**Dane klienta lecą wyłącznie jako tekst w polu `note`.** Wtyczka **nie tworzy ani nie
podpina encji Customer** w Dotykačce — stąd Twój ból, że „wszystko jest notatką”.
To jest naprawialne (sekcja 5b).

---

## 2. Twarda prawda o API — co da się, a czego NIE (czytaj uważnie)

To jest najważniejsza sekcja, bo decyduje o tym, które „marzenia” są realne.

| Marzenie | Werdykt | Dlaczego |
|---|---|---|
| Własny sklep „pode mnie", bez Orderable | ✅ Realne | Czysty front + ten sam mechanizm `pos-actions`. |
| Dane klienta przypisane do klienta w Dotykačce (nie notatka) | ✅ Realne | Istnieje encja **Customer** (CRUD + filtrowanie). Trzeba ją utworzyć/znaleźć i podpiąć do rachunku. |
| Flaga „na wynos / na miejscu” przy parkowaniu | ✅ Realne | Akcja `order/set-item-takeaway` już to robi; wymuszamy zawsze. |
| Likwidacja **drugiego tabletu** (ETA na jednym urządzeniu) | ✅ Realne | Ale jako **osobny ekran/PWA na tym samym komputerze**, nie natywne okno w appce. |
| **Natywne okienko „nowe zamówienie" WEWNĄTRZ aplikacji Dotykačka** | ❌ Nierealne przez publiczne API | Dotykačka to zamknięta apka Android. API pozwala tylko *wstrzyknąć zaparkowany rachunek* — nie da się wyrenderować własnego modala/podglądu w jej UI ani zmusić jej do otwarcia konkretnego ekranu. |
| Telefon dzwoni → automatyczne otwarcie rachunku po numerze | 🟡 Częściowo / warunkowo | Wyszukanie klienta po numerze = ✅. „Otwarcie rachunku" = utworzenie **zaparkowanego rachunku z podpiętym klientem**, który pojawi się na liście — ale **nie** wymuszenie, by Dotykačka sama otworzyła ten ekran. Zależy też od typu linii telefonicznej. |
| Płatność online (karta na stronie) | ✅ Realne (osobny moduł) | Bramka (Przelewy24/Stripe) — niezależne od Dotykački. |
| Automatyczna fiskalizacja zamiast ręcznej | 🟡 Do weryfikacji | Zależy od tego, czy Twoja konfiguracja POS/EET pozwala domykać rachunek przez API. Dziś kelnerka domyka ręcznie. |

**Wniosek strategiczny:** marzenie „wszystko dzieje się w środku Dotykački” w 100% nie jest
osiągalne, bo to cudza, zamknięta aplikacja. **Realny cel:** zlikwidować drugi tablet i papierologię,
zastępując je **jednym dodatkowym ekranem (PWA) na tym samym komputerze sprzedażowym**, który jest
ładny, „pod Ciebie", a Dotykačka dostaje gotowy, poprawnie opisany rachunek z podpiętym klientem
i flagą na wynos. Jeśli zależy Ci na natywnym okienku w Dotykačce — to wymaga rozmowy
partnerskiej z samą Dotykačką (ich wewnętrzny program integracji „delivery/online orders"), nie API.

---

## 3. Rekomendowana architektura docelowa

```
┌─────────────────┐     ┌──────────────────────────┐     ┌─────────────────────┐
│  KLIENT (www)   │     │   MIDDLEWARE / BACKEND   │     │   DOTYKAČKA POS      │
│  Sklep "pode    │────▶│   (Next.js API na Vercel │────▶│   (Android, na sali) │
│  mnie" (PWA)    │     │    lub wtyczka Woo)      │     │   - zaparkowany       │
│  - ASAP / godz. │◀────│   - auth + token cache   │◀────│     rachunek          │
│  - dostawa/odb. │ ETA │   - Customer upsert      │     │   - klient podpięty   │
└─────────────────┘     │   - order/create         │     │   - flaga na wynos    │
                        │   - webhooks Dotykačka   │     └─────────────────────┘
┌─────────────────┐     │   - kolejka/retry        │
│ EKRAN "ZAMÓWIENIA"│◀──▶│   - rejestr klientów     │     ┌─────────────────────┐
│ /ETA (PWA) na    │ETA  │                          │◀────│  TELEFON / CTI       │
│ komputerze       │     └──────────────────────────┘     │  (SIP webhook lub    │
│ sprzedażowym     │                                      │   Android companion) │
└─────────────────┘                                      └─────────────────────┘
```

**Trzy komponenty do zbudowania:**
1. **Sklep/checkout** — front zamawiania (Vercel/Next.js *lub* odchudzone Woo).
2. **Middleware** — jeden serwis: trzyma token, mapuje produkty, robi `Customer upsert`,
   tworzy rachunek, obsługuje ETA i kolejkę. To serce systemu (przenosimy tu logikę z obecnej wtyczki).
3. **Ekran „Zamówienia/ETA"** — PWA na komputerze sprzedażowym (likwiduje drugi tablet) + opcjonalna
   aplikacja towarzysząca do CTI (telefon).

### Vercel vs WooCommerce — rekomendacja
- **Vercel/Next.js (rekomendowane, jeśli chcesz „od zera, pode mnie"):** pełna kontrola UI i reguł,
  własny checkout, ASAP/ETA natywnie w jednym projekcie, łatwe PWA na komputer.
  Koszt: migracja menu (pobierzemy produkty/kategorie z Dotykački przez API — obecna wtyczka już to umie),
  trzeba zbudować koszyk/checkout/płatności od podstaw.
- **WooCommerce odchudzone:** wyrzucamy Orderable, piszemy własny checkout-flow jako wtyczkę,
  zostaje obecny hosting/SEO/baza klientów. Szybciej i mniejsze ryzyko, ale UI zawsze będzie
  „woocommerce'owy pod spodem".

> **Decyzja potrzebna od Ciebie (pyt. 1).** Moja rekomendacja: jeśli realnie zależy Ci na
> wyglądzie i regułach „tylko pode mnie" i masz cierpliwość na większy projekt — **Vercel**.
> Jeśli priorytetem jest szybki efekt i spokój — **odchudzone Woo**. Źródłem prawdy o menu
> i tak pozostaje Dotykačka (synchronizacja produktów istnieje w kodzie).

---

## 4. Rozwiązanie marzenie po marzeniu

### 5a. Własny sklep bez Orderable
- Front: kategorie + produkty (sync z Dotykački: `GET /v2/clouds/{cloudId}/products`,
  `/categories`, `/product-customizations` — **[KOD]** wtyczka już je pobiera, z ETag/cache).
- Koszyk z dodatkami (mapowanie na `customizations` jak w obecnym kodzie).
- Wybór: **dostawa vs odbiór** + **ASAP vs konkretna godzina**.
- Reguła dostawy (Kościerzyna 4 zł / poza 2 zł — **[uwaga: w kodzie domyślne 5 zł/2 zł za km, do ujednolicenia]**)
  liczona po stronie middleware na podstawie adresu/strefy, nie pluginem.
- Strona „dziękujemy" z dynamicznym ETA (patrz 5c).

### 5b. Klient w Dotykačce zamiast notatki  ✅ (to naprawia Twój główny ból)
Nowy krok w middleware przy każdym zamówieniu:
1. **Szukaj klienta po telefonie:**
   `GET /v2/clouds/{cloudId}/customers?filter=phone,eq,<numer>` **[DO POTWIERDZENIA składni filtra]**
   (API Dotykački wspiera `page/limit/filter` — potwierdzone w klientach bibliotecznych).
2. **Brak → utwórz:** `POST /v2/clouds/{cloudId}/customers` z polami
   `firstName/lastName/phone/email/street/city/zip` **[DO POTWIERDZENIA dokładnych nazw pól]**.
3. **Podepnij klienta do rachunku:** w `order/create` dodać pole wiążące customer-id
   (`_customerId` / `customer-id`) **[DO POTWIERDZENIA nazwy w pos-actions]**. Jeśli `order/create`
   nie przyjmuje klienta wprost — alternatywa: utworzyć rachunek i osobną akcją POS przypisać klienta.
4. Notatkę zostawiamy jako *dodatek* (adres/uwagi), ale tożsamość klienta jest już rekordem.

> To jednocześnie buduje Ci **bazę klientów w Dotykačce po numerze telefonu** — fundament pod CTI (5e).

### 5c. ETA bez drugiego tabletu
Tok zamówienia ASAP:
1. Zamówienie ASAP ląduje w middleware i na **ekranie „Zamówienia/ETA"** (PWA otwartej obok Dotykački
   na komputerze sprzedażowym).
2. Kelnerka klika czas przygotowania (np. 30/45/60 min) na tym ekranie.
3. Middleware zapisuje ETA i **strona „dziękujemy" klienta** aktualizuje się (polling/websocket).
4. Dopiero teraz (lub od razu — do ustalenia) rachunek leci do Dotykački jako zaparkowany.

Zamówienie na konkretną godzinę: omija ETA, leci od razu do POS (jak dziś) — strona „dziękujemy"
pokazuje wybraną godzinę.

> To **likwiduje drugi fizyczny tablet** — ETA ustawiasz w przeglądarce na tym samym komputerze.
> Natywnego okna w Dotykačce nie zrobimy (sekcja 2), ale jeden zgrabny ekran obok = praktycznie to samo
> doświadczenie, w pełni „pode mnie".

### 5d. „Na wynos / na miejscu" przy parkowaniu  ✅
- Zamówienia online: **zawsze** wymuszamy `take-away: true` + `order/set-item-takeaway` (**[KOD]** już jest).
- Brak natywnego promptu Dotykački przy parkowaniu to ograniczenie ich UI — ale skoro flagę
  ustawiamy programowo, rachunek z online'u zawsze przyjdzie poprawnie oznaczony, bez pytania kelnerki.

### 5e. Telefon stacjonarny → rachunek po numerze (CTI)
Wykonalność zależy od **typu linii** (pyt. 2). Trzy warianty:
- **VoIP/SIP:** centralka wysyła webhook „incoming call" z numerem → middleware → lookup klienta
  → ekran CTI pokazuje kartę klienta + historię → (opcjonalnie) tworzy zaparkowany rachunek z podpiętym klientem.
- **Linia analogowa/GSM:** potrzebna **bramka GSM** lub telefon-pośrednik, który zamieni połączenie
  w zdarzenie HTTP.
- **Numer odbierany na Androidzie (najprościej):** mała **aplikacja towarzysząca** (może rozwinięcie
  „tej śmiesznej") czyta `PHONE_STATE`, pobiera numer, woła middleware → lookup → pokazuje klienta /
  tworzy rachunek.

Realny efekt (we wszystkich wariantach): **dzwoni numer → na ekranie wyskakuje kto dzwoni + ostatnie
zamówienia + jednym kliknięciem zakładasz mu rachunek z podpiętym klientem.** Czego NIE zrobimy:
zmusić samą aplikację Dotykačka, żeby to ona otworzyła ten ekran (sekcja 2). Dlatego CTI „mieszka"
na ekranie „Zamówienia/ETA" / w aplikacji towarzyszącej, a do Dotykački trafia gotowy rachunek.

---

## 5. Płatności
- **Dziś:** karta/gotówka przy odbiorze/dostawie — zostaje, zero zmian po stronie API.
- **Online (na przyszłość):** Przelewy24 / BLIK / Stripe jako moduł na froncie. To jest niezależne
  od Dotykački — POS dostaje rachunek tak czy siak; status „opłacone online" przekazujemy w note/metadanych
  i ewentualnie domykamy rachunek automatycznie (zależne od 5f).

## 6. Fiskalizacja
- **Dziś:** rachunek przychodzi zaparkowany i otwarty → kelnerka fiskalizuje ręcznie.
- **Cel:** sprawdzić, czy przez `pos-actions` można domknąć/zafiskalizować rachunek (zależy od konfiguracji
  EET/kasy). **[DO WERYFIKACJI na żywym API/POS]**. Jeśli się da — przy płatności online można domykać
  automatycznie. Jeśli nie — zostaje ręczne domknięcie, ale przynajmniej z podpiętym klientem i poprawnymi flagami.

---

## 7. Plan wdrożenia w fazach (od najmniejszego ryzyka)

**Faza 0 — Higiena (1–2 dni).** Uporządkować obecną wtyczkę: ujednolicić stawki dostawy (4 zł/2 zł),
przenieść sekrety z kodu do ustawień/zmiennych środowiskowych (teraz `client_secret` jest w pliku
`dotypos-connector.php` — **do natychmiastowej zmiany**), włączyć logi.

**Faza 1 — Klient zamiast notatki (największy zysk, małe ryzyko).** Wdrożyć 5b w obecnej wtyczce:
upsert Customer + podpięcie do rachunku. Działa od razu na produkcji, niezależnie od reszty.

**Faza 2 — Ekran „Zamówienia/ETA" (PWA).** Zbudować jeden ekran na komputer sprzedażowy → likwidacja
drugiego tabletu (5c). Przeniesienie logiki ETA z „śmiesznej apki".

**Faza 3 — Nowy front zamawiania.** Vercel/Next.js *lub* odchudzone Woo (decyzja z pyt. 1). Migracja menu z Dotykački.

**Faza 4 — CTI / telefon.** Zależnie od typu linii (pyt. 2).

**Faza 5 — Płatności online + ew. auto-fiskalizacja.**

> Każdą fazę da się wdrożyć i sprawdzić osobno; system działa po każdej z nich.

## 8. Co muszę od Ciebie wiedzieć (żeby ruszyć konkretnie)
1. **Sklep:** Vercel (od zera) czy zostajemy na Woo? (sekcja 3)
2. **Telefon:** jaka linia — VoIP/SIP, analogowa/GSM, czy numer odbierany na Androidzie? (5e)
3. **Ekran ETA:** akceptujesz osobny ekran/PWA na tym samym komputerze (zamiast natywnego okna w Dotykačce)? (sekcja 2/5c)
4. **Dostawa:** potwierdź stawki — 4 zł Kościerzyna / 2 zł poza (w kodzie jest 5 zł / 2 zł za km — rozbieżność).
5. **Dostęp testowy do API:** czy mogę dostać sandbox/testowy `cloudId`+`branchId`, żeby potwierdzić
   pola Customer i pos-actions na żywo (oznaczenia **[DO POTWIERDZENIA]**), bez ruszania produkcji?
6. **Fiskalizacja:** czy zależy Ci na automatycznym domykaniu rachunku, czy ręczne jest OK?

## 9. Ryzyka i uwagi bezpieczeństwa
- 🔴 **Sekret w repo:** `dotypos-connector.php` zawiera `client_secret` w kodzie (linia 13).
  Trzeba go natychmiast usunąć z kodu/repo i (najlepiej) zrotować w Connectorze Dotykački.
- „Natywne okno w Dotykačce" — niewykonalne przez API; oczekiwania ustawiamy na „ekran obok" (sekcja 2).
- CTI zależy od sprzętu telefonicznego — bez tej informacji nie wycenię tej części.
- Auto-fiskalizacja zależna od konfiguracji EET — do weryfikacji.
- Zależność od dostępności API Dotykački (kolejka/retry jak w obecnym kodzie — utrzymać).

---

### Źródła
- Analiza kodu: `dotypos-woo-connector (2).php`, `dotypos-connector.php` (to repo).
- Dokumentacja API Dotykačka v2: https://docs.api.dotypos.com/ (Customer, Order, Order Item,
  POS actions, Delivery Notes Integrations, Webhook — domena blokowana w tym środowisku,
  pola **[DO POTWIERDZENIA]** weryfikować na żywo).
