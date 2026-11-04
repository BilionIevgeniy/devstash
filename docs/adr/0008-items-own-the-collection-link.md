# 0008. Items own the link to collections

- Status: accepted (reviewed by the architecture reviewer; the owner approved it on 2026-11-04)
- Date: 2026-11-04

## Context

The create and edit forms of an item get a Collections input. The forms and the item writes live in `items` (rank 5). `ItemCollection`, the link table, belonged to `collections` (rank 6), and so did the list of a user's collections. `items` cannot import `collections`, and only the owner may write a model, so the rules blocked the feature.

The forms mount in five places: the top bar, a type page, the dashboard drawer, the route drawer and the full item page.

## Options

1. **`collections` stays the owner and composes:** its action creates the item through `items` and writes the links; `app/` injects that action and the options into `items` through props or slots. Five mounts to thread through, some of them deep inside the drawer, and the item and its links become two writes that can half succeed.
2. **Swap the ranks, `collections` below `items`.** Possible today, since `collections` imports nothing from `items`. It lets `items` call a `collections` service, but the item and its links are still two writes, and `collections` could never use `items` later, which the collection pages may need.
3. **`items` owns `ItemCollection`, and reads the options through a route.** The link is written in the same Prisma call as the item, as tags are. The forms fetch the options from `GET /api/collections`.

## Decision

Option 3.

- `ItemCollection` moves to `items`; `Collection` stays with `collections`
- A link is written as `collection: { connect: { id, userId } }`. The filter on the owner is how a foreign id is refused: a connect that finds nothing raises P2025 and the whole write rolls back. This touches `Collection` from inside `items`, as the one sanctioned exception to "write only your models": it writes no column of `Collection`
- An update deletes only the links that were removed and creates only the new ones, because `addedAt` belongs to the link and must survive a save. An existing link needs no ownership check: it was checked when it was made
- `items` depends on `GET /api/collections` at runtime. This is a rank 5 component using a rank 6 read through a URL, on purpose, and lint cannot see it. `src/app/api/collections/route.ts` joins the two sides: it serves `getCollectionOptions` of `collections`, and the client reads the JSON as `ItemCollectionRef` of `items`. Its test pins that shape
- `collections/queries.ts` keeps reading the links through `Collection.items`. That is a read of scalar columns through its own relation, which the rules allow

## Consequences

- An item and its links are saved or refused together
- Moving or changing `/api/collections` breaks the forms without a compile or lint error; only the route's test and the input's error state show it
- The options are fetched when a form mounts, so a collection created while the edit form stays open on the full item page appears only after the form is opened again. Accepted: it is a rare path, and fetching on every open of the menu would show a spinner each time
- Item-to-collection writes from other places (the collection pages, import) go through `items`
