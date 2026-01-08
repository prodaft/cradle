import {
  CollabAuthorizeRequest,
  CollabAuthorizeResponse,
  CollabNoteApplyRequest,
  CollabAuthorizeRequestRequestToJSON,
  CollabNoteApplyRequestRequestToJSON,
  Configuration,
  InternalApi,
  NoteRetrieve
} from "../services/cradle/index";
import { config } from "../config.js";
import { logger } from "../logging/logger.js";
import { signRequest } from "./signing.js";

export class CollabBackendClient {
  private readonly api: InternalApi;

  constructor() {
    const configuration = new Configuration({
      basePath: `${config.djangoBaseUrl}/${config.djangoApiBasePath}`
    });
    this.api = new InternalApi(configuration);
  }

  private buildSignedHeaders(path: string, body: string): Record<string, string> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const apiPath = `/${config.djangoApiBasePath}${path}`;
    const signature = signRequest({
      secret: config.collabHmacSecret,
      timestamp,
      method: "POST",
      path: apiPath,
      body
    });
    return {
      "X-Collab-Timestamp": timestamp,
      "X-Collab-Signature": signature
    };
  }

  async authorize(
    noteId: string,
    userToken: string
  ): Promise<CollabAuthorizeResponse> {
    logger.info("authorize request", { noteId });
    const payload: CollabAuthorizeRequest = {
      noteId,
      userToken
    };
    const body = JSON.stringify(CollabAuthorizeRequestRequestToJSON(payload));
    const headers = this.buildSignedHeaders("/internal/collab/authorize/", body);
    try {
      const response = await this.api.collabAuthorize({
        xCollabSignature: headers["X-Collab-Signature"],
        xCollabTimestamp: headers["X-Collab-Timestamp"],
        collabAuthorizeRequestRequest: payload
      });
      logger.info("authorize response", {
        noteId,
        access: response.access,
        userId: response.userId ?? null,
        username: response.username ?? null
      });
      return response;
    } catch (error) {
      logger.error("authorize failed", { noteId });
      throw error;
    }
  }

  async fetchNoteState(noteId: string): Promise<NoteRetrieve> {
    logger.info("fetch note state", { noteId });
    try {
      const path = `/internal/collab/notes/${noteId}/state/`;
      const headers = this.buildSignedHeaders(path, "");
      const note = await this.api.collabNoteState({
        noteId,
        xCollabSignature: headers["X-Collab-Signature"],
        xCollabTimestamp: headers["X-Collab-Timestamp"]
      });
      logger.info("fetch note state success", { noteId });
      return note;
    } catch (error) {
      logger.error("fetch note state failed", { noteId });
      throw error;
    }
  }

  async applyNoteState(
    noteId: string,
    content: string,
    userId: string
  ): Promise<void> {
    const payload: CollabNoteApplyRequest = { content, userId };
    logger.info("apply note state", { noteId, size: content.length, userId });
    try {
      const body = JSON.stringify(CollabNoteApplyRequestRequestToJSON(payload));
      const path = `/internal/collab/notes/${noteId}/apply/`;
      const headers = this.buildSignedHeaders(path, body);
      await this.api.collabNoteApply({
        noteId,
        xCollabSignature: headers["X-Collab-Signature"],
        xCollabTimestamp: headers["X-Collab-Timestamp"],
        collabNoteApplyRequestRequest: payload
      });
      logger.info("apply note state success", { noteId });
    } catch (error) {
      logger.error("apply note state failed", { noteId });
      throw error;
    }
  }
}
