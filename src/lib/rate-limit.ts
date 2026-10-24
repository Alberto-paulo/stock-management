// Limitador de tentativas de login.
//
// IMPORTANTE: guarda os contadores em memória. Em ambientes serverless (Vercel) cada
// instância tem a sua própria memória, por isso este limite é uma primeira barreira e
// não substitui uma regra de rate limit no Firewall da Vercel ou um limitador
// partilhado (por exemplo, Upstash Redis).

type Entry = { count: number; resetAt: number; lockedUntil: number };

const store = new Map<string, Entry>();

const WINDOW_MS = 15 * 60 * 1000; // janela de 15 minutos
const LOCK_MS = 15 * 60 * 1000; // bloqueio de 15 minutos
const MAX_ENTRIES = 10_000;

export const LIMITS = {
  perEmail: 5,
  perIp: 20,
} as const;

function cleanup(now: number) {
  if (store.size < MAX_ENTRIES) return;
  for (const [key, entry] of store) {
    if (entry.resetAt <= now && entry.lockedUntil <= now) store.delete(key);
  }
  // Se ainda estiver cheio, descarta as entradas mais antigas.
  if (store.size >= MAX_ENTRIES) {
    const excess = store.size - MAX_ENTRIES + 1;
    let removed = 0;
    for (const key of store.keys()) {
      store.delete(key);
      if (++removed >= excess) break;
    }
  }
}

/** Devolve true se a chave está bloqueada neste momento. */
export function isBlocked(key: string): boolean {
  const entry = store.get(key);
  if (!entry) return false;
  return entry.lockedUntil > Date.now();
}

/** Regista uma tentativa falhada e bloqueia a chave ao atingir o limite. */
export function registerFailure(key: string, max: number): void {
  const now = Date.now();
  cleanup(now);

  const entry = store.get(key);
  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS, lockedUntil: 0 });
    return;
  }

  entry.count += 1;
  if (entry.count >= max) {
    entry.lockedUntil = now + LOCK_MS;
  }
}

/** Limpa o contador de uma chave (depois de um login bem-sucedido). */
export function clearFailures(key: string): void {
  store.delete(key);
}

/** Obtém o IP do cliente a partir dos cabeçalhos do proxy. */
export function getClientIp(
  headers: Record<string, string | string[] | undefined> | undefined
): string {
  if (!headers) return "unknown";
  const forwarded = headers["x-forwarded-for"];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (value) return value.split(",")[0].trim();
  const real = headers["x-real-ip"];
  const realValue = Array.isArray(real) ? real[0] : real;
  return realValue?.trim() || "unknown";
}
