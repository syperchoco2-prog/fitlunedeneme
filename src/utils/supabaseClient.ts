import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

/**
 * Retry destekli fetch: ağ hatası veya 5xx durumunda tekrar dener.
 * Her denemede timeout uygular; böylece istekler UI'ı sonsuza kadar bekletmez.
 */
async function resilientFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const MAX_RETRIES = 3;
  const REQUEST_TIMEOUT_MS = 4_500;
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const relayAbort = () => controller.abort();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    init?.signal?.addEventListener('abort', relayAbort, { once: true });

    try {
      const res = await fetch(input, {
        ...init,
        keepalive: true,
        signal: controller.signal,
      });

      if (res.status >= 500 && attempt < MAX_RETRIES - 1) {
        await new Promise((resolve) => setTimeout(resolve, 400 * 2 ** attempt));
        continue;
      }

      return res;
    } catch (err) {
      lastError = err;

      if (init?.signal?.aborted) {
        throw err;
      }

      if (attempt < MAX_RETRIES - 1) {
        await new Promise((resolve) => setTimeout(resolve, 400 * 2 ** attempt));
      }
    } finally {
      clearTimeout(timeoutId);
      init?.signal?.removeEventListener('abort', relayAbort);
    }
  }

  throw lastError;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
  global: {
    fetch: resilientFetch,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
