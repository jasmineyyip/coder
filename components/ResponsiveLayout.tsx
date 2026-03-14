"use client";

import { useState, useEffect } from "react";
import CodeView from "./CodeView";
import MobileCameraView from "./MobileCameraView";

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
    return <MobileCameraView />;
  }

  return <CodeView />;
}
