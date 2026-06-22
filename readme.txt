=== Dotypos ↔ WooCommerce Connector ===
Contributors: custom
Requires at least: 6.0
Tested up to: 6.5
Requires PHP: 8.0
Stable tag: 0.1.0

Integracja WooCommerce z Dotypos API v2: Connector v2, tokeny, wysyłka zamówień do POS, diagnostyka i logi.

== Instalacja ==
1. Wgraj ZIP jako wtyczkę w WordPress.
2. W menu "Dotypos ↔ Woo" uzupełnij client_id, client_secret, branchId.
3. Kliknij "Połącz / Odśwież token" i zaloguj się w Dotypos.
4. Kliknij "Test połączenia".

== Użycie ==
- W edycji produktu ustaw "Dotypos productId".
- Zamówienia Woo będą wysyłane do POS po checkout (domyślnie).

== Raport SMS – AMBASADA (osobna chmura) ==
- W "Ustawienia" → sekcja "Raport SMS – AMBASADA" wpisz: cloudId (305272757), client_id i client_secret AMBASADY (z maila od Dotypos), Branch ID, numer odbiorcy i nadawcę. Zapisz.
- Kliknij przycisk "Połącz AMBASADA" (zakładka Ustawienia), zaloguj się w Dotypos i WYBIERZ chmurę AMBASADA — refresh token zapisze się automatycznie w osobnym polu i NIE naruszy połączenia MAMMAROSY.
- Wysyłka idzie przez to samo konto SMSAPI.pl (Kanał 1), tylko na inny numer; godziny ustawiasz osobno.
- Ten tor służy WYŁĄCZNIE do raportu SMS — nie pobiera produktów AMBASADY do WooCommerce i nie rusza zamówień online.

== Bezpieczeństwo ==
- Ogranicz dostęp do panelu admin WordPress.
- Trzymaj client_secret i refresh_token prywatnie.
