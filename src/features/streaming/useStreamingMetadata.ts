import { useEffect, useRef, useState } from 'react';

import { fetchGenres, fetchMediaDetails, mediaTypes, type MediaDetails, type MediaType } from './tmdb';

export type DetailState =
  | { status: 'loading' }
  | { status: 'ready'; data: MediaDetails }
  | { status: 'error'; message: string };

type DetailRequest = { controller: AbortController; timeout: ReturnType<typeof setTimeout> };

export function useStreamingMetadata(apiKey: string | undefined) {
  const [genres, setGenres] = useState<Partial<Record<MediaType, ReadonlyMap<number, string>>>>({});
  const [details, setDetails] = useState<Partial<Record<MediaType, Record<number, DetailState | undefined>>>>({});
  const pending = useRef(new Map<string, DetailRequest>());

  useEffect(() => {
    if (!apiKey) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    Promise.allSettled(mediaTypes.map(async ({ value }) => {
      const names = await fetchGenres(apiKey, value, controller.signal);
      if (!controller.signal.aborted) setGenres((previous) => ({ ...previous, [value]: names }));
    })).finally(() => clearTimeout(timeout));

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [apiKey]);

  useEffect(() => {
    const requests = pending.current;
    return () => {
      for (const { controller, timeout } of requests.values()) {
        clearTimeout(timeout);
        controller.abort();
      }
      requests.clear();
    };
  }, []);

  function loadDetails(type: MediaType, id: number) {
    if (!apiKey || details[type]?.[id]?.status === 'ready') return;
    const key = `${type}/${id}`;
    if (pending.current.has(key)) return;

    function update(value: DetailState) {
      setDetails((previous) => ({ ...previous, [type]: { ...previous[type], [id]: value } }));
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      pending.current.delete(key);
      controller.abort();
      update({ status: 'error', message: 'TMDB met trop de temps à répondre.' });
    }, 15000);
    pending.current.set(key, { controller, timeout });
    update({ status: 'loading' });

    fetchMediaDetails(apiKey, type, id, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) update({ status: 'ready', data });
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) {
          update({ status: 'error', message: failure instanceof Error ? failure.message : 'Détails indisponibles.' });
        }
      })
      .finally(() => {
        clearTimeout(timeout);
        if (pending.current.get(key)?.controller === controller) pending.current.delete(key);
      });
  }

  return { genres, details, loadDetails };
}
