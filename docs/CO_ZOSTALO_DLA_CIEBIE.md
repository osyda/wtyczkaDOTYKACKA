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

## Treści

6. **Zdjęcia pizz w wyższej rozdzielczości** (obecne 300×300 px są miękkie na dużych
   ekranach) — najlepiej 1000 px+; wyślij na czacie, podmienię.
7. **Potwierdzenie menu**: nazwa „Parma" (plik „gyrospoprawione"), skład La Bussola,
   realne ceny wszystkich pozycji (obecne są robocze).
8. **Zdjęcia napojów i deserów** (opcjonalnie — teraz są eleganckimi pozycjami tekstowymi).

## Sprawy techniczne / bezpieczeństwo

9. **Rotacja sekretu**: w starej wtyczce WordPressa jest ujawniony client_secret
   Dotykački — wygeneruj nowy w panelu Dotykački, podmień w starej wtyczce.
10. **Telefon stacjonarny (CTI)**: powiedz, jaką masz centralkę/linię — dobierzemy
    sposób podpięcia identyfikacji dzwoniącego.

## Dopiero przy go-live (nie teraz!)

11. Subdomena `zamow.mammarosa.pl`: Vercel → Settings → Domains + rekord CNAME u
    operatora domeny.
12. Przekierowanie 301 `mammarosa.pl/zamow-online/` → subdomena (wtyczka Redirection w WP).
13. `DOTYKACKA_SEND_ORDERS=true` + Redeploy — od tej chwili rachunki lecą na kasę.
14. (Opcjonalnie) mail do integration@dotypos.com ws. natywnych powiadomień w POS.
