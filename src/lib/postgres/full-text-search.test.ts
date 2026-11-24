import { describe, expect, it } from "vitest";

import { Prisma } from "@/generated/prisma/client";
import {
  fullTextMatchSql,
  fullTextRankSql,
} from "@/lib/postgres/full-text-search";

const COLUMNS = {
  vector: Prisma.sql`i."searchVector"`,
  text: Prisma.sql`i."title"`,
};
const BOTH = { tsQuery: "react:*", typoText: "react" };

describe("the SQL of a full-text search", () => {
  it("matches either side, every value as a parameter", () => {
    const sql = fullTextMatchSql(BOTH, COLUMNS);

    expect(sql.sql).toBe(
      `i."searchVector" @@ to_tsquery('simple', ?) OR ? <% i."title"`,
    );
    expect(sql.values).toEqual(["react:*", "react"]);
  });

  it("leaves out the side that is not set", () => {
    const onlyTypo = fullTextMatchSql({ ...BOTH, tsQuery: null }, COLUMNS);
    const onlyTerms = fullTextRankSql({ ...BOTH, typoText: null }, COLUMNS);

    expect(onlyTypo.sql).toBe(`? <% i."title"`);
    expect(onlyTerms.sql).toBe(
      `ts_rank(i."searchVector", to_tsquery('simple', ?))`,
    );
  });

  it.each([fullTextMatchSql, fullTextRankSql])(
    "refuses a match with both sides empty",
    (build) => {
      expect(() => build({ tsQuery: null, typoText: null }, COLUMNS)).toThrow(
        "needs a tsquery or a text",
      );
    },
  );
});
