"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

const POLL_SLOW_MS = 2500;
const POLL_FAST_MS = 500;

type CodeResponse = {
  code: string | null;
  timestamp: number | null;
  generating?: boolean;
};

async function fetchLatestCode(): Promise<CodeResponse> {
  const res = await fetch("/api/latest-code");
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

function GeneratingOverlay({ compact }: { compact?: boolean }) {
  return (
    <div
      className={
        compact
          ? "absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/92 backdrop-blur-sm p-6"
          : "min-h-screen flex flex-col items-center justify-center bg-slate-900 p-6"
      }
      role="status"
      aria-live="assertive"
      aria-busy="true"
      aria-label="Generating new solution"
    >
      <div
        className="w-14 h-14 border-4 border-slate-500 border-t-emerald-400 rounded-full animate-spin mb-5 shrink-0"
        aria-hidden
      />
      <p className="text-xl font-semibold text-white text-center">
        Generating new solution…
      </p>
      <p className="text-base text-slate-400 text-center mt-3 max-w-md leading-relaxed">
        This can take a little while. The code below will update automatically when
        it&apos;s ready.
      </p>
    </div>
  );
}

export default function CodeView() {
  const [code, setCode] = useState<string | null>(null);
  const [timestamp, setTimestamp] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
  const [serverGenerating, setServerGenerating] = useState(false);
  const pollRef = useRef<(() => Promise<void>) | undefined>(undefined);

  const poll = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchLatestCode();
      setServerGenerating(!!data.generating);
      if (data.code != null && data.timestamp != null) {
        setCode(data.code);
        setTimestamp(data.timestamp);
      }
      setLoading(false);
    } catch {
      setError("Could not load code");
      setLoading(false);
    }
  }, []);

  pollRef.current = poll;

  const busy = serverGenerating || regenerating;

  useEffect(() => {
    poll();
    const intervalMs = busy ? POLL_FAST_MS : POLL_SLOW_MS;
    const id = setInterval(() => pollRef.current?.(), intervalMs);
    return () => clearInterval(id);
  }, [poll, busy]);

  const handleRegenerate = useCallback(
    async (reason: "logic_wrong" | "runtime_too_long" | "alternative" | "brute_force") => {
      setRegenerateError(null);
      setRegenerating(true);
      try {
        const res = await fetch("/api/regenerate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setRegenerateError((data.error as string) || `Request failed (${res.status})`);
          return;
        }
        await poll();
      } finally {
        setRegenerating(false);
      }
    },
    [poll]
  );

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-4 gap-3">
        <p className="text-red-400 text-center">{error}</p>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setLoading(true);
            poll();
          }}
          className="py-2 px-4 rounded-lg bg-slate-600 text-white font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          aria-label="Retry loading code"
        >
          Retry
        </button>
      </div>
    );
  }

  if (loading && code == null && !serverGenerating) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-4">
        <p className="text-slate-400" role="status" aria-live="polite">
          Loading…
        </p>
      </div>
    );
  }

  if (code == null) {
    if (serverGenerating) {
      return <GeneratingOverlay />;
    }
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-4">
        <p className="text-slate-400 text-center">
          No code yet. Send photos from mobile to generate.
        </p>
      </div>
    );
  }

  const lastUpdated = timestamp
    ? new Date(timestamp).toLocaleTimeString()
    : null;

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {lastUpdated && (
        <div
          className="flex-shrink-0 px-4 py-2 text-slate-400 text-sm border-b border-slate-700"
          role="status"
          aria-live="polite"
        >
          Last updated: {lastUpdated}
        </div>
      )}
      {regenerateError && (
        <div className="flex-shrink-0 px-4 py-1.5 bg-slate-800 border-b border-slate-700">
          <p className="text-red-400 text-sm">{regenerateError}</p>
        </div>
      )}
      <div
        className="flex-1 overflow-auto p-4 pb-20 relative min-h-0"
        role="region"
        aria-label="Generated Python code"
        aria-busy={busy}
      >
        {busy && <GeneratingOverlay compact />}
        <SyntaxHighlighter
          language="python"
          style={oneDark}
          customStyle={{
            margin: 0,
            padding: "1rem",
            borderRadius: "0.5rem",
            fontSize: "0.875rem",
            minHeight: "100%",
            opacity: busy ? 0.35 : 1,
            transition: "opacity 0.2s",
          }}
          showLineNumbers
        >
          {code}
        </SyntaxHighlighter>
      </div>
      <div className="fixed bottom-0 left-0 flex gap-2 p-3 z-30">
        <button
          type="button"
          onClick={() => handleRegenerate("logic_wrong")}
          disabled={busy}
          className="py-2 px-4 rounded-lg bg-slate-600 text-white text-sm font-medium disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          aria-label="Solution logic was wrong, regenerate"
        >
          Logic wrong
        </button>
        <button
          type="button"
          onClick={() => handleRegenerate("runtime_too_long")}
          disabled={busy}
          className="py-2 px-4 rounded-lg bg-slate-600 text-white text-sm font-medium disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          aria-label="Optimized solution, regenerate"
        >
          Optimized
        </button>
        <button
          type="button"
          onClick={() => handleRegenerate("brute_force")}
          disabled={busy}
          className="py-2 px-4 rounded-lg bg-slate-600 text-white text-sm font-medium disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          aria-label="Brute force solution, regenerate"
        >
          Brute force
        </button>
        <button
          type="button"
          onClick={() => handleRegenerate("alternative")}
          disabled={busy}
          className="py-2 px-4 rounded-lg bg-slate-600 text-white text-sm font-medium disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          aria-label="Show an alternative solution with different structure or logic"
        >
          Alternative
        </button>
      </div>
    </div>
  );
}
