// Access tokens are held in module memory only — never written to localStorage or sessionStorage.
let _accessToken: string | null = null;

export function setAccessToken(token: string): void {
  _accessToken = token;
}

export function getAccessToken(): string | null {
  return _accessToken;
}

export function clearAccessToken(): void {
  _accessToken = null;
}

export function decodeTokenPayload(): { userId: string; role: string } | null {
  if (!_accessToken) return null;
  try {
    const payload = JSON.parse(atob(_accessToken.split('.')[1]));
    return { userId: payload.sub as string, role: payload.role as string };
  } catch {
    return null;
  }
}
