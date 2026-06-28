import Link from "next/link";
import { getHealth } from "@/lib/dotykacka/health";

export const dynamic = "force-dynamic";

export default async function Home() {
  const health = await getHealth();

  return (
    <main className="min-h-screen bg-[#1F1714] text-[#F3E7D5]">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="mb-2 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/icon-white.png" alt="Mamma Rosa" className="h-12 w-12 object-contain" />
          <div>
            <h1 className="text-2xl font-bold">Mamma Rosa — OrderHub</h1>
            <p className="text-sm text-[#B7A691]">Nowy system zamówień · Faza 0 (szkielet)</p>
          </div>
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
