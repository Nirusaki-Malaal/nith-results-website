import type { Student } from '../types/student';

type StudentResponse = {
  students?: Student[];
  error?: string;
};

function apiUrl(path: string) {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin;
  return new URL(path, backendUrl).toString();
}

async function requestStudents(path: string, init: RequestInit) {
  const response = await fetch(apiUrl(path), {
    headers: { Accept: 'application/json' },
    ...init,
  });
  const payload = (await response.json()) as StudentResponse;

  if (!response.ok) throw new Error(payload.error ?? 'Unable to load student results.');
  if (payload.error) throw new Error(payload.error);
  if (!Array.isArray(payload.students)) throw new Error('The API returned an invalid student list.');

  return payload.students;
}

export function fetchFeaturedStudents(signal: AbortSignal) {
  return requestStudents('/api/random', { method: 'GET', signal });
}

export function searchStudents(query: string, signal: AbortSignal) {
  const searchParams = new URLSearchParams({ query });
  return requestStudents(`/api/query?${searchParams}`, { method: 'POST', signal });
}
