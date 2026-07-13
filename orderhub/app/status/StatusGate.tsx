"use client";

import { useState } from "react";

/** Bramka /status: hasło lokalu (to samo, co do panelu), potem przeładowanie. */
export function StatusGate() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const submit = async () => {
    setError(false);
    const res = await fetch("/api/staff/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    if (res.ok) location.reload();
    else setError(true);
  };

  return (
    <main className="grid min-h-screen place-items-center bg-[#1F1714] px-6 text-[#F3E7D5]">
      <div className="w-full max-w-xs text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/icon-white.png" alt="Mammarosa" className="mx-auto mb-5 h-14 w-14 object-contain" />
        <div className="text-[14px] font-extrabold uppercase tracking-[0.16em]">Strona diagnostyczna</div>
        <p className="mt-1.5 text-[12.5px] text-[#B7A691]">Dostęp tylko dla obsługi — podaj hasło lokalu.</p>
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          type="password"
          autoFocus
          className="mt-4 w-full rounded-2xl border border-[#3A322B] bg-[#241D1A] px-4 py-4 text-center text-[20px] font-extrabold tracking-[0.4em] outline-none"
        />
        {error && <p className="mt-2 text-[13px] font-bold text-red-400">Złe hasło.</p>}
        <button onClick={submit} className="mt-4 w-full rounded-full bg-[#D5E36B] py-3.5 text-[15px] font-bold text-[#1D2A22]">
          Odblokuj
        </button>
      </div>
    </main>
  );
}
