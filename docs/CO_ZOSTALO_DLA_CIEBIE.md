# Co zostało do zrobienia po Twojej stronie (stan: 10.07.2026)

Aplikacja jest wdrożona na Vercelu (projekt `wtyczka-dotykacka`, adres *.vercel.app).
Panel obsługi gotowy od A do Z. Poniżej wszystko, czego nie mogę zrobić za Ciebie.

## Pilne (żeby testy były pełnowartościowe)

1. **Baza zamówień** — Vercel → projekt → Storage → Create Database → **Upstash (Redis)**
   → Connect. Bez tego zamówienia potrafią znikać (serverless nie ma pamięci).
2. **Testowe zamówienie**: telefon → `/menu` → złóż zamówienie; komputer → `/panel` →
   włącz dzwonek (ikona), ustaw ETA, przeklikaj statusy, wydrukuj kwit, zobacz „Dziś".

## Przed testami z prawdziwym menu

3. **Klucze Dotykački** (Settings → Environment Variables → potem Redeploy):
   `DOTYKACKA_REFRESH_TOKEN`, `DOTYKACKA_CLOUD_ID`, `DOTYKACKA_BRANCH_ID`
   (opcjonalnie CLIENT_ID/SECRET). Wpisuj TYLKO w Vercelu — nigdy na czacie.
   Po podpięciu: `/status` pokaże „Połączono", menu będzie z POS, a logowanie do panelu
   zadziała (sprawdzimy!) kodami pracowników. Rachunki NADAL będą symulowane —
   bezpiecznik `DOTYKACKA_SEND_ORDERS` zostaje wyłączony aż do go-live.
4. **PIN panelu**: zmienna `STAFF_PIN` (własne 4–6 cyfr) + Redeploy — przed pokazaniem
   panelu komukolwiek spoza zaufanego grona. Kod wpisuje się raz na urządzenie (90 dni).
5. **Klucz map**: darmowe konto na openrouteservice.org → `ORS_API_KEY` +
   dokładne współrzędne lokalu `RESTAURANT_LAT` / `RESTAURANT_LNG`
   (znajdziesz w Google Maps: PPM na lokal → „Co tu jest?").
6. **Godziny otwarcia — DECYZJA WŁAŚCICIELA: klucz Google** (godziny mają ciągnąć się
   same z wizytówki Google; blokada zamówień po zamknięciu, ostatnie zamówienie
   20 min przed). Do zrobienia przy najbliższym „ogarnianiu Vercela":
   1. Wejdź na console.cloud.google.com → zaloguj się kontem Google (najlepiej tym,
      którym zarządzasz wizytówką Mammarosy).
   2. Utwórz projekt (np. „mammarosa") → w wyszukiwarce na górze wpisz
      **„Places API (New)"** → Enable (Włącz).
   3. Google poprosi o podpięcie karty (rozliczenia) — darmowy pakiet starcza
      z ogromnym zapasem: pytamy o godziny raz na 6 godzin, nie za każde wejście.
   4. Menu → APIs & Services → **Credentials → Create credentials → API key** → skopiuj.
      (Zalecane: w ustawieniach klucza ogranicz go do „Places API (New)".)
   5. Vercel → projekt `wtyczka-dotykacka` → Settings → Environment Variables →
      dodaj `GOOGLE_MAPS_API_KEY` = skopiowany klucz → **Redeploy**.
   6. Sprawdź `/status` → karta „Godziny otwarcia" ma pokazać
      „Źródło godzin: z wizytówki Google (odświeżane co 6 h)" i właściwe godziny tygodnia.
   Awaryjnie (bez Google) działa `OPENING_HOURS` wpisane ręcznie, np.
   `pn-czw 11:00-21:00; pt-sb 11:00-22:00; nd 12:00-21:00` (dzień wolny: `wt zamknięte`).
   Bez obu: domyślne 11:00–21:00 codziennie. Bufor zmienisz w `LAST_ORDER_MIN`.

## Treści

7. **Zdjęcia pizz w wyższej rozdzielczości** (obecne 300×300 px są miękkie na dużych
   ekranach) — najlepiej 1000 px+; wyślij na czacie, podmienię.
8. **Potwierdzenie menu**: nazwa „Parma" (plik „gyrospoprawione"), skład La Bussola,
   realne ceny wszystkich pozycji (obecne są robocze).
9. **Zdjęcia napojów i deserów** (opcjonalnie — teraz są eleganckimi pozycjami tekstowymi).

## Sprawy techniczne / bezpieczeństwo

10. **Rotacja sekretu**: w starej wtyczce WordPressa jest ujawniony client_secret
    Dotykački — wygeneruj nowy w panelu Dotykački, podmień w starej wtyczce.
11. **Telefon lokalu (centralka)**: system w aplikacji jest GOTOWY — przeczytaj
    `docs/CENTRALKA_TELEFON.md`. Do zrobienia u Ciebie: (a) dodaj w Vercelu
    `CTI_WEBHOOK_KEY` (długi losowy ciąg), (b) jeśli zamówienia odbiera komórka —
    zainstaluj MacroDroid wg instrukcji (10 minut); jeśli stacjonarny — powiedz,
    jaki masz numer/operatora, dobierzemy wariant.

## Dopiero przy go-live (nie teraz!)

12. Subdomena `zamow.mammarosa.pl`: Vercel → Settings → Domains + rekord CNAME u
    operatora domeny.
12. Przekierowanie 301 `mammarosa.pl/zamow-online/` → subdomena (wtyczka Redirection w WP).
13. `DOTYKACKA_SEND_ORDERS=true` + Redeploy — od tej chwili rachunki lecą na kasę.
14. (Opcjonalnie) mail do integration@dotypos.com ws. natywnych powiadomień w POS.
