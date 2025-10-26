const TOKEN_KEY = 'auth_token';

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  public status: number;
  public data?: unknown;

  constructor(
    message: string,
    status: number,
    data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

interface RequestOptions extends RequestInit {
  requireAuth?: boolean;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  if (!baseUrl) {
    throw new Error('VITE_API_BASE_URL is not configured');
  }

  const { requireAuth = true, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (fetchOptions.headers) {
    Object.assign(headers, fetchOptions.headers);
  }

  if (requireAuth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Token ${token}`;
    }
  }

  const url = `${baseUrl}${endpoint}`;

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = null;
    }

    const message = errorData?.detail || errorData?.message || `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, errorData);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}
