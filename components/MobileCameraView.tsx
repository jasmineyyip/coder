"use client";

import { useState, useRef, useEffect, useCallback } from "react";

export default function MobileCameraView() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [photos, setPhotos] = useState<string[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    const video = videoRef.current;
    if (!video) return;

    const start = async () => {
      try {
        setCameraError(null);
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        streamRef.current = stream;
        video.srcObject = stream;
        await video.play();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        setCameraError(
          msg.toLowerCase().includes("permission")
            ? "Camera access denied. Allow camera in browser settings and refresh."
            : msg || "Could not access camera."
        );
      }
    };
    start();
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (video.srcObject) {
        video.srcObject = null;
      }
    };
  }, []);

  const takePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setPhotos((prev) => [...prev, dataUrl]);
    setSendError(null);
  }, []);

  const sendPhotos = useCallback(async () => {
    if (photos.length === 0) {
      setSendError("Take at least one photo first");
      return;
    }
    setSending(true);
    setSendError(null);
    setSendSuccess(false);
    try {
      const res = await fetch("/api/submit-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: photos }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSendError((data.error as string) || `Request failed (${res.status})`);
        return;
      }
      setPhotos([]);
      setSendSuccess(true);
      setTimeout(() => setSendSuccess(false), 3000);
    } finally {
      setSending(false);
    }
  }, [photos]);

  if (cameraError) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-4"
        role="alert"
        aria-label="Camera error"
      >
        <p className="text-red-400 text-center">{cameraError}</p>
        <p className="text-slate-400 text-sm mt-2 text-center">
          Allow camera access and refresh.
        </p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-900">
      <div className="flex-1 relative min-h-0">
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="flex-shrink-0 flex items-center justify-center gap-4 px-4 py-4 bg-slate-900/90 border-t border-slate-700">
        <button
          type="button"
          onClick={takePhoto}
          className="py-3 px-5 rounded-lg bg-slate-600 text-white font-medium active:bg-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          aria-label="Take photo"
        >
          Take photo
        </button>
        <button
          type="button"
          onClick={sendPhotos}
          disabled={sending || photos.length === 0}
          className="py-3 px-5 rounded-lg bg-emerald-600 text-white font-medium disabled:opacity-50 disabled:pointer-events-none active:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          aria-label={sending ? "Sending photos" : "Send photos"}
          aria-busy={sending}
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </div>

      <div className="flex-shrink-0 px-4 pb-2 min-h-[1.5rem]" role="status" aria-live="polite">
        {sendError && (
          <p className="text-red-400 text-sm text-center">{sendError}</p>
        )}
        {sendSuccess && !sendError && (
          <p className="text-emerald-400 text-sm text-center">Sent. Code will appear on iPad.</p>
        )}
      </div>
    </div>
  );
}
