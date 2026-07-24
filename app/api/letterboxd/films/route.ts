import { NextResponse } from "next/server";
import { fetchLetterboxdList } from "@/lib/letterboxd";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
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
