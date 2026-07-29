import { NextResponse } from "next/server";
import { fetchLetterboxdList } from "@/lib/letterboxd";
import { rateLimit } from "@/lib/rateLimit";
import { readBearerToken, verifyFirebaseIdToken } from "@/lib/verifyIdToken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;

export async function POST(request: Request) {
  const token = readBearerToken(request);
  if (!token) {
    return NextResponse.json(
      { error: "Sign in required." },
      { status: 401 },
    );
  }

  const verified = await verifyFirebaseIdToken(token);
  if (!verified) {
    return NextResponse.json(
      { error: "Invalid or expired session." },
      { status: 401 },
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const limited = rateLimit(
    `letterboxd:${verified.uid}:${ip}`,
    MAX_PER_WINDOW,
    WINDOW_MS,
  );
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const url =
    typeof body === "object" &&
    body !== null &&
    "url" in body &&
    typeof (body as { url: unknown }).url === "string"
      ? (body as { url: string }).url
      : null;

  if (!url?.trim()) {
    return NextResponse.json(
      { error: "Provide a Letterboxd list or watchlist URL." },
      { status: 400 },
    );
  }

  try {
    const result = await fetchLetterboxdList(url);
    return NextResponse.json({
      canonicalUrl: result.canonicalUrl,
      listTitle: result.listTitle,
      count: result.films.length,
      films: result.films,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load Letterboxd list.";
    const status = /valid|must be|Use a public/i.test(message) ? 400 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
