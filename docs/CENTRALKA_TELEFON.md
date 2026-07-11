# Centralka telefoniczna (CTI) — jak podłączyć telefon lokalu do panelu

Stan: system po stronie aplikacji jest GOTOWY. Do działania na żywo brakuje tylko
jednego: coś musi „powiedzieć" aplikacji, że dzwoni telefon. Ten dokument opisuje
jak to podłączyć — do wyboru w zależności od tego, jaki telefon jest w lokalu.

## USTALENIE (11.07.2026): linia lokalu = STACJONARNY W ORANGE

Numer 58 686 55 30, abonament z pakietem minut komórkowych. Orange NIE udostępnia
webhooków/API o połączeniach przychodzących dla stacjonarnych, więc realne drogi:
- **B (docelowa, rekomendowana)**: przeniesienie numeru do wirtualnej centralki
  VoIP — numer zostaje, webhook działa; sprawdzić okres wypowiedzenia w Orange.
- **A′ (na już, bez zmian umowy)**: przekierowanie stacjonarnego na komórkę
  w lokalu (usługa przekierowań Orange) + MacroDroid na tej komórce (wariant A);
  minuty komórkowe w abonamencie zwykle pokrywają przekierowania. CLIP dzwoniącego
  jest przy przekierowaniu zachowywany, więc panel rozpozna klienta.
- **C**: bramka FXO w lokalu (np. Grandstream HT813) — bez zmian w Orange,
  odbieranie po staremu; wymaga zakupu i konfiguracji mostka.
Właściciel ma zdecydować; można łączyć: A′ od zaraz, B docelowo.

## Jak to działa (obraz całości)

1. Dzwoni telefon w pizzerii.
2. Centralka/telefon wywołuje nasz webhook:
   `https://TWOJA-DOMENA/api/cti/call?key=KLUCZ&phone=NUMER_DZWONIĄCEGO`
3. Panel kelnerki (odpytuje co 3 s) pokazuje baner: numer + rozpoznany klient
   (imię, adres, ile zamówień, co ostatnio brał) + dźwięk dzwonka (jeśli włączony).
4. Kelnerka klika **„Przyjmij zamówienie"** → od razu ląduje na ekranie zamówienia
   telefonicznego z wpisanym numerem i danymi klienta.
5. Każde połączenie zapisuje się w zakładce **„Telefony"** w panelu — z przyciskami
   „Oddzwoń" i „Zamów" (np. gdy nikt nie zdążył odebrać).

Zdarzenia przyjmujemy GET-em i POST-em; numer może przyjść w parametrze
`phone`, `number`, `caller`, `from`, `callerid` lub `src` — czyli dogadamy się
z praktycznie każdą centralką. Opcjonalne zdarzenie `event=end` chowa baner.

## Zabezpieczenie (zrób PRZED podłączeniem na żywo)

W Vercel → Settings → Environment Variables dodaj:
`CTI_WEBHOOK_KEY` = długi wymyślony ciąg (np. 30+ losowych znaków) → Redeploy.
Od tej pory zdarzenie bez `?key=...` zostanie odrzucone. Bez tej zmiennej webhook
jest otwarty — zostaw tak wyłącznie na czas testów.

Na stronie `/status` jest karta „Centralka telefoniczna (CTI)": pokazuje, czy klucz
jest ustawiony i kiedy przyszło ostatnie połączenie.

## Wariant A — telefon komórkowy (Android) w lokalu [NAJPROSTSZY, 0 zł]

Jeśli zamówienia przychodzą na komórkę (lub numer stacjonarny ma przekierowanie
na komórkę), wystarczy darmowa aplikacja **MacroDroid**:

1. Zainstaluj MacroDroid ze Sklepu Play na telefonie, który odbiera zamówienia.
2. Dodaj makro (+):
   - **Wyzwalacz**: „Połączenie przychodzące" → „Dowolny numer".
   - **Akcja**: „HTTP Request" → metoda **GET** → URL:
     `https://TWOJA-DOMENA/api/cti/call?key=TWÓJ_KLUCZ&phone=[call_number]`
     (magiczną zmienną `[call_number]` wybierz z listy — wstawi numer dzwoniącego).
   - Ograniczenia: brak.
3. Zapisz i nadaj aplikacji uprawnienia, o które poprosi (telefon, internet).
4. Zadzwoń na ten telefon z innego numeru — w panelu ma wyskoczyć baner.

Uwagi: telefon musi mieć internet; MacroDroid musi być wyłączony z oszczędzania
baterii (aplikacja sama o to prosi), inaczej Android potrafi go uśpić.

## Wariant B — wirtualna centralka VoIP [DOCELOWY dla numeru stacjonarnego]

Jeśli numer lokalu to stacjonarny (58…), najwygodniej przenieść go do operatora
wirtualnej centralki (np. Telecube, EasyCall, HaloNet — przeniesienie numeru jest
darmowe i trwa ~2–4 tyg., numer się NIE zmienia). Zyskujesz przy okazji:
zapowiedzi, kolejkowanie, nagrywanie. W panelu centralki ustawia się
„powiadomienie HTTP / webhook o połączeniu przychodzącym" na adres:
`https://TWOJA-DOMENA/api/cti/call?key=TWÓJ_KLUCZ&phone={numer_dzwoniacego}`
(dokładną nazwę zmiennej z numerem podaje dokumentacja operatora; obsługujemy
kilka nazw parametrów, więc zwykle działa od razu).

Powiedz mi tylko, jakiego masz operatora/linię — wskażę dokładne kliknięcia.

## Wariant C — bramka/router z linią (np. FRITZ!Box) [ZAAWANSOWANY]

Niektóre routery z gniazdem telefonicznym potrafią zgłaszać połączenia w sieci
lokalnej. Wymaga to małego „mostka" (mini-program w lokalu, który słucha routera
i woła nasz webhook). Do zrobienia, gdy warianty A/B nie wchodzą w grę.

## Test bez prawdziwego telefonu

- W panelu: pole „Test centralki" → wpisz numer → „Symuluj połączenie"
  (przechodzi pełną drogą webhooka, więc testuje wszystko naraz).
- Z komputera: `curl "https://TWOJA-DOMENA/api/cti/call?key=KLUCZ&phone=600100200"`

## Szczegóły techniczne (dla przyszłych sesji)

- Webhook: `app/api/cti/call/route.ts` (GET/POST, klucz `CTI_WEBHOOK_KEY`,
  zalogowana obsługa może wołać bez klucza — stąd działa przycisk testowy).
- Stan+dziennik: `lib/ctiCalls.ts` — `cti:ring` (TTL 90 s, deduplikacja po numerze),
  `cti:calls` (lista, max 100), Redis z fallbackiem do pamięci.
- Panel: poll `/api/cti/ring` co 3 s (dźwięk raz na połączenie — po `at`),
  zakładka „Telefony" → `/api/cti/calls` (numery wzbogacone o imiona z historii zamówień).
- Rozpoznanie klienta: `lib/cti.ts` → `lookupCaller` (historia zamówień; docelowo
  można dołożyć lookup w klientach Dotykački).
