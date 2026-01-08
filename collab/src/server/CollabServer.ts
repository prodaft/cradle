import http from "node:http";
import { WebSocketServer } from "ws";

import type { CollabBackendClient } from "../backend/CollabBackendClient.js";
import type { RoomManager } from "../rooms/RoomManager.js";
import type { Connection } from "../yjs/connection.js";
import { logger } from "../logging/logger.js";
import { parseConnectionParams } from "./params.js";
import { FetchError, ResponseError } from "../services/cradle/runtime.js";

type CollabServerOptions = {
  port: number;
  basePath: string;
  backend: CollabBackendClient;
  rooms: RoomManager;
};

export class CollabServer {
  private readonly port: number;
  private readonly basePath: string;
  private readonly backend: CollabBackendClient;
  private readonly rooms: RoomManager;
  private readonly server: http.Server;
  private readonly wss: WebSocketServer;

  constructor(options: CollabServerOptions) {
    this.port = options.port;
    this.basePath = options.basePath;
    this.backend = options.backend;
    this.rooms = options.rooms;
    this.server = http.createServer((req, res) => {
      const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
      if (!this.isValidPath(url.pathname)) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("not found");
        return;
      }
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("collab server");
    });
    this.wss = new WebSocketServer({ noServer: true });
  }

  start(): void {
    this.server.on("upgrade", (req, socket, head) => {
      void this.handleUpgrade(req, socket, head);
    });
    this.server.listen(this.port, () => {
      logger.info("server listening", { port: this.port });
    });
  }

  private async handleUpgrade(
    req: http.IncomingMessage,
    socket: http.Socket,
    head: Buffer
  ): Promise<void> {
    try {
      const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
      logger.info("upgrade request", {
        path: url.pathname,
        ip: req.socket.remoteAddress ?? "unknown"
      });
      if (!this.isValidPath(url.pathname)) {
        logger.warn("invalid path", { path: url.pathname });
        this.reject(socket, 404, "Not Found");
        return;
      }
      const params = parseConnectionParams(
        url.pathname,
        this.basePath,
        req.headers
      );
      if (!params.ok) {
        logger.warn("invalid params", { error: params.error });
        this.reject(socket, 400, params.error);
        return;
      }

      let auth;
      try {
        auth = await this.backend.authorize(
          params.value.noteId,
          params.value.token
        );
      } catch (error) {
        await this.rejectWithError(socket, error, "authorize");
        return;
      }
      if (auth.access === "NONE") {
        logger.warn("unauthorized", { noteId: params.value.noteId });
        this.reject(socket, 401, "Unauthorized");
        return;
      }
      if (!auth.userId) {
        logger.error("authorize missing user_id", { noteId: params.value.noteId });
        this.reject(socket, 401, "Unauthorized");
        return;
      }

      let room;
      try {
        room = await this.rooms.getOrCreate(params.value.noteId);
      } catch (error) {
        await this.rejectWithError(socket, error, "room");
        return;
      }
      logger.info("connection accepted", {
        noteId: params.value.noteId,
        access: auth.access
      });
      this.wss.handleUpgrade(req, socket, head, (ws) => {
        const connection: Connection = {
          socket: ws,
          awarenessIds: new Set(),
          readOnly: auth.access === "READ",
          userId: auth.userId
        };
        room.addConnection(connection);
        ws.on("message", (data) => {
          if (data instanceof ArrayBuffer) {
            room.handleMessage(connection, data);
            return;
          }
          if (Buffer.isBuffer(data)) {
            const slice = data.buffer.slice(
              data.byteOffset,
              data.byteOffset + data.byteLength
            );
            room.handleMessage(connection, slice);
          }
        });
        ws.on("close", () => {
          room.removeConnection(connection);
          this.rooms.release(room.noteId);
        });
      });
    } catch (error) {
      logger.error("upgrade failed");
      this.reject(socket, 500, "Internal Server Error");
    }
  }

  private reject(socket: http.Socket, code: number, message: string): void {
    const statusText = http.STATUS_CODES[code] ?? "Error";
    const body = message || statusText;
    socket.write(
      `HTTP/1.1 ${code} ${statusText}\r\nContent-Type: text/plain\r\nContent-Length: ${Buffer.byteLength(
        body
      )}\r\n\r\n${body}`
    );
    socket.destroy();
  }

  private async rejectWithError(
    socket: http.Socket,
    error: unknown,
    stage: "authorize" | "room"
  ): Promise<void> {
    const responseError = this.getResponseError(error);
    if (responseError) {
      const status = responseError.response.status;
      const details = await this.safeReadResponse(responseError.response);
      logger.error("upstream error", { stage, status, details });
      const message = details || http.STATUS_CODES[status] || "Upstream Error";
      const code =
        status >= 500 ? 502 : status >= 400 ? status : 500;
      this.reject(socket, code, message);
      return;
    }
    if (error instanceof FetchError) {
      logger.error("upstream fetch error", { stage });
      this.reject(socket, 502, "Upstream Unavailable");
      return;
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("unexpected error", { stage, message });
    this.reject(socket, 500, "Internal Server Error");
  }

  private getResponseError(error: unknown): ResponseError | null {
    if (error instanceof ResponseError) {
      return error;
    }
    if (
      error &&
      typeof error === "object" &&
      "response" in error &&
      (error as { response?: Response }).response
    ) {
      return error as ResponseError;
    }
    return null;
  }

  private async safeReadResponse(response: Response): Promise<string> {
    try {
      return await response.text();
    } catch {
      return "";
    }
  }

  private isValidPath(pathname: string): boolean {
    const normalized = pathname.replace(/\/+$/, "");
    if (!this.basePath) {
      return true;
    }
    return (
      normalized === `/${this.basePath}` ||
      normalized.startsWith(`/${this.basePath}/`)
    );
  }
}
