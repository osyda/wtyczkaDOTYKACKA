"use client";

/**
 * Dwuwarstwowa bramka stron obsługi:
 *  1. hasło urządzenia (STAFF_PIN, ciasteczko 90 dni),
 *  2. osobisty kod personelu (STAFF_CODES) — tylko gdy askName i kody skonfigurowane.
 * Dzieci renderują się dopiero po przejściu obu warstw.
 */

import { useEffect, useState, type ReactNode } from "react";

const BG = "#F7F3EB";
const CARD = "#FFFEFA";
const INK = "#1B1710";
const MUTED = "#7A7060";
const LIME = "#D5E36B";
const ALERT = "#B7382F";

/** Zmiana osoby: czyści podpis i wraca do ekranu kodu. */
export function clearStaffName() {
  localStorage.removeItem("mr_staff");
  location.reload();
}

export function StaffGate({ children, askName = false }: { children: ReactNode; askName?: boolean }) {
  const [phase, setPhase] = useState<"loading" | "device" | "name" | "ok">("loading");
  const [codesOn, setCodesOn] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const decideAfterDevice = (codes: boolean) => {
    if (askName && codes && !localStorage.getItem("mr_staff")) setPhase("name");
    else setPhase("ok");
  };

  useEffect(() => {
    fetch("/api/staff/check")
      .then((r) => r.json())
      .then((d) => {
        setCodesOn(Boolean(d.codes));
        if (d.required && !d.authed) setPhase("device");
        else decideAfterDevice(Boolean(d.codes));
      })
      .catch(() => setPhase("ok")); // awaria sprawdzenia nie może zablokować pracy
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async () => {
    setError(null);
    if (phase === "device") {
      const res = await fetch("/api/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: value }),
      });
      if (res.ok) {
        setValue("");
        decideAfterDevice(codesOn);
      } else {
        setError("Złe hasło.");
      }
      return;
    }
    if (phase === "name") {
      const res = await fetch("/api/staff/code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: value }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.name) {
        localStorage.setItem("mr_staff", d.name);
        setValue("");
        setPhase("ok");
      } else {
        setError("Nieznany kod.");
      }
    }
  };

  if (phase === "ok") return <>{children}</>;

  if (phase === "loading") {
    return (
      <main className="grid min-h-screen place-items-center text-sm font-semibold" style={{ background: BG, color: MUTED }}>
        Ładowanie…
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center px-6" style={{ background: BG, color: INK }}>
      <div className="w-full max-w-xs text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/icon-espresso.png" alt="Mammarosa" className="mx-auto mb-5 h-14 w-14 object-contain" />
        <div className="text-[14px] font-extrabold uppercase tracking-[0.16em]">
          {phase === "device" ? "Hasło lokalu" : "Twój kod"}
        </div>
        <p className="mt-1.5 text-[12.5px]" style={{ color: MUTED }}>
          {phase === "device"
            ? "Wpisywane raz na urządzenie (pamiętane 90 dni)."
            : "Wpisz swój osobisty kod — zamówienia będą podpisane Twoim imieniem."}
        </p>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          type="password"
          inputMode={phase === "name" ? "numeric" : undefined}
          autoFocus
          className="mt-4 w-full rounded-2xl px-4 py-4 text-center text-[22px] font-extrabold tracking-[0.4em] outline-none"
          style={{ background: CARD, border: "1px solid rgba(27,23,16,0.13)" }}
        />
        {error && <p className="mt-2 text-[13px] font-bold" style={{ color: ALERT }}>{error}</p>}
        <button
          onClick={submit}
          disabled={!value.trim()}
          className="mt-4 w-full rounded-full py-3.5 text-[15px] font-bold disabled:opacity-40"
          style={{ background: LIME, color: "#1D2A22" }}
        >
          {phase === "device" ? "Odblokuj" : "Zaczynam pracę"}
        </button>
      </div>
    </main>
  );
}
