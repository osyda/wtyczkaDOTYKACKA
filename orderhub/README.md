# Mamma Rosa — OrderHub

Nowy system zamówień (Next.js + Vercel) spinający sklep online z POS **Dotykačka**.
Zastępuje docelowo: Orderable + wtyczkę dostawy + „śmieszną apkę" + drugi tablet.

> Pełny plan: `../docs/PLAN_NOWY_PROJEKT.md` · wiedza o API: `../docs/dotypos_api_brain.md`
> Makiety: `../mockups/`

## Faza 0 — co już jest (szkielet)

- **Warstwa integracji z Dotykačką** (`lib/dotykacka/`):
  - `auth.ts` — wymiana refresh tokenu na access token (cache ~55 min, odświeżanie na 401).
  - `client.ts` — klient HTTP (Bearer, retry, paginacja `limit=100`).
  - `menu.ts` — pobranie produktów + kategorii i normalizacja pod UI.
  - `health.ts` — diagnostyka połączenia (pobiera listę branchy).
  - **Tryb MOCK** — bez kluczy aplikacja pokazuje przykładowe menu.
- **Strona startowa** (`/`) — status połączenia z POS.
- **Menu klienta** (`/menu`) — produkty zaciągnięte z Dotykački.
- **API**: `GET /api/dotykacka/health`, `GET /api/dotykacka/menu`.

## Uruchomienie lokalne

```bash
npm install
cp .env.example .env.local   # uzupełnij dane Dotykački (albo zostaw puste = tryb DEMO)
npm run dev
# http://localhost:3000
```

## Konfiguracja Dotykački

Ustaw zmienne z `.env.example` (lokalnie w `.env.local`, na produkcji w panelu Vercel).
`DOTYKACKA_REFRESH_TOKEN` uzyskuje sie jednorazowo przez **Connector v2** — dodamy do tego
ekran w panelu w kolejnej fazie. Sekrety **nigdy** nie trafiaja do repo.

## Nastepne fazy

1. Menu + koszyk + dostawa/odbior + ASAP/godzina.
2. Checkout -> `pos-actions order/create` (na wynos per pozycja, dodatki, klient jako encja).
3. Panel kelnerki + ETA (wariant: powiadomienie/popup nad Dotykacka + apka-towarzysz).
4. Telefon / CTI.
5. Platnosci online + ew. auto-fiskalizacja.
