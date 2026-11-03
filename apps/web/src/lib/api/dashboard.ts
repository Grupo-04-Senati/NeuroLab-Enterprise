import type { DashboardSnapshot, JobCurves } from '@/types/domain';
import { api } from '@/lib/api/client';
import { buildCurves, buildSnapshot } from '@/lib/mock/dashboard';

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

/** Latencia fingida para que los estados de carga sean visibles en la demo. */
function simulateNetwork<T>(payload: () => T, ms = 260): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(payload()), ms);
  });
}

/**
 * Estado agregado del M01. En producción se complementa con el canal de
 * eventos `GET /api/v1/training-jobs/{id}/events` (§9) para evitar sondeo.
 */
export function fetchDashboard(signal?: AbortSignal): Promise<DashboardSnapshot> {
  if (USE_MOCK) return simulateNetwork(buildSnapshot);
  return api.get<DashboardSnapshot>('/dashboard', { signal });
}

/** Historial época a época del trabajo: pérdida (entrenamiento/validación) y métrica. */
export function fetchJobCurves(jobId: string, signal?: AbortSignal): Promise<JobCurves> {
  if (USE_MOCK) return simulateNetwork(() => buildCurves(jobId), 180);
  return api.get<JobCurves>(`/training-jobs/${jobId}/metrics`, { signal });
}

/** La cancelación es una solicitud: el worker confirma el estado final (RN-05). */
export function requestCancellation(jobId: string): Promise<{ jobId: string; status: string }> {
  if (USE_MOCK) return simulateNetwork(() => ({ jobId, status: 'CANCEL_REQUESTED' }), 180);
  return api.post(`/training-jobs/${jobId}/cancel`);
}

export const dataSource = USE_MOCK ? ('demo' as const) : ('api' as const);
