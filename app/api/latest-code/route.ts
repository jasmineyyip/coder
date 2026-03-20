import { NextResponse } from "next/server";
import { getLatestCode, isGenerating } from "@/lib/store";

export async function GET() {
  const generating = isGenerating();
  const result = getLatestCode();
  if (!result) {
    return NextResponse.json({ code: null, timestamp: null, generating });
  }
  return NextResponse.json({
    code: result.code,
    timestamp: result.timestamp,
    generating,
  });
}
