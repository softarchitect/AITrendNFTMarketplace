import { InMemoryStore } from "../store/inMemoryStore";

export class IndexerService {
  constructor(private readonly db: InMemoryStore) {}

  upsertListing(input: {
    tokenId: number;
    owner: string;
    tokenUri: string;
    status: "minted" | "listed" | "sold" | "transferred";
  }) {
    const existing = [...this.db.listings.values()].find((listing) => listing.tokenId === input.tokenId);
    if (existing) {
      return this.db.updateListing(existing.id, {
        owner: input.owner,
        tokenUri: input.tokenUri,
        status: input.status
      });
    }
    return this.db.createListing(input);
  }

  listAll() {
    return [...this.db.listings.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  listByOwner(owner: string) {
    return [...this.db.listings.values()].filter(
      (listing) => listing.owner.toLowerCase() === owner.toLowerCase()
    );
  }
}
