import { InMemoryStore } from "../store/inMemoryStore";

export class IndexerService {
  constructor(private readonly db: InMemoryStore) {}

  upsertListing(input: {
    tokenId: number;
    seriesId?: number;
    editionSize?: number;
    editionNumber?: number;
    editionAvailable?: number;
    owner: string;
    tokenUri: string;
    imageUrl?: string;
    themes?: string[];
    status: "minted" | "listed" | "sold" | "transferred";
  }) {
    const existing = [...this.db.listings.values()].find((listing) => listing.tokenId === input.tokenId);
    if (existing) {
      const patch: {
        owner: string;
        tokenUri: string;
        imageUrl?: string;
        themes?: string[];
        seriesId?: number;
        editionSize?: number;
        editionNumber?: number;
        editionAvailable?: number;
        status: "minted" | "listed" | "sold" | "transferred";
      } = {
        owner: input.owner,
        tokenUri: input.tokenUri,
        status: input.status
      };
      if (input.imageUrl) {
        patch.imageUrl = input.imageUrl;
      }
      if (input.themes && input.themes.length > 0) {
        patch.themes = input.themes;
      }
      if (typeof input.seriesId === "number") {
        patch.seriesId = input.seriesId;
      }
      if (typeof input.editionSize === "number") {
        patch.editionSize = input.editionSize;
      }
      if (typeof input.editionNumber === "number") {
        patch.editionNumber = input.editionNumber;
      }
      if (typeof input.editionAvailable === "number") {
        patch.editionAvailable = input.editionAvailable;
      }
      return this.db.updateListing(existing.id, {
        ...patch
      });
    }
    return this.db.createListing({
      ...input,
      seriesId: input.seriesId ?? 1,
      editionSize: input.editionSize ?? 1,
      editionNumber: input.editionNumber ?? 1,
      editionAvailable: input.editionAvailable ?? 1,
      themes: input.themes ?? []
    });
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
