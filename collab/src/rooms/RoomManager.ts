import * as Y from "yjs";

import type { CollabBackendClient } from "../backend/CollabBackendClient.js";
import { NoteStateCache } from "../storage/NoteStateCache.js";
import { createDocFromContent } from "../yjs/doc.js";
import { Room } from "./Room.js";
import { logger } from "../logging/logger.js";

type RoomManagerOptions = {
  backend: CollabBackendClient;
  cache: NoteStateCache;
  flushDebounceMs?: number;
};

export class RoomManager {
  private readonly backend: CollabBackendClient;
  private readonly cache: NoteStateCache;
  private readonly rooms = new Map<string, Room>();
  private readonly flushDebounceMs?: number;

  constructor(options: RoomManagerOptions) {
    this.backend = options.backend;
    this.cache = options.cache;
    this.flushDebounceMs = options.flushDebounceMs;
  }

  async getOrCreate(noteId: string): Promise<Room> {
    const existing = this.rooms.get(noteId);
    if (existing) {
      logger.debug("room reuse", { noteId });
      return existing;
    }

    const doc = await this.loadDoc(noteId);
    const room = new Room({
      noteId,
      doc,
      backend: this.backend,
      cache: this.cache,
      flushDebounceMs: this.flushDebounceMs
    });
    this.rooms.set(noteId, room);
    logger.info("room created", { noteId });
    return room;
  }

  release(noteId: string): void {
    const room = this.rooms.get(noteId);
    if (!room || room.hasConnections()) {
      return;
    }
    this.cache.set(noteId, room.doc);
    this.rooms.delete(noteId);
    logger.info("room released", { noteId });
  }

  private async loadDoc(noteId: string): Promise<Y.Doc> {
    const cached = this.cache.get(noteId);
    if (cached) {
      logger.info("cache hit", { noteId });
      this.cache.touch(noteId);
      return cached;
    }

    logger.info("cache miss", { noteId });
    const note = await this.backend.fetchNoteState(noteId);
    return createDocFromContent(note.content ?? "");
  }
}
