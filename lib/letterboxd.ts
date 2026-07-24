export type LetterboxdFilm = {
  title: string;
  year: number | null;
  slug: string;
  url: string;
};

export type LetterboxdListResult = {
  canonicalUrl: string;
  listTitle: string | null;
  films: LetterboxdFilm[];
};

const LETTERBOXD_ORIGIN = "https://letterboxd.com";
const USER_AGENT =
  "Mozilla/5.0 (compatible; Diligence/1.0; +https://github.com/diligence)";
const MAX_PAGES = 40;

const LIST_PATH =
  /^\/([a-z0-9_-]+)\/list\/([a-z0-9_-]+)\/?(?:page\/(\d+)\/?)?$/i;
const WATCHLIST_PATH =
  /^\/([a-z0-9_-]+)\/watchlist\/?(?:page\/(\d+)\/?)?$/i;

export function parseLetterboxdListUrl(raw: string): {
  username: string;
  kind: "list" | "watchlist";
  slug: string | null;
  canonicalUrl: string;
} {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error("Enter a valid Letterboxd URL.");
  }

  if (!/^letterboxd\.com$/i.test(url.hostname.replace(/^www\./i, ""))) {
    throw new Error("URL must be on letterboxd.com.");
  }

  const path = url.pathname.replace(/\/+/g, "/");
  const listMatch = path.match(LIST_PATH);
  if (listMatch) {
    const username = listMatch[1].toLowerCase();
    const slug = listMatch[2].toLowerCase();
    return {
      username,
      kind: "list",
      slug,
      canonicalUrl: `${LETTERBOXD_ORIGIN}/${username}/list/${slug}/`,
    };
  }

  const watchMatch = path.match(WATCHLIST_PATH);
  if (watchMatch) {
    const username = watchMatch[1].toLowerCase();
    return {
      username,
      kind: "watchlist",
      slug: null,
      canonicalUrl: `${LETTERBOXD_ORIGIN}/${username}/watchlist/`,
    };
  }

  throw new Error(
    "Use a public list or watchlist URL (e.g. /user/list/name/ or /user/watchlist/).",
  );
}

export function pageUrl(canonicalUrl: string, page: number): string {
  if (page <= 1) return canonicalUrl;
  return `${canonicalUrl}page/${page}/`;
}

export function extractFilmsFromHtml(html: string): LetterboxdFilm[] {
  const films: LetterboxdFilm[] = [];
  const seen = new Set<string>();
  // Letterboxd poster markup: data-item-name then data-item-slug on the same node.
  const re = /data-item-name="([^"]+)"\s+data-item-slug="([^"]+)"/g;

  for (const match of html.matchAll(re)) {
    const display = decodeHtmlEntities(match[1]).trim();
    const slug = match[2].trim();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);

    const yearMatch = display.match(/\((\d{4})\)\s*$/);
    const year = yearMatch ? Number(yearMatch[1]) : null;
    const title = yearMatch
      ? display.slice(0, yearMatch.index).trim()
      : display;

    films.push({
      title,
      year,
      slug,
      url: `${LETTERBOXD_ORIGIN}/film/${slug}/`,
    });
  }

  return films;
}

export function extractListTitle(html: string): string | null {
  const og = html.match(
    /<meta\s+property="og:title"\s+content="([^"]+)"/i,
  );
  if (og?.[1]) {
    return cleanListTitle(decodeHtmlEntities(og[1]));
  }

  const titleTag = html.match(/<title>([^<]+)<\/title>/i);
  if (titleTag?.[1]) {
    return cleanListTitle(decodeHtmlEntities(titleTag[1]));
  }

  return null;
}

export function extractMaxPage(html: string, canonicalUrl: string): number {
  const pathPrefix = new URL(canonicalUrl).pathname.replace(/\/$/, "");
  const escaped = pathPrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`${escaped}/page/(\\d+)/`, "gi");
  let max = 1;
  for (const match of html.matchAll(re)) {
    const n = Number(match[1]);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return Math.min(max, MAX_PAGES);
}

function cleanListTitle(raw: string): string {
  return raw
    .replace(/\s*[•·]\s*Letterboxd\s*$/i, "")
    .replace(/^\u200e/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&lrm;/g, "")
    .replace(/&#x200e;/gi, "");
}

async function fetchLetterboxdHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
    },
    cache: "no-store",
  });

  if (res.status === 404) {
    throw new Error("List not found. Check the URL or that the list is public.");
  }
  if (!res.ok) {
    throw new Error(`Letterboxd returned ${res.status}. Try again shortly.`);
  }

  const html = await res.text();
  if (
    /just a moment|cf-browser-verification|performing security verification/i.test(
      html,
    )
  ) {
    throw new Error(
      "Letterboxd blocked the request (bot protection). Try again in a moment.",
    );
  }

  return html;
}

export async function fetchLetterboxdList(
  rawUrl: string,
): Promise<LetterboxdListResult> {
  const parsed = parseLetterboxdListUrl(rawUrl);
  const firstHtml = await fetchLetterboxdHtml(parsed.canonicalUrl);
  const listTitle = extractListTitle(firstHtml);
  const maxPage = extractMaxPage(firstHtml, parsed.canonicalUrl);

  const bySlug = new Map<string, LetterboxdFilm>();
  for (const film of extractFilmsFromHtml(firstHtml)) {
    bySlug.set(film.slug, film);
  }

  for (let page = 2; page <= maxPage; page += 1) {
    const html = await fetchLetterboxdHtml(pageUrl(parsed.canonicalUrl, page));
    const pageFilms = extractFilmsFromHtml(html);
    if (pageFilms.length === 0) break;
    for (const film of pageFilms) {
      bySlug.set(film.slug, film);
    }
  }

  const films = [...bySlug.values()];
  if (films.length === 0) {
    throw new Error(
      "No films found. The list may be empty, private, or blocked.",
    );
  }

  return {
    canonicalUrl: parsed.canonicalUrl,
    listTitle,
    films,
  };
}

export function pickRandomFilm<T>(
  films: T[],
  exclude?: T | null,
  equals: (a: T, b: T) => boolean = (a, b) => a === b,
): T {
  if (films.length === 0) {
    throw new Error("No films to pick from.");
  }
  if (films.length === 1) return films[0];

  const pool =
    exclude != null ? films.filter((f) => !equals(f, exclude)) : films;
  const choices = pool.length > 0 ? pool : films;
  return choices[Math.floor(Math.random() * choices.length)]!;
}
