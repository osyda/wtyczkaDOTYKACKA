# Plan: konto klienta i historia zamówień

Zasada przewodnia: **ZERO HASEŁ**. Nikt nie zakłada konta z hasłem w pizzerii —
konto ma się robić „samo" i tylko przyspieszać kolejne zamówienie.

## K1 — pamięć urządzenia (bez logowania, działa od razu) — ZBUDOWANE 12.07.2026

- Po pierwszym zamówieniu zapamiętujemy na TYM urządzeniu (localStorage):
  dane klienta (imię, telefon, e-mail, adres) + listę ostatnich zamówień (max 20).
- Kasa przy kolejnym zamówieniu **wypełnia się sama** — klient tylko klika „Zamawiam".
- Nowa strona **/moje** („Twoje zamówienia"): lista z datą, statusem na żywo,
  pozycjami i kwotą + przycisk **„Zamów ponownie"** (wrzuca te same pozycje,
  także pół na pół, do koszyka → kasa). Ceny bierzemy bieżące z pozycji
  zapisanych w zamówieniu — klient widzi je w koszyku przed potwierdzeniem.
- Wejście: dyskretny link „TWOJE ZAMÓWIENIA" pod nagłówkiem menu (pokazuje się
  tylko, gdy urządzenie ma historię).
- Ograniczenie (świadome): historia żyje na urządzeniu — nowy telefon = pusta
  lista. To rozwiązuje 90% potrzeby przy zerowej barierze.

## K2 — konto przez e-mail, bez hasła (po włączeniu maili / kluczu Resend)

- Na /moje sekcja „Masz nowy telefon?": podaj e-mail → wysyłamy **link logujący**
  (token jednorazowy, ważny 15 min, Redis) → kliknięcie = zalogowanie
  (cookie 90 dni, jak PIN panelu).
- Po zalogowaniu historia z SERWERA: zamówienia dopasowane po znormalizowanym
  numerze telefonu i/lub e-mailu klienta (dane już zbieramy przy zamówieniu).
- Bonusy: edycja danych, „mój stały adres", wgląd w status bieżącego zamówienia.
- RODO: strona /moje dostaje przycisk „usuń moje dane" (kasuje konto+powiązania;
  same zamówienia zostają w systemie sprzedażowym jako dokumenty).

## K3 — lojalność (po podpięciu Dotykački; spójne z planem rabatów R3)

- Powiązanie konta z klientem w Dotykačce (już upsertujemy klienta po telefonie
  przy wysyłce do POS) → wspólne punkty online/lokal.
- „Każda 10. pizza gratis" / punkty za złotówki — licznik po numerze telefonu,
  pasek postępu na /moje („jeszcze 2 pizze do darmowej!").
- Kody rabatowe „tylko dla zalogowanych" (pole w istniejącym systemie kodów).

## Kolejność wdrożenia

1. **K1 — zrobione teraz** (zero konfiguracji, czysty zysk UX).
2. K2 — po dodaniu klucza Resend (ten sam, co do potwierdzeń mailowych).
3. K3 — po kluczach Dotykački i decyzji o programie lojalnościowym.
