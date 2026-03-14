"use client";

import { useState, useEffect } from "react";

const MOBILE_BREAKPOINT = 768;

export default function ResponsiveLayout() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-4">
        <p className="text-lg">Mobile view</p>
        <p className="text-slate-400 text-sm mt-2">Camera + buttons will go here</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-4">
      <p className="text-lg">iPad / Code view</p>
      <p className="text-slate-400 text-sm mt-2">Generated code will appear here</p>
    </div>
  );
}
