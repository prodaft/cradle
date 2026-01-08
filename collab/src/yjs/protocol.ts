import * as awarenessProtocol from "y-protocols/awareness";
import * as syncProtocol from "y-protocols/sync";
import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";
import * as Y from "yjs";

import { messageAwareness, messageSync } from "./constants.js";
import type { Connection } from "./connection.js";

export function createSyncMessage(doc: Y.Doc): Uint8Array {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, messageSync);
  syncProtocol.writeSyncStep1(encoder, doc);
  return encoding.toUint8Array(encoder);
}

export function createAwarenessMessage(
  awareness: awarenessProtocol.Awareness,
  changedClients: number[]
): Uint8Array {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, messageAwareness);
  encoding.writeVarUint8Array(
    encoder,
    awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients)
  );
  return encoding.toUint8Array(encoder);
}

export function handleIncomingMessage(
  message: ArrayBuffer,
  doc: Y.Doc,
  awareness: awarenessProtocol.Awareness,
  origin: Connection,
  onReply: (payload: Uint8Array) => void,
  readOnly: boolean
): void {
  const decoder = decoding.createDecoder(new Uint8Array(message));
  const encoder = encoding.createEncoder();
  const messageType = decoding.readVarUint(decoder);

  if (messageType === messageSync) {
    encoding.writeVarUint(encoder, messageSync);
    handleSyncMessage(decoder, encoder, doc, origin, readOnly);
    if (encoding.length(encoder) > 1) {
      onReply(encoding.toUint8Array(encoder));
    }
    return;
  }

  if (messageType === messageAwareness) {
    const update = decoding.readVarUint8Array(decoder);
    awarenessProtocol.applyAwarenessUpdate(awareness, update, origin);
  }
}

function handleSyncMessage(
  decoder: decoding.Decoder,
  encoder: encoding.Encoder,
  doc: Y.Doc,
  origin: Connection,
  readOnly: boolean
): void {
  const syncType = decoding.readVarUint(decoder);

  if (syncType === syncProtocol.messageYjsSyncStep1) {
    syncProtocol.readSyncStep1(decoder, encoder, doc);
    return;
  }

  if (syncType === syncProtocol.messageYjsSyncStep2) {
    if (!readOnly) {
      syncProtocol.readSyncStep2(decoder, doc, origin);
    }
    return;
  }

  if (syncType === syncProtocol.messageYjsUpdate) {
    if (!readOnly) {
      syncProtocol.readUpdate(decoder, doc, origin);
    }
  }
}
