export const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') || '';

export function apiUrl(path: string) {
  if (path.startsWith('http')) return path;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${p}`;
}
