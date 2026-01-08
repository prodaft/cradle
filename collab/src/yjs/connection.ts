import { WebSocket } from "ws";

export type Connection = {
  socket: WebSocket;
  awarenessIds: Set<number>;
  readOnly: boolean;
  userId: string;
};
