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

  const poll = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchLatestCode();
      if (data.code != null && data.timestamp != null) {
        setCode(data.code);
        setTimestamp(data.timestamp);
      }
    } catch {
      setError("Could not load code");
    }
  }, []);

  useEffect(() => {
    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [poll]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-4">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (code == null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-4">
        <p className="text-slate-400">No code yet. Send photos from mobile to generate.</p>
      </div>
    );
  }

  const lastUpdated = timestamp
    ? new Date(timestamp).toLocaleTimeString()
    : null;

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {lastUpdated && (
        <div className="flex-shrink-0 px-4 py-2 text-slate-400 text-sm border-b border-slate-700">
          Last updated: {lastUpdated}
        </div>
      )}
      <div className="flex-1 overflow-auto p-4">
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
    </div>
  );
}
