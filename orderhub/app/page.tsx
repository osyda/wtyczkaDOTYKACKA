import Link from "next/link";
import { getHealth } from "@/lib/dotykacka/health";

export const dynamic = "force-dynamic";

export default async function Home() {
  const health = await getHealth();

  return (
    <main className="min-h-screen bg-[#0f1115] text-[#e7e9ee]">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="mb-2 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#e23b3b] to-[#a01919] text-2xl">
            🍕
          </div>
          <div>
            <h1 className="text-2xl font-bold">Mamma Rosa — OrderHub</h1>
            <p className="text-sm text-[#8b93a4]">Nowy system zamówień · Faza 0 (szkielet)</p>
          </div>
        </div>

        {/* Status połączenia */}
        <div className="mt-8 rounded-2xl border border-[#262d3a] bg-[#161a22] p-5">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#9aa3b4]">
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
          <p className="mt-2 text-sm text-[#9aa3b4]">{health.message}</p>
          {health.branches && health.branches.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-[#c6cdd9]">
              {health.branches.map((b) => (
                <li key={b.id}>
                  • {b.name} <span className="text-[#5a6678]">(id {b.id})</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Linki */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link
            href="/menu"
            className="rounded-2xl border border-[#262d3a] bg-[#161a22] p-5 transition hover:border-[#e23b3b]"
          >
            <div className="text-lg font-bold">🛒 Menu (klient)</div>
            <p className="mt-1 text-sm text-[#9aa3b4]">
              Podgląd menu zaciągniętego z Dotykački.
            </p>
          </Link>
          <Link
            href="/panel"
            className="rounded-2xl border border-[#262d3a] bg-[#161a22] p-5 transition hover:border-[#e23b3b]"
          >
            <div className="text-lg font-bold">🖥 Panel kelnerki</div>
            <p className="mt-1 text-sm text-[#9aa3b4]">
              Monitor zamówień + ustawianie ETA + CTI (PWA).
            </p>
          </Link>
        </div>

        <div className="mt-3">
          <a
            href="/api/dotykacka/health"
            className="block rounded-2xl border border-[#262d3a] bg-[#161a22] p-4 text-sm transition hover:border-[#e23b3b]"
          >
            🩺 <code>/api/dotykacka/health</code> — surowy JSON diagnostyki połączenia
          </a>
        </div>

        <p className="mt-10 text-center text-xs text-[#5a6678]">
          Konfiguracja kluczy: skopiuj <code>.env.example</code> → <code>.env.local</code> i uzupełnij
          dane z Dotykački. Bez kluczy działa tryb DEMO.
        </p>
      </div>
    </main>
  );
}
