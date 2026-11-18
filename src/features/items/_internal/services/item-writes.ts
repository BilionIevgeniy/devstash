import "server-only";

// Links to the caller's tags, creating the ones the caller does not have yet.
// A link to a name in aiTags is marked as an accepted AI suggestion.
export function tagLinks(
  userId: string,
  tags: string[],
  aiTags: readonly string[] = [],
) {
  return tags.map((name) => ({
    aiGenerated: aiTags.includes(name),
    tag: {
      connectOrCreate: {
        where: { userId_name: { userId, name } },
        create: { userId, name },
      },
    },
  }));
}

// Links to the caller's collections. The owner in the connect makes someone
// else's collection fail like a missing one: P2025, and the write rolls back.
export function collectionLinks(userId: string, collectionIds: string[]) {
  return collectionIds.map((id) => ({
    collection: { connect: { id, userId } },
  }));
}
