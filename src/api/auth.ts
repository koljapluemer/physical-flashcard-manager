import { apiRequest, setToken, clearToken, getToken } from './client';

interface LoginResponse {
  token: string;
}

export async function login(email: string, password: string): Promise<string> {
  const response = await apiRequest<LoginResponse>('/token-auth/', {
    method: 'POST',
    requireAuth: false,
    body: JSON.stringify({ email, password }),
  });

  setToken(response.token);
  return response.token;
}

export function logout(): void {
  clearToken();
}

export function getCurrentToken(): string | null {
  return getToken();
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}
