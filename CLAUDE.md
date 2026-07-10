# Mammarosa OrderHub

**ZANIM COKOLWIEK ZROBISZ: przeczytaj `docs/STAN_PROJEKTU.md`** — pełne przekazanie projektu
(kontekst właściciela, żelazne zasady, architektura, stan prac, plan).

Najważniejsze w skrócie:
- Komunikacja z właścicielem PO POLSKU. Marka: „Mammarosa" (jedno słowo).
- NIE modyfikuj starych plików wtyczki WordPress (`dotypos-*.php`).
- Aplikacja = `orderhub/` (Next.js 16). Design klienta = CARTA (lib/carta.ts). Zero emoji w UI.
- Deploy: rozwój na gałęzi `claude/restaurant-ordering-system-u0p17c` → merge do `main`
  (Vercel buduje main, Root Directory `orderhub`).
- Sekrety wyłącznie w Vercel env. Wysyłka do POS za bezpiecznikiem `DOTYKACKA_SEND_ORDERS`.
- Przy pracy z API Dotykački czytaj `docs/dotypos_api_brain.md`.
