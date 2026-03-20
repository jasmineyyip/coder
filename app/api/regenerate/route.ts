import { NextRequest, NextResponse } from "next/server";
import { regenerateCodeFromFeedback } from "@/lib/claude";
import { getLastSubmission, setLatestCode, setLastSubmission, setGenerating } from "@/lib/store";

let processing = false;

export async function POST(request: NextRequest) {
  if (processing) {
    return NextResponse.json(
      { error: "Another request is being processed" },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const reason = (body as { reason?: string })?.reason;
  if (reason !== "logic_wrong" && reason !== "runtime_too_long" && reason !== "alternative" && reason !== "brute_force") {
    return NextResponse.json(
      { error: "Body must be { reason: \"logic_wrong\" | \"runtime_too_long\" | \"alternative\" | \"brute_force\" }" },
      { status: 400 }
    );
  }

  const last = getLastSubmission();
  if (!last) {
    return NextResponse.json(
      { error: "No previous submission to regenerate. Send photos from mobile first." },
      { status: 400 }
    );
  }

  processing = true;
  setGenerating(true);
  try {
    const code = await regenerateCodeFromFeedback(last.images, last.code, reason);
    setLatestCode(code);
    setLastSubmission(last.images, code);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Regeneration failed";
    return NextResponse.json(
      { error: message },
      { status: 502 }
    );
  } finally {
    setGenerating(false);
    processing = false;
  }
}
