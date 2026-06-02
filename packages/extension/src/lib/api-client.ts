export type ApiErrorKind = 'network' | 'auth' | 'validation' | 'unknown';

export class NormalizedApiError extends Error {
  constructor(
    public readonly kind: ApiErrorKind,
    message: string,
    public readonly code?: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = 'NormalizedApiError';
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';
  const { token, headers, ...rest } = options;

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
  } catch {
    throw new NormalizedApiError('network', 'Unable to reach the server. Check your connection.');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const errorBody = body as { error?: { code?: string; message?: string } } | null;
    const message = errorBody?.error?.message ?? 'Request failed';
    const code = errorBody?.error?.code;

    if (response.status === 401) {
      throw new NormalizedApiError('auth', message, code, response.status);
    }
    if (response.status === 400 || response.status === 409 || response.status === 404) {
      throw new NormalizedApiError('validation', message, code, response.status);
    }
    throw new NormalizedApiError('unknown', message, code, response.status);
  }

  return body as T;
}
