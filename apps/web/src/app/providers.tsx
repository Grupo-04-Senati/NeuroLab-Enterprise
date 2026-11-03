import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { DashboardSnapshot } from '@/types/domain';
import { fetchDashboard, requestCancellation } from '@/lib/api/dashboard';

/** Intervalo de sincronización del M01. El canal definitivo es SSE (§9). */
const POLL_MS = 5000;

type LoadStatus = 'loading' | 'ready' | 'error';

interface PlatformData {
  snapshot: DashboardSnapshot | null;
  status: LoadStatus;
  error: string | null;
  lastUpdated: string | null;
  pendingCancellation: string | null;
  refresh: () => void;
  cancelJob: (jobId: string) => void;
}

const PlatformDataContext = createContext<PlatformData | null>(null);

export function PlatformDataProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [pendingCancellation, setPendingCancellation] = useState<string | null>(null);
  const inflight = useRef<AbortController | null>(null);
  const hasData = useRef(false);

  const load = useCallback(async (mode: 'initial' | 'poll') => {
    inflight.current?.abort();
    const controller = new AbortController();
    inflight.current = controller;

    if (mode === 'initial') setStatus('loading');

    try {
      const next = await fetchDashboard(controller.signal);
      if (controller.signal.aborted) return;
      setSnapshot((current) =>
        current
          ? { ...next, activeJobs: preserveCancellations(next.activeJobs, current.activeJobs) }
          : next,
      );
      hasData.current = true;
      setStatus('ready');
      setError(null);
    } catch (caught) {
      if (controller.signal.aborted) return;
      setError(caught instanceof Error ? caught.message : 'No fue posible consultar la plataforma');
      /* Un fallo puntual del sondeo no descarta los datos ya mostrables (§16). */
      setStatus(hasData.current ? 'ready' : 'error');
    }
  }, []);

  useEffect(() => {
    void load('initial');
    return () => inflight.current?.abort();
  }, [load]);

  /* Sondeo pausado en pestaña oculta: evita consumo inútil y recupera el estado
     al volver, tal y como pide el criterio de recuperación (§16). */
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible') void load('poll');
    };
    const timer = setInterval(tick, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load('poll');
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  const cancelJob = useCallback((jobId: string) => {
    setPendingCancellation(jobId);
    setSnapshot((current) =>
      current
        ? {
            ...current,
            activeJobs: current.activeJobs.map((job) =>
              job.id === jobId ? { ...job, cancelRequested: true } : job,
            ),
          }
        : current,
    );
    requestCancellation(jobId)
      .catch(() => setError('La solicitud de cancelación no pudo registrarse'))
      .finally(() => setPendingCancellation(null));
  }, []);

  const value = useMemo<PlatformData>(
    () => ({
      snapshot,
      status,
      error,
      lastUpdated: snapshot?.generatedAt ?? null,
      pendingCancellation,
      refresh: () => void load('poll'),
      cancelJob,
    }),
    [snapshot, status, error, pendingCancellation, load, cancelJob],
  );

  return <PlatformDataContext.Provider value={value}>{children}</PlatformDataContext.Provider>;
}

function preserveCancellations(next: DashboardSnapshot['activeJobs'], current: DashboardSnapshot['activeJobs']) {
  const requested = new Set(current.filter((job) => job.cancelRequested).map((job) => job.id));
  if (requested.size === 0) return next;
  return next.map((job) => (requested.has(job.id) ? { ...job, cancelRequested: true } : job));
}

export function usePlatformData(): PlatformData {
  const context = useContext(PlatformDataContext);
  if (!context) {
    throw new Error('usePlatformData debe usarse dentro de PlatformDataProvider');
  }
  return context;
}
