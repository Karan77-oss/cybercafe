/**
 * High-Performance Stale-While-Revalidate (SWR) cache with Request Deduplication
 * Provides 0ms instant hydration on page reloads and prevents redundant network calls.
 */
class SwrCache {
  constructor() {
    this.memory = new Map();
    this.inFlight = new Map();
  }

  get(key) {
    if (this.memory.has(key)) {
      return this.memory.get(key);
    }
    try {
      const raw = sessionStorage.getItem(`swr:${key}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.memory.set(key, parsed);
        return parsed;
      }
    } catch { }
    return null;
  }

  set(key, data) {
    this.memory.set(key, data);
    try {
      sessionStorage.setItem(`swr:${key}`, JSON.stringify(data));
    } catch { }
    // Notify active listeners for instant optimistic updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(`swr:${key}`, { detail: data }));
    }
  }

  delete(key) {
    this.memory.delete(key);
    try {
      sessionStorage.removeItem(`swr:${key}`);
    } catch { }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(`swr:${key}`, { detail: null }));
    }
  }

  clear() {
    this.memory.clear();
    try {
      const keys = Object.keys(sessionStorage);
      keys.forEach(k => {
        if (k.startsWith('swr:')) sessionStorage.removeItem(k);
      });
    } catch { }
  }

  /**
   * Deduplicates in-flight promises so multiple components mounting simultaneously
   * fire only ONE network request.
   */
  async dedupe(key, fetcher) {
    if (this.inFlight.has(key)) {
      return this.inFlight.get(key);
    }
    const promise = (async () => {
      try {
        const result = await fetcher();
        this.set(key, result);
        return result;
      } finally {
        this.inFlight.delete(key);
      }
    })();
    this.inFlight.set(key, promise);
    return promise;
  }
}

export const swrCache = new SwrCache();

/**
 * Reusable hook for SWR data fetching with 0ms local hydration & background revalidation
 */
import { useState, useEffect, useCallback, useRef } from 'react';

export function useCachedQuery(key, fetcher, options = {}) {
  const { ttl = 60000, initialData = null, enabled = true } = options;
  const cached = swrCache.get(key);

  const [data, setData] = useState(() => (cached !== null ? cached : initialData));
  const [loading, setLoading] = useState(() => (cached === null && enabled));
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  const revalidate = useCallback(async (force = false) => {
    if (!enabled) return;
    try {
      const fresh = await swrCache.dedupe(key, fetcher);
      if (mountedRef.current) {
        setData(fresh);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [key, fetcher, enabled]);

  useEffect(() => {
    mountedRef.current = true;

    // Listen for local mutations (optimistic UI)
    const handleMutation = (e) => {
      if (mountedRef.current && e.detail !== undefined) {
        setData(e.detail);
      }
    };
    window.addEventListener(`swr:${key}`, handleMutation);

    // Initial background revalidation
    revalidate();

    return () => {
      mountedRef.current = false;
      window.removeEventListener(`swr:${key}`, handleMutation);
    };
  }, [key, revalidate]);

  const mutate = useCallback((updater) => {
    const nextData = typeof updater === 'function' ? updater(data) : updater;
    swrCache.set(key, nextData);
    setData(nextData);
  }, [key, data]);

  return { data, loading, error, revalidate, mutate };
}
