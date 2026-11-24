import "server-only";

import { Prisma } from "@/generated/prisma/client";

// The SQL fragments of a full-text search (ADR 0018), shared by the rankings
// of items and collections. Every value goes in as a parameter of Prisma.sql;
// the column fragments come from the caller's own code, never from input. The
// query itself runs only in the files the lint allows.

export interface FullTextMatch {
  /** A tsquery for to_tsquery('simple', ...), or null for none. */
  tsQuery: string | null;
  /** The text for the trigram match on the text column, or null for none. */
  typoText: string | null;
}

export interface FullTextColumns {
  /** The tsvector column, e.g. Prisma.sql`i."searchVector"`. */
  vector: Prisma.Sql;
  /** The text column of the typo match, e.g. Prisma.sql`i."title"`. */
  text: Prisma.Sql;
}

// A caller answers a text that can match nothing without a query. Reaching SQL
// with it is a bug, and an empty condition would be broken SQL.
function requireSide({ tsQuery, typoText }: FullTextMatch): void {
  if (tsQuery === null && typoText === null) {
    throw new Error("A full-text match needs a tsquery or a text");
  }
}

// The WHERE part: the vector matches, or the text is close to the typed one.
export function fullTextMatchSql(
  match: FullTextMatch,
  { vector, text }: FullTextColumns,
): Prisma.Sql {
  requireSide(match);
  const { tsQuery, typoText } = match;
  const conditions: Prisma.Sql[] = [];
  if (tsQuery !== null) {
    conditions.push(Prisma.sql`${vector} @@ to_tsquery('simple', ${tsQuery})`);
  }
  if (typoText !== null) conditions.push(Prisma.sql`${typoText} <% ${text}`);
  return Prisma.join(conditions, " OR ");
}

// The ORDER BY score: the weighted rank of the vector plus the word similarity
// of the text column.
export function fullTextRankSql(
  match: FullTextMatch,
  { vector, text }: FullTextColumns,
): Prisma.Sql {
  requireSide(match);
  const { tsQuery, typoText } = match;
  const parts: Prisma.Sql[] = [];
  if (tsQuery !== null) {
    parts.push(
      Prisma.sql`ts_rank(${vector}, to_tsquery('simple', ${tsQuery}))`,
    );
  }
  if (typoText !== null) {
    parts.push(Prisma.sql`word_similarity(${typoText}, ${text})`);
  }
  return Prisma.join(parts, " + ");
}
