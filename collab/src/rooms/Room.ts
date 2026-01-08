import * as awarenessProtocol from "y-protocols/awareness";
import * as syncProtocol from "y-protocols/sync";
import * as decoding from "lib0/decoding";
import * as Y from "yjs";

import type { CollabBackendClient } from "../backend/CollabBackendClient.js";
import { NoteStateCache } from "../storage/NoteStateCache.js";
import type { Connection } from "../yjs/connection.js";
import {
  createAwarenessMessage,
  createSyncMessage,
  handleIncomingMessage
} from "../yjs/protocol.js";
import { createDocFromContent, getDocContent } from "../yjs/doc.js";
import { logger } from "../logging/logger.js";
import { messageSync } from "../yjs/constants.js";
import { ChangeQueue } from "./ChangeQueue.js";

type RoomOptions = {
  noteId: string;
  doc: Y.Doc;
  backend: CollabBackendClient;
  cache: NoteStateCache;
  flushDebounceMs?: number;
  maxFlushIntervalMs?: number;
};

export class Room {
  readonly noteId: string;
  readonly doc: Y.Doc;
  readonly awareness: awarenessProtocol.Awareness;

  private readonly backend: CollabBackendClient;
  private readonly cache: NoteStateCache;
  private readonly connections = new Set<Connection>();
  private flushTimeout: NodeJS.Timeout | null = null;
  private maxFlushTimeout: NodeJS.Timeout | null = null;
  private readonly flushDebounceMs: number;
  private readonly maxFlushIntervalMs: number;
  private readonly changeQueue: ChangeQueue;
  private flushInFlight = false;
  private flushPending = false;
  private pendingChanges = false;
  private activeUserId: string | null = null;
  private pendingFlushReason: "debounce" | "max-interval" | "user-change" | null =
    null;
  private pendingContent: string | null = null;
  private inFlightContent: string | null = null;
  private pendingUserId: string | null = null;
  private inFlightUserId: string | null = null;
  private readonly persistedDoc: Y.Doc;

  constructor(options: RoomOptions) {
    this.noteId = options.noteId;
    this.doc = options.doc;
    this.awareness = new awarenessProtocol.Awareness(this.doc);
    this.backend = options.backend;
    this.cache = options.cache;
    this.flushDebounceMs = options.flushDebounceMs ?? 2000;
    this.maxFlushIntervalMs = options.maxFlushIntervalMs ?? 15000;
    this.persistedDoc = createDocFromContent(getDocContent(this.doc));
    this.changeQueue = new ChangeQueue({
      onDrain: (items) => {
        this.handleDrainedChanges(items);
      }
    });

    this.doc.on("update", (update, origin) => {
      const connection = origin as Connection | undefined;
      if (!connection) {
        logger.warn("missing update origin", { noteId: this.noteId });
        return;
      }
      const userId = connection.userId;
      this.changeQueue.enqueue({
        update: new Uint8Array(update),
        userId
      });
    });

    this.awareness.on("update", (payload, origin) => {
      this.handleAwarenessUpdate(payload, origin as Connection | undefined);
    });
  }

  addConnection(connection: Connection): void {
    this.connections.add(connection);
    logger.info("client joined", {
      noteId: this.noteId,
      readOnly: connection.readOnly
    });
    connection.socket.send(createSyncMessage(this.doc));
    this.sendAwarenessStates(connection);
  }

  removeConnection(connection: Connection): void {
    this.connections.delete(connection);
    logger.info("client left", { noteId: this.noteId });
    if (connection.awarenessIds.size > 0) {
      awarenessProtocol.removeAwarenessStates(
        this.awareness,
        [...connection.awarenessIds],
        connection
      );
    }
  }

  handleMessage(connection: Connection, data: ArrayBuffer): void {
    const payload = new Uint8Array(data);
    const shouldBroadcastUpdate = this.isSyncUpdateMessage(payload);
    handleIncomingMessage(
      data,
      this.doc,
      this.awareness,
      connection,
      (reply) => {
        connection.socket.send(reply);
      },
      connection.readOnly
    );
    if (shouldBroadcastUpdate) {
      this.broadcast(payload, connection);
    }
  }

  hasConnections(): boolean {
    return this.connections.size > 0;
  }

  private sendAwarenessStates(connection: Connection): void {
    const states = Array.from(this.awareness.getStates().keys());
    if (states.length === 0) {
      return;
    }
    connection.socket.send(createAwarenessMessage(this.awareness, states));
  }

  private handleAwarenessUpdate(
    payload: {
      added: number[];
      updated: number[];
      removed: number[];
    },
    origin?: Connection
  ): void {
    const changed = payload.added.concat(payload.updated, payload.removed);
    if (origin?.awarenessIds) {
      changed.forEach((clientId) => {
        if (payload.removed.includes(clientId)) {
          origin.awarenessIds.delete(clientId);
        } else {
          origin.awarenessIds.add(clientId);
        }
      });
    }

    const message = createAwarenessMessage(this.awareness, changed);
    this.broadcast(message, origin);
  }

  private broadcast(payload: Uint8Array, origin?: Connection): void {
    this.connections.forEach((conn) => {
      if (conn !== origin) {
        conn.socket.send(payload);
      }
    });
  }

  private scheduleFlush(): void {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
    }
    this.flushTimeout = setTimeout(() => {
      this.flushTimeout = null;
      this.flushNow("debounce");
    }, this.flushDebounceMs);
  }

  private handleDrainedChanges(
    items: { update: Uint8Array; userId: string }[]
  ): void {
    if (items.length === 0) {
      return;
    }

    this.cache.touch(this.noteId);
    let applied = false;

    for (const item of items) {
      if (!this.activeUserId) {
        this.activeUserId = item.userId;
      }

      if (
        this.activeUserId &&
        item.userId !== this.activeUserId &&
        this.pendingContent
      ) {
        this.flushNow("user-change");
        this.activeUserId = item.userId;
      }
      if (
        this.activeUserId &&
        item.userId !== this.activeUserId &&
        this.flushInFlight
      ) {
        this.flushPending = true;
        this.pendingFlushReason = "user-change";
      }

      Y.applyUpdate(this.persistedDoc, item.update);
      applied = true;
      this.activeUserId = item.userId;
      this.pendingUserId = item.userId;
    }

    if (applied) {
      this.pendingContent = getDocContent(this.persistedDoc);
      this.pendingChanges = true;
      this.ensureMaxFlush();
      this.scheduleFlush();
    }
  }

  private ensureMaxFlush(): void {
    if (this.maxFlushTimeout || !this.pendingChanges) {
      return;
    }
    this.maxFlushTimeout = setTimeout(() => {
      this.maxFlushTimeout = null;
      this.flushNow("max-interval");
    }, this.maxFlushIntervalMs);
  }

  private clearFlushTimers(): void {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }
    if (this.maxFlushTimeout) {
      clearTimeout(this.maxFlushTimeout);
      this.maxFlushTimeout = null;
    }
  }

  private flushNow(reason: "debounce" | "max-interval" | "user-change"): void {
    if (this.flushInFlight) {
      this.flushPending = true;
      this.pendingFlushReason =
        this.pendingFlushReason === "user-change"
          ? this.pendingFlushReason
          : reason;
      return;
    }
    if (!this.pendingChanges) {
      return;
    }
    if (!this.pendingUserId) {
      logger.error("missing user id for flush", { noteId: this.noteId });
      return;
    }
    this.clearFlushTimers();
    this.inFlightContent = this.pendingContent ?? getDocContent(this.persistedDoc);
    this.inFlightUserId = this.pendingUserId;
    this.pendingContent = null;
    this.pendingUserId = null;
    this.pendingChanges = false;
    void this.flushToBackend(reason);
  }

  private async flushToBackend(reason: string): Promise<void> {
    if (this.flushInFlight) {
      this.flushPending = true;
      this.pendingFlushReason =
        this.pendingFlushReason === "user-change"
          ? this.pendingFlushReason
          : "debounce";
      return;
    }
    if (!this.inFlightContent) {
      return;
    }
    this.flushInFlight = true;
    const content = this.inFlightContent;
    const userId = this.inFlightUserId;
    if (!userId) {
      logger.error("missing user id for apply", { noteId: this.noteId, reason });
      this.inFlightContent = null;
      this.inFlightUserId = null;
      this.flushInFlight = false;
      return;
    }
    try {
      await this.backend.applyNoteState(
        this.noteId,
        content,
        userId
      );
    } catch (error) {
      logger.error("flush failed", { noteId: this.noteId, reason });
    }
    this.inFlightContent = null;
    this.inFlightUserId = null;
    this.flushInFlight = false;
    if (this.flushPending) {
      this.flushPending = false;
      const pendingReason = this.pendingFlushReason ?? "debounce";
      this.pendingFlushReason = null;
      if (pendingReason === "user-change") {
        this.flushNow("user-change");
        return;
      }
      if (this.pendingChanges) {
        this.ensureMaxFlush();
        this.scheduleFlush();
      }
      return;
    }
    if (this.pendingChanges) {
      this.ensureMaxFlush();
      this.scheduleFlush();
    }
  }

  private isSyncUpdateMessage(payload: Uint8Array): boolean {
    try {
      const decoder = decoding.createDecoder(payload);
      const messageType = decoding.readVarUint(decoder);
      if (messageType !== messageSync) {
        return false;
      }
      const syncType = decoding.readVarUint(decoder);
      return syncType === syncProtocol.messageYjsUpdate;
    } catch (error) {
      logger.warn("failed to parse incoming message", { noteId: this.noteId });
      return false;
    }
  }
}
