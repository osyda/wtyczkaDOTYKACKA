import Link from "next/link";
import { cookies } from "next/headers";
import { staffProtectionEnabled, staffToken } from "@/lib/staffAuth";
import { StatusGate } from "./StatusGate";
import { getHealth } from "@/lib/dotykacka/health";
import { hasGeocoder, estimateDrivingKm } from "@/lib/geo";
import { getOpenState, hasGoogleHours, dayLabel, LAST_ORDER_MIN } from "@/lib/hours";
import { listCalls, webhookKey } from "@/lib/ctiCalls";
import { emailEnabled } from "@/lib/email";
import { employeesDiagnostics } from "@/lib/dotykacka/employees";
import { customersProbe, lastCustomerDebug } from "@/lib/dotykacka/customers";
import { hasCredentials } from "@/lib/dotykacka/config";

export const dynamic = "force-dynamic";

// Strona diagnostyczna obsługi — poza indeksem Google.
export const metadata = {
  title: "Status systemu",
  robots: { index: false, follow: false },
};

export default async function Home() {
  // Strona diagnostyczna tylko dla obsługi — za hasłem lokalu (jak panel).
  if (staffProtectionEnabled()) {
    const token = await staffToken();
    const c = await cookies();
    if (!token || c.get("staff_auth")?.value !== token) {
      return <StatusGate />;
    }
  }

  const health = await getHealth();

  // Test map na żywo: znany punkt pod Kościerzyną — jeśli zwróci km, klucz działa.
  let geo: { configured: boolean; ok: boolean; km?: number } = { configured: hasGeocoder(), ok: false };
  if (geo.configured) {
    const km = await estimateDrivingKm("Stężyca, Polska");
    geo = { configured: true, ok: km !== null, km: km ?? undefined };
  }
  const lat = process.env.RESTAURANT_LAT || "54.1226 (domyślne)";
  const lng = process.env.RESTAURANT_LNG || "17.9766 (domyślne)";

  const hours = await getOpenState();
  const hoursSourceLabel =
    hours.source === "google"
      ? "z wizytówki Google (odświeżane co 6 h)"
      : hours.source === "env"
        ? "ze zmiennej OPENING_HOURS"
        : hasGoogleHours()
          ? "DOMYŚLNE — klucz Google jest, ale wizytówka nie odpowiedziała"
          : "DOMYŚLNE — ustaw GOOGLE_MAPS_API_KEY lub OPENING_HOURS";

  const ctiKeySet = Boolean(webhookKey());
  const lastCall = (await listCalls(1))[0] ?? null;
  const emp = await employeesDiagnostics();

  // Klienci w Dotykačce: test odczytu + przebieg ostatniej próby zapisu.
  const custProbe = hasCredentials() ? await customersProbe().catch(() => null) : null;
  const custLast = await lastCustomerDebug();

  return (
    <main className="min-h-screen bg-[#1F1714] text-[#F3E7D5]">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="mb-2 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/icon-white.png" alt="Mammarosa" className="h-12 w-12 object-contain" />
          <div>
            <h1 className="text-2xl font-bold">Mammarosa — OrderHub</h1>
            <p className="text-sm text-[#B7A691]">Nowy system zamówień · Faza 0 (szkielet)</p>
          </div>
        </div>

        {/* Godziny otwarcia */}
        <div className="mt-4 rounded-2xl border border-[#3A322B] bg-[#241D1A] p-5">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#B7A691]">
            Godziny otwarcia i przyjmowanie zamówień
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex h-3 w-3 rounded-full ${
                hours.acceptingOrders ? "bg-green-500" : hours.source === "default" ? "bg-amber-400" : "bg-red-500"
              }`}
            />
            <span className="font-semibold">
              {hours.acceptingOrders
                ? `Przyjmujemy zamówienia (dziś do ${hours.lastOrder})`
                : hours.message}
            </span>
          </div>
          <p className="mt-2 text-sm text-[#B7A691]">
            Źródło godzin: {hoursSourceLabel}. Ostatnie zamówienie {LAST_ORDER_MIN} min przed zamknięciem.
          </p>
          <p className="mt-2 text-sm text-[#E0D2BE]">
            {Array.from({ length: 7 }, (_, d) => dayLabel(hours.week, d)).join(" · ")}
          </p>
        </div>

        {/* Mapy i dostawa */}
        <div className="mt-4 rounded-2xl border border-[#3A322B] bg-[#241D1A] p-5">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#B7A691]">
            Mapy i automatyczna dostawa (OpenRouteService)
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex h-3 w-3 rounded-full ${
                !geo.configured ? "bg-amber-400" : geo.ok ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="font-semibold">
              {!geo.configured
                ? "Brak klucza ORS_API_KEY — działa tryb: zapamiętane miejscowości + odległość ręczna"
                : geo.ok
                  ? `Klucz działa — testowa trasa do Stężycy: ${geo.km?.toFixed(1)} km`
                  : "Klucz ustawiony, ale zapytanie nie przeszło — sprawdź wartość klucza / limit dzienny"}
            </span>
          </div>
          <p className="mt-2 text-sm text-[#B7A691]">
            Współrzędne lokalu: {lat}, {lng} — ustaw dokładne w RESTAURANT_LAT / RESTAURANT_LNG.
          </p>
        </div>

        {/* Logowanie pracowników kodami z POS */}
        <div className="mt-4 rounded-2xl border border-[#3A322B] bg-[#241D1A] p-5">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#B7A691]">
            Logowanie obsługi kodami z Dotykački
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex h-3 w-3 rounded-full ${
                !emp.available ? "bg-amber-400" : emp.withCode > 0 ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="font-semibold">
              {!emp.available
                ? emp.error
                  ? `Błąd pobierania pracowników: ${emp.error}`
                  : "Brak kluczy Dotykački — działa tylko wspólny STAFF_PIN"
                : emp.withCode > 0
                  ? `Działa: ${emp.count} pracowników, ${emp.withCode} z kodem (pola: ${emp.codeFields.join(", ")})`
                  : `API zwraca ${emp.count} pracowników, ale BEZ kodów — logowanie kodami nie zadziała, zostaje wspólny STAFF_PIN`}
            </span>
          </div>
          <p className="mt-2 text-sm text-[#B7A691]">
            Test praktyczny: wejdź na /panel z innej przeglądarki i zaloguj się kodem pracownika z POS.
          </p>
          {emp.available && emp.withCode === 0 && emp.allFields.length > 0 && (
            <p className="mt-2 break-words text-xs text-[#8A7A6B]">
              Pola zwracane przez API: {emp.allFields.join(", ")}
            </p>
          )}
        </div>

        {/* Klienci w Dotykačce */}
        <div className="mt-4 rounded-2xl border border-[#3A322B] bg-[#241D1A] p-5">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#B7A691]">
            Klienci w Dotykačce (tworzenie przy zamówieniu)
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex h-3 w-3 rounded-full ${
                !custProbe ? "bg-amber-400" : custProbe.ok ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="font-semibold">
              {!custProbe
                ? "Brak kluczy Dotykački — klienci nie są tworzeni (tryb DEMO)"
                : custProbe.ok
                  ? `Odczyt klientów działa (HTTP ${custProbe.status}${custProbe.total !== null ? `, w bazie: ${custProbe.total}` : ""})`
                  : `Odczyt klientów NIE działa: HTTP ${custProbe.status} ${custProbe.raw}`}
            </span>
          </div>
          {custLast ? (
            <div className="mt-2 text-sm">
              <p className="text-[#B7A691]">
                Ostatnia próba: {new Date(custLast.at).toLocaleString("pl-PL")} · tel. {custLast.phone} ·{" "}
                {custLast.customerId ? `OK, id ${custLast.customerId}` : "NIEUDANA"}
              </p>
              <ul className="mt-1 space-y-1 break-words text-xs text-[#E0D2BE]">
                {custLast.steps.map((s, i) => (
                  <li key={i}>• {s}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-2 text-sm text-[#B7A691]">
              Nie było jeszcze żadnej próby (pojawi się po pierwszym zamówieniu wysłanym do POS).
            </p>
          )}
        </div>

        {/* Maile do klientów */}
        <div className="mt-4 rounded-2xl border border-[#3A322B] bg-[#241D1A] p-5">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#B7A691]">
            Maile do klientów (Resend)
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex h-3 w-3 rounded-full ${emailEnabled() ? "bg-green-500" : "bg-amber-400"}`} />
            <span className="font-semibold">
              {emailEnabled()
                ? "Klucz ustawiony — potwierdzenia zamówień wychodzą do klientów"
                : "Brak RESEND_API_KEY — potwierdzenia symulowane (nie wychodzą)"}
            </span>
          </div>
          <p className="mt-2 text-sm text-[#B7A691]">
            Mail idzie tylko, gdy klient poda adres w kasie (pole opcjonalne). Nadawca: EMAIL_FROM.
          </p>
        </div>

        {/* Centralka telefoniczna */}
        <div className="mt-4 rounded-2xl border border-[#3A322B] bg-[#241D1A] p-5">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#B7A691]">
            Centralka telefoniczna (CTI)
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex h-3 w-3 rounded-full ${ctiKeySet ? "bg-green-500" : "bg-amber-400"}`} />
            <span className="font-semibold">
              {ctiKeySet
                ? "Webhook zabezpieczony kluczem — gotowy na centralkę"
                : "Brak CTI_WEBHOOK_KEY — webhook otwarty (tylko na czas testów!)"}
            </span>
          </div>
          <p className="mt-2 text-sm text-[#B7A691]">
            Adres dla centralki: <code>/api/cti/call?key=KLUCZ&amp;phone=NUMER</code> (GET lub POST).
            Instrukcja podłączenia: <code>docs/CENTRALKA_TELEFON.md</code>.
          </p>
          <p className="mt-2 text-sm text-[#E0D2BE]">
            {lastCall
              ? `Ostatnie zgłoszone połączenie: ${lastCall.phone} · ${new Date(lastCall.at).toLocaleString("pl-PL")}`
              : "Nie zgłoszono jeszcze żadnego połączenia."}
          </p>
        </div>

        {/* Status połączenia */}
        <div className="mt-8 rounded-2xl border border-[#3A322B] bg-[#241D1A] p-5">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#B7A691]">
            Status integracji z Dotykačką
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex h-3 w-3 rounded-full ${
                health.mode === "mock"
                  ? "bg-amber-400"
                  : health.ok
                    ? "bg-green-500"
                    : "bg-red-500"
              }`}
            />
            <span className="font-semibold">
              {health.mode === "mock"
                ? "Tryb DEMO (mock)"
                : health.ok
                  ? "Połączono z POS"
                  : "Błąd połączenia"}
            </span>
          </div>
          <p className="mt-2 text-sm text-[#B7A691]">{health.message}</p>
          {health.branches && health.branches.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-[#E0D2BE]">
              {health.branches.map((b) => (
                <li key={b.id}>
                  • {b.name} <span className="text-[#8A7A6B]">(id {b.id})</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Linki */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link
            href="/menu"
            className="rounded-2xl border border-[#3A322B] bg-[#241D1A] p-5 transition hover:border-[#B7382F]"
          >
            <div className="text-lg font-bold">🛒 Menu (klient)</div>
            <p className="mt-1 text-sm text-[#B7A691]">
              Podgląd menu zaciągniętego z Dotykački.
            </p>
          </Link>
          <Link
            href="/panel"
            className="rounded-2xl border border-[#3A322B] bg-[#241D1A] p-5 transition hover:border-[#B7382F]"
          >
            <div className="text-lg font-bold">🖥 Panel kelnerki</div>
            <p className="mt-1 text-sm text-[#B7A691]">
              Monitor zamówień + ustawianie ETA + CTI (PWA).
            </p>
          </Link>
        </div>

        <div className="mt-3">
          <a
            href="/api/dotykacka/health"
            className="block rounded-2xl border border-[#3A322B] bg-[#241D1A] p-4 text-sm transition hover:border-[#B7382F]"
          >
            🩺 <code>/api/dotykacka/health</code> — surowy JSON diagnostyki połączenia
          </a>
        </div>

        <p className="mt-10 text-center text-xs text-[#8A7A6B]">
          Konfiguracja kluczy: skopiuj <code>.env.example</code> → <code>.env.local</code> i uzupełnij
          dane z Dotykački. Bez kluczy działa tryb DEMO.
        </p>
      </div>
    </main>
  );
}
