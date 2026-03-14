let latest: { code: string; timestamp: number } | null = null;

export function setLatestCode(code: string): void {
  latest = { code, timestamp: Date.now() };
}

export function getLatestCode(): { code: string; timestamp: number } | null {
  return latest;
}
