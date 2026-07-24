import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractFilmsFromHtml,
  extractMaxPage,
  pageUrl,
  parseLetterboxdListUrl,
  pickRandomFilm,
} from "./letterboxd";

describe("parseLetterboxdListUrl", () => {
  it("parses list URLs", () => {
    const parsed = parseLetterboxdListUrl(
      "https://letterboxd.com/JoeMama004/list/dvd-collection/",
    );
    assert.equal(parsed.kind, "list");
    assert.equal(parsed.username, "joemama004");
    assert.equal(parsed.slug, "dvd-collection");
    assert.equal(
      parsed.canonicalUrl,
      "https://letterboxd.com/joemama004/list/dvd-collection/",
    );
  });

  it("parses watchlist URLs", () => {
    const parsed = parseLetterboxdListUrl(
      "https://letterboxd.com/JoeMama004/watchlist/",
    );
    assert.equal(parsed.kind, "watchlist");
    assert.equal(parsed.username, "joemama004");
    assert.equal(parsed.slug, null);
    assert.equal(
      parsed.canonicalUrl,
      "https://letterboxd.com/joemama004/watchlist/",
    );
  });

  it("rejects non-list URLs", () => {
    assert.throws(() =>
      parseLetterboxdListUrl("https://letterboxd.com/film/argo/"),
    );
  });
});

describe("extractFilmsFromHtml", () => {
  it("reads film posters", () => {
    const html = `
      <div data-item-name="Argo (2012)" data-item-slug="argo"></div>
      <div data-item-name="Avatar (2009)" data-item-slug="avatar"></div>
    `;
    const films = extractFilmsFromHtml(html);
    assert.equal(films.length, 2);
    assert.deepEqual(films[0], {
      title: "Argo",
      year: 2012,
      slug: "argo",
      url: "https://letterboxd.com/film/argo/",
    });
  });
});

describe("extractMaxPage", () => {
  it("finds highest page link", () => {
    const canonical = "https://letterboxd.com/joemama004/watchlist/";
    const html = `
      <a href="/joemama004/watchlist/page/2/">2</a>
      <a href="/joemama004/watchlist/page/17/">17</a>
    `;
    assert.equal(extractMaxPage(html, canonical), 17);
  });
});

describe("pageUrl", () => {
  it("appends page segments", () => {
    assert.equal(
      pageUrl("https://letterboxd.com/u/watchlist/", 1),
      "https://letterboxd.com/u/watchlist/",
    );
    assert.equal(
      pageUrl("https://letterboxd.com/u/watchlist/", 3),
      "https://letterboxd.com/u/watchlist/page/3/",
    );
  });
});

describe("pickRandomFilm", () => {
  it("avoids the previous pick when possible", () => {
    const films = ["a", "b", "c"];
    for (let i = 0; i < 20; i += 1) {
      assert.notEqual(pickRandomFilm(films, "a"), "a");
    }
  });
});
