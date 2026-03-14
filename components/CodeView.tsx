"use client";

import { useState, useEffect, useCallback } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

const POLL_INTERVAL_MS = 2500;

type CodeResponse = { code: string | null; timestamp: number | null };

async function fetchLatestCode(): Promise<CodeResponse> {
  const res = await fetch("/api/latest-code");
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

export default function CodeView() {
  const [code, setCode] = useState<string | null>(null);
  const [timestamp, setTimestamp] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);

  const poll = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchLatestCode();
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

  useEffect(() => {
    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [poll]);

  const handleRegenerate = useCallback(
    async (reason: "logic_wrong" | "runtime_too_long") => {
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
      } finally {
        setRegenerating(false);
      }
    },
    []
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

  if (loading && code == null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-4">
        <p className="text-slate-400" role="status" aria-live="polite">
          Loading…
        </p>
      </div>
    );
  }

  if (code == null) {
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
        className="flex-1 overflow-auto p-4 pb-20"
        role="region"
        aria-label="Generated Python code"
      >
        <SyntaxHighlighter
          language="python"
          style={oneDark}
          customStyle={{
            margin: 0,
            padding: "1rem",
            borderRadius: "0.5rem",
            fontSize: "0.875rem",
            minHeight: "100%",
          }}
          showLineNumbers
        >
          {code}
        </SyntaxHighlighter>
      </div>
      <div className="fixed bottom-0 left-0 flex gap-2 p-3">
        <button
          type="button"
          onClick={() => handleRegenerate("logic_wrong")}
          disabled={regenerating}
          className="py-2 px-4 rounded-lg bg-slate-600 text-white text-sm font-medium disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          aria-label="Solution logic was wrong, regenerate"
        >
          Logic wrong
        </button>
        <button
          type="button"
          onClick={() => handleRegenerate("runtime_too_long")}
          disabled={regenerating}
          className="py-2 px-4 rounded-lg bg-slate-600 text-white text-sm font-medium disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          aria-label="Runtime too long, optimize and regenerate"
        >
          Runtime too long
        </button>
      </div>
    </div>
  );
}
