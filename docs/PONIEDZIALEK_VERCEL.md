# Poniedziałek — konfiguracja Vercel (checklista do odhaczania)

Wszystko robisz w: vercel.com → projekt **wtyczka-dotykacka**.
Zasada: sekrety wpisujesz TYLKO tutaj (Environment Variables) — nigdy na czacie.
Po dodaniu/zmianie zmiennych ZAWSZE: Deployments → ⋯ przy najnowszym → **Redeploy**
(zmienne działają dopiero po przebudowaniu).

## 1. Baza danych (NAJWAŻNIEJSZE — bez tego zamówienia potrafią znikać)

- [ ] Projekt → zakładka **Storage** → Create Database → **Upstash (Redis)** → Connect.
      Zmienne KV_REST_API_URL/TOKEN dopiszą się same. → Redeploy.

## 2. Zmienne środowiskowe (Settings → Environment Variables)

- [ ] `CTI_WEBHOOK_KEY` = długi wymyślony ciąg, 30+ znaków (litery+cyfry).
      Do centralki telefonicznej — ten sam ciąg wpiszesz potem w MacroDroid.
- [ ] `STAFF_PIN` = HASŁO LOKALU (ustaw dłuższe niż 4 cyfry!) — wpisywane raz
      na 90 dni na każdym urządzeniu; chroni panel, telefon, kierowcę i /status.
- [ ] `STAFF_CODES` = osobiste kody personelu (podpis przy zamówieniach),
      np. `Ania:1234, Kasia:5678, Marcin H:1111` — mogą być te same co w POS.
- [ ] `GOOGLE_MAPS_API_KEY` = klucz z Google Cloud (godziny otwarcia z wizytówki):
      console.cloud.google.com → projekt → włącz **Places API (New)** →
      Credentials → Create credentials → API key. (Wymaga podpięcia karty,
      darmowy pakiet starcza z ogromnym zapasem.)
- [ ] `ORS_API_KEY` = klucz z openrouteservice.org (darmowe konto → Dashboard →
      Tokens → Create). Automatyczne liczenie km dostawy.
- [ ] `RESTAURANT_LAT` i `RESTAURANT_LNG` = dokładne współrzędne lokalu:
      Google Maps → kliknij PRAWYM przyciskiem dokładnie na lokal → skopiuj
      współrzędne (pierwsza liczba = LAT, druga = LNG).
- [ ] `DRIVERS` = imiona kierowców po przecinku, np. `Marek, Paweł` —
      panel będzie pytał „który kierowca bierze kurs?" przy wydawaniu dostawy
      i policzy kursy/utarg per kierowca w zakładce „Dziś".
- [ ] NIE ustawiaj `DOTYKACKA_SEND_ORDERS` — zostaje wyłączone aż do go-live!
- [ ] Redeploy.

## 3. Weryfikacja (otwórz /status na stronie)

- [ ] Karta „Godziny otwarcia" — zielona, „z wizytówki Google", właściwe godziny.
- [ ] Karta „Mapy i automatyczna dostawa" — zielona, „testowa trasa do Stężycy: X km".
- [ ] Karta „Centralka telefoniczna" — zielona, „webhook zabezpieczony kluczem".
- [ ] Wejdź na /panel — ma poprosić o PIN; wpisz swój `STAFF_PIN`.

## 4. Telefon (poza Vercelem — wariant: przekierowanie + MacroDroid)

- [ ] Orange: przekierowanie bezwarunkowe ze stacjonarnego na komórkę lokalu:
      wybierz na stacjonarnym `*21*NUMER_KOMÓRKI#` (wyłączenie: `#21#`).
      Alternatywnie: Mój Orange / infolinia — „przekierowanie bezwarunkowe".
- [ ] Komórka lokalu: zainstaluj **MacroDroid** → makro:
      Wyzwalacz „Połączenie przychodzące / dowolny numer" →
      Akcja „HTTP Request / GET" → adres:
      `https://TWOJA-DOMENA.vercel.app/api/cti/call?key=TWÓJ_CTI_WEBHOOK_KEY&phone=[call_number]`
      ([call_number] wybierz z listy zmiennych magicznych).
- [ ] Wyłącz oszczędzanie baterii dla MacroDroid (aplikacja poprosi).
- [ ] Próba: zadzwoń na numer pizzerii z prywatnego telefonu → komórka dzwoni,
      w panelu wyskakuje baner, połączenie widać w zakładce „Telefony".

## 5. Test całości na koniec

- [ ] Telefonem: /menu → złóż zamówienie testowe (dostawa, adres poza Kościerzyną —
      sprawdź, czy km i cena policzyły się same).
- [ ] Komputerem: /panel → dzwonek włączony → przyjmij zamówienie, ustaw ETA,
      przeklikaj statusy, zobacz „Dziś".
- [ ] /panel/telefon → przyjmij testowe zamówienie telefoniczne od A do Z.

Gdy wszystko odhaczone — napisz na czacie, przechodzimy do szlifu strony klienta
i przygotowania go-live (subdomena zamow.mammarosa.pl + przełączenie wysyłki do POS).

Szczegóły, gdyby coś nie grało:
- godziny/mapy/centralka: karty na /status mówią, co jest nie tak;
- centralka: docs/CENTRALKA_TELEFON.md;
- pełna lista spraw poza Vercelem: docs/CO_ZOSTALO_DLA_CIEBIE.md
  (klucze Dotykački, zdjęcia HD, ceny, rotacja starego sekretu).
