import { NextResponse } from "next/server";
import { getLatestCode } from "@/lib/store";

export async function GET() {
  const result = getLatestCode();
  if (!result) {
    return NextResponse.json({ code: null, timestamp: null });
  }
  return NextResponse.json({
    code: result.code,
    timestamp: result.timestamp,
  });
}
