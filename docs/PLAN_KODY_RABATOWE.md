# Plan: kody rabatowe (zgrane z Dotykačką)

Stan: PLAN zatwierdzany przez właściciela. Nic z tego jeszcze nie jest zbudowane.

## Co umie Dotykačka (z docs/dotypos_api_brain.md — do potwierdzenia testem po kluczach)

| Mechanizm | Jak w API | Do czego pasuje |
|---|---|---|
| Rabat % na całe zamówienie | `order/create` → `discount-percent` w korzeniu | kody typu „−10%" — POS sam przelicza, kwit i utarg się zgadzają |
| Rabat % na pozycję | `discount-percent` przy pozycji | promocje na kategorię (np. −20% na pizze) |
| Cena ręczna pozycji | `manual-price` | GRATIS (pozycja za 0 zł), zestawy, rabat kwotowy |
| Grupa rabatowa klienta | `customer._discountGroupId` | stały rabat dla stałych klientów/firm |
| Punkty | `customer.points`, `manual-points` | program lojalnościowy (przyszłość) |

Rabat KWOTOWY (np. −10 zł) nie ma pola wprost — realizacja: przeliczenie na % od
koszyka albo skorygowanie `manual-price` pozycji. Wybór po teście w R2.

## Rodzaje kodów (nasz system)

1. **Procentowy** — `PIZZA10` = −10% na koszyk (bez kosztu dostawy).
2. **Kwotowy** — `ULOTKA15` = −15 zł (przy min. wartości koszyka).
3. **Gratis** — `COLA0` = wskazany produkt za 0 zł przy zamówieniu za min. X.
4. (R3) **Stały rabat klienta** — po numerze telefonu, bez kodu (grupa rabatowa).

Parametry każdego kodu: typ, wartość, min. koszyk, zakres (dostawa/odbiór/wszystko),
ważny od–do, limit użyć łącznie, limit „raz na numer telefonu", aktywny tak/nie.

## Twarde zasady (żeby rabaty nie rozjechały rozliczeń)

- Rabat liczy się od KOSZYKA, nigdy od opłaty za dostawę.
- MINIMUM dostawy (40/60 zł) sprawdzamy od wartości koszyka PRZED rabatem
  (kod nie może „zepsuć" opłacalności kursu).
- Jeden kod na zamówienie. Kod znika z kwoty, ale zostaje na zawsze w historii
  zamówienia (kto, kiedy, ile rabatu) — pełna kontrola w zakładce „Dziś".
- Walidacja zawsze PO STRONIE SERWERA (klient nie może sobie „dopisać" rabatu).
- Kwit kuchenny i notatka w POS zawsze z dopiskiem: `KOD: PIZZA10 (−4,20 zł)`.

## Fazy budowy

### R1 — kody w naszym systemie (do zrobienia OD RAZU, działa bez kluczy Dotykački)
- `lib/promo.ts` + magazyn Redis (`promo:{KOD}` + licznik użyć + użycia per telefon).
- Zarządzanie kodami: nowa karta „Rabaty" w panelu (dodaj/wyłącz kod, podgląd użyć)
  — chronione PIN-em jak cały panel.
- Kasa klienta: pole „Mam kod rabatowy" → walidacja na żywo → linia rabatu
  w podsumowaniu → total po rabacie.
- Ekran telefoniczny: to samo pole (kody z ulotek dyktowane przez telefon).
- Zamówienie niesie `promo {code, discount}`; serwer re-waliduje i zlicza użycie.
- „Dziś": kafelek „Rabaty" (suma udzielonych rabatów) + kod przy zamówieniu.

### R2 — zgranie z POS (po podpięciu kluczy, przed go-live)
- Kod % → `discount-percent` w `order/create`; TEST: czy suma w POS = nasza suma.
- Kod kwotowy → TEST dwóch wariantów i wybór lepszego:
  (a) przeliczenie na % (uwaga na zaokrąglenia POS),
  (b) rozpisanie rabatu w `manual-price` pozycji (sumy zawsze równe, kwit mniej czytelny).
- Gratis → pozycja z `manual-price: 0` + notatka `GRATIS (kod COLA0)`.

### R3 — lojalność (opcja na przyszłość, osobna decyzja)
- Stały rabat: grupa rabatowa w Dotykačce przypięta do klienta (po telefonie).
- Punkty: `customer.points` — np. 1 punkt za 1 zł, 100 pkt = −10 zł.
- „Każda 10. pizza gratis" — licznik po numerze telefonu w naszym systemie.

## Propozycja kodów na start (do decyzji właściciela)

| Kod | Działanie | Ograniczenia |
|---|---|---|
| `WITAJ10` | −10% | tylko 1. zamówienie z danego numeru, online |
| `ULOTKA15` | −15 zł | min. 60 zł, do wyczerpania ulotek |
| `ODBIOR10` | −10% | tylko odbiór osobisty (odciąża kierowców) |

## Otwarte pytania do właściciela

1. Czy rabaty mają obowiązywać też przy zamówieniach telefonicznych? (proponuję: tak)
2. Czy kelnerka może dać rabat „ręczny" bez kodu (np. za spóźnioną dostawę)?
   (proponuję: tak, osobny przycisk w panelu z powodem — widoczny w „Dziś")
3. Jakie kody na start i z jakimi wartościami?
