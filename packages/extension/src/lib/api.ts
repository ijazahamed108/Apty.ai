import type { Walkthrough, CreateWalkthroughInput, UserRole } from '@mini-apty/shared';
import { apiFetch } from './api-client';

export type AuthResult = {
  token: string;
  user: { id: string; email: string; role: UserRole };
};

export async function signup(email: string, password: string): Promise<AuthResult> {
  return apiFetch<AuthResult>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function login(email: string, password: string): Promise<AuthResult> {
  return apiFetch<AuthResult>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function listWalkthroughs(
  token: string,
  origin: string,
  path: string
): Promise<Walkthrough[]> {
  const params = new URLSearchParams({ origin, path });
  return apiFetch<Walkthrough[]>(`/walkthroughs?${params}`, { token });
}

export async function getWalkthrough(token: string, id: string): Promise<Walkthrough> {
  return apiFetch<Walkthrough>(`/walkthroughs/${id}`, { token });
}

export async function createWalkthrough(
  token: string,
  input: CreateWalkthroughInput
): Promise<Walkthrough> {
  return apiFetch<Walkthrough>('/walkthroughs', {
    method: 'POST',
    token,
    body: JSON.stringify(input),
  });
}

export async function deleteWalkthrough(token: string, id: string): Promise<void> {
  await apiFetch<void>(`/walkthroughs/${id}`, { method: 'DELETE', token });
}
