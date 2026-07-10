/**
 * Diagnostyka połączenia z Dotykačką (Faza 0).
 * Próbuje pobrać listę branchy — najprostszy dowód, że auth + dostęp działają.
 */

import { dotykackaConfig, hasCredentials } from "./config";
import { dotyGetAll } from "./client";
import type { DotyBranch } from "./types";

export interface HealthReport {
  mode: "live" | "mock";
  ok: boolean;
  message: string;
  branches?: { id: string; name: string }[];
  cloudId?: string;
}

export async function getHealth(): Promise<HealthReport> {
  if (!hasCredentials()) {
    return {
      mode: "mock",
      ok: true,
      message:
        "Tryb MOCK — brak kluczy Dotykački. Ustaw zmienne środowiskowe (.env.local / Vercel), aby połączyć z prawdziwym POS.",
    };
  }

  try {
    const branches = await dotyGetAll<DotyBranch>(`/clouds/${dotykackaConfig.cloudId}/branches`);
    return {
      mode: "live",
      ok: true,
      message: `Połączono z Dotykačką. Znaleziono ${branches.length} branch(y).`,
      cloudId: dotykackaConfig.cloudId,
      branches: branches.map((b) => ({ id: String(b.id), name: b.name })),
    };
  } catch (e) {
    return {
      mode: "live",
      ok: false,
      message: e instanceof Error ? e.message : "Nieznany błąd połączenia z Dotykačką.",
      cloudId: dotykackaConfig.cloudId,
    };
  }
}
