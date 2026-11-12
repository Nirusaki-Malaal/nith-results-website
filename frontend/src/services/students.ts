import type { Student, StudentSummary } from '../types/student';

type StudentResponse = {
  students?: Student[];
  error?: string;
};

type StudentDetailResponse = Student & {
  error?: string;
};

const SUMMARY_CACHE_NAME = 'nith-results-summary-v1';
const SUMMARY_TIMESTAMP_KEY = 'nith-results-summary-cached-at';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

let summaryMemoryCache: StudentSummary[] | null = null;
let summaryMemoryFetchedAt = 0;
const studentDetailCache = new Map<string, Student>();

function apiUrl(path: string) {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin;
  return new URL(path, backendUrl).toString();
}

function isFresh(timestamp: number) {
  return timestamp > 0 && Date.now() - timestamp < ONE_DAY_MS;
}

async function readCachedSummaries(url: string): Promise<StudentSummary[] | null> {
  if (summaryMemoryCache && isFresh(summaryMemoryFetchedAt)) {
    return summaryMemoryCache;
  }

  try {
    const rawTs = window.localStorage.getItem(SUMMARY_TIMESTAMP_KEY);
    const cachedAt = rawTs ? Number(rawTs) : 0;
    if (!isFresh(cachedAt) || !('caches' in window)) {
      return null;
    }

    const cache = await window.caches.open(SUMMARY_CACHE_NAME);
    const match = await cache.match(url);
    if (!match) return null;

    const data = (await match.json()) as StudentSummary[];
    if (!Array.isArray(data)) return null;

    summaryMemoryCache = data;
    summaryMemoryFetchedAt = cachedAt;
    return data;
  } catch {
    return null;
  }
}

async function writeCachedSummaries(url: string, response: Response) {
  try {
    const now = Date.now();
    summaryMemoryFetchedAt = now;
    window.localStorage.setItem(SUMMARY_TIMESTAMP_KEY, String(now));
    if ('caches' in window) {
      const cache = await window.caches.open(SUMMARY_CACHE_NAME);
      await cache.put(url, response);
    }
  } catch (err) {
    void err;
  }
}

export async function fetchSummaries(signal?: AbortSignal): Promise<StudentSummary[]> {
  const url = apiUrl('/api/summary');
  const cached = await readCachedSummaries(url);
  if (cached) return cached;

  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    throw new Error('Unable to load student summaries.');
  }

  const responseClone = response.clone();
  const data = (await response.json()) as StudentSummary[];
  if (!Array.isArray(data)) {
    throw new Error('The API returned an invalid student summary list.');
  }

  summaryMemoryCache = data;
  await writeCachedSummaries(url, responseClone);
  return data;
}

export async function fetchStudentDetail(roll: string, signal?: AbortSignal): Promise<Student> {
  const normalizedRoll = roll.trim().toUpperCase();
  const cached = studentDetailCache.get(normalizedRoll);
  if (cached) return cached;

  const response = await fetch(apiUrl(`/api/student/${encodeURIComponent(normalizedRoll)}`), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  });

  const payload = (await response.json()) as StudentDetailResponse;
  if (!response.ok) throw new Error(payload.error ?? 'Unable to load student details.');
  if (payload.error) throw new Error(payload.error);

  studentDetailCache.set(normalizedRoll, payload);
  return payload;
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

export function searchStudents(query: string, signal: AbortSignal) {
  const searchParams = new URLSearchParams({ query });
  return requestStudents(`/api/query?${searchParams}`, { method: 'POST', signal });
}
