import * as Y from "yjs";

type CacheEntry = {
  doc: Y.Doc;
  updatedAt: number;
};

export class NoteStateCache {
  private readonly maxEntries: number;
  private readonly entries = new Map<string, CacheEntry>();

  constructor(maxEntries = 100) {
    this.maxEntries = maxEntries;
  }

  get(noteId: string): Y.Doc | null {
    const entry = this.entries.get(noteId);
    return entry ? entry.doc : null;
  }

  set(noteId: string, doc: Y.Doc): void {
    this.entries.set(noteId, { doc, updatedAt: Date.now() });
    this.evictIfNeeded();
  }

  touch(noteId: string): void {
    const entry = this.entries.get(noteId);
    if (entry) {
      entry.updatedAt = Date.now();
    }
  }

  private evictIfNeeded(): void {
    if (this.entries.size <= this.maxEntries) {
      return;
    }

    const sorted = [...this.entries.entries()].sort(
      (a, b) => a[1].updatedAt - b[1].updatedAt
    );
    const toRemove = sorted.slice(0, this.entries.size - this.maxEntries);
    toRemove.forEach(([noteId]) => this.entries.delete(noteId));
  }
}
