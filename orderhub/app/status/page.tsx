import Link from "next/link";
import { getHealth } from "@/lib/dotykacka/health";
import { hasGeocoder, estimateDrivingKm } from "@/lib/geo";

export const dynamic = "force-dynamic";

export default async function Home() {
  const health = await getHealth();

  // Test map na żywo: znany punkt pod Kościerzyną — jeśli zwróci km, klucz działa.
  let geo: { configured: boolean; ok: boolean; km?: number } = { configured: hasGeocoder(), ok: false };
  if (geo.configured) {
    const km = await estimateDrivingKm("Stężyca, Polska");
    geo = { configured: true, ok: km !== null, km: km ?? undefined };
  }
  const lat = process.env.RESTAURANT_LAT || "54.1226 (domyślne)";
  const lng = process.env.RESTAURANT_LNG || "17.9766 (domyślne)";

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
