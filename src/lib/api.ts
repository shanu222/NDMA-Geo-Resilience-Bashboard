import { apiUrl } from './config';

export { apiUrl };

function getToken() {
  return localStorage.getItem('ndma_token');
}

export async function apiGet<T>(path: string): Promise<T> {
  const r = await fetch(apiUrl(path), {
    headers: {
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown, auth = false): Promise<T> {
  const r = await fetch(apiUrl(path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(auth && getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json() as Promise<T>;
}

export type DashboardSummary = {
  nationalRisk: number;
  alerts: {
    id: string;
    type: string;
    severity: string;
    message: string;
    created_at: string;
    location_name: string | null;
  }[];
  zones: { id: string; name: string; risk: string | null; population: string }[];
  metrics: {
    avgRainfallMm: number;
    warnings: number;
    infrastructure: number;
    population: number;
  };
  aiSuggestions: string[];
  activity: { kind: string; detail: string; created_at: string }[];
};

export type AlertApiRow = {
  id: string;
  type: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  location_name: string | null;
  created_at: string;
};

export type AlertRow = {
  id: string;
  type: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  location_name: string | null;
  created_at: string;
};
