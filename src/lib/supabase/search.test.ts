import { describe, it, expect } from "vitest";
import { buildIlikeOrFilter } from "./search";

describe("buildIlikeOrFilter — PostgREST .or() filter injection via search text", () => {
  it("builds the expected plain filter for an ordinary term", () => {
    expect(buildIlikeOrFilter("riyadh", ["title_ar", "title_en"])).toBe(
      'title_ar.ilike."%riyadh%",title_en.ilike."%riyadh%"'
    );
  });

  it("quotes a comma so it can't start a new filter clause in the or() group", () => {
    // Before this fix: `title_ar.ilike.%x%,status.eq.published,title_en.ilike.%x%`
    // — the attacker's comma would have spliced in an extra clause of
    // their own choosing instead of being matched as a literal character.
    const result = buildIlikeOrFilter("x%,status.eq.published", ["title_ar", "title_en"]);
    expect(result).toBe('title_ar.ilike."%x%,status.eq.published%",title_en.ilike."%x%,status.eq.published%"');
    // Exactly one top-level split point (the real separator between the
    // two real columns) — the attacker's embedded comma must stay inside
    // one quoted value, not create a third clause.
    expect(result.split('",').length).toBe(2);
  });

  it("escapes an embedded double quote so it can't close the filter value early", () => {
    const result = buildIlikeOrFilter('x" ,or=true,"y', ["title_ar", "title_en"]);
    expect(result).toBe('title_ar.ilike."%x\\" ,or=true,\\"y%",title_en.ilike."%x\\" ,or=true,\\"y%"');
  });

  it("escapes a literal backslash before the quote-escaping happens, so it can't eat the following escape", () => {
    // If `\` were escaped after `"`, a trailing `\"` in the input could
    // turn into an escaped backslash followed by an unescaped quote.
    // Escaping `\` first keeps the output unambiguous either way.
    expect(buildIlikeOrFilter('a\\"b', ["title_ar"])).toBe('title_ar.ilike."%a\\\\\\"b%"');
  });

  it("supports two or three columns", () => {
    expect(buildIlikeOrFilter("gala", ["name_ar", "name_en", "description_en"])).toBe(
      'name_ar.ilike."%gala%",name_en.ilike."%gala%",description_en.ilike."%gala%"'
    );
  });
});
