import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, hasSupabase, SERVICES_TABLE } from '../lib/supabase';
import { servicesApi } from '../api/client';
import { swrCache } from '../utils/swrCache';

/**
 * Loads the service catalog for the mobile app with SWR 0ms instant hydration.
 */
export default function useServices() {
  const cached = swrCache.get('services_catalog');
  const [services, setServices] = useState(() => (Array.isArray(cached) ? cached : []));
  const [loading, setLoading] = useState(() => (cached === null));
  const [error, setError] = useState(null);
  const [isEmpty, setIsEmpty] = useState(() => (Array.isArray(cached) && cached.length === 0));

  // Guard against stale async responses after re-fetches.
  const requestSeq = useRef(0);

  const fetchServices = useCallback(async (silent = false) => {
    const seq = ++requestSeq.current;
    if (!silent && !swrCache.get('services_catalog')) {
      setLoading(true);
    }
    setError(null);

    try {
      const list = await swrCache.dedupe('services_catalog', async () => {
        if (hasSupabase()) {
          const { data, error: dbError } = await supabase
            .from(SERVICES_TABLE)
            .select('*')
            .eq('status', 'ACTIVE')
            .eq('approvalStatus', 'APPROVED');

          if (!dbError && Array.isArray(data) && data.length > 0) {
            return data;
          }
        }
        // Fallback to REST endpoint
        const data = await servicesApi.getServices();
        if (data && Array.isArray(data.services)) {
          return data.services;
        } else if (Array.isArray(data)) {
          return data;
        }
        return [];
      });

      if (seq !== requestSeq.current) return;
      setServices(list);
      setIsEmpty(list.length === 0);
      swrCache.set('services_catalog', list);
    } catch (err) {
      if (seq !== requestSeq.current) return;
      console.error('Failed to load services:', err);
      if (!swrCache.get('services_catalog')) {
        setServices([]);
        setIsEmpty(true);
        setError('Unable to load services. Please check your connection.');
      }
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices(!!cached);
  }, [fetchServices]);

  return { services, loading, error, isEmpty, refetch: () => fetchServices(false) };
}
