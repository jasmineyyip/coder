import { NextRequest, NextResponse } from "next/server";
import { generateCodeFromImages } from "@/lib/claude";
import { setLatestCode, setLastSubmission } from "@/lib/store";

const MAX_IMAGES = 10;
const MAX_BODY_BYTES = 20 * 1024 * 1024; // 20 MB

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

  if (!body || typeof body !== "object" || !Array.isArray((body as { images?: unknown }).images)) {
    return NextResponse.json(
      { error: "Body must be { images: string[] }" },
      { status: 400 }
    );
  }

  const images = (body as { images: string[] }).images;
  if (images.length === 0) {
    return NextResponse.json(
      { error: "At least one image is required" },
      { status: 400 }
    );
  }
  if (images.length > MAX_IMAGES) {
    return NextResponse.json(
      { error: `Maximum ${MAX_IMAGES} images allowed` },
      { status: 400 }
    );
  }

  const validImages = images.filter((img) => typeof img === "string");
  if (validImages.length !== images.length) {
    return NextResponse.json(
      { error: "All images must be base64 strings" },
      { status: 400 }
    );
  }

  const totalBytes = validImages.reduce(
    (acc, img) => acc + (img.length * 3) / 4,
    0
  );
  if (totalBytes > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: "Total image data too large" },
      { status: 413 }
    );
  }

  processing = true;
  try {
    const code = await generateCodeFromImages(validImages);
    setLatestCode(code);
    setLastSubmission(validImages, code);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json(
      { error: message },
      { status: 502 }
    );
  } finally {
    processing = false;
  }
}
