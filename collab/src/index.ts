import { config } from "./config.js";
import { CollabBackendClient } from "./backend/CollabBackendClient.js";
import { RoomManager } from "./rooms/RoomManager.js";
import { CollabServer } from "./server/CollabServer.js";
import { NoteStateCache } from "./storage/NoteStateCache.js";
import { logger } from "./logging/logger.js";

const backend = new CollabBackendClient();
const cache = new NoteStateCache();
const rooms = new RoomManager({ backend, cache });

const server = new CollabServer({
  port: config.port,
  basePath: config.collabBasePath,
  backend,
  rooms
});

logger.info("collab server starting", {
  port: config.port,
  basePath: config.collabBasePath,
  djangoBaseUrl: config.djangoBaseUrl
});

server.start();
