# Wdrożenie na Vercel — runbook (poniedziałek)

Cel: postawić `orderhub/` na Vercelu, podpiąć trwały magazyn i (opcjonalnie) klucze.
Czas: ~20–30 min. Większość to klikanie w panelu Vercela + wklejenie zmiennych.

## 0. Czego potrzebujesz pod ręką
- Konto Vercel (zalogowane), połączone z GitHubem (repo `osyda/wtyczkadotykacka`).
- (Opcjonalnie) klucze Dotykački: refresh token, cloudId, branchId.
- (Opcjonalnie) darmowy klucz OpenRouteService (mapy) + adres lokalu.

## 1. Import projektu
- Vercel → **Add New… → Project** → wybierz repozytorium.
- **Root Directory: `orderhub`** (ważne — projekt jest w podkatalogu).
- Framework: Next.js (wykryje się sam). Kliknij **Deploy** — pierwszy build pójdzie w trybie DEMO.

## 2. Trwały magazyn zamówień (WYMAGANE do realnych zamówień)
Bez tego na serverless zamówienia by się gubiły. Mamy gotowy adapter — wystarczy podpiąć bazę:
- Vercel → projekt → **Storage → Create → KV (Redis / Upstash)** → połącz z projektem.
- Vercel sam ustawi `KV_REST_API_URL` i `KV_REST_API_TOKEN`. Aplikacja wykryje je automatycznie.
- (Alternatywa: własny Upstash → ustaw `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`.)

## 3. Zmienne środowiskowe (Settings → Environment Variables)
Wszystkie opcjonalne — bez nich działa DEMO. Dodawaj wg potrzeb:

**Dotykačka (żeby realne menu + tworzenie rachunków):**
```
DOTYKACKA_CLOUD_ID=...
DOTYKACKA_BRANCH_ID=...
DOTYKACKA_REFRESH_TOKEN=...      # sekret — tylko tutaj, nigdy w repo
DOTYKACKA_CLIENT_ID=...
DOTYKACKA_CLIENT_SECRET=...
# opcjonalnie: id produktów „dostawa” w POS
DOTYKACKA_DELIVERY_CITY_PRODUCT_ID=
DOTYKACKA_DELIVERY_KM_PRODUCT_ID=
```

**Dostawa / mapy (pełna automatyka odległości):**
```
ORS_API_KEY=...                  # darmowy z openrouteservice.org
RESTAURANT_LAT=54.1226           # dokładne współrzędne lokalu
RESTAURANT_LNG=17.9766
DELIVERY_CITY_RADIUS_KM=3
```

Po dodaniu zmiennych → **Redeploy**.

## 4. (Zalecane przed publicznym startem) ochrona panelu
⚠️ `/panel` i staffowe API (lista zamówień, ETA, status) są teraz **otwarte** — każdy z linkiem
zobaczy dane klientów. Przed udostępnieniem klientom trzeba to zabezpieczić. Opcje:
- szybkie: **Vercel → Settings → Deployment Protection** (hasło na całość na czas testów), albo
- docelowe: dodać **PIN/login dla `/panel`** (mogę dorobić — ~mała zmiana).

## 5. Domena (opcjonalnie)
- Settings → **Domains** → dodaj np. `zamow.mammarosa.pl` i ustaw rekord CNAME u operatora DNS.

## 6. Test po wdrożeniu (smoke test)
1. `/` — status (DEMO lub 🟢 gdy klucze).
2. `/menu` — menu (mock lub realne z Dotykački).
3. Złóż testowe zamówienie → trafia na `/dziekujemy/[id]`.
4. `/panel` — zamówienie widoczne; ustaw ETA → strona „dziękujemy” aktualizuje się na żywo.
5. Dostawa: „Policz z mojej lokalizacji” + adres poza Kościerzyną.

## 7. Po starcie (kolejne kroki)
- Podpiąć realne klucze Dotykački → przełączenie z DEMO na żywo (menu + rachunki w POS).
- Klucz map → dokładne odległości drogowe.
- Telefon/CTI, płatności online, apka-towarzysz (Wariant B) — wg `docs/CO_ZOSTALO_DLA_CIEBIE.md`.
