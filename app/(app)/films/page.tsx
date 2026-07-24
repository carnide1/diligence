"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Dices, ExternalLink, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import {
  pickRandomFilm,
  type LetterboxdFilm,
} from "@/lib/letterboxd";
import {
  loadRecentUrls,
  rememberUrl,
  type RecentLetterboxdUrl,
} from "@/lib/letterboxdRecent";

type FilmsResponse = {
  canonicalUrl: string;
  listTitle: string | null;
  count: number;
  films: LetterboxdFilm[];
  error?: string;
};

type LoadedList = {
  canonicalUrl: string;
  listTitle: string | null;
  films: LetterboxdFilm[];
};

const CACHE_PREFIX = "diligence.letterboxd.cache:";

function readCache(url: string): LoadedList | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + url);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LoadedList;
    if (!parsed?.films?.length || !parsed.canonicalUrl) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(list: LoadedList) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      CACHE_PREFIX + list.canonicalUrl,
      JSON.stringify(list),
    );
  } catch {
    // Ignore quota errors.
  }
}

export default function FilmsPage() {
  const [url, setUrl] = useState("");
  const [recent, setRecent] = useState<RecentLetterboxdUrl[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState<LoadedList | null>(null);
  const [pick, setPick] = useState<LetterboxdFilm | null>(null);

  useEffect(() => {
    setRecent(loadRecentUrls());
  }, []);

  const applyList = (
    list: LoadedList,
    previous: LetterboxdFilm | null = null,
  ) => {
    const film = pickRandomFilm(
      list.films,
      previous,
      (a, b) => a.slug === b?.slug,
    );
    setLoaded(list);
    setPick(film);
    setUrl(list.canonicalUrl);

    const label =
      list.listTitle?.trim() ||
      list.canonicalUrl
        .replace(/^https?:\/\/(www\.)?letterboxd\.com\//i, "")
        .replace(/\/$/, "");
    setRecent(rememberUrl(list.canonicalUrl, label));
  };

  const runPick = async (rawUrl: string) => {
    const trimmed = rawUrl.trim();
    if (!trimmed) {
      toast.error("Paste a Letterboxd list or watchlist URL.");
      return;
    }

    setLoading(true);
    try {
      const cached = readCache(trimmed) ?? readCache(
        trimmed.endsWith("/") ? trimmed : `${trimmed}/`,
      );
      if (cached) {
        applyList(cached, pick);
        return;
      }

      const res = await fetch("/api/letterboxd/films", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = (await res.json()) as FilmsResponse;
      if (!res.ok) {
        throw new Error(data.error || "Could not load that list.");
      }

      const list: LoadedList = {
        canonicalUrl: data.canonicalUrl,
        listTitle: data.listTitle,
        films: data.films,
      };
      writeCache(list);
      applyList(list, pick);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void runPick(url);
  };

  const onRetry = () => {
    if (!loaded || loaded.films.length === 0) return;
    setPick(
      pickRandomFilm(loaded.films, pick, (a, b) => a.slug === b?.slug),
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl tracking-tight text-foreground">
          Films
        </h1>
        <p className="mt-1 text-sm text-muted">
          Paste a Letterboxd list or watchlist link and get a random pick.
        </p>
      </header>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <TextInput
          label="Letterboxd URL"
          name="letterboxdUrl"
          type="url"
          inputMode="url"
          placeholder="https://letterboxd.com/user/watchlist/"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          autoComplete="off"
        />
        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Loading list…
            </>
          ) : (
            <>
              <Dices className="size-4" aria-hidden />
              Pick a film
            </>
          )}
        </Button>
      </form>

      {recent.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-medium uppercase tracking-wide text-faint">
            Recent
          </h2>
          <ul className="flex flex-col gap-1.5">
            {recent.map((item) => (
              <li key={item.url}>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setUrl(item.url);
                    void runPick(item.url);
                  }}
                  className="w-full rounded-[var(--radius-sm)] border border-border bg-bg-elevated px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:border-border-strong hover:bg-bg-overlay disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="block truncate font-medium">
                    {item.label}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-faint">
                    {item.url.replace(/^https?:\/\/(www\.)?/i, "")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {pick && loaded ? (
        <section className="rounded-[var(--radius)] border border-border bg-bg-elevated p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-faint">
            Tonight&apos;s pick
            {loaded.listTitle ? (
              <span className="normal-case tracking-normal text-muted">
                {" "}
                · from {loaded.listTitle}
              </span>
            ) : null}
          </p>
          <h2 className="mt-2 font-display text-2xl leading-snug text-foreground">
            {pick.title}
            {pick.year != null ? (
              <span className="text-muted"> ({pick.year})</span>
            ) : null}
          </h2>
          <p className="mt-2 text-xs text-faint">
            {loaded.films.length} films in list
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onRetry}
              disabled={loading || loaded.films.length < 2}
            >
              <RotateCcw className="size-4" aria-hidden />
              Try another
            </Button>
            <a
              href={pick.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-border bg-bg-overlay px-4 text-sm font-medium text-foreground transition-colors hover:border-border-strong"
            >
              Open on Letterboxd
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          </div>
        </section>
      ) : null}
    </div>
  );
}
