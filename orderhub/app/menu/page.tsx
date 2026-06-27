import { getMenu } from "@/lib/dotykacka/menu";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const menu = await getMenu();
  const isLive = menu.source === "live";

  return (
    <main className="min-h-screen bg-[#fff8f0] text-[#2a211c]">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#b21f1f] to-[#7d1414] text-white px-6 py-7">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-2xl">
                🍕
              </div>
              <div>
                <h1 className="text-xl font-bold leading-tight">Mamma Rosa</h1>
                <p className="text-xs opacity-85">Kościerzyna · Pizza &amp; Pasta</p>
              </div>
            </div>
            <span
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                isLive ? "bg-green-500/90 text-white" : "bg-amber-400 text-amber-950"
              }`}
            >
              {isLive ? "🟢 Dane na żywo z Dotykački" : "🟡 Tryb DEMO (mock)"}
            </span>
          </div>
          <p className="mt-3 text-xs opacity-80">
            {menu.productCount} produktów · {menu.categories.length} kategorii
            {menu.branch ? ` · branch ${menu.branch}` : ""}
          </p>
        </div>
      </div>

      {/* Menu */}
      <div className="mx-auto max-w-3xl px-5 py-6">
        {menu.categories.map((cat) => (
          <section key={cat.id} className="mb-8">
            <h2 className="mb-3 text-lg font-extrabold text-[#7d1414]">{cat.name}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {cat.products.map((p) => (
                <div
                  key={p.id}
                  className="flex gap-3 rounded-2xl border border-[#f0e3d6] bg-white p-3"
                >
                  <div
                    className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl text-2xl"
                    style={{ background: p.color ? `${p.color}22` : "#fbeede" }}
                  >
                    🍕
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">{p.name}</h3>
                    {p.description && (
                      <p className="text-xs leading-snug text-[#9a8a7c]">{p.description}</p>
                    )}
                    <div className="mt-2 font-extrabold">
                      {p.price.toFixed(2).replace(".", ",")} zł
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <footer className="px-5 pb-10 text-center text-xs text-[#b0a294]">
        Faza 0 · menu zaciągane z {isLive ? "API Dotykački" : "danych demonstracyjnych"} ·
        pobrano: {menu.fetchedAt}
      </footer>
    </main>
  );
}
