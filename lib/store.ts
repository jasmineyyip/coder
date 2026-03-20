let latest: { code: string; timestamp: number } | null = null;
let lastSubmission: { images: string[]; code: string } | null = null;
let generating = false;

export function setGenerating(value: boolean): void {
  generating = value;
}

export function isGenerating(): boolean {
  return generating;
}

export function setLatestCode(code: string): void {
  latest = { code, timestamp: Date.now() };
}

export function getLatestCode(): { code: string; timestamp: number } | null {
  return latest;
}

export function setLastSubmission(images: string[], code: string): void {
  lastSubmission = { images, code };
}

export function getLastSubmission(): { images: string[]; code: string } | null {
  return lastSubmission;
}
