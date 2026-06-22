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

== Bezpieczeństwo ==
- Ogranicz dostęp do panelu admin WordPress.
- Trzymaj client_secret i refresh_token prywatnie.
