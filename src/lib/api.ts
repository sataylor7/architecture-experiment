import { getAccessToken, setAccessToken, clearAccessToken } from './token-store';

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
    if (!res.ok) return false;
    const { data } = await res.json();
    setAccessToken(data.accessToken);
    return true;
  } catch {
    return false;
  }
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers((init.headers ?? {}) as HeadersInit);
  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let res = await fetch(path, { ...init, headers, credentials: 'include' });

  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      const newToken = getAccessToken();
      if (newToken) headers.set('Authorization', `Bearer ${newToken}`);
      res = await fetch(path, { ...init, headers, credentials: 'include' });
    } else {
      clearAccessToken();
      if (typeof window !== 'undefined') window.location.href = '/login';
    }
  }

  return res;
}

export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const res = await apiFetch(path, {
    ...init,
    headers: { ...headers, ...(init.headers as Record<string, string> ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body?.error ?? 'Request failed'), { status: res.status, data: body });
  return body;
}
