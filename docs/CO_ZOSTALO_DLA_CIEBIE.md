# Co zostało do zrobienia RAZEM z Tobą

Zbudowałem wszystko, co dało się bez Ciebie (Fazy 0–4 działają end-to-end w trybie DEMO).
Poniżej rzeczy, których nie mogę dokończyć sam — wymagają Twoich danych, sprzętu lub decyzji.

## 1. Klucze API Dotykački  🔑 (odblokowuje realne dane + wysyłkę do POS)
Potrzebne: `DOTYKACKA_REFRESH_TOKEN`, `DOTYKACKA_CLOUD_ID`, `DOTYKACKA_BRANCH_ID`
(oraz `CLIENT_ID/SECRET`). **Nie wklejaj ich w czacie** — wpiszemy je w Vercel → Environment
Variables (albo w `.env.local` u Ciebie). Po tym aplikacja przełączy się z DEMO na żywe menu
i zacznie realnie tworzyć rachunki w POS.
> Bez tego cały system działa, ale na danych demonstracyjnych / symulacji POS.

## 2. Wdrożenie na Vercel  🚀
Mam gotowe narzędzia Vercela. Gdy dasz zielone światło, zdeployuję `orderhub/` i dostaniesz
link do podglądu. Uwaga techniczna: na Vercelu magazyn zamówień (teraz in-memory) trzeba
podmienić na **Postgres (Neon) lub Vercel KV** — to ~pół godziny pracy, zrobię przy deployu.

## 3. Dostawa  💰 (USTAWIONE) + klucz map do automatu
Reguła wpisana zgodnie z Twoim poleceniem: **Kościerzyna 5 zł (płaska), poza 2 zł/km do 15 km**
(powyżej 15 km = poza zasięgiem). Liczy się automatycznie z adresu.
Żeby odległość liczyła się **w pełni automatycznie** (bez ręcznego podawania km), potrzebny jest
**darmowy klucz OpenRouteService** (https://openrouteservice.org — rejestracja, plan darmowy):
wpiszemy go jako `ORS_API_KEY`. Potwierdź też dokładny adres/współrzędne lokalu
(`RESTAURANT_LAT/LNG`, teraz domyślnie centrum Kościerzyny).

## 4. Telefon / CTI  📞 (zależy od typu linii)
Lookup klienta po numerze już działa. Brakuje realnego źródła zdarzenia „dzwoni numer":
- **VoIP/SIP** → podłączymy webhook centralki do `/api/cti/lookup`.
- **Analog/GSM** → potrzebna bramka GSM lub telefon-pośrednik.
- **Numer na Androidzie** → mała apka-towarzysz (czyta numer, woła nasze API).
Powiedz, jaka to linia — dobiorę rozwiązanie.

## 5. Wariant B — popup nad Dotykačką  🔔 (wybrany przez Ciebie)
Panel działa jako PWA (powiadomienia + dźwięk dodamy). Żeby powiadomienie „wyskakiwało"
NAD aplikacją Dotykačka na Androidzie, potrzebna jest **mała natywna apka-towarzysz**
(uprawnienie „nakładka na ekranie"). To osobny mini-projekt na Androida — zrobimy, gdy
zaakceptujesz resztę. Ta sama apka obsłuży CTI (pkt 4).

## 6. Płatności online  💳 (Faza 5 — gdy zdecydujesz)
Gotówka/karta przy odbiorze już są. Online (Przelewy24 / BLIK / Stripe) wymaga Twojego
konta merchanta i kluczy. Wtedy podłączymy też auto-fiskalizację przez `order/create-issue-pay`.

## 7. Natywne powiadomienia Dotykački (Wariant D)  ✉️ (opcjonalnie)
Jeśli chcesz alertu natywnie w samej aplikacji Dotykačka — trzeba napisać do
**integration@dotypos.com** z prośbą o włączenie powiadomień personelu dla naszej aplikacji
API. Mogę przygotować treść maila; wysłać musisz Ty (z konta właściciela).

---

### Co JUŻ działa (Fazy 0–4, DEMO):
sklep → koszyk → checkout → zamówienie → (symulacja) POS → monitor kelnerki →
ustawianie ETA → strona klienta aktualizowana na żywo → CTI rozpoznające dzwoniącego.
