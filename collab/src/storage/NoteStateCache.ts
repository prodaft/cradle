import * as Y from "yjs";

type CacheEntry = {
  doc: Y.Doc;
  updatedAt: number;
};

type NoteStateCacheOptions = {
  maxEntries?: number;
  maxAgeMs?: number;
};

export class NoteStateCache {
  private readonly maxEntries: number;
  private readonly maxAgeMs?: number;
  private readonly entries = new Map<string, CacheEntry>();

  constructor(options: NoteStateCacheOptions = {}) {
    this.maxEntries = Math.max(0, options.maxEntries ?? 100);
    const maxAgeMs = options.maxAgeMs ?? 0;
    this.maxAgeMs = maxAgeMs > 0 ? maxAgeMs : undefined;
  }

  get(noteId: string): Y.Doc | null {
    const entry = this.entries.get(noteId);
    if (!entry) {
      return null;
    }
    if (this.isExpired(entry)) {
      this.entries.delete(noteId);
      return null;
    }
    return entry.doc;
  }

  set(noteId: string, doc: Y.Doc): void {
    const now = Date.now();
    this.entries.set(noteId, { doc, updatedAt: now });
    this.pruneExpired(now);
    this.evictIfNeeded();
  }

  touch(noteId: string): void {
    const entry = this.entries.get(noteId);
    if (!entry) {
      return;
    }
    if (this.isExpired(entry)) {
      this.entries.delete(noteId);
      return;
    }
    entry.updatedAt = Date.now();
  }

  private evictIfNeeded(): void {
    this.pruneExpired();
    if (this.entries.size <= this.maxEntries) {
      return;
    }

    const sorted = [...this.entries.entries()].sort(
      (a, b) => a[1].updatedAt - b[1].updatedAt
    );
    const toRemove = sorted.slice(0, this.entries.size - this.maxEntries);
    toRemove.forEach(([noteId]) => this.entries.delete(noteId));
  }

  private pruneExpired(now = Date.now()): void {
    if (!this.maxAgeMs) {
      return;
    }
    for (const [noteId, entry] of this.entries) {
      if (now - entry.updatedAt > this.maxAgeMs) {
        this.entries.delete(noteId);
      }
    }
  }

  private isExpired(entry: CacheEntry): boolean {
    if (!this.maxAgeMs) {
      return false;
    }
    return Date.now() - entry.updatedAt > this.maxAgeMs;
  }
}
