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
import { getDocContent } from "../yjs/doc.js";
import { logger } from "../logging/logger.js";
import { messageSync } from "../yjs/constants.js";

type RoomOptions = {
  noteId: string;
  doc: Y.Doc;
  backend: CollabBackendClient;
  cache: NoteStateCache;
  flushDebounceMs?: number;
};

export class Room {
  readonly noteId: string;
  readonly doc: Y.Doc;
  readonly awareness: awarenessProtocol.Awareness;

  private readonly backend: CollabBackendClient;
  private readonly cache: NoteStateCache;
  private readonly connections = new Set<Connection>();
  private flushTimeout: NodeJS.Timeout | null = null;
  private readonly flushDebounceMs: number;

  constructor(options: RoomOptions) {
    this.noteId = options.noteId;
    this.doc = options.doc;
    this.awareness = new awarenessProtocol.Awareness(this.doc);
    this.backend = options.backend;
    this.cache = options.cache;
    this.flushDebounceMs = options.flushDebounceMs ?? 2000;

    this.doc.on("update", () => {
      this.cache.touch(this.noteId);
      this.scheduleFlush();
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
      void this.flushToBackend();
    }, this.flushDebounceMs);
  }

  private async flushToBackend(): Promise<void> {
    const content = getDocContent(this.doc);
    try {
      await this.backend.applyNoteState(this.noteId, content);
    } catch (error) {
      logger.error("flush failed", { noteId: this.noteId });
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
